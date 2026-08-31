# Tech Stack Proposal — AI-Native, Metadata-Driven Multi-Tenant Business Platform (SEA)

**Working codename:** Meridian
**Optimised for:** agent-driven development (Claude Code), DRY + KISS, API-first, frontend-led
**Target market:** Vietnam, Indonesia, Malaysia, Thailand, Philippines, Singapore

---

## 0. The stack at a glance

| Layer | Choice | One-line reason |
|---|---|---|
| Language | **TypeScript** (strict), everywhere | One type system end-to-end = the agent's feedback loop |
| Runtime | **Node 22/24 LTS** | Boring, stable, maximum training data |
| Monorepo | **pnpm workspaces + Turborepo** | Small packages, cached builds, clear boundaries |
| Frontend | **Next.js 16 (App Router) + React 19.2** | Best-documented React stack; middleware solves tenant URLs |
| UI kit | **shadcn/ui + Tailwind v4 + Radix** | Components live *in your repo* as plain code the agent can read and edit |
| Data grid | **TanStack Table** + TanStack Query | ERP is 80% grids and server state |
| Forms | **react-hook-form + Zod** | Same Zod schema validates client, server, and DB |
| API | **Hono + `@hono/zod-openapi`** | Real REST + auto OpenAPI spec + generated typed client |
| DB | **PostgreSQL 17** (Neon / Supabase / self-host) | RLS, JSONB, pgvector, full-text — one engine, four jobs |
| ORM | **Drizzle ORM** | SQL-shaped, TS-native, no second schema language, RLS-aware |
| Auth | **Better Auth** (organization + SSO plugins) | TS-native, self-hostable, org primitive = tenant primitive |
| Jobs | **pg-boss** or **Graphile Worker** | Queue inside Postgres — zero extra infrastructure |
| Search | Postgres FTS → **Meilisearch** when it hurts | Don't buy a search cluster on day one |
| Files | **Cloudflare R2** (S3-compatible) | No egress fees — material in SEA |
| AI | **Vercel AI SDK v5** + Claude via Anthropic API + **pgvector** | Model-agnostic, streaming UI, RAG in the same DB |
| Custom domains | **Cloudflare for SaaS** (Custom Hostnames) | Automatic TLS for thousands of tenant domains |
| Quality | **Vitest + Playwright + Testcontainers + Biome** | These *are* the guardrails for vibe coding |

---

## 1. Design principles, mapped to your constraints

### "Pure vibe coding by Claude Code"

This constraint drives more decisions than any other, and it is usually underweighted. An agent writes good code when three things are true:

1. **The stack is heavily represented in training data.** Popularity is a technical requirement here, not a fashion choice. This is why Next.js beats TanStack Start, why Tailwind beats a bespoke CSS system, and why Postgres beats anything exotic.
2. **Mistakes surface within seconds, not at runtime.** `tsc --noEmit` + Zod at every boundary + Vitest gives the agent a tight correction loop. Without it, quality decays roughly linearly with session length.
3. **The agent can read every layer.** shadcn/ui copies components into your repo instead of hiding them in `node_modules`. Drizzle emits readable SQL. Hono routes are plain functions. Nothing is magic, so nothing has to be guessed at.

**Corollary:** the value of a "clever" abstraction drops sharply when an agent writes the code. Verbose-but-obvious beats terse-but-magical. This rules out Odoo-style ORM metaprogramming.

### DRY, applied once at the right level

DRY is not about avoiding repeated lines. It's about a **single source of truth per fact**. In this system there is exactly one: the **entity definition**. Everything else is generated from it (Section 3). Business logic itself stays explicit and readable.

### KISS, as a hard budget

- One language. One database. One deployment artifact until proven otherwise.
- No Kubernetes, no service mesh, no event bus, no microservices at launch.
- **Rule:** every new piece of infrastructure must eliminate a named, measured pain. Redis is not added "because scale." pg-boss runs inside the database you already have.

### API-first, literally

The web UI is a client of the public API, not a privileged sibling. Same routes, same auth, same rate limits. If the UI needs an endpoint that isn't in the OpenAPI spec, that's a bug. This gives you mobile apps, partner integrations, and AI tool-calling for free — three things ERPNext and Odoo both retrofitted badly.

### Frontend-led

Budget split roughly **60% frontend/UX, 25% domain logic, 15% infrastructure** for the first year. Infrastructure is deliberately boring and mostly rented. Your competitive wedge against ERPNext and Odoo in SEA is not scalability — it's that their UIs are painful and their mobile stories are weak.

---

## 2. Layer by layer, with the alternatives rejected

### Frontend — the priority surface

```
Next.js 16 App Router (Turbopack, React Compiler on)
├── Tailwind CSS v4 (@theme tokens — one token file defines the whole system)
├── shadcn/ui + Radix primitives (a11y, keyboard, focus management for free)
├── TanStack Table v8      → virtualized grids, column resize/pin/group, inline edit
├── TanStack Query v5      → server cache, optimistic updates, offline replay
├── react-hook-form + Zod  → forms generated from entity metadata
├── cmdk                   → global command palette (⌘K)
├── Recharts               → dashboards; visx only if a chart genuinely needs it
├── Motion (Framer)        → transitions, drag-reorder, sheet/drawer physics
└── next-intl              → ICU messages, 7 locales, RTL-ready
```

**UX decisions that specifically beat ERPNext/Odoo:**

- **Command palette as the primary navigator.** ERP menu trees are where usability goes to die. ⌘K → "new sales invoice for Acme" should be the fastest path to anything.
- **A real data grid.** Excel-grade keyboard navigation, frozen columns, inline editing, saved views per user, bulk edit, undo. Finance teams live in grids; ERPNext's list view and Odoo's tree view are both weak here, and this is the single most-noticed daily difference.
- **Optimistic mutations everywhere.** Perceived latency is the whole game in Jakarta or Hanoi on a 4G connection.
- **Mobile-first PWA, not a separate app.** SEA is mobile-dominant. Field sales, delivery confirmation, warehouse picking, and approvals need to work one-handed and offline-tolerant. Ship an installable PWA with a service worker and IndexedDB outbox; treat native as a later wrapper, not a rewrite.
- **A design token layer defined before the first screen.** Spacing, radius, elevation, type scale, semantic colours. This is what stops agent-written UI from drifting into inconsistency across 300 screens.
- **Performance budget as CI gate.** ≤180KB JS on the critical path, LCP <2.5s on a throttled 4G profile. Enforced, not aspirational.

**Rejected:** *TanStack Start / Remix* — better architecture, thinner training data, so the agent produces worse code. *Vue/Nuxt* — smaller SEA hiring pool for React-adjacent talent and less shadcn-grade component supply. *Odoo's OWL* — near-zero transferable knowledge.

**One discipline rule for App Router:** the server/client component boundary is the number one source of agent-generated bugs. Keep it mechanical — server components fetch and compose, client components are marked `'use client'` and own all interactivity, and **all mutations go through the HTTP API**, never Server Actions. This also enforces API-first for free.

### API layer

```ts
// packages/api/routes/sales-invoice.ts
const route = createRoute({
  method: 'post',
  path: '/v1/sales-invoices',
  tags: ['Sales'],
  security: [{ bearer: [] }],
  request:  { body: jsonBody(SalesInvoice.createSchema) },   // Zod, from metadata
  responses: { 201: jsonRes(SalesInvoice.readSchema) },
});
```

From one route definition you get: runtime validation, a typed handler, an OpenAPI 3.1 path, a generated TypeScript client (`openapi-typescript` + `openapi-fetch`), Scalar/Stoplight docs, Postman collection, and an AI tool schema. That is API-first with no duplicated effort.

**Rejected:** *tRPC* — excellent internal DX but it is not a public API, and you need one. *GraphQL* — an N+1 and authorisation-surface problem you don't need; REST + OpenAPI is what SEA integration partners, accounting firms, and government e-invoicing gateways actually speak. *NestJS* — decorator/DI ceremony that fights KISS and adds boilerplate the agent must maintain.

### Data layer

```ts
export const salesInvoice = pgTable('sales_invoice', {
  id:         uuid().primaryKey().defaultRandom(),
  tenantId:   uuid().notNull(),                    // every tenant table, no exceptions
  name:       text().notNull(),                    // SINV-2026-00042
  customerId: uuid().notNull().references(() => party.id),
  postingDate:date().notNull(),
  grandTotal: numeric({ precision: 18, scale: 6 }).notNull(),
  status:     text().$type<InvoiceStatus>().notNull(),
  custom:     jsonb().$type<Record<string, unknown>>().notNull().default({}),
  ...auditColumns,
}, (t) => [
  index().on(t.tenantId, t.postingDate),
  uniqueIndex().on(t.tenantId, t.name),
  pgPolicy('tenant_isolation', { using: sql`tenant_id = current_tenant()` }),
]);
```

**Money is `numeric`, never float.** Non-negotiable. Multi-currency means every monetary field carries an amount, a currency, and an exchange rate to the base currency — stored, not recomputed.

**Rejected:** *Prisma* — a second schema language (violates DRY), weaker RLS story, heavier client. *MongoDB* — you are building a ledger; you need transactions and constraints. *MySQL/MariaDB* (ERPNext's choice) — no RLS, weaker JSONB, no pgvector. Postgres doing search + vectors + queue + RLS is the single biggest KISS win in this design.

---

## 3. The metadata engine — this is the actual product

ERPNext's **DocType** is genuinely one of the best ideas in open-source business software: define an entity once, and get schema, form, list view, REST endpoint, permissions, and workflow. Odoo's model inheritance is a close cousin. **Borrow the idea; reject both implementations.**

### The single source of truth

```ts
// packages/domain/entities/sales-invoice.ts
export const SalesInvoice = defineEntity({
  name: 'sales_invoice',
  label: {
    en: 'Sales Invoice', vi: 'Hóa đơn bán hàng',
    id: 'Faktur Penjualan', th: 'ใบแจ้งหนี้ขาย', ms: 'Invois Jualan',
  },
  tenantScoped: true,
  naming: 'SINV-{YYYY}-{#####}',

  fields: {
    customer:    ref('party', { required: true, where: { isCustomer: true } }),
    postingDate: date({ required: true, default: 'today', indexed: true }),
    currency:    currency({ default: '@tenant.baseCurrency' }),
    lines:       childTable('sales_invoice_line', { min: 1 }),
    taxes:       childTable('sales_tax_line'),
    grandTotal:  computed(money(), 'sum(lines.amount) + sum(taxes.amount)'),
    status:      select(['draft','submitted','paid','cancelled'], { default: 'draft' }),
  },

  permissions: {
    ar_clerk:   { read: 'own_branch', create: true, write: 'if:status=draft' },
    ar_manager: { read: 'all', write: 'all', submit: true, cancel: true },
  },

  workflow: 'submit_cancel',            // draft → submitted → (paid | cancelled)

  views: {
    list: ['name','customer','postingDate','grandTotal','status'],
    form: [
      section('Details', ['customer','postingDate','currency']),
      section('Items',   ['lines']),
      section('Totals',  ['taxes','grandTotal']),
    ],
  },

  hooks: {
    beforeSubmit: [checkCreditLimit, reserveStock],
    afterSubmit:  [postToLedger, dispatchEInvoice],   // country adapter resolves at runtime
  },

  ai: { describe: 'A sales invoice issued to a customer', tools: ['read','list','create'] },
});
```

### What gets generated from it

| Artifact | Generated by |
|---|---|
| Drizzle table + SQL migration | `pnpm gen:schema` → `drizzle-kit` |
| Zod create/update/read schemas | compile-time from `fields` |
| REST routes + OpenAPI paths | `@hono/zod-openapi` registrar |
| Typed API client | `openapi-typescript` |
| React list view + form | metadata-driven renderers (one `<EntityForm>`, one `<EntityList>`) |
| Permission checks (row + field) | policy compiler → RLS predicate + app-level filter |
| Audit log + version history | `auditColumns` + trigger |
| i18n message keys | extracted from `label` |
| AI tool definitions (MCP + tool-calling) | `ai` block |

**This is the whole DRY story.** ~120 core entities × 9 artifacts each, from 120 files.

### The three-tier customisation model — where we beat ERPNext

ERPNext lets tenants add fields, and it implements that with `ALTER TABLE`. That is why ERPNext gives every tenant a separate database, and why upgrades and migrations are painful at scale.

| Tier | What | Storage | Migration cost |
|---|---|---|---|
| **1. Core fields** | Ships with the product | Real typed columns | Normal migration |
| **2. Tenant custom fields** | Tenant adds `pic_whatsapp`, `npwp_number` | `custom` JSONB + registry row | **Zero DDL** |
| **3. Tenant custom entities** | Tenant defines a whole new object | Generic `record` table, JSONB payload | **Zero DDL** |

Indexing for tiers 2 and 3: a GIN index on `custom` by default, plus **generated columns** promoted on demand for fields a tenant filters or sorts heavily:

```sql
ALTER TABLE party ADD COLUMN npwp text
  GENERATED ALWAYS AS (custom->>'npwp_number') STORED;
CREATE INDEX ON party (tenant_id, npwp);
```

This is a per-tenant *optimisation*, not a per-tenant *schema*. You keep one migration path for 10,000 tenants. **This single decision is the largest architectural improvement over both ERPNext and Odoo.**

### The rule that keeps this from becoming Odoo

> **If exactly one entity needs a metadata capability, do not add it to the metadata layer. Hardcode it.**

Both ERPNext and Odoo drowned because every special case became a framework feature. Escape hatches are first-class: any entity may override its generated form with a hand-written React component, and any route may be hand-written. The generator is a productivity default, not a prison.

---

## 4. Multi-tenancy and custom tenant URLs

### Isolation: pooled by default, dedicated on request

```sql
-- every tenant-scoped table
ALTER TABLE sales_invoice ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sales_invoice
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

Each request opens a transaction, runs `SET LOCAL app.tenant_id = $1`, and executes as a role **without** `BYPASSRLS`. Application code physically cannot read another tenant's rows even if a `WHERE` clause is forgotten — which matters enormously when an agent writes the queries.

**Why not ERPNext's database-per-tenant?** 5,000 tenants means 5,000 migrations per release, 5,000 backup jobs, and a connection pool that cannot be shared. RLS gives one migration, one pool, one backup.

**Escape hatch for enterprise and data-residency deals:** a tenant record carries `isolation: 'pooled' | 'schema' | 'database'`. The connection resolver reads it; **all other application code is identical**. A Vietnamese bank that demands its own database gets it without a code fork.

### Custom tenant URLs — three levels

1. **Subdomain (default):** `acme.meridian.app` — wildcard DNS + wildcard TLS.
2. **Regional vanity:** `acme.meridian.co.id`, `.com.my`, `.vn` — matters commercially in SEA; local domains read as a local company.
3. **Full custom domain:** `erp.acme.com` — the tenant adds a CNAME; **Cloudflare for SaaS Custom Hostnames** issues and renews certificates automatically and scales to thousands of domains at low per-hostname cost. (Vercel's Domains API is the fallback if you stay fully on Vercel.)

Resolution, in Next middleware:

```ts
// middleware.ts — runs at the edge, ~1ms with cache
const host = req.headers.get('host')!;
const tenant = await tenantCache.get(host);          // KV, 60s TTL
if (!tenant) return NextResponse.rewrite('/unknown-tenant');
const res = NextResponse.next();
res.headers.set('x-tenant-id', tenant.id);
return res;
```

**Security rule:** the API never trusts `x-tenant-id` from the network. It re-derives the tenant from the session token and asserts it matches. The header is a routing hint, not an authorisation claim.

### Authentication

**Better Auth** with the `organization` plugin: organization = tenant, `activeOrganizationId` on the session is the tenancy primitive, and invitations, roles, and teams are built in. SSO/SAML/SCIM plugins cover enterprise tenants; passkeys and OTP cover the SME long tail (important in markets where password hygiene is poor and phone-number identity dominates).

Note for planning: Vercel acquired Better Auth on 7 July 2026; the library remains free and MIT-licensed, keeps its name, and stays framework-agnostic with the original team continuing development. Keep auth behind a thin `packages/auth` facade anyway, so the blast radius of any future change is one package.

### Authorisation — two layers, never one

| Layer | Enforces | Fails safe? |
|---|---|---|
| Postgres RLS | Tenant boundary | Yes — structural, cannot be forgotten |
| Policy engine (from metadata) | Role → entity → field → row rules | Compiled to SQL predicates + response filters |

Start with the compiled policy engine. Add OpenFGA/Permify only if a customer genuinely needs relationship-based access (e.g. "managers of the branch that owns the project"). Do not start there.

---

## 5. The AI layer — the differentiator neither incumbent has

### Architecture

```
Vercel AI SDK v5  ──►  Claude (Anthropic API)  ──►  tools auto-generated
     │                                               from entity metadata
     ├── streaming UI (useChat + generative components)
     ├── pgvector in the same Postgres (RAG over SOPs, contracts, past docs)
     └── MCP server exposing the same OpenAPI spec
```

**The key move:** because every entity declares an `ai` block, the tool catalogue is generated, not hand-written. Add an entity, and the copilot can use it the same day. Roughly 120 entities × 3–5 tools ≈ 500 tools, none maintained by hand.

### Capabilities this unlocks

- **Natural-language operation:** "create a PO for 200 units of SKU-4410 from Sinar Jaya, delivery next Tuesday" — in Bahasa Indonesia or Vietnamese.
- **Ad-hoc reporting:** text → validated query against a semantic layer (never raw SQL from the model), rendered as a chart.
- **Document intake:** photograph a supplier invoice or a delivery note → extracted, matched against the PO, posted as a draft. Enormous in SEA where paper and WhatsApp-image documents are still the norm.
- **Anomaly and approval assistance:** flag the invoice that is 3σ off the vendor's pattern.
- **MCP server per tenant:** the tenant's own Claude Desktop or Claude Code can query and operate their ERP. No competitor offers this.

### Non-negotiable guardrails

1. AI actions execute through **the same API and the same permission layer** as a human. No back door.
2. Anything with financial or inventory consequence produces a **draft requiring human approval**, unless the tenant explicitly opts into autonomy per action type.
3. Every AI action is written to the audit log with the model, prompt hash, and tool trace.
4. Agent identity is distinct from user identity — scoped and independently revocable. (Better Auth's Agent Auth work is aimed exactly at this; design for it now even if you implement it simply at first.)
5. Confidence thresholds on extraction. Below threshold → route to a human queue, never guess a number into a ledger.

---

## 6. SEA localisation and compliance

This is where ERPNext and Odoo are weakest in this region — country modules are community-maintained, frequently stale, and often break on upgrade. **Treat compliance as a first-class, versioned, independently deployable adapter layer**, not a localisation add-on.

```
packages/compliance/
├── core/              # invoice canonical model, submission queue, retry, archive
├── my-myinvois/       # LHDN MyInvois — clearance model, TIN validation, QR, UIN
├── vn-einvoice/       # Decree 123/70 — provider integration, digital signature
├── id-coretax/        # DJP Coretax — XML clearance, NSFP, Faktur Pengganti flow
├── ph-eis/            # BIR Electronic Invoicing System
├── sg-invoicenow/     # Peppol BIS Billing 3.0 via an Access Point
└── th-etax/           # RD e-Tax Invoice & e-Receipt
```

Current picture (verify against the tax authority before committing a delivery date — these dates move):

- **Malaysia:** LHDN runs a Continuous Transaction Control clearance model via the central MyInvois platform, covering B2B, B2C and B2G, phased by FY2022 turnover — Phase 1 (>RM100m) from 1 Aug 2024, Phase 2 (RM25–100m) from 1 Jan 2025, Phase 3 (RM5–25m) from 1 Jul 2025. Phase 4 (RM1–5m) went live 1 January 2026 with the relaxation period extended to a full twelve months, running through December 2026 with full enforcement from 1 January 2027. The exemption threshold was doubled to RM1 million, and any single invoice above RM10,000 must go through MyInvois even for otherwise-exempt businesses — sources disagree on the status of a Phase 5, so confirm directly with LHDN.
- **Indonesia:** Coretax has been fully enforced since 31 December 2025 — DJP clearance is now a legal precondition for a valid invoice rather than a post-creation check, uncleared invoices cannot support the buyer's input VAT deduction, and PER-11/PJ/2025 sets the upload deadline at the 20th of the following month. The correction flow is the operational trap: a mismatched NPWP forces a Faktur Pengganti that the buyer must confirm in their own Coretax account before it reaches "Amended" status — model this state machine explicitly rather than treating corrections as edits.
- **Vietnam, Philippines, Singapore, Thailand:** e-invoicing live or rolling out; Singapore is Peppol-based (InvoiceNow), the others are authority-specific.

**Architectural consequence:** the ledger must never depend on a compliance adapter succeeding synchronously. Post the journal entry, enqueue the clearance submission, reconcile asynchronously, and model `pending → cleared → rejected → amended` as first-class invoice state. Clearance failure is a normal Tuesday, not an exception path.

### Beyond tax

- **Locales:** en, vi, id, ms, th, tl, zh-Hans. ICU messages via next-intl.
- **Language traps to handle up front:** Thai has no inter-word spaces (line-breaking and truncation both need care); Vietnamese needs diacritic-insensitive search (`unaccent` + a normalised search column); Thai dates commonly use the Buddhist Era calendar (BE = CE + 543) — store UTC, render per tenant locale.
- **Payments:** Xendit (ID/PH/VN), Midtrans (ID), Omise/Opn (TH), 2C2P (regional), VNPay & MoMo (VN), Stripe (SG/MY). Domestic QR rails are essential, not optional: **QRIS** (ID), **PromptPay** (TH), **DuitNow** (MY), **VietQR** (VN), **PayNow** (SG).
- **Tax engines:** VAT 8/10% (VN), PPN (ID), SST (MY), VAT 7% (TH), GST 9% (SG), plus withholding tax rules — build as a rules table, not code branches.
- **Data residency:** Vietnam's PDPD (Decree 13/2023) and sectoral rules push toward local storage for some data. The `isolation: 'database'` tier plus a Docker-portable deployment means you can place a tenant in a Vietnamese or Indonesian region without forking the product. Design for it now; don't build it until a contract requires it.
- **WhatsApp / Zalo / LINE** as notification channels. Email-only is a losing default in this region.

---

## 7. Infrastructure — deliberately boring

**Stage 1 (0–50 tenants), managed:**
Vercel (frontend + edge middleware) · Neon or Supabase Postgres, Singapore region · Cloudflare (DNS, R2, Custom Hostnames) · Resend + WhatsApp Business API · Sentry + PostHog + Axiom.

**Stage 2 (50–1,000 tenants), portable:**
The same Docker Compose stack on Hetzner/AWS Singapore or Jakarta, orchestrated with Coolify or Dokploy. Postgres with a read replica and PgBouncer. Still no Kubernetes.

**Stage 3 (data-residency and scale):**
Regional cells (SG, JKT, HAN). Each cell is a full independent stack; tenants are pinned to a cell. This is far simpler than a globally distributed database and is what residency law actually requires.

**Requirement, not a suggestion:** the whole system must run with `docker compose up` on a single machine. It keeps local development fast, keeps CI honest, and preserves the option to hand a self-hosted deployment to a large Vietnamese or Indonesian enterprise — a deal shape that is common here and is a large part of why ERPNext wins accounts.

---

## 8. What we borrow, and what we fix

| | ERPNext / Odoo strength — **keep** | Their weakness — **fix** |
|---|---|---|
| **Metadata** | One definition drives schema, UI, API, permissions | ERPNext does it via `ALTER TABLE` → we use JSONB + promoted generated columns, zero per-tenant DDL |
| **Extensibility** | Customise without forking | Odoo's inheritance magic is unreadable → explicit hooks and typed plugin points |
| **Domain depth** | Decades of correct accounting and inventory semantics | Copy the *semantics*; rewrite the implementation |
| **Modularity** | App/module marketplace | Odoo upgrades break modules → versioned plugin contract + compatibility tests in CI |
| **Multi-tenancy** | Works | Per-tenant DB doesn't scale → shared schema + RLS, dedicated tier on request |
| **Frontend** | Functional and complete | Slow, dated, poor mobile → React + shadcn, PWA, command palette, real grid |
| **API** | Exists | Inconsistent, weakly typed, XML-RPC legacy → OpenAPI-first, generated typed clients |
| **Types** | — | Untyped Python → TypeScript strict end-to-end |
| **Background jobs** | Exists | Fragile workers, opaque failures → transactional Postgres queue, visible retries |
| **AI** | Bolted on | Native: tools generated from the same metadata |
| **SEA compliance** | Community modules | Stale and upgrade-fragile → first-class versioned adapters with a test suite per country |

---

## 9. Operating model for agent-driven development

The stack is only half the answer. The repo has to be built for an agent to work in.

```
meridian/
├── CLAUDE.md                  # architecture rules, invariants, "never do X"
├── docs/adr/                  # one file per architectural decision
├── packages/
│   ├── domain/                # entity definitions — the single source of truth
│   ├── db/                    # Drizzle schema (generated) + migrations
│   ├── api/                   # Hono routes + OpenAPI
│   ├── auth/                  # Better Auth facade
│   ├── ui/                    # design system (shadcn + tokens)
│   ├── metadata-ui/           # <EntityForm>, <EntityList> renderers
│   ├── ai/                    # tool generation, RAG, MCP server
│   └── compliance/            # per-country adapters
└── apps/
    ├── web/                   # Next.js tenant app
    ├── admin/                 # platform back-office
    └── docs/                  # public API documentation
```

**Rules that keep agent output good over months:**

1. **`CLAUDE.md` states the invariants.** Money is `numeric`. Every tenant table has `tenant_id` and RLS. No Server Actions for mutations. No `any`. Field-level permissions are never checked in the UI alone.
2. **CI is the contract:** `tsc --noEmit` → Biome → Vitest → Playwright → migration check. A red build is a hard stop, not a discussion.
3. **Generate, don't hand-write.** If an agent is writing repetitive code, the generator is missing a feature.
4. **One ADR per non-obvious decision**, so a future session inherits the reasoning instead of re-litigating it.
5. **Hand-specify the ledger.** Double-entry posting, currency revaluation, and stock valuation (FIFO/moving average) are **not** vibe-codeable. Write the spec first, then property-based tests (`fast-check`) asserting that debits equal credits and that stock quantity times valuation rate reconciles to the GL balance, then let the agent implement against those tests.
6. **Feature-slice the work.** "Sales invoice, end to end, entity → API → UI → tests" is a good agent task. "Build the accounting module" is not.

---

## 10. Roadmap

| Phase | Duration | Deliverable | Exit criterion |
|---|---|---|---|
| **0 — Spine** | 3–4 weeks | Metadata engine, codegen, RLS tenancy, auth, tenant URL routing, one entity end to end | One entity produces schema + API + form + list + permissions from a single file |
| **1 — Design system** | 2 weeks | Tokens, shadcn layer, grid, form renderer, command palette, PWA shell | A new entity's UI needs zero bespoke code |
| **2 — Core domain** | 8–10 weeks | Ledger, party, item, inventory, sales, purchase, tax rules | Books close; stock reconciles to GL |
| **3 — AI layer** | 4 weeks | Copilot, generated tools, document intake, MCP server | Create a PO end to end by voice in Bahasa Indonesia |
| **4 — Compliance** | 6 weeks | MyInvois + VN e-invoice first, Coretax second | Cleared invoices in production for a pilot tenant |
| **5 — Extensibility** | ongoing | Tenant custom entities, plugin contract, marketplace | A partner ships a module without forking |

**Sequencing note:** Phase 0 is the highest-risk work in the entire project. If the metadata engine is wrong, everything downstream inherits the error. Build it first, prove it on one entity, and be willing to throw it away once.

---

## 11. Risks and open decisions

| Risk | Severity | Mitigation |
|---|---|---|
| Metadata engine over-abstracts and becomes Odoo | **High** | The one-entity rule (§3); escape hatches are first-class; review the generator's feature list monthly and delete |
| JSONB custom fields degrade at scale | Medium | GIN by default; promote to generated columns on measured need; ship a per-tenant query-cost dashboard from day one |
| Agent-written accounting is subtly wrong | **High** | Ledger is hand-specified with property-based tests; no AI-authored posting logic merges without a reconciliation test |
| Compliance dates and formats shift | Medium | Adapters are versioned and independently deployable; never couple clearance to ledger posting |
| Auth vendor direction after acquisition | Low | MIT-licensed and framework-agnostic today; keep the `packages/auth` facade thin |
| Next.js server/client boundary bugs | Medium | Mechanical rule (§2); lint rule enforcing no mutations outside the API client |
| Vibe-coding quality decay over long sessions | **High** | Types + tests are the guardrail; small feature slices; CI as a hard gate |

**Decisions worth making explicitly before Phase 0:**

1. **Managed vs self-hosted Postgres at launch.** Neon's branching is excellent for agent-driven development (a database branch per feature branch); self-hosting is cheaper and residency-friendlier. Recommendation: Neon now, portable schema always.
2. **Whether the ledger is a separate service.** Recommendation: no, but keep it in its own package with a hard interface, so it *can* be extracted.
3. **Which market to launch in.** Recommendation: pick one. Malaysia has the clearest, most documented e-invoicing API surface and English-language business operations, which makes it the cheapest first compliance integration; Vietnam and Indonesia are larger but harder. Do not try to launch in three countries at once.

---

## 12. Summary

TypeScript end to end, Postgres doing four jobs instead of four services, a metadata engine that keeps ERPNext's best idea while discarding its `ALTER TABLE` implementation, RLS multi-tenancy that scales to thousands of tenants on one migration path, OpenAPI-first so the UI, mobile, partners, and AI all consume one contract, and a frontend budget that treats UX as the actual competitive wedge in Southeast Asia.

The stack is chosen as much for what an agent can write well as for what a human would pick — because for this project those are the same question.
