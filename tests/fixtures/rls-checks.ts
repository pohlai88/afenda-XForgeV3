/**
 * The RLS structural checks, as functions.
 *
 * ONE AUTHORITY. The integration suite asserts these hold; T09, T10 and T12
 * break the database on purpose and assert the SAME functions report failure.
 * Written twice they would drift, and the copy the mutations exercised would be
 * the one nobody trusted.
 *
 * Every check asks the CATALOGUE, never a maintained list. A table added
 * without being registered anywhere is exactly the case that must not escape,
 * and a hand-kept inventory cannot see it.
 */
import type postgres from 'postgres'

type Sql = ReturnType<typeof postgres>

export interface Finding {
  readonly check: string
  readonly detail: string
  readonly subject: string
}

/** Tables carrying a `tenant_id` column, discovered from the catalogue. */
export async function discoverTenantTables(sql: Sql): Promise<string[]> {
  const rows = await sql<{ table_name: string }[]>`
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
    where n.nspname = 'public'
      and c.relkind = 'r'
      and a.attname = 'tenant_id'
      and a.attnum > 0
      and not a.attisdropped
    order by c.relname
  `
  return rows.map((r) => r.table_name)
}

/** AQS-005: every tenant-owned table has RLS enabled AND forced. */
export async function checkRlsCoverage(sql: Sql): Promise<Finding[]> {
  const out: Finding[] = []
  for (const table of await discoverTenantTables(sql)) {
    const [state] = await sql<{ relrowsecurity: boolean; relforcerowsecurity: boolean }[]>`
      select relrowsecurity, relforcerowsecurity from pg_class where relname = ${table}
    `
    if (!(state?.relrowsecurity && state?.relforcerowsecurity)) {
      out.push({
        check: 'rls-coverage',
        detail: `enabled=${state?.relrowsecurity} forced=${state?.relforcerowsecurity}`,
        subject: table,
      })
    }
  }
  return out
}

/**
 * AQS-007: the application role is not a superuser, does not hold BYPASSRLS,
 * and does not OWN a tenant table.
 *
 * All three matter and they fail differently. A superuser or BYPASSRLS role
 * ignores policy outright; an owner ignores it unless FORCE is set, which makes
 * the guarantee depend on a second setting nobody looks at twice.
 */
export async function checkApplicationRole(sql: Sql, role = 'app_user'): Promise<Finding[]> {
  const out: Finding[] = []
  const [attrs] = await sql<{ rolsuper: boolean; rolbypassrls: boolean }[]>`
    select rolsuper, rolbypassrls from pg_roles where rolname = ${role}
  `
  if (!attrs) {
    return [{ check: 'app-role', detail: 'role does not exist', subject: role }]
  }
  if (attrs.rolsuper) {
    out.push({ check: 'app-role', detail: 'is a superuser', subject: role })
  }
  if (attrs.rolbypassrls) {
    out.push({ check: 'app-role', detail: 'holds BYPASSRLS', subject: role })
  }

  for (const table of await discoverTenantTables(sql)) {
    const [owned] = await sql<{ owner: string }[]>`
      select pg_get_userbyid(c.relowner) as owner from pg_class c where c.relname = ${table}
    `
    if (owned?.owner === role) {
      out.push({ check: 'app-role', detail: `owned by ${role}`, subject: table })
    }
  }
  return out
}

/**
 * Law 11 read in the other direction: a table that LOOKS tenant-owned but
 * carries no `tenant_id` cannot be isolated at all.
 *
 * `expected` is the declared inventory. The catalogue decides what actually has
 * `tenant_id`; this reports anything declared tenant-owned that does not.
 */
export async function checkDeclaredTablesCarryTenantId(
  sql: Sql,
  expected: readonly string[],
): Promise<Finding[]> {
  const discovered = new Set(await discoverTenantTables(sql))
  return expected
    .filter((t) => !discovered.has(t))
    .map((t) => ({
      check: 'tenant-id-present',
      detail: 'declared tenant-owned but has no tenant_id column',
      subject: t,
    }))
}
