#!/usr/bin/env node
/**
 * Apply every migration, in order, to a FRESH scratch database.
 *
 * Exit codes: 0 applied cleanly · 1 a migration failed · 2 no database reachable.
 * The distinction matters -- "could not check" must never be reported as "checked".
 */
import { join } from 'node:path'
import postgres from 'postgres'
import { LOCAL_OWNER_URL } from '../../../tests/fixtures/local-database.ts'
import { applyMigrations, MIGRATIONS_DIR } from '../../db/apply-migrations.mjs'

const ADMIN = process.env.DATABASE_URL ?? LOCAL_OWNER_URL
const SCRATCH = 'xforge_migrate_check'
// MIGRATIONS_DIR, not the literal it holds. It is documented as existing "so no
// caller has to restate it", and this was the only caller -- restating it.
const dir = join(process.cwd(), MIGRATIONS_DIR)

let admin
try {
  admin = postgres(ADMIN, { connect_timeout: 5, max: 1, onnotice: () => {}, prepare: false })
  await admin`select 1`
} catch {
  process.exit(2)
}

try {
  await admin.unsafe(`drop database if exists ${SCRATCH}`)
  await admin.unsafe(`create database ${SCRATCH}`)

  const scratchUrl = ADMIN.replace(/\/[^/?]+(\?|$)/, `/${SCRATCH}$1`)
  const db = postgres(scratchUrl, { max: 1, onnotice: () => {}, prepare: false })

  // Shared with `pnpm db:migrate`, so the command a developer runs against a
  // real database and the one the gate runs against a scratch database cannot
  // diverge. Two implementations of "apply the migrations" is how the drizzle
  // journal came to describe a different set from this directory.
  await applyMigrations(db, dir)

  // The schema the migrations produce must satisfy the invariant the
  // architecture actually cares about, not merely apply without error.
  const rows = await db`
    select c.relname, c.relrowsecurity, c.relforcerowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join information_schema.columns col
      on col.table_name = c.relname and col.column_name = 'tenant_id'
    where n.nspname = 'public' and c.relkind = 'r'
  `
  const bad = rows.filter((r) => !(r.relrowsecurity && r.relforcerowsecurity))
  await db.end({ timeout: 5 })

  if (bad.length) {
    console.log(
      `tenant tables without RLS enabled AND forced: ${bad.map((b) => b.relname).join(', ')}`,
    )
    process.exit(1)
  }

  await admin.unsafe(`drop database if exists ${SCRATCH}`)
  await admin.end({ timeout: 5 })
  process.exit(0)
} catch (err) {
  console.log(String(err?.message))
  try {
    await admin.end({ timeout: 2 })
  } catch {}
  process.exit(1)
}
