# Xforge — Architecture Evidence Register

**Status:** Companion to `architecture-final.md` · **Retrieved:** 31 August 2026
**Purpose:** Keep external precedent, internal qualification and decision stability visible without re-litigating architecture.

---

## Grades

| Grade | Meaning |
|---|---|
| **P** | Production precedent — used by a large, real production platform |
| **S** | Standard or official architecture guidance — durable documented semantics |
| **V** | Vendor capability — validates that a chosen *replaceable* provider supports a required capability |
| **X** | Xforge qualification — executable proof required in this repository |

A FROZEN decision should normally have **P or S, plus X**. Rows that do not meet this are marked explicitly rather than quietly graded up.

## The rule

External precedent answers: *"Is this architecture pattern credible in serious production systems?"*
Xforge tests answer: *"Did we implement the pattern correctly here?"*

**Both are required before calling an implementation battle-tested.** Precedent qualifies the pattern; it never qualifies this implementation.

**Evidence confidence order:** database and standards semantics → independent architecture guidance → large production precedent → provider capability documentation → **Xforge qualification tests**. The last step is mandatory.

> Do not cite vendor scale claims as proof of Xforge correctness.

---

## Register

| Decision | External evidence | Grade | Xforge proof (AQS) | Status |
|---|---|---|---|---|
| Strict modular monolith | E01, E02 — precedent that the *shape* works when continuously engineered, **not** for these specific boundaries | P | AQS-001, AQS-020 | FROZEN |
| OpenAPI contract spine | E03, E04 | S/P | AQS-002, AQS-003 | FROZEN |
| Pooled PostgreSQL tenancy + RLS | E05, E06 | S | AQS-005 – AQS-008 | FROZEN |
| Tenant ≠ legal entity ≠ auth organisation | E06, E19 — partitioning guidance separates isolation from business modelling; auth products expose generic organisations, not statutory employers | S | UC-02, payroll fixtures | FROZEN |
| Bounded metadata customisation | E07, E08, E09 — precedent for the productivity, **and** direct evidence of the coupling Xforge rejects | P | AQS-009, AQS-010 | FROZEN |
| **Four planes + semantic registry** | **None. This is an Xforge synthesis**, reasoned from the coupling visible in E08 and the extension depth in E09 | **X only** | AQS-009 | FROZEN on failure-mode analysis — *fails the P-or-S rule, recorded deliberately* |
| Transactional outbox | E10, E11 | S | AQS-013 | FROZEN |
| At-least-once + idempotency | E10 (duplicate warning), E12 | S/P | AQS-014 | FROZEN |
| Immutable financial/payroll posting | E13 | P | AQS-012 | FROZEN |
| Pure, versioned payroll calculation | Deterministic effective-dated rule engines are standard auditability practice; jurisdiction-specific golden evidence is Xforge's own | S | AQS-016 | FROZEN |
| Least-privilege AI tool layer | E15 | S | AQS-017 | FROZEN |
| Staged online migration | E14 | P | AQS-018 | FROZEN |
| Mandatory per-operation policy declaration | **None. Xforge finding (UC-14)** — the predecessor guard was a spelling check, not a presence check | **X only** | AQS-021 | FROZEN on failure-mode analysis |
| Bound tenant per request | **None. Xforge finding (UC-15)** — host/session check is tautological for multi-membership principals | **X only** | AQS-008 | FROZEN on failure-mode analysis |
| Half-open effective-dated intervals + exclusion constraints | PostgreSQL range and exclusion-constraint semantics (E05 family) | S | AQS-024 | FROZEN |
| Valid time ≠ transaction time | Bitemporal modelling is long-established practice | S | AQS-024 | FROZEN |
| Database branch per PR | E16 | V | AQS-018, AQS-022 | STABLE / provider REVERSIBLE |
| Custom tenant domains behind an adapter | E17 | V | AQS-008 | STABLE / provider REVERSIBLE |
| Open-code UI primitives | E18 | V | design-system, a11y, ERP-primitive tests | REVERSIBLE |
| Auth behind a facade | E19, E21 | V | business topology stays outside the provider | STABLE / provider REVERSIBLE |
| Durable executor behind the outbox | E20 — *executor capability, not the source of durable business intent* | V | AQS-013 | REVERSIBLE |

---

## Primary sources

Every entry carries a URL. Entries without a verifiable retrieval are marked **UNVERIFIED** and must not be relied on until confirmed.

| ID | Source | URL | Retrieved |
|---|---|---|---|
| **E01** | Shopify Engineering — *Under Deconstruction: The State of Shopify's Monolith* | https://shopify.engineering/shopify-monolith | not re-verified |
| **E02** | GitHub Engineering — architecture and optimisation posts | https://github.blog/category/engineering/ | not re-verified |
| **E03** | OpenAPI Initiative — *OpenAPI Specification 3.1* | https://spec.openapis.org/oas/v3.1.0 | not re-verified |
| **E04** | GitHub — *REST API OpenAPI Description* | https://github.com/github/rest-api-description | not re-verified |
| **E05** | PostgreSQL — *Row Security Policies* / `CREATE POLICY` | https://www.postgresql.org/docs/current/ddl-rowsecurity.html | not re-verified |
| **E06** | AWS Prescriptive Guidance — multi-tenant SaaS partitioning and RLS | https://docs.aws.amazon.com/prescriptive-guidance/ | not re-verified |
| **E07** | Salesforce Architects — *Platform Multitenant Architecture* | https://architect.salesforce.com/ | not re-verified |
| **E08** | Frappe Framework — *Understanding DocTypes* | https://docs.frappe.io/framework/user/en/basics | not re-verified |
| **E09** | Odoo — *Building a Module* / *View Records* | https://www.odoo.com/documentation/ | not re-verified |
| **E10** | AWS Prescriptive Guidance — *Transactional outbox pattern* | https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html | not re-verified |
| **E11** | Microsoft Azure Architecture Center — *Transactional Outbox* | https://learn.microsoft.com/azure/architecture/ | not re-verified |
| **E12** | Stripe API — *Idempotent requests* | https://docs.stripe.com/api/idempotent_requests | not re-verified |
| **E13** | Modern Treasury — *Ledgers Guarantees* | https://docs.moderntreasury.com/ | not re-verified |
| **E14** | Stripe Engineering — *Online migrations at scale* | https://stripe.com/blog/online-migrations | not re-verified |
| **E15** | OWASP GenAI Security — *LLM06:2025 Excessive Agency* | https://genai.owasp.org/ | not re-verified |
| **E16** | Neon — *Database branching workflow primer* | https://neon.com/docs/get-started-with-neon/workflow-primer | not re-verified |
| **E17** | Vercel — *Vercel for Platforms* | https://vercel.com/docs/multi-tenant | not re-verified |
| **E18** | shadcn/ui — *Base UI as the Default*, July 2026 | https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default | **verified 31 Aug 2026** |
| **E19** | Better Auth — *Organization Plugin* | https://better-auth.com/docs/plugins/organization | not re-verified |
| **E20** | Trigger.dev — *Idempotency* | https://trigger.dev/docs/idempotency | not re-verified |
| **E21** | Vercel — *Vercel acquires Better Auth* (7 Jul 2026; MIT retained, framework-agnostic, agent identity focus) | https://vercel.com/blog/vercel-acquires-better-auth | **verified 31 Aug 2026** |

> **Sources marked "not re-verified" were cited by predecessor drafts and carried forward.** Their URLs are recorded so they can be checked; until they are, treat them as claims rather than as confirmed citations. Verify before any of them is used to justify reopening a FROZEN decision.

---

## Claims checked during the final review

| Claim | Outcome |
|---|---|
| shadcn defaults to Base UI for new projects (July 2026); Radix still supported | **Verified** — E18 |
| "Base UI lacks Context Menu, Hover Card and Toast" (carried by four drafts) | **False.** All three ship. Open item deleted |
| Vercel acquired Better Auth 7 July 2026; MIT, framework-agnostic, same team | **Verified** — E21. Stated focus is agent identity: separate, revocable agent credentials |
| "Neon's HTTP driver cannot hold session state across statements" | **Unverified vendor claim.** Demoted to an implementation note; replaced by AQS-022, an executable driver test |
| "Vietnam Decree 13/2023"; "Indonesian local storage rules" | **Named but unverified.** Obtain legal advice before any residency commitment |
| "The team is Vietnam-based" (used to argue for re-examining the launch country) | **No evidence.** Not an input until confirmed |
| EPF / SOCSO / EIS are wage-band lookup tables rather than clean percentages | **Structurally correct and load-bearing.** Every rate, ceiling and band must still come from current official LHDN / KWSP / PERKESO publications at build time — never from a document or a model |

---

## Removed claims

Predecessor drafts argued the custom-field case twice using **fabricated statistics stated as fact** — "20,000 employees, 400 tenants, hundreds of generated columns, each NULL for 99.75% of rows." No measurement supports these numbers. The argument for the three-rung ladder holds on the structural point alone (a shared-schema table serves every tenant, so a column added for one is added for all), and the numbers have been removed rather than repeated.

Two predecessor documents reported desk analysis in PASS/FAIL tables with headline defect counts, which reads as test output. It was reasoning on paper. `architecture-final.md` Part II states this explicitly and drops the counts — the two documents that both claimed to have "validated the architecture" reported different totals, which is why the count is not the evidence.


## Verified 31 August 2026

Added after law 34, which exists because this register was built to grade
external precedent and then went unused -- 2 of 21 entries were ever verified,
while sessions were spent deriving what PostgreSQL documents in a sentence.

Not a backfill of the original 21. Those stay as they are until a decision is
reopened; re-verifying them on a schedule is the standing audit this register
is meant to prevent.

| # | Source | Retrieved | Grade | Supports | Outcome |
|---|---|---|---|---|---|
| E22 | [PostgreSQL, Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) | 2026-08-31 | S | Superusers and `BYPASSRLS` roles ALWAYS bypass RLS; `FORCE` subjects only the table owner; TRUNCATE and REFERENCES are not subject to row security | ADOPT |
| E23 | [OWASP Multi-Tenant Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html) | 2026-08-31 | S | Client-supplied tenant ids are selectors only, verified against membership; transaction-local context per request; schema-derived RLS coverage over hand-maintained lists; request role must lack `rolsuper`/`rolbypassrls`; prove connection reuse cannot leak | ADOPT |
| E24 | [Postgres RLS in practice](https://queryplane.com/blog/postgres-row-level-security-in-practice/) | 2026-08-31 | P | Permissive policies OR together; `SECURITY DEFINER` evaluates the owner's policies; `pg_dump` without `BYPASSRLS` exports zero rows under FORCE | ADOPT |
| E25 | [dependency-cruiser CLI](https://github.com/sverweij/dependency-cruiser/blob/main/doc/cli.md) + `depcruise` 18.2.0 run locally | 2026-08-31 | V | Forbidden rules and cycle detection are first-class -- and it refuses `typescript >=7`, cruising 0 dependencies here | REJECT (deferred, ADR-024) |
| E26 | [typescript-eslint custom rules](https://typescript-eslint.io/developers/custom-rules/) | 2026-08-31 | V | Typed AST rules with a testing harness -- the target for semantic guards when touched | ADAPT (ADR-024) |

**What E23 confirmed we had already derived independently**, at considerably
greater cost than reading it: host-as-selector, `FORCE ROW LEVEL SECURITY`, a
non-owner request role, `SET LOCAL` per transaction, dynamic table enumeration
over a maintained list, and `rolsuper`/`rolbypassrls` assertions. ADR-022's
"Host selects. Membership authorises. Session identifies." is a restatement of
its first recommendation.

**What it gave us that reasoning had not**: the pooled-connection reuse proof
(T19), permissive-policy OR-stacking (T20), the `pg_dump` hazard (T21), audit
rows carrying the server-verified tenant, and the `SECURITY DEFINER` doctrine
now recorded in ADR-023.

**Freshness.** STANDARD sources (PostgreSQL, OWASP, OpenAPI) are re-checked when
the architecture or a major version changes. PRODUCTION precedent stays valid as
precedent. PROVIDER capability (E25, E26, Neon, Vercel) is freshness-sensitive
and re-checked when depended upon -- E25 in particular carries a revisit trigger.
