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
 * BOTH CONNECTIONS, because the subject uses both. Every stage that gates on
 * this file -- contract, tenancy, integration, e2e -- exercises code that
 * connects as the NON-OWNER `app_user` through `APP_DATABASE_URL`, which is the
 * whole point of the RLS proof: the owner role bypasses row-level security, so
 * a suite that only ever connected as owner would be testing nothing. Probing
 * the owner alone answered a question no stage asked. Measured: with
 * APP_DATABASE_URL pointed at a role that does not exist, the probe exited 0.
 *
 * That produced no false PASS -- the suites still failed -- but it failed in
 * the shape this file exists to prevent: FAIL, against assertions nobody broke,
 * where BLOCKED and "app_user cannot connect" is the true answer.
 *
 * `migrate.mjs` and `migrate-check.mjs` deliberately do NOT use this. They
 * apply DDL and legitimately need the owner alone.
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
// The developer fallbacks have ONE owner, and it is not this file. The literal
// stood here, in `db/migrate.mjs` and in `verify/lib/migrate-check.mjs`, while
// `tests/fixtures/local-database.ts` opens by declaring that "one file owns
// these strings so there is exactly one place to look". Reading its accessors
// rather than its constants also inherits the no-fallback-under-CI rule, which
// is the same reason those accessors exist.
import { appUrl, ownerUrl } from '@xforge/fixtures/local-database'
import postgres from 'postgres'

/** Connect, ask the cheapest possible question, and hang up. */
async function reachable(url) {
  let db
  try {
    db = postgres(url, { connect_timeout: 5, max: 1, onnotice: () => {}, prepare: false })
    await db`select 1`
    await db.end({ timeout: 5 })
    return true
  } catch {
    try {
      await db?.end({ timeout: 2 })
    } catch {}
    return false
  }
}

// Sequential, not concurrent. Two connections raced against an unreachable host
// both wait out the same timeout anyway, and reporting WHICH role failed is
// worth more than saving five seconds on a path that is already an outage.
for (const [role, url] of [
  ['the owner (DATABASE_URL)', ownerUrl],
  ['app_user (APP_DATABASE_URL)', appUrl],
]) {
  let resolved
  try {
    resolved = url()
  } catch (err) {
    // Under CI the accessors throw rather than falling back to a developer
    // port, which is a missing variable rather than an unreachable database --
    // still exit 2, because the stage's answer is the same: it cannot run.
    process.stderr.write(`${err?.message ?? err}\n`)
    process.exit(2)
  }
  if (!(await reachable(resolved))) {
    process.stderr.write(`cannot reach the database as ${role}\n`)
    process.exit(2)
  }
}

process.exit(0)
