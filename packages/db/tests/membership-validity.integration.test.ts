/**
 * The half-open membership interval, pinned at both boundaries.
 *
 * WHY THIS EXISTS. A fixture race made `valid_from` land microseconds after the
 * instant a resolution asked about, and the first request after seeding was
 * denied. Fixing it with a fixed instant -- `FIXTURE_VALID_FROM`, comfortably in
 * the past -- was right, and it removed the only thing that had ever exercised
 * the boundary. Every seeded membership is now safely inside its interval, so
 * an inclusivity error in either direction would go unnoticed.
 *
 * Accidental coverage is replaced with deliberate coverage. Law 20 says
 * `[valid_from, valid_to)`, and the two ends behave differently on purpose:
 *
 *   valid_from  INCLUSIVE -- a membership beginning at T authorises at T
 *   valid_to    EXCLUSIVE -- a membership ending at T does NOT authorise at T
 *
 * The exclusive end is the one that matters. A closed upper bound leaves a
 * revoked principal one final authorised request, which is one more than
 * anybody intends -- and it fails OPEN, so nothing would report it.
 *
 * Every instant here is declared. One timeline owns the assertion: no `now()`,
 * no interval arithmetic, and nothing compared against a clock the test does
 * not control.
 */
import { hasActiveMembership } from '@xforge/db'
import { appUrl, ownerUrl } from '@xforge/fixtures/local-database'
import { TENANT_A } from '@xforge/fixtures/tenancy'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createPostgresDriver } from '../src/postgres-driver'

/** The declared timeline. Ordering between these is the whole subject. */
const BEFORE = new Date('2021-06-01T11:59:59.999Z')
const FROM = new Date('2021-06-01T12:00:00.000Z')
const DURING = new Date('2021-06-15T12:00:00.000Z')
const UNTIL = new Date('2021-07-01T12:00:00.000Z')
const JUST_BEFORE_UNTIL = new Date('2021-07-01T11:59:59.999Z')

/** Owned solely by this file, so it creates and removes only its own row. */
const PRINCIPAL = 'membership-boundary-subject'

let owner!: ReturnType<typeof postgres>
let driver!: ReturnType<typeof createPostgresDriver>
let reachable = false

try {
  owner = postgres(ownerUrl(), { connect_timeout: 5, max: 2, prepare: false })
  await owner`select 1`
  driver = createPostgresDriver(appUrl())
  reachable = true
} catch {
  reachable = false
}

beforeAll(async () => {
  if (!reachable) {
    return
  }
  await owner`
    insert into tenant (id, slug, name)
    values (${TENANT_A}, 'tenant-a', 'Tenant A Sdn Bhd')
    on conflict (id) do nothing
  `
  // Additive and scoped: this row, and no other test's.
  await owner`delete from tenant_membership where principal_id = ${PRINCIPAL}`
  await owner`
    insert into tenant_membership (tenant_id, principal_id, valid_from, valid_to)
    values (${TENANT_A}, ${PRINCIPAL}, ${FROM}, ${UNTIL})
  `
})

afterAll(async () => {
  if (reachable) {
    await owner`delete from tenant_membership where principal_id = ${PRINCIPAL}`
    await owner.end({ timeout: 5 })
  }
})

const activeAt = (asOf: Date) => hasActiveMembership(driver, TENANT_A, PRINCIPAL, asOf)

describe.skipIf(!reachable)('membership validity is half-open [valid_from, valid_to)', () => {
  it('is not active one millisecond before it begins', async () => {
    expect(await activeAt(BEFORE)).toBe(false)
  })

  // The inclusive end. This is the case the fixture race was failing: a
  // membership that had just begun was reported inactive, because the two sides
  // of the comparison came from different clocks.
  it('is active exactly at valid_from', async () => {
    expect(await activeAt(FROM)).toBe(true)
  })

  it('is active in the middle', async () => {
    expect(await activeAt(DURING)).toBe(true)
  })

  it('is active one millisecond before it ends', async () => {
    expect(await activeAt(JUST_BEFORE_UNTIL)).toBe(true)
  })

  /**
   * The exclusive end, and the assertion worth the most.
   *
   * If this end were inclusive, a revoked principal would keep one authorised
   * request -- and it fails OPEN, so no user reports it and no error surfaces.
   * T18 asserts revocation takes effect; this asserts the boundary it rests on.
   */
  it('is NOT active exactly at valid_to', async () => {
    expect(await activeAt(UNTIL)).toBe(false)
  })

  it('is not active after it ends', async () => {
    expect(await activeAt(new Date('2022-01-01T00:00:00.000Z'))).toBe(false)
  })
})
