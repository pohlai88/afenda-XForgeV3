/**
 * The HR module's mountable surface.
 *
 * Handlers are thin: they translate HTTP to an application call and back.
 * Policy is already evaluated by the adapter before a handler runs (ADR-014),
 * so a handler never re-checks permission -- one place, not two.
 */

import type { RouteDefinition } from '@xforge/api'
import type { Context } from 'hono'
import { hrRoutes } from './contract/routes'
import * as repo from './infrastructure/repository/emergency-contact'

const toContact = (r: repo.EmergencyContactRow) => ({
  id: r.id,
  employeeId: r.employeeId,
  name: r.name,
  relationship: r.relationship,
  phone: r.phone,
  version: r.version,
})

const problem = (c: Context, status: 404 | 409 | 422, title: string, detail: string) =>
  c.json(
    { type: 'about:blank', title, status, detail, instance: c.req.path, request_id: null },
    status,
    { 'content-type': 'application/problem+json' },
  )

/** ADR-015: exactly one bound tenant per request; never derived from the host. */
const tenantOf = (c: Context): string => {
  const principal = c.get('principal') as { tenantId: string } | undefined
  if (!principal?.tenantId) throw new Error('no bound tenant on request')
  return principal.tenantId
}

export const hrModuleRoutes: RouteDefinition[] = [
  {
    config: hrRoutes.listEmergencyContacts,
    async handler(c) {
      const { employeeId } = c.req.param()
      const items = await repo.listByEmployee(tenantOf(c), String(employeeId))
      return c.json({ items: items.map(toContact) }, 200)
    },
  },
  {
    config: hrRoutes.createEmergencyContact,
    async handler(c) {
      const { employeeId } = c.req.param()
      const body = (await c.req.json()) as { name: string; relationship: string; phone: string }
      const id = (c.get('newId') as string | undefined) ?? crypto.randomUUID()
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
]

export { __reset as __resetHrStore } from './infrastructure/repository/emergency-contact'
export { hrRoutes }
