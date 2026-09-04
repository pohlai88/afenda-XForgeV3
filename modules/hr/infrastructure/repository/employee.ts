/**
 * HR core repository -- real PostgreSQL, reads only.
 *
 * Database access happens ONLY here and only inside `withTenant` (laws 11/12),
 * which takes a VerifiedTenantContext rather than a tenant id (ADR-022).
 *
 * Every statement carries `tenant_id = ${ctx.tenantId}` as DEFENCE IN DEPTH AND
 * AN INDEX HINT. It is not the security boundary -- that is FORCE ROW LEVEL
 * SECURITY under the non-owner `app_user` role, and T02 proves it by deleting
 * the predicate from queries like these and requiring isolation to hold anyway.
 *
 * ---------------------------------------------------------------------------
 * DATES CROSS THIS BOUNDARY AS TEXT, DELIBERATELY
 * ---------------------------------------------------------------------------
 * `effective_from` and `effective_to` are cast with `::text`, which under
 * PostgreSQL's ISO DateStyle is exactly `YYYY-MM-DD`. The driver would
 * otherwise parse a `date` column into a JavaScript `Date` -- an INSTANT, at
 * midnight, in whichever zone the Node process happens to run. That is the
 * implicit business-date-to-instant conversion ADR-016 forbids, and it is
 * invisible: the value looks right in a debugger and is off by a day for every
 * employee west of the runtime.
 *
 * `recorded_at` is genuinely an instant and stays one.
 */
import { type TenantClient, withTenant } from '@xforge/db'
import type { VerifiedTenantContext } from '@xforge/tenancy'

/**
 * The most rows each read will return.
 *
 * Three numbers rather than one, because they bound three different things and
 * a single shared constant would tie a directory page size to the length of one
 * person's career. Each is far above any real value and far below anything that
 * hurts to render.
 */
export const EMPLOYEE_LIST_LIMIT = 200
export const LEGAL_ENTITY_LIST_LIMIT = 100
export const EMPLOYMENT_LIST_LIMIT = 100

export interface Bounded<T> {
  /** Authoritative -- the server is the only party that can answer this. */
  hasMore: boolean
  rows: T[]
}

export interface LegalEntityRow {
  countryCode: string
  id: string
  name: string
  registrationNumber: string | null
  timeZone: string
}

/** The employment effective on the requested date, or none. */
export interface EmploymentSummaryRow {
  effectiveFrom: string
  effectiveTo: string | null
  jobTitle: string
  payBasis: 'daily' | 'hourly' | 'monthly'
}

export interface EmployeeSummaryRow {
  effectiveFrom: string | null
  effectiveTo: string | null
  employeeId: string
  employeeNumber: string
  fullName: string
  jobTitle: string | null
  legalEntityId: string
  legalEntityName: string
  payBasis: 'daily' | 'hourly' | 'monthly' | null
  personId: string
}

export interface EmployeeRecordRow extends EmployeeSummaryRow {
  countryCode: string
  preferredName: string | null
  registrationNumber: string | null
  timeZone: string
}

export interface EmploymentRow {
  effectiveFrom: string
  effectiveTo: string | null
  employeeId: string
  id: string
  jobTitle: string
  payBasis: 'daily' | 'hourly' | 'monthly'
  recordedAt: Date
}

/**
 * A bounded read that KNOWS whether it truncated.
 *
 * Fetches `limit + 1` and returns at most `limit`. That extra row is the whole
 * point: `returned === limit` does not prove another row exists, so a caller
 * inferring incompleteness from a count would report a complete list of exactly
 * `limit` as truncated forever.
 */
const bound = <T>(probed: readonly T[], limit: number): Bounded<T> => ({
  hasMore: probed.length > limit,
  rows: [...probed].slice(0, limit),
})

export function listLegalEntities(ctx: VerifiedTenantContext): Promise<Bounded<LegalEntityRow>> {
  return withTenant(ctx, async (sql) => {
    const probed = await sql<LegalEntityRow>`
      select id,
             name,
             registration_number as "registrationNumber",
             country_code        as "countryCode",
             time_zone           as "timeZone"
      from legal_entity
      where tenant_id = ${ctx.tenantId}
      order by name
      limit ${LEGAL_ENTITY_LIST_LIMIT + 1}
    `
    return bound(probed, LEGAL_ENTITY_LIST_LIMIT)
  })
}

/**
 * The directory, resolved at one business date.
 *
 * THE LATERAL JOIN IS WHERE ADR-016 LIVES. It selects the employment period
 * COVERING `asOf` under the half-open rule -- `effective_from <= asOf` and
 * `effective_to > asOf` or NULL -- and joins LEFT, so an employee with no
 * period covering that date comes back with nulls rather than disappearing from
 * the directory. That distinction is the ADR's "no row effective on D is a
 * distinct outcome" made concrete: the row is present and says it has no
 * employment then, which is a different claim from the employee not existing.
 *
 * `limit 1` inside the lateral is not a tie-break and never picks between
 * candidates. `employment_no_overlap` -- the EXCLUDE constraint in
 * `0004_hr_core.sql` -- makes two periods covering one date unrepresentable for
 * a given employee, so at most one row can match. If that constraint were ever
 * dropped this would silently start choosing, which is why the constraint and
 * not this clause is the thing that has to hold.
 */
export function listEmployees(
  ctx: VerifiedTenantContext,
  query: { asOf: string; legalEntityId?: string | undefined },
): Promise<Bounded<EmployeeSummaryRow>> {
  return withTenant(ctx, async (sql) => {
    const probed = await sql<EmployeeSummaryRow>`
      select e.id            as "employeeId",
             e.person_id     as "personId",
             e.employee_number as "employeeNumber",
             e.legal_entity_id as "legalEntityId",
             le.name         as "legalEntityName",
             p.full_name     as "fullName",
             emp.effective_from as "effectiveFrom",
             emp.effective_to   as "effectiveTo",
             emp.job_title      as "jobTitle",
             emp.pay_basis      as "payBasis"
      from employee e
      join person p
        on p.tenant_id = e.tenant_id and p.id = e.person_id
      join legal_entity le
        on le.tenant_id = e.tenant_id and le.id = e.legal_entity_id
      left join lateral (
        select em.effective_from::text as effective_from,
               em.effective_to::text   as effective_to,
               em.job_title,
               em.pay_basis
        from employment em
        where em.tenant_id = e.tenant_id
          and em.employee_id = e.id
          and em.effective_from <= ${query.asOf}::date
          and (em.effective_to is null or em.effective_to > ${query.asOf}::date)
        limit 1
      ) emp on true
      where e.tenant_id = ${ctx.tenantId}
        ${query.legalEntityId ? sql`and e.legal_entity_id = ${query.legalEntityId}` : sql``}
      order by p.full_name, e.employee_number
      limit ${EMPLOYEE_LIST_LIMIT + 1}
    `
    return bound(probed, EMPLOYEE_LIST_LIMIT)
  })
}

/**
 * The employee projection, INSIDE a caller's transaction.
 *
 * Split out so `onboard` can read its result back through the very query the
 * GET serves, rather than assembling the same fields a second time. Two
 * assemblies of one record is the second source this repository keeps finding,
 * and here it would have the sharpest possible symptom: the object returned by
 * the write disagreeing with the object returned by the next read.
 *
 * It takes `sql` rather than a context because `withTenant` opens a
 * transaction; calling `getEmployee` from inside one would open a second.
 */
async function getEmployeeIn(
  sql: TenantClient,
  ctx: VerifiedTenantContext,
  employeeId: string,
  asOf: string,
): Promise<EmployeeRecordRow | undefined> {
  const rows = await sql<EmployeeRecordRow>`
      select e.id              as "employeeId",
             e.person_id       as "personId",
             e.employee_number as "employeeNumber",
             e.legal_entity_id as "legalEntityId",
             le.name           as "legalEntityName",
             le.registration_number as "registrationNumber",
             le.country_code   as "countryCode",
             le.time_zone      as "timeZone",
             p.full_name       as "fullName",
             p.preferred_name  as "preferredName",
             emp.effective_from as "effectiveFrom",
             emp.effective_to   as "effectiveTo",
             emp.job_title      as "jobTitle",
             emp.pay_basis      as "payBasis"
      from employee e
      join person p
        on p.tenant_id = e.tenant_id and p.id = e.person_id
      join legal_entity le
        on le.tenant_id = e.tenant_id and le.id = e.legal_entity_id
      left join lateral (
        select em.effective_from::text as effective_from,
               em.effective_to::text   as effective_to,
               em.job_title,
               em.pay_basis
        from employment em
        where em.tenant_id = e.tenant_id
          and em.employee_id = e.id
          and em.effective_from <= ${asOf}::date
          and (em.effective_to is null or em.effective_to > ${asOf}::date)
        limit 1
      ) emp on true
      where e.tenant_id = ${ctx.tenantId} and e.id = ${employeeId}
    `
  return rows[0]
}

/** One employee resolved at a date, with the legal entity that employs them. */
export function getEmployee(
  ctx: VerifiedTenantContext,
  employeeId: string,
  asOf: string,
): Promise<EmployeeRecordRow | undefined> {
  return withTenant(ctx, (sql) => getEmployeeIn(sql, ctx, employeeId, asOf))
}

/**
 * Every employment period, earliest first.
 *
 * This is the operation that legitimately sees rows NOT covering any particular
 * date, which is what lets a screen tell "has not started yet" from "has ended"
 * without the server guessing from a row it was not asked about.
 */
export function listEmployments(
  ctx: VerifiedTenantContext,
  employeeId: string,
): Promise<Bounded<EmploymentRow>> {
  return withTenant(ctx, async (sql) => {
    const probed = await sql<EmploymentRow>`
      select id,
             employee_id          as "employeeId",
             effective_from::text as "effectiveFrom",
             effective_to::text   as "effectiveTo",
             job_title            as "jobTitle",
             pay_basis            as "payBasis",
             recorded_at          as "recordedAt"
      from employment
      where tenant_id = ${ctx.tenantId} and employee_id = ${employeeId}
      order by effective_from
      limit ${EMPLOYMENT_LIST_LIMIT + 1}
    `
    return bound(probed, EMPLOYMENT_LIST_LIMIT)
  })
}

export type OnboardResult =
  | { readonly kind: 'onboarded'; readonly row: EmployeeRecordRow }
  | { readonly kind: 'no-legal-entity' }
  | { readonly kind: 'conflict'; readonly detail: string }

export interface OnboardInput {
  readonly effectiveFrom: string
  readonly employeeNumber: string
  readonly fullName: string
  readonly jobTitle: string
  readonly legalEntityId: string
  readonly payBasis: 'daily' | 'hourly' | 'monthly'
  readonly preferredName?: string | null | undefined
}

/** PostgreSQL unique_violation. The only one this transaction can raise. */
const UNIQUE_VIOLATION = '23505'

/**
 * Onboard: person, employee and first employment period, in ONE transaction.
 *
 * `withTenant` runs its callback inside `sql.begin`, so the three inserts commit
 * or roll back together. That is not a nicety: a partial commit leaves a person
 * on a legal entity's books with no employment period, which is exactly the row
 * the directory renders as "no employment period on this date" and which no
 * statutory process can see. The failure would look like a data-entry mistake
 * rather than a crash.
 *
 * ------------------------------------------------------------------------
 * IT ALWAYS CREATES A NEW PERSON, AND THAT IS A LIMIT WORTH STATING
 * ------------------------------------------------------------------------
 * ADR-009 says one person record per human per tenant, and this cannot honour
 * that on its own: deciding that two names are the same human needs an
 * identifier -- a national id or a passport number -- which the contract
 * deliberately does not collect yet, because there is no response filter to
 * read it back through.
 *
 * So onboarding is for a human this tenant has not employed before. Adding a
 * SECOND employment at another legal entity in the group -- ADR-009's whole
 * worked example -- is a different operation against an existing `person_id`,
 * and it is not this one. Building it here by matching on `full_name` would be
 * worse than not having it: two people called Ahmad bin Yusof would silently
 * become one, and the collapse would surface as a wrong EPF number.
 *
 * ------------------------------------------------------------------------
 * THE LEGAL ENTITY IS CHECKED, NOT INFERRED FROM A FOREIGN-KEY ERROR
 * ------------------------------------------------------------------------
 * A missing entity and a duplicate employee number are different answers to the
 * caller -- 404 and 409 -- and reading them out of a driver's error codes means
 * the API's status depends on which constraint the planner happened to hit
 * first. The SELECT runs inside the same transaction, so it cannot be raced by
 * a delete; the unique index still backstops the number, and that one IS caught
 * by code because there is no way to check-then-insert without a race.
 */
export function onboard(
  ctx: VerifiedTenantContext,
  input: OnboardInput,
  ids: { readonly employeeId: string; readonly employmentId: string; readonly personId: string },
): Promise<OnboardResult> {
  return withTenant(ctx, async (sql) => {
    const entity = await sql<{ id: string }>`
      select id from legal_entity
      where tenant_id = ${ctx.tenantId} and id = ${input.legalEntityId}
    `
    if (entity.length === 0) {
      return { kind: 'no-legal-entity' as const }
    }

    try {
      await sql`
        insert into person (id, tenant_id, full_name, preferred_name)
        values (${ids.personId}, ${ctx.tenantId}, ${input.fullName},
                ${input.preferredName ?? null})
      `
      await sql`
        insert into employee (id, tenant_id, person_id, legal_entity_id, employee_number)
        values (${ids.employeeId}, ${ctx.tenantId}, ${ids.personId},
                ${input.legalEntityId}, ${input.employeeNumber})
      `
      // NO `effective_to`: employment is open-ended until something ends it.
      // A default end date would be this module inventing a leaving date.
      await sql`
        insert into employment
          (id, tenant_id, employee_id, effective_from, job_title, pay_basis)
        values (${ids.employmentId}, ${ctx.tenantId}, ${ids.employeeId},
                ${input.effectiveFrom}::date, ${input.jobTitle}, ${input.payBasis})
      `
    } catch (err) {
      // Narrow: only the constraint this operation can actually violate is
      // translated. Anything else is a real failure and must not be dressed up
      // as a business outcome the caller can act on.
      if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
        return {
          detail: `employee number ${input.employeeNumber} is already in use at this legal entity`,
          kind: 'conflict' as const,
        }
      }
      throw err
    }

    // Read back through the same projection the GET uses, at the day employment
    // begins -- so the response is the record the caller will next read, not a
    // second assembly of the same fields that could disagree with it.
    const row = await getEmployeeIn(sql, ctx, ids.employeeId, input.effectiveFrom)
    if (!row) {
      throw new Error('onboarded employee could not be read back')
    }
    return { kind: 'onboarded' as const, row }
  })
}

export type TransferResult =
  | { readonly kind: 'transferred'; readonly row: EmployeeRecordRow }
  | { readonly kind: 'employee-not-found' }
  | { readonly kind: 'no-legal-entity' }
  | { readonly kind: 'same-legal-entity' }
  | { readonly kind: 'no-open-period' }
  | { readonly kind: 'conflict'; readonly detail: string }

export interface TransferInput {
  readonly effectiveFrom: string
  readonly employeeNumber: string
  readonly jobTitle: string
  readonly payBasis: 'daily' | 'hourly' | 'monthly'
  readonly toLegalEntityId: string
}

/**
 * Transfer: close one employment period, open another at a second legal entity,
 * for the SAME person. One transaction.
 *
 * ADR-009's worked case, and every step below is one of the ways it goes wrong
 * if the three rows are not written together.
 *
 * ------------------------------------------------------------------------
 * THE DATE IS USED TWICE AND THAT IS WHY THERE IS NO GAP
 * ------------------------------------------------------------------------
 * The source period gets `effective_to = D` and the destination period gets
 * `effective_from = D`. Ranges are half-open (law 20), so D belongs to the
 * destination alone: the two periods are adjacent, share no day, and leave no
 * day uncovered. Asking a caller for a "last day" and a "first day" would be
 * two facts that can disagree by one, in the direction nobody notices until a
 * month is paid twice across one date.
 *
 * ------------------------------------------------------------------------
 * THE PERIOD BEING CLOSED IS THE ONE COVERING D, NOT "THE LATEST"
 * ------------------------------------------------------------------------
 * Selecting the most recent row and closing it would silently truncate a FUTURE
 * period when somebody transfers with a backdated date, and would close nothing
 * useful when the employee has already left. The predicate is the same
 * half-open one the directory resolves with, and finding no such row is a
 * distinct outcome (ADR-016) rather than a reason to proceed with an assumption.
 *
 * ------------------------------------------------------------------------
 * THE EXCLUSION CONSTRAINT PERMITS WHAT HAPPENS HERE, DELIBERATELY
 * ------------------------------------------------------------------------
 * `employment_no_overlap` is keyed on `employee_id`, so two periods for the SAME
 * employee cannot overlap -- which is what makes closing before opening
 * necessary -- while two periods for the same PERSON at different employers can.
 * That is not a loophole: it is the concurrent-employment case ADR-009 exists to
 * represent, and keying the constraint on `person_id` would have forbidden it.
 */
export function transfer(
  ctx: VerifiedTenantContext,
  employeeId: string,
  input: TransferInput,
  ids: { readonly employeeId: string; readonly employmentId: string },
): Promise<TransferResult> {
  return withTenant(ctx, async (sql) => {
    const source = await sql<{ legalEntityId: string; personId: string }>`
      select person_id as "personId", legal_entity_id as "legalEntityId"
      from employee
      where tenant_id = ${ctx.tenantId} and id = ${employeeId}
    `
    const [from] = source
    if (!from) {
      return { kind: 'employee-not-found' as const }
    }
    if (from.legalEntityId === input.toLegalEntityId) {
      // Not a conflict and not a not-found: the request is coherent and the
      // outcome would be a no-op that closed a period and reopened it at the
      // same employer, which is a data loss dressed as a transfer.
      return { kind: 'same-legal-entity' as const }
    }

    const target = await sql<{ id: string }>`
      select id from legal_entity
      where tenant_id = ${ctx.tenantId} and id = ${input.toLegalEntityId}
    `
    if (target.length === 0) {
      return { kind: 'no-legal-entity' as const }
    }

    // Close the period COVERING the transfer date. `returning id` is the check:
    // zero rows means no period covered D, and proceeding would open employment
    // at the destination that never started anywhere.
    const closed = await sql<{ id: string }>`
      update employment
      set effective_to = ${input.effectiveFrom}::date,
          updated_at = now(),
          version = version + 1
      where tenant_id = ${ctx.tenantId}
        and employee_id = ${employeeId}
        and effective_from <= ${input.effectiveFrom}::date
        and (effective_to is null or effective_to > ${input.effectiveFrom}::date)
      returning id
    `
    if (closed.length === 0) {
      return { kind: 'no-open-period' as const }
    }

    try {
      // The SAME person. This is the line ADR-009's three levels exist for.
      await sql`
        insert into employee (id, tenant_id, person_id, legal_entity_id, employee_number)
        values (${ids.employeeId}, ${ctx.tenantId}, ${from.personId},
                ${input.toLegalEntityId}, ${input.employeeNumber})
      `
      await sql`
        insert into employment
          (id, tenant_id, employee_id, effective_from, job_title, pay_basis)
        values (${ids.employmentId}, ${ctx.tenantId}, ${ids.employeeId},
                ${input.effectiveFrom}::date, ${input.jobTitle}, ${input.payBasis})
      `
    } catch (err) {
      if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
        // Two unique indexes can refuse this insert and they mean different
        // things to a person: the number is taken by somebody else, or this
        // human already has a record at the destination. The constraint name is
        // the only thing that distinguishes them, so it is read rather than
        // guessed.
        const constraint = String((err as { constraint_name?: string }).constraint_name ?? '')
        return {
          detail: constraint.includes('person')
            ? 'this person already has an employee record at that legal entity'
            : `employee number ${input.employeeNumber} is already in use at that legal entity`,
          kind: 'conflict' as const,
        }
      }
      throw err
    }

    const row = await getEmployeeIn(sql, ctx, ids.employeeId, input.effectiveFrom)
    if (!row) {
      throw new Error('transferred employee could not be read back')
    }
    return { kind: 'transferred' as const, row }
  })
}
