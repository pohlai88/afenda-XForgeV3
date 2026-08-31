# ADR-008 — Localisation packs with typed contributions; compliance separate

**Status:** Accepted · FROZEN · 31 August 2026

## Context

Xforge launches in Malaysia and intends to serve six ASEAN jurisdictions. Country
variation touches payroll rules, tax, banking formats, holidays, identifiers,
addresses, numbering and translations.

ERPNext and Odoo both handle this with community-maintained country modules, which
are frequently stale and break on upgrade. That is the outcome to avoid, and the
mechanism by which it happens is worth naming: a country module shaped by whichever
domain needed it first, which the second domain must then fork.

A separate concern gets conflated with it. Statutory *rules* (rates, bands, formats)
and statutory *connectivity* (submitting to an authority's API) have completely
different failure modes, test strategies and release cadences.

## Decision

**Country packs are versioned data with typed per-domain contributions** — not a flat
bag, and not a payroll-shaped blob:

```ts
export const MY: CountryPack = {
  jurisdiction: 'MY',
  payroll:    { rulePacks, statutoryRegistrations, yearEndForms },
  tax:        { rates, withholding, registrationFormats },   // Sales needs this
  banking:    { giroFormats, accountValidation },
  calendar:   { publicHolidays, workweek, timeZone },
  identity:   { nric, ssm, tin },
  retention:  { payrollYears, taxYears, employmentYears },
  formatting: { address, phone, numbering },
};
```

Modules declare consumption via `countryContributions` in `manifest.ts`. Sales takes
`tax` and `formatting` **without touching `payroll`**.

Every rule carries `jurisdiction · effective_from · effective_to · version ·
authority_reference · source_hash`. **Historical rules are never overwritten.** Core
contains **zero** `if (country === 'MY')`, guard-enforced.

**Compliance adapters are connectivity, and separate:**
`packages/compliance/{core,my-myinvois,sg-invoicenow,vn-einvoice,id-coretax,th-etax,ph-eis}/`
own protocol mapping, credentials, submission queue, retry, authority status and
receipt archival. **They do not own the ledger.**

**Clearance state is a separate `compliance_submission` record, never a column on a
posted document** — the only formulation that survives the immutability law, because
a status column would mean recording a rejection updates a document the ledger
references.

## Alternatives considered

**A flat `localisation/my` bag of country rules.** Rejected after UC-12. Shaped by
payroll's needs, it forces the Sales module either to import a payroll-shaped module
(coupling Sales to Payroll, violating the module rule) or to fork it — and the moment
it forks, MY tax rules exist in two places and drift. **This is exactly how Odoo's
localisation modules became unmaintainable.** The finding came from a second-domain
scenario examined while planning the first phase; it cost one interface now and would
have cost a fork later.

**Country conditionals in core.** Rejected: the standard way country logic becomes
unmaintainable, and undetectable once spread.

**Clearance status as invoice state.** Rejected after UC-07 — collides with
immutability, forcing a choice between relaxing immutability and losing clearance
state. A separate submission record also supports several submissions per document
over its life, which happens to model Indonesia's *Faktur Pengganti* flow correctly.

**Overwriting a rule when a rate changes.** Rejected: a historical run must remain
reproducible, so the pack is versioned and effective-dated instead.

## Consequences

**Positive.** A second country is a pack, not a refactor. A second domain consumes
the contributions it needs. An authority outage looks like an authority outage rather
than a payroll rules problem.

**Negative.** Designing the contribution interface before the second consumer exists
risks guessing wrong — mitigated by keeping it small and revisiting at the
second-domain gate. Effective-dating everything is more machinery than a constants
file.

## Migration / rollback

Adding a jurisdiction adds a pack; nothing in core changes. Reshaping a contribution
interface is a typed refactor caught by the compiler across all consumers — which is
the point of it being typed.

## Verification

- Guard: *country branching inside shared core*.
- **AQS-020** — the second-domain proof consumes country contributions without
  touching `payroll`.
- Effective-dated selection is covered by ADR-016's interval rules and AQS-024;
  reproducibility by AQS-016.

Country-specific laws, thresholds and deadlines are verified from official
authorities in each module specification. **This architecture deliberately does not
freeze regulatory figures or dates.**
