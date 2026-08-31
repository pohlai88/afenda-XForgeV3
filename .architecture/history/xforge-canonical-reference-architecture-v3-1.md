# Xforge — Canonical Reference Architecture

**Version:** 3.0 · **Status:** FINAL — adopted, under change control
**Supersedes:** v1.1–v1.3, v2.1–v2.3 (archived to `.architecture/history/`)
**Path:** `.architecture/canonical-reference-architecture.md`
**Launch:** Malaysia · HRMS + Payroll · Cloud SaaS

---

## How this document differs from every previous version

v1 and v2 were *proposals*. They argued for an architecture. This version does something the earlier drafts never did: it **runs the architecture against nine concrete scenarios and reports what broke**.

Part II found six real defects. All six are corrected in Part I, and each correction is marked **`[V-n]`** with a pointer to the scenario that exposed it. An architecture that has never been walked through a hard case is a hypothesis. This one has been.

```
Part I    The architecture           normative, settled, under change control
Part II   Validation evidence        nine scenarios, six defects found and fixed
Part III  Known limitations          what this architecture is bad at, stated plainly
```

**Change control (§26) is now active.** The remaining open items are six, all listed in §27 with deadlines. Anything not listed there is settled — a Claude Code session should consult `docs/adr/`, not re-decide.

---

## 0. The three v2 conflicts, closed

Only three questions were still live across v2.1, v2.2, and v2.3.

### 0.1 May a Server Component read the domain in-process? — **No. v2.1 and v2.3 win.**

v2.2 argued for a generated read-only server query facade keyed to `operationId`, CI-guarded against drift. It is a well-constructed argument and it addresses the drift objection properly. It still loses, for a reason none of the three drafts stated:

> **The facade bypasses the HTTP layer, and the HTTP layer is where rate limiting, request logging, correlation IDs, idempotency handling, and the standard error envelope live.** A facade read therefore has different observability and different failure semantics from the same read over HTTP. That is a second path in *behaviour*, not merely in code — and a CI guard on `operationId` parity cannot detect it.

Add the mock-first argument (a facade read cannot be built against MSW) and it is settled.

**Ruling:** one business operation → one contract → one transport → one policy path. The exception survives only under all five of v2.1 §0.1's conditions: measured bottleneck, ADR, named benchmark and threshold, read-only, and mechanical parity tests. It is not a v1 feature.

### 0.2 Money representation — **v2.3's split, with v2.2's scale-is-data catch**

| Kind | Representation |
|---|---|
| Persisted monetary/accounting values | PostgreSQL `numeric(p,s)`, explicit scale per semantic type |
| Payroll engine internals | Integer minor units (sen), where statutory rounding is defined in cents |
| FX rates, unit costs, tax rates, allocation ratios | `numeric` with explicit scale |
| TypeScript | An explicit decimal domain type. Never `number` for financial truth |

v2.2's catch stands and is now a law: **the minor-unit scale is data, not an assumption.** VND has 0 decimals, most SEA currencies have 2. Hardcoding `× 100` is a defect waiting for the Vietnam country pack.

### 0.3 Component primitives — **v2.2's method, with the fact now verified**

v2.2 was right to refuse to inherit an unverified claim and to specify a method instead. The fact has since been checked and holds: **shadcn defaults to Base UI for new projects as of July 2026**; Radix remains fully supported and is one flag away. For Xforge the specific argument is stronger than the default — Base UI ships **Combobox, Autocomplete, and Number Field**, the three primitives an HR/payroll product leans on hardest.

**Ruling:** run `shadcn init` at Phase 0 and take its default. Confirm at Phase 2 whether Base UI still lacks Context Menu, Hover Card, and Toast, and whether any is on the critical path.

---

# PART I — THE ARCHITECTURE

## 1. Locked decisions **FROZEN**

| Decision | Choice |
|---|---|
| Product model | Cloud SaaS only in v1; portability is an architecture property, not a v1 promise |
| Development model | Claude Code / agent-driven feature slices |
| Language | TypeScript strict, end-to-end |
| System shape | Strict modular monolith |
| First vertical | HRMS + Payroll |
| Launch jurisdiction | Malaysia |
| Long-term market | MY, SG, VN, ID, TH, PH |
| API | REST + OpenAPI 3.1, first-class and externally consumable |
| Delivery sequence | Frontend-led, contract-before-handler |
| Database | PostgreSQL; Neon at launch |
| Tenant isolation | Shared schema + `tenant_id` + RLS; dedicated database tier later |
| Tenant URL | Platform subdomain default; custom domain on eligible tiers |
| Metadata | First-class but bounded; never the owner of all planes |
| Custom fields | JSONB + registry; projection index on measured need |
| Core business data | Real relational tables, constraints, indexes |
| AI | Authorised application tools; never privileged DB access |
| AI writes | Draft by default for consequential actions |
| Localisation | Versioned country packs, separate from compliance adapters |
| Infrastructure | Managed and deliberately boring |

> **Scope rule:** build the kernel **module-agnostic and country-pack-shaped from day one**, while shipping exactly **one module (HR/Payroll)** and **one country pack (MY)**.

## 2. Doctrine **FROZEN**

> **Explicit core. Metadata at the edges. Contract in the middle.**

```
business truth          → explicit code + relational data
external interface      → explicit API contract
repeatable UI structure → metadata
tenant variation        → deterministic overlays
country variation       → versioned localisation packs
authority connectivity  → compliance adapters
async work              → transactional outbox + durable jobs
AI                      → authorised application tools
```

**Vibe-first:** popular well-documented technology · high static type density · explicit code over metaprogramming · deterministic generation · deterministic architecture tests · short dependency paths · one canonical location per concern · small end-to-end slices.

> **Verbose-but-obvious beats terse-but-magical.**

**DRY means one source of truth per fact**, not one mega-definition generating the platform:

| Fact | Authority |
|---|---|
| API operation shape | typed route contract → OpenAPI |
| Column, index, constraint | Drizzle / PostgreSQL schema |
| Business invariant | domain / application code |
| Generic field semantic | semantic registry |
| Form composition | experience metadata, or hand-written UI |
| Role / action permission | policy registry |
| Tenant custom field | metadata registry row |
| Statutory rate | effective-dated country rule pack |
| Authority protocol mapping | compliance adapter |
| Generated client | generated from OpenAPI; never hand-edited |

**KISS is an infrastructure budget.** One language, one primary database, one principal deployment, one API style, one auth facade, one job mechanism, one verification command. A new dependency requires a **named, measured pain** (§21).

## 3. Architecture laws — the whole of `CLAUDE.md` **FROZEN**

```
# Architecture laws

1.  Browser and server UI reach the backend only through generated API clients.
2.  API route contracts are declared before handlers.
3.  Modules never import another module's repository or private persistence.
4.  Tenant DB access occurs only through withTenant(); platform-wide access only
    through withPlatformAccess(), which is audited.                        [V-6]
5.  Every tenant-owned table has tenant_id and enforced RLS.
6.  Generated artifacts are never hand-edited.
7.  Financial and payroll final records are immutable; correct by reversal.
8.  Country rules live in localisation packs; authority connectivity in
    compliance adapters. No country codes in core.
9.  AI uses application tools. Consequential tools are authored, never generated.
10. Money is numeric in storage, integer minor units in the payroll engine.
    Minor-unit scale is data. Never float.
11. No business mutation through Next.js Server Actions.
12. Payroll and statutory scope is legal_entity, never tenant.
13. Mutable documents use optimistic concurrency; stale writes are rejected.
14. pnpm verify is authoritative.

Canonical architecture: docs/architecture/    Decisions: docs/adr/
```

## 4. The four planes and the semantic registry **FROZEN**

| Plane | Authority | A change is | Technology |
|---|---|---|---|
| **Data** | storage, constraints, indexes, RLS, ledgers, migrations | reviewed migration | PostgreSQL + Drizzle |
| **Contract** | operations, envelopes, errors, pagination, idempotency, versioning | contract change, then implementation | Hono route contracts → OpenAPI 3.1 |
| **Experience** | presentation, ordering, composition, visibility, labels, saved views | config change only | metadata overlays + React escape hatches |
| **Policy** | permissions, scopes, workflow, approvals, field/row access, AI policy | policy change only | `packages/policy` + RLS |

**The semantic registry is the join, not the owner.** It holds only: `entity id · field id · semantic type · reference target · label key · searchability hint · sensitivity classification · AI description · customisation capability`.

Three laws, each mechanically enforced:

- Changing `labelKey` must never alter a database column.
- Changing UI visibility must never relax API validation.
- Changing a custom field must never bypass policy.

Generation is **one-directional and gated**: an entity definition *proposes* a migration; a human reviews and applies it.

> **The Experience plane may never weaken the Contract plane.** If the API requires `customer_id`, tenant form metadata saying `required: false` changes the form only.

## 5. System shape **FROZEN**

```
                    ┌──────────────────────────┐
                    │        XFORGE WEB        │
                    │ Next.js · React · shadcn │
                    └────────────┬─────────────┘
                                 │ generated API client only
                    ┌────────────▼─────────────┐
                    │   OpenAPI 3.1 contract   │
                    └────────────┬─────────────┘
                    ┌────────────▼─────────────┐
                    │   HONO — thin adapters   │
                    └────────────┬─────────────┘
          ┌──────────────────────▼──────────────────────┐
          │           APPLICATION / DOMAIN              │
          │   command → policy → domain rule → repo     │
          │   hr · payroll   (→ crm · sales · finance)  │
          └──────────┬──────────────────────┬───────────┘
                     ▼                      ▼
                PostgreSQL              outbox → durable jobs
                RLS · JSONB                       │
                FTS · pgvector                    ▼
                                     integrations · webhooks
                                     statutory authority APIs

  PLATFORM KERNEL — must not know Payroll exists
  identity · tenancy · organization · policy · metadata · workflow · audit
  files · events · jobs · notifications · integration · localisation
  compliance · ai
```

### 5.1 Module anatomy

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

`manifest.ts` declares `id`, `version`, `dependencies`, `optionalIntegrations`, `permissions`, `navigation`, `entities`, `events`, `workflows`, `countryContributions` **[V-8]**, `featureFlags`.

A module may communicate through another module's public application interface, domain events, or platform capabilities. It may **not** import another module's repository, Drizzle internals, or private UI.

### 5.2 Repository shape

```
xforge/
├─ apps/          web · admin · docs
├─ modules/       hr · payroll  → later: contacts · crm · catalog · sales
│                 purchasing · inventory · accounting · projects · pos
├─ packages/      api · api-client[GEN] · auth · db · tenancy · organization
│                 policy · metadata · metadata-ui · workflow · audit · events
│                 jobs · files · notifications · integration · localisation
│                 compliance · ai · ui · tokens · money · testing
├─ contracts/     openapi/  — generated artefact + snapshots
├─ tooling/       generators/ · architecture/ · scripts/
├─ docs/          architecture/ · adr/
└─ CLAUDE.md
```

```
apps = deployable compositions · modules = business capabilities
packages = platform capabilities · contracts = externally visible artefacts
```

> **The platform kernel must not know that Payroll, Sales or Inventory exists.** Enforced by a fitness function.

## 6. Canonical stack **STABLE**

**Foundation.** TypeScript strict · Node 24 LTS · pnpm 11 · Turborepo · Biome (plus targeted architecture ESLint rules only where Biome cannot express them) · Docker Compose for local development.

**Frontend** (~60% of first-year effort). Next.js 16 App Router, React 19, Turbopack · shadcn/ui on Base UI · Tailwind v4 with OKLCH semantic tokens · TanStack Table with virtualization · TanStack Query v5 · React Hook Form + Zod · MSW (generated) · Storybook · cmdk · next-intl (EN, BM, 中文) · Recharts · Motion.

*UX commitments:* command palette as primary navigation · Excel-grade grid with keyboard nav, frozen columns, inline edit, saved views, bulk edit, undo · optimistic mutations everywhere · mobile-first installable PWA with IndexedDB outbox · loading, empty, permission-denied, partial-data, error and retry states designed before API implementation · CI-enforced budget of ≤180KB critical-path JS and LCP <2.5s on throttled 4G.

**API.** Hono at `app/api/[[...route]]/route.ts` · `@hono/zod-openapi` → OpenAPI 3.1 · Orval → typed client + Query hooks + MSW handlers · Scalar docs.

*Conventions, established once:* `/v1/` prefix · stable `operationId` · consistent pagination and filter/sort vocabulary · RFC 9457 Problem Details error envelope · `request_id` correlation · explicit idempotency keys on retryable commands · consistent date-time and decimal serialisation · no silent coercion of invalid business input.

*Boundary hardening — tested, not assumed:* accepted `Content-Type` · malformed body · missing body · maximum body size · unknown-field policy · consistent validation errors. These live in contract tests.

*Why Hono over Fastify:* minimal adapter, plain functions, mounts inside the Next.js deployment today, lifts out to standalone Node unchanged. **The domain layer must not import Hono.**

**Data and platform.** PostgreSQL 17 on Neon · Drizzle + explicit SQL · RLS via `pgPolicy` · Postgres FTS + trigram + `unaccent` · pgvector · Better Auth behind `packages/auth` (identity, session, membership **only**) · `packages/policy` (**all** authorization) · transactional outbox · `packages/jobs` with Trigger.dev as initial executor · S3-compatible files on R2 · `tenant_domain` model with Vercel for Platforms as initial provider · Resend + React Email · OpenTelemetry + Sentry + structured logs · Vitest + fast-check + Testcontainers + Playwright.

## 7. Development flow **FROZEN**

```
UX intent → screen states + interaction design
   ↓
typed route operation (Zod)
   ↓
OpenAPI 3.1 generated
   ↓  pnpm generate
Orval → client + Query hooks + MSW mocks
   ↓
COMPLETE FRONTEND AGAINST MOCKS      ← no database, no backend, no infrastructure
   ↓
handler → command/query → domain rule → repository → PostgreSQL
   ↓
contract + integration + E2E verification
```

**API-first is architectural authority. Frontend-led is development order.** The authored route contract is the code authority; the generated OpenAPI document is the published, language-neutral compatibility surface.

**State transitions are commands, never patches:**

```
POST /payroll-runs/{id}/calculate      not   PATCH { status: 'calculated' }
POST /payroll-runs/{id}/approve
POST /leave-requests/{id}/approve
POST /journal-entries/{id}/post
```

**Forbidden:** `React UI → Drizzle` · `React UI → repository` · `React UI → foreign module internals` · `Server Action → hidden business mutation`.

## 8. Multi-tenancy and organisation **FROZEN**

### 8.1 Five distinct concepts — never collapsed **[V-1]**

```
PERSON  ──────────────► a human being; one record per human, tenant-scoped
   │
   └── EMPLOYEE ──────► person employed BY A LEGAL ENTITY
          │             one per person per legal entity
          │             carries statutory employee registrations
          │
          └── EMPLOYMENT ► a dated period with job, org unit, pay basis
                           effective-dated; payroll operates on THIS

USER ──membership──► TENANT
                       ├── LEGAL ENTITY (Sdn Bhd A) — own EPF, SOCSO, LHDN E-number
                       ├── LEGAL ENTITY (Sdn Bhd B) — own registrations, own EA forms
                       └── BUSINESS UNIT → branch · site · warehouse · department
```

A Malaysian group with three `Sdn Bhd` entities is **one tenant with three legal entities**. Each has its own EPF employer number, SOCSO employer code, and LHDN E-number, and files its own Borang EA.

> **Payroll scopes to `legal_entity`, and operates on `employment` periods, never on `employee` or `tenant`.**

The `person → employee → employment` split is not modelling luxury. Scenario V-1 shows it is the difference between a working mid-month transfer and a rewrite.

An authentication provider's "organization" concept is **not** canonical ERP topology.

### 8.2 RLS is structural, not conventional

```sql
ALTER TABLE employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employee
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

**Four details decide whether this works or is theatre:**

1. **Never connect as the table owner.** RLS silently skips owners and superusers. Use a dedicated `app_user` role without `BYPASSRLS`, with `FORCE ROW LEVEL SECURITY` as the second line.
2. **`SET LOCAL`, never `SET`.** Tenant context must be transaction-scoped. Under a pool, a session-scoped variable leaks to whichever tenant borrows that connection next.
3. **Neon's HTTP driver cannot hold session state across statements.** Use the pooled WebSocket driver for anything RLS-scoped.
4. **Two chokepoints, and only two** **[V-6]**:

```ts
withTenant(tenantId, fn)        // the only path to tenant-scoped data
withPlatformAccess(reason, fn)  // the only path to cross-tenant data
```

`withPlatformAccess` exists because the admin console, billing rollups, and platform analytics genuinely need cross-tenant reads. Without a sanctioned path, someone will disable RLS to build one — which is exactly how RLS architectures fail in practice. It is restricted to `apps/admin`, requires a stated reason, writes an audit record on every call, and is forbidden in `modules/**` by a fitness function.

Every tenant-owned table has `tenant_id NOT NULL`. Indexes are tenant-leading: `UNIQUE (tenant_id, code)`, `INDEX (tenant_id, status)`. Business identifiers are unique **per tenant**, never globally.

### 8.3 Isolation tiers

```
pooled  |  dedicated_database
```

**No schema-per-tenant middle tier.** It adds migration complexity without the isolation clarity of a dedicated database. The connection resolver owns the decision; business modules never branch on it. Do not build the dedicated tier before a contract, a residency requirement, or measured scale justifies it — and read §25.2 first, because it costs more than a config flag.

### 8.4 Tenant domains

```
app.xforge.com     platform
acme.xforge.app    subdomain — wildcard DNS + TLS, instant on signup
hr.acme.com.my     custom domain — paid tier, DNS-verified, automatic TLS

tenant_domain(id, tenant_id, hostname, type, verification_status,
              is_primary, created_at, verified_at)

Host → domain resolver (Edge Config, ~1ms) → candidate tenant context
     → authenticated membership validation → request tenant context
```

> **The hostname resolves a *candidate* tenant. It never authorises.** The API re-derives the tenant from the session and asserts it matches. A valid session for tenant A presented at tenant B's hostname is rejected.

## 9. Authorization **FROZEN**

| Layer | Mechanism | Fails safe? |
|---|---|---|
| Authentication | Better Auth (facade) | — |
| Tenant isolation | PostgreSQL RLS | **Yes** — structural, cannot be forgotten |
| Business authorization | `packages/policy` | compiled to SQL predicates + response filters |

```
hr.employee.read · hr.compensation.read
payroll.run.calculate · payroll.run.review · payroll.run.approve

permission: payroll.run.approve
scope:      legal_entity = MY01
```

Scopes: `tenant | legal_entity | business_unit | department | location | team | own`.

**All** authorization lives in `packages/policy` — never split with the auth library. Tenants define their own roles as rows in Xforge tables. A permission code used but not registered in a module manifest is a build failure.

## 10. Data architecture **STABLE**

**Migration discipline: expand → migrate/backfill → switch → contract.** No destructive change in the same deployment that first stops using the old shape. Migrations are forward-reviewed SQL. Long backfills are resumable jobs. Every migration is tested against an isolated branch. Tenant customisation generates **no** ordinary DDL.

**Concurrency.** Mutable business documents use optimistic concurrency — a `version` token on every update command. The API rejects stale writes explicitly with `409`, never silently overwrites. **[V-5]**

**IDs.** Technical primary keys are opaque. Business document numbers are separate, tenant- and legal-entity-scoped attributes. A human-readable number is never a primary key.

## 11. Metadata and customisation **STABLE**

### 11.1 The custom-field ladder — three rungs, with a decision rule **[V-2]**

Earlier versions said "JSONB, promote to a generated column on measured need." That is wrong at scale: promoting tenant fields to global table columns means a table accumulating a generated column per tenant request, most of them NULL for any given row. That is ERPNext's problem re-emerging in a different shape.

| Rung | Use when | Mechanism | Cost |
|---|---|---|---|
| **1. JSONB + GIN** | Default. Containment queries, display, export | `entity.custom` JSONB, GIN index | Zero DDL |
| **2. Projection index** | The field needs indexed filtering or sorting at scale | `custom_field_index` side table; JSONB stays canonical | Zero DDL; sync via outbox; one join per filtered field |
| **3. Real column** | The field has become a **product** field, not a tenant field | ADR + reviewed migration | Normal migration |

```
custom_field_index
  tenant_id · entity_type · record_id · field_id
  value_kind · value_text · value_numeric · value_date
```

**Decision rule:** stay on rung 1 until a query is measurably slow. Move to rung 2 for that field only. Move to rung 3 only when *most tenants* want the field — at which point it is a product decision, not a customisation.

**Named cost of rung 2:** filtering on N custom fields simultaneously costs N joins. Above three, hand-build the screen and query instead. This is a real limit, not a hidden one.

**Rung 3 is forbidden for**, and rung 1/2 storage is forbidden as the *source of truth* for: payroll results, statutory records, journal and ledger entries, stock movements, payments and settlements. Those are first-class relational models, permanently.

### 11.2 Overlay resolution

```
System definition → Country pack → Tenant configuration → User personalisation
```

Deterministic, typed, version-aware, conflict-detecting, and inspectable through an **effective-configuration view** that shows the resolved result and which layer contributed each value. Without that view, debugging a tenant's configuration becomes archaeology.

### 11.3 Stable slots, never XPath

```
core employee form
  slots: identity · employment · compensation · statutory · documents · activity

MY country pack:  insert epf_socso_details into `statutory`
Tenant ABC:       hide cost_centre · rename employee_code → staff_id
```

No DOM selectors. No XPath. No hidden inheritance chain.

### 11.4 The two rules that stop this becoming Odoo

> **If exactly one entity needs a metadata capability, hardcode it.**

> **Metadata-render:** master-data CRUD, list/detail, filters, saved views, simple approvals, simple reports, configuration.
> **Hand-build:** payroll processing, bank reconciliation, month-end close, inventory and manufacturing planning, POS, complex quotations, executive workspaces, AI workbench.

Escape hatches are first-class. **The generator is a productivity default, not a prison.**

## 12. Money and integrity **FROZEN**

Per §0.2. Additionally, for multi-currency transactions persist:

```
transaction_amount · transaction_currency
base_amount · base_currency
exchange_rate · exchange_rate_source · exchange_rate_timestamp
rounding_policy
```

**Never recompute historical base amounts from today's rate.** Rounding policy is named, versioned and tested — never `.toFixed()` scattered across modules.

**Immutable ledgers.** Once posted: original + reversal + replacement. Property tests written *before* implementation: debits = credits · posting is idempotent · reversal fully neutralises · subledger reconciles to GL · stock quantity reconciles to valuation · allocation rounding conserved.

**Workflow, restrained.** Metadata defines states, transitions, required permissions, conditions, approval roles, notifications, SLA.

> **Workflow metadata decides when an action is allowed. Application code decides what it does.**

## 13. Payroll — the launch vertical **STABLE**

```ts
calculatePayroll(
  employmentSnapshot,      // [V-1] employment period, not employee
  payrollInputSnapshot,
  rulePack,                // versioned, effective-dated
  period,
) => PayrollCalculation
```

**Properties:** deterministic · no network I/O · no database I/O · **no clock reads inside calculation** · explicit input snapshot · explicit rule-pack version · integer sen for MY statutory arithmetic.

**Lifecycle, by command:**

```
DRAFT → calculate → CALCULATED → review → REVIEWED → approve → APPROVED → release → RELEASED
```

Each command verifies current state, permission, legal-entity scope, concurrency version, required findings, snapshot hashes, rule-pack version, and idempotency. Final results are immutable; corrections create reversal/adjustment/replacement artefacts.

**Reproducibility** requires three pinned values, not two **[V-4]**:

```
input snapshot  +  rule-pack version  +  calculation-engine version
```

The engine version matters because a bug fix changes output for identical inputs. Without pinning it, a 2028 re-run of a 2025 payslip produces a different number and you cannot explain why.

**Statutory rule packs.** Every rule carries `jurisdiction`, `effective_from`, `effective_to`, `version`, `authority_reference`, `source_hash`. **Historical rules are never overwritten.** EPF, SOCSO and EIS are **wage-band lookup tables**, not clean percentages — encoding them as formulas is a known, expensive mistake.

**Malaysia launch scope:** EPF (KWSP) · SOCSO (PERKESO) · EIS (SIP) · PCB/MTD with CP38 · HRD Corp levy · Borang EA and CP8D · Employment Act 1955 leave entitlements as amended 2022 · bank giro disbursement files. Statutory employer registrations live on `legal_entity`.

> **Implementation flag:** every rate, wage ceiling and tax table must be sourced from current official LHDN / KWSP / PERKESO publications at build time and encoded with its effective date. Take no figure from memory, from a model, or from this document.

## 14. Localisation and compliance — separate concerns **FROZEN**

**Country packs are data.** `packages/localisation/{my,sg,vn,id,th,ph}/` contributes statutory identifiers, tax and payroll rules, address conventions, currencies and rounding defaults, public holidays, bank formats, numbering, employment rules, report templates, translations, and metadata overlays.

A country pack exposes **contributions per domain**, not a payroll-shaped blob **[V-8]**:

```ts
export const MY: CountryPack = {
  jurisdiction: 'MY',
  payroll:   { rulePacks, statutoryRegistrations, yearEndForms },
  tax:       { rates, withholding, registrationFormats },   // Sales needs this
  banking:   { giroFormats, accountValidation },
  calendar:  { publicHolidays, workweek },
  identity:  { nric, ssm, tin },
  formatting:{ address, phone, numbering },
};
```

Modules declare which contributions they consume in `manifest.ts`. Sales will need `tax` without touching `payroll`. Without this shape, the second module forks the pack.

**Compliance adapters are connectivity.** `packages/compliance/{core,my-myinvois,sg-invoicenow,vn-einvoice,id-coretax,th-etax,ph-eis}/` own protocol mapping, credentials, submission queue, retry and reconciliation, authority status, and receipt archival. **They do not own the ledger.**

**Clearance state is a separate record, never a column on the document** **[V-3]**:

```
compliance_submission
  id · tenant_id · legal_entity_id · document_type · document_id
  adapter · status(pending|submitted|cleared|rejected|amended)
  authority_reference · attempt_count · last_error
  submitted_at · cleared_at · payload_hash · receipt_uri
```

A clearance rejection updates the submission record. It never touches the posted document, and it never touches the ledger. Clearance failure is normal operation, not an exception path.

## 15. Events, outbox, jobs **FROZEN**

```
BEGIN
  change business state
  insert outbox_event
COMMIT
```

**No dual-write.** The outbox is the durable integration truth. **Assume at-least-once delivery** — consumers must be idempotent, using stable event IDs, idempotency keys, a processed-event record where appropriate, retry with backoff, and an operator-visible dead-letter state.

`packages/jobs` defines the execution interface. Trigger.dev is the initial executor; **business modules never import its SDK**. That makes executor replacement an operational migration, not a domain rewrite — which is why the Trigger.dev-vs-Inngest question does not deserve a week.

Async work: payroll artefact generation · bulk import/export · PDF · email · bank files · e-invoice submission · webhooks · AI document processing · search and vector indexing · scheduled reports. Money-moving external operations require explicit idempotency and reconciliation.

## 16. AI layer **FROZEN**

```
AI → policy + tool registry → application command/query tools
   → normal authorization → tenant context / RLS → repositories → DB
```

### 16.1 Tool exposure is bounded, and "consequential" has a definition **[V-7]**

```
GENERATED from metadata   read · list · search · draft_create
AUTHORED explicitly       everything else
```

An entity existing is not consent for an agent to mutate it. Earlier versions left "consequential" to intuition, which fails on cases like leave application — it feels administrative, but it changes a balance that feeds payroll.

> **A capability is consequential if it changes money, statutory filings, stock, an approved record, or an input to any of those.** Consequential capabilities are authored tools bound to application commands, reviewed like any other code.

By that test `apply_leave` is consequential, because leave feeds payroll. It is authored, and it produces a draft requiring approval.

### 16.2 Guardrails — non-negotiable

1. AI never receives database credentials and never writes SQL.
2. AI operates under the caller's or agent's identity and tenant context, through the same API and policy layer as a human.
3. Retrieval filters tenant and permission scope **inside the query**. Never rank globally then filter.
4. Consequential writes create drafts requiring human approval unless a tenant explicitly enables bounded autonomy for a named action type.
5. Financial, inventory and payroll actions use explicit domain tools, never generic CRUD.
6. Extraction has confidence thresholds; below threshold routes to a human.
7. Every AI action is audited with model, provider, prompt hash, tool trace, actor and agent identity, timestamp, and outcome.
8. Agent identity is distinct from user identity — separately scoped and independently revocable.

## 17. Audit, observability, sensitive data **STABLE**

**Business audit** is append-only and is not application logging. Capture `tenant · principal/agent · action · entity · entity_id · change set · request_id · timestamp · origin · reason where required`.

**Observability:** correlation ID · structured logs · OpenTelemetry traces and metrics · Sentry · job and outbox visibility · slow-query monitoring · security-event monitoring.

**Sensitive data:** never log secrets · redact HR/payroll fields from ordinary logs · classify fields in the semantic registry · authorise exports separately from screen reads · provider encryption at rest, TLS in transit · managed secret storage · rotate integration credentials · make bulk export and privileged reads auditable.

## 18. Agent operating model **FROZEN**

**Generated code is derived state.** `route contracts → OpenAPI → api-client · MSW mocks · docs · fixtures`. Never hand-edited. CI runs `pnpm generate && git diff --exit-code`.

**Feature slicing.** Good: *"Employee emergency contact: contract → mock → UI → handler → repository → tests."* Bad: *"Build HRMS."*

**One ADR per non-obvious decision** (§26).

### 18.1 Architecture fitness functions

Laws that depend on an agent remembering them are decoration. CI fails on:

```
UI importing db / repository / Drizzle
module importing a foreign module's repository
cyclic module dependency
platform package importing a business module
tenant table missing tenant_id or an RLS policy
application role that is table owner or has BYPASSRLS
withPlatformAccess called outside apps/admin                      [V-6]
country condition inside a core module
generated code modified by hand
route missing operationId
permission code used but not registered in a manifest
direct mutation of an immutable ledger or payroll-run table
JS floating point in financial code paths
business mutation implemented as a Server Action
AI tool bypassing an application command or policy
mutable document update command without a version token           [V-5]
```

## 19. Verification **FROZEN**

**Canonical gate:**

```bash
pnpm verify   # generate-check → architecture checks → typecheck → lint
              # → unit → contract → RLS → integration → build → selected E2E
```

**Tenant isolation — blocking, Phase 1.** Dynamically enumerate every tenant-scoped table and prove, as the real non-owner role: tenant A cannot read tenant B · cannot update or delete tenant B · inserts cannot spoof tenant B · the app role is not owner/superuser/`BYPASSRLS` · every new tenant table has RLS · host/session mismatch is denied · `withPlatformAccess` writes an audit row on every call. **Never passes on manual inspection.**

**Payroll — blocking, Phase 5.** Golden fixtures from official tables · wage-band boundaries · joiner/leaver proration · **mid-month legal-entity transfer [V-1]** · unpaid leave · variable elements · age and category boundaries · exact gross/deduction/net reconciliation in integer sen · immutability and reversal. Plus the audit-defensibility property: **recomputing a historical run against its pinned rule-pack *and engine* version reproduces the original payslip exactly.**

**Contract.** OpenAPI validates as 3.1 · clients and mocks regenerate cleanly · contract diff in review · breaking changes blocked unless versioned · stable `operationId` required · boundary hardening tested.

**Accounting/inventory — before implementation.** `fast-check` properties per §12.

**Flagship E2E.** `signup → tenant + legal entity → employee → payroll inputs → calculate → review → approve → payslip generated → downloaded`, against an isolated database branch.

## 20. Build sequence **STABLE**

| Phase | Build | Exit criterion |
|---|---|---|
| **0 — Spine** | Monorepo, laws, ADRs, Next.js + shadcn, Hono route contracts, OpenAPI→Orval→MSW, Drizzle + Neon, `pnpm verify`, fitness functions | One trivial feature travels UX → contract → mock → handler → DB → Playwright green. Three fitness functions demonstrably fail on deliberate violations |
| **1 — Tenancy, identity, policy** | `tenant`/`legal_entity`/`business_unit`, `person`/`employee`/`employment`, Better Auth facade, host resolution, RLS, `withTenant`, `withPlatformAccess`, policy engine | **Automated proof that tenant A cannot read or mutate tenant B across every tenant table** |
| **2 — Design system** | Tokens, shadcn governance, grid, form/list primitives, command palette, PWA shell, Storybook | A representative screen is built entirely from the system, no bespoke CSS |
| **3 — Bounded metadata kernel** | Semantic registry, custom-field registry + JSONB, projection index, overlays, effective-config view, renderers, escape hatch | A tenant adds a custom field with zero DDL and filters on it; an HR entity ships from primitives without the four planes fusing |
| **4 — HR core** | Person/employee/employment, org assignment, leave, claims, documents, approvals, audit | Onboarding plus leave request → approval → balance, end to end, mobile and desktop |
| **5 — Malaysia payroll** | Input snapshots, MY rule packs, pure engine, review/approval lifecycle, payslips, bank files, EA/CP8D | **Golden fixtures green; historical replay exact; full cycle through the UI** |
| **6 — AI copilot** | Provider abstraction, tenant-scoped RAG, assistant, copilot, document intake, audited drafts, bounded tool registry | AI completes a useful HR/payroll task while provably respecting caller tenant and policy scope |
| **7 — Integrations** | Custom domains, notifications, WhatsApp where justified, webhooks, integration credentials, compliance adapters in scope | — |
| **8 — Second domain** | Sales + purchasing + inventory, **or** the finance spine | HR-specific assumptions deleted from the platform kernel |
| **9 — Second country / isolation** | One jurisdiction's country pack + compliance adapter; dedicated DB routing if a deal requires it | — |

**Phases 1 and 5 carry the blocking gates.** Phases 0–3 are the highest-risk work: if the kernel is wrong, everything downstream inherits it.

> **Phase 8 exists for a reason: generalise on the second real use case, not from imagination.**

## 21. Extraction triggers **STABLE**

Not "because enterprise." Each response is an **extraction, not a rewrite**, because the architecture was shaped for it.

| Measured pain | Response |
|---|---|
| API workload independently saturates web | `apps/api` from the same Hono composition |
| Job throughput or visibility demands control | Dedicated worker runtime |
| Tenant requires residency or hard isolation | Dedicated database tier — but read §25.2 |
| Postgres search latency fails a UX SLO | Introduce a search service |
| Hot config lookup becomes a DB bottleneck | Introduce cache/KV |
| Outbox volume requires streaming | Kafka or managed bus, bridged from the outbox |

**Portability rule.** Schema stays provider-portable · files use an S3-compatible facade · auth behind an internal facade · jobs behind an internal interface plus the outbox · domain imports no Vercel/Neon/Trigger API · the core stack runs locally under Docker Compose. *Portability is an architecture property, not a v1 promise to support on-prem.*

## 22. Explicitly rejected **FROZEN**

Microservices or Kubernetes at launch · GraphQL as the principal API · tRPC as public contract · Server Actions as business API · RSC importing repositories · in-process business query facade in v1 · one mega metadata object generating all planes · EAV for real business entities · JSONB storage for ledgers/payroll/statutory records · schema-per-tenant middle tier · per-tenant DB as default · arbitrary tenant JavaScript server-side · XML/XPath view inheritance · generic `BaseService<T>` · generic repository hiding SQL · event sourcing everything · Kafka/Redis/Elasticsearch before measured need · Prisma · MySQL · country `if/else` in core · mutable posted financial records · JS float for monetary truth · automatic metadata exposure of consequential AI tools · **AI holding a database connection**.

---

# PART II — VALIDATION EVIDENCE

Nine scenarios, chosen to stress different seams. Each traces end to end through Part I. Six exposed defects; all six are fixed above and marked `[V-n]`.

---

### V-1 · Mid-month transfer between legal entities — **FAILED, fixed**

**Scenario.** Siti works for Sdn Bhd A. On 16 March she transfers to Sdn Bhd B in the same group. Both are legal entities under one tenant, each with its own EPF employer number and LHDN E-number. March payroll runs.

**Trace.** Payroll scopes to `legal_entity` (§8.1), so two runs execute — A for 1–15 March, B for 16–31. Each needs its own snapshot, its own statutory contributions against its own employer registration, and at year end Siti receives **two Borang EA forms**.

**What broke.** Every version through v2 modelled a single `employee` row with a `legal_entity_id` column. That cannot represent one person employed by two legal entities in one period. The snapshot function took `employeeSnapshot`, which is ambiguous the moment a person spans entities. Worse, the failure is silent — you get one payslip with blended contributions and an incorrect EA form, and nobody notices until an EPF audit.

**Fix applied.** `person → employee → employment` (§8.1). One `person` per human. One `employee` per person **per legal entity**, carrying that entity's statutory registrations. `employment` is the effective-dated period the engine operates on. `calculatePayroll` now takes `employmentSnapshot` (§13).

**Why it matters:** this is a group-company scenario, and group companies are the customers who pay for HRMS. Discovering it at Phase 5 would mean re-migrating every employee record.

---

### V-2 · Tenant adds a custom field, then filters 20,000 employees by it — **FAILED, fixed**

**Scenario.** Tenant ABC adds `cost_centre`. Six months later they filter and sort the employee list by it, across 20,000 rows. Meanwhile 400 other tenants have added their own custom fields.

**Trace.** Rung 1 (JSONB + GIN) handles containment; sorting by a JSONB key across 20,000 rows does not stay under the UX budget.

**What broke.** Every version said "promote to a generated column on measured need." Multiply by 400 tenants and the `employee` table accrues hundreds of generated columns, each NULL for 99.75% of rows. Index bloat, terrible cardinality, and a schema that grows with the customer list — **ERPNext's problem in a new costume**, arrived at by the very document that claims to have fixed it.

**Fix applied.** The three-rung ladder with an explicit decision rule (§11.1). Rung 2 is a `custom_field_index` projection table; JSONB stays canonical, the projection is derived state synced through the outbox. Rung 3 (real column) is reserved for fields that have become *product* fields.

**Named cost, stated rather than hidden:** filtering on N custom fields costs N joins. Above three, hand-build the screen.

---

### V-3 · MyInvois rejects an invoice after the ledger posted — **FAILED, fixed**

**Scenario.** Post-v1, but the architecture must accommodate it. An invoice posts to the GL and submits to MyInvois. LHDN rejects it three hours later on a TIN mismatch.

**Trace.** §14 says the ledger never depends on synchronous clearance — correct. §15's outbox carries the submission — correct. The rejection arrives asynchronously.

**What broke.** Every version described clearance status as invoice *state* (`pending → cleared → rejected → amended`). If that status is a column on the invoice, then recording a rejection **updates a document the ledger references**, which collides with §12's immutability rule. You then face a bad choice: relax immutability, or lose clearance state.

**Fix applied.** `compliance_submission` as a separate record keyed to the document (§14). Rejection updates the submission. The posted document and the ledger are never touched. A document may have several submissions over its life — original, amendment, resubmission — which also happens to model Indonesia's *Faktur Pengganti* flow correctly, where the buyer must confirm a replacement before it reaches "amended".

---

### V-4 · Retroactive correction across a statutory rate change — **PASSED, with a required addition**

**Scenario.** EPF rates change 1 January 2027. In March 2027, an error is found in a September 2026 payroll run. The correction must use the September 2026 rules, not current ones.

**Trace.** Effective-dated rule packs (§13) select the September pack by period date. Corrections create reversal + replacement, never mutation. Historical rules are never overwritten. **The architecture handles this correctly.**

**Addition required.** v2.1 said reproducibility needs input snapshot + rule-pack version. That is insufficient: if the calculation engine was bug-fixed between September 2026 and March 2027, identical inputs and identical rules still produce different output, and you cannot explain the discrepancy to an auditor. v2.3 caught this; it is now normative — **three pinned values: snapshot + rule-pack version + engine version** (§13).

---

### V-5 · Two HR admins edit the same employee simultaneously — **FAILED in two of three versions, fixed**

**Scenario.** Admin A opens Siti's record and edits her bank account. Admin B opens the same record and edits her address. A saves, then B saves.

**Trace.** Both hold a full entity payload from a prior read. B's save overwrites A's bank-account change with the stale value B loaded. **No error is raised. Nobody is notified. The salary goes to the old account.**

**What broke.** v2.1 and v2.2 had no concurrency model at all. This is the single most common silent data-loss bug in business software, and two of three "canonical" architectures did not mention it. v2.3 §11.3 had it.

**Fix applied.** Optimistic concurrency is now a law (§3.13) and a fitness function (§18.1): every mutable-document update command carries a `version` token, and the API rejects stale writes with `409` rather than overwriting.

---

### V-6 · The admin console needs to list every tenant — **FAILED, fixed**

**Scenario.** Phase 7. Platform ops needs a screen showing all tenants, their plan, and their storage use. Billing needs a monthly cross-tenant rollup.

**Trace.** Every path to the database goes through `withTenant(tenantId, fn)` under a role with no `BYPASSRLS`. **There is no sanctioned way to read across tenants.**

**What broke.** This is the failure mode of RLS architectures in practice, and it does not look like a defect until you hit it: an engineer under deadline pressure adds a second connection with a privileged role, or disables RLS on a table "just for the admin query," and the isolation guarantee quietly dies. Not one version through v2 provided an escape.

**Fix applied.** A second, and only a second, chokepoint (§8.2):

```ts
withPlatformAccess(reason, fn)   // audited, restricted to apps/admin
```

It requires a stated reason, writes an audit row on every invocation, and is forbidden in `modules/**` by a fitness function (§18.1). Every call is visible. The point is not that cross-tenant access is safe — it is that it is **rare, named, and logged**, rather than improvised at 2am.

---

### V-7 · "Claude, apply 3 days leave for me next week" — **FAILED, fixed**

**Scenario.** An employee asks the in-app assistant to apply for leave.

**Trace.** §16 says metadata generates `read · list · search · draft_create` and consequential actions are authored. Which is `apply_leave`?

**What broke.** It reads as routine administration, so it would have been generated as a `draft_create`. But leave affects the leave balance, which feeds unpaid-leave proration in payroll, which affects statutory contributions. **"Consequential" was left to intuition, and intuition gets this one wrong.**

**Fix applied.** A definition rather than a vibe (§16.1):

> A capability is consequential if it changes money, statutory filings, stock, an approved record, **or an input to any of those.**

The trailing clause is what catches leave. Under it, `apply_leave` is an authored tool bound to an application command, producing a draft that requires approval.

---

### V-8 · The Sales module needs Malaysian tax rules — **FAILED, fixed**

**Scenario.** Phase 8. Sales needs SST rates, TIN validation, and invoice numbering — all Malaysian, all already implemented for payroll's neighbours in `packages/localisation/my/`.

**Trace.** `payroll → hr + policy + localisation` (§5.1). Sales would need the same dependency.

**What broke.** Every version described `localisation/my` as a flat bag of country rules, in practice shaped entirely by payroll's needs. Sales would either import a payroll-shaped module (coupling Sales to Payroll, violating §5's module rule) or fork it — and the moment it forks, MY tax rules exist in two places and drift. **This is exactly how Odoo's localisation modules became unmaintainable.**

**Fix applied.** Country packs expose typed **contributions per domain** — `payroll`, `tax`, `banking`, `calendar`, `identity`, `formatting` (§14). Modules declare which contributions they consume in `manifest.ts`. Sales takes `tax` and `formatting` without touching `payroll`.

**Note this was found by a Phase 8 scenario while we are planning Phase 0.** It cost one paragraph now. It would have cost a fork later.

---

### V-9 · Claude Code writes a query with no tenant filter — **PASSED**

**Scenario.** During Phase 4, an agent implements a leave-balance query and omits `WHERE tenant_id = ...`.

**Trace.** The repository obtains its handle through `withTenant`, which opens a transaction with `SET LOCAL app.tenant_id`. The connection runs as `app_user`, which is not the table owner and lacks `BYPASSRLS`. `FORCE ROW LEVEL SECURITY` is set. The policy applies. **The query returns only the current tenant's rows regardless of the missing predicate.**

**The design intent holds:** tenant isolation does not depend on an agent remembering to filter. This is the property that makes agent-driven development viable on a multi-tenant product at all, and it is worth stating that the scenario was run specifically to try to break it.

**Residual risk, accepted and mitigated:** an agent could write a query that is *correct but slow* by omitting the tenant prefix on an index. Caught by slow-query monitoring (§17), not by RLS. Tenant-leading indexes (§8.2) reduce the surface.

---

## Validation summary

| # | Scenario | Result | Defect class |
|---|---|---|---|
| V-1 | Mid-month legal-entity transfer | **Failed → fixed** | Domain model — silent wrong output |
| V-2 | Custom field at scale | **Failed → fixed** | Persistence — reintroduced the problem being solved |
| V-3 | Clearance rejection after posting | **Failed → fixed** | State ownership — collides with immutability |
| V-4 | Retro correction across rate change | **Passed + addition** | Reproducibility — engine version unpinned |
| V-5 | Concurrent edit | **Failed → fixed** | Silent data loss |
| V-6 | Cross-tenant admin read | **Failed → fixed** | Missing escape → guarantee erodes in practice |
| V-7 | AI leave application | **Failed → fixed** | Undefined term in a safety rule |
| V-8 | Second module needs country data | **Failed → fixed** | Coupling — forces a fork |
| V-9 | Agent omits tenant filter | **Passed** | — |

**Six defects in nine scenarios.** Three of them (V-1, V-2, V-5) would have produced *silently wrong* results rather than errors, which is the expensive kind. Two (V-6, V-8) would have caused the architecture to erode under pressure rather than fail outright, which is the kind you never notice until it is gone.

The three v2 documents were internally consistent, well argued, and — on the evidence — wrong in six places. That is the argument for validating an architecture rather than debating it.

---

# PART III — KNOWN LIMITATIONS

Stated plainly, because an architecture document that lists only strengths is marketing.

### 25.1 Cross-tenant analytics is genuinely awkward

RLS makes per-tenant isolation structural and cross-tenant aggregation deliberately hard. `withPlatformAccess` (§8.2) is a controlled escape, not a query engine. Product analytics across tenants will eventually want a separate read model fed by the outbox. **Not built in v1. Do not improvise it — it is an ADR.**

### 25.2 Data residency is a project, not a config flag

§8.3 offers a `dedicated_database` tier and §21 calls it an extraction. Both are true, and both understate the cost: **Neon, Vercel, and Trigger.dev are all globally-managed services.** A Vietnamese customer citing Decree 13/2023, or an Indonesian customer citing local storage rules, cannot be served by the launch stack at all — not by changing a column, but by standing up a regional cell with different providers.

The portability rule (§21) is what makes that *possible*. It does not make it *cheap*. Budget a real project, and do not sell residency before one exists.

### 25.3 The metadata renderer will not serve dense workflow screens

The 80/20 rule (§11.4) is a real 80/20, not a rhetorical one. Payroll processing, bank reconciliation, and month-end close are hand-built, and that is a permanent cost, not a temporary gap. If a future customer wants a metadata-configurable payroll processing screen, the correct answer is no.

### 25.4 The modular monolith has a known breaking point

If one module develops radically different scaling or availability requirements — a POS needing offline-first sync and sub-100ms local writes, for instance — extraction becomes necessary and the boundaries (§5) make it possible but not free. The trigger table (§21) is honest about when. **Do not extract before it.**

### 25.5 PWA offline is tolerance, not sync

§6 promises an IndexedDB outbox for mobile workflows. That is queue-and-retry, not conflict-resolving offline-first sync. Approvals and simple submissions work offline; editing the same record on two devices while disconnected does not. Genuine offline-first is a different architecture and is **out of scope**.

### 25.6 SEA latency from a US-managed stack

Vercel edge helps the shell; the database round trip does not disappear. Neon's Singapore region is the right launch choice for Malaysia, and Vietnam and Indonesia will be measurably slower until there is a regional cell. Measure it in Phase 0 rather than discovering it in Phase 5.

---

## 26. Change control **ACTIVE**

This document is normative. A change requires an ADR when it alters: a dependency direction · source-of-truth ownership · API compatibility strategy · the tenancy or security boundary · the persistence model · a runtime or deployment boundary · a module contract · the money or integrity model · metadata authority · async delivery semantics · the AI authority boundary.

An ADR contains: `context · decision · alternatives · consequences · migration/rollback · verification`.

Ordinary package upgrades that preserve these contracts need no ADR.

**ADRs to write during Phase 0, before code:**

```
ADR-001  Modular monolith over service-per-domain
ADR-002  API-first via Hono + zod-openapi; domain independent of transport
ADR-003  Shared-schema RLS tenancy; two chokepoints; no schema-per-tenant tier
ADR-004  Four architecture planes + semantic registry
ADR-005  Custom-field three-rung ladder and projection index
ADR-006  Money: numeric storage, integer minor units in payroll, scale as data
ADR-007  Transactional outbox + replaceable job executor
ADR-008  Localisation packs with per-domain contributions; compliance separate
ADR-009  Person / employee / employment; payroll scopes to legal entity
ADR-010  All authorization in packages/policy; Better Auth for identity only
ADR-011  Bounded AI tool generation; the definition of consequential
ADR-012  No in-process business transport in v1; conditions for the exception
ADR-013  Optimistic concurrency on mutable documents
```

## 27. Open items — the complete list

Anything not here is settled.

| Item | By | Note |
|---|---|---|
| Neon MCP auth failing (HTTP 401) | Phase 0 start | Refresh token or provision via Vercel Marketplace. Blocks branch-per-PR |
| Vercel CLI not installed | Phase 0 start | `npm i -g vercel` |
| Trigger.dev vs Inngest | Phase 0 end | Reversible — outbox is the durable record either way |
| Base UI gaps on the Phase 2 path | Phase 2 start | Context Menu, Hover Card, Toast absent; confirm or use Radix for those three |
| SEA latency baseline | Phase 0 | Measure Neon Singapore from KL, HCMC, Jakarta. Informs §25.6 |
| Launch jurisdiction re-confirmation | Phase 0 | Malaysia is locked and defensible. Worth one deliberate check given the team is Vietnam-based. The country-pack architecture makes either choice cheap; the decision stops being cheap once MY rule packs exist |

## 28. Adoption checklist

- [ ] This document is adopted as canonical; v1.x and v2.x moved to `.architecture/history/`
- [ ] `CLAUDE.md` contains only §3's laws plus pointers
- [ ] `docs/adr/` exists; ADR-001 through ADR-013 written before code
- [ ] `pnpm verify` is defined and green on an empty repo
- [ ] Phase 0 is specified as a vertical slice, not a framework-building project
- [ ] No code is generated from metadata before the four-plane ownership rules are encoded
- [ ] The tenant/RLS proof is wired as a blocking gate before Phase 2 begins
- [ ] Package and runtime versions are pinned in manifests, not duplicated in architecture prose
- [ ] The nine validation scenarios (Part II) are entered as test cases, not left as prose

---

## Conclusion

```
Frontend-led discovery
       ↓
Typed API contract           ← authority
       ↓
Generated client + mocks     ← the highest-leverage decision here
       ↓
Explicit application/domain logic
       ↓
Relational PostgreSQL truth

Metadata      → bounded composition; never owns persistence
Policy        → one system; permission codes + organisational scopes
Localisation  → versioned packs with per-domain contributions
Compliance    → separate async adapters; never coupled to the ledger
Events        → transactional outbox, at-least-once, idempotent consumers
Jobs          → replaceable durable executor
AI            → authorised tools; consequential ones authored, not generated
```

The differentiator is not a framework. It is a **canonical spine plus mechanically enforced boundaries** that lets Claude Code move fast without converting speed into entropy.

> **Xforge should feel configurable like ERPNext, modular like Odoo, contract-driven like a modern SaaS platform, and maintainable like a deliberately boring TypeScript codebase.**

Six defects were found by walking nine scenarios. That number is the most useful thing in this document — not because six is small, but because they were found on paper rather than in production. **The next architectural change arrives as an ADR, and the next validation scenario arrives as a failing test.**
