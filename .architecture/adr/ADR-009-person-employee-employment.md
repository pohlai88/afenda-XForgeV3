# ADR-009 — Person / employee / employment; payroll scopes to legal entity

**Status:** Accepted · FROZEN · 31 August 2026

## Context

Every draft through v2 modelled a single `employee` row with a `legal_entity_id`
column. That looks sufficient until a concrete Malaysian case is walked through it.

Siti works for Sdn Bhd A. On 16 March she transfers to Sdn Bhd B in the same group.
Both are legal entities under one tenant, each with its own EPF employer number,
SOCSO employer code and LHDN E-number. March payroll runs.

A single `employee` row **cannot represent one person employed by two legal entities
in one period.** Two runs must execute — A for 1–15 March, B for 16–31 — each with
its own snapshot and its own statutory contributions against its own employer
registration, and at year end Siti receives **two Borang EA forms**.

The failure is silent. You get one payslip with blended contributions and an
incorrect EA form, and nobody notices until an EPF audit. Group companies are also
exactly the customers who pay for an HRMS.

## Decision

```
PERSON  ────────────► a human being; one record per human, tenant-scoped
   │
   └── EMPLOYEE ────► person employed BY A LEGAL ENTITY
          │           one per person per legal entity
          │           carries that entity's statutory registrations
          │
          └── EMPLOYMENT ► a dated period with job, org unit, pay basis
                           effective-dated; payroll operates on THIS
```

> **Payroll scopes to `legal_entity` and operates on `employment` periods — never on
> `employee`, never on `tenant`.**

The engine signature is therefore `calculatePayroll(employmentSnapshot, ...)`.
`employeeSnapshot` is ambiguous the moment a person spans entities, and ambiguity in
statutory arithmetic resolves silently rather than loudly.

An authentication provider's "organization" is **not** canonical ERP topology
(see ADR-010).

## Alternatives considered

**One `employee` row with `legal_entity_id`.** Rejected — see Context. This was the
consensus of every draft through v2.

**One `employee` row with a history table.** Rejected: it represents the transfer but
still gives one identity for statutory registration, so the EA-form split and the
per-entity employer numbers have nowhere correct to live.

**Modelling the split only when a group customer arrives.** Rejected. Discovering it
at the payroll phase means re-migrating every employee record and every snapshot
already taken. The cost now is three tables instead of one.

## Consequences

**Positive.** Mid-month transfer, concurrent employment across group entities,
per-entity statutory registration and dual EA forms all fall out of the model rather
than being special-cased.

**Negative.** Three levels where most HRMS products have one; every query must know
which level it operates on, and "employee" in conversation is ambiguous unless the
team keeps the vocabulary straight. Effective-dated `employment` brings the interval
discipline of ADR-016 with it.

**Residual risk.** RLS enforces the *tenant* boundary; **nothing structural enforces
the legal-entity boundary.** A query omitting it files contributions under the wrong
employer number — silently. Mitigated, not solved: repository methods over
legal-entity-scoped entities take `legalEntityId` as a **required, non-optional**
parameter, payroll read paths go through `packages/organisation` helpers that cannot
be called without it, and a guard flags unbound queries in `modules/payroll/**`.
This is the largest residual correctness risk in the design (§26.7).

## Migration / rollback

None available cheaply — this is why it is decided before any employee row exists.
Retrofitting the split after payroll snapshots exist means rewriting historical
snapshots, which ADR-020 forbids for records under retention hold.

## Verification

- **AQS-016** — payroll deterministic replay, with the **mid-month legal-entity
  transfer** as a named blocking golden fixture.
- Guard: *payroll query against a legal-entity-scoped table without binding it*.
- Phase gate: the HR-core phase must demonstrate internal transfer and effective-dated
  assignment before payroll is built on top.
