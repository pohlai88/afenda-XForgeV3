/**
 * Emergency-contact repository -- real PostgreSQL.
 *
 * Database access happens ONLY here, and only inside `withTenant` (law 11/12),
 * which now takes a VerifiedTenantContext rather than a tenant id (ADR-022).
 *
 * Every statement below carries `tenant_id = ${ctx.tenantId}` as well. That
 * predicate is DEFENCE IN DEPTH AND AN INDEX HINT -- it is not the security
 * boundary. The boundary is FORCE ROW LEVEL SECURITY under the non-owner
 * `app_user` role, and T02 proves it by deleting the predicate from these very
 * queries and requiring that isolation still holds. A suite that passes only
 * because every query here happens to be careful has proven the author careful,
 * not the architecture safe -- and carefulness is exactly what erodes across an
 * agent-authored codebase.
 */
import { withTenant } from '@xforge/db'
import type { VerifiedTenantContext } from '@xforge/tenancy'

export interface EmergencyContactRow {
  employeeId: string
  id: string
  name: string
  phone: string
  relationship: string
  tenantId: string
  version: number
}

export type UpdateResult =
  | { readonly kind: 'updated'; readonly row: EmergencyContactRow }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'conflict'; readonly currentVersion: number }

export function listByEmployee(
  ctx: VerifiedTenantContext,
  employeeId: string,
): Promise<EmergencyContactRow[]> {
  return withTenant(ctx, async (sql) => {
    const rows = await sql<EmergencyContactRow>`
      select id, tenant_id as "tenantId", employee_id as "employeeId",
             name, relationship, phone, version
      from emergency_contact
      where tenant_id = ${ctx.tenantId} and employee_id = ${employeeId}
      order by name
    `
    return [...rows]
  })
}

export function create(
  ctx: VerifiedTenantContext,
  employeeId: string,
  input: { name: string; relationship: string; phone: string },
  id: string,
): Promise<EmergencyContactRow> {
  return withTenant(ctx, async (sql) => {
    const rows = await sql<EmergencyContactRow>`
      insert into emergency_contact (id, tenant_id, employee_id, name, relationship, phone)
      values (${id}, ${ctx.tenantId}, ${employeeId}, ${input.name},
              ${input.relationship}, ${input.phone})
      returning id, tenant_id as "tenantId", employee_id as "employeeId",
                name, relationship, phone, version
    `
    const [row] = rows
    // An INSERT ... RETURNING that yields nothing means the WITH CHECK policy
    // refused the row. Failing loudly beats returning a half-built object.
    if (!row) {
      throw new Error('insert returned no row -- tenant policy refused the write')
    }
    return row
  })
}

/**
 * ADR-013: the update is conditional on the version the caller read.
 *
 * The `version` predicate is in the UPDATE itself, so a zero-row result IS the
 * conflict -- the check cannot be forgotten by a later edit. The preceding
 * SELECT exists only to tell 404 from 409, which the row count alone cannot.
 */
export function update(
  ctx: VerifiedTenantContext,
  id: string,
  input: { name?: string; relationship?: string; phone?: string; version: number },
): Promise<UpdateResult> {
  return withTenant(ctx, async (sql) => {
    const current = await sql<{ version: number }>`
      select version from emergency_contact
      where id = ${id} and tenant_id = ${ctx.tenantId}
    `
    const [existing] = current
    if (!existing) {
      return { kind: 'not-found' as const }
    }
    if (existing.version !== input.version) {
      return { currentVersion: existing.version, kind: 'conflict' as const }
    }

    const rows = await sql<EmergencyContactRow>`
      update emergency_contact
      set name         = coalesce(${input.name ?? null}, name),
          relationship = coalesce(${input.relationship ?? null}, relationship),
          phone        = coalesce(${input.phone ?? null}, phone),
          version      = version + 1,
          updated_at   = now()
      where id = ${id} and tenant_id = ${ctx.tenantId} and version = ${input.version}
      returning id, tenant_id as "tenantId", employee_id as "employeeId",
                name, relationship, phone, version
    `
    // Zero rows here means another writer committed between the SELECT and the
    // UPDATE. Report the conflict rather than reporting success on no change.
    const [row] = rows
    if (!row) {
      return { currentVersion: input.version, kind: 'conflict' as const }
    }
    return { kind: 'updated' as const, row }
  })
}
