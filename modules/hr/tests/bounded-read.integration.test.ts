/**
 * `partial` has a producer, proved against a real database.
 *
 * RENDERABLE IS NOT PRODUCIBLE, and they need separate owners. The conformance
 * harness can prove the UI language expresses a state; it cannot prove any code
 * path constructs one, because that is a property of the read, not of the
 * grammar. A green renderability check standing in for both is precisely how
 * `partial` would become decoration -- a status nothing ever returns, rendering
 * correctly forever.
 *
 * So this exercises the actual repository against actual PostgreSQL: seed past
 * the cap, and the read must report itself incomplete.
 *
 * The other half of the pair -- that a document expressing `partial` renders --
 * belongs to the harness. Neither test is evidence for the other.
 */
import { hasActiveMembership, resolveHostname, setDriver, tenancyDriver } from '@xforge/db'
import { createPostgresDriver } from '@xforge/db/postgres'
import { appUrl, ownerUrl } from '@xforge/fixtures/local-database'
import { FIXTURE_VALID_FROM, HOST_A, TENANT_A } from '@xforge/fixtures/tenancy'
import { LIST_LIMIT, listByEmployee } from '@xforge/hr/repository'
import {
  type MembershipQueries,
  resolveRequestTenant,
  type VerifiedTenantContext,
} from '@xforge/tenancy'
import postgres from 'postgres'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const TENANT = TENANT_A
const PRINCIPAL = 'bounded-read-user'
const EMPLOYEE = '55555555-5555-4555-8555-555555555555'

/**
 * Probed at module scope. `describe.skipIf` is evaluated during collection,
 * before any hook runs, so a flag set in `beforeAll` is always still false and
 * every test skips silently while appearing to be wired up.
 */
let owner!: ReturnType<typeof postgres>
let reachable = false

try {
  owner = postgres(ownerUrl(), { connect_timeout: 5, max: 2, prepare: false })
  await owner`select 1`
  reachable = true
} catch {
  reachable = false
}

/**
 * A REAL verified context, resolved the way a request resolves one.
 *
 * The first version cast an object into shape, and `no-forged-tenant-context`
 * refused it -- correctly. ADR-022's rule is that a verified context is only
 * ever produced by host resolution plus a membership check, and a test that
 * fabricates one is exercising the read against a context the application could
 * never hold. The guard is the reason this test is about the read AND about a
 * context that could actually reach it.
 */
const queries: MembershipQueries = {
  hasActiveMembership: (tenantId, principalId, asOf) =>
    hasActiveMembership(tenancyDriver(), tenantId, principalId, asOf),
  resolveHostname: (hostname) => resolveHostname(tenancyDriver(), hostname),
}

async function verifiedContext(): Promise<VerifiedTenantContext> {
  const resolved = await resolveRequestTenant(HOST_A, { id: PRINCIPAL }, queries, new Date())
  if (resolved.kind !== 'verified') {
    throw new Error(`fixture could not verify ${TENANT}: ${resolved.kind}`)
  }
  return resolved.context
}

const seed = async (count: number) => {
  await owner`delete from emergency_contact where employee_id = ${EMPLOYEE}`
  if (count === 0) {
    return
  }
  await owner`select set_config('app.tenant_id', ${TENANT}, true)`
  const rows = Array.from({ length: count }, (_, i) => ({
    employee_id: EMPLOYEE,
    // Padded so `order by name` is stable and the cap is a clean prefix.
    name: `Contact ${String(i).padStart(4, '0')}`,
    phone: '+60 12-000 0000',
    relationship: 'Colleague',
    tenant_id: TENANT,
  }))
  await owner`insert into emergency_contact ${owner(rows)}`
}

let context!: VerifiedTenantContext

beforeAll(() => {
  if (reachable) {
    setDriver(createPostgresDriver(appUrl()))
  }
})

/**
 * ADDITIVE, and re-established before every test rather than once.
 *
 * `seedTenancy` gives itself a known starting state with an unscoped
 * `delete from tenant_domain` and `delete from tenant_membership`. That is
 * correct for one file and unusable from two: whatever the ordering, another
 * file calling it removes this one's membership, and the symptom is a
 * resolution denied for a principal that was seeded moments earlier.
 * `--no-file-parallelism` did not save it, which is the evidence that the
 * ordering was never the property to rely on.
 *
 * So this inserts only what it needs and deletes nothing. Two files doing this
 * converge instead of destroying each other, and the state is re-established
 * immediately before each test rather than assumed to have survived.
 */
beforeEach(async () => {
  if (!reachable) {
    return
  }
  await owner`
    insert into tenant_domain (tenant_id, hostname, is_primary)
    values (${TENANT}, ${HOST_A}, true)
    on conflict do nothing
  `
  // The same fixed instant every seeded membership uses. An interval subtracted
  // from `now()` would make this pass while leaving two clocks either side of a
  // half-open boundary -- see the note on FIXTURE_VALID_FROM.
  await owner`
    insert into tenant_membership (tenant_id, principal_id, valid_from, valid_to)
    values (${TENANT}, ${PRINCIPAL}, ${FIXTURE_VALID_FROM}, null)
    on conflict do nothing
  `
  context = await verifiedContext()
})

afterAll(async () => {
  if (reachable) {
    await owner`delete from emergency_contact where employee_id = ${EMPLOYEE}`
    await owner.end({ timeout: 5 })
  }
})

describe.skipIf(!reachable)('the bounded read reports its own completeness', () => {
  it('is complete when everything fits', async () => {
    await seed(3)
    const { rows, hasMore } = await listByEmployee(context, EMPLOYEE)
    expect(rows).toHaveLength(3)
    expect(hasMore).toBe(false)
  })

  /**
   * Exactly at the cap is the case a count-based guess gets wrong.
   *
   * `returned === limit` does not imply a further row exists, so a client -- or
   * a repository -- inferring incompleteness from the count would report a
   * complete list of exactly `LIST_LIMIT` as truncated, forever. The probe for
   * one extra row is what makes the answer knowledge rather than a guess.
   */
  it('is complete at exactly the cap, which a count alone cannot tell', async () => {
    await seed(LIST_LIMIT)
    const { rows, hasMore } = await listByEmployee(context, EMPLOYEE)
    expect(rows).toHaveLength(LIST_LIMIT)
    expect(hasMore).toBe(false)
  })

  it('is partial one row past the cap, and returns no more than the cap', async () => {
    await seed(LIST_LIMIT + 1)
    const { rows, hasMore } = await listByEmployee(context, EMPLOYEE)
    expect(hasMore).toBe(true)
    expect(rows).toHaveLength(LIST_LIMIT)
  })

  // The read was unbounded before this. One pathological employee was all it
  // took for a screen to attempt an arbitrary number of rows.
  it('never returns more than the cap however many exist', async () => {
    await seed(LIST_LIMIT + 25)
    const { rows } = await listByEmployee(context, EMPLOYEE)
    expect(rows.length).toBeLessThanOrEqual(LIST_LIMIT)
  })
})
