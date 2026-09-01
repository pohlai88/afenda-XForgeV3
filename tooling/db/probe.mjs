#!/usr/bin/env node
/**
 * Is a database reachable? Exit 0 yes, 2 no. Nothing else.
 *
 * A stage that needs a database and cannot reach one is BLOCKED, not FAILED.
 * The distinction is the whole reason `util.mjs` has five statuses: BLOCKED
 * says the check should have run and could not, FAIL says the code is wrong.
 * Collapsing them sends someone to debug an assertion when the answer is that
 * Docker is not running -- which is exactly what the contract stage did.
 *
 * A SEPARATE PROCESS, because `util.mjs` is synchronous and the postgres client
 * is not. `run()` already spawns; this is the cheapest thing it can spawn that
 * answers the question honestly.
 *
 * NOT a substitute for the post-hoc checks in the `integration` and tenancy
 * stages. Those ask something STRONGER -- did the suite actually assert
 * anything -- and a reachable database does not answer it: a suite that
 * connected and then skipped every case has still proven nothing. Reachability
 * is a precondition, not evidence.
 */
import postgres from 'postgres'

const URL = process.env.DATABASE_URL ?? 'postgres://postgres:xforge@127.0.0.1:55432/xforge'

let db
try {
  db = postgres(URL, { connect_timeout: 5, max: 1, onnotice: () => {}, prepare: false })
  await db`select 1`
  await db.end({ timeout: 5 })
  process.exit(0)
} catch {
  try {
    await db?.end({ timeout: 2 })
  } catch {}
  process.exit(2)
}
