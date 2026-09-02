/**
 * ONE SUITE AT A TIME AGAINST THE FIXTURE DATABASE.
 *
 * THE DEFECT THIS CLOSES, reproduced rather than reasoned about. The tenancy
 * suite's `seed()` runs `delete from emergency_contact` and then inserts two
 * rows at fixed primary keys. `vitest.config.ts` sets `fileParallelism: false`
 * so files inside ONE run cannot do that to each other, and the comment there
 * is a post-mortem of exactly that hazard.
 *
 * Nothing covered a SECOND PROCESS. Another agent, a second terminal, a stray
 * `pnpm e2e`, or CI on the same host clears and re-inserts the same rows
 * mid-run, and the loser of the race gets either
 *
 *     duplicate key value violates unique constraint "emergency_contact_pkey"
 *
 * -- which throws inside `beforeAll` and fails every test in that file -- or a
 * row count that is briefly 0 or 2, which fails the count-based assertions and
 * says nothing about why.
 *
 * Measured: a competing re-seeder run against the suite for 60 seconds took
 * SIX files down outright and broke six more assertions, including
 * `T02 -- RLS carries the boundary, not the WHERE clause`.
 *
 * WHY THAT IS WORSE THAN A FLAKE. T02's own header reads "If this test ever
 * fails, the architecture's central claim is false and the tenant predicate has
 * been carrying the boundary all along." A fixture race can therefore raise a
 * false alarm about tenant isolation -- and the second time somebody sees it
 * flake, they learn to dismiss the one test in this repository that must never
 * be dismissed. The boundary is never actually involved: RLS holds throughout,
 * and only the fixture rows move.
 *
 * AN ADVISORY LOCK, and specifically a SESSION-level one on a connection of its
 * own. PostgreSQL releases it when that connection closes, so a killed process,
 * a Ctrl-C or a crashed runner cannot leave the fixture locked -- which is the
 * failure mode that would make this cure worse than the disease. It is the same
 * reasoning `assertBoundaryIntact` applies to a half-finished mutation.
 *
 * NOT `max: 2`. The suite's own owner pool has two connections, and an advisory
 * lock belongs to the SESSION that took it: `pg_advisory_lock` on one pooled
 * connection and `pg_advisory_unlock` on the other would silently fail to
 * release. This client is pinned to one.
 */
import postgres from 'postgres'
import { ownerUrl } from './local-database'

/**
 * An arbitrary constant, and it only has to be stable and unlikely.
 * `pg_advisory_lock` namespaces nothing for us -- two unrelated projects
 * sharing a cluster and a key would block each other, which is why this is
 * derived from the repository name rather than being `1`.
 */
// A NUMBER, not a bigint. postgres.js's tagged-template types do not accept
// bigint, and the failure is obscure -- TS1320, "await operand must ... not
// contain a callable 'then' member" -- reported against the query rather than
// the value. Comfortably inside Number.MAX_SAFE_INTEGER.
const FIXTURE_LOCK_KEY = 8_147_326_591_004_772

/** How long to wait for another runner to finish before giving up on it. */
const WAIT_MS = 90_000
const POLL_MS = 250

let lock: ReturnType<typeof postgres> | null = null

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Block until this process owns the fixture, or fail saying why.
 *
 * Idempotent: a suite whose files each call `seed()` acquires once and holds it
 * until `releaseFixture()`, so the lock spans the file's assertions rather than
 * only its seed. Holding it for the seed alone would leave the same race in a
 * narrower window, which is the kind of fix that removes the symptom and keeps
 * the defect.
 */
export async function acquireFixture(): Promise<void> {
  if (lock !== null) {
    return
  }
  const client = postgres(ownerUrl(), { connect_timeout: 5, max: 1, prepare: false })
  const deadline = Date.now() + WAIT_MS

  for (;;) {
    const [row] = await client<{ locked: boolean }[]>`
      select pg_try_advisory_lock(${FIXTURE_LOCK_KEY}) as locked
    `
    if (row?.locked) {
      lock = client
      return
    }
    if (Date.now() >= deadline) {
      await client.end({ timeout: 5 })
      throw new Error(
        [
          'REFUSING TO RUN: another process is holding the fixture database.',
          `Waited ${WAIT_MS / 1000}s for advisory lock ${FIXTURE_LOCK_KEY}.`,
          'These suites clear and re-insert rows at fixed primary keys, so two',
          'runners against one database corrupt each other -- which surfaces as',
          'a duplicate-key error or a wrong row count in the tenancy proof, and',
          'looks exactly like a tenant-isolation failure while being nothing of',
          'the kind. Finish the other run, or point this one at its own database.',
        ].join(' '),
      )
    }
    await sleep(POLL_MS)
  }
}

/** Hand the fixture to whoever is waiting. Safe to call when not held. */
export async function releaseFixture(): Promise<void> {
  if (lock === null) {
    return
  }
  const client = lock
  lock = null
  // Ending the connection releases a session-level lock on its own; the
  // explicit unlock is so the release is visible to anyone reading pg_locks
  // during a hung teardown rather than only implied by a disconnect.
  try {
    await client`select pg_advisory_unlock(${FIXTURE_LOCK_KEY})`
  } finally {
    await client.end({ timeout: 5 })
  }
}
