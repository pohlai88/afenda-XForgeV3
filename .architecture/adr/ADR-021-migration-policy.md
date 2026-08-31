# ADR-021 — Production migration compatibility policy

**Status:** Accepted · FROZEN · 31 August 2026
**Backs:** AQS-018, UC-22

## Context

Xforge is a shared-schema multi-tenant SaaS. **One migration serves every tenant** —
that is the central benefit of ADR-003 and ADR-005, and it is also the central risk:
a bad migration is not one customer's outage, it is everyone's.

Two properties of this project sharpen it further.

**Rolling deploys mean two schema versions are live at once.** During any rollout,
instances running the previous release are still serving traffic against a database
the new release has already migrated. A migration that is correct in isolation can
still break every request served by an instance that has not yet been replaced.

**Migrations are primarily agent-authored.** The characteristic agent error here is
not invalid SQL — the compiler and a review catch that. It is a migration that is
*valid, applies cleanly, and is unsafe*: a rename in one step, an `ALTER TABLE` that
takes an `ACCESS EXCLUSIVE` lock on a large table, a `NOT NULL` added without a
default, a backfill written as a single statement that runs for an hour and cannot be
resumed. Each of those passes `pnpm verify` as it stood before this ADR.

The seemingly innocuous case is the instructive one: renaming `employee.emp_code` to
`employee.employee_number`. The obvious single migration is `ALTER TABLE employee
RENAME COLUMN` — one line, correct, reviewed, and it breaks **every instance still
running the previous release** for the duration of the rollout.

## Decision

Production migrations follow **expand → migrate/backfill → switch → contract**, in
separate deployments.

```
EXPAND     add the new shape; dual-write; deploy. Old readers unaffected.
BACKFILL   populate history with a resumable job. No lock held.
SWITCH     reads move to the new shape; deploy. Old shape still present.
CONTRACT   a LATER, SEPARATE deployment removes the old shape.
```

Rules:

- **No destructive schema change in the same deployment that first stops using the
  old shape.** Expand and contract are never the same release.
- **Migrations are forward-reviewed SQL.** Not ORM-inferred diffs applied unseen.
- **Long-running backfills are resumable jobs**, not migration statements. A backfill
  that cannot be resumed cannot be safely interrupted, and it will be interrupted.
- **Every migration is tested against an isolated database branch** before merge,
  which is what the branch-per-PR workflow exists for.
- **Releases remain compatible with the immediately preceding schema** during
  rollout.
- **Tenant customisation generates no ordinary DDL** (ADR-005) — so the migration
  path stays singular no matter how many tenants customise.

## Alternatives considered

**Single-step migrations with a maintenance window.** Rejected. It is genuinely
simpler, and it is available only to products whose customers tolerate downtime.
Payroll is time-boxed against statutory deadlines: an outage during the last week of
the month is not a maintenance window, it is a missed filing. It also does not scale
past one region.

**Auto-generated migrations applied without review.** Rejected: the generated diff is
frequently correct and occasionally destructive, and the difference is invisible
without reading the SQL. Reviewing generated SQL is fine; applying it unread is not.

**Blue-green deployment to avoid mixed versions.** Rejected as the primary mechanism:
it removes the mixed-code window but not the mixed-*data* window, since both colours
share one database. It is complementary, not a substitute.

**Relying on backwards-compatible changes only** (additive columns forever). Rejected:
the schema accretes indefinitely and the contract step never happens, which is how
tables acquire six abandoned columns nobody dares drop.

## Consequences

**Positive.** Rolling deploys are safe. A migration can be halted mid-sequence with
the system in a working state at every step — a property that matters most at 2am. The
contract step is a deliberate, separately reviewed act rather than a side effect.

**Negative, and genuinely irritating.** A column rename becomes four deployments
instead of one. Dual-write code must be written and then deleted. The contract step is
easy to forget, leaving the old shape in place indefinitely — the honest failure mode
of this policy, and it should be tracked as work rather than assumed.

**Cost accepted.** For small changes the ceremony is disproportionate. The alternative
is a policy with exceptions, and an exception process is what an agent under time
pressure reaches for.

## Migration / rollback

Each step is independently reversible while the old shape survives, which is the
point of deferring the contract step. Once contract has run, reversal is a new
expand — so the contract step is where review attention belongs, not the expand step
where it usually lands.

## Verification

- **AQS-018 — expand/backfill/switch/contract proof:** a schema change is exercised
  through all four steps against an isolated branch, with the **previous release's
  queries asserted green at every intermediate state**. That assertion is the test;
  applying the steps in order is not.
- **UC-22** — zero-downtime column rename with tenants live, as the narrative
  scenario.
- Guard: *destructive migration violating rollout policy* — a migration dropping or
  renaming a column in the same change that stops writing it fails CI.

> **Note on provenance.** This scenario existed in the v3-3 draft and was lost when
> three documents were merged, leaving AQS-018 defined with no narrative case behind
> it. It is restored as UC-22. A test with no scenario is a test nobody can explain,
> and it is the first one deleted when it becomes inconvenient.
