# Xforge — Canonical Reference Architecture

**Status:** FINAL — adopted, under change control
**Supersedes:** `architecture-{1,2,3}`, `v1-{1,2,3}`, `v2-{1,2,3}`, `v3-1`, `v3-2-1`, `v3-2-2`, `v3-3` → archive all to `.architecture/history/`
**Target path:** `.architecture/architecture-final.md`
**Launch wedge:** Malaysia · HRMS + Payroll · Cloud SaaS
**Long-term scope:** multi-purpose business platform across Southeast Asia

> **Normative.** Changes arrive as ADRs (§30), never as a competing draft. Package versions, provider SKUs and operational thresholds live in the workspace manifest and configuration — architecture names capabilities, not release numbers. The one exception is **OpenAPI 3.1**, where the version is a contract identity rather than a package release.

---

## A. How this document was produced, and what "qualified" means

Thirteen drafts preceded this one. The last three (`v3-1`, `v3-2-1`, `v3-3`) were independently written and each claimed to be canonical. Producing this document required three things beyond merging them:

1. **Resolving 26 genuine contradictions** between those three documents (§B). They disagreed on the payroll engine signature, the HR domain model, the number of database chokepoints, who owns tenant membership, whether `FORCE ROW LEVEL SECURITY` is unconditional, the isolation-tier enum, the custom-field mechanism, phase numbering, ADR numbering, scenario ID namespaces, the policy scope enumeration, the contents of `pnpm verify`, and the repository layout — including a `organization`/`organisation` spelling split that would break imports.
2. **Adversarially probing six seams none of them examined**, which found **30 further defects — 3 critical, 16 high** — each verified by a separate skeptic against the source documents. Nine were confirmed outright; twenty-one were confirmed with the severity or the fix corrected. These are folded in as normative rules and recorded in Part II.
3. **Correcting the evidence claims** (§C). Two of the three documents overstated what had been demonstrated.

### A.1 What "battle-proven" means here — and what it does not

This distinction is the most important sentence in the document, and only one predecessor stated it:

```
external production precedent / standard   →  qualifies the PATTERN
              +
Xforge failure-mode analysis               →  qualifies the DESIGN
              +
executable qualification test              →  qualifies the IMPLEMENTATION
```

**The patterns here are battle-proven. The design has been desk-validated against 21 scenarios. The implementation is not battle-tested, and will not be until the Architecture Qualification Suite (§29) runs green.**

Predecessor `v3-1` reported its scenario walk-throughs in a PASS/FAIL table and headlined "six defects in nine scenarios," which reads as test output. It was careful reasoning on paper — valuable, and reproduced in Part II — but it was not execution. Part II now says so explicitly, and drops headline defect counts: two documents that both claimed to have "validated the architecture" arrived at different counts, which is precisely why the count is not the evidence. **The corrected sections are the evidence.**

### A.2 Decision classes

| Class | Meaning | How it changes |
|---|---|---|
| **FROZEN** | Architectural invariant or ownership boundary | Superseding ADR + version bump |
| **STABLE** | Established implementation pattern | ADR only if semantics or a boundary changes |
| **REVERSIBLE** | Provider, library or tool chosen behind an internal boundary | Change on measured need; no architecture change |
| **OPEN** | Deliberately undecided, listed in §32 with a resolving gate | Resolve by the named phase |

A decision is **FROZEN** only when: it rests on a durable standard, database invariant or established production pattern; it answers a named Xforge failure mode; it has a named executable qualification test; and replacing it would change source-of-truth ownership, a security boundary, integrity semantics, or dependency direction.

**A vendor is never FROZEN.** No provider choice may become a domain dependency.

---

## B. The contradictions, resolved

Each row settles a real disagreement. Where the documents conflicted, the stricter and more testable position won.

| # | Question | Resolution |
|---|---|---|
| 1 | Payroll engine signature | `calculatePayroll(employmentSnapshot, …)`. `employeeSnapshot` fails **silently** on a mid-month legal-entity transfer — one blended payslip, wrong statutory split, wrong EA form |
| 2 | HR domain model | **`person → employee → employment`**, one `employee` per person **per legal entity**. Adopting the signature without the model leaves the defect open |
| 3 | Database chokepoints | **Two**: `withTenant()` and audited `withPlatformAccess()`. "One chokepoint" is unenforceable, not stricter — admin and billing genuinely need cross-tenant reads, and with no sanctioned path someone disables RLS |
| 4 | Who owns tenant membership | **Xforge**, not the auth library. Membership is the fact used to reject a tenant-A session at tenant-B's host; that check must run against RLS-protected Xforge data |
| 5 | `FORCE ROW LEVEL SECURITY` | **Unconditional.** "Where appropriate" is discretion inside a structural invariant; the isolation gate asserts `relrowsecurity AND relforcerowsecurity` per table |
| 6 | Postgres driver session state | Driver-neutral rule is normative; the Neon-specific note is a REVERSIBLE implementation detail — **plus a Phase 0 test** proving the selected driver keeps `SET LOCAL` across a transaction and drops it on checkout |
| 7 | Schema-per-tenant | **Closed.** Isolation enum frozen at `pooled \| dedicated_database`; a third tier needs an ADR, not a customer conversation |
| 8 | Data residency | A **project, not a config flag**. The isolation flag is true of application code only; the regional cell is separate work. This is the one contradiction with direct commercial consequence — do not sell residency on the strength of the flag |
| 9 | Performance budgets | Per-route, in configuration — **with a default** (≤180KB critical-path JS, LCP <2.5s throttled 4G) applied to any route that has not ratified its own. "Route-specific" with no default is unenforceable on day one |
| 10 | Custom-field mechanism | Three named rungs; promotion trigger is **product-level for all tenants**; `GENERATED`-column promotion prohibited; the three-projected-filter limit is normative, not a footnote |
| 11 | `CLAUDE.md` | One deduplicated union law list; root is **`.architecture/`** (where the files already live) |
| 12 | Phase numbering | Adopt the 0–10 sequence that gives async/outbox its own gate — and **refer to phases by name** in all prose so cross-references survive renumbering |
| 13 | Phase 0 guard proof | **Five** guards deliberately failed, and guard-mutation testing is standing CI thereafter |
| 14 | ADR numbers | One renumbered union. **A number, once issued, is never reused** — a colliding number sends an agent to implement the wrong frozen decision |
| 15 | Scenario ID namespaces | Exactly two: **AQS-nnn** (executable) and **UC-nn** (narrative). The `V-n` prefix is retired; its per-scenario analysis is preserved as UC bodies |
| 16 | Country pack shape | **Typed per-domain contributions**, consumed via `countryContributions` in the manifest. A flat bag forces the second module to fork MY tax rules — Odoo's documented path to unmaintainable localisation |
| 17 | Clearance state | Separate **`compliance_submission`** record. Never a column on a posted document — the only formulation that survives the immutability law |
| 18 | Semantic-registry invariants | The **union: five**, each independently testable. Dropping any one leaves a real re-fusion path open |
| 19 | "Consequential" AI capability | The testable definition is normative; `risk_class` is **derived** from it, so it is reviewable rather than asserted |
| 20 | Optimistic concurrency | A single required **`version` token**, `409` on stale write. Guarded `updated_at` is unsafe under clock skew, and a guard can detect a missing field but not a correctly-guarded predicate |
| 21 | `pnpm verify` contents | The fuller composition. **Any rule not represented as a stage is unenforced by construction** |
| 22 | Repository layout | `organisation` · `.architecture/` + `.architecture/adr/` · `contracts/openapi.generated.json` · `tooling/verify/` · full package list |
| 23 | Policy scope enum | Six values; `team` added later by ADR against a real use case. **The evaluator must reject an unrecognised `scope_type` and fail closed** |
| 24 | Version numbers in prose | Stripped everywhere except OpenAPI 3.1 |

---

## C. Evidence: what is actually supported

The external register (§28) is retained because it answers a real question — *is this pattern credible in serious production systems?* Three corrections make it honest:

- **Precedent supports the pattern, never this implementation.** Shopify and GitHub are precedent that a large monolith can work when continuously engineered; they are not precedent for *these* module boundaries. Stripe's idempotency and Modern Treasury's ledger guarantees are precedent for the pattern, not evidence that Xforge implements it correctly.
- **Three FROZEN rows failed the register's own rule** ("P or S + X"). Most notably **four planes + semantic registry has no external precedent at all** — it is an Xforge synthesis, reasoned from the coupling visible in Frappe DocTypes. It stays FROZEN on failure-mode analysis and its qualification test, and is now labelled as synthesis rather than borrowed precedent.
- **The register was unauditable** — no URLs, versions or retrieval dates. Every entry now carries them or is marked unverified.

**Invented statistics have been removed.** Predecessors argued the custom-field case twice with different fabricated numbers ("20,000 employees, 400 tenants, 99.75% NULL") stated as fact. The argument holds without them; the numbers were never measured.

### C.1 Claims verified during this review

| Claim | Status |
|---|---|
| shadcn defaults to Base UI for new projects since July 2026; Radix still supported | **Verified** ([changelog](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)) |
| "Base UI lacks Context Menu, Hover Card, Toast" — carried by four consecutive drafts | **False, and now stale.** All three ship ([Context Menu](https://ui.shadcn.com/docs/components/base/context-menu), [Hover Card](https://ui.shadcn.com/docs/components/base/hover-card), [Toast](https://ui.shadcn.com/docs/changelog/2026-07-toast)). Open item deleted |
| Vercel acquired Better Auth 7 July 2026; MIT, framework-agnostic, same team | **Verified** ([Vercel](https://vercel.com/blog/vercel-acquires-better-auth)). Its stated focus is **agent identity — separate, revocable agent credentials**, which is what §18 independently requires |
| "Neon's HTTP driver cannot hold session state across statements" | **Unverified vendor claim.** Demoted to an implementation note; replaced by a Phase 0 executable driver test (§B.6) |
| "Vietnam Decree 13/2023"; "Indonesian local storage rules" | **Named but unverified.** Treat as a prompt to obtain legal advice, not as a settled constraint |
| "The team is Vietnam-based" (used to argue for re-examining the launch country) | **No evidence.** Do not treat as an input until confirmed |
| EPF/SOCSO/EIS are wage-band lookup tables, not clean percentages | **Structurally correct and load-bearing**, but every rate, ceiling and band must be taken from current official LHDN/KWSP/PERKESO publications at build time — never from this document |

---

# PART I — NORMATIVE ARCHITECTURE

## 1. Locked decisions **FROZEN**

| Decision | Choice |
|---|---|
| Product model | Cloud SaaS first; portability is an architecture property, not a v1 promise |
| Development model | Claude Code / agent-driven vertical feature slices |
| Language | TypeScript strict, end-to-end |
| System shape | Strict modular monolith |
| Launch vertical | HRMS + Payroll |
| Launch jurisdiction | Malaysia |
| Long-term region | MY, SG, VN, ID, TH, PH |
| Public API | REST + OpenAPI 3.1, externally consumable |
| Delivery sequence | Frontend-led, contract-before-handler |
| Database | PostgreSQL; Neon at launch (REVERSIBLE) |
| Tenant isolation | Shared schema + `tenant_id` + RLS |
| Isolation enum | `pooled \| dedicated_database` — no third tier without an ADR |
| Tenant URL | Xforge subdomain default; verified custom domain on eligible tiers |
| Metadata | First-class but bounded; never the owner of all planes |
| Custom fields | Registry + JSONB canonical; derived index projection for hot paths |
| Core transactional data | Real relational tables, constraints, indexes |
| Authentication | Better Auth behind a facade — **identity and session only** |
| Membership, roles, scopes | **Xforge tables** |
| Async | Transactional outbox + swappable durable executor |
| AI | Provider-neutral application client; no privileged database path |
| AI mutation default | Draft/proposal for consequential actions |
| Localisation | Versioned country packs with typed per-domain contributions, separate from compliance adapters |
| Infrastructure | Managed and deliberately boring; additions require measured need |
| Definition of green | `pnpm verify` |

> **Architecture wide, delivery narrow.** The kernel is module-agnostic and country-pack-shaped from day one. That does **not** justify building Sales, Accounting, Manufacturing, multi-country payroll or a marketplace before the Malaysia HR/payroll wedge is proven. **Generalise from a second real domain, not from imagination.**

---

## 2. Architecture laws — the whole of `CLAUDE.md` **FROZEN**

```
# Architecture laws

1.  Modular monolith until measured evidence justifies extraction.
2.  Frontend-led is build order; API-first is architectural authority.
3.  Every business operation has a typed route contract before its handler.
4.  Every route contract carries a policy declaration — a permission and scope,
    or the explicit literal 'public'. No declaration, no mount.
5.  Business UI reaches the backend only through generated contract clients.
    One transport, one policy path. No Server Action business API.
6.  React UI never imports repositories, Drizzle, DB handles, or another
    module's internals.
7.  Every fact has one authoritative source. No mega definition owns unrelated
    concerns.
8.  Data, Contract, Experience and Policy are separate planes joined by stable
    semantic identifiers.
9.  Core business truth is explicit TypeScript plus relational PostgreSQL data.
10. Metadata composes repetitive experience and tenant variation. It never
    replaces high-integrity domain modelling.
11. Every tenant-owned table has tenant_id, with RLS enabled AND forced.
12. Tenant DB access only through withTenant(); cross-tenant access only through
    withPlatformAccess(), which is audited and restricted to apps/admin.
13. A request context carries exactly one tenant_id, bound at an explicit
    selection step and re-verified against membership on every request.
14. Tenant, legal entity, organisational structure and authentication stay
    distinct. person → employee → employment; one employee per person per
    legal entity.
15. Payroll and statutory scope is legal_entity, and operates on employment
    periods — never tenant, never employee.
16. Modules never import another module's repository or private persistence.
17. Consequential state transitions use explicit commands, never status patches.
18. Final payroll and accounting history is immutable. Correct by reversal and
    replacement.
19. No JavaScript floating-point number represents monetary truth.
20. All effective-dated ranges are half-open [from, to) and structurally
    non-overlapping.
21. Civil dates derive from the legal entity's IANA zone, never the runtime clock.
22. Mutable documents carry a version token. Stale writes are rejected with 409,
    never merged.
23. Country rules are effective-dated and never spread as if(country) branches.
24. Compliance connectivity is separable from transactional ledger truth.
25. AI uses the same commands, policies and tenant isolation as human clients.
26. AI never receives a database connection, and never gains a tool merely
    because an entity exists.
27. Generated state is never hand-edited.
28. Production migrations follow expand → backfill → switch → contract.
29. Architecture invariants are enforced by guards, not prose.
30. New infrastructure requires a named, measured pain.
31. Generalise a platform abstraction only after a second real use case proves it.
32. pnpm verify is the canonical definition of repository green.

Canonical architecture: .architecture/architecture-final.md
Decisions:              .architecture/adr/
```

---

## 3. Doctrine **FROZEN**

> **Explicit core. Metadata at the edges. Contract in the middle.**

```
business truth          → explicit code + relational data
external interface      → typed contract + OpenAPI
repeatable UI structure → bounded metadata
tenant variation        → deterministic overlays
country variation       → versioned localisation packs
authority connectivity  → compliance adapters
async intent            → transactional outbox
AI                      → authorised application tools
infrastructure          → added only against measured pain
architecture            → enforced by executable guards
```

**Vibe-first.** Claude Code reliability is a first-class engineering constraint: common well-documented technology, high static type density, explicit data flow, shallow dependency graphs, plain functions over reflection-heavy frameworks, generated repetition over hand-maintained repetition, narrow public surfaces, invariants enforced by code, feature slices with executable done-conditions.

> **Verbose-but-obvious beats terse-but-magical.** An abstraction whose main advantage is fewer lines while raising inference cost is a net negative here.

**DRY is one source of truth per fact** — not one mega-definition generating the platform, which is ERPNext's actual long-term problem rather than merely its `ALTER TABLE` problem.

| Fact | Authority |
|---|---|
| Column, index, constraint | PostgreSQL / Drizzle schema |
| Operation and request/response semantics | Typed route contract |
| Published external API | Generated OpenAPI document |
| Business invariant | Domain / application code |
| Generic field semantic | Semantic registry |
| Form and list composition | Experience metadata, or explicit React |
| Permission vocabulary; role and scoped grant | Policy registry / policy data |
| Tenant custom field definition | Metadata registry |
| Statutory rate or table | Effective-dated country rule pack |
| Authority protocol mapping | Compliance adapter |
| Generated client, hooks, mocks | OpenAPI-derived generated state |
| Business audit event | Append-only audit store |

**KISS is an infrastructure budget.** One language, one primary database, one principal deployment, one API style, one auth facade, one job mechanism, one verification command. A dependency is added only when it removes a named, measured problem, with the evidence in the ADR.

**Stability over novelty.** Routine upgrades need no ADR. An upgrade needs one only when it changes an architectural contract, deployment shape, data model, security model or ownership boundary.

---

## 4. System shape **FROZEN**

```
                    ┌──────────────────────────┐
                    │        XFORGE WEB        │
                    │ Next.js · React · shadcn │
                    │ hand-built UX + renderer │
                    └────────────┬─────────────┘
                                 │ generated client only
                    ┌────────────▼─────────────┐
                    │   OpenAPI 3.1 contract   │
                    └────────────┬─────────────┘
                    ┌────────────▼─────────────┐
                    │   HONO — thin adapters   │
                    │   policy declared, then  │
                    │   evaluated, then command│
                    └────────────┬─────────────┘
          ┌──────────────────────▼──────────────────────┐
          │           APPLICATION / DOMAIN              │
          │   command → policy → domain rule → repo     │
          │   hr · payroll   (→ future modules)         │
          └──────────┬──────────────────────┬───────────┘
                     ▼                      ▼
                PostgreSQL              outbox → durable jobs
                RLS · JSONB                       │
                FTS · pgvector                    ▼
                                     integrations · webhooks
                                     statutory authority APIs

  PLATFORM KERNEL — must not know Payroll exists
  identity · tenancy · organisation · policy · metadata · workflow · audit
  files · events · jobs · notifications · integration · localisation
  compliance · time · ai
```

**Module interaction.** A module communicates through another module's public application interface, published domain events, or platform capabilities. It may **not** import another module's repository, Drizzle tables, private domain implementation, or private UI.

### 4.1 Module anatomy

```
modules/payroll/
  manifest.ts
  contract/        routes.ts — typed route contracts (each with a policy declaration)
  application/     commands/ · queries/
  domain/          model/ · rules/ · services/
  infrastructure/  repository/
  metadata/        entities/ · forms/ · lists/ · workflows/ · reports/
  ui/              features/ · screens/ · components/
  events/
  tests/           contract/ · domain/ · integration/ · e2e/
```

`manifest.ts` declares: `id`, `version`, `dependencies`, `optionalIntegrations`, `permissions` (with status — §9.3), `navigation`, `entities`, `eventsEmitted`, `eventsConsumed`, `workflows`, **`countryContributions`**, `payrollInputs` (§13.4), `featureFlags`.

### 4.2 Repository shape

```
xforge/
├─ .architecture/   architecture-final.md · evidence-register.md · adr/
├─ apps/            web · admin · api (thin mount) · docs
├─ modules/         hr · payroll  → future business modules
├─ packages/        api · api-client[GEN] · auth · db · tenancy · organisation
│                   policy · metadata · metadata-ui · workflow · audit · events
│                   jobs · files · notifications · integration · localisation
│                   compliance · ai · time · money · ui · tokens · testing
├─ contracts/       openapi.generated.json + snapshots
├─ tooling/         generators/ · architecture/ · verify/
├─ docs/
└─ CLAUDE.md
```

`apps` = deployable compositions · `modules` = business capabilities · `packages` = platform capabilities · `contracts` = generated published artifacts.

**Dependency direction:** `apps → modules → platform packages → shared primitives`. No reverse dependencies, no business-module cycles, both mechanically enforced.

> **The platform kernel must not know that Payroll, Sales or any future module exists.**

### 4.3 One app, multiple mounts

`packages/api` is transport-agnostic from day one and **the domain never imports Hono**, so the same composition mounts in the web deployment today, a standalone server when extracted, and the worker. Extraction is a deployment decision, never a rewrite.

---

## 5. The four planes and the semantic registry **FROZEN**

| Plane | Authority for | A change is |
|---|---|---|
| **Data** | tables, FKs, constraints, indexes, RLS, migration history, immutable ledgers | a reviewed migration |
| **Contract** | operations, schemas, errors, pagination, idempotency, compatibility, versioning | a versioned contract change |
| **Experience** | form/list composition, display, labels, ordering, visibility, saved views, dashboards, theme, preferences | a config edit |
| **Policy** | actions, roles, scoped grants, workflow permission, row/field access, approvals, AI eligibility | an audited config edit |

**The semantic registry is the join, not the owner.** It holds only `entity_id · field_id · semantic_type · reference_target · label_key · searchability · sensitivity_class · ai_description · customisation_capability`.

**Five invariants, each mechanically enforced (AQS-009):**

1. Changing `label_key` never alters a database column.
2. Hiding a field never relaxes API validation.
3. Declaring a field AI-readable never grants permission.
4. Adding a custom field never changes core table DDL automatically.
5. Defining a custom field never bypasses a policy check on reading it.

**Generation is one-directional and gated:** an entity definition *proposes* a migration; a human reviews and applies it.

> **The Experience plane may never weaken the Contract plane.** If the contract requires `customer_id`, tenant metadata saying `required: false` changes the form only.

Without a named join point the planes silently re-fuse — a field gets added and grows a column, a route, a widget and a permission because nothing said it must not.

---

## 6. API-first authority, frontend-led sequence **FROZEN**

```
UX intent → screen states + interaction design
   ↓
typed route contract (Zod) + policy declaration
   ↓
OpenAPI 3.1 generated
   ↓  pnpm generate
typed client + Query hooks + MSW mocks
   ↓
COMPLETE FRONTEND AGAINST MOCKS      ← no database, no backend, no infrastructure
   ↓
handler → command → policy → domain rule → repository → PostgreSQL
   ↓
contract + integration + E2E verification
```

The authored route contract is the code authority; the generated OpenAPI document is the published, language-neutral compatibility surface.

### 6.1 Every route declares its policy — no declaration, no mount **[D-1, critical]**

> Every route contract **MUST** carry a `policy` declaration: either `{ permission, scopeType }` or the explicit literal `'public'`. The `packages/api` adapter evaluates it before dispatching to the command and **refuses at registration time to mount any operation whose contract omits it.**

This closes the sharpest hole found in the entire review. The predecessor guard — *"permission code used but not registered in a manifest"* — is a **spelling check, not a presence check**. A command with **no permission check at all** declares no code, so it trips nothing: every guard passes, `pnpm verify` is green, and the endpoint is open. Since the architecture's central claim is that guards make agent-authored code safe, a guard that cannot see an absent check undermines the claim at its foundation.

`AQS-021 policy-coverage proof` dynamically enumerates every registered operation — the way AQS-005 enumerates tenant tables — and asserts each has a declaration and that a principal lacking the permission receives `403`.

### 6.2 One business transport

Browser business operations use the generated HTTP client. React Server Components handle shell, session bootstrap, route metadata and non-business composition — **not** business reads. **Do not create a second in-process business query facade in v1.**

The decisive argument, which no draft stated until late: the facade bypasses the HTTP layer, and **the HTTP layer is where rate limiting, request logging, correlation IDs, idempotency handling and the standard error envelope live.** A facade read therefore has different observability and different failure semantics from the same read over HTTP — a second path in *behaviour*, which an `operationId` parity guard cannot detect. Add that a facade read cannot be built against MSW, and it is settled.

An in-process read transport may be introduced later only with **all five**: a measured bottleneck, an ADR, a named benchmark and threshold, read-only enforcement, and mechanical parity tests.

**Forbidden:** `React UI → Drizzle` · `React UI → repository` · `React UI → foreign module internals` · `Server Action → hidden business mutation`.

### 6.3 Conventions, established once

`/v1/` prefix · stable `operationId` · consistent pagination and filter/sort vocabulary · RFC 9457 Problem Details error envelope · `request_id` correlation · explicit idempotency keys on retryable commands · consistent date-time and decimal serialisation · no silent coercion of invalid business input.

**Idempotency keys are caller-supplied, or derived only from immutable identity** — never from mutable business state. A key derived from payroll state swallows a legitimate correction run as a duplicate.

### 6.4 Boundary hardening — tested, not assumed

Accepted `Content-Type` · malformed body · missing body · maximum body size · unknown-field policy · consistent validation errors. These live in contract tests.

### 6.5 Commands, not status patches

```
POST /payroll-runs/{id}/calculate      not   PATCH { status: 'calculated' }
POST /payroll-runs/{id}/approve
POST /leave-requests/{id}/approve
POST /journal-entries/{id}/post
POST /journal-entries/{id}/reverse
```

---

## 7. Metadata and customisation **STABLE**

### 7.1 Overlay chain

```
System definition → Country pack → Tenant configuration → User personalisation
```

Deterministic, typed, version-aware, conflict-detecting, and inspectable through an **effective-configuration view** showing which layer contributed each value. Without it, debugging a tenant's configuration becomes archaeology.

**Conflict resolution is defined, not implied:** the later layer wins for presentation attributes; **a country-pack contribution that a statutory rule depends on is not overridable by tenant configuration** and the resolver raises a conflict rather than silently accepting the override. Overlay anchors are slot names bound to a slot-set version; when an anchor disappears, the overlay is surfaced as broken in the effective-configuration view rather than dropped.

### 7.2 Stable slots, never inheritance

```
employee form
  slots: header · identity · contact · employment · compensation
         statutory · documents · activity
```

Overlays address slots by stable name. Forbidden: DOM selector patches, XPath, runtime monkey-patching, tenant-provided executable server JavaScript.

### 7.3 The custom-field ladder — three rungs

| Rung | Use when | Mechanism | Cost |
|---|---|---|---|
| **1. JSONB + GIN** | Default: containment, display, export | `entity.custom` JSONB | Zero DDL |
| **2. Projection index** | Indexed filtering or sorting at scale | `custom_field_index`; JSONB stays canonical | Zero DDL; one join per filtered field |
| **3. Real column** | The field has become a **product** field for all tenants | ADR + reviewed migration | Normal migration |

```
custom_field_index
  tenant_id · entity_type · record_id · field_id
  value_kind · value_text · value_numeric · value_date
  source_version
```

> **`GENERATED ALWAYS AS (custom->>'x') STORED` promotion is prohibited.** A shared-schema table serves every tenant; adding a column because one tenant filters on it adds it for all of them, and converts "zero per-tenant DDL" — the largest claimed improvement over ERPNext — back into per-tenant DDL in disguise.

**Named limit, stated rather than hidden:** filtering on N projected fields costs N joins. **Above three, hand-build the screen and the query.**

**Projection integrity — reads fail closed [D-2, high].** The projection is non-authoritative. Each `(tenant_id, entity_type, field_id)` carries a `projection_status` row with `watermark_at`, `lag_seconds` and `dead_letter_count`. A filtered read whose projection is behind its declared freshness threshold, or carries a non-zero dead-letter count, is **re-resolved against canonical JSONB or refused with an RFC 9457 `projection_stale` problem — never silently served short.** Any bulk or consequential operation over a filtered set — **payroll input selection included** — resolves its member set against canonical JSONB before executing. `packages/metadata` owns `rebuildProjection()` as a resumable job invoked automatically on dead-letter drain.

Without this, a dead-lettered projection event silently shortens a payroll input selection: employees are simply missing from the run, and nothing errors.

**Metadata has a reference graph [D-3, high].** Deleting a custom field, slot or permission code is refused while a workflow condition, saved view, report, policy rule or AI tool description still references it. Deletion offers the reference list. A workflow condition whose referenced field has vanished evaluates to **error, never to false** — silently-false conditions skip approval levels.

**Tenant custom entities:** a generic JSONB record facility may be added later for low-risk objects. **Never permitted for** payroll results, statutory records, journal or ledger entries, stock movements, or payments and settlements.

### 7.4 The two rules that stop this becoming Odoo

> **If exactly one entity needs a metadata capability, hardcode it.**

> **Metadata-render:** master-data CRUD, list/detail, filters, saved views, simple approvals, simple reports, configuration.
> **Hand-build:** payroll processing, bank reconciliation, month-end close, inventory and manufacturing planning, POS, complex quotations, executive workspaces, AI workbench.

Escape hatches are first-class. **The generator is a productivity default, not a prison.**

---

## 8. Multi-tenancy and organisation **FROZEN**

### 8.1 Six distinct concepts — never collapsed

```
PERSON  ────────────► a human being; one record per human, tenant-scoped
   │
   └── EMPLOYEE ────► person employed BY A LEGAL ENTITY
          │           one per person per legal entity
          │           carries that entity's statutory registrations
          │
          └── EMPLOYMENT ► a dated period with job, org unit, pay basis
                           effective-dated; payroll operates on THIS

USER ──membership──► TENANT
                       ├── LEGAL ENTITY (Sdn Bhd A) — own EPF, SOCSO, LHDN E-number
                       ├── LEGAL ENTITY (Sdn Bhd B) — own registrations, own EA forms
                       └── BUSINESS UNIT → branch · site · warehouse · department
```

A Malaysian group with three `Sdn Bhd` entities is **one tenant with three legal entities**, each filing its own Borang EA.

> **Payroll scopes to `legal_entity` and operates on `employment` periods — never on `employee`, never on `tenant`.**

The `person → employee → employment` split is not modelling luxury. A single `employee` row with a `legal_entity_id` column cannot represent one person employed by two legal entities in one period — and the failure is **silent**: one payslip with blended contributions and an incorrect EA form, undetected until an EPF audit. See UC-02.

An authentication provider's "organization" is **not** canonical ERP topology.

### 8.2 RLS is structural, not conventional

```sql
ALTER TABLE employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employee
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

**Four details decide whether this works or is theatre:**

1. **Never connect as the table owner.** RLS silently skips owners and superusers. Use a dedicated non-owner `app_user` without `BYPASSRLS`; `FORCE` is the second line, asserted per table by the isolation gate.
2. **Transaction-scoped context only.** `SET LOCAL`, never session-wide `SET` — under a pool a session variable leaks to whichever tenant borrows the connection next.
3. **Never depend on connection-session state that can survive a pool checkout.** A Phase 0 test proves the selected driver preserves `SET LOCAL app.tenant_id` across every statement in a transaction and loses it on checkout.
4. **Two chokepoints, and only two:**

```ts
withTenant(tenantId, fn)        // the only path to tenant-scoped data
withPlatformAccess(reason, fn)  // the only path to cross-tenant data
```

`withPlatformAccess` exists because the admin console, billing rollups and platform analytics genuinely need cross-tenant reads. **Without a sanctioned path, someone adds a privileged connection or disables RLS on a table — the documented way RLS architectures fail.** It is restricted to `apps/admin`, requires a stated reason, writes an audit row on every call, and is forbidden in `modules/**` by a guard. The point is not that cross-tenant access is safe; it is that it is rare, named and logged rather than improvised at 2am.

Indexes are tenant-leading. Business identifiers are unique **per tenant**, never globally.

### 8.3 Exactly one bound tenant per request **[D-4, critical]**

> An authenticated request context carries **exactly one `tenant_id`**, bound at an explicit tenant-selection step and re-verified against the membership record on every request. Where a principal holds two or more memberships, selection is a distinct operation that mints a **tenant-bound** session or credential. Any request whose host-resolved tenant differs from the bound tenant is rejected.

Every predecessor relied on "the API re-derives the tenant from the session and asserts it matches the host." **For a principal who belongs to more than one tenant that check is a tautology** — the session is valid for both tenants, so the host becomes the sole selector and the assertion always passes. A consultant, an accountant, or a group-company HR manager with access to two tenants is an ordinary case, not an exotic one. AQS-008 and UC-13 must cover a principal holding N≥2 memberships presented at a sibling tenant's hostname, and a tenant-bound credential replayed at a foreign hostname.

### 8.4 Legal-entity scoping has no structural enforcer — so it is explicit **[D-5, high]**

RLS enforces the tenant boundary. **Nothing enforces the legal-entity boundary**, yet a query that omits it files contributions under the wrong employer number — a statutory error, silently. Until a structural mechanism exists:

- Repository methods over legal-entity-scoped entities take `legalEntityId` as a **required, non-optional** parameter — never an optional filter.
- The payroll and statutory read paths go through `packages/organisation` helpers that cannot be called without it.
- A guard flags any query in `modules/payroll/**` against a legal-entity-scoped table that does not bind it.

### 8.5 Isolation tiers

```
pooled shared schema + RLS   ← default, and the only tier built in v1
dedicated_database           ← enterprise / residency escape hatch
```

No schema-per-tenant tier. The connection resolver owns the decision; **business modules never branch on it.** Read §26.2 before selling the dedicated tier — it costs more than a config flag.

### 8.6 Tenant URL

```
tenant_domain
  id · tenant_id · hostname · domain_type · status
  verification_method · verified_at · is_primary
```

```
Host → domain resolver → candidate tenant → authenticated principal
     → membership verification → bound tenant context (§8.3)
```

> **The hostname selects a *candidate* tenant. It never grants authority.** A network-provided `x-tenant-id` is a routing hint, never an authorisation claim.

---

## 9. Authentication, authorisation and principals **FROZEN**

```
Authentication  → who is the principal?          Better Auth, behind packages/auth
Tenant boundary → what can this connection see?  PostgreSQL RLS  (fails safe)
Policy          → what may this principal do?    packages/policy
```

**Better Auth owns** identity, sign-in and session lifecycle, MFA/passkeys/SSO. **Xforge owns** tenants, membership, business roles, permissions, scopes, organisational access and business audit — membership specifically, because it is the fact the tenant-binding check in §8.3 evaluates, and that check must run against RLS-protected Xforge data.

```
permission = payroll.run.approve
scope_type = legal_entity
scope_id   = MY01
```

Vocabulary is `module.resource.action`. Scopes: `tenant · legal_entity · business_unit · location · department · own`. `team` is added later by ADR against a real use case. **The evaluator rejects an unrecognised `scope_type` and fails closed.**

> **UI permission state is presentation convenience only, never the security authority.**

### 9.1 Machine principals are first-class **[D-6, high]**

The API is described as externally consumable by partners, integrations and future mobile and AI clients — but no predecessor said how a machine authenticates. Better Auth's `api-key` plugin issues and validates credentials by **mocking a session tied to a user**, so used naively a partner integration acts *as a human*: the audit trail records "Siti approved this" when a machine did.

> **A machine principal is a first-class principal type in Xforge — never a user with a credential attached.** It has its own identity, its own scoped grants, its own audit identity, and its own rate limits. `packages/auth` may use the auth library to mint and verify the credential; the **principal** it resolves to is an Xforge machine principal. The audit trail represents non-human actors natively.

AI agent identity uses the same model, distinct from both user and integration principals — separately scoped and independently revocable, matching Better Auth's Agent Auth direction (§C.1).

### 9.2 Revocation is an object, not an event **[D-7, high]**

> `tenant_membership` and every scoped grant carry a status and `valid_from`/`valid_to`, and `packages/policy` evaluates validity on **every** request, so temporary delegation expires by construction. `packages/auth` exposes `revokePrincipal(principalId, reason)`, which in one transaction terminates sessions and marks memberships, grants and credentials revoked with an audit row. An `hr.employment.ended` outbox consumer invokes it after a configured grace window.

The HR-core phase does not exit until **a principal whose employment ended yesterday is denied on the next request.**

### 9.3 Permission codes have a retirement lifecycle **[D-8, high]**

Codes carry `status: active | deprecated(replaced_by) | retired(not_before)` in the manifest, and reach `retired` only after a deprecation window. A generated `permission-vocabulary.json` snapshot is committed so **CI fails when a code disappears without a tombstone** — making the guard bidirectional rather than one-directional.

> **The policy compiler fails closed.** A row or field rule referencing an unknown or retired code compiles to **DENY**, never to "no restriction," and raises a policy-integrity error. An unknown code in a grant evaluates to no grant.

Rewriting tenant grants and field rules through `replaced_by` is an audited resumable migration under expand → backfill → switch → contract, never an implicit deploy-time side effect.

### 9.4 Field-level access is enforced in the response **[D-9, high]**

`sensitivity_class` in the semantic registry is metadata with no enforcement behind it, and predecessors relied on the UI not rendering a column. **The API response filter — not the client — removes fields the principal may not read**, and a contract test asserts that a principal without `hr.compensation.read` receives a response with the field *absent*, not merely hidden.

---

## 10. Time and effective-dating **FROZEN**

A section no predecessor had. Three confirmed defects live here, all producing silently wrong money.

### 10.1 Civil time has an authority **[D-10, high]**

> Civil dates derive from an **IANA time zone stored on `legal_entity`** — defaulted by the country pack through the overlay chain, overridable per `location` for attendance and shift boundaries — never from the runtime clock, the tenant, or the jurisdiction. Business dates are stored as `date`, instants as `timestamptz`; the two are never implicitly converted. Narrowing an instant to a business date is permitted only through the single sanctioned `businessToday(legalEntityId)` helper in `packages/time`.

A guard fails any `new Date()`, `Date.now()` or `now()::date` inside `modules/**`. Recurring jobs — accrual, period close, statutory deadlines — are scheduled in the **owning legal entity's zone**, not the executor's. On a UTC runtime, a Malaysian month-end job fires at 08:00 local on the 1st and attributes work to the wrong period.

### 10.2 Half-open intervals, structurally non-overlapping **[D-11, high]**

> All effective-dated ranges are half-open `[effective_from, effective_to)`. A NULL `effective_to` is open-ended. `effective_from = effective_to` is an empty range rejected by a CHECK constraint — a same-day joiner-leaver is `[2026-03-03, 2026-03-04)`.

Every effective-dated table enforces non-overlap **structurally**:

```sql
EXCLUDE USING gist (
  tenant_id WITH =, <owner_key> WITH =,
  daterange(effective_from, effective_to, '[)') WITH &&
)
```

`<owner_key>` is the row's own owner — `employee_id` for employment (**never `person_id`**, which would forbid the legitimate concurrent-employment case §8.1 exists to represent), `(jurisdiction, rule_id)` for rule packs.

Two guards: *effective-dated table missing an overlap-exclusion constraint*, and *rule-pack set with overlapping effective ranges*. A snapshot builder finding no row effective on a date returns **"no row effective on D" as a distinct outcome** and never falls back to the nearest row.

The rule-pack case is the sharpest: selecting a pack "by period date" with no boundary convention makes pack selection at a rate-change boundary arbitrary — arriving through the boundary rather than through overwriting, which is exactly the hole effective-dating was believed to have closed.

### 10.3 Valid time and transaction time are different **[D-12, high]**

> Every effective-dated business table carries **transaction time** — `recorded_at timestamptz NOT NULL DEFAULT now()` beside its valid-time columns — enforced by a guard in the same family as *tenant table missing `tenant_id`*. Every payroll run stores `snapshot_taken_at`.

The approve command re-queries rows overlapping the run's period whose `recorded_at` is later than `snapshot_taken_at` and raises the blocking finding **`RETRO_INPUT_AFTER_SNAPSHOT`**, cleared only by recalculating or by an explicitly recorded decision to defer to a later period.

Without this: a backdated raise effective 1 March, entered on 20 March after the run was calculated, is **invisible at approval**. A snapshot hash proves the snapshot is unaltered; it can never prove the snapshot is still *current*.

### 10.4 The snapshot is a closed value **[D-13, high]**

> The payroll input snapshot carries the resolved **values** — never identifiers the engine could dereference — of every person- and employee-level statutory fact the rule pack may key on: date of birth, nationality and PR status, statutory registrations. Age and completed service are derived **at the period-relative dates the rule pack declares** (period start and period end), never at snapshot-creation time.

Combined with "no clock reads" and "no database I/O," an implementer with no declared as-of date will reach for the wall clock at snapshot time — and a 60th birthday falling inside the period then changes the EPF category depending on *when the run happened to be calculated*. Blocking fixtures: **the employee's 60th birthday falls inside the period**, and **the employee's service anniversary falls inside the period**.

---

## 11. Data discipline **STABLE**

**Migrations: expand → migrate/backfill → switch → contract.** No destructive change in the same deployment that first stops using the old shape. Forward-reviewed SQL. Resumable backfills. Every migration tested against an isolated branch. Releases stay compatible with the immediately preceding schema during rollout. **Tenant customisation generates no ordinary DDL.**

**Concurrency.** Mutable business documents carry a `version` token on every update command; the API rejects stale writes with **`409`**, never merges. A single mandated mechanism, because a guard can mechanically detect a missing `version` field but cannot detect whether an `updated_at` predicate was correctly guarded.

**Identifiers.** Technical primary keys are opaque. Business document numbers are separate attributes scoped by tenant and legal entity. A human-readable number is never a primary key.

---

## 12. Money and numerical integrity **FROZEN**

| Kind | Representation |
|---|---|
| Persisted monetary and accounting values | `numeric(p,s)`, explicit scale per semantic type |
| TypeScript arithmetic | Explicit decimal domain type |
| Payroll statutory calculation | Integer minor units (sen) |
| Non-monetary UI display | `number` only where precision is not business truth |

**No IEEE-754 floating point represents monetary truth, anywhere.**

**Minor-unit scale is data, not an assumption.** VND has 0 decimals, most SEA currencies 2. Hardcoding `×100` is a defect waiting for the Vietnam country pack.

Multi-currency transactions persist `transaction_amount · transaction_currency · base_amount · base_currency · exchange_rate · exchange_rate_source · exchange_rate_timestamp · rounding_policy`.

> **Never recompute historical base amounts from today's rate.** The rate that applied is a stored fact.

Rounding policy is **named, versioned and tested**. `price × quantity → amount` is one explicit function. Never `.toFixed()` scattered across modules.

---

## 13. Payroll — the launch high-integrity domain **STABLE**

### 13.1 Pure calculation engine

```ts
calculatePayroll(
  employmentSnapshot,      // employment period, not employee (§8.1)
  payrollInputSnapshot,
  rulePack,                // versioned, effective-dated
  period,
): PayrollCalculation
```

Deterministic · no network I/O · no database I/O · **no clock reads** · closed-value snapshot (§10.4) · explicit rule-pack version · integer sen.

### 13.2 Immutable lifecycle

```
DRAFT → calculate → CALCULATED → review → REVIEWED → approve → APPROVED → release → RELEASED
```

Each command verifies current state, permission, **legal-entity scope**, concurrency version, required findings, snapshot hashes, `RETRO_INPUT_AFTER_SNAPSHOT` (§10.3), rule-pack version and idempotency. Final results are immutable; corrections create reversal, adjustment or replacement artifacts.

**Review sign-off binds to the calculation attempt, not the run** — otherwise a recalculation silently carries old approval evidence forward.

**Concurrent runs are structurally prevented:** a partial unique index over `(legal_entity_id, period)` for runs in any non-terminal state.

### 13.3 Reproducibility needs three pinned values

```
input snapshot  +  rule-pack version  +  calculation-engine version
```

The engine version matters because a bug fix changes output for identical inputs. Without it, a 2028 re-run of a 2025 payslip produces a different number and nobody can explain why.

### 13.4 Period lock and retro adjustments **[D-14, critical]**

> Payroll owns period status and exposes it as a public application query `payroll.getPeriodStatus(legalEntityId, effectiveDate) → OPEN | LOCKED`, with `payroll.period.locked` / `unlocked` events. Any module writing an effective-dated fact declared in its manifest as a `payrollInput` must consult it.
>
> A write dated into a LOCKED period is **accepted, not blocked** — stamped with its original period and emitted as a retro-input event that payroll records as a **pending retro adjustment**. The next `calculate` for that legal entity must either consume every pending adjustment or record an audited waiver as an unmet required finding.

Without this, retroactive leave approved into a RELEASED period is accepted, decrements the balance, and **is never seen by any payroll run** — the employee is paid for leave they did not have, and the ledger and the balance disagree permanently with no error anywhere.

### 13.5 Statutory rule packs

Every rule carries `jurisdiction · effective_from · effective_to · version · authority_reference · source_hash`. **Historical rules are never overwritten.**

**Statutory rates are versioned data, never code.** EPF, SOCSO and EIS are **wage-band lookup tables**, not clean percentages — encoding them as formulas is a known, expensive mistake. An annual rate change is a data row, not a deploy.

**Malaysia launch scope:** EPF/KWSP · SOCSO/PERKESO · EIS/SIP · PCB/MTD with applicable instructions · HRD Corp levy where applicable · employer registrations on `legal_entity` · statutory and year-end outputs in approved scope · bank disbursement artifacts · Employment Act 1955 leave entitlements as amended.

> **Implementation flag:** every rate, wage ceiling and tax table must be sourced from current official LHDN / KWSP / PERKESO publications at build time and encoded with its effective date. **Take no figure from memory, from a model, or from this document.**

---

## 14. Accounting and inventory — invariants now, modules later

Commands, not patches. Posted truth corrected through **original + reversal + corrected replacement**.

**Property-based invariants, written as specifications before any posting code is accepted:** debit = credit · reversal neutralises the original · posting is idempotent · subledger reconciles to GL · stock quantity and value conservation holds · allocation rounding conserves totals · FX and revaluation policy is deterministic.

Not candidates for metadata-generated logic, and not candidates for unsupervised agent authorship.

---

## 15. Workflow

> **Workflow metadata decides when a transition is allowed. Domain commands decide what it does.**

Metadata defines states, transitions, eligible permissions, approval levels, conditions over exposed safe facts, notification and SLA metadata. Complex side effects remain explicit application code. A condition referencing a missing field **errors, never evaluates false** (§7.3).

---

## 16. Events, outbox and durable jobs **FROZEN**

```
BEGIN
  change business state
  insert outbox_event
COMMIT
```

**The outbox is the durable record of intent.** No dual-write.

**Assume at-least-once delivery.** Consumers are idempotent, using stable event IDs, idempotency keys, a processed-event record, retry with backoff, and an **operator-visible dead-letter state**.

`packages/jobs` defines the execution interface; the executor is REVERSIBLE and **business modules never import its SDK** (guard-enforced). Executor replacement is an operational migration, not a domain rewrite.

**Consumer lag is a precondition, not a metric.** A payroll `calculate` or `approve` that depends on a projection or read model asserts that consumer's watermark covers the period before proceeding, and refuses with a named finding otherwise (§7.3).

Money-moving external operations require explicit idempotency and reconciliation. **Payroll must never double-pay.**

---

## 17. Files, search and retrieval

**Files.** Private by default. Metadata persists separately: `file_id · tenant_id · owner_entity_type · owner_entity_id · classification · content_type · size · checksum · storage_key · created_by · created_at`. Sensitive files served through short-lived signed access or authorised streaming. **Never a permanent public URL to a payslip in a business record.**

**Search.** Postgres FTS + `pg_trgm` + language normalisation (`unaccent` plus a normalised column where a language needs it). A dedicated search service only against a measured requirement.

**Vectors.** pgvector in the same database. **Tenant and permission filtering inside the retrieval query** — never rank globally then filter.

---

## 18. AI-native architecture **FROZEN**

```
AI → policy + tool registry → application command/query
   → normal authorization → tenant context / RLS → repositories → DB
```

### 18.1 Tool exposure is bounded, and "consequential" is defined

```
GENERATED from metadata   read · list · search · draft_create
AUTHORED explicitly       everything else
```

> **A capability is consequential if it changes money, statutory filings, stock, an approved record, or an input to any of those.**

The trailing clause is what catches leave: it reads as routine administration, but it changes a balance that feeds unpaid-leave proration, which changes statutory contributions. `apply_leave` is therefore **authored**, and produces a draft requiring approval. Leaving "consequential" to intuition gets this exact case wrong.

`risk_class` is **derived** from this definition, so it is reviewable rather than asserted. Every registration specifies `tool_id · operation_id · risk_class · required_permission · approval_mode · input schema · output schema · audit requirements`.

> **An entity existing is not consent for an agent to mutate it.**

### 18.2 Guardrails

1. AI never receives database credentials and never authors SQL.
2. AI operates under the caller's or agent's identity and tenant context, through the same API and policy layer as a human.
3. Retrieval filters tenant, row permission, sensitivity and classification **inside the query**.
4. Consequential writes create drafts requiring approval. **Autonomy is configured per action type and risk class** — never enabled wholesale by a generic "AI enabled" flag.
5. Extraction has confidence thresholds; below threshold routes to a human. Never guess a number into a payslip.
6. Agent identity is a distinct principal type (§9.1) — separately scoped, independently revocable.
7. Every AI action is audited: principal, agent identity, tenant, model and provider, tool, correlation, approval, resulting command, model configuration version, prompt template version or hash. **Never log secrets or raw sensitive prompts.**
8. The AI app-builder ships last.

---

## 19. Localisation and compliance — separate concerns **FROZEN**

### 19.1 Country packs are typed data

A pack exposes **contributions per domain**, not a payroll-shaped blob:

```ts
export const MY: CountryPack = {
  jurisdiction: 'MY',
  payroll:    { rulePacks, statutoryRegistrations, yearEndForms },
  tax:        { rates, withholding, registrationFormats },   // Sales needs this
  banking:    { giroFormats, accountValidation },
  calendar:   { publicHolidays, workweek, timeZone },
  identity:   { nric, ssm, tin },
  retention:  { payrollYears, taxYears, employmentYears },   // §20
  formatting: { address, phone, numbering },
};
```

Modules declare consumption via `countryContributions` in the manifest. Sales takes `tax` and `formatting` without touching `payroll`. A flat bag forces the second module to fork MY tax rules — the documented path by which Odoo's localisation modules became unmaintainable. **This was found by a second-domain scenario while planning the first phase; it cost one interface now and would have cost a fork later.**

Every rule is versioned and effective-dated. Core contains **zero** `if (country === 'MY')`, guard-enforced.

### 19.2 Compliance adapters are connectivity

`packages/compliance/{core,my-myinvois,sg-invoicenow,vn-einvoice,id-coretax,th-etax,ph-eis}/` own protocol mapping, credentials, submission queue, retry and reconciliation, authority status and receipt archival. **They do not own the ledger.**

**Clearance state is a separate record, never a column on a posted document:**

```
compliance_submission
  id · tenant_id · legal_entity_id · document_type · document_id
  adapter · status(pending|submitted|cleared|rejected|amended)
  authority_reference · attempt_count · last_error
  submitted_at · cleared_at · payload_hash · receipt_uri
```

A rejection updates the submission. **It never touches the posted document, and never the ledger.** This is the only formulation that survives the immutability law: if clearance status were a column on the invoice, recording a rejection would update a document the ledger references. A document may have several submissions over its life — original, amendment, resubmission — which also models Indonesia's *Faktur Pengganti* flow, where the buyer must confirm a replacement before it reaches "amended."

> Clearance failure is **normal operation**, not an exception path. The ledger never depends on a synchronous clearance call.

Country-specific laws, thresholds and deadlines are verified from official authorities in each module specification. **This architecture deliberately does not freeze regulatory figures or dates.**

---

## 20. Data lifecycle: retention, erasure, offboarding **STABLE**

No predecessor mentioned retention, deletion, anonymisation or tenant offboarding at all. For a product holding national identity numbers and salaries under PDPA-class regimes, that is a genuine gap.

**Retention periods are a country-pack contribution** (§19.1), never a jurisdiction-free constant. A global purge clock destroys records LHDN still requires — or retains records another jurisdiction requires purged.

**Erasure has an explicit seam.** Personal data is separable into: (a) **statutory records** under retention hold — payroll results, statutory filings, ledger entries — which are **never mutated or deleted**; and (b) **contactable identity** — address, phone, email, emergency contacts, uploaded documents — which is erasable.

> **Erasure never mutates a pinned payroll snapshot.** Complying by editing a snapshot silently changes historical statutory arithmetic and breaks deterministic replay. Erasure of a person under retention hold **pseudonymises the person record and erases category (b)**, leaving statutory records intact and referencing a stable surrogate key. The retention hold expiry is itself effective-dated and per-jurisdiction.

**Every copy is enumerated.** `custom_field_index`, the audit trail, the outbox, search projections, file storage and **pgvector embeddings** all hold copies. Every embedding row carries subject lineage (`subject_type`, `subject_id`) so it can be selectively purged — otherwise the copilot resurfaces erased documents. Purge is an ordered, resumable, audited job with a defined contract, not a cascade delete.

**Tenants have a lifecycle state** — `active | suspended | exporting | purging | purged`. The exit export is assembled from a dedicated export path, **not from policy-filtered read APIs**, which would silently omit whatever the exporting principal cannot see.

**Branch-per-PR and point-in-time restore sit outside RLS, audit and erasure**, while the isolation gate reports green. Restores and database branches must use **de-identified or synthetic data** for any branch reachable by non-production principals, and a restore that reintroduces purged data is a defect with a named owner.

---

## 21. Audit, observability, sensitive data **STABLE**

**Business audit ≠ application logs.** Append-only, for consequential changes: `tenant · principal/agent · action · entity · entity_id · change set · request_id · timestamp · origin · reason where required`. It represents **non-human principals natively** (§9.1).

**Observability:** correlation IDs · structured logs · OpenTelemetry · Sentry · job and outbox visibility · slow-query monitoring · security-event monitoring.

**Sensitive data:** never log secrets · redact HR and payroll fields from ordinary logs · classify via `sensitivity_class` · **authorise bulk export separately from screen reads**, and make privileged reads and exports auditable · encryption at rest, TLS in transit, managed secret storage, rotated credentials.

**Machine-driven paginated reads are bulk reads.** A partner integration paging an entire employee list falls between the per-record audit trail and the bulk-export control unless volume thresholds per principal are monitored and audited.

**Rate limiting exists.** Per tenant and per principal, at the HTTP layer — which is also part of why §6.2 permits only one transport.

---

## 22. Frontend and UX **STABLE**

The UI is a competitive product surface, not a generated admin panel. Roughly 60% of first-year effort.

**UX priorities.** Command/search palette as a first-class navigator — ERP menu trees are where usability dies · dense keyboard-efficient grids with frozen columns, inline edit, saved views, bulk operations and undo where safe · optimistic UI **only where rollback semantics are sound** · intentional mobile layouts · designed empty, error, permission-denied, partial-data and retry states **before** API implementation · accessible focus, keyboard and screen-reader behaviour · semantic tokens before screens proliferate.

**PWA and offline — targeted, not blanket.** Only for workflows with a real field requirement: warehouse scanning, field attendance, delivery confirmation, field sales. Offline mutation uses an explicit outbox and a defined conflict strategy — never "cache everything."

**Performance.** Budgets are per-route and live in configuration; **every route in the CI budget file carries a numeric threshold**, with ≤180KB critical-path JS and LCP <2.5s on throttled 4G as the default for any route that has not ratified its own. Track core route JS, LCP/INP/CLS, grid interaction latency, API latency. Regressions require evidence and an owner.

---

## 23. Agent-driven development operating model **FROZEN**

**Generated state is derived.** `route contracts → OpenAPI → api-client · Query hooks · MSW handlers · fixtures`. Never hand-edited; CI runs `pnpm generate && git diff --exit-code`.

**Feature slicing.** Good: *"Employee emergency contact — UX → contract → mock → UI → command → repository → tests."* Bad: *"Build HRMS."* Every task carries a user outcome, architecture touchpoints, explicit non-goals, acceptance tests and the verification command.

**Hand-specify what cannot be vibe-coded.** Payroll statutory calculation and ledger posting get a written spec, then property tests, *then* implementation against those tests.

### 23.1 Architecture guards

```
UI importing db / repository / Drizzle
module importing a foreign module's repository, schema or private UI
business-module dependency cycle
platform package importing a business module
route contract without a policy declaration                        [D-1]
tenant-owned table missing tenant_id, RLS enabled, or RLS forced
application role that owns tenant tables or holds BYPASSRLS
database access outside a repository / withTenant()
withPlatformAccess called outside apps/admin
update command schema without a version token
effective-dated table missing recorded_at                          [D-12]
effective-dated table missing an overlap-exclusion constraint      [D-11]
rule-pack set with overlapping effective ranges                    [D-11]
new Date() / Date.now() / now()::date inside modules/**            [D-10]
payroll query against a legal-entity-scoped table without binding it [D-5]
country branching inside shared core
generated code modified by hand
route missing operationId
permission code used but not registered, or removed without a tombstone [D-8]
direct mutation of an immutable ledger or payroll-run record
unsafe JS number arithmetic in money code paths
Server Action containing a business mutation
AI tool mapped directly to a repository or database
metadata auto-generating a mutation tool
job-provider SDK imported by a business module
destructive migration violating rollout policy
custom-field promotion to a shared column without an ADR
```

### 23.2 Guards are themselves under review **[D-15, medium]**

A guard can be narrowed by the agent it constrains, and a mutation fixture proves the guard *exists*, never that its predicate still *covers* what it claims.

> Changes to `tooling/architecture/**` are a reviewed category in their own right, called out in the PR template and never bundled with feature work. Each guard's mutation fixture set is versioned alongside it, and weakening a guard's predicate requires the same review as changing a FROZEN section.

> **A guard that has never been observed to reject a deliberate violation is not yet trusted.**

---

## 24. Verification **FROZEN**

### 24.1 The canonical gate

```
pnpm verify
  generate cleanliness → architecture guards → typecheck → format/lint
  → unit → property → contract → RLS/security → integration
  → migration compatibility → build → selected Playwright E2E
  → gate leaves no trace
```

Caching and parallelism are fine. **The meaning of green is singular.** Any rule not represented as a stage here is unenforced by construction.

**The last stage is behavioural, and deliberately so.** Every other stage decides what to check by CLASSIFYING paths, and a classification system can only catch categories it already models. Twice that vocabulary has been incomplete — build directories, then a single generated file — and both times every tool agreed and every tool was wrong, discovered by a red build rather than by a guard. `gate leaves no trace` asks instead whether running the gate CHANGED the repository, which catches the whole class without depending on the vocabulary being complete. It compares the tree against its state when the run began, not against a clean tree: a gate unusable with work in progress is a gate people stop running.

**A stage may not report PENDING once its phase has started.** PENDING means "this phase has not begun"; after it has, the same status would let a mandatory check sit permanently unrun while CI — which tolerates PENDING by design — reported green. This is also what makes qualifying the next phase locally real evidence: raising `XFORGE_PHASE` turns every unbuilt check of that phase red immediately, rather than at merge.

### 24.2 Architecture Qualification Suite

The subset that proves architecture rather than feature behaviour.

```
AQS-001  dependency DAG / module privacy
AQS-002  generated-state cleanliness
AQS-003  OpenAPI compatibility + operationId registry
AQS-004  frontend forbidden-import scan
AQS-005  tenant-table discovery + RLS enabled AND forced coverage
AQS-006  cross-tenant read / write / spoof proof
AQS-007  app-role owner / BYPASSRLS proof
AQS-008  host/session tenant mismatch, including N≥2 memberships     [D-4]
AQS-009  five semantic-registry cross-plane invariants
AQS-010  zero-DDL tenant custom-field proof
AQS-011  optimistic-concurrency stale-write proof
AQS-012  immutable payroll / ledger mutation proof
AQS-013  outbox rollback / crash / duplicate proof
AQS-014  command idempotency proof
AQS-015  money / rounding property suite
AQS-016  payroll deterministic-replay suite
AQS-017  AI excessive-agency / adversarial suite
AQS-018  migration expand/backfill/switch/contract proof
AQS-019  sensitive-file authorisation / expiry proof
AQS-020  second-domain generality proof
AQS-021  policy-coverage proof — every operation declares and enforces [D-1]
AQS-022  driver session-state proof (SET LOCAL survives txn, dies on checkout)
AQS-023  projection freshness / fail-closed proof                     [D-2]
AQS-024  effective-dating: interval convention, non-overlap, recorded_at [D-11,12]
AQS-025  civil-time authority proof                                   [D-10]
AQS-026  period-lock and retro-adjustment proof                       [D-14]
AQS-027  revocation propagation proof                                 [D-7]
AQS-028  retention / erasure / purge-completeness proof               [§20]
```

### 24.3 Blocking gates

**Tenant isolation.** Dynamically enumerate every tenant-scoped table and prove, as the real non-owner role: A cannot read B · cannot update or delete B · inserts cannot spoof B · the app role is not owner/superuser/`BYPASSRLS` · every tenant table has RLS enabled **and forced** · host/session mismatch denied, **including for a multi-membership principal** · `withPlatformAccess` writes an audit row on every call. **Never passes on manual inspection.**

**Payroll.** Official-source golden fixtures · wage-band boundaries · joiner/leaver proration · **mid-month legal-entity transfer** · **60th birthday inside the period** · **service anniversary inside the period** · unpaid leave · variable elements · rounding boundaries · exact gross/deduction/net reconciliation in integer sen · immutability and reversal · idempotent commands · **retro adjustment into a locked period consumed or waived** · and the audit-defensibility property: **recomputing a historical run against its pinned rule-pack *and engine* version reproduces the original payslip exactly.**

**Contract.** OpenAPI 3.1 validity · stable `operationId` · clients and mocks regenerate cleanly · breaking diff blocked unless versioned · boundary hardening · declared idempotency behaviour.

**Flagship E2E.** `sign in → tenant selection → legal entity → employee → payroll inputs → calculate → review → approve → payslip generated → authorised download`, against an isolated database branch.

---

# PART II — VALIDATION EVIDENCE

**These are desk-validated design scenarios, not executed tests.** Each traces end to end through Part I. They become executable as AQS entries and Playwright cases during the phases named in §27; until then they qualify the *design*, not the *implementation*.

## 25. Defect ledger

Twenty-one scenarios across two review rounds produced the following corrections. Each is now a normative rule.

| ID | Scenario | Outcome | Defect class | Fixed in |
|---|---|---|---|---|
| **UC-01** | Two tenants share the employee table | Passed | — | §8.2 |
| **UC-02** | Mid-month transfer between two `Sdn Bhd` entities | **Failed → fixed** | Domain model — silent wrong statutory split and EA form | §8.1, §13.1 |
| **UC-03** | Tenant adds a searchable custom field at scale | **Failed → fixed** | Persistence — reintroduced the problem being solved | §7.3 |
| **UC-04** | Rename or hide a required field | Passed | — | §5 |
| **UC-05** | Build a complete screen before the handler exists | Passed | — | §6 |
| **UC-06** | Module attempts a foreign repository import | Passed | — | §23.1 |
| **UC-07** | Clearance rejection after the ledger posted | **Failed → fixed** | State ownership — collides with immutability | §19.2 |
| **UC-08** | Retro correction across a statutory rate change | Passed + addition | Reproducibility — engine version unpinned | §13.3 |
| **UC-09** | Two HR admins edit the same employee | **Failed → fixed** | Silent data loss | §11 |
| **UC-10** | Admin console must list every tenant | **Failed → fixed** | Missing escape → guarantee erodes under pressure | §8.2 |
| **UC-11** | "Apply 3 days leave for me next week" via the assistant | **Failed → fixed** | Undefined term in a safety rule | §18.1 |
| **UC-12** | Sales module needs Malaysian tax rules | **Failed → fixed** | Coupling — forces a localisation fork | §19.1 |
| **UC-13** | Agent writes a query with no tenant filter | Passed | — | §8.2 |
| **UC-14** | Command shipped with no permission check at all | **Failed → fixed** | **Critical.** Guard is a spelling check, not a presence check | §6.1 |
| **UC-15** | Consultant with memberships in two tenants | **Failed → fixed** | **Critical.** Host/session check is tautological | §8.3 |
| **UC-16** | Retroactive leave into a RELEASED period | **Failed → fixed** | **Critical.** Balance and ledger disagree permanently, silently | §13.4 |
| **UC-17** | Backdated raise entered after CALCULATE | **Failed → fixed** | No transaction time; hash proves unaltered, not current | §10.3 |
| **UC-18** | Rule-pack selection at a rate-change boundary | **Failed → fixed** | No interval convention; selection arbitrary | §10.2 |
| **UC-19** | Month-end job on a UTC runtime | **Failed → fixed** | Wrong period attribution | §10.1 |
| **UC-20** | Dead-lettered projection event during payroll input selection | **Failed → fixed** | Reads fail open; employees silently missing from a run | §7.3 |
| **UC-21** | Departing employee requests erasure under retention hold | **Failed → fixed** | No erasure seam; complying corrupts historical arithmetic | §20 |
| **UC-22** | Zero-downtime column rename with tenants live | **Failed → fixed** | Single-step rename breaks every instance on the previous release | §11 |

Sixteen of twenty-two scenarios exposed a defect. **Ten would have produced silently wrong results rather than errors** — the expensive class. Three (UC-10, UC-12, UC-14) would have caused the architecture to erode under pressure rather than fail outright, which is the class nobody notices until it is gone.

Headline counts are deliberately not used as a credibility claim: two predecessor documents both claimed to have "validated the architecture" and reported different totals. **The corrected sections are the evidence, not the count.**

---

# PART III — KNOWN LIMITATIONS

Stated plainly, because a document that lists only strengths is marketing.

**26.1 Cross-tenant analytics is genuinely awkward.** RLS makes isolation structural and aggregation deliberately hard. `withPlatformAccess` is a controlled escape, not a query engine. Product analytics across tenants will want a separate read model fed by the outbox. Not built in v1 — and **do not improvise it; it is an ADR.**

**26.2 Data residency is a project, not a config flag.** The isolation enum and the extraction trigger are both real and both understate the cost: the launch stack is globally-managed. A customer citing in-country storage rules cannot be served by flipping a column — it requires standing up a regional cell with different providers. The portability rule makes that *possible*, not *cheap*. **Budget a real project, and do not sell residency before one exists.**

**26.3 The metadata renderer will not serve dense workflow screens.** The 80/20 rule is real. Payroll processing, bank reconciliation and month-end close are hand-built permanently. If a customer wants a metadata-configurable payroll processing screen, the answer is no.

**26.4 The modular monolith has a breaking point.** If one module develops radically different scaling or availability requirements — a POS needing offline-first sync and sub-100ms local writes — extraction becomes necessary. The boundaries make it possible, not free. **Do not extract before the trigger.**

**26.5 PWA offline is tolerance, not sync.** Queue-and-retry, not conflict-resolving offline-first. Approvals and simple submissions work offline; editing the same record on two disconnected devices does not. Genuine offline-first is a different architecture and is out of scope.

**26.6 SEA latency from a globally-managed stack.** Edge helps the shell; the database round trip does not disappear. Measure from Kuala Lumpur, Ho Chi Minh City and Jakarta in the spine phase rather than discovering it during payroll.

**26.7 Legal-entity scoping has no structural enforcer.** §8.4 mitigates by convention and one guard, but unlike tenancy there is no database-level backstop. This is the largest residual correctness risk in the design, and it is why the payroll golden fixtures carry legal-entity cases.

---

# PART IV — EVIDENCE REGISTER

External precedent answers *"is this pattern credible in serious production systems?"* Xforge tests answer *"did we implement it correctly here?"* **Both are required.**

**Grades:** **P** production precedent · **S** standard or official guidance · **V** vendor capability · **X** Xforge qualification test. A FROZEN decision should have **P or S, plus X**.

| Decision | External evidence | Grade | Xforge proof | Status |
|---|---|---|---|---|
| Strict modular monolith | Shopify componentised monolith; GitHub large Rails monolith — *precedent that the shape works, not for these boundaries* | P | AQS-001, AQS-020 | FROZEN |
| OpenAPI contract spine | OpenAPI 3.1 specification; GitHub publishes REST as OpenAPI for SDKs | S/P | AQS-002, AQS-003 | FROZEN |
| Pooled tenancy + RLS | PostgreSQL row-security semantics; AWS pooled-SaaS RLS guidance | S | AQS-005..008 | FROZEN |
| Tenant ≠ legal entity ≠ auth org | SaaS partitioning guidance; auth products expose generic orgs, not statutory employers | S | UC-02, payroll fixtures | FROZEN |
| Bounded metadata customisation | Salesforce metadata multitenancy; Frappe DocType; Odoo views — *precedent for productivity, and for the coupling we reject* | P | AQS-009, AQS-010 | FROZEN |
| **Four planes + semantic registry** | **None — this is an Xforge synthesis** reasoned from Frappe's coupling | **X only** | AQS-009 | FROZEN on failure-mode analysis |
| Transactional outbox | AWS and Microsoft architecture guidance | S | AQS-013 | FROZEN |
| At-least-once + idempotency | AWS outbox duplicate warning; Stripe idempotency keys | S/P | AQS-014 | FROZEN |
| Immutable posting | Modern Treasury ledger guarantees; double-entry practice | P | AQS-012 | FROZEN |
| Pure versioned payroll engine | Deterministic effective-dated rule engines are standard audit practice | S | AQS-016 | FROZEN |
| Least-privilege AI | OWASP LLM06 Excessive Agency | S | AQS-017 | FROZEN |
| Staged online migration | Stripe online migrations at scale | P | AQS-018 | FROZEN |
| Branch-per-PR database | Neon branching | V | AQS-018, AQS-022 | STABLE / provider REVERSIBLE |
| Custom tenant domains | Vercel for Platforms | V | AQS-008 | STABLE / provider REVERSIBLE |
| Open-code UI primitives | shadcn on Base UI (verified, §C.1) | V | design-system and a11y tests | REVERSIBLE |
| Auth behind a facade | Better Auth organisation and agent-auth plugins | V | business topology stays outside the provider | STABLE / provider REVERSIBLE |
| Durable executor behind the outbox | Trigger.dev idempotency — *capability, not the source of durable intent* | V | AQS-013 | REVERSIBLE |

**Evidence confidence order:** database and standards semantics → independent architecture guidance → large production precedent → provider capability documentation → **Xforge qualification tests**. The last step is mandatory.

> **Do not cite vendor scale claims as proof of Xforge correctness.** Every entry must carry a URL, version and retrieval date in `.architecture/evidence-register.md`; entries that cannot are marked unverified.

---

# PART V — BUILD AND QUALIFICATION SEQUENCE

Phases are **referred to by name** in all prose, so cross-references survive renumbering.

| # | Phase | Exit criterion |
|---|---|---|
| 0 | **Spine** | One vertical slice travels UX → contract → mock → UI → handler → repository → DB → Playwright. **Five guards deliberately violated and observed to fail.** Driver session-state test (AQS-022) green |
| 1 | **Tenancy, identity, policy** | **FIRST move the existing vertical slice onto the real tenant-scoped PostgreSQL path, THEN attack that same slice.** Proving isolation on a path the application does not use is weak evidence. Then: automated proof that tenant A cannot read or mutate tenant B across every tenant-owned table, enumerated dynamically; host/session mismatch denied including for a multi-membership principal; `withPlatformAccess` audit evidence asserted; every tenancy guard mutation-tested |
| 2 | **Design system** | A representative screen built entirely from system primitives, no bespoke CSS, keyboard-only usable |
| 3 | **Bounded metadata** | Label change → no DDL · custom field → zero core DDL · hidden required field → contract still required · policy-denied field not re-enabled by metadata · overlay conflict deterministic · high-integrity entity refused generic storage |
| 4 | **HR core** | Onboarding, transfer, effective-dated manager change, leave → approval → balance, privileged compensation read, stale concurrent edit rejected, **revoked principal denied on the next request** |
| 5 | **Malaysia payroll** | Golden fixtures green · deterministic replay exact · immutability and reversal · **retro adjustment consumed or waived** · full cycle through the UI |
| 6 | **Async and integration** | Six failure injections: rollback leaves no intent · executor down leaves intent recoverable · duplicate delivery idempotent · crash after side effect does not duplicate · poison message visible · ordering strategy demonstrated |
| 7 | **AI copilot** | Adversarial suite: cross-tenant prompt · approval-bypass prompt · undeclared consequential tool · low-confidence extraction · missing permission · prompt injection to an unrelated tool |
| 8 | **Tenant domain and operations** | Host/session mismatch · unverified domain · duplicate webhook · revoked credential · signed-URL expiry · rate limits |
| 9 | **Second domain proves generality** | **HR-specific assumptions found and deleted from platform packages.** No general-platform claim before this |
| 10 | **Second country / enterprise isolation** | Second country pack and, if a real deal requires it, the dedicated tier proving identical module code |

The tenancy phase's gate is specified before its implementation, in `.architecture/phase-1-attack-matrix.md` — sixteen cases plus the two mutations that decide whether the suite is testing RLS or merely testing that the application remembered its `WHERE` clause.

**The tenancy and payroll phases carry the blocking gates.** Neither passes on manual inspection. The spine through metadata phases are the highest-risk work: if the kernel is wrong, everything downstream inherits it.

> **Generalise on the second real use case, not from imagination.**

---

## 27. Extraction triggers

Not "because enterprise." Each response is an **extraction, not a rewrite**.

| Measured pain | Response |
|---|---|
| API independently saturates the web deployment | Mount the same composition in `apps/api` |
| Job throughput or visibility demands control | Dedicated worker runtime |
| Tenant requires residency or hard isolation | Dedicated database tier — **read §26.2 first** |
| Postgres search misses a UX SLO | Introduce a search service |
| Hot configuration lookup becomes a DB bottleneck | Introduce cache/KV |
| Outbox volume warrants a streaming backbone | Managed bus, bridged from the outbox |
| Cross-tenant analytics outgrows `withPlatformAccess` | Outbox-fed read model, by ADR |

**Portability rule.** Domain code imports no hosting-provider SDK · schema stays provider-portable · storage is S3-compatible · auth behind a facade · jobs behind the outbox and an internal interface · the domain provider behind an adapter · the core stack runs locally under Docker Compose. *Portability is an architecture property, not a v1 on-prem promise.*

---

## 28. Explicitly rejected

Microservices or Kubernetes at launch · GraphQL as the principal API · tRPC as public contract · Server Actions as business API · RSC importing repositories · **in-process business query facade in v1** · **any operation mounted without a policy declaration** · one mega metadata object generating all planes · EAV for real business entities · **`GENERATED`-column promotion of tenant custom fields** · JSONB storage for ledgers, payroll or statutory records · routine per-tenant DDL · schema-per-tenant tier · per-tenant DB as default · arbitrary tenant server-side JavaScript · XML/XPath view inheritance · generic `BaseService<T>` · ORM hiding SQL semantics · event sourcing everything · Kafka, Redis or Elasticsearch before measured need · Prisma · MySQL · country conditionals in core · mutable posted records · JS float for monetary truth · **silent last-write-wins** · **destructive one-step production migrations** · **closed-closed or undeclared effective-dated intervals** · **civil dates from the runtime clock** · automatic metadata exposure of consequential AI tools · **AI holding a database connection**.

---

## 29. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Tenant data leakage | **Critical** | RLS forced, non-owner role, transaction-local context, two audited chokepoints, bound tenant per request, enumerated CI proof |
| Operation shipped with no authorisation | **Critical** | Mandatory policy declaration; refuse-to-mount; AQS-021 |
| Payroll miscalculation | **Critical** | Pure engine, closed-value snapshots, official golden fixtures, deterministic replay, period lock |
| Future ledger error | **Critical** | Invariants hand-specified before implementation; property and reconciliation tests |
| AI exceeds authority | **Critical** | Bounded generation, defined "consequential", risk classes, policy, RLS, draft default, audit |
| Legal-entity scope omitted | **High** | Required parameters, organisation helpers, guard, golden fixtures — **no structural backstop (§26.7)** |
| Retro input lost between modules | **High** | Period lock, pending retro adjustments, unmet-finding gate |
| Silent data loss on concurrent edit | **High** | `version` token, `409`, guard on update schemas |
| Effective-dating ambiguity | **High** | Half-open intervals, exclusion constraints, `recorded_at`, civil-time authority |
| Projection drift serving short results | **High** | `source_version`, watermark, fail-closed reads, canonical re-resolution for consequential sets |
| Architecture drift over long agent sessions | **High** | Guards, guard-mutation fixtures, reviewed guard changes, ADRs, small slices, one `pnpm verify` |
| Metadata becomes another Odoo | **High** | Four planes, one-entity rule, 80/20 rule, escape hatches, generalise only at the second-domain gate |
| Retention or erasure handled wrongly | **High** | Country-pack retention, erasure seam, enumerated copies, purge contract |
| Scope explosion | **High** | MY HR/payroll wedge, blocking gates, second-domain rule |
| Compliance and statutory change | Medium | Effective-dated rules, versioned adapters, authority source tracking, async clearance |
| Custom-field query performance | Medium | Three rungs, three-filter limit, observability, product-level promotion by ADR |
| Vendor lock-in | Medium | Facades, Postgres/S3 portability, outbox, no provider SDK in the domain |

---

## 30. Change control

An ADR is required to change: a dependency direction · source-of-truth ownership · API compatibility strategy · the tenancy or security boundary · the persistence model · a runtime or deployment boundary · a module contract · the money or integrity model · metadata authority · async delivery semantics · the AI authority boundary · the effective-dating or time model · the retention model.

An ADR contains `context · decision · alternatives · consequences · migration/rollback · verification`.

**An ADR number, once issued, is never reused for a different decision.**

```
ADR-001  Modular monolith over service-per-domain
ADR-002  Contract-first Hono + OpenAPI; domain independent of transport
ADR-003  Shared-schema RLS tenancy; two chokepoints; no schema-per-tenant tier
ADR-004  Four architecture planes + semantic registry
ADR-005  Custom-field three-rung ladder and projection index
ADR-006  Money: numeric storage, integer minor units in payroll, scale as data
ADR-007  Transactional outbox + replaceable durable executor
ADR-008  Localisation packs with typed per-domain contributions; compliance separate
ADR-009  Person / employee / employment; payroll scopes to legal entity
ADR-010  All authorisation in packages/policy; Better Auth for identity only
ADR-011  Bounded AI tool generation; the definition of consequential
ADR-012  One business transport; conditions for a gated read facade
ADR-013  Optimistic concurrency on mutable documents
ADR-014  Mandatory policy declaration on every route contract
ADR-015  Bound tenant per request; multi-membership selection
ADR-016  Time model: civil-time authority, half-open intervals, transaction time
ADR-017  Payroll period lock and retro-adjustment protocol
ADR-018  Machine principals; credential revocation model
ADR-019  Permission-code lifecycle and fail-closed policy compilation
ADR-020  Data retention, erasure and tenant offboarding
ADR-021  Production migration compatibility policy
ADR-022  Verified tenant context; host selects, membership authorises
ADR-023  Membership resolution before a tenant context exists
```

**Reopen a FROZEN decision only** on a failing qualification test, measured production evidence, a real second-domain contradiction, a regulatory or security requirement, or a provider limitation crossing an architectural boundary. **Preference, novelty and framework fashion are not sufficient.**

After adoption, **stop writing competing canonical drafts.**

---

## 31. Adoption checklist

- [ ] This document adopted as `.architecture/architecture-final.md`; all thirteen predecessors moved to `.architecture/history/`
- [ ] `CLAUDE.md` contains only §2's laws plus the two pointers
- [ ] `.architecture/adr/` exists; ADR-001..020 written before code
- [ ] `.architecture/evidence-register.md` created with URLs, versions and retrieval dates
- [ ] `pnpm verify` defined and green on an empty repository
- [ ] The spine phase is scoped as a vertical slice, not a framework-building project
- [ ] No code generated from metadata before the four-plane ownership rules are encoded
- [ ] Tenant/RLS proof wired as a blocking gate before the design-system phase begins
- [ ] Versions pinned in manifests, never duplicated in architecture prose
- [ ] The twenty-two UC scenarios entered as AQS entries and Playwright cases, not left as prose

---

## 32. Open items

| Item | By | Note |
|---|---|---|
| Neon MCP auth failing (HTTP 401) | **Before Phase 1 PR qualification**, not before Phase 1 implementation | Refresh the token or provision Postgres via the Vercel Marketplace. Blocks branch-per-PR and preview-database qualification. Does **not** block RLS, `withTenant`, policy or membership correctness — those are proven against a local PostgreSQL with real roles and FORCE RLS. Neon is a provider choice, never the tenancy model, and a vendor credential must not stop architecture work |
| Branch protection not active | **Before Phase 1 merges to main** | Phase 1 may be developed locally. It is where the isolation proof lands, and that proof most needs to have executed somewhere other than the machine that wrote it |
| Vercel CLI not installed | Spine phase start | `npm i -g vercel` |
| Durable executor: Trigger.dev vs Inngest | Spine phase end | Reversible — the outbox is the durable record either way |
| SEA latency baseline | Spine phase | Measure from KL, HCMC, Jakarta. Informs §26.6 |
| Postgres driver session-state behaviour | Spine phase | AQS-022 replaces an unverified vendor claim with a test |
| Vietnam / Indonesia residency law | Before any residency commitment | Named in predecessors but unverified. Obtain legal advice; do not sell on §26.2 |
| Launch jurisdiction re-confirmation | Spine phase | Malaysia is locked and defensible. Predecessors argued for a re-check "given the team is Vietnam-based" — **that premise is unevidenced (§C.1)**. Confirm it before treating it as an input |

*Resolved and removed:* Base UI component gaps (Context Menu, Hover Card and Toast all ship — §C.1); Better Auth ownership and licensing (verified); shadcn primitive default (verified).

Anything not listed here is settled. An agent with a question consults `.architecture/adr/` rather than re-deciding.

---

## 33. Conclusion

```
Frontend-led discovery
       ↓
Typed API contract + policy declaration     ← authority
       ↓
Generated client + mocks                    ← highest-leverage decision here
       ↓
Explicit application/domain logic
       ↓
Relational PostgreSQL truth

Metadata      → bounded composition; never owns persistence
Policy        → one system; declared per operation; fails closed
Time          → civil-time authority; half-open; valid time ≠ transaction time
Localisation  → versioned packs with typed per-domain contributions
Compliance    → separate async adapters; never coupled to the ledger
Events        → transactional outbox, at-least-once, idempotent consumers
AI            → authorised tools; consequential ones authored, not generated
Lifecycle     → retention by jurisdiction; erasure never rewrites history
```

Xforge should not win by being the most abstract ERP framework. It should win by being **easier to understand, safer to change, faster to build, better to use, and harder to corrupt.**

The differentiator is not a framework. It is a **canonical spine plus mechanically enforced boundaries** that lets Claude Code move fast without converting speed into entropy.

> **Xforge should feel configurable like ERPNext, modular like Odoo, contract-driven like a modern SaaS platform, and maintainable like a deliberately boring TypeScript codebase.**

> **Simple enough to reason about. Strict enough to trust. Extensible enough to grow.**

Twenty-two scenarios found sixteen defects, ten of which would have failed silently. They were found on paper rather than in production, which is the entire point of the exercise — and the architecture is qualified as a **design**, not yet as an **implementation**. That happens when the Architecture Qualification Suite runs green.

**The next architectural change arrives as an ADR. The next validation scenario arrives as a failing test.**
