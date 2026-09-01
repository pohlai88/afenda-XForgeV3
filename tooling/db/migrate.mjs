#!/usr/bin/env node
/**
 * Apply the migration set to a real database. `pnpm db:migrate`.
 *
 * THIS EXISTS BECAUSE ITS ABSENCE WAS A HAZARD. There was no command to migrate
 * a local database, so the obvious thing to reach for was `drizzle-kit
 * migrate` -- which reads `meta/_journal.json`, applied one of four migrations,
 * and said "migrations applied successfully!". The resulting schema had no
 * tenant tables and none of the FORCE ROW LEVEL SECURITY law 11 requires.
 *
 * It shares `applyMigrations` with the migration stage, so the command a
 * developer runs and the command the gate runs cannot diverge.
 *
 * Exit codes match migrate-check: 0 applied, 1 failed, 2 no database reachable.
 * "Could not apply" must never be reported as "applied".
 */
import postgres from 'postgres'
import { applyMigrations } from './apply-migrations.mjs'

const URL = process.env.DATABASE_URL ?? 'postgres://postgres:xforge@127.0.0.1:55432/xforge'

let db
try {
  db = postgres(URL, { connect_timeout: 5, max: 1, onnotice: () => {}, prepare: false })
  await db`select 1`
} catch {
  console.log(`no database reachable at ${URL.replace(/:[^:@/]*@/, ':***@')}`)
  process.exit(2)
}

try {
  const applied = await applyMigrations(db)
  await db.end({ timeout: 5 })
  console.log(`${applied.length} migrations applied: ${applied.join(', ')}`)
  process.exit(0)
} catch (err) {
  console.log(String(err?.message))
  try {
    await db.end({ timeout: 2 })
  } catch {}
  process.exit(1)
}
