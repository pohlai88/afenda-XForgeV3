# ADR-026 — Drizzle does not own the migration set

**Status:** FROZEN · 1 September 2026
Supplements ADR-021, which decided *what* a migration is. This decides *which
tool is allowed to say what the set contains*.

## Context

ADR-021 requires forward-reviewed SQL and explicitly rejects "auto-generated
migrations applied without review". Migrations `0001`–`0003` were therefore
hand-written. drizzle-kit journals only what drizzle-kit generates, so
`meta/_journal.json` listed `0000_init` alone while four migrations sat on disk.

Two runners then described two different migration sets, and both were green:

```
migration stage      globs packages/db/migrations/*.sql, sorts, applies 4
                     -> "4 migrations apply cleanly to a fresh database"
drizzle-kit migrate  reads meta/_journal.json, applies 1
                     -> "migrations applied successfully!"
```

A database provisioned the drizzle way had `emergency_contact` and nothing else:
no `tenant`, no `tenant_domain`, no `tenant_membership`, and none of the FORCE
ROW LEVEL SECURITY law 11 requires. Neither runner could see the other, so
neither could report it. This is CLAUDE.md's recurring defect with one
variation — the two sources never agreed, they simply never met.

## Prior art

| Source | Retrieved | Supports |
| --- | --- | --- |
| `drizzle-kit generate --help` (0.31.10, this checkout) | 2026-09-01 | `--custom` exists and is documented as "Prepare empty migration file for custom SQL" — the vendor's sanctioned path for hand-written DDL |
| Local behavioural measurement, this repository | 2026-09-01 | What `generate` and `generate --custom` actually do to the journal and snapshot chain here |
| `drizzle-orm` skill guidance, "Common Mistakes to Avoid" | 2026-09-01 | Mainstream recommendation: "Manual migration modifications — Let drizzle-kit manage migration history" |

### Approaches reviewed

**Let drizzle-kit own migration history** (the vendor's and the ecosystem's
recommendation). **REJECTED** — it is the direct negation of ADR-021. Owning
history means generating the DDL, and ADR-021 rejects applying generated diffs
unread. This is recorded as a rejection rather than omitted, because it is the
default advice and someone will propose it again.

**Scaffold every hand-written migration with `generate --custom`.** **ADAPTED,
partially.** Measured: `--custom` writes a journal entry *and* a snapshot — but
the snapshot is a **copy of the previous one**, not a model of the live schema.
Probe `0004_snapshot.json` contained `public.emergency_contact` only, exactly as
`0000_snapshot.json` did, with three tenant tables live in the database and
declared in the drizzle schema. So `--custom` keeps the journal honest and
cannot keep the snapshot honest. It is adopted for the journal half only.

**Migrate to Prisma.** **REJECTED.** The pain is two runners over one set;
Prisma has the same shape (`_prisma_migrations` plus its own history), is *more*
insistent on owning migrations, and has no first-class FORCE ROW LEVEL SECURITY
either — so the hand-written/journal split would reappear having paid for a full
ORM migration. Law 30 requires a named, measured pain; the measured pain was a
stale JSON file.

### Evidence

`drizzle-kit generate` was run against this repository on 2026-09-01. It emitted
`0001_probe_drift.sql`, which:

- **collides on index prefix** with the existing `0001_force_rls_and_grants.sql`
- re-creates `tenant`, `tenant_domain` and `tenant_membership`, all already live
- contains **no `FORCE ROW LEVEL SECURITY` at all** — applying it produces
  tenant-owned tables that violate law 11

The cause is structural, not a bug: the snapshot chain advances only when
drizzle-kit generates DDL. `0002_tenancy` created schema-modelled tables by
hand, so the chain fell permanently behind and every subsequent `generate`
re-proposes them.

### What this prior art does NOT prove

The `--help` output establishes that `--custom` exists and what it is *for*. It
says nothing about whether it keeps a snapshot chain coherent — only the local
measurement above answers that, and the answer was no.

The measurements are of drizzle-kit 0.31.10 against *this* schema on one day.
They do not prove the behaviour is stable across versions, and they do not prove
that no configuration of drizzle-kit could keep snapshots honest — only that
none was found. Nothing here proves our migrations are *correct*; that is what
the migration stage's RLS assertion and the tenancy proof are for.

The Prisma rejection is reasoned from its documented model, **not** measured. No
Prisma spike was run. If that decision is ever revisited, this is the gap to
close first.

## Decision

1. **The `.sql` files are the migration set.** `applyMigrations()` in
   `tooling/db/apply-migrations.mjs` is the only implementation that applies
   them, shared by the migration stage and `pnpm db:migrate`.
2. **Plain `drizzle-kit generate` is not part of the migration path.** Its
   snapshot chain cannot model hand-written DDL and its output has been measured
   to violate law 11.
3. **The snapshot chain is not authoritative about the live schema**, and no
   check may treat it as though it were.
4. **`meta/_journal.json` must list every migration and nothing else**, so that
   `drizzle-kit migrate` — which people will reach for — applies the same set.
   Enforced by `migration-set-has-one-authority` (law 28).
5. **Two migrations may never share an index prefix.** `migrationFiles()`
   throws rather than picking an order nobody chose.
6. **Drizzle remains the query builder and the schema types.** Nothing here
   argues against drizzle; it argues against one tool holding two opinions.

## Verification

- `migration-set-has-one-authority` — journal and directory agree, symmetrically
- `migrationFiles()` — throws on a duplicate index prefix
- migration stage — the set applies to a fresh database AND every table with a
  `tenant_id` has RLS enabled and forced

**Not enforced, and deliberately so:** nothing prevents a human running
`drizzle-kit generate`. A guard cannot intercept a shell command. What the
guards do catch is the *damage* — an unjournalled file, a colliding index, a
tenant table without forced RLS. ADR-021 already governs the rest, and it is a
review obligation rather than a mechanical one.
