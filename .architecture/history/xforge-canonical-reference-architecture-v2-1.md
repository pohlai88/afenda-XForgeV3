# Xforge — Canonical Reference Architecture

**Version:** 2.0 · **Status:** Canonical — proposed for freeze
**Supersedes:** v1.1, v1.2, v1.3 (all three retained in `.architecture/history/` for provenance)
**Target path:** `.architecture/canonical-reference-architecture-v2.md`
**Launch wedge:** Malaysia · HRMS + Payroll · Cloud SaaS
**Long-term scope:** multi-purpose business platform across Southeast Asia

---

## Freeze policy

This is the first version intended to be **stable rather than exploratory**. Every section below carries a status:

| Marker | Meaning |
|---|---|
| **FROZEN** | Changing this requires a superseding ADR and a version bump. Agents must not re-litigate it. |
| **STABLE** | Settled, but expected to gain detail as modules ship. Extend freely; do not reverse without discussion. |
| **OPEN** | Genuinely undecided. Listed in §22 with an owner and a decision deadline. |

The purpose of the marker is operational, not ceremonial: a Claude Code session that encounters a FROZEN section should treat it as a constraint, not an option. Architecture drift over long agent sessions is the highest-probability failure mode in this project, and the freeze marker is the cheapest defence against it.

---

## 0. What changed from v1 — the eight resolutions

The three v1 documents agreed on roughly 85% of the architecture. This section records only where they diverged and what v2 decides. Nothing else in this document should be read as new.

### 0.1 The Experience→domain shortcut is now forbidden by default — **v1.3 wins**

v1.2 permitted React Server Components to call a generated read-only server query facade keyed to `operationId`. v1.3 rejected the escape hatch outright. v1.1 sat between them, allowing a "contract-bound server transport."

**v1.3's argument decides it:** a second path to the same data does not merely risk drift, it **breaks the mock-first development flow** — the single highest-leverage decision in the whole architecture. If some reads bypass the generated client, then some screens cannot be built against MSW mocks, and the frontend-before-backend property is lost precisely on the screens that matter most.

**Resolution:** the browser and the server-rendered shell both go through the generated API client. The exception survives only in v1.1's constrained shape, and it is ADR-gated:

> A contract-bound server transport may be introduced for a **measured** hot read path. It must invoke the same application handler, be keyed to a live `operationId`, be read-only, be accompanied by an ADR with a named benchmark and a threshold, and be covered by the same contract tests. Absent all five, it is a fitness-function failure.

### 0.2 AI tool generation is now bounded — **v1.1 wins, and this is a safety correction**

v1.2 and v1.3 both said "the tool catalogue is generated from metadata, not hand-maintained." v1.1 §18.2 bounded it. **v1.1 is right and the other two were quietly dangerous.**

An entity existing is not consent for an agent to mutate it. Auto-exposing `approve_payroll_run` because `payroll_run` is a declared entity is the exact class of failure this architecture exists to prevent.

**Resolution:** metadata may generate only low-consequence tool descriptors — `read`, `list`, `search`, `draft_create`. Every consequential action is an **explicitly authored tool bound to an application command**, reviewed like any other code:

```
generated automatically   read_employee · list_leave_requests · search_payslips · draft_claim
authored explicitly       approve_payroll_run · post_journal_entry · release_bank_file
                          submit_einvoice · post_stock_transfer · terminate_employment
```

### 0.3 Authorization is one system, not two — **v1.3 wins**

v1.1 §12.1 proposed using Better Auth's dynamic access control for tenant-defined roles alongside an Xforge policy engine. That is two authoritative locations for the same fact, which is the failure v1.1's own doctrine (§2.2) forbids.

**Resolution:** **all** authorization lives in `packages/policy`. Better Auth owns authentication, session, and membership — nothing else. Tenants still define their own roles; those roles are rows in Xforge tables.

### 0.4 The semantic registry is promoted to a first-class concept — **v1.1 wins**

v1.2 and v1.3 described four planes but named nothing that joins them. Without an explicit join point, the planes silently re-fuse: someone adds a field to the entity definition, and it grows a column, a route, a form widget, and a permission because there was no named boundary saying it must not.

**Resolution:** adopt v1.1 §7.5. The **semantic registry** holds only the facts genuinely shared across planes and is explicitly forbidden from migrating them (§3.5).

### 0.5 Localisation packs and compliance adapters stay separate — **v1.1 wins**

v1.3 folded e-invoicing into `packages/localisation/my/`. v1.1 §19.1 split them.

**Resolution:** v1.1. A country rule pack is **effective-dated data** (rates, bands, holidays, formats) with a versioning lifecycle. A compliance adapter is **external connectivity** (protocol, credentials, submission queue, retry, authority status) with an availability lifecycle. Different failure modes, different test strategies, different on-call implications. Merging them means a MyInvois outage looks like a payroll rules problem.

### 0.6 Design system precedes the metadata engine — **v1.3's ordering wins**

v1.1 combined them into one phase; v1.2 put metadata first.

**Resolution:** a form renderer needs a component vocabulary to render *into*. Building the metadata engine first means inventing the component layer implicitly and badly. Design system is Phase 2, metadata kernel is Phase 3, and they are separate phases because combined they are too large for one gate.

### 0.7 Money representation — synthesis, all three were partially right

**Resolution:**

- **Storage:** PostgreSQL `numeric(p,s)` with explicit scale per semantic type. FX rates, unit costs, and allocation ratios need more precision than currency minor units.
- **Payroll engine internals:** integer minor units (sen). Statutory rounding happens at defined steps; integer arithmetic makes those steps deterministic and exactly testable.
- **Boundary:** conversion between the two is one explicit, tested function.
- **Everywhere:** IEEE-754 floating point is banned from financial truth, without exception.

### 0.8 Two post-cutoff claims — now verified, no longer open

v1.3 correctly flagged both as unverified rather than inheriting them. Both have been checked:

- **shadcn defaults to Base UI.** Confirmed — as of July 2026, `shadcn init` scaffolds on Base UI for new projects; Radix remains fully supported and is one flag away. For Xforge specifically the argument is stronger than "it's the default": Base UI ships **Combobox, Autocomplete, and Number Field**, which are the three primitives an HR/payroll product uses most. Caveat now tracked: Base UI lacks Context Menu, Hover Card, and Toast — confirm none is on the Phase 2 critical path.
- **Better Auth ownership.** Confirmed — Vercel acquired Better Auth on 7 July 2026. The library stays MIT-licensed, keeps its name, and remains framework-agnostic with the original team continuing development. No architectural consequence; the `packages/auth` facade stays thin regardless, which was already the plan.

---

## 1. Locked decisions **FROZEN**

| Decision | Choice |
|---|---|
| Product model | Cloud SaaS only in v1; portability is an architecture property, not a v1 promise |
| Development model | Claude Code / agent-driven feature slices |
| Language | TypeScript, strict, end-to-end |
| System shape | Strict modular monolith |
| First vertical | HRMS + Payroll |
| Launch jurisdiction | Malaysia |
| Long-term market | MY, SG, VN, ID, TH, PH |
| API | REST + OpenAPI 3.1, first-class and externally consumable |
| Delivery sequence | Frontend-led, contract-before-handler |
| Database | PostgreSQL; Neon at launch |
| Tenant isolation | Shared schema + `tenant_id` + RLS; dedicated tier later, same contracts |
| Tenant URL | Platform subdomain default; custom domain on eligible tiers |
| Metadata | First-class but bounded; not the owner of all planes |
| Custom fields | JSONB + registry; promoted only on measured need |
| Core business data | Real relational tables, constraints, indexes |
| AI | Platform layer using authorised application tools; never privileged DB access |
| AI writes | Draft/proposal by default for consequential actions |
| AI channels | In-app first; WhatsApp later |
| Localisation | Versioned country packs, separate from compliance adapters |
| Infrastructure | Managed and deliberately boring |

**Scope rule, and it governs everything below:**

> Build the kernel **module-agnostic and country-pack-shaped from day one**, while shipping exactly **one module (HR/Payroll)** and **one country pack (MY)**.

ERP modules and additional jurisdictions then slot in without re-architecture. This is the reconciliation between v1.1/v1.2's SEA-wide ERP ambition and v1.3's narrow launch: the architecture is wide, the delivery is narrow, and the seam between them is the module manifest and the country pack.

---

## 2. Thesis and doctrine **FROZEN**

> **Explicit core. Metadata at the edges. Contract in the middle.**

Not *everything is metadata*. Not *everything is a microservice*. Not *everything is configurable*. Not *everything is AI*.

```
business truth              → explicit code + relational data
external interface          → explicit API contract
repeatable UI structure     → metadata
tenant variation            → deterministic overlays
country variation           → versioned localisation packs
authority connectivity      → compliance adapters
async work                  → transactional outbox + durable jobs
integration                 → events + APIs
AI                          → authorised application tools
```

### 2.1 The vibe-coding constraint

The platform is designed so an AI coding agent stays reliable across a large repository. Therefore prefer popular and well-documented technology, high static type density, explicit code over metaprogramming, small modules over framework bases, deterministic generation, deterministic architecture tests, short dependency paths, one canonical location per concern, and small end-to-end feature slices.

> **Verbose-but-obvious beats terse-but-magical.**

An abstraction whose main benefit is saving lines while raising inference cost is a net negative here.

### 2.2 DRY means one source of truth **per fact**

Not "one mega definition generates the platform." That is ERPNext's actual long-term problem, not merely its `ALTER TABLE` problem.

| Fact | Authority |
|---|---|
| API operation shape | typed route contract → OpenAPI |
| Persistent column, index, constraint | Drizzle / PostgreSQL schema |
| Business invariant | domain / application code |
| Generic field semantic | semantic registry |
| Form composition | experience metadata, or hand-written UI |
| Role / action permission | policy registry |
| Tenant custom field | metadata registry row |
| Statutory rate | effective-dated country rule pack |
| Authority protocol mapping | compliance adapter |
| Generated client | generated from OpenAPI; never hand-edited |

### 2.3 KISS as an infrastructure budget

One language, one primary database, one principal deployment, one API style, one auth facade, one durable-job mechanism, one observability convention, one canonical verification command.

**A new infrastructure dependency requires a named, measured pain.** Not "because enterprise," not "because scale." See §18 for the trigger table that makes this concrete.

### 2.4 API-first and frontend-led are not in tension

**API-first defines architectural authority. Frontend-led defines development order.** Reconciled in §6.

---

## 3. The four planes and the semantic registry **FROZEN**

This is the central architectural model and the resolution of the largest v1 conflict.

### 3.1 Data plane

Authority for relational storage, constraints, indexes, foreign keys, RLS policies, immutable ledger tables, and migration history. Technology: PostgreSQL + Drizzle.

### 3.2 Contract plane

Authority for REST operations, request/response envelopes, error shapes, pagination, idempotency semantics, external compatibility, versioning and deprecation. Technology: typed Hono route contracts → OpenAPI 3.1.

### 3.3 Experience plane

Authority for field presentation, section ordering, form and list composition, visibility, labels, saved views, dashboard composition, commands, tenant theme, user preferences. Technology: metadata overlays + explicit React escape hatches.

### 3.4 Policy plane

Authority for permissions, scopes, workflow transitions, approval requirements, field and row access, and AI action policy. Technology: `packages/policy` + application checks + PostgreSQL RLS for the tenant boundary.

### 3.5 The semantic registry — the join, not the owner

Holds only what is genuinely shared:

```
entity id · field id · semantic type · reference target · label key
searchability hint · sensitivity classification · AI description
customisation capability
```

It may generate safe repetitive artifacts. It **must not silently migrate all four planes**. Three laws, each mechanically enforced:

- Changing `labelKey` must never alter a database column.
- Changing UI visibility must never relax API validation.
- Changing a custom field must never bypass policy.

**Generation is one-directional and gated.** An entity definition *proposes* a migration; a human reviews and applies it. Nothing silently reshapes storage.

> **Law:** the Experience plane may never weaken the Contract plane. If the API requires `customer_id`, tenant form metadata saying `required: false` changes the form only. The server contract is authoritative.

---

## 4. System shape **FROZEN**

```
                        ┌──────────────────────────┐
                        │        XFORGE WEB        │
                        │ Next.js · React · shadcn │
                        │ hand-built UX + renderer │
                        └────────────┬─────────────┘
                                     │ generated API client only
                        ┌────────────▼─────────────┐
                        │   OpenAPI 3.1 contract   │
                        └────────────┬─────────────┘
                        ┌────────────▼─────────────┐
                        │   HONO — thin adapters   │
                        └────────────┬─────────────┘
              ┌──────────────────────▼──────────────────────┐
              │          APPLICATION / DOMAIN               │
              │  command → policy → domain rule → repo      │
              │  hr · payroll  (→ crm · sales · inventory)  │
              └──────────┬──────────────────────┬───────────┘
                         ▼                      ▼
                    PostgreSQL              outbox → Trigger.dev
                    RLS · JSONB                        │
                    FTS · pgvector                     ▼
                                          integrations · webhooks
                                          statutory authority APIs

  PLATFORM KERNEL (must not know Payroll exists)
  identity · tenancy · organization · policy · metadata · workflow · audit
  files · events · jobs · notifications · integration · localisation
  compliance · AI
```

### 4.1 Modular-monolith rule

Modules behave as if they *could* become services later, without paying the operational cost today. A module may communicate through another module's public application interface, through domain events, or through stable platform capabilities. It may **not** import another module's repository, Drizzle table internals, or private UI.

### 4.2 Module anatomy **STABLE** — from v1.1 §9

```
modules/payroll/
  manifest.ts
  contract/        routes.ts — typed route contracts
  application/     commands/ · queries/
  domain/          model/ · rules/ · services/
  infrastructure/  repository/
  metadata/        entities/ · forms/ · lists/ · workflows/ · reports/
  ui/              features/ · screens/ · components/
  events/
  tests/           contract/ · domain/ · integration/ · e2e/
```

`manifest.ts` declares: `id`, `version`, `dependencies`, `optionalIntegrations`, `permissions`, `navigation`, `entities`, `events`, `workflows`, `countryExtensions`, `featureFlags`.

Dependency examples: `payroll → hr + policy + localisation`; `sales → contacts + catalog`; `accounting consumes posted business events`, never the Sales repository.

### 4.3 Repository shape **STABLE**

```
xforge/
├─ apps/          web · admin · docs        (deployable compositions)
├─ modules/       hr · payroll  → later: contacts · crm · catalog · sales
│                 purchasing · inventory · accounting · projects · pos
├─ packages/      api · api-client[GEN] · auth · db · tenancy · organization
│                 policy · metadata · metadata-ui · workflow · audit · events
│                 jobs · files · notifications · integration · localisation
│                 compliance · ai · ui · tokens · money · testing
├─ contracts/     openapi/  — generated canonical artefact + snapshots
├─ tooling/       generators/ · architecture/ · scripts/
├─ docs/          architecture/ · adr/
└─ CLAUDE.md
```

```
apps      = deployable compositions
modules   = business capabilities
packages  = reusable platform capabilities
contracts = externally visible generated artefacts
```

### 4.4 The kernel invariant

> **The platform kernel must not know that Payroll, Sales or Inventory exists.**

Business modules depend on platform capabilities. Platform capabilities never import business modules. Enforced by a fitness function (§15.2).

---

## 5. Canonical stack **STABLE**

### Foundation

TypeScript strict · Node.js 24 LTS · pnpm 11 · Turborepo · Biome (plus targeted architecture ESLint rules only where Biome cannot express them) · Docker Compose compatibility for local development.

### Frontend — the priority surface (~60% of first-year effort)

| Concern | Choice | Reason |
|---|---|---|
| Framework | Next.js 16 App Router, React 19, Turbopack | Deepest training data — a technical requirement when an agent writes the code |
| Components | shadcn/ui on **Base UI** | Open-code, editable in-repo; Base UI ships Combobox, Autocomplete, Number Field (§0.8) |
| Styling | Tailwind CSS v4 | Token-first; tenant theming is a variable swap |
| Tokens | CSS variables + OKLCH semantic tokens | Defined before the first screen |
| Grid | TanStack Table + virtualization | ERP is 80% grids; the most-noticed daily difference vs incumbents |
| Server state | TanStack Query v5 | Hooks generated by Orval |
| Forms | React Hook Form + Zod | One schema validates form, API, and DB boundary |
| Mocks | MSW (generated) | Enables frontend-before-backend |
| Stories | Storybook | Frontend-first visual development |
| Palette | cmdk (⌘K) | Primary navigator — ERP menu trees are where usability dies |
| i18n | next-intl | EN, Bahasa Malaysia, 中文 at launch |
| Charts | Recharts | Sufficient default |
| Motion | Motion | Meaningful transitions only |

**UX commitments:** command palette as primary navigation · Excel-grade grid (keyboard nav, frozen columns, inline edit, saved views, bulk edit, undo) · optimistic mutations everywhere · mobile-first installable PWA with IndexedDB outbox, not a separate app · designed loading, empty, permission-denied, partial-data, error and retry states *before* API implementation · CI-enforced performance budget of ≤180KB JS on the critical path and LCP <2.5s on throttled 4G.

### API

Hono mounted at `app/api/[[...route]]/route.ts` · `@hono/zod-openapi` → OpenAPI 3.1 generated from the same Zod schemas that validate at runtime · Orval → typed client + TanStack Query hooks + MSW handlers · Scalar for interactive docs.

**Why Hono over Fastify:** the adapter layer stays minimal, routes are plain functions rather than a DI/decorator graph, it mounts inside the Next.js deployment today, and it lifts out to standalone Node unchanged. **The domain layer must not import Hono** — if an independently scaled API ever justifies Fastify, that is a transport swap, not a rewrite.

### Data and platform

| Concern | Choice | Reason |
|---|---|---|
| Database | PostgreSQL 17, Neon at launch | Branch-per-PR is unusually well matched to agentic development |
| ORM | Drizzle + explicit SQL | SQL-shaped, no second schema language, RLS-aware |
| Isolation | RLS declared via `pgPolicy` in schema | `pgTable.withRLS` denies all rows by default when no policy is attached |
| Search | Postgres FTS + trigram + `unaccent` | Meilisearch only on a measured UX SLO failure |
| Vectors | pgvector, same database | |
| Auth | Better Auth behind `packages/auth` | Identity, session, membership **only** |
| Policy | `packages/policy` | **All** authorization |
| Events | Transactional outbox in Postgres | Atomic with the business transaction; the bridge to Kafka if ever needed |
| Jobs | Trigger.dev behind `packages/jobs` | Task-level idempotency, durable retries, run visibility; self-hostable |
| Files | S3-compatible facade → Cloudflare R2 | Portable; favourable egress economics; payslips private with short-TTL signed URLs |
| Custom domains | Vercel for Platforms now; Cloudflare for SaaS at scale | Mapping lives in our own `tenant_domain` table, so the provider is swappable |
| AI | Vercel AI SDK + gateway, Claude primary | Provider-neutral; per-tenant model routing and cost attribution |
| Email | Resend + React Email | |
| Observability | OpenTelemetry + Sentry + PostHog | Plus an immutable in-DB audit trail |
| Quality | Vitest · fast-check · Testcontainers · Playwright · Biome | These *are* the guardrails for vibe coding |

---

## 6. Development flow **FROZEN**

**API-first is architectural authority. Frontend-led is development order.**

```
UX intent
   ↓  screens, states, actions, validation, empty/error/loading designed first
typed route contract  (Zod)
   ↓
OpenAPI 3.1
   ↓  pnpm generate
typed client + TanStack Query hooks + MSW mocks
   ↓
COMPLETE FRONTEND AGAINST MOCKS       ← no database, no backend, no infrastructure
   ↓
application command / query
   ↓
domain rule → repository → PostgreSQL
   ↓
contract + integration + E2E verification
```

The frontend never waits for infrastructure, and never invents an unofficial data path.

### 6.1 No privileged frontend path

Browser business operations use the generated API client. Server Actions are **not** a second business API. React Server Components handle shell composition, session bootstrap, route metadata, and low-volatility presentation data — not business reads. The single narrow exception and its five conditions are in §0.1.

**Forbidden:**

```
React UI → Drizzle
React UI → repository
React UI → foreign module internals
Server Action → hidden business mutation
```

### 6.2 State transitions are commands, not patches

```
POST /payroll-runs/{id}/calculate        not   PATCH { status: 'calculated' }
POST /payroll-runs/{id}/approve
POST /leave-requests/{id}/approve
POST /journal-entries/{id}/post
POST /stock-transfers/{id}/post
```

The command expresses a business transition and gives invariants one place to live. The patch bypasses business semantics entirely.

---

## 7. Multi-tenancy and organisation **FROZEN**

### 7.1 Tenant ≠ legal entity ≠ organisation ≠ auth organisation

This was v1.3's standout correction and it is a **launch blocker, not a subtlety**.

```
USER ──membership──► TENANT
                       ├── Legal Entity (Sdn Bhd A) ── own EPF, SOCSO, LHDN E-number
                       ├── Legal Entity (Sdn Bhd B) ── own registrations, own EA forms
                       └── Business units → branches · sites · warehouses · departments
```

A Malaysian group with three `Sdn Bhd` entities is **one tenant with three legal entities**. Each has its own EPF employer number, its own SOCSO employer code, its own LHDN E-number, and files its own Borang EA. **Payroll runs scope to `legal_entity`, never to `tenant`.** Statutory employer registrations live on `legal_entity`.

Modelling tenant = organization = employer makes correct Malaysian payroll impossible without a rewrite. This must be right in Phase 1, before any employee row exists.

### 7.2 RLS is structural, not conventional

```sql
ALTER TABLE employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employee
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

**Four details decide whether this works or is theatre:**

1. **Never connect as the table owner.** RLS silently skips owners and superusers. Use a dedicated `app_user` role without `BYPASSRLS`, with `FORCE ROW LEVEL SECURITY` as the second line.
2. **`SET LOCAL`, never `SET`.** Tenant context must be transaction-scoped. Under a connection pool a session-scoped variable leaks to whichever tenant borrows that connection next.
3. **Neon's HTTP driver cannot hold session state across statements.** Use the pooled WebSocket driver for anything RLS-scoped.
4. **One chokepoint.** `withTenant(tenantId, fn)` is the only sanctioned way to obtain a database handle. No package opens a connection around it — one thing to audit, one thing to test.

Every tenant-owned table carries a non-null `tenant_id`. Indexes are tenant-leading: `UNIQUE (tenant_id, code)`, `INDEX (tenant_id, status)`, `INDEX (tenant_id, created_at)`. Business identifiers are unique **per tenant**, never globally, unless a genuine platform requirement demands otherwise.

### 7.3 Isolation tiers

The tenant row carries `isolation: 'pooled' | 'regional_pooled' | 'dedicated'`. A connection/tenant resolver reads it; **all other application code is identical.** An enterprise or data-residency deal gets its own database without a code fork. Do not build the dedicated tier before a contract, a residency requirement, or measured scale justifies it.

### 7.4 Tenant domains

```
app.xforge.com        platform
acme.xforge.app       subdomain — wildcard DNS + TLS, instant on signup
hr.acme.com.my        custom domain — paid tier, DNS-verified, automatic TLS
```

```
tenant_domain(id, tenant_id, hostname, type, verification_status, is_primary, created_at, verified_at)
```

```
Host header → domain resolver (Edge Config, ~1ms) → candidate tenant context
            → authenticated membership validation → request tenant context
```

> **The hostname resolves a *candidate* tenant. It never authorises.** The API re-derives the tenant from the session and asserts it matches the host. A valid session for tenant A presented at tenant B's hostname is rejected. Any `x-tenant-id` header is a routing hint, never an authorisation claim.

Launch provider is Vercel for Platforms, behind a provider interface so Cloudflare for SaaS can be adopted later on economics or scale.

---

## 8. Authorization **FROZEN**

Three separate layers, never collapsed, and only one of them is ours to get wrong:

| Layer | Mechanism | Fails safe? |
|---|---|---|
| Authentication | Better Auth (facade) | — |
| Tenant isolation | PostgreSQL RLS | **Yes** — structural, cannot be forgotten |
| Business authorization | `packages/policy` | Compiled to SQL predicates + response filters |

Permission codes are explicit and registered:

```
hr.employee.read · hr.employee.update · hr.compensation.read
payroll.run.calculate · payroll.run.review · payroll.run.approve
sales.order.submit · inventory.transfer.post
```

Scopes: `tenant | legal_entity | business_unit | department | location | team | own`.

```
permission: payroll.run.approve
scope:      legal_entity = MY01
```

RBAC plus scoped ABAC, without installing a relationship-authorization platform before it is needed. Tenants define their own roles as rows in Xforge tables — **not** in the auth library (§0.3). A permission code used but not registered in a module manifest is a fitness-function failure.

---

## 9. Metadata and customisation **STABLE**

### 9.1 Storage tiers

| Tier | What | Storage | Migration cost |
|---|---|---|---|
| 1 | Core product fields | Real typed columns | Normal reviewed migration |
| 2 | Tenant custom fields | `custom` JSONB + registry row | **Zero DDL** |
| 3 | Tenant custom entities | Generic record table, JSONB payload | **Zero DDL** |

Tier 2 gets a GIN index where justified, with deliberate promotion on measured need:

```sql
ALTER TABLE employee ADD COLUMN cost_centre text
  GENERATED ALWAYS AS (custom->>'cost_centre') STORED;
CREATE INDEX ON employee (tenant_id, cost_centre);
```

A per-tenant **optimisation**, not a per-tenant **schema** — one migration path for every tenant. Promotion is a deliberate workflow, never automatic metadata-driven schema mutation.

**Tier 3 is deliberately second-class and is forbidden for:** accounting ledgers, payroll result ledgers, inventory movements, statutory records, and any other high-integrity transactional core. Those remain first-class relational domain models. No exceptions, no tenant escalation path.

### 9.2 Overlay resolution

```
System definition → Country pack → Tenant configuration → User personalisation
```

The merge must be deterministic, typed, version-aware, conflict-detecting, and inspectable through an **effective-configuration view** — a screen that shows the resolved result and which layer contributed each value. Without that view, debugging a tenant's configuration becomes archaeology.

### 9.3 Stable slots, never XPath

```
core employee form
  slots: identity · employment · compensation · statutory · documents · activity

MY country pack:  insert epf_socso_details into `statutory`
Tenant ABC:       hide cost_centre · rename employee_code → staff_id
```

No DOM selectors. No XPath. No hidden inheritance chain. Claude resolves the final structure deterministically; Odoo cannot.

### 9.4 The two rules that stop this becoming Odoo

> **If exactly one entity needs a metadata capability, hardcode it.** Do not extend the metadata layer for a single caller.

> **Do not metadata-generate every screen.** Metadata handles CRUD forms, lists, filters, saved views, simple dashboards, master data, configuration, and approval states. **Hand-build** payroll processing, month-end close, bank reconciliation, inventory and manufacturing planning, POS, complex quotations, executive workspaces, and the AI workbench.

Escape hatches are first-class: any entity may override its generated form with a hand-written component, and any route may be hand-written. **The generator is a productivity default, not a prison.**

---

## 10. Money, ledgers and integrity **FROZEN**

### 10.1 Money

- **Storage:** `numeric(p,s)` with explicit scale per semantic type. FX rates, unit costs, and allocation ratios need more precision than currency minor units. Every monetary field stores amount + currency + FX rate to base — stored, never recomputed.
- **Payroll engine internals:** integer minor units (sen).
- **Boundary conversion:** one explicit, tested function.
- **Ban:** no IEEE-754 floating point in financial truth, anywhere. Rounding rules are explicit and domain-owned.

### 10.2 Immutable ledgers

Once financially posted: **original entry + reversal + replacement.** Never mutate historical truth.

For accounting and stock valuation, the specification and property-based reconciliation tests are written **before** implementation:

```
debits = credits
posting is idempotent
reversal fully neutralises the original
stock movement quantity reconciles to valuation
subledger reconciles to GL under the supported valuation method
allocation rounding is conserved
```

These domains are not candidates for metadata-generated business logic, and not candidates for unsupervised agent authorship.

### 10.3 Workflow, restrained

Metadata may define states, transitions, required permissions, conditions, approval roles, notification hooks, and SLA metadata.

> **Workflow metadata decides when an action is allowed. Application code decides what the action does.**

That division is the only thing preventing the workflow engine from slowly becoming a badly-designed programming language.

---

## 11. Payroll — the launch vertical **STABLE**

The least forgiving thing in the product, and the first thing to ship.

```ts
calculatePayroll(
  employeeSnapshot,   // immutable copy of employee state at run time
  periodInputs,
  rulePack,           // versioned, effective-dated statutory rules
  period,
) => PayrollResult    // deterministic; no I/O, no DB access
```

**Invariants:**

- **No I/O inside the engine.** Pure input → output is exhaustively testable and reproducible in an audit three years later.
- **Integer sen internally**, `numeric` at the persistence boundary.
- **Statutory rates are versioned data, never code.** EPF, SOCSO and EIS are **wage-band lookup tables**, not clean percentages. Encoding them as formulas is a known, expensive mistake. A rate change is a data row, not a deploy.
- **Immutable input snapshot, immutable final result.** Corrections use reversal plus replacement.
- **Runs scope to `legal_entity`**, never tenant (§7.1).
- Every statutory table records `jurisdiction`, `effective_from`, `effective_to`, `version`, `authority_reference`, `source_revision`.

**Malaysian scope at launch:** EPF (KWSP) · SOCSO (PERKESO) · EIS (SIP) · PCB/MTD with CP38 · HRD Corp levy · Borang EA and CP8D · Employment Act 1955 leave entitlements as amended 2022 · bank giro files for disbursement.

> **Implementation flag — carried through every version and worth repeating:** every rate, wage ceiling and tax table must be sourced from current official LHDN / KWSP / PERKESO publications at build time and encoded with its effective date. Take no figure from memory, from a model, or from this document. They shift annually and a stale table is a compliance liability.

---

## 12. Localisation and compliance — separate concerns **FROZEN**

### 12.1 Country packs are data

```
packages/localisation/{my,sg,vn,id,th,ph}/
```

A versioned country pack contributes statutory identifiers, tax and payroll rule packs, address conventions, currencies and rounding defaults, public holidays, bank formats, numbering conventions, employment rules, report templates, local translations, and country-specific metadata overlays.

Every regulatory rule carries `jurisdiction`, `effective_from`, `effective_to`, `version`, `authority_reference`, `source_revision`. **Historical rules are never overwritten** — a July 2025 transaction must remain reproducible in 2028.

Core code contains **zero** `if (country === 'MY')`. Enforced by a fitness function.

### 12.2 Compliance adapters are connectivity

```
packages/compliance/{core,my-myinvois,sg-invoicenow,vn-einvoice,id-coretax,th-etax,ph-eis}/
```

An adapter owns protocol and API mapping, credential handling, submission queue, retry and reconciliation, authority status model, and archive/receipt artefacts. **It does not own the ledger.**

**Architectural consequence, and it is not optional:** e-invoice clearance failure is normal operation, not an exception path. The ledger must never depend on a clearance call succeeding synchronously. Post the entry, write the outbox event, submit asynchronously, reconcile after. `pending → cleared → rejected → amended` is first-class state.

This separation is why a MyInvois outage looks like a MyInvois outage rather than a payroll rules problem.

---

## 13. Events, outbox and background work **FROZEN**

```
BEGIN
  write business state
  write outbox_event
COMMIT
        ↓  durable runner
notifications · webhooks · e-invoice submission · search indexing
AI indexing · analytics projection · accounting integration · bank files
PDF generation · scheduled reports · document AI
```

No Kafka. No distributed transactions. When volume genuinely demands a streaming backbone, the outbox becomes the bridge to it.

**The outbox is the durable record of intent; the job runner is only an executor.** That is what makes the Trigger.dev-vs-Inngest choice reversible rather than foundational, and it is why it does not deserve a week of debate.

Idempotency keys on every task. Payroll must never double-pay.

---

## 14. AI layer **FROZEN**

AI is a first-class platform **client**, never a privileged backend.

```
AI UI / Agent → AI policy + tool registry → application command/query tools
              → normal authorization → tenant context / RLS → repositories → DB
```

### 14.1 Tool generation is bounded — see §0.2

```
GENERATED from metadata      read · list · search · draft_create
AUTHORED explicitly          approve_payroll_run · post_journal_entry
                             release_bank_file · submit_einvoice
                             post_stock_transfer · terminate_employment
```

An entity existing is not consent for an agent to mutate it.

### 14.2 Capabilities

| Capability | Notes |
|---|---|
| Personal assistant | Leave balance, apply leave, payslip retrieval, claims. In-app first; WhatsApp later |
| Copilot over tenant data | NL → validated query against a semantic layer; **never raw model-authored SQL** |
| Document intake | Vision → structured output → confidence score → human review queue |
| Agentic automation | Approval routing, payroll variance anomalies, leave-conflict detection |
| App-builder | NL → metadata rows. Ships last, once metadata and policy semantics are proven |

### 14.3 Guardrails — all non-negotiable

1. AI never receives raw database credentials and never writes SQL.
2. AI operates under the caller's or agent's identity and tenant context, through the same API and policy layer as a human. No back door.
3. Retrieval filters tenant and permission scope **inside the query**. Never rank globally then filter — that is a data leak with extra steps.
4. Consequential writes create drafts requiring human approval, unless a tenant explicitly enables bounded autonomy for a named action type.
5. Financial, inventory and payroll actions use explicit domain tools, not generic CRUD.
6. Document extraction has confidence thresholds; below threshold routes to a human, never guesses a number into a payslip.
7. Every AI action is audited with model, provider, prompt hash, tool trace, actor and agent identity, timestamp, and outcome.
8. Agent identity is distinct from user identity — separately scoped and independently revocable.

---

## 15. Agent operating model **FROZEN**

### 15.1 `CLAUDE.md` — laws only

Short, and pointing at `docs/architecture/`. Not a duplicate architecture book.

```
# Architecture laws

1.  Browser and server UI talk to the backend only through generated API clients.
2.  API route contracts are declared before handlers.
3.  Modules never import another module's repository or private persistence.
4.  Database access occurs only through sanctioned repositories via withTenant().
5.  Every tenant-owned table has tenant_id and enforced RLS.
6.  Generated artifacts are never hand-edited.
7.  Financial and payroll final records are immutable.
8.  Country rules live in localisation packs; connectivity in compliance adapters.
9.  AI uses application tools; consequential tools are authored, not generated.
10. Money is numeric in storage, integer sen in the payroll engine. Never float.
11. No business mutation through Next.js Server Actions.
12. Payroll and statutory scope is legal_entity, not tenant.
13. pnpm verify is authoritative.

Canonical architecture: docs/architecture/
Decisions: docs/adr/
```

### 15.2 Architecture fitness functions

Laws that depend on an agent remembering them are decoration. CI fails on:

```
UI importing db / repository / Drizzle
module importing a foreign module's repository
cyclic module dependency
platform package importing a business module
tenant table missing tenant_id or an RLS policy
application role that is table owner or has BYPASSRLS
country condition inside a core module
generated code modified by hand
route missing operationId
permission code used but not registered in a manifest
direct mutation of an immutable ledger or payroll-run table
JS floating point in financial code paths
business mutation implemented as a Server Action
AI tool bypassing an application command or policy
server transport not keyed to a live operationId, or not read-only
```

The goal is not maximum linting. The goal is that architectural mistakes fail **immediately and deterministically**.

### 15.3 Generated code is derived state

```
route contracts → OpenAPI → api-client/ · MSW mocks · API docs · contract fixtures
```

Generated code lives in clearly named paths, is never hand-edited, and CI asserts a clean diff:

```bash
pnpm generate && git diff --exit-code
```

Far stronger than asking an agent to remember not to cause drift.

### 15.4 Feature slicing

Good task: *"Employee emergency contact: contract → mock → UI → handler → repository → tests."*
Bad task: *"Build HRMS."*

Every slice has an observable end-user outcome and an executable done-condition.

### 15.5 One ADR per non-obvious decision

So a future session inherits the reasoning instead of re-litigating it. Index in §21.

---

## 16. Verification **FROZEN**

### 16.1 The canonical gate

```bash
pnpm verify   # generate-check → architecture checks → typecheck → lint
              # → unit → contract → RLS → integration → build → selected E2E
```

Heavy suites may be staged or cached, but there is exactly one canonical semantic definition of green.

### 16.2 Tenant isolation — blocking, Phase 1

Testcontainers or an isolated Neon branch. Seed at least two tenants. Run as the real non-owner app role. Set tenant context transactionally. **Enumerate every tenant-scoped table dynamically** so a newly added table cannot silently escape the check. Prove tenant A cannot read or write tenant B rows. Prove a host/session tenant mismatch is rejected. Fail the build if any tenant-scoped table lacks an RLS policy.

**Do not pass this gate on manual inspection.**

### 16.3 Payroll correctness — blocking, Phase 5

Per rule-pack version: golden fixtures from official published tables · wage-band boundaries · joiner/leaver proration · unpaid leave · variable elements · age and category boundaries · gross/deduction/net reconciliation exact in integer sen · immutability and reversal tests.

Plus one property test that matters more than the rest: **recomputing a historical run against its pinned rule-pack version reproduces the original payslip exactly.** That is the audit-defensibility test.

### 16.4 Accounting and inventory — property-based, before implementation

`fast-check` in addition to examples: debit = credit · reversal neutralises posting · posting idempotency · subledger → GL reconciliation · stock quantity and value reconciliation · FX and revaluation rules · allocation rounding conservation.

### 16.5 Contract

OpenAPI validates as 3.1 · SDK and mocks regenerate cleanly · contract diff surfaces in review · breaking changes blocked unless explicitly versioned and approved · every registered route has operation metadata.

### 16.6 Flagship E2E

```
signup → tenant + legal entity provisioned → employee created
→ payroll inputs prepared → calculated → reviewed → approved
→ payslip generated → payslip downloaded
```

Against an isolated database branch.

---

## 17. Build sequence **STABLE**

| Phase | Build | Exit criterion |
|---|---|---|
| **0 — Spine** | Monorepo, laws, ADRs, Next.js + shadcn/Base UI, Hono route-contract pipeline, OpenAPI → Orval → MSW, Drizzle + Neon, `pnpm verify`, fitness functions | One trivial feature travels UX → contract → generated client/mock → handler → database → Playwright, green. At least three fitness functions demonstrably fail on deliberate violations |
| **1 — Tenancy & identity kernel** | `tenant` / `legal_entity` / `business_unit`, Better Auth facade, membership, host resolution, RLS, `withTenant()`, policy engine | **Automated proof that tenant A cannot read or mutate tenant B data across every tenant table** |
| **2 — Design system** | Tokens, shadcn governance, grid primitives, form/list components, command palette, PWA shell, Storybook | A representative screen is built entirely from the system with no bespoke CSS |
| **3 — Bounded metadata kernel** | Semantic registry, custom-field registry + JSONB, deterministic overlays, effective-configuration view, form/list renderer, React escape hatch | A tenant adds a custom field with zero DDL; an HR master-data entity ships mostly from primitives **without** persistence/API/UI/policy becoming one inseparable object |
| **4 — HR core** | Person/employee/employment, organisation assignment, leave, claims, documents, approvals, audit | Employee onboarding plus leave request → approval → balance lifecycle works end to end, on mobile and desktop |
| **5 — Malaysia payroll** | Immutable input snapshot, versioned MY rule packs, pure engine, review/approval lifecycle, payslips, bank files, EA/CP8D | **Golden and statutory fixtures green; historical replay reproduces payslips exactly; full cycle completes through the UI** |
| **6 — AI copilot** | Provider abstraction, tenant-scoped RAG, assistant, copilot, document intake, audited draft actions, bounded tool registry | AI completes a useful HR/payroll task while provably respecting the caller's tenant and policy scope |
| **7 — Integrations & tenant experience** | Custom domains, notifications and channels, WhatsApp where justified, webhooks, integration credentials, compliance adapters in scope | — |
| **8 — Second domain proves generality** | Sales + purchasing + inventory, **or** the finance/accounting spine | HR-specific assumptions are deleted from the platform kernel |
| **9 — Second country / enterprise isolation** | One next jurisdiction's country pack + compliance adapter; dedicated/regional DB routing if a real deal requires it | — |

**Phases 1 and 5 carry the blocking gates.** Neither passes on a manual eyeball.

**Phases 0–3 are the highest-risk work in the project.** If the kernel is wrong, everything downstream inherits the error. Build it, prove it on one entity, and be willing to throw it away once.

> **Phase 8 exists for a reason: generalise on the second real use case, not from imagination.** Do not claim Xforge is a generic platform until a materially different domain has been built on it.

---

## 18. Scale-out triggers **STABLE**

Do not extract infrastructure "because enterprise." These are the only sanctioned triggers, and each response is an **extraction, not a rewrite**, because the architecture was shaped for it.

| Measured pain | Response |
|---|---|
| API workload independently saturates the web deployment | Create `apps/api` from the same Hono composition |
| Job throughput or visibility demands custom control | Dedicated worker runtime |
| Tenant requires residency or hard isolation | Regional or dedicated database tier via the isolation resolver |
| PostgreSQL search latency fails a UX SLO | Introduce a search service |
| Hot configuration lookup becomes a database bottleneck | Introduce cache/KV |
| Outbox event volume requires a streaming backbone | Evaluate Kafka or a managed event bus, bridged from the outbox |

### Portability rule

Even though v1 is SaaS-only: the PostgreSQL schema stays provider-portable, files use an S3-compatible facade, auth sits behind an internal facade, jobs are triggered through an internal interface plus the outbox, domain logic imports no Vercel/Neon/Trigger API, and the core stack runs locally under Docker Compose.

**Portability is an architecture property, not a promise to support on-prem in v1.**

---

## 19. Explicitly rejected **FROZEN**

| Temptation | Decision |
|---|---|
| Microservices or Kubernetes from day one | Reject |
| GraphQL as the principal ERP API | Reject |
| tRPC as the public contract | Reject |
| Server Actions as a business API | Reject |
| RSC importing repositories or Drizzle | Reject |
| One mega metadata object generating all planes | Reject |
| EAV for normal business entities | Reject |
| Tier-3 custom entities for ledgers, payroll or statutory records | Reject |
| Per-tenant database as the default | Reject |
| Arbitrary tenant JavaScript executing server-side | Reject |
| XML / XPath / deep view inheritance | Reject |
| Generic `BaseService<T>` framework | Reject |
| Generic repository abstraction hiding SQL | Reject |
| Event sourcing everything | Reject |
| Kafka, Redis or Elasticsearch before measured need | Reject |
| Prisma (second schema language) · MySQL (no RLS) | Reject |
| Country `if/else` branches spread through core | Reject |
| Mutable posted financial records | Reject |
| JS floating point for monetary truth | Reject |
| Automatic metadata exposure of high-consequence AI tools | Reject |
| **AI holding a database connection or writing SQL** | **Absolutely reject** |

---

## 20. Risks **STABLE**

| Risk | Severity | Mitigation |
|---|---|---|
| Tenant data leakage | **Critical** | RLS + non-owner role + `FORCE RLS` + `SET LOCAL` + `withTenant()` chokepoint + enumerated CI proof |
| Agent-generated payroll bug | **Critical** | Pure engine, immutable snapshots, golden official tables, property tests, historical replay |
| Agent-generated ledger bug | **Critical** | Human-written spec and invariants before implementation; reconciliation property tests |
| AI exceeds authority | **Critical** | Bounded tool generation (§0.2), policy layer, RLS, agent identity, draft default, full audit |
| Tenant ≠ legal entity discovered late | **High** | Modelled correctly in Phase 1 — §7.1 is why this is a launch blocker, not a refinement |
| Metadata becomes another Odoo/Frappe framework | **High** | Four planes, one-source-per-fact, the one-entity rule, the 80/20 rule, first-class escape hatches, generalise only at Phase 8 |
| Architecture drift over long vibe-coding sessions | **High** | Freeze markers, small slices, ADRs, fitness functions, generated code, canonical `pnpm verify` |
| Frontend inconsistency across many screens | **High** | Tokens before screens, shadcn governance, Storybook, visual and E2E checks |
| Scope explosion | **High** | MY HR/payroll wedge, phase exit gates, the second-domain rule |
| Country and compliance change | Medium | Effective-dated rules, adapter versioning, authority source tracking, async clearance |
| JSONB custom-field performance | Medium | Measure first, GIN where useful, deliberate promotion, per-tenant query-cost dashboard |
| Vendor lock-in | Medium | Internal facades, PostgreSQL/S3 portability, outbox, domain isolated from providers |
| Base UI component gaps | Low | Confirm Context Menu / Hover Card / Toast are off the Phase 2 critical path |

---

## 21. ADR index **STABLE**

Written during Phase 0, before code:

```
ADR-001  Modular monolith over service-per-domain
ADR-002  API-first via Hono + @hono/zod-openapi; domain independent of transport
ADR-003  Shared-schema RLS tenancy with an isolation-tier escape hatch
ADR-004  Four architecture planes + semantic registry
ADR-005  Custom-field JSONB strategy and promotion workflow
ADR-006  Money representation: numeric storage, integer sen in payroll
ADR-007  Transactional outbox + Trigger.dev as a replaceable executor
ADR-008  Localisation packs separate from compliance adapters
ADR-009  Tenant / legal entity / business unit as distinct models
ADR-010  All authorization in packages/policy; Better Auth for identity only
ADR-011  Bounded AI tool generation; consequential tools are authored
ADR-012  No privileged frontend data path; conditions for the gated exception
```

---

## 22. Open items **OPEN**

| Item | Decision needed by | Note |
|---|---|---|
| Neon MCP auth failing (HTTP 401) | Phase 0 start | Refresh the token, or provision Postgres via the Vercel Marketplace. Blocks branch-per-PR |
| Vercel CLI not installed | Phase 0 start | `npm i -g vercel` unlocks `env pull`, `deploy`, `logs` |
| Trigger.dev vs Inngest | Phase 0 end | Reversible — the outbox is the durable record either way. Do not spend a week |
| Base UI gaps on the Phase 2 path | Phase 2 start | Context Menu, Hover Card, Toast are absent; confirm substitutes or use Radix for those three |
| Figma MCP OAuth | Only if design handoff runs through Figma | Cannot complete in a non-interactive session |
| Launch jurisdiction re-confirmation | Phase 0 | Malaysia is locked and defensible. Worth one deliberate check given the team is Vietnam-based — local relationships, support hours and language proximity are real. The country-pack architecture makes either choice cheap; the *decision* is not cheap once payroll rule packs exist |

Everything not listed here is FROZEN or STABLE. An agent encountering a question not on this list should consult `docs/adr/` rather than re-deciding.

---

## 23. Conclusion

The best architecture across the three v1 drafts was neither the most metadata-heavy nor the most exhaustive. It is the one that keeps their shared insight and corrects their four real conflicts:

```
Frontend-led discovery
       ↓
Typed API contract          ← authority
       ↓
Generated client + mocks    ← the highest-leverage decision in this document
       ↓
Explicit application/domain logic
       ↓
Relational PostgreSQL truth

Metadata      → controlled composition, bounded, never owning persistence
Policy        → one system, explicit permissions and scopes
Localisation  → versioned effective-dated packs
Compliance    → separate async adapters, never coupled to the ledger
Events        → transactional outbox
Jobs          → replaceable durable executor
AI            → authorised tools, consequential ones authored not generated
```

The differentiator is not a clever framework. It is a **canonical spine plus strict, mechanically enforced boundaries** that lets Claude Code move quickly without converting speed into architectural entropy.

> **Xforge should feel configurable like ERPNext, modular like Odoo, contract-driven like a modern SaaS platform, and maintainable like a deliberately boring TypeScript codebase.**

This is v2.0, and it is proposed for freeze. The next change to any FROZEN section should arrive as an ADR, not as a fourth draft.
