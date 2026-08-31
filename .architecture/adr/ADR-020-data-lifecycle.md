# ADR-020 — Data retention, erasure and tenant offboarding

**Status:** Accepted · STABLE · 31 August 2026
**Origin:** UC-21, adversarial review. Severity: **high**.

## Context

**No predecessor draft mentioned retention, deletion, anonymisation or tenant
offboarding at all** — not in thirteen documents totalling several hundred pages,
for a product that holds national identity numbers and salary history under
PDPA-class regimes across six jurisdictions.

The gap is not merely an omission; it collides with a rule the architecture states
emphatically. **Payroll and financial history is immutable and never deleted.** A
departing employee's erasure request meets a statutory retention obligation of
several years, and the two are both legitimate.

The naive resolution is the dangerous one: comply by editing the record. Erasing
personal data from a **pinned payroll snapshot** silently changes historical
statutory arithmetic and breaks deterministic replay — the property ADR-016 and the
payroll gate exist to guarantee. The audit defence and the privacy obligation destroy
each other.

Two further problems sit behind it. **Retention periods are jurisdictional** — a
global purge constant destroys records one authority still requires, or retains
records another requires purged. And **every copy must be enumerated**: personal data
also lives in the custom-field projection, the audit trail, the outbox, search
projections, file storage and pgvector embeddings.

## Decision

**Retention is a country-pack contribution** (`retention: { payrollYears, taxYears,
employmentYears }`), never a jurisdiction-free constant.

**Erasure has an explicit seam.** Personal data separates into:

- **(a) Statutory records under retention hold** — payroll results, statutory
  filings, ledger entries. **Never mutated, never deleted.**
- **(b) Contactable identity** — address, phone, email, emergency contacts, uploaded
  documents. Erasable.

> **Erasure never mutates a pinned payroll snapshot.** Erasure of a person under
> retention hold **pseudonymises the person record and erases category (b)**, leaving
> statutory records intact and referencing a stable surrogate key. The retention hold
> expiry is itself effective-dated and per-jurisdiction.

**Every copy is enumerated.** Every embedding row carries subject lineage
(`subject_type`, `subject_id`) so it can be selectively purged — otherwise the
copilot resurfaces erased documents, which is a privacy breach delivered by the
product's flagship feature. Purge is an **ordered, resumable, audited job with a
defined contract**, not a cascade delete.

**Tenants have a lifecycle state:** `active | suspended | exporting | purging |
purged`. The exit export is assembled from a **dedicated export path, not from
policy-filtered read APIs** — which would silently omit whatever the exporting
principal cannot see, producing an export that looks complete and is not.

**Branch-per-PR and point-in-time restore sit outside RLS, audit and erasure**, while
the isolation gate still reports green. Any branch reachable by non-production
principals uses **de-identified or synthetic data**, and a restore that reintroduces
purged data is a defect with a named owner.

## Alternatives considered

**Delete the person record on request.** Rejected: it breaks referential integrity
with statutory records that must survive, and it breaks replay.

**Refuse erasure entirely, citing statutory retention.** Rejected: retention covers
the statutory record, not the marketing email address or the uploaded passport scan.
Over-claiming retention is its own compliance failure.

**Anonymise in place inside snapshots.** Rejected — see Context. It is the intuitive
approach and it silently corrupts historical arithmetic.

**Handle it later, when a request arrives.** Rejected: subject lineage on embeddings
and a separable identity model are structural. Retrofitting them once embeddings and
snapshots exist means reprocessing everything.

## Consequences

**Positive.** Erasure and audit defensibility coexist. Retention is correct per
jurisdiction from the first country pack. Tenant exit is a defined process rather than
an improvisation under commercial pressure.

**Negative.** Every store holding personal data needs a purge path and lineage, which
is real work spread across many packages. Pseudonymisation means historical reports
show surrogates rather than names — correct, and it will surprise users. Non-production
branches need de-identified seed data, which is additional tooling.

**Status STABLE rather than FROZEN.** The seam and the principles are settled; the
specific retention periods and the erasure request workflow will gain detail as the
first real request and the first jurisdiction beyond Malaysia arrive.

## Migration / rollback

Subject lineage and the identity separation must exist **before** embeddings and
snapshots accumulate — which is why this is decided now despite the capability being
built later. Retention periods are data and change per pack without code change.

## Verification

**AQS-028 — retention, erasure and purge-completeness proof:**

- erasure of a person under retention hold pseudonymises and leaves statutory records
  byte-identical, with **deterministic replay still exact**;
- every store holding a copy is enumerated and purged, embeddings included;
- a purged subject's documents do not resurface through retrieval;
- tenant export is complete independent of the exporting principal's permissions;
- a restore reintroducing purged data is detected.

**Legal caveat, recorded deliberately.** Predecessor drafts named "Vietnam Decree
13/2023" and unspecified "Indonesian local storage rules" as settled constraints.
Those are **unverified**. Retention periods and erasure obligations must be confirmed
with qualified legal advice per jurisdiction before any commitment is made to a
customer — this ADR fixes the *architecture*, not the *legal parameters*.
