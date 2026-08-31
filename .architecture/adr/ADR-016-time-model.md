# ADR-016 — Civil-time authority, half-open intervals, transaction time

**Status:** Accepted · FROZEN · 31 August 2026
**Origin:** UC-17, UC-18, UC-19, adversarial review. Severity: **high**, all silent.

## Context

No predecessor draft had a section on time. All of them specified effective-dated
employment records, effective-dated statutory rule packs, a payroll engine with "no
clock reads," and periods — without ever declaring what a date *means*.

Three defects followed, each producing silently wrong money.

**Civil time (UC-19).** The engine may not read a clock, but something must decide
what "today" and "period end" are. On a UTC runtime a Malaysian month-end job fires at
08:00 local on the 1st and attributes work to the wrong period. Jurisdiction is not a
timezone, and a tenant is not a timezone either — a Malaysian group may operate a
Singapore entity.

**Interval convention (UC-18).** Nothing declared whether `[effective_from,
effective_to]` is closed-closed or half-open, nothing forbade two rows matching one
date, and nothing resolved a tie. For **rule packs** this is sharpest: selecting a
pack "by period date" at a rate-change boundary is arbitrary if two packs match — the
defect arrives through the boundary rather than through overwriting, which is exactly
the hole effective-dating was believed to have closed.

**Transaction time (UC-17).** A backdated raise effective 1 March, entered on 20 March
after the run was calculated, is invisible at approval. The approve command verifies
"snapshot hashes" — but **a hash proves the snapshot is unaltered; it can never prove
the snapshot is still current.** Business tables carried valid time only; when the
row was *recorded* was not stored anywhere queryable.

## Decision

**Civil-time authority.** Civil dates derive from an **IANA time zone stored on
`legal_entity`** — defaulted by the country pack through the overlay chain,
overridable per `location` for attendance and shift boundaries — never from the
runtime clock, the tenant, or the jurisdiction. Business dates are `date`, instants
are `timestamptz`, and the two are never implicitly converted. Narrowing an instant to
a business date happens only through `businessToday(legalEntityId)` in
`packages/time`. Recurring jobs are scheduled in the **owning legal entity's zone**.

**Half-open intervals, structurally non-overlapping.** All effective-dated ranges are
`[effective_from, effective_to)`. NULL `effective_to` is open-ended.
`effective_from = effective_to` is an empty range rejected by a CHECK constraint — a
same-day joiner-leaver is `[2026-03-03, 2026-03-04)`. Non-overlap is enforced in the
database:

```sql
EXCLUDE USING gist (
  tenant_id WITH =, <owner_key> WITH =,
  daterange(effective_from, effective_to, '[)') WITH &&
)
```

`<owner_key>` is the row's own owner — **`employee_id` for employment, never
`person_id`**, which would forbid the legitimate concurrent-employment case ADR-009
exists to represent — and `(jurisdiction, rule_id)` for rule packs.

A snapshot builder finding no row effective on a date returns **"no row effective on
D" as a distinct outcome** and never falls back to the nearest row.

**Valid time ≠ transaction time.** Every effective-dated business table carries
`recorded_at timestamptz NOT NULL DEFAULT now()` beside its valid-time columns. Every
payroll run stores `snapshot_taken_at`. The approve command re-queries rows
overlapping the period whose `recorded_at` is later than `snapshot_taken_at` and
raises the blocking finding **`RETRO_INPUT_AFTER_SNAPSHOT`**, cleared only by
recalculating or by an explicitly recorded decision to defer to a later period.

**The snapshot is a closed value.** It carries resolved *values* — never identifiers
the engine could dereference — of every person- and employee-level statutory fact the
rule pack may key on. Age and completed service are derived **at the period-relative
dates the rule pack declares**, never at snapshot-creation time.

## Alternatives considered

**Store everything as `timestamptz` and convert at the edges.** Rejected: it makes
every business date carry a spurious instant and invites the implicit conversions
this ADR forbids.

**Timezone on the tenant.** Rejected: a group may span jurisdictions.

**Closed-closed intervals.** Rejected: `[1 Mar, 31 Mar]` and `[31 Mar, …]` overlap on
a boundary day, and the arithmetic for adjacency is off-by-one prone in exactly the
places nobody tests.

**Application-enforced non-overlap.** Rejected by the architecture's own doctrine:
this class of invariant belongs in the database, for the same reason tenancy does.

**Trusting the audit log for transaction time.** Considered — the append-only audit
does physically record when a row was created. Rejected: an audit log is not a
queryable temporal join source, and nothing directed the approve command to consult
it.

## Consequences

**Positive.** Period attribution, boundary rule-pack selection and retro-input
detection all become deterministic. Payroll replay is genuinely reproducible.

**Negative.** Every effective-dated table gains a constraint and a column, and
`btree_gist` becomes a dependency. Developers must learn the half-open convention;
`[)` is correct and counter-intuitive at first reading.

## Migration / rollback

Decided before any effective-dated row exists. Retrofitting `recorded_at` onto
existing rows would mean fabricating transaction times, which is why it is decided now.

## Verification

- **AQS-024** — interval convention, exclusion constraints, `recorded_at` presence,
  and `RETRO_INPUT_AFTER_SNAPSHOT` raised at approval.
- **AQS-025** — civil-time authority proof.
- Guards: *effective-dated table missing `recorded_at`* · *effective-dated table
  missing an overlap-exclusion constraint* · *rule-pack set with overlapping effective
  ranges* · *`new Date()` / `Date.now()` / `now()::date` inside `modules/**`*.
- Blocking payroll fixtures: **60th birthday inside the period**, **service
  anniversary inside the period**.
