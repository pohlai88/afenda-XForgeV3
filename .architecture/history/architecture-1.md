# Xforge — Tech Stack & Architecture Proposal

## Context

Greenfield (`C:\JackProject\afeda-Xforge` is empty). Available: Node 24, pnpm 11, Python 3.11, Docker 29, Git.

The goal is a multi-tenant, metadata-driven, AI-backed business platform for South East Asia that borrows what ERPNext and Odoo got right and discards what they got wrong — built so that **Claude Code can be the primary author** ("pure vibe coding"), which makes single-language, high-type-density, low-ceremony choices worth real money.

Decisions locked with the user:

| Decision | Choice |
|---|---|
| Hosting | Cloud SaaS only (we host every tenant) |
| Backend language | TypeScript end-to-end |
| First vertical | **HRMS + Payroll** |
| Launch jurisdiction | **Malaysia only** |
| Tenant isolation | Shared schema + Postgres RLS; dedicated-DB tier later |
| Tenant URL | Subdomain free + custom domain on paid tiers |
| AI scope | Personal assistant, copilot over tenant data, document intake, agentic automation, AI app-builder |
| AI channels | In-app first, WhatsApp later |

**Scope warning, stated plainly:** the full vision is 5+ independent subsystems. This plan delivers the **stack decision plus the foundation** (metadata kernel + tenancy + Malaysian payroll). Everything else is sequenced in "Build Phases" and each gets its own spec. Do not attempt the whole thing in one pass.

---

## 1. Thesis: what we borrow, what we fix

**Borrow from ERPNext (Frappe):** the DocType idea — one metadata definition drives table, form, list, permissions, and API. It is the single best idea in open-source ERP.

**Borrow from Odoo:** the module/dependency model, and the discipline that every business object shares one base with audit, attachments, comments, and activity built in.

Where they fail, and what we do instead:

| Their shortfall | Why it hurts | Our answer |
|---|---|---|
| **ERPNext: metadata changes emit DDL.** Every custom field alters a real table, per site. | Migrations across many tenants are fragile and slow; a failed alter wedges a tenant. | **Hybrid storage.** Platform-defined fields are real typed columns. Tenant custom fields live in a `custom` JSONB column with GIN indexes, and can be *promoted* to real columns when they get hot. Zero per-tenant DDL. |
| **Odoo: database-per-tenant only.** | Costly per tenant, painful cross-tenant analytics, slow onboarding. | Shared schema + RLS. Tenant signup is an `INSERT`, not a provision job. Dedicated DB stays available as a premium tier on the *same* codebase. |
| **Both: API is an afterthought** bolted onto a server-rendered monolith. | Integrations are second-class; mobile and AI agents fight the framework. | **API-first by construction.** OpenAPI 3.1 spec is generated from the same Zod schemas the UI uses. There is no internal-only path. |
| **Both: weak/no static typing across the stack.** | Refactors are scary; AI agents guess; runtime errors reach payroll. | One Zod definition → DB schema, API contract, TS types, UI forms, AI tools. A rename fails the build, not production. |
| **Odoo: brutal major-version upgrades; community/enterprise split.** | Customers get held hostage; customizations rot. | Customizations are **data** (metadata rows), not forked code. Upgrading the engine does not touch tenant config. Single edition. |
| **Both: dated UI, poor mobile, no offline.** | SEA workforces are mobile-first and deskless. | Frontend is the priority tier, not the leftover. Modern React, real design system, mobile-first, PWA. |
| **Both: retrofitted AI.** | Bolted-on chatbots that cannot actually act. | AI reads the *same* metadata registry, so every entity is automatically an AI tool. AI capability grows for free as modules are added. |

**The one-line architecture:** *the metadata registry is the single source of truth; the database, the API, the UI, and the AI are all projections of it.*

---

## 2. The stack

### Frontend (highest priority per user)

| Concern | Choice | Why this |
|---|---|---|
| Framework | **Next.js 16, App Router** | RSC keeps payroll data server-side; Cache Components/PPR give fast shells over per-tenant dynamic data. |
| UI runtime | **React 19** + TypeScript `strict` | — |
| Styling | **Tailwind CSS v4** | v4's CSS-first config makes per-tenant theming a variable swap, not a rebuild. |
| Components | **shadcn/ui** | Components are *copied into the repo*, not imported. Full design control — essential when UI/UX is the differentiator, and Claude Code can edit them directly. |
| Data grid | **TanStack Table** | Headless. ERP means dense grids with grouping, virtualization, pinned columns. |
| Server state | **TanStack Query** | — |
| Forms | **react-hook-form + Zod resolver** | Same Zod schema validates the form and the API. One definition. |
| Motion | **Motion (framer-motion)** | Reserved for meaningful transitions only. |
| i18n | **next-intl** | EN + Bahasa Malaysia + 中文 at launch. Non-negotiable for MY. |
| Charts | **Recharts** | Composable, RSC-friendly. |

### API — API-first, and DRY

| Concern | Choice | Why this |
|---|---|---|
| HTTP layer | **Hono** mounted at `app/api/[[...route]]/route.ts` | Tiny, fast, standards-based. One deployment now; lifts out to its own service later with zero rewrite. |
| Contract | **@hono/zod-openapi** | The **OpenAPI 3.1 spec is generated from Zod**, so the public contract can never drift from the implementation. This is what makes it genuinely API-first rather than API-flavoured. |
| Internal client | **`hono/client` (`hc`)** | End-to-end type inference with no codegen step and no duplicated types. |
| External clients | Generated SDKs from the OpenAPI spec | Partners and integrators are first-class from day one. |

> **Layering rule (important):** business logic lives in `packages/core` as plain TypeScript. Hono routes are thin adapters. React Server Components call `packages/core` **directly** — never over HTTP to our own API. This avoids the classic self-fetch anti-pattern while keeping one implementation.

### Data

| Concern | Choice | Why this |
|---|---|---|
| Database | **Postgres (Neon)** | Branching gives a real database per pull request; scale-to-zero keeps dev cheap. *Note: the configured Neon MCP server currently fails auth (HTTP 401) — the token needs refreshing before it can be used.* |
| ORM | **Drizzle ORM + drizzle-kit** | SQL-shaped and predictable — no ORM magic to fight, which matters enormously for AI-authored code. Migrations are reviewable SQL. |
| Isolation | **Postgres RLS, declared via `pgPolicy`** | Verified: `pgTable.withRLS` **denies all rows by default** when no policy is attached. Isolation becomes a database invariant, not a code convention. |
| Search | Postgres FTS, then pgvector | Avoid a second datastore until it genuinely hurts. |
| Cache / config | **Vercel Edge Config** | Host → tenant lookup in middleware with no DB round-trip. |

### Platform services

| Concern | Choice | Why this |
|---|---|---|
| Auth | **Better Auth + organization plugin** | Verified: sessions carry `activeOrganizationId` (our tenant context), plus teams, invitations, and **dynamic access control** — tenants define their own roles at runtime, no deploy. Exactly the metadata-driven ethos. |
| Durable jobs | **Inngest** | Payroll runs, e-filing, and document AI need step-level durability, retries, and idempotency. Payroll must never double-pay. (Vercel Workflow is the native alternative if you prefer fewer vendors; Inngest is the more proven choice for money-moving work.) |
| AI | **Vercel AI SDK v6 + AI Gateway** | Gateway gives model routing, fallback, and cost attribution per tenant without provider lock-in. Claude as primary model. |
| Files | **Vercel Blob (private)** | Payslips are sensitive: private storage, short-TTL signed URLs only. |
| Email | **Resend** + React Email | Payslip and invitation templates as components. |
| Monorepo | **Turborepo + pnpm** | — |
| Testing | **Vitest** (unit), **Playwright** (E2E), **testcontainers** (RLS proofs) | — |
| Observability | **Sentry** + OpenTelemetry | Plus an immutable in-DB audit log — a hard requirement for payroll. |

**Deliberately excluded:** GraphQL (needless indirection here), Redis (Postgres and Edge Config suffice at this stage), Kubernetes (SaaS-only was chosen), microservices (a modular monolith is correct at this size), and any ORM with lazy-loading magic.

---

## 3. Core architecture: five pillars

### Pillar 1 — One definition, seven artifacts

The DRY payoff. A single entity definition produces everything downstream:

```
packages/core/entities/employee.ts   ← the ONLY place this is written
        │
        ├─→ Drizzle table + migration      (storage)
        ├─→ Zod validators                  (input + output)
        ├─→ OpenAPI 3.1 path definitions    (public contract)
        ├─→ TypeScript types                (compile-time safety)
        ├─→ React form + list + detail      (generated, then overridable)
        ├─→ AI tool definition              (assistant can act on it)
        └─→ Audit log shape                 (compliance)
```

Claude Code edits one file; seven layers stay consistent. This is the mechanism that makes vibe coding safe at ERP scale — the type checker catches what a human reviewer would miss.

### Pillar 2 — Hybrid metadata storage

```
employees
  id, tenant_id, employee_no, full_name, nric, hire_date, ...   ← real typed columns
  custom  JSONB                                                 ← tenant-defined fields
  GIN index on custom
```

Platform fields get real columns: fast, constrained, properly indexed. Tenant fields go in JSONB: instant to add, zero DDL, zero migration risk. A background job can promote a heavily-queried custom field into a real column later. This directly avoids ERPNext's per-site DDL problem *and* the query-performance collapse of pure EAV.

### Pillar 3 — Tenancy enforced by the database

Every tenant-scoped table:

```sql
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees FORCE ROW LEVEL SECURITY;   -- also applies to the table owner
CREATE POLICY tenant_isolation ON employees
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

**Three details that are the difference between working and leaking. Get these wrong and the whole model is theatre:**

1. **The app must not connect as the table owner.** RLS silently skips owners and superusers. Create a dedicated `app_user` role, and set `FORCE ROW LEVEL SECURITY` as a belt-and-braces second line.
2. **Use `SET LOCAL`, never `SET`.** Tenant context must be transaction-scoped. With a connection pool, a session-scoped variable leaks to the next tenant that borrows the connection. Every request wraps its work in a transaction that begins with `SET LOCAL app.tenant_id`.
3. **Neon's HTTP driver cannot hold session state across statements.** Use the pooled WebSocket driver for anything RLS-scoped.

All of this is funnelled through **one** helper — `withTenant(tenantId, fn)` — which is the only sanctioned way to obtain a database handle. Nothing else may open a connection. One chokepoint, one thing to audit, one thing to test.

### Pillar 4 — Tenant URL resolution

```
acme.xforge.app          →  wildcard TLS, instant on signup
hr.acme.com.my           →  custom domain, paid tier, auto-provisioned TLS
```

Next.js middleware reads the `Host` header, resolves it to a tenant via **Edge Config** (sub-millisecond, no DB hit), and injects the tenant into the request. Custom domains are registered through the Vercel Domains API with DNS-based ownership verification before activation. The resolved tenant is cross-checked against the session's `activeOrganizationId` — a mismatch is rejected, so a valid session for tenant A cannot be replayed against tenant B's hostname.

### Pillar 5 — Payroll as a pure function

The crown jewel, and the part most likely to be got wrong. Design it as:

```ts
calculatePayroll(
  employeeSnapshot,     // immutable copy of employee state at run time
  rulePack,             // versioned, effective-dated statutory rules
  period
) → PayslipLine[]       // deterministic, no I/O, no DB access
```

Rules that must hold:

- **No I/O inside the engine.** Pure input → output makes it exhaustively unit-testable and trivially reproducible three years later during an audit.
- **Money is `bigint` in minor units (sen).** Never floats. Ever.
- **Statutory rates are versioned data, not code.** EPF, SOCSO, and EIS are **wage-band lookup tables**, not clean percentages — encoding them as formulas is a known and expensive mistake. Rates change annually, so effective-dated rule packs mean a rate change is a data row, not a deploy.
- **Payroll runs are immutable.** Corrections create a reversing entry plus a new run. Never mutate a completed run.
- **Golden-file tests** for every rule pack, asserted against officially published tables.

Malaysian scope at launch — EPF (KWSP), SOCSO (PERKESO), EIS (SIP), PCB/MTD with CP38, HRD Corp levy, Borang EA and CP8D year-end forms, and Employment Act 1955 leave entitlements (as amended 2022). Bank giro files for salary disbursement.

> **Flag for implementation:** every rate, wage ceiling, and tax table must be sourced from the current official LHDN / KWSP / PERKESO publications at build time and encoded with its effective date. Do not take any figure from memory or from this document — figures shift annually and a stale table is a compliance liability.

---

## 4. AI layer

Because entities are metadata, the AI does not need a bespoke integration layer — it reads the same registry the UI does.

| Capability | Approach |
|---|---|
| **Personal assistant** | Employee-facing: leave balance, apply leave, payslip retrieval, claim submission. In-app first; WhatsApp Business API in Phase 4. |
| **Copilot over tenant data** | NL → structured query against the metadata registry. Executes under the **same RLS context as the user**, so the AI can never see what the user cannot. Non-negotiable. |
| **Document intake** | Vision model → Zod structured output → confidence score → human review queue. Never auto-commits a low-confidence extraction. |
| **Agentic automation** | Inngest-backed: approval routing, anomaly detection on payroll variance, leave-conflict warnings. |
| **AI app-builder** | NL → metadata rows (entity, fields, views, workflow). Feasible *only* because customization is data. Ship last, once the metadata engine is proven. |

Two hard rules: **AI writes are proposals, never direct commits** — every mutation lands in an approval queue with a diff. And **AI never bypasses RLS** — it uses the caller's tenant context, without exception.

---

## 5. Repository layout

```
apps/
  web/                    Next.js 16 — UI + Hono API route + middleware
packages/
  core/                   domain services, pure TS, no HTTP  ← the real product
    entities/             metadata definitions (single source of truth)
    payroll/              pure calculation engine
      rule-packs/my/      versioned, effective-dated MY statutory rules
    tenancy/              withTenant(), RLS context helper
  db/                     Drizzle schema, RLS policies, migrations
  ui/                     shadcn components + design system
  ai/                     AI SDK tools generated from the metadata registry
  jobs/                   Inngest functions
```

---

## 6. Build phases

Each phase is a separate spec and a separate implementation cycle. Do not run them together.

| Phase | Scope | Exit criterion |
|---|---|---|
| **0 — Skeleton** | Monorepo, Next.js, Hono, Drizzle, Better Auth, CI | A page renders; the OpenAPI spec generates; CI is green |
| **1 — Tenancy kernel** | RLS policies, `withTenant()`, host resolution, org onboarding | **An automated test proves tenant A cannot read tenant B's rows** |
| **2 — Metadata engine** | Entity registry, hybrid JSONB storage, generated CRUD API + UI | A new entity is defined in one file and is fully usable end-to-end |
| **3 — HR core** | Employees, org chart, leave, claims, documents, approvals | A full leave request → approval → balance cycle works |
| **4 — MY payroll** | Rule packs, run engine, payslips, EA/CP8D, bank files | Golden-file tests pass against published statutory tables |
| **5 — AI** | Copilot, assistant, document intake | AI operates strictly within the caller's RLS context |
| **6 — Scale-out** | WhatsApp, custom domains, dedicated-DB tier, country #2 | — |

Phase 1's exit criterion is the most important gate in the entire plan. Do not proceed past it on the basis of a manual check.

---

## 7. Verification

**Tenant isolation (blocking, Phase 1).** With testcontainers, seed two tenants, then assert under `app_user` that a full-table `SELECT` inside tenant A's context returns zero of tenant B's rows — for every tenant-scoped table, enumerated dynamically so a new table cannot silently escape the check. Add a companion test asserting that a session for tenant A is rejected when presented at tenant B's hostname. A CI check should fail the build if any tenant-scoped table lacks an RLS policy.

**Payroll correctness (blocking, Phase 4).** Golden-file tests: fixed employee fixtures × rule-pack versions → asserted payslip lines, verified against officially published tables. Include the boundary cases that break naive implementations — wage-band edges, mid-month joiners and leavers, unpaid leave proration, multiple pay elements, and the EPF age thresholds. Property test: gross always reconciles to net plus deductions, exactly, in integer sen.

**API contract.** Assert the generated OpenAPI spec validates as 3.1, and diff it in CI so breaking changes are visible in review rather than discovered by an integrator.

**E2E.** Playwright: signup → tenant provisioning → add employee → run payroll → download payslip, executed against a Neon branch.

**Manual.** `pnpm dev`, visit two tenant subdomains side by side in separate browser profiles, confirm complete data separation by inspection as a sanity check on top of the automated proof.

---

## 8. Risks and non-goals

| Risk | Mitigation |
|---|---|
| RLS misconfiguration leaks salary data | Single `withTenant()` chokepoint; `FORCE RLS`; non-owner role; CI test enumerating every table |
| Payroll miscalculation | Pure engine, versioned rule packs, golden files against official tables, immutable runs |
| Metadata engine over-generalized | Phase 2 must serve Phase 3's real needs — build it for HR first, generalize only on the second module |
| Statutory rates drift annually | Effective-dated rule packs; a calendar reminder before each MY statutory update cycle |
| Scope explosion | Phase gates; one spec per phase |

**Non-goals for v1:** on-prem deployment, countries beyond Malaysia, accounting/inventory/CRM modules, offline-first sync, a public app marketplace.

---

## Open items to confirm during Phase 0

- Neon MCP auth is currently failing (HTTP 401) — refresh the token, or provision Postgres through the Vercel Marketplace instead.
- The Vercel CLI is not installed; `npm i -g vercel` unlocks `vercel env pull`, `deploy`, and `logs`.
- Figma MCP requires OAuth authorization, which cannot be completed in a non-interactive session — needed only if design handoff runs through Figma.
