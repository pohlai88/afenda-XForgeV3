/**
 * The HR module's mountable surface.
 *
 * Handlers are thin: they translate HTTP to an application call and back.
 * Policy is already evaluated by the adapter before a handler runs (ADR-014),
 * so a handler never re-checks permission -- one place, not two.
 */

import type { RouteDefinition } from '@xforge/api'
import type { VerifiedTenantContext } from '@xforge/tenancy'
import type { Context } from 'hono'

export { hrRoutes } from './contract/routes'

import { hrRoutes } from './contract/routes'
import * as repo from './infrastructure/repository/emergency-contact'
import * as hr from './infrastructure/repository/employee'

const toContact = (r: repo.EmergencyContactRow) => ({
  employeeId: r.employeeId,
  id: r.id,
  name: r.name,
  phone: r.phone,
  relationship: r.relationship,
  version: r.version,
})

/**
 * The completeness envelope, built in ONE place.
 *
 * Every bounded read owes the same answer, and the emergency-contact handler
 * used to compose it inline. That was one copy; four reads later it would have
 * been five, differing in whichever of them somebody forgot to update when the
 * vocabulary grew a second reason code.
 *
 * The marker states what the server KNOWS, in codes and numbers. What a person
 * should be TOLD about it is the experience layer's decision, and a sentence
 * here would move that decision into the transport.
 */
const completeness = (hasMore: boolean, limit: number, returned: number) =>
  hasMore
    ? {
        completeness: 'partial' as const,
        partialReasons: [{ code: 'result_cap' as const, limit, returned }],
      }
    : { completeness: 'complete' as const }

/**
 * The employment effective on the requested date, or null.
 *
 * NULL MEANS EXACTLY ONE THING: no employment period covered `asOf`. It is not
 * "terminated" and not "not yet started" -- deciding between those requires
 * looking at a row that does NOT cover the date, which is the nearest-row
 * fallback ADR-016 forbids. `listEmployments` is the operation that may see
 * those rows, and a screen that needs the distinction asks it.
 *
 * All three fields are null together because they come from one LEFT JOIN
 * LATERAL. Testing all three rather than one is what lets the types narrow, and
 * it does not pretend a partial row is representable.
 */
const employmentOf = (r: {
  effectiveFrom: string | null
  effectiveTo: string | null
  jobTitle: string | null
  payBasis: 'daily' | 'hourly' | 'monthly' | null
}) =>
  r.effectiveFrom && r.jobTitle && r.payBasis
    ? {
        effectiveFrom: r.effectiveFrom,
        effectiveTo: r.effectiveTo,
        jobTitle: r.jobTitle,
        payBasis: r.payBasis,
      }
    : null

const toEmployeeSummary = (r: hr.EmployeeSummaryRow) => ({
  employeeId: r.employeeId,
  employeeNumber: r.employeeNumber,
  employment: employmentOf(r),
  fullName: r.fullName,
  legalEntityId: r.legalEntityId,
  legalEntityName: r.legalEntityName,
  personId: r.personId,
})

const toEmployeeRecord = (r: hr.EmployeeRecordRow) => ({
  employeeId: r.employeeId,
  employeeNumber: r.employeeNumber,
  employment: employmentOf(r),
  fullName: r.fullName,
  legalEntity: {
    countryCode: r.countryCode,
    id: r.legalEntityId,
    name: r.legalEntityName,
    registrationNumber: r.registrationNumber,
    timeZone: r.timeZone,
  },
  personId: r.personId,
  preferredName: r.preferredName,
})

const problem = (c: Context, status: 404 | 409 | 422, title: string, detail: string) =>
  c.json(
    { detail, instance: c.req.path, request_id: null, status, title, type: 'about:blank' },
    status,
    { 'content-type': 'application/problem+json' },
  )

/**
 * ADR-015 / ADR-022: exactly one bound tenant per request, and it arrives as a
 * VERIFIED context that the request layer built from host + principal +
 * membership. A handler cannot construct one, so it cannot choose a tenant.
 */
const tenantOf = (c: Context): VerifiedTenantContext => {
  const ctx = c.get('tenant')
  if (!ctx) {
    throw new Error('no verified tenant context on request')
  }
  return ctx
}

export const hrModuleRoutes: RouteDefinition[] = [
  {
    config: hrRoutes.listEmergencyContacts,
    async handler(c) {
      const { employeeId } = c.req.param()
      const { rows, hasMore } = await repo.listByEmployee(tenantOf(c), String(employeeId))
      return c.json(
        {
          items: rows.map(toContact),
          meta: completeness(hasMore, repo.LIST_LIMIT, rows.length),
        },
        200,
      )
    },
  },
  {
    config: hrRoutes.createEmergencyContact,
    async handler(c) {
      const { employeeId } = c.req.param()
      const body = (await c.req.json()) as { name: string; relationship: string; phone: string }
      const id = c.get('newId') ?? crypto.randomUUID()
      const row = await repo.create(tenantOf(c), String(employeeId), body, id)
      return c.json(toContact(row), 201)
    },
  },
  {
    config: hrRoutes.updateEmergencyContact,
    async handler(c) {
      const { id } = c.req.param()
      const body = (await c.req.json()) as {
        name?: string
        relationship?: string
        phone?: string
        version: number
      }
      const result = await repo.update(tenantOf(c), String(id), body)

      if (result.kind === 'not-found') {
        return problem(c, 404, 'Not found', `no emergency contact ${id}`)
      }
      if (result.kind === 'conflict') {
        // ADR-013: reject, never merge. The client re-reads and re-applies.
        return problem(
          c,
          409,
          'Version conflict',
          `record has moved on (current version ${result.currentVersion}); re-read and re-apply`,
        )
      }
      return c.json(toContact(result.row), 200)
    },
  },
  {
    config: hrRoutes.listLegalEntities,
    async handler(c) {
      const { rows, hasMore } = await hr.listLegalEntities(tenantOf(c))
      return c.json(
        { items: rows, meta: completeness(hasMore, hr.LEGAL_ENTITY_LIST_LIMIT, rows.length) },
        200,
      )
    },
  },
  {
    config: hrRoutes.listEmployees,
    async handler(c) {
      // Validated by the adapter against the contract before this runs: `asOf`
      // is a required ISO date there, so it cannot be absent here. It is read
      // and never defaulted -- law 21, and the reason the contract makes it
      // required is that this module may not read a clock to invent one.
      const asOf = c.req.query('asOf') ?? ''
      const legalEntityId = c.req.query('legalEntityId')
      const { rows, hasMore } = await hr.listEmployees(tenantOf(c), { asOf, legalEntityId })
      return c.json(
        {
          // Echoed, so a client never has to assume which date it is looking at.
          asOf,
          items: rows.map(toEmployeeSummary),
          meta: completeness(hasMore, hr.EMPLOYEE_LIST_LIMIT, rows.length),
        },
        200,
      )
    },
  },
  {
    config: hrRoutes.getEmployee,
    async handler(c) {
      const { employeeId } = c.req.param()
      const asOf = c.req.query('asOf') ?? ''
      const row = await hr.getEmployee(tenantOf(c), String(employeeId), asOf)
      if (!row) {
        return problem(c, 404, 'Not found', `no employee ${employeeId}`)
      }
      return c.json({ asOf, employee: toEmployeeRecord(row) }, 200)
    },
  },
  {
    config: hrRoutes.onboardEmployee,
    async handler(c) {
      const body = (await c.req.json()) as hr.OnboardInput
      // Ids are minted HERE, not by the database, so the three rows can be
      // written in one statement each and read back by id without a RETURNING
      // round trip per table. `newId` is the test seam the emergency-contact
      // create already uses.
      const seed = c.get('newId')
      const result = await hr.onboard(tenantOf(c), body, {
        employeeId: seed ?? crypto.randomUUID(),
        employmentId: crypto.randomUUID(),
        personId: crypto.randomUUID(),
      })

      if (result.kind === 'no-legal-entity') {
        // 404 and not 422: the body is well formed, and the entity may exist in
        // ANOTHER tenant -- which this caller must not be able to distinguish
        // from a typo, so the detail names no entity.
        return problem(c, 404, 'Not found', 'no such legal entity in this tenant')
      }
      if (result.kind === 'conflict') {
        return problem(c, 409, 'Already employed here', result.detail)
      }
      return c.json({ asOf: body.effectiveFrom, employee: toEmployeeRecord(result.row) }, 201)
    },
  },
  {
    config: hrRoutes.transferEmployee,
    async handler(c) {
      const { employeeId } = c.req.param()
      const body = (await c.req.json()) as hr.TransferInput
      const result = await hr.transfer(tenantOf(c), String(employeeId), body, {
        employeeId: crypto.randomUUID(),
        employmentId: crypto.randomUUID(),
      })

      switch (result.kind) {
        case 'employee-not-found':
          return problem(c, 404, 'Not found', `no employee ${employeeId}`)
        case 'no-legal-entity':
          // The detail names no entity: it may exist in another tenant, and a
          // caller must not be able to tell that from a typo.
          return problem(c, 404, 'Not found', 'no such legal entity in this tenant')
        case 'same-legal-entity':
          return problem(c, 422, 'Already there', 'this employee is already at that legal entity')
        case 'no-open-period':
          // 409 rather than 404: the employee exists and the request is well
          // formed. What is missing is employment ON THAT DATE, which is a
          // state the caller can fix by choosing another date or by onboarding.
          return problem(
            c,
            409,
            'Nothing to transfer',
            `no employment period covers ${body.effectiveFrom}`,
          )
        case 'conflict':
          return problem(c, 409, 'Already employed there', result.detail)
        default:
          return c.json({ asOf: body.effectiveFrom, employee: toEmployeeRecord(result.row) }, 201)
      }
    },
  },
  {
    config: hrRoutes.listEmployments,
    async handler(c) {
      const { employeeId } = c.req.param()
      const { rows, hasMore } = await hr.listEmployments(tenantOf(c), String(employeeId))
      return c.json(
        {
          items: rows.map((r) => ({
            effectiveFrom: r.effectiveFrom,
            effectiveTo: r.effectiveTo,
            employeeId: r.employeeId,
            id: r.id,
            jobTitle: r.jobTitle,
            payBasis: r.payBasis,
            // An instant, not a business date -- transaction time (ADR-016).
            // The two are never implicitly converted, which is why one crosses
            // this boundary as `YYYY-MM-DD` text and this one as ISO 8601.
            recordedAt: r.recordedAt.toISOString(),
          })),
          meta: completeness(hasMore, hr.EMPLOYMENT_LIST_LIMIT, rows.length),
        },
        200,
      )
    },
  },
]
