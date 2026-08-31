# Xforge — Consolidated Reference Architecture

**Status:** merged and reconciled from `.architecture/architecture-{1,2,3}.md`
**On approval:** write to `.architecture/architecture-final.md` and scaffold Phase 0.

---

## Context

Greenfield (`C:\JackProject\afeda-Xforge`). Node 24, pnpm 11, Docker 29, Git available.

Three independent architecture proposals exist. They agree on ~70% (TypeScript end-to-end, Postgres + RLS, Drizzle, Next.js + shadcn, metadata-driven, no Kafka/Redis/K8s, AI-above-the-API). This document keeps every point of agreement, resolves the ~30% where they conflict, and corrects two places where the majority view was wrong.

**Locked product decisions:**

| Decision | Choice |
|---|---|
| Hosting | Cloud SaaS only |
| Language | TypeScript end-to-end |
| First vertical | **HRMS + Payroll** |
| Launch jurisdiction | **Malaysia only** |
| Isolation | Shared schema + RLS; dedicated tier on request |
| Tenant URL | Subdomain free; custom domain on paid tiers |
| AI | Assistant, copilot, document intake, agentic automation, app-builder |
| AI channels | In-app first, WhatsApp later |

**Reconciliation note.** Documents 2 and 3 were written for a full multi-country ERP. The locked decisions are narrower. The resolution is not to discard their scope but to **build the kernel module-agnostic and country-pack-shaped from day one, while shipping exactly one module (HR/Payroll) and one country pack (MY).** The ERP modules then slot in without re-architecture. Everything below follows that rule.

---

## 1. The seven conflicts, resolved

These are the decisions that actually differ. Each resolution states which document wins and why.

### 1.1 Metadata scope — **doc 3 wins, and this is the most important correction**

Docs 1 and 2 proposed *one entity definition generating everything*: schema, API, UI, permissions, AI tools. Doc 3 rejected this, and doc 3 is right.

The failure mode is precise: if a single definition is the authority for all planes, then **changing a form label can migrate your database**, and persistence, contract, presentation, and policy become welded together. That is not merely ERPNext's `ALTER TABLE` problem — it is ERPNext's *actual* long-term architectural problem, and docs 1 and 2 would have reproduced it while believing they had fixed it.

**Adopt four separate planes** that share stable identifiers but where **none generates all the others**:

| Plane | Authority | Changes require |
|---|---|---|
| **Data** | Postgres schema (Drizzle) | Reviewed migration |
| **Contract** | OpenAPI 3.1 | Contract change, then implementation |
| **Experience** | UI metadata overlays | Config change only — never touches data |
| **Policy** | Permission codes + scopes + workflow | Policy change only |

Generation still happens, but it is **one-directional and gated**. An entity definition *proposes* a migration; a human reviews and applies it. Nothing silently reshapes storage.

> **Law:** the Experience plane may never weaken the Contract plane. If the API requires `customer_id`, tenant form metadata saying `required: false` does not make it optional. The server contract is authoritative. (doc 3 §5)

### 1.2 Typed client — **doc 3 wins**

Doc 1 proposed Hono's `hc` client. Doc 3 proposed OpenAPI → **Orval** → typed client + TanStack Query hooks + **MSW mocks**.

Doc 3 is materially better *given the stated priority of frontend over infrastructure*, because mocks let the entire UI be built and reviewed before any backend exists:

```
UX  →  OpenAPI  →  generated mocks  →  finished frontend
                                        (no DB, no backend, no infra)
```

That is the single highest-leverage decision in this document for a frontend-led, agent-driven build. `hc` gives types but not mocks, so it cannot unlock this flow.

### 1.3 HTTP framework — **docs 1 and 2 win over doc 3**

Doc 3 chose Fastify. **Hono + `@hono/zod-openapi`** is the better fit: it mounts inside the Next.js app as a catch-all route handler (one deployment, KISS), is Zod-native so the OpenAPI spec is generated from the same schemas that validate at runtime, and remains portable to Node, Bun, and workers if it ever needs to lift out. Fastify's plugin maturity does not outweigh needing a second deployment target on day one.

### 1.4 UI ↔ backend path — **docs 2 and 3 win; doc 1 was wrong**

Doc 1 proposed that React Server Components call `packages/core` directly, bypassing HTTP for reads. Reject that.

It creates two paths to the same data, which violates "one obvious path" — the property that keeps agent-written code coherent over months — and it breaks the mock-first flow in §1.2. **The UI always goes through the generated API client.** No Server Actions for mutations. An escape hatch exists for a measured hot read path, but it requires an ADR and a named benchmark; it is not a default.

### 1.5 Tenant model — **doc 3 wins; docs 1 and 2 were wrong**

Docs 1 and 2 made Better Auth's `organization` the canonical tenant. Doc 3 warned against letting an auth library's model become the ERP's business topology. Doc 3 is right, and **for this product specifically it is not a subtle point** — it is a launch blocker.

A Malaysian group with three `Sdn Bhd` entities is **one tenant with three legal entities**, and each legal entity has its own EPF employer number, its own SOCSO employer code, its own LHDN E-number, and files its own EA forms. Payroll runs scope to **legal entity**, never to tenant. Modelling tenant = organization = employer makes correct Malaysian payroll impossible without a later rewrite.

```
USER ──membership──► TENANT
                       ├── Legal Entity (Sdn Bhd A)  ── own EPF/SOCSO/LHDN registration
                       ├── Legal Entity (Sdn Bhd B)
                       └── Business units / branches / departments / locations
```

**Better Auth owns authentication, sessions, and membership. Our own `tenant` / `legal_entity` / `business_unit` tables own business topology.**

### 1.6 Authorization — **one system, not two**

Better Auth's dynamic access control (verified: roles created at runtime with custom permission maps) is genuinely capable, and doc 1 proposed using it for tenant-defined roles. But splitting authorization across Better Auth *and* a policy engine produces exactly the "four approximately correct locations" failure doc 3 warns about.

**All authorization lives in `packages/policy`.** Permission codes plus scopes, per doc 3 §12:

```
permission: payroll.run.approve
scope:      legal_entity = MY01
```

Scopes: `tenant | legal_entity | business_unit | department | location | own`. This is RBAC + scoped ABAC without adopting a heavyweight policy framework. Tenants still define their own roles — as rows in our tables, not in the auth library.

### 1.7 Money representation — **synthesis, both were half right**

Doc 1 said `bigint` minor units. Doc 2 said `numeric(18,6)`. Each is correct in a different place:

- **Storage: `numeric` with explicit precision/scale.** Handles multi-currency, unit prices at 4–6 dp, and tax rates. Every monetary field stores amount + currency + FX rate to base currency — stored, never recomputed.
- **Inside the payroll engine: integer sen.** Statutory rounding happens at defined steps; integer arithmetic makes those steps deterministic and exactly testable. Convert to `numeric` at the persistence boundary.

Floats are banned everywhere, without exception.

---

## 2. What we borrow, what we fix

Merged from docs 1 and 2, with doc 3's corrections applied.

| | Keep from ERPNext / Odoo | Fix |
|---|---|---|
| **Metadata** | One definition drives schema, UI, API, permissions | ERPNext does it via `ALTER TABLE` and welds all planes together → **four separate planes**, JSONB + promoted generated columns, zero per-tenant DDL |
| **Extensibility** | Customise without forking | Odoo's inheritance is unreadable → stable named slots + deterministic overlays, no XPath |
| **Domain depth** | Decades of correct accounting, inventory, and payroll semantics | Copy the *semantics*, rewrite the implementation |
| **Modularity** | App/module model | Odoo upgrades break modules → versioned module manifest + compatibility tests in CI |
| **Multi-tenancy** | Works | Per-tenant DB doesn't scale → shared schema + RLS, dedicated tier on request |
| **Frontend** | Functional and complete | Slow, dated, weak mobile → React + shadcn, PWA, command palette, real grid |
| **API** | Exists | Inconsistent, XML-RPC legacy → OpenAPI-first, generated clients and mocks |
| **Types** | — | Untyped Python → TypeScript strict end-to-end |
| **Jobs** | Exists | Opaque failures → transactional outbox + durable runner with visible retries |
| **AI** | Bolted on | Native: tools generated from metadata, executed through the same API and policy layer as humans |
| **Localisation** | Country modules exist | Community-maintained, stale, upgrade-fragile → **versioned country packs with effective-dating** |

**One-line architecture:** *explicit core, metadata at the edges* (doc 3 §36) — not "everything is metadata."

---

## 3. The canonical stack

### Frontend — the priority surface (~60% of first-year effort)

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 App Router**, React 19, Turbopack | Deepest training data — a technical requirement when an agent writes the code |
| UI | **shadcn/ui** + Tailwind v4, OKLCH tokens | Open-code: components live in the repo where Claude can read and edit them |
| Primitives | Whatever `shadcn init` defaults to at Phase 0 | Doc 3 claims Base UI became the default in July 2026 — **post-cutoff, unverified**. Let the CLI decide; both Radix and Base UI are supported |
| Grid | **TanStack Table** + virtualization | ERP is 80% grids; this is the most-noticed daily difference vs. incumbents |
| Server state | **TanStack Query v5** | Hooks are generated by Orval |
| Forms | **react-hook-form + Zod** | One schema validates form, API, and DB boundary |
| Mocks | **MSW** (generated) | Enables frontend-before-backend |
| Stories | **Storybook** | Frontend-first visual development |
| Palette | **cmdk** (⌘K) | Primary navigator — ERP menu trees are where usability dies |
| i18n | **next-intl** | EN, Bahasa Malaysia, 中文 at launch |
| Charts | **Recharts** | |
| Motion | **Motion** | Meaningful transitions only |

**UX commitments that beat the incumbents:** command palette as primary navigation; Excel-grade grid (keyboard nav, frozen columns, inline edit, saved views, bulk edit, undo); optimistic mutations everywhere (4G latency in the region is the whole game); **mobile-first installable PWA with an IndexedDB outbox**, not a separate app; design tokens defined before the first screen; and a CI-enforced performance budget — ≤180KB JS critical path, LCP <2.5s on throttled 4G.

### API

| Concern | Choice |
|---|---|
| HTTP | **Hono**, mounted at `app/api/[[...route]]/route.ts` |
| Contract | **`@hono/zod-openapi`** → OpenAPI 3.1, generated from Zod |
| Client + hooks + mocks | **Orval** → typed client, TanStack Query hooks, MSW handlers |
| Docs | Scalar, from the same spec |

### Data & platform

| Concern | Choice | Why |
|---|---|---|
| Database | **Postgres 17** (Neon) | Branch-per-PR is unusually well matched to agentic development |
| ORM | **Drizzle** + explicit SQL | SQL-shaped, no second schema language, RLS-aware |
| Isolation | **RLS**, `pgPolicy` in schema | Verified: `pgTable.withRLS` **denies all rows by default** with no policy attached |
| Search | Postgres FTS + trigram → Meilisearch only when measured | |
| Vectors | **pgvector**, same database | |
| Auth | **Better Auth** — identity, session, membership *only* | |
| Policy | **Own `packages/policy`** — all authorization | |
| Events | **Transactional outbox** in Postgres | Atomic with the business transaction; the bridge to Kafka if ever needed |
| Jobs | **Trigger.dev** | Task-level idempotency and durable retries; open-source and self-hostable, which preserves the self-host escape hatch cheaply. Inngest is an equivalent choice |
| Files | **S3-compatible** (Cloudflare R2) | No egress fees — material in SEA. Payslips private, short-TTL signed URLs only |
| Custom domains | **Vercel for Platforms** now; Cloudflare for SaaS at scale | Mapping lives in our own `tenant_domain` table so the provider is swappable |
| AI | **Vercel AI SDK v6** + AI Gateway, Claude primary | Provider-neutral; per-tenant model routing and cost attribution |
| Email | Resend + React Email | |
| Observability | OpenTelemetry + Sentry + PostHog | Plus an immutable in-DB audit trail |
| Quality | Vitest, Playwright, Testcontainers, Biome | These *are* the guardrails for vibe coding |
| Monorepo | pnpm workspaces + Turborepo | |

**Explicitly rejected:** microservices at launch · GraphQL · tRPC as public contract · Server Actions as business API · Prisma (second schema language) · MySQL (no RLS) · EAV for real entities · metadata generating the entire DB · per-tenant DB by default · Redis / Kafka / Elasticsearch / Kubernetes before measured need · event sourcing everything · generic `BaseService<T>` · arbitrary tenant code executing server-side · **AI holding a database connection** · hard-coded country logic in core.

---

## 4. Metadata and customisation

### Storage tiers (doc 2, kept)

| Tier | What | Storage | Migration cost |
|---|---|---|---|
| 1 | Core product fields | Real typed columns | Normal migration |
| 2 | Tenant custom fields | `custom` JSONB + registry row | **Zero DDL** |
| 3 | Tenant custom entities | Generic `record` table, JSONB payload | **Zero DDL** |

Tier 2 gets a GIN index by default, with promotion on measured need:

```sql
ALTER TABLE employee ADD COLUMN nric_masked text
  GENERATED ALWAYS AS (custom->>'nric_masked') STORED;
CREATE INDEX ON employee (tenant_id, nric_masked);
```

This is a per-tenant **optimisation**, not a per-tenant **schema** — one migration path for 10,000 tenants. Tier 3 is deliberately second-class: no guarantee of complex reporting or joins.

### Overlay resolution (doc 3, kept)

```
System definition → Country pack → Tenant customisation → User personalisation
```

Deterministic merge, not arbitrary inheritance. Customisation uses **stable named slots**, never DOM selectors or XPath:

```
core employee form
  slots: identity · employment · compensation · statutory · documents

MY country pack:  insert epf_socso_details into `statutory`
Tenant ABC:       hide cost_centre, rename employee_code → staff_id
```

Claude can resolve the final structure deterministically. Odoo cannot.

### The rules that stop this becoming Odoo

> **If exactly one entity needs a metadata capability, hardcode it.** Do not add it to the metadata layer. (doc 2 §3)

> **Do not metadata-generate every screen.** Metadata handles CRUD, lists, filters, saved views, simple dashboards, master data, config, approval states. **Hand-build** payroll processing, month-end close, bank reconciliation, executive dashboards, and the AI workbench. (doc 3 §19)

Escape hatches are first-class: any entity may override its generated form with a hand-written component, and any route may be hand-written. The generator is a productivity default, not a prison.

---

## 5. Multi-tenancy

### Isolation

```sql
ALTER TABLE employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employee
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

**Four details decide whether this works or is theatre:**

1. **The app must not connect as the table owner.** RLS silently skips owners and superusers. Use a dedicated `app_user` role without `BYPASSRLS`, and set `FORCE ROW LEVEL SECURITY` as a second line of defence.
2. **`SET LOCAL`, never `SET`.** Tenant context must be transaction-scoped. Under a connection pool a session-scoped variable leaks to whichever tenant borrows that connection next.
3. **Neon's HTTP driver cannot hold session state across statements.** Use the pooled WebSocket driver for anything RLS-scoped.
4. **One chokepoint.** `withTenant(tenantId, fn)` is the only sanctioned way to obtain a database handle. Nothing else opens a connection — one thing to audit, one thing to test.

Every tenant table carries `tenant_id`, and indexes are tenant-leading: `UNIQUE (tenant_id, code)`, `INDEX (tenant_id, status)`. Business identifiers are unique *per tenant*, never globally.

**Escape hatch:** the tenant row carries `isolation: 'pooled' | 'schema' | 'database'`. The connection resolver reads it; **all other application code is identical.** An enterprise or data-residency deal gets its own database without a code fork.

### Tenant URL

```
app.xforge.com          platform
acme.xforge.app         subdomain — wildcard DNS + TLS, instant on signup
hr.acme.com.my          custom domain — paid tier, CNAME + automatic TLS
```

```
Host → domain resolver (Edge Config, ~1ms) → tenant_domain → candidate tenant context
     → authenticated membership check → application
```

> **The hostname resolves a *candidate* tenant. It never authorises.** The API re-derives the tenant from the session and asserts it matches the host. `x-tenant-id` is a routing hint, never an authorisation claim. A valid session for tenant A presented at tenant B's hostname is rejected.

---

## 6. Development flow — API-first *and* frontend-first

These are not in conflict. **API-first is architectural authority; frontend-first is development sequence.** (doc 3 §3)

Per feature:

1. Design the UX — screens, states, actions, validation, empty/error/loading.
2. Define only the API operations that UX needs, in the module's OpenAPI contract.
3. `pnpm generate` → typed client, TanStack Query hooks, MSW mocks.
4. **Build the complete frontend against mocks** — no database, no backend, no infrastructure.
5. Implement handlers against the now-frozen contract.
6. Contract + integration + Playwright tests before merge.

Financial and stateful transitions use **explicit command endpoints**, never status patches (doc 3 §15):

```
POST /payroll-runs/{id}/calculate      not  PATCH { status: 'calculated' }
POST /payroll-runs/{id}/approve
POST /leave-requests/{id}/approve
```

The first expresses a business transition and can enforce invariants. The second bypasses business semantics.

---

## 7. Payroll — the launch vertical

The deepest section, because it is what ships first and it is the least forgiving thing in the product. None of the three source documents covered payroll in depth; this is new.

### The engine is a pure function

```ts
calculatePayroll(
  employeeSnapshot,   // immutable copy of employee state at run time
  rulePack,           // versioned, effective-dated statutory rules
  period,
) → PayslipLine[]     // deterministic; no I/O, no DB access
```

Invariants:

- **No I/O inside the engine.** Pure input → output is exhaustively testable and reproducible during an audit three years later.
- **Integer sen internally**, `numeric` at the persistence boundary (§1.7).
- **Statutory rates are versioned data, never code.** EPF, SOCSO, and EIS are **wage-band lookup tables**, not clean percentages — encoding them as formulas is a known, expensive mistake. A rate change must be a data row, not a deploy.
- **Runs are immutable.** Corrections produce a reversal plus a replacement run. Never mutate a completed run. (doc 3 §16)
- **Runs scope to `legal_entity`**, not tenant (§1.5).

Every statutory rule carries `effective_from`, `effective_to`, `version`, `jurisdiction`, `authority_reference`. **Never overwrite a historical rule** — a July 2025 payslip must still recompute identically in 2028. (doc 3 §14)

### Malaysian scope at launch

EPF (KWSP) · SOCSO (PERKESO) · EIS (SIP) · PCB/MTD with CP38 · HRD Corp levy · Borang EA and CP8D year-end forms · Employment Act 1955 leave entitlements as amended 2022 · bank giro files for disbursement. Statutory employer registrations live on `legal_entity`.

> **Implementation flag:** every rate, wage ceiling, and tax table must be sourced from current official LHDN / KWSP / PERKESO publications at build time and encoded with its effective date. Take no figure from memory or from this document — they shift annually and a stale table is a compliance liability.

### Country packs

`packages/localisation/my/` holds payroll rules now and e-invoicing adapters later — the same versioned-pack shape serves both, which is why the architecture generalises without being built twice. Core code contains **zero** `if (country === 'MY')`.

---

## 8. AI layer

AI sits **above** the application layer, never beneath it.

```
            AI  →  Tool Registry  →  Application API
                                      ├─ queries  → policy → DB
                                      └─ commands → policy → DB
```

The agent never receives `DATABASE_URL` and never writes SQL. It receives tools — `get_leave_balance`, `apply_leave`, `explain_payroll_variance`, `draft_claim` — and every tool runs through the same tenant context, authorization, validation, audit, and domain rules as a human. Because entities declare an `ai` block, the tool catalogue is generated, not hand-maintained.

| Capability | Notes |
|---|---|
| Personal assistant | Leave balance, apply leave, payslip retrieval, claims. In-app first; WhatsApp in Phase 5 |
| Copilot over data | NL → validated query against a semantic layer, **never raw model-authored SQL** |
| Document intake | Vision → structured output → confidence score → human review queue |
| Agentic automation | Approval routing, payroll variance anomalies, leave-conflict detection |
| App-builder | NL → metadata rows. Ships last, once the metadata engine is proven |

**Guardrails, all non-negotiable:**

1. AI acts through the same API and policy layer as humans. No back door.
2. Anything with financial or statutory consequence produces a **draft requiring human approval** — AI proposes, human approves, system executes.
3. Every AI action is audited with model, prompt hash, and tool trace.
4. Agent identity is distinct from user identity — separately scoped and revocable.
5. Confidence thresholds on extraction; below threshold routes to a human, never guesses a number into a payslip.
6. **RAG is tenant-filtered inside the query.** Never `ORDER BY embedding <=> q LIMIT 20` globally and filter afterwards.

---

## 9. Repository shape

```
/
├─ apps/          web · api · worker            executable compositions
├─ modules/       hr · payroll  (→ later: crm, sales, inventory, accounting)
├─ packages/      ui · tokens · api-client[GEN] · db · auth · tenancy · policy
│                 metadata · workflow · audit · files · events · ai
│                 localisation/my · testing
├─ contracts/     OpenAPI sources
├─ docs/adr/      one file per non-obvious decision
├─ tooling/       architecture fitness functions
└─ CLAUDE.md      the laws
```

`packages` = reusable platform primitives · `modules` = business capabilities · `apps` = compositions.

**Dependency direction, mechanically enforced:**

```
apps → modules → platform packages → shared primitives

UI → generated API client → HTTP        NEVER  UI → repository / db / Drizzle
HTTP handler → command/query → domain policy → repository → Postgres
```

> **The platform kernel must not know Payroll exists.** Payroll depends on platform capabilities; platform never depends on Payroll. Modules communicate through application interfaces and domain events — never by importing another module's tables. (doc 3 §33)

---

## 10. Operating model for agent-driven development

The stack is half the answer; the repo must be built for an agent to work in.

**`CLAUDE.md` stays short — laws only, pointing at `docs/architecture/`:**

```
1.  UI talks only through generated API clients.
2.  Modules never import another module's repository.
3.  Database access exists only in repositories.
4.  tenant_id is mandatory on tenant-owned data; RLS on every such table.
5.  API contracts change before implementation.
6.  Generated files are never edited.
7.  Historical financial and payroll records are immutable.
8.  Country rules live in localisation packs; no country codes in core.
9.  AI uses application tools, never database access.
10. Money is numeric in storage, integer sen in the payroll engine. Never float.
11. No Server Actions for mutations.
12. pnpm verify is authoritative.
```

**Architecture fitness functions** — deterministic guards, not politeness (doc 3 §31). CI fails on: UI importing `db` · cross-module repository imports · a tenant table missing `tenant_id` or an RLS policy · modified generated files (`pnpm generate && git diff --exit-code`) · a route with no `operationId` · an undocumented permission code · a country code in core · direct mutation of a ledger or payroll-run table · cyclic module dependencies.

**Further rules that keep output good over months:**

- CI is the contract: `tsc --noEmit` → Biome → Vitest → Playwright → migration check. Red is a hard stop.
- If an agent is writing repetitive code, the generator is missing a feature.
- One ADR per non-obvious decision, so a future session inherits reasoning instead of re-litigating it.
- **Hand-specify the payroll engine.** Statutory calculation is *not* vibe-codeable. Write the spec, then property-based tests (`fast-check`), then let the agent implement against them.
- Feature-slice the work: "leave request, entity → API → UI → tests" is a good task. "Build HR" is not.

---

## 11. Roadmap

| Phase | Deliverable | Exit criterion |
|---|---|---|
| **0 — Spine** | Monorepo, Next.js, Hono, OpenAPI→Orval→MSW, Drizzle, Better Auth, CI + fitness functions | One entity: contract → mocks → UI → handler → tests, all generated paths green |
| **1 — Tenancy kernel** | `tenant`/`legal_entity`/`business_unit`, RLS, `withTenant()`, domain resolution, policy engine | **Automated proof that tenant A cannot read tenant B's rows** |
| **2 — Design system** | Tokens, shadcn layer, grid, form renderer, command palette, PWA shell | A new entity's UI needs zero bespoke code |
| **3 — Metadata engine** | Entity registry, 3-tier storage, overlay resolution, generated CRUD | A tenant adds a custom field with zero DDL |
| **4 — HR core** | Employee, org chart, leave, claims, documents, approvals | Full leave request → approval → balance cycle |
| **5 — MY payroll** | Rule packs, run engine, payslips, EA/CP8D, bank files | **Golden-file tests pass against published statutory tables** |
| **6 — AI** | Copilot, assistant, document intake, MCP server | AI operates strictly within the caller's policy scope |
| **7 — Scale-out** | WhatsApp, custom domains, dedicated-DB tier, country #2, ERP modules | — |

**Phases 1 and 5 carry the two blocking gates.** Neither passes on a manual eyeball.

Phase 0–3 is the highest-risk work in the project: if the kernel is wrong, everything downstream inherits the error. Build it, prove it on one entity, and be willing to throw it away once.

---

## 12. Verification

**Tenant isolation (blocking, Phase 1).** Testcontainers: seed two tenants, then assert under `app_user` that a full-table `SELECT` in tenant A's context returns zero of tenant B's rows — **for every tenant-scoped table, enumerated dynamically** so a new table cannot silently escape the check. Companion test: a session for tenant A is rejected at tenant B's hostname. CI fails if any tenant-scoped table lacks an RLS policy.

**Payroll correctness (blocking, Phase 5).** Golden files: employee fixtures × rule-pack versions → asserted payslip lines, verified against officially published tables. Cover the cases that break naive implementations — wage-band boundaries, mid-month joiners and leavers, unpaid-leave proration, multiple pay elements, EPF age thresholds. Property test: gross reconciles to net plus deductions, exactly, in integer sen. Second property test: recomputing a historical run with its pinned rule-pack version reproduces the original payslip byte-for-byte.

**Contract.** OpenAPI validates as 3.1; the spec is diffed in CI so breaking changes surface in review, not in an integrator's inbox. `pnpm generate && git diff --exit-code` proves no generated drift.

**E2E.** Playwright against a Neon branch: signup → tenant + legal entity → add employee → run payroll → approve → download payslip.

**Manual.** Two tenant subdomains side by side in separate browser profiles — a sanity check *on top of* the automated proof, never instead of it.

---

## 13. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Metadata engine over-abstracts into Odoo | **High** | Four planes; the one-entity rule; the 80/20 rule; escape hatches first-class; review and delete generator features monthly |
| RLS misconfiguration leaks salary data | **High** | `withTenant()` chokepoint, non-owner role, `FORCE RLS`, CI enumeration test |
| Agent-written payroll is subtly wrong | **High** | Hand-specified engine, property-based tests, golden files; no AI-authored statutory logic merges without them |
| Vibe-coding quality decay over long sessions | **High** | Types + tests + fitness functions; small feature slices; CI as hard gate |
| Tenant ≠ legal entity discovered late | **High** | Modelled correctly from Phase 1 — this is why §1.5 matters |
| JSONB custom fields degrade at scale | Medium | GIN by default, promote on measured need, per-tenant query-cost dashboard from day one |
| Statutory rates drift annually | Medium | Effective-dated packs; calendar reminder before each MY update cycle |
| Next.js server/client boundary bugs | Medium | Mechanical rule; lint rule forbidding mutations outside the API client |

---

## 14. Open items for Phase 0

- **Neon MCP auth is failing (HTTP 401)** — refresh the token, or provision Postgres via the Vercel Marketplace.
- **Vercel CLI not installed** — `npm i -g vercel` unlocks `env pull`, `deploy`, `logs`.
- **Two post-cutoff claims to verify** before they influence code: whether shadcn defaults to Base UI (doc 3), and Better Auth's ownership/licensing status (doc 2). Neither changes the architecture — the `packages/auth` facade stays thin regardless, and `shadcn init` picks its own current default — but both should be confirmed rather than inherited.
- **Confirm Trigger.dev vs Inngest** for the durable runner. The transactional outbox is in Postgres either way, so this is reversible.
