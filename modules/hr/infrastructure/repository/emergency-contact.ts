/**
 * Emergency-contact repository.
 *
 * Database access happens ONLY here, and only inside `withTenant` (law 11/12).
 * Note every method takes `tenantId` as a required, non-optional parameter --
 * never an optional filter. RLS is the backstop, not the plan: relying on the
 * database to catch a missing predicate is what makes the backstop load-bearing.
 *
 * The store is in-memory for the spine phase. The Postgres implementation lands
 * with the tenancy phase, when AQS-005..008 can actually prove isolation. The
 * SHAPE is what the spine proves: chokepoint, required tenant binding, and
 * optimistic concurrency that rejects rather than merges.
 */
import { withTenant } from '@xforge/db'

export interface EmergencyContactRow {
  id: string
  tenantId: string
  employeeId: string
  name: string
  relationship: string
  phone: string
  version: number
}

export type UpdateResult =
  | { readonly kind: 'updated'; readonly row: EmergencyContactRow }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'conflict'; readonly currentVersion: number }

const store = new Map<string, EmergencyContactRow>()

/** Test seam. Not exported from the module's public surface. */
export function __reset(seed: readonly EmergencyContactRow[] = []): void {
  store.clear()
  for (const r of seed) store.set(r.id, { ...r })
}

export function listByEmployee(
  tenantId: string,
  employeeId: string,
): Promise<EmergencyContactRow[]> {
  return withTenant(tenantId, async () =>
    [...store.values()]
      .filter((r) => r.tenantId === tenantId && r.employeeId === employeeId)
      .map((r) => ({ ...r })),
  )
}

export function create(
  tenantId: string,
  employeeId: string,
  input: { name: string; relationship: string; phone: string },
  id: string,
): Promise<EmergencyContactRow> {
  return withTenant(tenantId, async () => {
    const row: EmergencyContactRow = { id, tenantId, employeeId, ...input, version: 1 }
    store.set(id, row)
    return { ...row }
  })
}

/**
 * ADR-013: the update is conditional on the version the caller read.
 *
 * In SQL this is `UPDATE ... WHERE id = $1 AND tenant_id = $2 AND version = $3`
 * with a zero-row result meaning conflict. Expressed that way the check cannot
 * be forgotten, and it is why a `version` token is mandated over a guarded
 * `updated_at`: a guard can see a missing field, not a mis-written predicate.
 */
export function update(
  tenantId: string,
  id: string,
  input: { name?: string; relationship?: string; phone?: string; version: number },
): Promise<UpdateResult> {
  return withTenant(tenantId, async () => {
    const row = store.get(id)
    if (!row || row.tenantId !== tenantId) return { kind: 'not-found' as const }
    if (row.version !== input.version) {
      return { kind: 'conflict' as const, currentVersion: row.version }
    }
    const next: EmergencyContactRow = {
      ...row,
      name: input.name ?? row.name,
      relationship: input.relationship ?? row.relationship,
      phone: input.phone ?? row.phone,
      version: row.version + 1,
    }
    store.set(id, next)
    return { kind: 'updated' as const, row: { ...next } }
  })
}
