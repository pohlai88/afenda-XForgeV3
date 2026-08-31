# Consolidated Reference Architecture — AI-Native, Metadata-Driven, Multi-Tenant Business Platform

**Version:** 1.0 (merged and reconciled)
**Supersedes:** `architecture-1.md` (Xforge), `architecture-2.md` (Meridian), `architecture-3.md` (2026 Reference Architecture)
**Constraints:** pure vibe coding by Claude Code · DRY + KISS · API-first authority · frontend-led sequence · multi-tenant with custom tenant URLs · metadata-driven · South East Asia

---

## How this document was produced

The three drafts agreed on roughly 70% of the stack and disagreed on five decisions that actually matter. This document takes the strongest position from each and **states the resolution explicitly** rather than averaging them.

**What each draft contributed:**

- **Draft 1 (Xforge)** — the operational specifics that are easy to get wrong and expensive to discover late: RLS pooler-leak mechanics, the `withTenant()` chokepoint, payroll as a pure function, money as integer minor units, versioned effective-dated statutory rule packs, and the single best gate in any of the three plans ("an automated test proves tenant A cannot read tenant B's rows").
- **Draft 2 (Meridian)** — market reality: SEA e-invoicing clearance models, language and calendar traps, payment rails, the UX decisions that actually differentiate against ERPNext/Odoo, and infrastructure staging.
- **Draft 3 (2026 Reference)** — the architectural spine: four separated planes instead of a fused DocType, modular monolith with enforced boundaries, frontend-first sequence reconciled with API-first authority, the Orval/MSW mock-driven development loop, deterministic overlays instead of inheritance, the transactional outbox, and mechanically enforced architecture laws.

**Where they conflicted, Draft 3 usually won on principle and Draft 1 usually won on implementation detail.** Section 2 shows the full reconciliation.

---

## 0. Scope and locked decisions

| Decision | Choice | Source |
|---|---|---|
| Hosting | Cloud SaaS only; self-host path preserved but not built | D1 |
| Language | TypeScript end-to-end, `strict` | all three |
| **Architecture spans** | Full ERP, all of SEA | D2, D3 |
| **Delivery starts with** | **HRMS + Payroll, Malaysia only** | D1 |
| Tenant isolation | Shared schema + Postgres RLS; dedicated-DB tier later, same codebase | all three |
| Tenant URL | Subdomain free; custom domain on paid tiers | D1, D2 |
| AI scope | Assistant, copilot, document intake, agentic automation, app-builder (last) | D1 |
| AI channels | In-app first, WhatsApp later | D1 |

**The most important line in this document:** *architect for the full surface, ship one vertical in one country.* The country-pack and module-manifest architecture (§6, §12) is precisely what makes that sequencing not a rewrite. Draft 1 was right to narrow delivery; Drafts 2 and 3 were right to keep the architecture wide.

**Scope discipline:** this is five-plus independent subsystems. This document specifies the **platform kernel plus the first vertical**. Every later phase gets its own spec. Do not attempt more than one phase per implementation cycle.

---

## 1. The architecture in one page

```
        UX requirement  ──────────────────────►  design first
              │
              ▼
      OpenAPI 3.1 contract          ◄── canonical authority for every operation
              │
      ┌───────┴────────┬──────────────┐
      ▼                ▼              ▼
 typed client    TanStack Query   MSW mocks      ← all GENERATED (Orval)
      │             hooks
      ▼
 ┌─────────────────────────────────────────────┐
 │  WEB  Next.js · React · shadcn/Base UI      │
 │  hand-built UX  +  metadata renderer         │
 └────────────────────┬────────────────────────┘
                      │ HTTP only
 ┌────────────────────▼────────────────────────┐
 │  MODULAR MONOLITH (Hono, one deployable)    │
 │  handler → command/query → policy → repo    │
 │  contacts · crm · catalog · sales · purch.  │
 │  inventory · accounting · hr · payroll      │
 └────────┬───────────────────────┬────────────┘
          ▼                       ▼
   PostgreSQL                 outbox → jobs
   RLS · JSONB · FTS · pgvector    (durable, idempotent)
                                       │
                                       ▼
                          integrations · webhooks · statutory APIs

 ┌──────────────────────────────────────────────────────────┐
 │ PLATFORM KERNEL (must not know Sales exists)             │
 │ identity · tenancy · organisation · policy · metadata    │
 │ workflow · audit · files · events · jobs · notifications │
 │ integration · localisation · AI                          │
 └──────────────────────────────────────────────────────────┘

 AI sits ABOVE the application layer and calls authorised tools only.
```

**The five-word summary, taken from Draft 3 because it is the correct one:**

> **Explicit core. Metadata at the edges.**

Not *everything is metadata*. Not *everything is a microservice*. Not *everything is configurable*.

---

## 2. Reconciliation ledger — the five real conflicts

### 2.1 Metadata: "one definition → seven artifacts" vs "four separated planes"

**The conflict.** Drafts 1 and 2 proposed a single entity definition that generates schema, API, UI, permissions, audit, and AI tools. Draft 3 argued that this is exactly ERPNext's DocType — wonderfully productive early, and the reason all concerns eventually contaminate one another.

**Resolution: authored in one place, projected into four planes with different authority and different change semantics.**

| Plane | Authority | Change is | Scope |
|---|---|---|---|
| **Data** | Postgres schema | a reviewed migration | platform |
| **Contract** | OpenAPI 3.1 | a versioned contract change | platform |
| **Experience** | UI metadata rows | an instant config edit | platform → country → tenant → user |
| **Policy** | permissions, scopes, workflow | a config edit, audited | platform → tenant |

They share stable identifiers. **None generates the others.**

The rule that makes this concrete: *renaming a form label must never migrate the database, and no tenant configuration may relax a server-side business rule.* If the contract requires `customer_id`, experience metadata saying `required: false` changes the form only. The server contract stays authoritative.

Draft 1's DRY payoff survives — you still author a field once — but the four planes have separate lifecycles, so tenant customisation cannot reach into the schema and a UI tweak cannot break a ledger.

### 2.2 API transport: Hono-in-Next vs standalone Fastify

**The conflict.** Drafts 1 and 2 mounted Hono inside a Next.js route handler (one deployable, KISS). Draft 3 wanted a genuinely separate `apps/api` on Fastify so the API is not a Next.js implementation detail.

**Resolution: Hono, in both shapes, from the same source.**

Hono runs unchanged as (a) a Next.js route handler, (b) a standalone Node server, and (c) inside the worker process. Fastify does not. This satisfies Draft 3's real requirement — a canonical, independently deployable API — while keeping Draft 1's single-deployment simplicity today. The split becomes a deployment decision, not a rewrite.

```
packages/api/          ← the app, transport-agnostic
apps/web/app/api/[[...route]]/route.ts   ← mounts it (today)
apps/api/server.ts                       ← mounts it (when we split)
apps/worker/                             ← imports the same commands
```

### 2.3 Client generation: `hono/client` type inference vs Orval + MSW

**The conflict.** Draft 1 chose `hc` for zero-codegen end-to-end inference. Draft 3 chose Orval generating client, TanStack Query hooks, and MSW mocks from OpenAPI.

**Resolution: Draft 3, decisively.** `hc` gives type inference but no mocks and no partner SDK, and it quietly makes the TypeScript types — not the OpenAPI document — the real contract, which is the opposite of API-first.

The mock generation is the point. It unlocks the single highest-leverage vibe-coding workflow across all three drafts:

```
UX design → OpenAPI operations → pnpm generate → complete frontend against MSW
                                                  ↓
                              backend implemented later against a frozen contract
```

Claude Code can finish an entire screen — states, validation, empty, error, loading — before the database exists. Nothing else in these documents compresses the feedback loop as much.

### 2.4 May a Server Component call the domain layer directly?

**The conflict, and it is the sharpest one.** Draft 1: "RSCs call `packages/core` directly — never HTTP to our own API," to avoid the self-fetch anti-pattern. Draft 3: "UI talks only through generated API clients. Never UI → repository, never UI → Drizzle."

Both are right about something. Self-fetching over HTTP on the same host is real waste; a second, uncontracted path into the domain is real architectural decay.

**Resolution: one contract, two transports, mechanically verified.**

- Every **read** operation in the OpenAPI document also emits a server-side query facade keyed to the same `operationId`. An RSC may call `serverQuery.listEmployees(...)` in-process. No HTTP hop, no second contract.
- Every **write** goes over HTTP through the generated client. No exceptions, no Server Actions for business operations.
- A CI guard asserts that every function in the server query facade maps to a live `operationId`, and that the facade is read-only. Drift fails the build.

This keeps Draft 1's performance win and Draft 3's contract guarantee, and neither depends on anyone remembering the rule.

### 2.5 Jobs: Inngest vs Trigger.dev vs pg-boss

**The conflict.** Draft 1 chose Inngest for step-level durability ("payroll must never double-pay"). Draft 3 chose Trigger.dev for task-level idempotency keys. Draft 2 chose pg-boss to avoid a vendor entirely.

**Resolution: reframe the question so the choice stops mattering.**

The **transactional outbox in Postgres is the durable record of intent** (Draft 3's idea, and the correct one). It is written inside the same transaction as the business change. The job runner is only an *executor* reading from it.

```sql
BEGIN;
  UPDATE payroll_run SET status = 'approved' ...;
  INSERT INTO outbox_event (topic, payload, tenant_id) VALUES ('payroll.run.approved', ...);
COMMIT;
```

That makes the runner swappable behind `packages/jobs`. **Recommendation: Trigger.dev** — task-level idempotency keys, and self-hostable, which preserves the residency path in §12. Inngest is an equally defensible pick; pg-boss is the fallback if you want zero vendors. Because the outbox is the source of truth, this decision is reversible in an afternoon, which is why it should not be argued about for a week.

### 2.6 Smaller reconciliations

| Question | D1 | D2 | D3 | **Resolved** |
|---|---|---|---|---|
| Tenant model | Better Auth org | Better Auth org | own model | **D3.** Better Auth owns identity and membership. The ERP owns `tenant → legal_entity → business_unit → location`. An auth library's Organization is not an ERP topology. |
| Money type | `bigint` sen | `numeric` | — | **D1, refined.** Monetary amounts: `bigint` minor units + currency + minor-unit scale. Unit prices and quantities: `numeric` with explicit scale. The `price × qty → amount` rounding step is one explicit, tested function. |
| Component primitives | Radix | Radix | Base UI | **D3, verified.** Base UI has been the shadcn default for new projects since July 2026, and it ships Combobox, Autocomplete, and Number Field — the three primitives an ERP needs most. Radix stays supported; this is a greenfield, so take the default. |
| Custom field storage | JSONB + promote | JSONB + generated cols | JSONB or side table | **Converged.** JSONB + GIN, promoted to a generated column on measured need. |
| Search | Postgres FTS | FTS → Meilisearch | FTS + trigram | **Converged.** Postgres FTS + `pg_trgm` + `unaccent`. No second datastore until profiled. |
| `CLAUDE.md` size | medium | large | ~10 laws | **D3.** Ten laws plus a pointer. A 2,000-line manual is not followed. |
| Launch country | MY only | pick one, MY | SEA packs | **D1 for delivery, D3 for structure.** |

---

## 3. The ten architecture laws

This is the entire content of `CLAUDE.md`. Everything else lives in `docs/architecture/` and is linked, not inlined.

```
# Architecture laws

1.  UI talks to the server only through the generated client, or through the
    generated read-only server query facade. Never through repositories or Drizzle.
2.  Modules never import another module's repository, schema, or UI.
    Cross-module communication is application interfaces and domain events.
3.  Database access exists only in repositories, and only via withTenant().
4.  tenant_id is mandatory on every tenant-owned table, with RLS enabled and forced.
5.  The API contract changes before the implementation does.
6.  Generated files are never edited. `pnpm generate && git diff --exit-code` must pass.
7.  Historical financial and payroll records are immutable. Correct by reversal, never by update.
8.  Country-specific rules live in localisation packs. No country code in core.
9.  AI uses authorised application tools. AI never receives a database connection.
10. `pnpm verify` is authoritative. A red build is a stop, not a discussion.

Canonical architecture: docs/architecture/*
```

Every one of these is backed by a mechanical guard (§15). Laws that depend on an agent remembering them are decoration.

---

## 4. Canonical stack

| Layer | Choice | Note |
|---|---|---|
| Language / runtime | TypeScript `strict` · Node LTS | one language end to end |
| Package manager / monorepo | pnpm · Turborepo | |
| Frontend | Next.js App Router · React 19 | Turbopack, React Compiler on |
| Components | **shadcn/ui on Base UI** | open-code; Combobox / Autocomplete / Number Field matter for ERP |
| Styling | Tailwind v4 · OKLCH design tokens | per-tenant theming is a variable swap |
| Server state | TanStack Query v5 | hooks generated by Orval |
| Grids | TanStack Table + virtualisation | ERP is grids |
| Forms | React Hook Form + Zod resolver | |
| Command palette | cmdk | primary navigator, not a menu tree |
| Charts | Recharts | |
| i18n | next-intl (ICU) | EN + BM + 中文 at launch |
| UI development | Storybook | frontend-first requires it |
| **Contract** | **OpenAPI 3.1** | canonical authority |
| **Generation** | **Orval → client + Query hooks + MSW mocks** | derived state, never edited |
| HTTP | **Hono** + `@hono/zod-openapi` | one app, three hosts (§2.2) |
| Validation | Zod (source) → OpenAPI (published) | one definition |
| ORM | Drizzle + explicit SQL | SQL stays visible |
| Database | PostgreSQL · **Neon** | branch-per-PR is unusually valuable for agents |
| Isolation | tenant_id + RLS (`pgPolicy`, forced) | database invariant, not a convention |
| Auth | Better Auth (identity + membership only) | not the ERP tenant model |
| Authorization | own policy layer: permission codes + scopes | |
| Events | transactional outbox in Postgres | the durable record |
| Jobs | Trigger.dev behind `packages/jobs` | swappable; outbox is the truth |
| Files | S3-compatible (R2 or Vercel Blob, private) | payslips are private + signed short-TTL URLs |
| Search | Postgres FTS + `pg_trgm` + `unaccent` | |
| Vectors | pgvector, tenant filter inside the query | |
| AI | Vercel AI SDK + gateway, Claude primary | provider-neutral |
| Email | Resend + React Email | |
| Observability | OpenTelemetry · Sentry · structured logs · **in-DB immutable audit** | |
| Tests | Vitest · Playwright · testcontainers · MSW | |
| Tenant domains | Vercel for Platforms (wildcard + custom + auto TLS) | |

**Excluded on purpose:** Kafka, Redis, Elasticsearch, MongoDB, GraphQL, tRPC-as-public-contract, Kubernetes, microservices, Server Actions as business API, any ORM with lazy-loading magic. Each may be added later against a named, measured pain — never speculatively.

---

## 5. Metadata architecture

### The overlay chain

```
System definition
      ↓  merged deterministically, in this order, always
Country pack        (Malaysia adds tax_registration_no after customer)
      ↓
Tenant customisation (hide salesperson; rename customer_reference; add cost_centre)
      ↓
User personalisation (Jack's saved view, column widths, filters)
```

### Stable slots, not inheritance

Draft 3's replacement for Odoo's XPath view inheritance, and it is the right call. Each core form declares named slots:

```
sales-order form
  slot: header · parties · commercial · logistics · lines · totals · approvals
```

Overlays address slots by name — `insert tax-registration after customer` — never DOM selectors, never XPath, never an unknown inherited chain. The merged result is deterministic and Claude can resolve it statically.

### What metadata controls, and what it must not

**Controls:** labels, field order, visibility, sections, tabs, defaults, lookup config, saved filters, list columns, sorting, grouping, kanban grouping, dashboard widgets, conditional visibility, read-only state, custom fields, report definitions.

**Must not:** weaken server validation, alter database schema, bypass a policy, or introduce executable tenant code in the backend.

### Storage — hybrid, never EAV

```
employees
  id, tenant_id, employee_no, full_name, nric, hire_date, ...   ← real typed columns
  custom  JSONB                                                  ← tenant-defined fields
  GIN index on custom
```

Platform fields are real columns: constrained, indexed, fast. Tenant fields are JSONB: instant, zero DDL, zero migration risk. When a custom field gets hot, promote it:

```sql
ALTER TABLE employees ADD COLUMN cost_centre text
  GENERATED ALWAYS AS (custom->>'cost_centre') STORED;
CREATE INDEX ON employees (tenant_id, cost_centre);
```

That is a per-tenant *optimisation*, not a per-tenant *schema*. One migration path for every tenant — the single largest improvement over ERPNext.

### The 80/20 rule

**Metadata-render:** CRUD forms, lists, saved views, filters, search, simple dashboards, simple reports, master data, configuration, approval states.

**Hand-build:** POS, payroll processing, month-end close, inventory planning, manufacturing planning, bank reconciliation, quotation builder, executive dashboards, AI workbench.

This is how you get ERP flexibility without looking like an ERP from 2010. It also happens to be how you avoid Odoo's fate: **if exactly one screen needs a metadata capability, hand-build the screen instead of extending the metadata layer.**

---

## 6. Modular monolith

One deployable. Module boundaries enforced as if they were services.

```
/
├─ apps/          web · api · worker            (executable compositions)
├─ modules/       contacts · crm · catalog · sales · purchasing · inventory
│                 accounting · hr · payroll · manufacturing · projects · pos
├─ packages/      ui · tokens · api-client(GEN) · db · auth · tenancy · policy
│                 metadata · workflow · audit · files · events · jobs · ai · testing
├─ contracts/     OpenAPI documents
├─ localisation/  my · sg · vn · id · th · ph
├─ tooling/       guards, generators, verify
├─ docs/
└─ CLAUDE.md
```

`packages` = platform primitives. `modules` = business capabilities. `apps` = compositions.

### Dependency direction, mechanically enforced

```
apps → modules → platform packages → shared primitives

Inside a request:
  HTTP handler → application command/query → domain policy → repository → PostgreSQL
```

**The platform kernel must not know Sales exists.** Sales depends on the kernel; the kernel never depends on Sales. A cyclic dependency fails CI.

### Module manifest

```ts
// modules/sales/manifest.ts
export default {
  id: 'sales', version: '1.4.0',
  dependsOn: ['contacts', 'catalog'],
  optionallyIntegrates: ['inventory'],
  permissions: ['sales.order.read', 'sales.order.create', 'sales.order.approve'],
  entities: ['sales_order', 'sales_order_line'],
  emits: ['sales.order.confirmed'],
  consumes: [],
  navigation: [...], workflows: [...], countryExtensions: ['my'], featureFlags: [...],
};
```

Claude should find **one obvious path** for every concern. Vibe coding degrades fast when there are four approximately-correct locations.

---

## 7. Multi-tenancy

### Organisational topology — four distinct concepts

```
USER ──membership──► TENANT ──► LEGAL ENTITY (MY01, SG01, VN01)
                                      └──► BUSINESS UNIT / BRANCH / WAREHOUSE
```

A SaaS tenant is not a legal entity. A legal entity is not the authorisation boundary. Drafts 1 and 2 collapsed these into Better Auth's organization; Draft 3 was right that ERP topology outgrows that within one enterprise deal.

### RLS — the details that separate working from theatre

```sql
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees FORCE  ROW LEVEL SECURITY;   -- applies to the owner too
CREATE POLICY tenant_isolation ON employees
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

Three things from Draft 1 that are the whole ballgame:

1. **Never connect as the table owner.** RLS silently skips owners and superusers. Use a dedicated `app_user` role and set `FORCE ROW LEVEL SECURITY` as the second line of defence.
2. **`SET LOCAL`, never `SET`.** Tenant context must be transaction-scoped. With a connection pool, a session-scoped variable leaks to whichever tenant borrows the connection next. Every request opens a transaction that begins with `SET LOCAL app.tenant_id`.
3. **Neon's HTTP driver cannot hold session state across statements.** Use the pooled WebSocket driver for anything RLS-scoped.

Everything funnels through **one** helper:

```ts
withTenant(tenantId, async (db) => { /* ... */ })
```

Nothing else may open a connection. One chokepoint, one thing to audit, one thing to test.

**Indexes are tenant-prefixed**, not globally unique: `UNIQUE (tenant_id, code)`, `INDEX (tenant_id, status)`, `INDEX (tenant_id, created_at)`.

### Tenant URL resolution

```
app.example.com          platform / marketing / signup
acme.example.com         wildcard subdomain, instant on signup, free tier
hr.acme.com.my           custom domain, paid tier, DNS-verified, auto TLS
```

```
tenant_domain(id, tenant_id, hostname, type, verification_status, is_primary, verified_at)
```

```
HTTP Host → domain resolver → candidate tenant context
                                     ↓
                        authenticated membership check
                                     ↓
                                application
```

**The hostname resolves a *candidate* tenant. It never authorises.** The resolved tenant is cross-checked against the session's active organisation; a mismatch is rejected, so a valid session for tenant A cannot be replayed at tenant B's hostname. Host → tenant lookup goes through Edge Config so it costs no database round trip.

---

## 8. Authorization

Three separate layers, never collapsed:

| Layer | Mechanism | Fails safe? |
|---|---|---|
| Authentication | Better Auth | — |
| Tenant isolation | Postgres RLS | **Yes** — structural, cannot be forgotten |
| Business authorization | own policy engine | compiled to SQL predicates + response filters |

Permission codes are `module.resource.action`; scopes are organisational:

```
sales.order.approve     scope: legal_entity = MY01
hr.compensation.read    scope: business_unit = BU-KL
payroll.run.calculate   scope: tenant
```

That is RBAC plus scoped ABAC without adopting a general-purpose policy framework. Better Auth's dynamic access control handles runtime role definition so tenants create their own roles without a deploy. Add OpenFGA or Permify only when a customer genuinely needs relationship-based rules ("managers of the branch that owns the project").

---

## 9. Frontend

### API-first authority, frontend-first sequence

These were never in conflict. **API-first describes who has authority. Frontend-first describes the order of work.**

Per feature, every time:

1. Design the experience — screens, states, actions, validation, empty, error, loading.
2. Define **only** the API operations that experience requires, in the module's OpenAPI document.
3. `pnpm generate` → typed client, TanStack Query hooks, MSW mocks.
4. Build the complete frontend against mocks. No database, no backend, no infrastructure.
5. Implement the handlers against the now-frozen contract.
6. Contract + integration + Playwright tests before merge.

### UX decisions that are the actual competitive wedge

- **Command palette as primary navigator.** ERP menu trees are where usability dies. `⌘K → "new sales invoice for Acme"`.
- **An Excel-grade grid.** Keyboard navigation, frozen columns, inline edit, saved views per user, bulk edit, undo. This is the most-noticed daily difference against ERPNext's list view and Odoo's tree view.
- **Optimistic mutations everywhere.** Perceived latency is the whole game on 4G in Jakarta, Hanoi, or Johor.
- **Mobile-first PWA, not a separate app.** SEA workforces are mobile and deskless. Service worker + IndexedDB outbox. Native later as a wrapper, never a rewrite.
- **Design tokens before the first screen.** OKLCH, semantic naming. This is what stops agent-written UI from drifting across 300 screens.
- **Performance budget as a CI gate.** ≤180KB JS on the critical path, LCP <2.5s on a throttled 4G profile. Enforced.

### The one mechanical rule

Server components fetch and compose. Client components are marked `'use client'` and own all interactivity. All mutations go through the generated HTTP client. Reads may use the generated server query facade (§2.4). No Server Actions for business operations.

---

## 10. Money, ledgers, and commands

### Money

- **Monetary amounts: `bigint` in minor units**, always paired with currency and its minor-unit scale. Never floats. VND has 0 decimals, most SEA currencies have 2 — the scale is data, not an assumption.
- **Unit prices and quantities: `numeric`** with explicit scale (a unit price can be 0.0035).
- **The `price × quantity → amount` rounding step is one explicit function**, tested against boundary cases. This is where naive implementations lose cents at scale.

### Explicit commands, not status patching

```
POST /sales-orders/{id}/confirm
POST /stock-transfers/{id}/post
POST /journal-entries/{id}/post
POST /payroll-runs/{id}/approve
```

Never `PATCH { status: "POSTED" }`. The first expresses a business transition and runs the domain rules; the second bypasses them.

### Immutable history

Documents post to immutable ledger entries. Corrections are **original + reversal + replacement**, never an update. This makes audit, reconciliation, AI explanation, compliance, debugging, and historical reproduction all safe. A transaction from July 2025 must still be reproducible in 2028.

### Workflow, restrained

Metadata defines transitions, allowed roles, conditions, notifications, and SLA — **when something may happen**. Application commands define **what actually happens**. That division is the only thing preventing a workflow engine from slowly becoming a badly-designed programming language.

---

## 11. Payroll engine

The crown jewel of the first vertical, and the part most likely to be got wrong.

```ts
calculatePayroll(
  employeeSnapshot,   // immutable copy of employee state at run time
  rulePack,           // versioned, effective-dated statutory rules
  period
): PayslipLine[]      // deterministic, no I/O, no DB access
```

**Non-negotiable rules:**

- **No I/O inside the engine.** Pure input → output makes it exhaustively testable and trivially reproducible three years later in an audit.
- **Statutory rates are versioned data, not code.** EPF, SOCSO and EIS are **wage-band lookup tables**, not clean percentages. Encoding them as formulas is a known, expensive mistake. Effective-dated rule packs make an annual rate change a data row, not a deploy.
- **Payroll runs are immutable.** Corrections produce a reversing entry plus a new run.
- **Golden-file tests** for every rule pack, asserted against officially published tables.

**Malaysian scope at launch:** EPF (KWSP), SOCSO (PERKESO), EIS (SIP), PCB/MTD with CP38, HRD Corp levy, Borang EA and CP8D, Employment Act 1955 leave entitlements as amended 2022, and bank giro files for disbursement.

> **Implementation flag, carried forward from Draft 1 and worth repeating:** every rate, wage ceiling, and tax table must be sourced from current official LHDN / KWSP / PERKESO publications at build time and encoded with its effective date. Do not take any figure from memory, from a model, or from this document. Figures shift annually and a stale table is a compliance liability.

---

## 12. Country packs and SEA compliance

Never write `if (country === 'MY')` in core. Country variation is a **versioned localisation pack**:

```
CORE  +  COUNTRY PACK  +  TENANT CONFIGURATION
```

A pack contributes: tax rules, payroll rules, statutory identifiers, bank formats, invoice formats, e-invoice integration, public holidays, currency, address format, numbering schemes, employment rules, local reports, chart-of-account templates, translations.

Every regulatory rule carries `effective_from`, `effective_to`, `version`, `jurisdiction`, `authority_reference`. **Historical rules are never overwritten.**

### E-invoicing is a clearance model, and that changes the architecture

Malaysia, Indonesia, and Vietnam all run Continuous Transaction Control: the tax authority must clear an invoice *before* it is legally valid. Two consequences:

1. **The ledger must never depend on a clearance call succeeding synchronously.** Post the journal entry, write the outbox event, submit asynchronously, reconcile after.
2. **`pending → cleared → rejected → amended` is first-class invoice state**, not an error path. Clearance failure is a normal Tuesday.

Current picture (verify against the authority before committing a delivery date — these move):

- **Malaysia (MyInvois / LHDN).** Phased by FY2022 turnover: Phase 1 (>RM100m) from Aug 2024, Phase 2 (RM25–100m) from Jan 2025, Phase 3 (RM5–25m) from Jul 2025, Phase 4 (RM1–5m) from Jan 2026 with the relaxation window extended to a full twelve months and full enforcement from Jan 2027. The exemption threshold was raised to RM1m, but any single invoice above RM10,000 must still go through MyInvois even for exempt businesses. Sources disagree on the status of a Phase 5 — confirm with LHDN directly.
- **Indonesia (Coretax / DJP).** Fully enforced since 31 Dec 2025; clearance is a legal precondition, uncleared invoices cannot support the buyer's input VAT, and the upload deadline is the 20th of the following month. **The correction flow is the trap:** a mismatched NPWP forces a *Faktur Pengganti* that the buyer must confirm in their own Coretax account before it reaches "Amended". Model that as a state machine, not an edit.
- **Vietnam, Philippines, Thailand, Singapore.** Live or rolling out; Singapore is Peppol-based (InvoiceNow), the others are authority-specific.

### Beyond tax

- **Locales:** en, ms, vi, id, th, tl, zh-Hans.
- **Language traps to handle before they surprise you:** Thai has no inter-word spaces (line breaking and truncation both need care); Vietnamese needs diacritic-insensitive search (`unaccent` plus a normalised search column); Thai dates commonly use the Buddhist Era (BE = CE + 543) — store UTC, render per tenant locale.
- **Payment rails, which are not optional here:** QRIS (ID), PromptPay (TH), DuitNow (MY), VietQR (VN), PayNow (SG); Xendit, Midtrans, Omise/Opn, 2C2P, VNPay, MoMo, Stripe.
- **Data residency:** Vietnam's PDPD (Decree 13/2023) and sectoral rules push toward local storage for some categories. The dedicated-database tier plus a container-portable stack means a tenant can be placed in a Vietnamese or Indonesian region without forking. Design for it; build it when a contract requires it.

---

## 13. Async: outbox, jobs, integrations

```
BEGIN
  update sales_order
  insert inventory_reservation
  insert outbox_event('sales.order.confirmed')
COMMIT
        ↓  worker
notifications · accounting projection · webhooks · search indexing
AI indexing · analytics · e-invoice submission · bank files · PDF generation
```

No Kafka. No distributed transactions. When scale genuinely demands a broker, the outbox becomes the bridge to it.

Durable jobs cover payroll calculation, large imports, PDF and bank file generation, bulk export, email, e-invoice submission, inventory costing, AI document processing, scheduled reports, and webhook delivery. Idempotency keys on every task — payroll must never double-pay.

---

## 14. AI layer

AI sits **above** the application layer, never below it.

```
              AI
               │
        Tool Registry          ← generated from module manifests + metadata
               │
       Application API
        /            \
    queries        commands
        │              │
     policy         policy
        └──────┬───────┘
               ▼
           database
```

An agent never receives `DATABASE_URL`. It receives tools: `find_customer`, `get_customer_balance`, `search_sales_orders`, `explain_payroll_variance`, `draft_purchase_order`, `prepare_journal_entry`. Every tool runs under the same tenant context, authorization, validation, audit, and domain rules as a human. Because tools derive from module manifests, **AI capability grows for free as modules ship**.

**Four hard rules:**

1. **AI proposes, human approves, system executes** for anything financially or operationally consequential. `draft_purchase_order()` → DRAFT → human approval → `submit_purchase_order()`. Never AI → INSERT.
2. **AI never bypasses RLS.** It executes in the caller's tenant context, without exception.
3. **RAG tenant filtering happens inside the query.** Never `ORDER BY embedding <=> q LIMIT 20` globally then filter — that is a data leak with extra steps. Every embedding row carries `tenant_id`, `source_type`, `source_id`, `classification`, `permissions`.
4. **Document intake never auto-commits low confidence.** Vision model → structured output → confidence score → human review queue below threshold.

**Provider-neutral** via the AI SDK, so per-tenant and per-workload model routing (cheap model for classification, strong model for analysis) is configuration, not code.

**AI app-builder ships last.** NL → metadata rows is feasible *only* because customisation is data — and only once the metadata engine has been proven by real modules.

---

## 15. Agent operating model

### Generated code is derived state

```
contracts/  →  api-client · API docs · MSW mocks · schema fixtures   [GENERATED]
```

CI runs `pnpm generate && git diff --exit-code`. This is far stronger than asking an agent to remember not to cause drift.

### Architecture guards — deterministic, not aspirational

Each law in §3 has a check that fails the build:

```
UI importing db or drizzle
module importing a foreign module's repository
tenant-scoped table missing tenant_id or RLS policy
generated file modified by hand
API implementation missing an operationId
permission code used but not declared in a manifest
country code appearing in a core module
direct UPDATE/DELETE on a ledger table
cyclic module dependency
server query facade containing a write
```

Claude gets the feedback in seconds. That is what agent-oriented engineering actually means.

### One command

```bash
pnpm verify   # generate-drift → tsc --noEmit → lint → guards → vitest → playwright → migration check
```

### Working shape

Feature-slice the work: *"employee leave request, end to end: UX → contract → mocks → frontend → handlers → tests"* is a good task. *"Build the HR module"* is not. One ADR per non-obvious decision, so a future session inherits the reasoning rather than re-litigating it.

---

## 16. Roadmap

| Phase | Scope | Exit criterion (blocking) |
|---|---|---|
| **0 — Skeleton** | Monorepo, Next, Hono, Drizzle, Better Auth, contracts, Orval, CI, guards | A page renders, the OpenAPI spec generates, `pnpm verify` is green, at least three guards fail correctly on deliberate violations |
| **1 — Tenancy kernel** | RLS policies, `withTenant()`, host resolution, org topology, onboarding | **An automated test proves tenant A cannot read tenant B's rows, for every tenant-scoped table, enumerated dynamically** |
| **2 — Metadata engine** | Four planes, overlay chain, slots, hybrid storage, generated CRUD + renderer | A new entity is defined once and is fully usable end to end, and a form-label change provably issues no DDL |
| **3 — Design system** | Tokens, Base UI layer, grid, form renderer, command palette, PWA shell, Storybook | A new entity's UI needs zero bespoke code |
| **4 — HR core** | Employees, org chart, leave, claims, documents, approvals | Leave request → approval → balance cycle works end to end |
| **5 — MY payroll** | Rule packs, run engine, payslips, EA/CP8D, bank files | Golden-file tests pass against published statutory tables |
| **6 — AI** | Copilot, assistant, document intake, tool registry | AI operates strictly within the caller's RLS context; no tool holds a DB connection |
| **7 — Scale-out** | WhatsApp, custom domains, dedicated-DB tier, e-invoice, country #2 | — |

**Phase 1 is the most important gate in the entire plan.** Do not pass it on the basis of a manual check.

**Phase 2 must serve Phase 4's real needs.** Build the metadata engine for HR first and generalise only when the second module demands it. A metadata engine designed in the abstract becomes Odoo.

---

## 17. Verification

**Tenant isolation (blocking, Phase 1).** With testcontainers, seed two tenants, then assert under the `app_user` role that a full-table `SELECT` inside tenant A's context returns zero of tenant B's rows — for **every** tenant-scoped table, enumerated dynamically so a newly added table cannot silently escape the check. Companion test: a session for tenant A is rejected when presented at tenant B's hostname. A CI check fails the build if any tenant-scoped table lacks an RLS policy.

**Payroll correctness (blocking, Phase 5).** Golden files: fixed employee fixtures × rule-pack versions → asserted payslip lines, verified against official tables. Include the cases that break naive implementations — wage-band edges, mid-month joiners and leavers, unpaid leave proration, multiple pay elements, EPF age thresholds. Property test: gross reconciles to net plus deductions, exactly, in integer minor units.

**Contract.** The generated OpenAPI document validates as 3.1, and is diffed in CI so breaking changes surface in review rather than in an integrator's incident channel.

**Ledger.** Property tests: debits equal credits for every posting; stock quantity × valuation rate reconciles to the GL balance; no `UPDATE` ever touches a posted ledger row.

**E2E.** Playwright against a Neon branch: signup → tenant provisioning → add employee → run payroll → download payslip.

**Manual sanity check.** Two tenant subdomains open side by side in separate browser profiles; confirm separation by inspection on top of the automated proof.

---

## 18. Explicitly rejected

| Temptation | Decision |
|---|---|
| Microservices from day one | Reject |
| GraphQL as the principal ERP API | Reject |
| tRPC as the public contract | Reject |
| Server Actions as the business API | Reject |
| Metadata generating the entire database | Reject |
| EAV for normal business entities | Reject |
| Per-tenant DB or schema from day one | Reject |
| Tenant JavaScript executing in the backend | Reject |
| XML/XPath-style deep UI inheritance | Reject |
| Redis / Kafka / Elasticsearch before demonstrated need | Reject |
| Kubernetes initially | Reject |
| Event sourcing everything | Reject |
| Generic `BaseService<T>` inheritance framework | Reject |
| Hard-coded MY/SG/VN logic in core | Reject |
| **AI directly querying or writing production tables** | **Absolutely reject** |

---

## 19. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| RLS misconfiguration leaks salary data | **Critical** | `withTenant()` chokepoint · `FORCE RLS` · non-owner role · `SET LOCAL` · WebSocket driver · dynamic CI enumeration |
| Payroll miscalculation | **Critical** | Pure engine · versioned rule packs · golden files against official tables · immutable runs · integer minor units |
| Metadata engine over-generalises into Odoo | **High** | Four planes with separate authority · 80/20 rule · build for HR first · hand-build the one-off screen instead of extending the layer |
| Agent-written financial logic is subtly wrong | **High** | Ledger and payroll hand-specified first, then property tests, then implementation against the tests |
| Vibe-coding quality decay over long sessions | **High** | Types + guards + `pnpm verify` as a hard gate · small feature slices · ten laws, not a manual |
| Statutory rates drift annually | Medium | Effective-dated packs · calendar reminder before each MY update cycle · never overwrite history |
| Clearance API instability (MyInvois, Coretax) | Medium | Async submission, never coupled to posting · explicit `pending/cleared/rejected/amended` state · versioned adapters |
| JSONB custom fields degrade at scale | Medium | GIN by default · promote to generated columns on measured need · per-tenant query-cost dashboard from day one |
| Contract drift between UI and API | Medium | Orval generation + `git diff --exit-code` · operationId guard on the server query facade |
| Scope explosion | **High** | Phase gates · one spec per phase · non-goals stated below |

**Non-goals for v1:** on-prem deployment, countries beyond Malaysia, accounting/inventory/CRM/manufacturing modules, offline-first sync, a public app marketplace, the AI app-builder.

---

## 20. Open items to confirm before Phase 0

1. **Neon MCP auth is failing (HTTP 401).** Refresh the token, or provision Postgres through the Vercel Marketplace instead. Blocking for the branch-per-PR workflow.
2. **Vercel CLI is not installed.** `npm i -g vercel` unlocks `vercel env pull`, `deploy`, and `logs`.
3. **Figma MCP requires interactive OAuth**, which cannot be completed in a non-interactive session. Needed only if design handoff runs through Figma.
4. **Jobs vendor: Trigger.dev vs Inngest.** Pick one in Phase 0 and put it behind `packages/jobs`. Because the outbox is the durable record, this is reversible — do not spend a week on it.
5. **Launch country.** Malaysia is locked, and it is defensible: the clearest e-invoicing API surface and English-language business operations make it the cheapest first compliance integration. Worth one deliberate re-confirmation given the team is Vietnam-based — local relationships, support hours, and language proximity are real advantages that the country-pack architecture makes cheap to act on either way.
6. **Base UI component gaps.** Base UI currently lacks Context Menu, Hover Card, and Toast. Confirm none of these is on the Phase 3 critical path, or plan the substitute.

---

## Closing

Three drafts, one architecture. The parts worth remembering:

**Explicit core, metadata at the edges.** Four planes with separate authority, not one fused DocType. Business truth is explicit code and relational data; only repeatable UI structure is metadata; tenant variation is overlays; country variation is versioned packs.

**One contract, generated everything.** OpenAPI is the authority, Orval produces the client, the hooks, and the mocks, and the frontend is finished before the backend exists.

**The database enforces tenancy, not the code.** RLS forced, non-owner role, `SET LOCAL`, one `withTenant()` chokepoint, and an automated proof that tenant A cannot see tenant B.

**Ship Malaysia and payroll first.** The country-pack and module architecture is what makes that a first step rather than a corner painted into.

**Laws are enforced by guards, not by memory.** Ten rules, each with a check that fails the build. That is the difference between an architecture that survives a year of agent-driven development and one that quietly dissolves into four approximately-correct locations for everything.
