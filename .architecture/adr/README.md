# Architecture Decision Records

Each ADR records **one decision and the reasoning behind it**, so a future session
inherits the argument rather than re-litigating it. Detail lives in
`../architecture-final.md`; these record *why*.

## Rules

- **A number, once issued, is never reused for a different decision.** A colliding
  number sends an agent to implement the wrong frozen decision.
- An ADR is required to change: a dependency direction · source-of-truth ownership ·
  API compatibility strategy · the tenancy or security boundary · the persistence
  model · a runtime or deployment boundary · a module contract · the money or
  integrity model · metadata authority · async delivery semantics · the AI authority
  boundary · the effective-dating or time model · the retention model.
- Ordinary package upgrades that preserve these contracts need no ADR.
- **Reopen a FROZEN decision only** on a failing qualification test, measured
  production evidence, a real second-domain contradiction, a regulatory or security
  requirement, or a provider limitation crossing an architectural boundary.
  Preference, novelty and framework fashion are not sufficient.

## Format

`Context · Decision · Alternatives · Consequences · Migration/rollback · Verification`

Every ADR names the AQS test that proves it. **A decision with no test is an
opinion**, and the architecture treats it as such.

## Index

| ADR | Decision | Class | Proof |
|---|---|---|---|
| [001](ADR-001-modular-monolith.md) | Modular monolith over service-per-domain | FROZEN | AQS-001, 020 |
| [002](ADR-002-contract-first-api.md) | Contract-first Hono + OpenAPI; domain independent of transport | FROZEN | AQS-002, 003, 004 |
| [003](ADR-003-rls-tenancy.md) | Shared-schema RLS tenancy; two chokepoints; no schema-per-tenant | FROZEN | AQS-005 – 008 |
| [004](ADR-004-four-planes.md) | Four architecture planes + semantic registry | FROZEN | AQS-009 |
| [005](ADR-005-custom-field-ladder.md) | Custom-field three-rung ladder and projection index | FROZEN | AQS-010, 023 |
| [006](ADR-006-money.md) | Money: numeric storage, integer minor units in payroll, scale as data | FROZEN | AQS-015 |
| [007](ADR-007-outbox.md) | Transactional outbox + replaceable durable executor | FROZEN | AQS-013, 014 |
| [008](ADR-008-localisation.md) | Localisation packs with typed contributions; compliance separate | FROZEN | AQS-020 |
| [009](ADR-009-person-employee-employment.md) | Person / employee / employment; payroll scopes to legal entity | FROZEN | AQS-016 |
| [010](ADR-010-policy-ownership.md) | All authorisation in packages/policy; Better Auth for identity only | FROZEN | AQS-021 |
| [011](ADR-011-ai-tool-boundary.md) | Bounded AI tool generation; the definition of consequential | FROZEN | AQS-017 |
| [012](ADR-012-one-transport.md) | One business transport; conditions for a gated read facade | FROZEN | AQS-004 |
| [013](ADR-013-optimistic-concurrency.md) | Optimistic concurrency on mutable documents | FROZEN | AQS-011 |
| [014](ADR-014-policy-declaration.md) | Mandatory policy declaration on every route contract | FROZEN | AQS-021 |
| [015](ADR-015-bound-tenant.md) | Bound tenant per request; multi-membership selection | FROZEN | AQS-008 |
| [016](ADR-016-time-model.md) | Civil-time authority, half-open intervals, transaction time | FROZEN | AQS-024, 025 |
| [017](ADR-017-period-lock.md) | Payroll period lock and retro-adjustment protocol | FROZEN | AQS-026 |
| [018](ADR-018-machine-principals.md) | Machine principals; credential revocation model | FROZEN | AQS-027 |
| [019](ADR-019-permission-lifecycle.md) | Permission-code lifecycle and fail-closed policy compilation | FROZEN | AQS-021 |
| [020](ADR-020-data-lifecycle.md) | Data retention, erasure and tenant offboarding | STABLE | AQS-028 |
| [021](ADR-021-migration-policy.md) | Production migration compatibility policy | FROZEN | AQS-018 |
| [022](ADR-022-verified-tenant-context.md) | Verified tenant context: host selects, membership authorises | FROZEN | AQS-008 |
| [023](ADR-023-membership-resolution-path.md) | How membership is read before a tenant context exists | FROZEN | T06, T07, T18 |
| [024](ADR-024-structural-guards-stay-custom.md) | Structural guards stay custom until the tooling supports our compiler | Accepted | revisit trigger |
| [025](ADR-025-assistive-technology-evidence-is-risk-based.md) | Assistive-technology evidence is required by interaction profile, not by control count | Amended by 030 | A11y-3 gate |
| [026](ADR-026-drizzle-does-not-own-the-migration-set.md) | Drizzle does not own the migration set | FROZEN | migration compatibility |
| [027](ADR-027-cache-components-deferred.md) | Cache Components stays off until a route does server work | FROZEN | revisit trigger |
| [028](ADR-028-tailwind-and-shadcn-base.md) | Tailwind v4 styles packages/ui; shadcn on Base UI is its component base | Amended by 029 | AQS-028 |
| [029](ADR-029-one-ui-system.md) | One UI system; the token vocabulary is settled in one pass and proved by the compiler | Accepted | AQS-029 |
| [030](ADR-030-at-evidence-is-a-record-not-an-integer.md) | Assistive-technology evidence is a record, not an integer | Accepted | A11y-1, A11y-3 gate |

ADRs 001–013 record decisions reconciled from thirteen predecessor drafts.
**ADRs 014–020 record defects found by adversarial review** that no draft had caught;
each names the scenario (UC-nn) that exposed it.
ADR-021 records a policy that was normative in the architecture but had no ADR, and
restores the scenario (UC-22) that was lost when three drafts were merged.
ADR-022 settles the multi-tab and multi-membership authority question before
Phase 1 code depends on it.
