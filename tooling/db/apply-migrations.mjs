/**
 * APPLYING MIGRATIONS HAS ONE IMPLEMENTATION, AND THIS IS IT.
 *
 * `migrate-check.mjs` had the only copy, against a scratch database, and there
 * was no way to migrate a real one. So the obvious command to reach for was
 * `drizzle-kit migrate` -- which reads `meta/_journal.json` rather than this
 * directory, and applied ONE of four migrations while reporting success. The
 * journal is now guarded into agreement
 * (`migration-set-has-one-authority`), but a guard that keeps two runners
 * consistent is a weaker thing than not having two runners, and the reason the
 * second one got used was that the first was not reachable.
 *
 * THE FILES ARE THE MIGRATION SET. ADR-021 requires forward-reviewed SQL, so
 * migrations are hand-written and drizzle-kit -- which journals only what it
 * generates -- cannot be the authority on what exists. Sorted lexically, which
 * is why the numeric prefix is zero-padded and why two migrations may never
 * share one.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** The default location, so no caller has to restate it. */
export const MIGRATIONS_DIR = 'packages/db/migrations'

/**
 * Migration files in apply order.
 *
 * THROWS on a duplicate index prefix rather than picking one. Two files both
 * numbered 0001 sort deterministically and apply in an order nobody chose,
 * which is how `drizzle-kit generate` -- which numbers from the journal's high
 * water mark -- can silently interleave a generated migration with a reviewed
 * one.
 */
function migrationFiles(dir = MIGRATIONS_DIR) {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
  const seen = new Map()
  for (const f of files) {
    const idx = /^(\d+)_/.exec(f)?.[1]
    if (!idx) {
      throw new Error(`${f}: migration filenames must start with a zero-padded index`)
    }
    if (seen.has(idx)) {
      throw new Error(`migrations ${seen.get(idx)} and ${f} share index ${idx}`)
    }
    seen.set(idx, f)
  }
  return files
}

/**
 * Apply every migration in order to `db`.
 *
 * Statements are split on drizzle's `--> statement-breakpoint` marker, because
 * a single `unsafe()` call carrying several statements runs them in one
 * implicit transaction and reports a failure against the wrong one.
 *
 * NOT IDEMPOTENT, and deliberately not: this applies the whole set to a
 * database that has had none of it. The migration stage runs it against a fresh
 * scratch database and `pnpm db:migrate` against a local fixture. Neither
 * tracks what has already run -- that is what `drizzle-kit migrate` and its
 * journal are for, and giving this a second opinion about applied state would
 * recreate the exact two-sources problem it exists to end.
 */
export async function applyMigrations(db, dir = MIGRATIONS_DIR) {
  const files = migrationFiles(dir)
  for (const f of files) {
    const sql = readFileSync(join(dir, f), 'utf8')
    for (const stmt of sql.split('--> statement-breakpoint')) {
      const trimmed = stmt.trim()
      if (trimmed) {
        await db.unsafe(trimmed)
      }
    }
  }
  return files
}
