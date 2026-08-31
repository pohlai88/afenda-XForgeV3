# Xforge — Canonical Reference Architecture v2

**Status:** Consolidated from `v1-1`, `v1-2`, `v1-3` (themselves merged from `architecture-{1,2,3}`)
**On approval:** write to `.architecture/xforge-canonical-reference-architecture-v2.md`, archive v1-*, scaffold Phase 0.

---

## 0. How to read this

Three independent v1 syntheses now exist. They **converged** on the architectural spine — four separated planes, modular monolith, OpenAPI-as-authority with generated mocks, RLS-enforced tenancy, tenant ≠ legal entity, outbox + durable jobs, AI-above-the-API, machine-enforced laws. Independent convergence from three directions is the strongest evidence available that the spine is right, and v2 treats it as **settled**.

Five decisions still differed. Section 2 resolves each and states which version won. Nothing else in this document is new invention — v2's job is to be *stable*, not clever.

**Decision stability, stated honestly:**

| Tier | Meaning | Sections |
|---|---|---|
| **Frozen** | Convergent across all three; changing it is a rewrite. Requires an ADR reversal. | §3–§9, §11–§12, §15 |
| **Settled** | Resolved in §2 from a real conflict. Revisit only with new evidence. | §2 |
| **Reversible** | Deliberately cheap to change; do not spend a week debating. | jobs vendor, search engine, charts, object store |
| **Unverified** | Claims in the source documents I cannot confirm. Must be checked in Phase 0. | §23 |

---

## 1. Locked decisions

| Decision | Choice |
|---|---|
| Product model | Cloud SaaS only; portability preserved as an architecture property, not a v1 promise |
| Language | TypeScript, `strict`, end-to-end |
| System shape | Strict modular monolith |
| API | REST + OpenAPI 3.1, externally consumable, canonical authority |
| Delivery sequence | Frontend-led; contract-before-handler |
| **First vertical** | **HRMS + Payroll** |
| **Launch jurisdiction** | **Malaysia only** |
| Tenant isolation | Shared schema + `tenant_id` + RLS; dedicated-DB tier later, same codebase |
| Tenant URL | Platform subdomain default; custom domain on paid tiers |
| AI | Native platform layer using authorised application tools; never privileged DB access |
| AI channels | In-app first; WhatsApp later |
| Architecture surface | Full ERP, all of SEA |

> **The single most important line: architect for the full surface, ship one vertical in one country.** The country-pack and module-manifest architecture is precisely what makes that a first step rather than a corner painted into. Narrow delivery, wide architecture.

**Canonical thesis:** *Explicit core. Metadata at the edges. Contract in the middle.*

And the constraint traditional ERPs were never designed around:

> Claude Code must find **one obvious place** for every fact, make a small change, get deterministic feedback in seconds, and leave the repository cleaner rather than more magical.

---

## 2. The five remaining conflicts, resolved

### 2.1 May a Server Component read the domain directly? — **v1-2 wins**

The sharpest conflict across every draft. v1-3 said "always through the generated client, escape hatch by ADR." v1-1 said "a contract-bound server transport." v1-2 gave the only version that is both fast and mechanically safe:

- Every **read** operation in the OpenAPI document also emits a **server-side query facade keyed to the same `operationId`**. An RSC calls `serverQuery.listEmployees(...)` in-process — no HTTP hop, no second contract.
- Every **write** goes over HTTP through the generated client. No exceptions. No Server Actions for business operations.
- **A CI guard asserts** every facade function maps to a live `operationId`, and that the facade contains no writes. Drift fails the build.

This keeps the performance win *and* the single-contract guarantee, and neither depends on anyone remembering a rule. A discipline rule that only lives in prose is decoration; this one is enforced.

### 2.2 Money representation — **v1-2's precision, v1-1's split**

| Kind | Representation |
|---|---|
| **Monetary amounts** | `bigint` **minor units**, always paired with currency code **and its minor-unit scale** |
| **Unit prices, quantities, FX rates, tax rates, allocation ratios** | `numeric` with explicit scale per semantic type |
| **`price × quantity → amount`** | **One explicit, tested rounding function.** Nowhere else. |

v1-2's catch that settles it: **the minor-unit scale is data, not an assumption.** VND has 0 decimals, most SEA currencies have 2, some instruments need 3. Hardcoding "×100" is a defect waiting for the Vietnam country pack.

The `price × quantity` step is where naive implementations lose cents at scale. Making it one named function is the difference between a rounding bug you can find and one you cannot.

**No IEEE-754 float touches financial truth, anywhere, ever.** Rounding rules are explicit and domain-owned.

### 2.3 AI tool exposure — **v1-1 wins, and this is a safety correction**

v1-2 and v1-3 both said "tools are generated from metadata, so AI capability grows for free as modules ship." That is true and it is also dangerous. v1-1's §18.2 is the mature position:

> Metadata may generate **read · list · search · draft-create** tool descriptors. It must **never** automatically expose an entity mutation merely because the entity exists.

High-consequence actions are **explicitly authored tools** bound to application commands — `approve_payroll_run`, `release_bank_file`, `post_journal_entry`, `submit_einvoice`. Adding an entity must not silently grant an agent the ability to approve payroll. Capability growth is a feature for reads and a liability for writes.

### 2.4 Component primitives — **defer with a named check**

v1-1 and v1-2 both specify "shadcn/ui + Base UI," with v1-2 marking it "verified: default since July 2026." **That date is after my knowledge cutoff and I cannot confirm it** — so v2 does not assert it either way.

The stable resolution: **run `shadcn init` at Phase 0 and take its current default.** Then run v1-2's genuinely useful concrete check — Base UI was noted as lacking **Context Menu, Hover Card, and Toast**. Confirm whether that still holds and whether any is on the Phase 2 critical path; if so, plan the substitute before building 300 screens on it.

This is robust whichever way the fact falls, which is the point.

### 2.5 Phase order: design system before metadata engine — **v1-3's ordering, with v1-1's reason**

v1-2 put the metadata engine at Phase 2 and the design system at Phase 3. That inverts a real dependency: **the metadata renderer consumes design-system primitives.** Building `<EntityForm>` and `<EntityList>` before tokens, the grid, and the form primitives exist means building them twice.

v1-1 combined both into one phase, which is closer to reality but hides the sequencing inside it. v2 splits them and states the dependency: **Phase 2 design system → Phase 3 metadata kernel built on top.**

### 2.6 Converged — no longer open

| Question | Settled position |
|---|---|
| Metadata scope | Four separate planes; none generates the others |
| HTTP framework | Hono — one app, three hosts (route handler / standalone / worker) |
| Client generation | OpenAPI → Orval → client + Query hooks + MSW mocks |
| Tenant model | Better Auth owns identity + membership; ERP owns `tenant → legal_entity → business_unit → location` |
| Authorization | One system: `packages/policy`. Permission codes + organisational scopes |
| Custom fields | JSONB + GIN, promoted to a generated column on measured need |
| Jobs | Outbox is the durable truth; Trigger.dev is a swappable executor |
| Search | Postgres FTS + `pg_trgm` + `unaccent` until profiled |
| `CLAUDE.md` | Ten to twelve laws plus a pointer. Never a manual |

---

## 3. Architecture laws

The entire content of `CLAUDE.md`. Everything else lives in `docs/architecture/` and is linked, never inlined.

```
# Architecture laws

1.  UI reaches the server only through the generated client, or the generated
    read-only server query facade. Never repositories, never Drizzle.
2.  Modules never import another module's repository, schema, or UI.
    Cross-module communication is application interfaces and domain events.
3.  Database access exists only in repositories, and only via withTenant().
4.  Every tenant-owned table has tenant_id, with RLS enabled AND forced.
5.  The API contract changes before the implementation does.
6.  Generated files are never edited. `pnpm generate && git diff --exit-code` passes.
7.  Historical financial and payroll records are immutable.
    Correct by reversal and replacement, never by update.
8.  Country rules live in localisation packs. No country conditionals in core.
9.  AI uses authorised application tools. AI never receives a database connection.
10. Metadata never auto-exposes a mutation tool. High-consequence tools are authored.
11. No IEEE-754 float represents monetary truth.
12. `pnpm verify` is authoritative. A red build is a stop, not a discussion.

Canonical architecture: docs/architecture/*
```

**Every law has a mechanical guard (§17).** A law enforced only by prose is decoration.

---

## 4. Canonical stack

| Layer | Choice | Note |
|---|---|---|
| Language / runtime | TypeScript `strict` · Node 24 LTS | |
| Monorepo | pnpm 11 · Turborepo · Biome | |
| Framework | Next.js 16 App Router · React 19 | Turbopack; deepest training data, which is a technical requirement here |
| Components | shadcn/ui, primitives per `shadcn init` default (§2.4) | Open-code — Claude edits them directly |
| Styling | Tailwind v4 · OKLCH semantic tokens | Per-tenant theming is a variable swap |
| Grid | TanStack Table + virtualisation | ERP is grids |
| Server state | TanStack Query v5 | Hooks generated by Orval |
| Forms | React Hook Form + Zod | |
| Palette | cmdk | Primary navigator, not a menu tree |
| i18n | next-intl (ICU) | EN · BM · 中文 at launch |
| Charts | Recharts | *Reversible* |
| UI workshop | Storybook · MSW | Frontend-first requires both |
| **Contract** | **OpenAPI 3.1** | Canonical authority |
| **Generation** | **Orval** → client · Query hooks · MSW mocks | Derived state, never edited |
| HTTP | Hono + `@hono/zod-openapi` | One app, three hosts |
| Docs | Scalar | From the same spec |
| ORM | Drizzle + explicit SQL | SQL stays visible |
| Database | PostgreSQL 17 · Neon | Branch-per-PR is unusually valuable for agents |
| Isolation | `tenant_id` + RLS (`pgPolicy`, forced) | Database invariant, not convention |
| Auth | Better Auth behind `packages/auth` | Identity + membership only |
| Authorization | `packages/policy` | Permission codes + organisational scopes |
| Events | Transactional outbox in Postgres | The durable record of intent |
| Jobs | Trigger.dev behind `packages/jobs` | *Reversible* — outbox is the truth |
| Files | S3-compatible · Cloudflare R2 | *Reversible.* Egress economics matter in SEA |
| Search | Postgres FTS + `pg_trgm` + `unaccent` | *Reversible* |
| Vectors | pgvector, tenant filter **inside** the query | |
| AI | Vercel AI SDK + gateway; Claude primary | Provider-neutral at runtime |
| Email | Resend + React Email | |
| Observability | OpenTelemetry · Sentry · structured logs · **immutable in-DB audit** | |
| Tests | Vitest · fast-check · Testcontainers · Playwright | |
| Tenant domains | Vercel for Platforms, behind a provider interface | Cloudflare for SaaS later if economics justify |

**Excluded on purpose, each addable later only against a named and measured pain:** Kubernetes · microservices · Kafka · Redis · Elasticsearch · MongoDB · separate vector DB · GraphQL · tRPC-as-public-contract · Server Actions as business API · Prisma · MySQL · any ORM with lazy-loading magic.

---

## 5. The four planes

The resolution of the biggest conflict across every draft: separate concerns **without duplicating facts**.

| Plane | Authority | A change is | Layered by |
|---|---|---|---|
| **Data** | Postgres schema (Drizzle) | a reviewed migration | platform |
| **Contract** | OpenAPI 3.1 | a versioned contract change | platform |
| **Experience** | UI metadata rows | an instant config edit | platform → country → tenant → user |
| **Policy** | permissions · scopes · workflow | an audited config edit | platform → tenant |

They share stable identifiers via a **semantic registry** holding only what is genuinely cross-plane: entity id, field id, semantic type, reference target, label key, searchability, sensitivity classification, AI description, customisation capability.

**None of them generates the others.** The registry may generate safe repetitive artifacts, but generation is one-directional and gated: an entity definition *proposes* a migration; a human reviews and applies it.

Three invariants make this concrete:

- Changing `labelKey` must never alter a database column.
- Changing UI visibility must never relax API validation.
- Changing a custom field must never bypass policy.

> If the contract requires `customer_id`, tenant metadata saying `required: false` changes the form only. **The server contract stays authoritative.**

This is why the four-plane model is not pedantry: it is the specific thing that prevents Xforge becoming ERPNext in three years. A fused definition is wonderfully productive for eighteen months and then every concern contaminates every other one.

---

## 6. Metadata and customisation

### Overlay chain

```
System definition
      ↓   deterministic, typed, version-aware, conflict-detecting merge
Country pack          (MY inserts epf_socso_details into the `statutory` slot)
      ↓
Tenant customisation  (hide cost_centre; rename employee_code → staff_id)
      ↓
User personalisation  (saved view, column widths, filters)
```

The resolved configuration must be **inspectable** — an "effective configuration" view showing which layer contributed each value. Without it, debugging a tenant's form becomes archaeology.

### Stable slots, never inheritance

```
employee form
  slots: identity · employment · compensation · statutory · documents · activity
```

Overlays address slots **by name** — `insert tax_registration after customer`. No DOM selectors. No XPath. No hidden inheritance chain. Claude resolves the final structure statically; Odoo cannot.

### Hybrid storage — never EAV

| Tier | What | Storage | Migration cost |
|---|---|---|---|
| 1 | Core product fields | Real typed columns | Normal migration |
| 2 | Tenant custom fields | `custom` JSONB + registry row, GIN index | **Zero DDL** |
| 3 | Tenant custom entities | Generic JSONB-backed record store | **Zero DDL** |

Promotion on measured need:

```sql
ALTER TABLE employee ADD COLUMN cost_centre text
  GENERATED ALWAYS AS (custom->>'cost_centre') STORED;
CREATE INDEX ON employee (tenant_id, cost_centre);
```

A per-tenant **optimisation**, not a per-tenant **schema**. One migration path for every tenant — the single largest improvement over ERPNext.

> **Tier 3 is forbidden for accounting ledgers, payroll result ledgers, inventory movements, and statutory records.** Those stay first-class relational models. (v1-1 §8.3 — a safety rail the other drafts stated too weakly.)

### The two rules that stop this becoming Odoo

> **If exactly one entity needs a metadata capability, hardcode it.** Do not extend the metadata layer for a single caller.

> **Metadata-render** CRUD forms, lists, saved views, filters, search, simple dashboards, master data, config, approval states. **Hand-build** payroll processing, month-end close, bank reconciliation, inventory and manufacturing planning, POS, quotation builders, executive workspaces, and the AI workbench.

Escape hatches are first-class: any entity may override its generated form with a hand-written component. The generator is a productivity default, **not a prison**.

---

## 7. Modular monolith

One deployable. Boundaries enforced as if they were already services.

```
/
├─ apps/           web · api · worker              executable compositions
├─ modules/        hr · payroll  → later: contacts · crm · catalog · sales
│                  purchasing · inventory · accounting · projects · pos
├─ packages/       api · api-client[GEN] · ui · tokens · db · auth · tenancy
│                  organization · policy · metadata · metadata-ui · workflow
│                  audit · events · jobs · files · notifications · integration
│                  localisation · compliance · ai · money · testing
├─ contracts/      OpenAPI documents + snapshots
├─ tooling/        guards · generators · verify
├─ docs/           architecture/ · adr/
└─ CLAUDE.md
```

`packages` = platform primitives · `modules` = business capabilities · `apps` = compositions.

**Dependency direction, mechanically enforced:**

```
apps → modules → platform packages → shared primitives

Inside a request:
  HTTP handler → application command/query → domain policy → repository → PostgreSQL
```

> **The platform kernel must not know Payroll exists.** Business modules depend on the kernel; the kernel never depends on a module. Cyclic dependencies fail CI.

A module communicates only through another module's public application interface, domain events, or shared platform capabilities — never by importing its repository, Drizzle tables, or private UI.

### Module manifest

```ts
// modules/payroll/manifest.ts
export default {
  id: 'payroll', version: '0.1.0',
  dependsOn: ['hr'],
  permissions: ['payroll.run.calculate', 'payroll.run.review', 'payroll.run.approve'],
  entities: ['payroll_run', 'payslip', 'payslip_line'],
  emits: ['payroll.run.approved'],
  consumes: ['hr.employee.updated'],
  countryExtensions: ['my'],
  navigation: [...], workflows: [...], featureFlags: [...],
};
```

### One host, three mounts

Hono runs unchanged in all three, from one source. The split becomes a deployment decision, never a rewrite:

```
packages/api/                              ← transport-agnostic app
apps/web/app/api/[[...route]]/route.ts     ← mounts it today
apps/api/server.ts                         ← mounts it when we split
apps/worker/                               ← imports the same commands
```

---

## 8. Multi-tenancy

### Four distinct concepts, never collapsed

```
USER ──membership──► TENANT
                       ├── LEGAL ENTITY (Sdn Bhd A) ── own EPF / SOCSO / LHDN registration
                       ├── LEGAL ENTITY (Sdn Bhd B)
                       └── BUSINESS UNIT ──► branch · site · warehouse · department
```

A SaaS tenant is not a legal entity. A legal entity is not the authorisation boundary. **A Better Auth organization is not the ERP topology.**

For this product that is not abstract: a Malaysian group with three `Sdn Bhd` entities is one tenant with three legal entities, each with its own statutory employer registrations, each filing its own EA forms. **Payroll runs scope to `legal_entity`, never to tenant.** Collapsing these makes correct Malaysian payroll impossible without a rewrite — which is why it is modelled in Phase 1, before anything depends on it.

### RLS — the details that separate working from theatre

```sql
ALTER TABLE employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee FORCE  ROW LEVEL SECURITY;   -- applies to the owner too
CREATE POLICY tenant_isolation ON employee
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

1. **Never connect as the table owner.** RLS silently skips owners and superusers. Use a dedicated `app_user` role without `BYPASSRLS`; `FORCE ROW LEVEL SECURITY` is the second line of defence.
2. **`SET LOCAL`, never `SET`.** Tenant context must be transaction-scoped. Under a pool, a session-scoped variable leaks to whichever tenant borrows that connection next.
3. **Neon's HTTP driver cannot hold session state across statements.** Use the pooled WebSocket driver for anything RLS-scoped.
4. **One chokepoint.** `withTenant(tenantId, fn)` is the only sanctioned way to obtain a handle. Nothing else opens a connection.

Indexes are tenant-leading: `UNIQUE (tenant_id, code)`, `INDEX (tenant_id, status)`, `INDEX (tenant_id, created_at)`. Business identifiers are unique **per tenant**, never globally.

**Isolation tiers.** The tenant row carries `isolation: 'pooled' | 'regional' | 'database'`. A connection resolver reads it; **all other application code is identical.** An enterprise or residency deal gets its own database without a fork. Do not build the dedicated tier before a contract requires it.

### Tenant URL

```
app.xforge.com      platform · marketing · signup
acme.xforge.app     wildcard subdomain — instant on signup, free tier
hr.acme.com.my      custom domain — paid tier, DNS-verified, automatic TLS
```

```
tenant_domain(id, tenant_id, hostname, type, verification_status, is_primary, verified_at)
```

```
HTTP Host → domain resolver (Edge Config, no DB round trip)
          → candidate tenant context
          → authenticated membership check
          → request tenant context
```

> **The hostname resolves a *candidate* tenant. It never authorises.** The resolved tenant is cross-checked against the session; a mismatch is rejected. `x-tenant-id` is a routing hint, never an authorisation claim.

---

## 9. Authorization

Three layers, never collapsed into one:

| Layer | Mechanism | Fails safe? |
|---|---|---|
| Authentication | Better Auth behind `packages/auth` | — |
| Tenant isolation | Postgres RLS | **Yes** — structural, cannot be forgotten |
| Business authorization | `packages/policy` | Compiled to SQL predicates + response filters |

Permission codes are `module.resource.action`; scopes are organisational:

```
payroll.run.approve      scope: legal_entity = MY01
hr.compensation.read     scope: business_unit = BU-KL
hr.employee.read         scope: own
```

Scopes: `tenant · legal_entity · business_unit · department · location · team · own`.

RBAC plus scoped ABAC without adopting a relationship-authorization platform. Tenants define their own roles — as rows in our tables, not in the auth library, because splitting authorization across two systems recreates the "four approximately-correct locations" failure. Add OpenFGA or Permify only when a customer genuinely needs relationship rules ("managers of the branch that owns the project").

---

## 10. Frontend

**API-first is architectural authority. Frontend-first is development order.** They were never in conflict.

Per feature, every time:

1. Design the experience — screens, states, actions, validation, empty, error, loading, permission-denied.
2. Declare **only** the API operations that experience requires.
3. `pnpm generate` → typed client, Query hooks, MSW mocks.
4. **Build the complete frontend against mocks.** No database, no backend, no infrastructure.
5. Implement handlers against the now-frozen contract.
6. Contract + integration + Playwright tests before merge.

This is the highest-leverage workflow in the entire architecture for agent-driven development: Claude can finish an entire screen before the database exists.

**UX commitments — the actual competitive wedge:**

- **Command palette as primary navigator.** ERP menu trees are where usability dies.
- **Excel-grade grid.** Keyboard navigation, frozen columns, inline edit, saved views per user, bulk edit, undo. The most-noticed daily difference against ERPNext's list view and Odoo's tree view.
- **Optimistic mutations everywhere.** Perceived latency is the whole game on 4G in Johor, Jakarta, or Hanoi.
- **Mobile-first PWA, not a separate app.** SEA workforces are mobile and deskless. Service worker + IndexedDB outbox. Native later as a wrapper, never a rewrite.
- **Design tokens before the first screen.** This is what stops agent-written UI drifting across 300 screens.
- **Performance budget as a CI gate.** ≤180KB JS critical path, LCP <2.5s on throttled 4G. Enforced, not aspirational.

**The mechanical rule:** server components fetch and compose; client components are `'use client'` and own all interactivity; **writes go through the generated client, reads may use the operationId-keyed server query facade** (§2.1); no Server Actions for business operations.

---

## 11. Money, commands, immutable records

Money representation is §2.2. Two further invariants:

### Explicit commands, never status patches

```
POST /payroll-runs/{id}/calculate        not  PATCH { status: 'calculated' }
POST /payroll-runs/{id}/approve
POST /journal-entries/{id}/post
POST /stock-transfers/{id}/post
```

The command expresses a business transition and gives the invariants exactly one place to live. The patch bypasses them.

### Immutable history

Posted records are never mutated. Corrections are **original + reversal + replacement**. This is what makes audit, reconciliation, AI explanation, compliance, debugging, and historical reproduction safe simultaneously.

Property tests written **before** the implementation: debits equal credits · posting is idempotent · reversal fully neutralises the original · subledger reconciles to GL · stock quantity × valuation reconciles to the GL balance · allocation rounding conserves the total.

These domains are **not** candidates for metadata-generated business logic, and not candidates for unsupervised agent authorship.

### Workflow, restrained

Metadata defines states, transitions, permitted roles, conditions, notifications, SLA — **when** something may happen. Application commands define **what** actually happens.

> That division is the only thing preventing a workflow engine from slowly becoming a badly-designed programming language.

---

## 12. Payroll — the launch vertical

```ts
calculatePayroll(
  employeeSnapshot,   // immutable copy of employee state at run time
  periodInputs,
  rulePack,           // versioned, effective-dated statutory rules
  period,
): PayrollResult      // deterministic; no I/O, no DB access
```

**Invariants:**

- **No I/O inside the engine.** Pure input → output is exhaustively testable and reproducible in an audit three years later.
- **Integer minor units throughout**; `numeric` only where §2.2 says so.
- **Statutory rates are versioned data, never code.** EPF, SOCSO, and EIS are **wage-band lookup tables**, not clean percentages — encoding them as formulas is a known, expensive mistake. An annual rate change must be a data row, not a deploy.
- **Runs are immutable**; corrections are reversal + replacement.
- **Runs scope to `legal_entity`.**
- Every rule carries `jurisdiction · effective_from · effective_to · version · authority_reference · source_revision`. **Historical rules are never overwritten.**

**Malaysian scope at launch:** EPF (KWSP) · SOCSO (PERKESO) · EIS (SIP) · PCB/MTD with CP38 · HRD Corp levy · Borang EA and CP8D · Employment Act 1955 leave entitlements as amended 2022 · bank giro files. Statutory employer registrations live on `legal_entity`.

> **Implementation flag, carried through every version and worth repeating:** every rate, wage ceiling, and tax table must be sourced from current official LHDN / KWSP / PERKESO publications at build time and encoded with its effective date. **Take no figure from memory, from a model, or from this document.** Figures shift annually and a stale table is a compliance liability.

---

## 13. Country packs and compliance

Never write `if (country === 'MY')` in core.

```
CORE  +  COUNTRY PACK  +  TENANT CONFIGURATION
```

`packages/localisation/{my,sg,vn,id,th,ph}/` contributes tax and payroll rules, statutory identifiers, bank formats, public holidays, currency and rounding defaults, address formats, numbering schemes, employment rules, local reports, CoA templates, translations, and country metadata overlays.

**Compliance adapters are separate from country rules** (`packages/compliance/{core,my-myinvois,sg-invoicenow,vn-einvoice,id-coretax,th-etax,ph-eis}/`). An adapter owns protocol mapping, credentials, submission queue, retry, authority status model, and receipt archival. **It does not own the ledger.**

### Not in v1 build scope — but the architecture must accommodate it

Malaysia, Indonesia, and Vietnam run **Continuous Transaction Control**: the authority must clear an invoice before it is legally valid. Two structural consequences that are cheap now and expensive to retrofit:

1. **The ledger must never depend on a clearance call succeeding synchronously.** Post the entry, write the outbox event, submit asynchronously, reconcile after.
2. **`pending → cleared → rejected → amended` is first-class invoice state**, not an error path. Clearance failure is a normal Tuesday.

Regional traps worth recording now: Indonesia's *Faktur Pengganti* correction requires buyer confirmation in their own Coretax account before reaching "Amended" — a state machine, not an edit. Thai has no inter-word spaces (line-breaking and truncation both need care). Vietnamese needs diacritic-insensitive search (`unaccent` plus a normalised column). Thai dates commonly use the Buddhist Era (BE = CE + 543) — store UTC, render per locale. Domestic QR rails (DuitNow, QRIS, PromptPay, VietQR, PayNow) are essential rather than optional when payments arrive.

> These are recorded so the architecture does not preclude them. **None is built in v1.**

---

## 14. Async: outbox and jobs

```sql
BEGIN;
  UPDATE payroll_run SET status = 'approved' WHERE ...;
  INSERT INTO outbox_event (topic, payload, tenant_id)
    VALUES ('payroll.run.approved', ..., ...);
COMMIT;
```

**The outbox is the durable record of intent**, written in the same transaction as the business change. The job runner is only an *executor* reading from it — which is what makes the runner swappable behind `packages/jobs`, and why the vendor choice is reversible in an afternoon and should not be argued about for a week.

Durable jobs cover payroll batch orchestration, large imports, PDF and bank-file generation, bulk export, email, e-invoice submission and retry, inventory costing, AI document processing, scheduled reports, and webhook delivery. **Idempotency keys on every task — payroll must never double-pay.**

No Kafka. No distributed transactions. If scale ever demands a broker, the outbox is already the bridge to it.

---

## 15. AI layer

AI is a first-class **client**, never a privileged backend.

```
            AI / Agent
                 │
          AI policy + tool registry
                 │
        application command / query
                 │
          normal authorization
                 │
         tenant context / RLS
                 │
          repositories / database
```

An agent never receives `DATABASE_URL` and never authors SQL. It receives tools, and every tool runs under the same tenant context, authorization, validation, audit, and domain rules as a human.

**Guardrails, all non-negotiable:**

1. **Tool generation is bounded** (§2.3): metadata may generate `read · list · search · draft-create`. High-consequence actions are explicitly authored tools bound to application commands.
2. **AI proposes, human approves, system executes** for anything financially or statutorily consequential. `draft_purchase_order()` → DRAFT → approval → `submit_purchase_order()`. Never AI → INSERT.
3. **AI never bypasses RLS.** It executes in the caller's tenant context, without exception.
4. **RAG tenant filtering happens inside the query.** Never rank globally and filter after — that is a data leak with extra steps. Every embedding row carries `tenant_id · source_type · source_id · classification · permissions`.
5. **Document extraction has confidence thresholds** and a human review queue. Never guess a number into a payslip.
6. **Agent identity is distinct from user identity** — separately scoped, separately revocable.
7. **Every AI action is audited** with provider, model, tool, actor/agent identity, timestamps, and outcome.
8. **The AI app-builder ships last**, once metadata and policy semantics are proven by real modules.

Provider-neutral via the AI SDK, so per-tenant and per-workload model routing — a cheap model for classification, a strong one for analysis — is configuration, not code.

---

## 16. Verification

### One canonical gate

```bash
pnpm verify   # generate-drift → architecture guards → tsc --noEmit → lint
              # → unit → contract → RLS → integration → build → selected E2E
```

Heavy suites may be staged or cached, but there is exactly **one** semantic definition of green.

### Tenant isolation — blocking, Phase 1

Testcontainers or an isolated Neon branch: seed at least two tenants; run as the **real non-owner app role**; set tenant context transactionally; **enumerate every tenant-scoped table dynamically** so a newly added table cannot silently escape; prove tenant A can neither read nor write tenant B's rows; prove a host/session tenant mismatch is rejected; fail the build if any tenant table lacks an RLS policy.

**Do not pass this gate on manual inspection.**

### Payroll — blocking, Phase 5

Per rule-pack version: golden fixtures from official published tables · wage-band boundary cases · joiner/leaver proration · unpaid leave · variable elements · age and category boundaries · gross = net + deductions exactly, in integer minor units · immutability and reversal · **deterministic replay: recomputing a historical run against its pinned rule-pack version reproduces the original payslip exactly.**

### Contract

OpenAPI validates as 3.1 · SDK and mocks regenerate clean · contract diff surfaced in review · breaking changes blocked unless explicitly versioned · every route has an `operationId` · **the server query facade contains no writes and every function maps to a live operationId.**

### E2E

Playwright against an isolated DB branch: signup → tenant + legal entity provisioned → employee created → payroll inputs → calculated → reviewed → approved → payslip generated → downloaded.

---

## 17. Agent operating model and enforcement

**Generated code is derived state.** `contracts/` → api-client · API docs · MSW mocks · fixtures. CI runs `pnpm generate && git diff --exit-code`. Far stronger than asking an agent to remember.

**Architecture guards — deterministic, not aspirational.** Each law in §3 has a check that fails the build:

```
UI importing db or drizzle
module importing a foreign module's repository
cyclic module dependency
tenant-scoped table missing tenant_id or an RLS policy
application role that is table owner or has BYPASSRLS
generated file modified by hand
route missing an operationId
server query facade containing a write, or an orphaned operationId
permission code used but not declared in a manifest
country conditional inside a core module
direct UPDATE/DELETE on a ledger or payroll-run table
float arithmetic in financial code paths
business mutation implemented as a Server Action
AI tool bypassing an application command or policy
metadata auto-generating a mutation tool
```

**Working shape.** Feature-slice: *"employee emergency contact: UX → contract → mocks → UI → handler → repository → tests"* is a good task. *"Build HRMS"* is not. Every slice has an observable outcome and an executable done-condition. One short ADR per non-obvious decision, so a future session inherits the reasoning instead of re-litigating it.

**Hand-specify what cannot be vibe-coded.** Payroll statutory calculation and ledger posting get a written spec, then property tests, *then* implementation against those tests. Everything else can be agent-authored against the guards.

---

## 18. Roadmap

| Phase | Scope | Blocking exit criterion |
|---|---|---|
| **0 — Spine** | Monorepo · Next.js · Hono route-contract pipeline · OpenAPI → Orval → MSW · Drizzle · Neon · CI · guards · ADR-001…008 | One trivial feature travels UX → contract → mock → frontend → handler → DB → Playwright green. **And at least three guards are proven to fail on deliberate violations.** |
| **1 — Tenancy kernel** | `tenant` · `legal_entity` · `business_unit` · membership · Better Auth facade · host resolution · RLS · `withTenant()` · policy engine | **Automated proof that tenant A cannot read or mutate tenant B data, across every tenant table, enumerated dynamically.** |
| **2 — Design system** | Tokens · component governance · grid primitives · form primitives · command palette · PWA shell · Storybook | A screen can be built entirely from system primitives with no bespoke CSS |
| **3 — Metadata kernel** | Semantic registry · four planes · overlay chain · slots · hybrid storage · `<EntityForm>` / `<EntityList>` renderers | An entity is defined once and is usable end to end, **and a form-label change provably issues no DDL** |
| **4 — HR core** | Person/employee/employment · org assignment · leave · claims · documents · approvals · audit | Onboarding plus leave request → approval → balance works end to end, mobile and desktop |
| **5 — MY payroll** | Immutable input snapshot · versioned MY rule packs · pure engine · review/approval lifecycle · payslips · bank files · EA/CP8D | **Golden and property tests green against published statutory tables; a full cycle completes through the UI** |
| **6 — AI** | Provider abstraction · tenant-scoped RAG · employee assistant · HR/payroll copilot · document intake · audited drafts | AI completes a useful end-to-end task while provably respecting the caller's tenant and permissions; no tool holds a DB connection |
| **7 — Integrations & tenant experience** | Custom domains · notifications · WhatsApp · webhooks · integration credentials | — |
| **8 — Second domain proves generality** | A materially different module (sales+inventory, or the finance spine) | **HR-specific assumptions are deleted from the metadata kernel** |
| **9 — Second country / enterprise isolation** | One next jurisdiction · its country pack · dedicated-DB tier if a deal requires it | — |

**Phase 0's guard-proving requirement is deliberate.** A guard that has never been observed to fail is not a guard — it is a comment.

**Phase 3 must serve Phase 4's real needs.** Build the metadata kernel for HR first. A metadata engine designed in the abstract becomes Odoo.

**Phase 8 is the generality gate:**

> **Generalise on the second real use case, not from imagination.** Do not claim Xforge is a generic ERP framework until a materially different domain has run through it and the HR-shaped assumptions have been removed.

---

## 19. Scale-out triggers

Do not extract infrastructure "because enterprise." Each of these is an **extraction, not a rewrite**, because of the boundaries above.

| Measured pain | Response |
|---|---|
| API workload independently saturates web | Stand up `apps/api` from the same Hono composition |
| Job throughput or visibility demands more | Dedicated worker runtime |
| Tenant requires residency or isolation | Dedicated regional database tier via the isolation resolver |
| Postgres search latency fails a UX SLO | Introduce a search service |
| Hot config lookup becomes a DB bottleneck | Introduce a cache/KV |
| Outbox volume requires a streaming backbone | Evaluate a broker; the outbox is already the bridge |

---

## 20. Explicitly rejected

Microservices day one · Kubernetes day one · GraphQL as the principal ERP API · tRPC as public contract · Server Actions as business API · RSC importing repositories · one mega metadata object generating all planes · EAV for normal business entities · per-tenant database as default · arbitrary tenant JavaScript in the backend · XML/XPath deep view inheritance · generic `BaseService<T>` · generic repository abstraction hiding SQL · event sourcing everything · Kafka/Redis/Elasticsearch before measured need · **AI direct SQL or database writes** · **metadata auto-exposing high-risk AI tools** · mutable posted financial records · country conditionals in core · **JS floating point for monetary truth**.

---

## 21. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Tenant data leakage | **Critical** | RLS forced · non-owner role · `SET LOCAL` · WebSocket driver · `withTenant()` chokepoint · dynamically enumerated CI proof |
| Agent-generated payroll bug | **Critical** | Pure engine · immutable snapshots · golden files from official tables · property tests · deterministic replay |
| Agent-generated ledger bug | **Critical** | Human-written spec and invariants **before** implementation · reconciliation property tests |
| AI exceeds authority | **Critical** | Tool-only access · bounded tool generation · policy layer · RLS · agent identity · draft-by-default · full audit |
| Metadata becomes another Odoo | **High** | Four planes · one-source-per-fact · 80/20 rule · one-entity rule · escape hatches · generalise only at Phase 8 |
| Architecture drift over long sessions | **High** | Small slices · ADRs · machine guards · generated code · one `pnpm verify` |
| Tenant ≠ legal entity found late | **High** | Modelled in Phase 1, before anything depends on it |
| Frontend inconsistency across 300 screens | **High** | Tokens first · component governance · Storybook · visual and E2E checks |
| Scope explosion | **High** | Malaysia HR/payroll wedge · blocking phase gates · one spec per phase |
| Country/compliance change | Medium | Effective-dated rules · versioned adapters · authority source tracking · never overwrite history |
| JSONB custom-field performance | Medium | Measure · GIN by default · deliberate promotion · per-tenant query-cost dashboard from day one |
| Vendor lock-in | Medium | Internal facades · Postgres/S3 portability · outbox · domain never imports a provider SDK |

**Non-goals for v1:** on-prem deployment · countries beyond Malaysia · accounting/inventory/CRM/manufacturing modules · e-invoicing · offline-first sync · public app marketplace · AI app-builder.

---

## 22. Portability rule

Even though v1 is SaaS-only: the Postgres schema stays provider-portable · files go through an S3-compatible facade · auth sits behind an internal facade · jobs are triggered through an internal interface and the outbox · **domain logic never imports a Vercel, Neon, or Trigger SDK** · the core stack runs locally under Docker Compose.

> Portability is an architecture property maintained continuously at near-zero cost. It is **not** a promise to support on-prem in v1.

---

## 23. Unverified claims and Phase 0 open items

**Claims in the source documents I could not verify — do not let these reach code unchecked:**

1. **"Base UI became the shadcn default in July 2026"** (v1-1, v1-2 — the latter marks it "verified"). This post-dates my knowledge cutoff. Resolution in §2.4: take the `shadcn init` default and check the Context Menu / Hover Card / Toast gaps.
2. **"Vercel acquired Better Auth on 7 July 2026"** (architecture-2). Also post-cutoff. It does not change the architecture — `packages/auth` stays a thin facade regardless — but confirm the licensing position before depending on it.
3. **"The team is Vietnam-based"** (v1-2 §20.5, used to argue for reconsidering the launch country). **I have no evidence for this.** If it is true, it is a genuine input to the Malaysia-vs-Vietnam decision; if it was inferred, it should not influence anything. Confirm before treating it as a factor.

**Verified during this work** (both load-bearing, so worth recording): Drizzle's `pgTable.withRLS` **denies all rows by default** when no policy is attached, and `pgPolicy` declarations live in the schema file so isolation ships as migrated, reviewable code. Better Auth's organization plugin carries `activeOrganizationId` on the session plus runtime-created roles — capable, but per §2.6 it stays scoped to identity and membership.

**Environment items:**

4. **Neon MCP auth failing (HTTP 401).** Refresh the token or provision Postgres via the Vercel Marketplace. Blocking for the branch-per-PR workflow.
5. **Vercel CLI not installed.** `npm i -g vercel` unlocks `env pull`, `deploy`, `logs`.
6. **Figma MCP needs interactive OAuth**, impossible in a non-interactive session. Only relevant if design handoff runs through Figma.
7. **Jobs vendor: Trigger.dev vs Inngest.** Decide in Phase 0, behind `packages/jobs`. Reversible — do not spend a week.

---

## Closing

Three independent syntheses converged on the same spine. That convergence is the strongest signal in this document, and v2 treats the spine as frozen:

**Explicit core, metadata at the edges, contract in the middle.** Four planes with separate authority, not one fused DocType. Business truth is explicit code and relational data; only repeatable UI structure is metadata; tenant variation is overlays; country variation is versioned packs.

**One contract, everything generated.** OpenAPI is the authority; Orval produces the client, the hooks, and the mocks; the frontend is finished before the backend exists.

**The database enforces tenancy, not the code.** RLS forced, non-owner role, `SET LOCAL`, one chokepoint, and an automated proof that tenant A cannot see tenant B.

**Ship Malaysia and payroll first.** Narrow delivery, wide architecture — the country-pack and module design is what makes that a first step rather than a trap.

**Laws are enforced by guards, and the guards are proven to fail.** That is the difference between an architecture that survives a year of agent-driven development and one that quietly dissolves into four approximately-correct locations for everything.
