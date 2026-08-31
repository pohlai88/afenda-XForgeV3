#!/usr/bin/env node
/**
 * Apply every migration, in order, to a FRESH scratch database.
 *
 * Exit codes: 0 applied cleanly · 1 a migration failed · 2 no database reachable.
 * The distinction matters -- "could not check" must never be reported as "checked".
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import postgres from 'postgres'

const ADMIN = process.env.DATABASE_URL ?? 'postgres://postgres:xforge@127.0.0.1:55432/xforge'
const SCRATCH = 'xforge_migrate_check'
const dir = join(process.cwd(), 'packages/db/migrations')

let admin
try {
  admin = postgres(ADMIN, { max: 1, prepare: false, connect_timeout: 5, onnotice: () => {} })
  await admin`select 1`
} catch {
  process.exit(2)
}

try {
  await admin.unsafe(`drop database if exists ${SCRATCH}`)
  await admin.unsafe(`create database ${SCRATCH}`)

  const scratchUrl = ADMIN.replace(/\/[^/?]+(\?|$)/, `/${SCRATCH}$1`)
  const db = postgres(scratchUrl, { max: 1, prepare: false, onnotice: () => {} })

  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
  for (const f of files) {
    const sql = readFileSync(join(dir, f), 'utf8')
    for (const stmt of sql.split('--> statement-breakpoint')) {
      const trimmed = stmt.trim()
      if (trimmed) await db.unsafe(trimmed)
    }
  }

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
  const bad = rows.filter((r) => !r.relrowsecurity || !r.relforcerowsecurity)
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
