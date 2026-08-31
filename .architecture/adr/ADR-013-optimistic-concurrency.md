# ADR-013 — Optimistic concurrency on mutable documents

**Status:** Accepted · FROZEN · 31 August 2026

## Context

Two of the three v2 "canonical" architectures had **no concurrency model at all** —
neither mentioned concurrent editing. That is worth recording, because it is the most
common silent data-loss bug in business software and it was absent from documents
that had each been through several review rounds.

The scenario (UC-09): Admin A opens Siti's record and edits her bank account. Admin B
opens the same record and edits her address. Both hold a full entity payload from a
prior read. A saves; then B saves, overwriting A's bank-account change with the stale
value B loaded.

**No error is raised. Nobody is notified. The salary goes to the old account.**

## Decision

Mutable business documents use **optimistic concurrency**: every update command
carries a `version` token, and the API **rejects stale writes explicitly with `409`**
rather than overwriting or merging.

A single mandated mechanism — not a menu.

## Alternatives considered

**Guarded `updated_at`.** Rejected on two grounds. It is unsafe under clock skew and
at sub-millisecond write resolution. Decisively for this architecture: **a guard can
mechanically detect a missing `version` field on an update command schema, but cannot
reliably detect whether an `updated_at` predicate was correctly guarded.** A rule
that cannot be mechanically checked is, by this architecture's own doctrine,
decoration.

**ETag / `If-Match` headers.** Equivalent in effect and rejected only to keep one
mechanism; a version token in the command payload is visible in the contract and
therefore in the generated client, mocks and tests.

**Three permitted mechanisms** (as one draft allowed: version, ETag, or guarded
`updated_at`). Rejected: it makes the guard unwritable, which is the same as having
no rule.

**Pessimistic locking.** Rejected: it introduces lock lifetime, lock breaking and
abandoned-session handling for a problem optimistic concurrency solves without state.

**Last-write-wins with an audit trail.** Rejected: the audit records what happened
but nobody reads it until the customer reports a wrong bank account, and by then the
salary has been paid.

## Consequences

**Positive.** Concurrent edits fail loudly and recoverably. The stale writer gets the
current state and can re-apply against it. A guard can enforce it across every update
command, including agent-authored ones.

**Negative.** Every mutable-document update command carries a version field, and
every client must round-trip it. UI must handle `409` as a first-class state — one of
the reasons designed error and conflict states are required *before* API
implementation.

**Scope.** This covers mutable documents. Immutable records (posted payroll runs,
ledger entries) are protected by ADR-017 and the immutability law instead; effective-
dated inserts are protected by ADR-016's exclusion constraints, since a new row is
not an update and no version token participates.

## Migration / rollback

Adding a version column to an existing table is a normal expand → backfill → switch →
contract migration. Removing the requirement would be a superseding ADR and would
reintroduce silent loss.

## Verification

- **AQS-011** — optimistic-concurrency stale-write proof: a second writer holding a
  stale token receives `409` and the first writer's change survives.
- Guard: *update command schema without a version token*.
- Phase gate: the HR-core phase does not exit until a stale concurrent edit is
  demonstrably rejected.
