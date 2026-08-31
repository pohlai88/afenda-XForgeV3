# Xforge — Canonical Reference Architecture v1

**Status:** Proposed canonical architecture for consideration  
**Date:** 31 August 2026  
**Purpose:** Consolidated and reconciled from `architecture-1.md`, `architecture-2.md`, and `architecture-3.md`  
**Optimised for:** Claude Code–first development, DRY, KISS, API-first architecture, frontend-led delivery, multi-tenancy, metadata-driven extensibility, AI-native operation, and Southeast Asia localisation  
**Launch wedge:** Malaysia HRMS + Payroll  
**Long-term scope:** Multi-purpose business/ERP platform across Southeast Asia

---

## 0. Executive decision

Xforge should **not** attempt to become another ERPNext or Odoo implementation.

It should borrow their strongest ideas:

- Frappe/ERPNext: metadata as a first-class platform capability.
- Odoo: modular business applications, dependency-aware composition, and deep domain semantics.
- Both: extensibility without requiring every customer to fork the core product.

But it should deliberately reject the architectural patterns that create long-term coupling:

- metadata that directly owns persistence, API, UI, permissions, and workflow simultaneously;
- per-tenant schema mutation for normal customisation;
- invisible inheritance chains;
- weakly typed internal boundaries;
- server-rendered UI as a privileged path around the API;
- database-per-tenant as the only tenancy model;
- business rules hidden inside framework magic;
- microservices and infrastructure complexity before there is measured need.

### Canonical thesis

> **Explicit core. Metadata at the edges. Contract in the middle.**

The platform should be a **strict modular monolith**, with a **public API contract as the integration spine**, **PostgreSQL as the transactional source of truth**, **metadata as a controlled composition mechanism**, and **AI as an authorised client of normal application capabilities**.

The architecture should optimise for one additional constraint that traditional ERPs were never designed around:

> **Claude Code must be able to find one obvious place for every fact, make a small change, receive deterministic feedback, and leave the repository architecturally cleaner rather than progressively more magical.**

---

# 1. Locked product and architecture decisions

| Decision | Canonical choice |
|---|---|
| Product model | Cloud SaaS first; portable architecture, not on-prem product in v1 |
| Primary development model | Claude Code / agent-driven feature slices |
| Language | TypeScript, strict, end-to-end |
| First vertical | HRMS + Payroll |
| Launch jurisdiction | Malaysia |
| Long-term market | Malaysia, Singapore, Vietnam, Indonesia, Thailand, Philippines |
| System shape | Strict modular monolith |
| API | REST + OpenAPI 3.1, first-class and externally consumable |
| Product delivery sequence | Frontend-led, contract-before-handler |
| Database | PostgreSQL |
| Managed database at launch | Neon |
| Tenant isolation | Shared schema + `tenant_id` + PostgreSQL RLS |
| Enterprise escape hatch | Dedicated database / region later, same application contracts |
| Tenant URL | Platform subdomain by default; custom domain on eligible tiers |
| Metadata | First-class, but bounded; not the owner of all architecture planes |
| Custom fields | JSONB + registry, promoted only on measured need |
| Core business data | Real relational tables, constraints, indexes |
| AI | Native platform layer using application tools, never privileged DB access |
| AI writes | Draft/proposal by default for consequential actions |
| Localisation | Versioned country packs + separate statutory/compliance adapters |
| Infrastructure | Managed and deliberately boring; no Kubernetes, Kafka, Redis, Elasticsearch by default |

---

# 2. Design doctrine

## 2.1 Vibe-first

The platform is intentionally designed for an AI coding agent to remain reliable across a large repository.

Therefore prefer:

- popular, well-documented technology;
- high static type density;
- explicit code over reflection and metaprogramming;
- small modules over giant framework bases;
- deterministic code generation;
- deterministic architecture tests;
- short dependency paths;
- one canonical location per concern;
- small end-to-end feature slices.

Avoid abstractions whose primary benefit is saving lines of code while increasing inference cost.

### Rule

> **Verbose-but-obvious beats terse-but-magical.**

---

## 2.2 DRY: one source of truth per fact

Do **not** interpret DRY as “one mega entity definition generates the entire platform.”

The correct rule is:

> **Each fact has one authoritative source. Derived artifacts may be generated, but independent concerns remain independently authoritative.**

Examples:

| Fact | Authority |
|---|---|
| API operation shape | typed route contract / OpenAPI |
| Persistent column/index/constraint | Drizzle/PostgreSQL schema |
| Business invariant | domain/application code |
| Generic field semantic | semantic/entity registry |
| Form composition | experience metadata or hand-written UI |
| Role/action permission | policy registry |
| Tenant custom field | metadata registry row |
| Statutory rate | effective-dated country rule pack |
| Generated client | generated from OpenAPI; never hand-edited |

This preserves DRY **without recreating Frappe-style architectural coupling**.

---

## 2.3 KISS as an infrastructure budget

Start with:

- one language;
- one primary database;
- one principal web deployment;
- one API style;
- one auth facade;
- one durable-job mechanism;
- one observability convention;
- one canonical verification command.

A new infrastructure dependency is introduced only when it removes a **named and measured pain**.

Therefore no initial:

- Kubernetes;
- service mesh;
- Kafka;
- Redis;
- Elasticsearch;
- MongoDB;
- separate vector database;
- microservices;
- generic distributed event platform.

---

## 2.4 API-first and frontend-led are not contradictory

**API-first defines architectural authority.**  
**Frontend-led defines development order.**

Every feature follows this path:

```text
UX intent
   ↓
interaction + state design
   ↓
typed API route contract
   ↓
OpenAPI 3.1
   ↓
generated browser client + MSW mocks
   ↓
complete frontend against mocks
   ↓
application command/query implementation
   ↓
repository / database
   ↓
contract + integration + E2E verification
```

The frontend therefore does not wait for infrastructure, but it also never invents an unofficial data path.

---

# 3. What we borrow from ERPNext and Odoo — and how we improve it

| Area | Keep | Reject | Xforge answer |
|---|---|---|---|
| Metadata | Fast composition of common business objects | One metadata object owning every concern | Semantic registry + separate Data/Contract/Experience/Policy planes |
| Custom fields | Customer extensibility | `ALTER TABLE` per tenant for normal customisation | JSONB + custom-field registry; promote only on measured need |
| Modules | Installable business capability model | Invisible cross-module imports and deep inheritance | Typed module manifests + explicit dependencies + events |
| Views | Reusable configurable views | XML/XPath inheritance chains | Stable slots + deterministic overlays |
| Domain semantics | Mature accounting, stock, HR concepts | Framework-specific implementation magic | Re-specify semantics in explicit TS + tests |
| Multi-tenancy | Mature SaaS operation | DB-per-tenant as the default/only model | Shared schema + RLS; dedicated tier later |
| Extensibility | Customise without core fork | Tenant code patches | Configuration as data + typed plugin points |
| API | Integration capability | API as secondary feature | Contract-first REST/OpenAPI |
| UI | Functional business workflows | Desktop-heavy, menu-tree-heavy UX | Modern React, real grid, command palette, mobile-first workflows |
| AI | Add assistant capability | AI bolted onto privileged internal APIs | AI uses same authorised application tools as humans |
| Localisation | Country modules | Stale community add-ons | Versioned country packs + compliance adapters + test suites |

---

# 4. System shape: strict modular monolith

Do not start with service-per-domain.

```text
                           ┌─────────────────────────┐
                           │       XFORGE WEB        │
                           │ Next.js + React + UI    │
                           └────────────┬────────────┘
                                        │
                                  API contract
                                        │
                           ┌────────────▼────────────┐
                           │        HONO API         │
                           │ thin HTTP adapters      │
                           └────────────┬────────────┘
                                        │
                    ┌───────────────────▼───────────────────┐
                    │        APPLICATION / DOMAIN           │
                    │ HR · Payroll · Sales · Inventory ... │
                    └──────────────┬───────────────┬────────┘
                                   │               │
                             repositories       outbox
                                   │               │
                           ┌───────▼────────┐      │
                           │  PostgreSQL    │      ▼
                           │ RLS · JSONB    │  Trigger.dev /
                           │ FTS · pgvector │  integrations
                           └────────────────┘

        CROSS-CUTTING PLATFORM
        Identity · Tenancy · Organization · Policy · Metadata · Workflow
        Audit · Files · Events · Jobs · Notifications · Integration
        Localization · AI
```

### Modular-monolith rule

Modules behave as if they **could** become services later, without paying the operational cost today.

A module may communicate through:

1. another module's public application interface;
2. domain/application events;
3. stable shared platform capabilities.

It may **not** import another module's repository, Drizzle table internals, or private UI implementation.

---

# 5. Canonical technology stack

## 5.1 Foundation

| Concern | Choice |
|---|---|
| Language | TypeScript strict |
| Runtime | Node.js 24 LTS |
| Package manager | pnpm 11 |
| Monorepo | Turborepo |
| Formatting/lint | Biome plus targeted architecture ESLint rules only where needed |
| Local runtime | Docker Compose compatibility |

---

## 5.2 Frontend — the priority surface

| Concern | Choice | Architectural reason |
|---|---|---|
| Framework | Next.js 16 App Router | Mature React ecosystem and deployment model |
| Runtime | React 19 | Main application UI runtime |
| Component base | shadcn/ui + Base UI | Open code; directly editable by Claude Code |
| Styling | Tailwind CSS v4 | Token-first, tenant theme friendly |
| Design tokens | CSS variables + OKLCH semantic tokens | Consistent themes and tenant branding |
| Data/grid | TanStack Table + virtualization | ERP-grade dense interaction |
| Server state | TanStack Query | Explicit browser/API state boundary |
| Forms | React Hook Form + Zod | Fast forms + runtime validation |
| Mocking | MSW | Frontend-first development from contracts |
| Generated client | Orval | OpenAPI → TS models, TanStack Query hooks, mocks |
| i18n | next-intl | SEA localisation and ICU messages |
| Charts | Recharts initially | Sufficient default dashboard layer |
| UI workshop | Storybook | Isolated component/state development |
| E2E | Playwright | User-flow authority |

### UX principles

- command palette is a first-class navigation surface;
- data grids support keyboard operation, pinning, resizing, saved views and bulk work;
- mobile workflows are designed intentionally, not desktop layouts squeezed smaller;
- PWA/offline-tolerant workflows are introduced only for use cases that need them;
- loading, empty, permission-denied, partial-data, error and retry states are designed before API implementation;
- token and component architecture is established before application screens proliferate.

### 80/20 UI rule

Use metadata renderers for repetitive CRUD surfaces:

- master data forms;
- simple list/detail pages;
- filters and saved views;
- lightweight approval workflows;
- simple dashboards and reports.

Hand-build high-value workflows:

- payroll processing;
- bank reconciliation;
- month-end close;
- inventory planning;
- manufacturing planning;
- POS;
- complex quotations/orders;
- executive workspaces;
- AI workbench.

The generator is a productivity default, **not a prison**.

---

# 6. API architecture

## 6.1 Choice

Use:

- **Hono** as the thin HTTP adapter;
- **Zod** schemas at route boundaries;
- **`@hono/zod-openapi` / Hono OpenAPI tooling** for typed route contracts;
- **OpenAPI 3.1** as the public artefact;
- **Orval** to generate browser SDK + TanStack Query hooks + MSW mocks;
- **Scalar** or equivalent for interactive API documentation.

### Why Hono over Fastify for v1

Hono wins for the initial architecture because:

- the adapter layer stays extremely small;
- routes are plain functions rather than DI/decorator graphs;
- it works naturally with TypeScript and Next.js;
- it can be mounted in the initial web deployment;
- it can later run independently on Node without changing domain/application code.

Fastify remains a viable future runtime if an independently scaled Node API develops requirements that justify it. The domain architecture must not depend on Hono.

---

## 6.2 Contract-before-handler

A feature is not API-first if the OpenAPI document is reverse-engineered only after implementation.

The canonical sequence is:

```text
1. UX interaction designed
2. route operation + request/response schema declared
3. OpenAPI generated
4. browser client + mock generated
5. frontend completed against mocks
6. handler implemented
7. OpenAPI diff reviewed in CI
```

The **route contract** is the authored API authority; OpenAPI is the canonical language-neutral projection of that authority.

---

## 6.3 No privileged frontend business path

Browser business operations use the generated API client.

Do not use Next.js Server Actions as a second business API.

React Server Components are used primarily for:

- shell composition;
- authentication/session bootstrap;
- route-level metadata;
- static/low-volatility presentation data.

When server-side prefetch of business data is required, it must use a **contract-bound server transport** that invokes the same application handler semantics, not arbitrary imports from repositories or Drizzle.

### Forbidden

```text
React UI → Drizzle
React UI → repository
React UI → foreign module internals
Server Action → hidden business mutation
```

---

# 7. Four architecture planes + semantic registry

The final architecture resolves the biggest conflict among the three drafts by separating concerns without duplicating facts.

## 7.1 Data plane

Authority for:

- relational storage;
- constraints;
- indexes;
- foreign keys;
- RLS;
- immutable ledger tables;
- migration history.

Technology: PostgreSQL + Drizzle.

---

## 7.2 Contract plane

Authority for:

- REST operations;
- request/response envelopes;
- error shapes;
- pagination;
- idempotency semantics;
- external integration compatibility;
- versioning and deprecation.

Technology: typed Hono route contracts → OpenAPI 3.1.

---

## 7.3 Experience plane

Authority for:

- field presentation;
- section ordering;
- form/list composition;
- visibility;
- labels;
- saved views;
- dashboard composition;
- commands;
- tenant theme;
- user preferences.

Technology: metadata + explicit React escape hatches.

---

## 7.4 Policy plane

Authority for:

- permissions;
- scopes;
- workflow transitions;
- approval requirements;
- field/row access;
- AI action policy.

Technology: explicit policy registry + application checks + PostgreSQL RLS for tenant boundary.

---

## 7.5 Semantic/entity registry

The semantic registry holds facts genuinely shared across planes, such as:

```text
entity id
field id
semantic type
reference target
human label key
searchability hint
sensitivity classification
AI description
customisation capability
```

It can generate safe repetitive artifacts, but it must **not silently migrate all four planes**.

Changing `labelKey` must never alter a database column.
Changing UI visibility must never relax API validation.
Changing a custom field must never bypass policy.

---

# 8. Metadata and customisation model

## 8.1 Overlay hierarchy

```text
System/core definition
        ↓
Country pack
        ↓
Tenant configuration
        ↓
User personalisation
```

The merge algorithm must be:

- deterministic;
- typed;
- version-aware;
- conflict-detecting;
- inspectable in an effective-configuration view.

Do not implement Odoo-style arbitrary inheritance chains.

---

## 8.2 Stable UI slots instead of XPath-like inheritance

A form may expose slots such as:

```text
header
identity
commercial
logistics
lines
totals
approvals
activity
```

Country packs and tenant customisations may insert, hide, rename or reorder supported elements using stable IDs.

No DOM selector patches.
No arbitrary XPath.
No hidden inheritance chain.

---

## 8.3 Hybrid persistence

### Core fields

Use real typed relational columns.

### Tenant custom fields

Use:

```text
custom_field_definition
+ entity.custom JSONB
```

with a GIN index where justified.

If profiling proves a custom field is frequently filtered, joined or sorted, promote it deliberately to a generated/indexed column or supported index expression.

Promotion is an optimisation workflow, **not automatic metadata-driven schema mutation**.

### Tenant custom entities

A generic JSONB-backed custom-record facility may be introduced later for low-risk tenant-created objects.

It is **not permitted** for:

- accounting ledgers;
- payroll result ledgers;
- inventory movements;
- statutory records;
- other high-integrity transactional cores.

Those remain first-class relational domain models.

---

# 9. Module architecture

A business module is a vertical capability, not merely a folder of tables.

Recommended shape:

```text
modules/
  payroll/
    manifest.ts
    contract/
      routes.ts
    application/
      commands/
      queries/
    domain/
      model/
      rules/
      services/
    infrastructure/
      repository/
    metadata/
      entities/
      forms/
      lists/
      workflows/
      reports/
    ui/
      features/
      screens/
      components/
    events/
    tests/
      contract/
      domain/
      integration/
      e2e/
```

`manifest.ts` declares stable architectural metadata:

```text
id
version
dependencies
optional integrations
permissions
navigation
entities
events
workflows
country extensions
feature flags
```

### Module dependency rule

```text
apps
 ↓
modules
 ↓
platform packages
 ↓
shared primitives
```

No reverse dependency.
No circular business-module dependency.

Example:

```text
sales → contacts + catalog
inventory → catalog
accounting consumes posted business events
payroll → hr + policy + localisation
```

Accounting does not reach into the Sales repository.
It consumes an application contract or event.

---

# 10. Repository shape

```text
xforge/
├─ apps/
│  ├─ web/                   # Next.js tenant application; mounts Hono API in v1
│  ├─ admin/                 # platform operations console
│  └─ docs/                  # public developer/API documentation
│
├─ modules/
│  ├─ hr/
│  ├─ payroll/
│  ├─ contacts/
│  ├─ crm/
│  ├─ catalog/
│  ├─ sales/
│  ├─ purchasing/
│  ├─ inventory/
│  ├─ accounting/
│  ├─ manufacturing/
│  ├─ projects/
│  ├─ pos/
│  └─ service/
│
├─ packages/
│  ├─ api/                   # Hono composition + route primitives
│  ├─ api-client/            # GENERATED from OpenAPI
│  ├─ auth/                  # Better Auth facade
│  ├─ db/                    # Drizzle, migrations, RLS helpers
│  ├─ tenancy/
│  ├─ organization/
│  ├─ policy/
│  ├─ metadata/
│  ├─ metadata-ui/
│  ├─ workflow/
│  ├─ audit/
│  ├─ events/
│  ├─ jobs/
│  ├─ files/
│  ├─ notifications/
│  ├─ integration/
│  ├─ localisation/
│  ├─ compliance/
│  ├─ ai/
│  ├─ ui/
│  ├─ tokens/
│  ├─ testing/
│  └─ money/
│
├─ contracts/
│  └─ openapi/               # generated canonical API artefact + snapshots
│
├─ tooling/
│  ├─ generators/
│  ├─ architecture/
│  └─ scripts/
│
├─ docs/
│  ├─ architecture/
│  └─ adr/
│
├─ CLAUDE.md
├─ turbo.json
└─ pnpm-workspace.yaml
```

### Meanings

```text
apps      = deployable/user-facing compositions
modules   = business capabilities
packages  = reusable platform capabilities
contracts = externally visible generated contracts
```

---

# 11. PostgreSQL and data architecture

## 11.1 Database choice

Use PostgreSQL as the default engine for:

- relational business data;
- transactions;
- tenant RLS;
- JSONB custom fields;
- FTS/trigram search;
- audit records;
- outbox;
- pgvector retrieval;
- configuration.

Use Neon at launch because branch-per-preview/test workflows are especially compatible with agent-driven database development.

Keep schema and migration tooling portable PostgreSQL.

---

## 11.2 Multi-tenancy

Default:

```text
one application
one logical PostgreSQL cluster/project
shared schema
tenant_id on every tenant-owned table
RLS on every tenant-owned table
```

Typical tenant index shapes:

```text
UNIQUE (tenant_id, code)
INDEX  (tenant_id, status)
INDEX  (tenant_id, created_at)
```

Do not make tenant business identifiers globally unique unless there is a genuine platform requirement.

---

## 11.3 RLS is structural, not conventional

Every tenant-scoped table must:

1. contain a non-null `tenant_id`;
2. have RLS enabled;
3. have a tenant policy;
4. be accessed by a non-owner application role without `BYPASSRLS`;
5. use transaction-scoped tenant context;
6. be included in automated policy enumeration tests.

Conceptually:

```sql
ALTER TABLE employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON employee
USING (
  tenant_id = current_setting('app.tenant_id', true)::uuid
)
WITH CHECK (
  tenant_id = current_setting('app.tenant_id', true)::uuid
);
```

Use `SET LOCAL`, not session-wide `SET`, inside the request transaction.

All tenant DB work must pass through a single sanctioned helper such as:

```text
withTenant(tenantId, fn)
```

No package may open an ad-hoc application connection around that chokepoint.

---

## 11.4 Tenant, legal entity and organization are different concepts

```text
USER
  ↓ membership
TENANT
  ├─ Legal Entity MY
  ├─ Legal Entity SG
  ├─ Legal Entity VN
  └─ Business Units
       └─ Branches / Sites / Warehouses / Departments
```

A SaaS tenant is not automatically a legal entity.
A Better Auth organization is not automatically the canonical ERP organization model.
A legal entity is not automatically the permission scope.

Preserve these distinctions from day one.

---

## 11.5 Isolation tiers

The canonical product starts pooled.

Future enterprise tiers may use:

```text
pooled
regional pooled
dedicated database
```

The application module contract remains the same; a connection/tenant resolver selects the correct persistence target.

Do not build dedicated isolation before a contract, data-residency requirement, or measured scale justifies it.

---

# 12. Authentication and authorization

## 12.1 Authentication

Use **Better Auth** behind `packages/auth`.

Use its organization/team/membership capabilities where useful for identity lifecycle, invitation and SSO workflows.

Do **not** make Better Auth's organization tables the entire ERP tenancy/organization domain.

The facade prevents auth-vendor data structures from spreading through business modules.

---

## 12.2 Three separate security layers

```text
Authentication
  Better Auth

Tenant isolation
  PostgreSQL RLS

Business authorization
  Xforge policy engine
```

Permission codes are explicit:

```text
hr.employee.read
hr.employee.update
hr.compensation.read
payroll.run.calculate
payroll.run.review
payroll.run.approve
sales.order.submit
inventory.transfer.post
```

Scopes may include:

```text
tenant
legal_entity
business_unit
department
location
team
own
```

This gives practical RBAC + scoped ABAC without installing a relationship-authorization platform before it is needed.

---

# 13. Tenant domains

Support:

```text
app.xforge.com
acme.xforge.com
erp.acme.com
```

Use a canonical table:

```text
tenant_domain
  id
  tenant_id
  hostname
  type
  verification_status
  is_primary
  created_at
  verified_at
```

Resolution:

```text
Host header
   ↓
domain resolver/cache
   ↓
candidate tenant
   ↓
authenticated membership validation
   ↓
request tenant context
```

The hostname is a routing signal, **not authorization proof**.

Launch choice: **Vercel for Platforms** for wildcard subdomains, customer domains, DNS verification and SSL management.

Keep domain resolution behind a provider interface so Cloudflare for SaaS can be adopted later if economics, scale or infrastructure portability justify it.

---

# 14. Money, payroll, accounting and inventory integrity

## 14.1 Never use floating-point `number` for monetary truth

Use explicit money/value types.

### Payroll and ordinary currency amounts

Where a currency has a known minor-unit exponent, application calculations may use integer minor units:

```text
MYR 12.34 → 1234 sen
```

Payroll engine outputs should use integer minor units for deterministic reconciliation.

### Accounting, FX, valuation and unit costs

Use fixed-precision decimal values because:

- FX rates need more precision than currency minor units;
- inventory unit costs may require >2 decimal places;
- tax calculation bases and allocation ratios may require controlled rounding.

Database storage uses PostgreSQL `numeric(p,s)` with explicit scale per semantic type.

The canonical rule is:

> **No IEEE-754 floating point in financial truth. Rounding rules are explicit and domain-owned.**

---

## 14.2 Payroll engine

Payroll calculation is a pure deterministic function over immutable inputs:

```ts
calculatePayroll(
  employeeSnapshot,
  periodInputs,
  rulePack,
  period
) => PayrollResult
```

Rules:

- no database I/O inside calculation;
- versioned/effective-dated rule packs;
- immutable input snapshot;
- immutable final result;
- corrections use reversal/replacement semantics;
- golden files against current official publications;
- property tests for reconciliation;
- every statutory table stores authority source and effective date.

Do not encode Malaysian statutory contributions as simplistic percentages when the authority publishes bands/tables.

---

## 14.3 Financial and inventory state transitions are commands, not arbitrary patches

Prefer:

```text
POST /sales-orders/{id}/submit
POST /stock-transfers/{id}/post
POST /journal-entries/{id}/post
POST /payroll-runs/{id}/approve
```

Reject:

```text
PATCH { status: "POSTED" }
```

The command expresses business meaning and provides a single place to enforce invariants.

---

## 14.4 Immutable ledgers

Once financially posted:

```text
original entry
    +
reversal
    +
replacement
```

Do not mutate historical ledger truth.

For accounting and stock valuation, the specification and property-based reconciliation tests are written **before** implementation.

Examples:

- debits = credits;
- posting is idempotent;
- reversal fully neutralises the original posting;
- stock movement quantity reconciles to valuation;
- inventory subledger reconciles to GL under the supported valuation method.

These domains are not candidates for generic metadata-generated business logic.

---

# 15. Workflow

The workflow engine is intentionally constrained.

Metadata may define:

```text
states
transitions
required permissions
conditions
approval roles
notification hooks
SLA metadata
```

Example:

```text
DRAFT → SUBMITTED → REVIEWED → APPROVED → POSTED
```

But:

> **Workflow metadata decides when an action is allowed. Application/domain code decides what the action actually does.**

Do not turn the workflow engine into a general-purpose programming language.

---

# 16. Events, outbox and background work

## 16.1 Transactional outbox

When a business transaction needs external or asynchronous consequences:

```text
BEGIN
  write business state
  write outbox_event
COMMIT
```

Then asynchronous processors handle:

- notifications;
- webhooks;
- e-invoice submission;
- search indexing;
- AI indexing;
- analytics projection;
- accounting integration;
- external systems.

This preserves transactional correctness without introducing Kafka.

---

## 16.2 Durable jobs

Use **Trigger.dev** as the initial durable-job/workflow platform for:

- payroll batch orchestration;
- large imports;
- PDF generation;
- bank files;
- e-invoice submission/retry;
- scheduled reports;
- document AI;
- outbound integration work;
- long-running agent workflows.

Why this wins the reconciliation:

- pg-boss/Graphile Worker minimise vendors but create an operational surface we do not yet need;
- Inngest is viable but not meaningfully simpler for this architecture;
- Trigger.dev keeps retries, idempotency and run visibility out of the product code while letting the team focus on UX/domain work.

The transactional outbox remains the durable integration boundary, so the job provider can be changed later without rewriting domain transactions.

---

# 17. Files, search and retrieval

## 17.1 Files

Use an S3-compatible abstraction in `packages/files`.

Default object store: **Cloudflare R2**.

Reasons:

- S3-compatible API;
- portability;
- favourable large-file/egress economics;
- keeps sensitive business documents out of application/database blobs.

Sensitive artefacts use private buckets and short-lived signed URLs.

---

## 17.2 Search

Start with PostgreSQL:

- FTS;
- trigram;
- `unaccent`/normalised search where appropriate;
- pgvector for semantic retrieval.

Introduce Meilisearch/OpenSearch/Elasticsearch only when measured query/UX requirements exceed PostgreSQL.

---

# 18. AI-native architecture

AI is a first-class platform client, **not a privileged backend**.

```text
AI UI / Agent
      ↓
AI policy + tool registry
      ↓
application command/query tools
      ↓
normal authorization
      ↓
tenant context / RLS
      ↓
repositories / database
```

## 18.1 Provider neutrality

Use Vercel AI SDK behind `packages/ai/providers`.

Allow workload/tenant configuration to choose provider/model without rewriting domain code.

The architecture may use Claude as the preferred development/agent model while remaining provider-neutral at runtime.

---

## 18.2 Tool generation is bounded

Metadata may generate safe repetitive tool descriptors for declared capabilities such as:

```text
read
list
search
draft-create
```

It must **not automatically expose every entity mutation** merely because the entity exists.

High-consequence actions remain explicit tools bound to application commands:

```text
approve_payroll_run
post_journal_entry
release_bank_file
submit_einvoice
post_stock_transfer
```

---

## 18.3 AI guardrails

1. AI never receives raw unrestricted database credentials.
2. AI operates under caller/agent identity and tenant context.
3. Retrieval filters tenant and permission scope **before** vector ranking results are returned.
4. Consequential writes create drafts/proposals unless a tenant explicitly enables bounded autonomy.
5. Financial/inventory/payroll actions use explicit domain tools, not generic CRUD.
6. Document extraction has confidence thresholds and a human-review queue.
7. Every AI action is audited with model/provider, tool, actor/agent identity, timestamps and outcome.
8. AI app-builder ships only after metadata and policy semantics are proven.

---

# 19. Southeast Asia as a first-class architecture dimension

Do not scatter country conditions throughout core modules.

Use:

```text
packages/localisation/
  my/
  sg/
  vn/
  id/
  th/
  ph/
```

A versioned country pack may contribute:

- statutory identifiers;
- tax/payroll rule packs;
- address conventions;
- currencies and rounding defaults;
- public holidays;
- bank formats;
- numbering conventions;
- employment rules;
- report templates;
- local translations;
- country-specific metadata overlays.

Each regulatory rule records:

```text
jurisdiction
effective_from
effective_to
version
authority_reference
source_revision
```

Historical transactions must remain reproducible after rules change.

---

## 19.1 Compliance adapters are separate from country rules

External statutory connectivity belongs in:

```text
packages/compliance/
  core/
  my-myinvois/
  sg-invoicenow/
  vn-einvoice/
  id-coretax/
  th-etax/
  ph-eis/
```

A compliance adapter owns:

- protocol/API mapping;
- credential handling;
- submission queue;
- retry/reconciliation;
- authority status model;
- archive/receipt artifacts.

It does **not** own the accounting ledger.

For example, e-invoice clearance failures should be represented as explicit asynchronous compliance state, not allowed to corrupt financial posting semantics.

---

## 19.2 Launch sequence

The platform vision is SEA-wide, but product launch remains narrow:

```text
Malaysia
  ↓
HRMS + Payroll
  ↓
MY statutory/compliance foundation
  ↓
second business module / second country only after the kernel proves itself
```

Do not launch three countries simultaneously.

---

# 20. Platform kernel

Establish a thin, reusable platform kernel before broad ERP expansion.

| Kernel capability | Responsibility |
|---|---|
| Identity | users, sessions, SSO |
| Tenancy | tenant, domain, membership context |
| Organization | legal entity, business unit, site/location |
| Policy | permissions and scopes |
| Metadata | semantic registry, field/view definitions |
| Workflow | controlled state transitions |
| Audit | immutable activity and decision trail |
| Files | private attachment storage abstraction |
| Events | transactional outbox |
| Jobs | durable async orchestration |
| Notifications | in-app/email/channel abstraction |
| Integration | webhooks, credentials, external connectors |
| Localization | versioned country rule packs |
| Compliance | authority-facing adapters |
| AI | providers, tools, retrieval, evaluation, policy |

### Dependency invariant

> **The platform kernel must not know that Sales, Payroll or Inventory exists.**

Business modules depend on platform capabilities.
Platform capabilities never import business modules.

---

# 21. Agent-driven development operating model

The stack alone will not make vibe coding reliable. The repository itself must be an executable specification.

## 21.1 Canonical spine

```text
UX requirement
   ↓
typed API contract
   ↓
generated client + mocks
   ↓
application command/query
   ↓
domain rule
   ↓
repository
   ↓
PostgreSQL
```

For every concern, Claude Code must find one obvious location.

---

## 21.2 Generated code is derived state

Examples:

```text
route contracts
   ↓
OpenAPI
   ↓
api-client/
MSW mocks
API docs
contract fixtures
```

Rules:

- generated code lives in clearly named generated paths;
- generated code is never hand-edited;
- CI regenerates and asserts a clean diff.

Example gate:

```bash
pnpm generate

git diff --exit-code
```

---

## 21.3 CLAUDE.md stays small

`CLAUDE.md` contains architecture laws, not a duplicate architecture book.

Detailed rationale belongs in `docs/architecture` and ADRs.

Suggested laws:

```text
1. Browser business UI uses generated API clients.
2. API route contracts are declared before handlers.
3. Modules never import another module's repository.
4. DB access occurs only through sanctioned repositories/tenant context.
5. Every tenant-owned table has tenant_id + RLS.
6. Generated artifacts are never hand-edited.
7. Financial and payroll final records are immutable.
8. Country logic lives in localisation/compliance packages.
9. AI uses application tools, never privileged DB access.
10. No business mutation through Next.js Server Actions.
11. No JS floating point for monetary truth.
12. pnpm verify is authoritative.
```

---

## 21.4 ADRs

Create one short ADR per non-obvious architecture decision.

Examples:

```text
ADR-001 modular monolith
ADR-002 API-first Hono/OpenAPI
ADR-003 shared-schema RLS tenancy
ADR-004 metadata four-plane model
ADR-005 custom-field JSONB strategy
ADR-006 money representation
ADR-007 Trigger.dev + transactional outbox
ADR-008 country-pack/compliance split
```

This prevents future agent sessions from repeatedly reopening settled architecture.

---

## 21.5 Feature slicing

Good Claude Code task:

```text
Implement employee emergency contact:
contract → mock → UI → handler → repository → tests
```

Bad task:

```text
Build HRMS.
```

Every feature slice should have an observable end-user outcome and an executable done-condition.

---

# 22. Architecture enforcement

Architecture laws must be machine-checked where practical.

Add guards for:

```text
UI importing db/repository
module importing foreign repository
cross-module circular dependency
tenant table missing tenant_id
RLS policy missing
application role accidentally BYPASSRLS/table owner
country condition inside core module
generated code modified
route missing operationId
permission used but not registered
direct mutation of immutable ledger table
financial code using JS floating point
business mutation implemented as Server Action
AI tool bypassing application command/policy
```

The goal is not maximum linting.

The goal is to make architectural mistakes fail **immediately and deterministically**.

---

# 23. Verification strategy

## 23.1 Canonical gate

`pnpm verify` should be the single developer/CI authority and compose:

```text
generate check
architecture checks
typecheck
format/lint
unit tests
contract tests
RLS tests
integration tests
build
selected Playwright E2E
```

Heavy suites can be staged/cached, but there must be one canonical semantic definition of green.

---

## 23.2 Tenant isolation — blocking foundation test

Using Testcontainers or an isolated Neon test branch:

1. seed at least two tenants;
2. run as the real non-owner app role;
3. set tenant context transactionally;
4. enumerate every tenant-scoped table;
5. prove tenant A cannot read/write tenant B rows;
6. prove host/session tenant mismatch is rejected;
7. fail if a new tenant table lacks RLS.

Do not proceed beyond tenancy foundation based on manual inspection alone.

---

## 23.3 Payroll — blocking correctness tests

For each statutory rule-pack version:

- golden fixtures from official published tables;
- wage-band boundary cases;
- joiner/leaver proration;
- unpaid leave;
- variable elements;
- age/category boundaries;
- gross/deduction/net reconciliation in integer minor units;
- immutability/reversal tests;
- deterministic replay against historical snapshots.

---

## 23.4 Accounting/inventory — property-based tests

Before implementation of posting logic:

- debit = credit;
- reversal neutralises posting;
- posting idempotency;
- subledger → GL reconciliation;
- stock quantity/value reconciliation;
- FX/revaluation rules;
- allocation rounding conservation.

Use property-based tests such as `fast-check` in addition to examples.

---

## 23.5 API contract tests

CI must:

- validate OpenAPI 3.1;
- regenerate SDK/mocks;
- show contract diff;
- block accidental breaking changes unless explicitly versioned/approved;
- verify every registered route has operation metadata.

---

## 23.6 E2E

Initial flagship E2E:

```text
signup
→ tenant provisioned
→ employee created
→ payroll inputs prepared
→ payroll calculated
→ payroll reviewed/approved
→ payslip generated
→ payslip downloaded
```

Run against an isolated DB branch.

---

# 24. Infrastructure and deployment

## 24.1 Launch architecture

```text
Vercel
  ├─ Next.js web
  ├─ Hono API mounted in web runtime
  ├─ preview deployments
  └─ tenant/custom domains

Neon
  ├─ PostgreSQL
  ├─ RLS
  ├─ preview/test branches
  └─ pgvector

Trigger.dev
  └─ durable jobs/workflows

Cloudflare R2
  └─ private object storage

Resend
  └─ transactional email

Sentry + OpenTelemetry
  └─ application diagnostics
```

This intentionally keeps infrastructure rented and boring while product architecture remains portable.

---

## 24.2 Portability rule

Even though v1 is SaaS-only:

- PostgreSQL schema stays provider-portable;
- files use S3-compatible abstraction;
- auth is behind an internal facade;
- jobs are triggered through an internal interface/outbox;
- domain logic does not import Vercel/Neon/Trigger APIs;
- local development can run the core stack with Docker Compose.

Portability is an architecture property, not a promise to support on-prem in v1.

---

## 24.3 Scale-out triggers

Do not extract infrastructure “because enterprise.”

Examples of real triggers:

| Measured pain | Possible response |
|---|---|
| API workload independently saturates web | create `apps/api` using same Hono composition |
| job throughput/visibility demands custom workers | add dedicated worker/runtime |
| tenant requires residency/isolation | dedicated regional database tier |
| PostgreSQL search latency fails UX SLO | introduce search service |
| hot configuration lookup becomes DB bottleneck | introduce cache/KV |
| outbox event volume requires streaming backbone | evaluate Kafka/managed event bus |

The current system should be designed so these are **extractions**, not rewrites.

---

# 25. Build sequence

The final roadmap combines the strongest sequencing ideas in all three documents while respecting the locked Malaysia HRMS/Payroll launch.

## Phase 0 — Canonical spine

Build:

- monorepo;
- architecture laws/ADRs;
- Next.js + shadcn/Base UI;
- Hono route-contract pipeline;
- OpenAPI + Orval + MSW generation;
- Drizzle + Neon;
- CI/`pnpm verify`.

Exit:

> One trivial feature travels UX → contract → generated client/mock → handler → database → Playwright with a green gate.

---

## Phase 1 — Tenancy and identity kernel

Build:

- tenant domain;
- Better Auth facade;
- membership;
- legal-entity/organization skeleton;
- host resolution;
- PostgreSQL RLS;
- `withTenant()`;
- tenant-domain onboarding.

Exit:

> Automated tests prove tenant A cannot read or mutate tenant B data across every tenant table.

---

## Phase 2 — Design system + bounded metadata kernel

Build:

- design tokens;
- shadcn component governance;
- data-grid primitives;
- form/list metadata renderer;
- semantic/entity registry;
- custom-field registry + JSONB storage;
- deterministic overlays;
- explicit React escape hatch.

Exit:

> A representative HR master-data entity can be delivered mostly from reusable contract/metadata primitives without generating persistence/API/UI/policy as one inseparable object.

---

## Phase 3 — HR core

Build:

- employee/person/employment model;
- organization assignment;
- leave;
- claims;
- documents;
- approvals;
- audit.

Exit:

> Employee onboarding plus leave-request → approval → balance lifecycle works end-to-end on mobile and desktop.

---

## Phase 4 — Malaysia payroll

Build:

- immutable payroll input snapshot;
- versioned MY statutory rule packs;
- pure calculation engine;
- review/approval lifecycle;
- payslips;
- bank files;
- year-end/statutory artefacts in defined scope.

Exit:

> Golden/statutory fixtures and reconciliation/property tests are green; a full payroll cycle completes through the UI.

---

## Phase 5 — AI copilot

Build:

- provider abstraction;
- tenant-scoped RAG;
- employee assistant;
- payroll/HR copilot;
- document intake;
- audited draft actions.

Exit:

> AI can perform a useful end-to-end HR/payroll task while provably respecting the caller's tenant and business permissions.

---

## Phase 6 — Integrations and tenant experience

Build:

- custom domains;
- notifications/channels;
- WhatsApp where justified;
- webhook framework;
- integration credentials;
- compliance adapters required by product scope.

---

## Phase 7 — Second domain proves generality

Before claiming Xforge is a generic ERP framework, build a materially different second domain.

Recommended candidates:

- Sales + purchasing + inventory; or
- Finance/accounting spine.

Use this phase to delete HR-specific assumptions from the metadata/platform kernel.

> **Generalise on the second real use case, not from imagination.**

---

## Phase 8 — Second country / enterprise isolation

Only after Malaysia and the core platform are stable:

- select one next jurisdiction;
- add its country pack/compliance adapter;
- add regional/dedicated DB routing if a real deal requires it;
- extend AI language/channel experience.

---

# 26. Explicitly rejected defaults

| Temptation | Decision |
|---|---|
| Microservices from day one | Reject |
| Kubernetes from day one | Reject |
| GraphQL as principal ERP API | Reject |
| tRPC as public contract | Reject |
| Server Actions as business API | Reject |
| RSC importing repositories | Reject |
| One mega metadata object generating all planes | Reject |
| EAV for normal business entities | Reject |
| Per-tenant database as default | Reject |
| Arbitrary tenant JavaScript in backend | Reject |
| XML/XPath/deep view inheritance | Reject |
| Generic `BaseService<T>` framework | Reject |
| Generic repository abstraction hiding SQL | Reject |
| Event sourcing for everything | Reject |
| Kafka before measured need | Reject |
| Redis before measured need | Reject |
| Elasticsearch before measured need | Reject |
| AI direct SQL/database writes | Reject |
| Mutable posted financial records | Reject |
| Country `if/else` branches spread through core | Reject |
| Automatic metadata exposure of high-risk AI tools | Reject |
| JS floating point for monetary truth | Reject |

---

# 27. Primary risks and mitigation

| Risk | Severity | Mitigation |
|---|---:|---|
| Metadata becomes another Odoo/Frappe framework | High | Four planes; one-source-per-fact; 80/20 rule; escape hatches; generalise on second domain |
| Tenant data leakage | Critical | RLS + non-owner role + `SET LOCAL` + withTenant chokepoint + enumerated CI proof |
| Agent-generated payroll bug | Critical | Pure engine; immutable snapshots; golden official tables; property tests |
| Agent-generated ledger bug | Critical | Human-written spec and invariants before implementation; reconciliation property tests |
| Architecture drift over long vibe-coding sessions | High | small slices; ADRs; architecture tests; generated code; canonical `pnpm verify` |
| Country/compliance changes | High | effective-dated rules; adapter versioning; authority source tracking |
| JSONB custom-field performance | Medium | measure; GIN where useful; deliberate promotion/indexing |
| Vendor lock-in | Medium | internal facades; PostgreSQL/S3 portability; outbox; domain isolation from providers |
| Frontend inconsistency | High | tokens first; shadcn governance; Storybook; visual/E2E checks |
| AI exceeds authority | Critical | tool-only access; policy layer; RLS; agent identity; proposal/draft default; audit |
| Scope explosion | High | Malaysia HR/payroll wedge; phase exit gates; second-domain rule before generalisation |

---

# 28. Canonical architecture laws

These are the proposed non-negotiable project laws.

1. **The system is a modular monolith until measured evidence justifies extraction.**
2. **Frontend-led describes build order; API-first describes architectural authority.**
3. **Every business feature has a typed API contract before its handler.**
4. **The browser business UI uses generated API clients; no hidden business API exists in Server Actions.**
5. **Every fact has one authoritative source; do not create a mega source of truth that owns unrelated concerns.**
6. **Data, Contract, Experience and Policy are separate architecture planes joined by stable semantic identifiers.**
7. **Core business truth is explicit code + relational PostgreSQL data.**
8. **Metadata composes repetitive experience and tenant variation; it does not replace domain modelling.**
9. **Every tenant-owned table has `tenant_id` and database-enforced RLS.**
10. **Tenant, legal entity, organization hierarchy and auth organization are distinct concepts.**
11. **Modules never import another module's repository or private persistence.**
12. **Financial, inventory and payroll posting uses explicit commands and immutable final records.**
13. **No floating-point JavaScript number represents monetary truth.**
14. **Country rules are versioned/effective-dated and live outside core domain branching.**
15. **Compliance connectivity is asynchronous and separate from ledger truth.**
16. **AI uses the same application commands, policies and tenant isolation as human clients.**
17. **AI does not gain a mutation merely because metadata declares an entity.**
18. **Generated code is derived state and is never hand-edited.**
19. **Architecture invariants are enforced by code/tests, not prose alone.**
20. **`pnpm verify` is the canonical definition of repository green.**
21. **New infrastructure requires a named, measured problem.**
22. **Generalise only after a second real business use case proves the abstraction.**

---

# 29. Final canonical stack

```text
LANGUAGE / REPO
TypeScript strict
Node.js 24 LTS
pnpm 11
Turborepo
Biome
Docker Compose compatibility

FRONTEND
React 19
Next.js 16 App Router
Tailwind CSS v4
shadcn/ui + Base UI
OKLCH semantic design tokens
TanStack Query
TanStack Table + virtualization
React Hook Form
Zod
next-intl
Recharts
Storybook
MSW

API
Hono
@hono/zod-openapi / Hono OpenAPI tooling
OpenAPI 3.1
Orval generated client + TanStack Query hooks + mocks
Scalar API documentation

DOMAIN
Plain TypeScript application/domain modules
Explicit commands + queries
Typed module manifests
Bounded metadata/semantic registry

DATA
PostgreSQL
Neon at launch
Drizzle ORM + explicit SQL
PostgreSQL RLS
JSONB custom fields
FTS + trigram
pgvector
Transactional outbox

IDENTITY / POLICY
Better Auth behind internal facade
Xforge tenant + organization domain
Explicit permission/policy engine

ASYNC
Trigger.dev
Transactional outbox

FILES / COMMUNICATION
Cloudflare R2 through S3-compatible facade
Resend
Notification/channel abstraction

AI
Vercel AI SDK
provider abstraction
application tool registry
pgvector retrieval
AI audit + evaluation layer

OBSERVABILITY / QUALITY
OpenTelemetry
Sentry
Vitest
fast-check
Testcontainers
Playwright
architecture tests
contract diff tests
```

---

# 30. Final conclusion

The best architecture from the three drafts is **not** the most metadata-heavy version and **not** the most convention-heavy version.

It is the architecture that preserves their strongest shared insight while correcting their conflicts:

```text
Frontend-led discovery
       ↓
Typed API contract
       ↓
Generated client + mocks
       ↓
Explicit application/domain logic
       ↓
Relational PostgreSQL truth

Metadata     → controlled composition
Policy       → explicit authorization/workflow
Localisation → versioned country overlays
Events       → transactional outbox
Jobs         → managed durable execution
AI           → authorised application tools
```

The differentiator is therefore not a clever framework.

It is a **canonical spine plus strict boundaries** that allows Claude Code to move extremely quickly without turning speed into architectural entropy.

> **Xforge should feel configurable like ERPNext, modular like Odoo, contract-driven like a modern SaaS platform, and maintainable like a deliberately boring TypeScript codebase.**

That is the architecture recommended for consideration as the canonical Xforge foundation.
