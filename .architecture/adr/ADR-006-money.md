# ADR-006 — Money: numeric storage, integer minor units in payroll, scale as data

**Status:** Accepted · FROZEN · 31 August 2026

## Context

Payroll and, later, a general ledger. Monetary errors here are not bugs but
compliance liabilities: a rounding drift of one sen per employee per month is
invisible in testing and material in an EPF reconciliation.

Predecessor drafts split, each half right: one said `bigint` minor units throughout,
another said `numeric(p,s)` throughout. They are correct in different places, and
collapsing to either one alone produces a real defect.

## Decision

| Kind | Representation |
|---|---|
| Persisted monetary and accounting values | PostgreSQL `numeric(p,s)`, explicit scale per semantic type |
| TypeScript arithmetic | Explicit decimal domain type |
| Payroll statutory calculation | Integer minor units (sen) |
| Non-monetary UI display | `number` only where precision is not business truth |

**No IEEE-754 floating point represents monetary truth, anywhere.**

**The minor-unit scale is data, not an assumption.** VND has 0 decimals, most SEA
currencies have 2, some instruments need more. Hardcoding `× 100` is a defect waiting
for the Vietnam country pack — it will not fail loudly, it will produce amounts a
hundred times wrong in a currency nobody tested.

Multi-currency transactions persist the full provenance:

```
transaction_amount · transaction_currency
base_amount · base_currency
exchange_rate · exchange_rate_source · exchange_rate_timestamp
rounding_policy
```

> **Never recompute historical base amounts from today's rate.** The rate that
> applied is a stored fact, not a derivable one.

Rounding policy is **named, versioned and tested**. `price × quantity → amount` is
**one explicit function** — that step is where naive implementations lose cents at
scale, and making it singular is the difference between a rounding bug you can find
and one you cannot.

## Alternatives considered

**`bigint` minor units everywhere.** Rejected for storage: FX rates, unit costs and
allocation ratios need more precision than currency minor units, and a unit price of
0.0035 has nowhere to live.

**`numeric` everywhere, including inside the payroll engine.** Rejected: statutory
rounding is defined at specific steps in sen, and integer arithmetic makes those
steps exactly reproducible. Decimal arithmetic invites an implicit rounding mode.

**JavaScript `number` with careful rounding.** Rejected without discussion. It is the
default that every team believes it can manage and none does.

## Consequences

**Positive.** Statutory arithmetic is exactly reproducible. Historical FX is
auditable. One place to look when a total is off by a cent.

**Negative.** Two representations means a conversion boundary, and that boundary is
itself a place bugs live — hence a single tested conversion function rather than
ad-hoc casts. A decimal library is more verbose than `+`.

**Cost accepted.** Developers, and agents, will reach for `number` reflexively. The
guard is what stops it, not the intention.

## Migration / rollback

Changing a stored scale is a normal expand → backfill → switch → contract migration
(ADR-010's migration policy applies). Changing the engine's internal representation
is not a migration but a re-verification: the golden fixtures must reproduce
identically, which is precisely what makes such a change testable.

## Verification

- **AQS-015** — money and rounding property suite: allocation rounding conserves
  totals; `price × quantity` boundary cases; scale respected per currency including
  a zero-decimal currency.
- Guard: *unsafe JS number arithmetic in money code paths*.
- **AQS-016** — deterministic payroll replay, which fails immediately if rounding is
  not reproducible.
