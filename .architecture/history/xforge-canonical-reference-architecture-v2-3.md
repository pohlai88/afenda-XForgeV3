# Xforge — Canonical Reference Architecture v2

**Status:** Candidate canonical baseline for adoption  
**Date:** 31 August 2026  
**Supersedes:** `xforge-canonical-reference-architecture-v1-1.md`, `v1-2.md`, and `v1-3.md`  
**Intended repository target:** `C:\JackProject\afeda-Xforge\.architecture\architecture-final.md`  
**Optimised for:** Claude Code–first development · DRY · KISS · API-first authority · frontend-led delivery · strict multi-tenancy · bounded metadata extensibility · AI-native operation · Southeast Asia localisation  
**Launch wedge:** Malaysia HRMS + Payroll  
**Long-term scope:** Multi-purpose business / ERP platform across Southeast Asia

---

## 0. Executive decision

Xforge should be built as a **strict modular monolith with an explicit domain core, a contract-first public API, a frontend-led delivery loop, PostgreSQL-enforced tenancy, bounded metadata composition, versioned country packs, and AI operating only through authorised application capabilities**.

The canonical thesis is:

> **Explicit core. Metadata at the edges. Contract in the middle.**

And the governing implementation rule is:

> **One authoritative source per fact; one obvious path per operation; one deterministic gate for correctness.**

Xforge should borrow the strongest ideas from ERPNext/Frappe and Odoo:

- metadata as a first-class productivity mechanism;
- modular business capabilities;
- configurable workflows and views;
- deep accounting, stock, HR and payroll semantics;
- extensibility without customer forks.

It should deliberately reject the patterns that make those platforms difficult to evolve safely at scale:

- a single metadata object owning persistence, API, UX, permissions and workflow simultaneously;
- routine per-tenant DDL for customisation;
- deep inheritance or XPath-like view mutation;
- database-per-tenant as the only tenancy model;
- framework magic hiding business rules;
- privileged server-rendered paths around the public API;
- weakly typed integration boundaries;
- microservices and infrastructure complexity before measured need.

This document is **normative** for architecture. Package versions, provider SKUs, operational thresholds and implementation details that can change without violating the architecture belong in workspace manifests, configuration and ADRs rather than being treated as eternal doctrine here.

---

# 1. Locked product and architecture decisions

| Decision | Canonical choice |
|---|---|
| Product model | Cloud SaaS first; portable architecture, not an on-prem product in v1 |
| Primary development model | Claude Code / agent-driven vertical feature slices |
| Language | TypeScript strict, end-to-end |
| Launch vertical | HRMS + Payroll |
| Launch jurisdiction | Malaysia |
| Long-term region | Malaysia, Singapore, Vietnam, Indonesia, Thailand, Philippines |
| System shape | Strict modular monolith |
| Public API | REST + OpenAPI 3.1 |
| Delivery sequence | Frontend-led, contract-before-handler |
| Database | PostgreSQL |
| Managed database at launch | Neon |
| Tenant isolation | Shared schema + `tenant_id` + PostgreSQL RLS |
| Enterprise escape hatch | Dedicated database / region later behind the same application contracts |
| Tenant URL | Xforge subdomain by default; verified custom domain on eligible tiers |
| Metadata | First-class but bounded; never the owner of all architecture planes |
| Custom fields | Registry + JSONB source of truth; indexed projection on measured need |
| Core transactional data | Real relational tables, constraints and indexes |
| Authentication | Better Auth behind an Xforge facade; identity/session only |
| Business authorisation | Xforge policy layer |
| Async | Transactional outbox + swappable durable executor |
| AI | Provider-neutral application client; no privileged database path |
| AI mutation default | Draft/proposal for consequential actions |
| Localisation | Versioned country packs + separate compliance/integration adapters |
| Infrastructure | Managed and deliberately boring; additions require measured need |
| Definition of green | `pnpm verify` |

## 1.1 Architecture wide, delivery narrow

Architect for the eventual platform surface, but **ship one vertical in one country**.

The platform kernel may be module-agnostic and country-pack-shaped from the start. That does not justify building Sales, Accounting, Manufacturing, multi-country payroll or a marketplace before the Malaysia HR/payroll wedge is proven.

> **Generalise from a second real domain, not from imagination.**

---

# 2. Architecture doctrine

## 2.1 Vibe-first

Claude Code reliability is a first-class engineering constraint.

Prefer:

- common, well-documented technologies;
- high static type density;
- explicit data flow;
- shallow dependency graphs;
- plain functions over reflection-heavy frameworks;
- generated repetition over hand-maintained repetition;
- small modules with narrow public surfaces;
- architecture invariants enforced by code;
- feature slices with executable done-conditions.

Avoid abstractions whose main advantage is fewer lines of code while increasing inference cost.

> **Verbose-but-obvious beats terse-but-magical.**

---

## 2.2 DRY means one source of truth per fact

Do not interpret DRY as “one mega entity definition generates the whole system.”

Each concern has an authority:

| Fact | Authority |
|---|---|
| Persistent column/index/constraint | PostgreSQL/Drizzle schema |
| API operation and request/response semantics | Typed route contract |
| Published external API | Generated OpenAPI 3.1 document |
| Business invariant | Domain/application code |
| Generic field semantic | Semantic registry |
| Form/list composition | Experience metadata or explicit React |
| Permission/action vocabulary | Policy registry |
| Role and scoped grant | Policy data |
| Tenant custom field definition | Metadata registry |
| Statutory rate/table | Effective-dated country rule pack |
| Generated client/hooks/mocks | OpenAPI-derived generated state |
| Business audit event | Append-only audit store |

Derived artifacts may be generated. Independent concerns remain independently authoritative.

---

## 2.3 KISS is an infrastructure budget

Initial architecture deliberately avoids:

- Kubernetes;
- service mesh;
- Kafka;
- Redis;
- Elasticsearch;
- MongoDB;
- separate vector database;
- microservices;
- distributed workflow infrastructure built in-house.

A dependency is added only when it eliminates a **named, measured problem** and the ADR records the evidence.

---

## 2.4 Stability over novelty

Architecture chooses capabilities, not fashion.

Technology versions are pinned by `package.json`, `pnpm-lock.yaml`, runtime configuration and CI. Routine upgrades are expected. An upgrade needs an ADR only when it changes an architectural contract, deployment shape, data model, security model or ownership boundary.

---

# 3. Canonical architecture laws

These laws should be short enough to mirror into `CLAUDE.md`. Every practical law should have a mechanical guard.

1. **The system remains a modular monolith until measured evidence justifies extraction.**
2. **Frontend-led describes build order; API-first describes architectural authority.**
3. **Every business operation has a typed route contract before its handler.**
4. **Browser business UI uses only generated contract clients; no hidden Server Action business API exists.**
5. **React UI never imports repositories, Drizzle, database handles or another module's private internals.**
6. **Every fact has one authoritative source; no mega metadata definition owns unrelated concerns.**
7. **Data, Contract, Experience and Policy are separate planes joined by stable semantic identifiers.**
8. **Core business truth is explicit TypeScript domain logic plus relational PostgreSQL data.**
9. **Metadata composes repetitive experience and tenant variation; it does not replace high-integrity domain modelling.**
10. **Every tenant-owned table has `tenant_id` and database-enforced RLS.**
11. **Database access is possible only through sanctioned repository and tenant-context APIs.**
12. **Tenant, legal entity, organisational structure and authentication concepts remain distinct.**
13. **Modules never import another module's repository or private persistence.**
14. **Consequential state transitions use explicit commands, not arbitrary status patches.**
15. **Final payroll, accounting and inventory posting history is immutable; correct by reversal/replacement.**
16. **No JavaScript floating-point `number` represents monetary truth.**
17. **Country rules are effective-dated and do not spread as `if (country)` branches through core.**
18. **Compliance connectivity is separable from transactional ledger truth.**
19. **AI uses the same commands, policies and tenant isolation as human clients.**
20. **AI never receives a database connection and never gains a tool merely because an entity exists.**
21. **Generated state is never hand-edited.**
22. **Architecture invariants are enforced by tests/guards, not prose alone.**
23. **New infrastructure requires a named, measured pain.**
24. **`pnpm verify` is the canonical definition of repository green.**
25. **Generalise a platform abstraction only after a second real use case proves it.**

---

# 4. System shape — strict modular monolith

```text
                         ┌─────────────────────────────┐
                         │          XFORGE WEB          │
                         │ Next.js · React · shadcn UI  │
                         └──────────────┬───────────────┘
                                        │
                                  generated client
                                        │
                         ┌──────────────▼───────────────┐
                         │          PUBLIC API           │
                         │ Hono · typed route contracts  │
                         │ OpenAPI 3.1 projection        │
                         └──────────────┬───────────────┘
                                        │
                 ┌──────────────────────▼──────────────────────┐
                 │          APPLICATION / DOMAIN               │
                 │ HR · Payroll · future business modules      │
                 │ commands · queries · policies · domain      │
                 └──────────────┬─────────────────┬────────────┘
                                │                 │
                          repositories         outbox
                                │                 │
                      ┌─────────▼─────────┐       ▼
                      │    PostgreSQL      │   durable jobs
                      │ RLS · JSONB · FTS │   integrations
                      │ pgvector · audit  │
                      └───────────────────┘

   CROSS-CUTTING PLATFORM
   identity · tenancy · organisation · policy · metadata · workflow
   audit · files · events · jobs · notifications · integration
   localisation · AI
```

## 4.1 Module interaction

A business module may communicate through:

1. another module's **public application interface**;
2. published application/domain events;
3. stable platform capabilities.

It may not import:

- another module's repository;
- another module's Drizzle tables;
- another module's private domain implementation;
- another module's private UI components.

The platform kernel must not know that Sales, Payroll or any future business module exists.

---

# 5. Canonical technology baseline

Architecture names the baseline; exact package versions remain pinned in the workspace.

## 5.1 Foundation

| Concern | Baseline |
|---|---|
| Language | TypeScript strict |
| Runtime | Node.js 24 LTS baseline |
| Package manager | pnpm 11 |
| Monorepo | Turborepo |
| Format/lint | Biome + narrow architecture lint rules where needed |
| Local environment | Docker Compose-compatible core stack |

## 5.2 Frontend

| Concern | Baseline |
|---|---|
| Framework | Next.js App Router |
| Runtime | React 19 |
| UI components | shadcn/ui on Base UI for greenfield |
| Styling | Tailwind CSS v4 |
| Design tokens | CSS variables + OKLCH semantic tokens |
| Server state | TanStack Query |
| Grid | TanStack Table + virtualisation |
| Forms | React Hook Form + Zod |
| API mocking | MSW |
| API generation | Orval |
| i18n | next-intl / ICU messages |
| Charts | Recharts initially |
| UI workshop | Storybook |
| E2E | Playwright |

## 5.3 API

| Concern | Baseline |
|---|---|
| HTTP adapter | Hono |
| Boundary schemas | Zod |
| Typed route/OpenAPI | Hono OpenAPI tooling / `@hono/zod-openapi` |
| Published contract | OpenAPI 3.1 |
| Generated browser client | Orval fetch client |
| Query hooks | Orval + TanStack Query |
| Mocks | Orval + MSW |
| Docs | Scalar or equivalent |

### Boundary hardening

Do not assume schema declaration alone guarantees all HTTP semantics.

For request bodies, the API layer must explicitly test and enforce:

- accepted `Content-Type`;
- malformed body handling;
- missing required body handling;
- maximum body sizes;
- unknown-field policy where relevant;
- consistent validation errors.

These behaviours belong in contract/integration tests.

## 5.4 Data and platform

| Concern | Baseline |
|---|---|
| Database | PostgreSQL on Neon at launch |
| ORM/query | Drizzle + explicit SQL |
| Tenant isolation | PostgreSQL RLS |
| Search | PostgreSQL FTS + trigram + normalisation |
| Vectors | pgvector |
| Authentication | Better Auth behind `packages/auth` |
| Business policy | Xforge `packages/policy` |
| Events | Transactional outbox |
| Jobs | `packages/jobs` abstraction; Trigger.dev initial executor |
| Files | S3-compatible object storage; R2 initial candidate |
| Domains | `tenant_domain` model + Vercel for Platforms initial provider |
| Email | Resend + React Email |
| Observability | OpenTelemetry + Sentry + structured logs |
| Testing | Vitest + fast-check + Testcontainers + Playwright |

---

# 6. API-first authority, frontend-led sequence

These are complementary.

**API-first:** every business capability is expressed through a stable contract.  
**Frontend-led:** UX is designed and completed against generated mocks before backend implementation.

Canonical feature flow:

```text
UX intent
   ↓
screen states + interaction design
   ↓
typed route operation
   ↓
OpenAPI 3.1 generated
   ↓
Orval generates client + Query hooks + MSW
   ↓
frontend completed against mocks
   ↓
handler / command / query implemented
   ↓
repository / database
   ↓
contract + integration + E2E verification
```

## 6.1 Contract authority

The **authored typed route contract** is the code authority.

The generated OpenAPI document is the **published language-neutral contract** and compatibility surface.

CI must:

- validate OpenAPI 3.1;
- regenerate clients and mocks;
- produce a contract diff;
- block accidental breaking changes;
- require stable `operationId` values;
- require explicit version/deprecation treatment for breaking public API changes.

## 6.2 One business transport at launch

Browser business operations use the generated HTTP client.

React Server Components are primarily for:

- application shell;
- authentication/session bootstrap;
- route metadata;
- non-business/static composition.

Do not create a second in-process business query facade in v1.

If a measured production bottleneck later proves that same-host HTTP is material, an in-process contract-bound read transport may be introduced only via ADR, benchmark and mechanical parity tests.

This keeps the initial rule simple:

> **One business operation → one contract → one transport → one policy path.**

## 6.3 API conventions

Establish once:

- `/v1/...` public version prefix;
- stable `operationId`;
- consistent pagination;
- consistent filtering/sorting vocabulary;
- standard error envelope, preferably RFC 9457 Problem Details-compatible;
- `request_id` / correlation ID;
- explicit idempotency semantics for retryable commands;
- consistent date/time and decimal serialisation;
- no silent coercion of invalid business input.

Consequential externally retryable commands should accept an idempotency key.

---

# 7. Four architecture planes + semantic registry

The four planes have separate authorities and lifecycles.

## 7.1 Data plane

Authority for:

- tables;
- foreign keys;
- constraints;
- indexes;
- RLS;
- migration history;
- immutable ledger structures.

Technology: PostgreSQL + Drizzle + explicit SQL.

## 7.2 Contract plane

Authority for:

- operations;
- request/response schemas;
- errors;
- pagination;
- idempotency;
- API compatibility;
- versioning/deprecation.

Technology: typed Hono contracts → OpenAPI 3.1.

## 7.3 Experience plane

Authority for:

- form/list composition;
- field display;
- labels;
- ordering;
- visibility;
- saved views;
- dashboards;
- command placement;
- tenant theme;
- user preferences.

Technology: typed metadata + explicit React escape hatches.

## 7.4 Policy plane

Authority for:

- actions;
- roles;
- scoped grants;
- workflow transition permission;
- row/field business access;
- approval requirements;
- AI action eligibility.

Technology: Xforge policy registry + application checks; PostgreSQL RLS remains the tenant boundary.

## 7.5 Semantic registry

The semantic registry contains facts genuinely shared across planes:

```text
entity_id
field_id
semantic_type
reference_target
label_key
searchability
sensitivity_class
AI description
customisation capability
```

It may generate repetitive adapters and metadata.

It must not silently mutate all four planes.

Examples:

- changing `label_key` never renames a database column;
- hiding a field never weakens API validation;
- declaring a field AI-readable never grants permission;
- adding a custom field never changes core table DDL automatically.

---

# 8. Metadata and customisation

## 8.1 Overlay chain

```text
System definition
      ↓
Country pack
      ↓
Tenant configuration
      ↓
User personalisation
```

Resolution must be:

- deterministic;
- typed;
- version-aware;
- conflict-detecting;
- inspectable as an **effective configuration**.

No arbitrary inheritance chain.

## 8.2 Stable slots

Forms expose stable semantic slots, for example:

```text
employee
  header
  identity
  contact
  employment
  compensation
  statutory
  documents
  activity
```

Country and tenant overlays may insert, hide, rename or reorder supported elements through stable IDs.

Forbidden:

- DOM selector patches;
- XPath;
- arbitrary runtime monkey-patching;
- tenant-provided executable server JavaScript.

## 8.3 Hybrid persistence

### Core product fields

Use real typed relational columns.

### Tenant custom fields

Canonical source of truth:

```text
custom_field_definition
+
entity.custom JSONB
```

Normal customisation requires **zero DDL**.

### Search/sort projection for hot custom fields

Do not routinely “promote” arbitrary tenant fields into global table columns.

When a custom field must support indexed filtering/sorting at scale, project selected values into a controlled secondary structure such as:

```text
custom_field_index
  tenant_id
  entity_type
  record_id
  field_id
  value_kind
  value_text
  value_numeric
  value_date
```

The JSONB value remains canonical. The index projection is derived state.

This preserves:

- one core schema;
- no normal per-tenant DDL;
- predictable index cardinality;
- explicit support for searchable custom fields.

A custom field becomes a real first-class column only when it becomes a **product-level field**, justified by an ADR/migration.

### Custom entities

A generic JSONB-backed custom-record facility may be added later for low-risk customer-created objects.

It is not allowed for:

- payroll results;
- statutory records;
- journal/ledger entries;
- stock movements;
- payments/settlements;
- other high-integrity transactional cores.

## 8.4 The 80/20 rule

Metadata-render:

- master data CRUD;
- list/detail pages;
- filters and saved views;
- simple approval flows;
- simple reports;
- configuration.

Hand-build:

- payroll processing;
- bank reconciliation;
- month-end close;
- inventory planning;
- manufacturing planning;
- POS;
- complex quotations/orders;
- executive workspaces;
- AI workbench.

> If only one screen needs a metadata feature, build the screen instead of expanding the framework.

---

# 9. Module architecture

Recommended business module shape:

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

`manifest.ts` declares architectural metadata only:

```text
id
version
dependencies
optional_integrations
permissions
navigation
entities
events_emitted
events_consumed
workflows
country_extensions
feature_flags
```

## 9.1 Dependency direction

```text
apps
  ↓
modules
  ↓
platform packages
  ↓
shared primitives
```

No reverse dependencies and no business-module cycles.

A module may depend on another module's **public application contract**, never its persistence internals.

---

# 10. Repository shape

```text
xforge/
├─ .architecture/
│  ├─ architecture-final.md
│  ├─ decisions.md
│  └─ adr/
│
├─ apps/
│  ├─ web/
│  ├─ admin/
│  ├─ api/              # optional mount when extracted; may be thin initially
│  └─ docs/
│
├─ modules/
│  ├─ hr/
│  ├─ payroll/
│  └─ future-domain-modules/
│
├─ packages/
│  ├─ api/
│  ├─ api-client/       # GENERATED
│  ├─ auth/
│  ├─ db/
│  ├─ tenancy/
│  ├─ organisation/
│  ├─ policy/
│  ├─ metadata/
│  ├─ workflow/
│  ├─ audit/
│  ├─ events/
│  ├─ jobs/
│  ├─ files/
│  ├─ localisation/
│  ├─ ai/
│  ├─ ui/
│  ├─ tokens/
│  └─ testing/
│
├─ contracts/
│  └─ openapi.generated.json
│
├─ tooling/
│  ├─ generators/
│  ├─ architecture/
│  └─ verify/
│
├─ docs/
└─ CLAUDE.md
```

Meanings:

- `apps` = executable compositions;
- `modules` = business capabilities;
- `packages` = platform capabilities/shared primitives;
- `contracts` = generated published contract artifacts;
- `.architecture` = normative architecture and ADRs;
- `tooling` = deterministic generators and guards.

---

# 11. PostgreSQL and data architecture

## 11.1 PostgreSQL is transactional truth

Use PostgreSQL for:

- relational business data;
- metadata;
- audit;
- outbox;
- search initially;
- vectors initially;
- feature/config data where appropriate.

Do not introduce a second datastore until profiling proves a problem PostgreSQL should not solve.

## 11.2 Migration discipline

Production migrations use **expand → migrate/backfill → switch → contract**.

Rules:

- no destructive schema change in the same deployment that first stops using the old shape;
- migrations are forward-reviewed SQL;
- long-running backfills are resumable jobs;
- every migration is tested against an isolated branch;
- application releases remain compatible with the immediately preceding schema during rollout where practical;
- tenant customisation does not generate ordinary DDL.

## 11.3 Concurrency

Mutable business documents that can be edited concurrently use optimistic concurrency.

Use a version/revision token or equivalent (`version`, ETag, or guarded `updated_at`) for update commands.

The API must reject stale writes explicitly rather than silently overwriting another user's changes.

## 11.4 IDs and business numbers

Technical primary keys are opaque IDs.

Business document numbers are separate tenant/legal-entity scoped attributes.

Do not make human business numbers the database primary key.

---

# 12. Multi-tenancy

## 12.1 Distinct concepts

```text
USER / PRINCIPAL
    │
    └── tenant_membership
             │
             ▼
           TENANT
             │
             ├── LEGAL ENTITY
             │      ├── statutory registrations
             │      └── payroll / accounting scope
             │
             ├── BUSINESS UNIT
             ├── LOCATION / BRANCH
             ├── DEPARTMENT
             └── other organisational dimensions
```

A tenant is a SaaS/customer boundary.

A legal entity is a statutory/business entity.

A business unit is an organisational dimension.

Authentication provider “organization” concepts are not canonical ERP topology.

## 12.2 RLS is structural

Every tenant-owned table:

- has `tenant_id NOT NULL`;
- enables RLS;
- forces RLS where appropriate;
- has tenant-leading indexes;
- is queried by a non-owner application role without `BYPASSRLS`.

Tenant context is transaction-scoped.

Conceptual pattern:

```sql
BEGIN;
  -- set transaction-local tenant context
  -- execute all tenant work
COMMIT;
```

Use one sanctioned helper:

```text
withTenant(tenantId, fn)
```

It is the only application path to a tenant-scoped database handle.

Do not depend on connection-session state that may leak through a pool.

## 12.3 Security proof

CI dynamically enumerates tenant-scoped tables and proves:

- tenant A cannot read tenant B;
- tenant A cannot update/delete tenant B;
- inserts cannot spoof tenant B;
- application role is not table owner/superuser/BYPASSRLS;
- every new tenant table has required RLS;
- host/session tenant mismatch is denied.

## 12.4 Isolation tiers

Default:

```text
pooled shared schema + RLS
```

Future enterprise escape hatch:

```text
pooled | dedicated_database
```

Avoid a “schema-per-tenant” middle tier unless a concrete customer/use case proves it valuable; it adds migration complexity without the isolation clarity of a dedicated database.

The connection resolver owns the isolation decision. Business modules do not branch on it.

---

# 13. Authentication and authorisation

## 13.1 Authentication

Better Auth sits behind `packages/auth`.

It owns:

- identity;
- sign-in/session lifecycle;
- MFA/passkeys/SSO capabilities as adopted;
- principal identity.

Xforge owns:

- tenants;
- tenant membership;
- business roles;
- permissions;
- scopes;
- organisational access;
- business audit.

This avoids making an authentication library a business-domain database.

## 13.2 Authorisation

Permission vocabulary:

```text
hr.employee.read
hr.employee.update
hr.compensation.read
payroll.run.calculate
payroll.run.review
payroll.run.approve
payroll.payment.release
```

Scope model:

```text
tenant
legal_entity
business_unit
location
department
own
```

Example grant:

```text
permission = payroll.run.approve
scope_type = legal_entity
scope_id   = MY01
```

The policy layer evaluates business permission.

RLS enforces tenant isolation.

UI permission state is presentation convenience only and never the security authority.

## 13.3 Security layering

```text
Authentication  → who is the principal?
Tenant boundary → which tenant can this connection see?
Policy          → what business action may this principal perform?
```

Keep these separate.

---

# 14. Tenant URL architecture

Canonical model:

```text
tenant_domain
  id
  tenant_id
  hostname
  domain_type
  status
  verification_method
  verified_at
  is_primary
```

Supported:

```text
app.xforge.com
acme.xforge.app
hr.acme.com.my
```

Request path:

```text
Host
  ↓
domain resolver
  ↓
candidate tenant
  ↓
authenticated principal
  ↓
tenant membership verification
  ↓
application tenant context
```

> The hostname selects a candidate tenant. It never grants authority.

Never trust a network-provided `x-tenant-id` as authorisation.

Domain provider integration sits behind an internal adapter so Vercel/Cloudflare choices remain operational, not domain architecture.

---

# 15. Frontend and UX architecture

The UI is a competitive product surface, not a generated admin panel.

## 15.1 UX priorities

- command/search palette as a first-class navigation surface;
- dense, keyboard-efficient grids;
- saved user views;
- bulk operations with explicit confirmation and undo where safe;
- optimistic UI only where rollback semantics are sound;
- intentional mobile layouts;
- good empty/error/permission/partial/retry states;
- accessible focus, keyboard and screen-reader behaviour;
- semantic tokens before application screens proliferate.

## 15.2 PWA/offline

Do not make all of ERP offline-first.

Introduce PWA/offline-tolerant behaviour for workflows with a real field/mobile requirement, such as:

- warehouse scanning;
- field attendance;
- delivery confirmation;
- field sales.

Offline mutation uses an explicit outbox and conflict strategy; it is not “cache everything.”

## 15.3 Performance

Performance budgets are route/use-case specific and measured in CI.

Do not freeze one global bundle number in architecture.

Track:

- core route JS;
- LCP/INP/CLS;
- grid interaction latency;
- API latency;
- slow 4G/mobile behaviour.

Performance regressions require evidence and ownership.

---

# 16. Money and numerical integrity

## 16.1 Never JS floating point for monetary truth

Use:

- PostgreSQL `numeric(p,s)` for persisted decimal monetary/accounting values;
- an explicit decimal library/domain type in TypeScript;
- integer minor units inside payroll calculations when statutory rounding is defined in cents/sen.

`number` may be used for non-monetary UI/display calculations only when precision is not business truth.

## 16.2 Canonical Money value

Conceptually:

```text
Money {
  amount
  currency
}
```

For multi-currency transactions also persist:

```text
transaction_amount
transaction_currency
base_amount
base_currency
exchange_rate
exchange_rate_source
exchange_rate_timestamp
rounding_policy
```

Do not recompute historical base amounts from today's exchange rate.

## 16.3 Rounding

Rounding policy is named, versioned and tested.

Never sprinkle `.toFixed()` or ad hoc rounding across modules.

---

# 17. Payroll — launch high-integrity domain

Payroll is not metadata CRUD.

## 17.1 Pure calculation engine

```ts
calculatePayroll(
  employeeSnapshot,
  payrollInputSnapshot,
  rulePack,
  period,
) -> PayrollCalculation
```

Properties:

- deterministic;
- no network I/O;
- no database I/O;
- no clock reads inside calculation;
- explicit input snapshot;
- explicit versioned rule pack;
- integer sen for Malaysia statutory arithmetic where rules require it.

## 17.2 Immutable lifecycle

A payroll run has explicit commands/lifecycle, for example:

```text
DRAFT
  → calculate
CALCULATED
  → review
REVIEWED
  → approve
APPROVED
  → release
RELEASED / CLOSED
```

Do not implement:

```text
PATCH { status: "APPROVED" }
```

Implement:

```text
POST /payroll-runs/{id}/approve
```

The command verifies:

- current state;
- permission;
- legal-entity scope;
- concurrency/version;
- required findings;
- snapshot hashes;
- rule-pack version;
- idempotency.

Final run results are immutable.

Corrections create reversal/adjustment/replacement artifacts.

## 17.3 Statutory rule packs

Every rule/table carries:

```text
jurisdiction
effective_from
effective_to
version
authority_reference
source_hash or evidence reference
```

Historical rules are never overwritten.

A historical run must be reproducible from:

```text
input snapshot
+ rule-pack version
+ calculation-engine version
```

## 17.4 Malaysia launch scope

Define exact scope in the payroll product specification, including relevant:

- EPF/KWSP;
- SOCSO/PERKESO;
- EIS/SIP;
- PCB/MTD and applicable instructions;
- HRD Corp where applicable;
- employer/legal-entity registrations;
- statutory/year-end outputs in approved scope;
- bank disbursement artifacts.

All statutory figures must be sourced from current official authorities during implementation and encoded with effective dates. Architecture does not hard-code current rates.

---

# 18. Accounting and inventory integrity for future modules

Do not claim generic ERP maturity until these semantics are specified and proven.

## 18.1 Commands, not patches

Examples:

```text
POST /sales-orders/{id}/confirm
POST /stock-transfers/{id}/post
POST /journal-entries/{id}/post
POST /journal-entries/{id}/reverse
```

## 18.2 Immutable posting

Posted financial/stock truth is corrected through:

```text
original
+ reversal
+ corrected replacement
```

not arbitrary edits.

## 18.3 Property-based invariants

Before accounting/inventory posting code is accepted:

- debit = credit;
- reversal neutralises the original;
- posting is idempotent;
- subledger reconciles to GL;
- stock quantity/value conservation holds under defined algorithms;
- allocation rounding conserves totals;
- FX/revaluation policy is deterministic.

These invariants are specifications, not just tests.

---

# 19. Workflow

Workflow metadata decides **when a transition is allowed**.

Domain commands decide **what the transition does**.

Workflow may define:

- states;
- transitions;
- eligible permissions;
- approval levels;
- conditions based on exposed safe facts;
- notification/SLA metadata.

Workflow must not become a general-purpose scripting language.

Complex side effects remain explicit application code.

---

# 20. Events, outbox and durable jobs

## 20.1 Transactional outbox

When a business transaction commits, its event intent commits atomically:

```text
BEGIN
  change business state
  insert outbox event
COMMIT
```

The outbox is the durable integration truth.

No dual-write:

```text
COMMIT database
then hope queue publish succeeds
```

## 20.2 Delivery semantics

Assume **at-least-once delivery**, not magical exactly-once processing.

Consumers must be idempotent.

Use:

- stable event IDs;
- idempotency keys;
- processed-event/inbox record where appropriate;
- retry/backoff;
- dead-letter / operator-visible failure state.

## 20.3 Job runner

`packages/jobs` defines the internal execution interface.

Trigger.dev is the initial managed executor.

Business modules do not import Trigger.dev SDK directly.

This makes executor replacement an operational migration rather than a domain rewrite.

## 20.4 What goes async

Examples:

- payroll artifact generation after calculation;
- bulk imports/exports;
- PDF generation;
- email;
- bank-file generation;
- e-invoice submission;
- webhooks;
- AI document processing;
- search/vector indexing;
- scheduled reports.

Money-moving external operations require explicit idempotency and reconciliation.

---

# 21. Files, search and retrieval

## 21.1 Files

Object storage is private by default for sensitive artifacts.

Persist metadata separately:

```text
file_id
tenant_id
owner_entity_type
owner_entity_id
classification
content_type
size
checksum
storage_key
created_by
created_at
```

Serve sensitive files using short-lived signed access or authorised streaming.

Do not put permanent public URLs to payslips or employee documents into business records.

## 21.2 Search

Start with:

- PostgreSQL full-text search;
- `pg_trgm`;
- language normalisation as needed;
- explicit search documents/projections for complex entities.

Introduce Meilisearch/OpenSearch/etc. only when measured latency/relevance requirements justify it.

## 21.3 Vectors

Tenant/security filtering belongs **inside** the retrieval query.

Never retrieve global vectors and filter tenants afterward.

---

# 22. AI-native architecture

AI sits above the application layer.

```text
AI UI / agent
     ↓
AI tool registry
     ↓
application command/query
     ↓
policy
     ↓
repository
     ↓
RLS-protected PostgreSQL
```

## 22.1 Provider neutrality

`packages/ai` owns:

```text
providers/
tools/
prompts/
policies/
retrieval/
evaluations/
```

No business module depends directly on a model-provider SDK.

## 22.2 Tool exposure is explicit

An entity being metadata-readable does not automatically create write tools.

Tool registration specifies:

```text
tool_id
operation_id / application command
risk_class
required_permission
approval_mode
input schema
output schema
audit requirements
```

## 22.3 Consequential actions

Default:

```text
AI proposes
  ↓
human or policy approval
  ↓
normal command executes
```

High-risk financial/payroll/inventory actions must never gain autonomous execution simply because a tenant toggled a generic “AI enabled” flag.

Autonomy, if later supported, is configured **per action type and risk class**.

## 22.4 Audit

AI action audit records include, where applicable:

- acting principal;
- agent identity;
- tenant;
- model/provider;
- tool;
- request correlation;
- approval;
- resulting business command;
- model configuration/version;
- prompt/template version or hash without leaking secrets.

Never log secrets or sensitive raw prompts indiscriminately.

## 22.5 AI data access

AI receives no privileged SQL path.

RAG/search applies the same:

- tenant boundary;
- row permission;
- sensitivity policy;
- document classification.

---

# 23. Southeast Asia localisation and compliance

Localisation is a platform dimension, not scattered branches.

```text
packages/localisation/
  core/
  my/
  sg/
  vn/
  id/
  th/
  ph/
```

Country packs may contribute:

- identifiers;
- addresses;
- currencies;
- date/display conventions;
- holiday rules;
- payroll/statutory rule packs;
- chart-of-account templates;
- report definitions;
- translations;
- bank-file formats.

Rules are versioned and effective-dated.

## 23.1 Compliance adapter separation

Do not mix:

```text
business truth
```

with:

```text
external authority connectivity
```

Example architecture:

```text
invoice/posting truth
       ↓
outbox
       ↓
country compliance adapter
       ↓
authority/provider
       ↓
clearance/rejection/amendment state
```

External submission failure is a normal operational state to reconcile, not a reason to corrupt or ambiguously roll back financial truth.

Country-specific laws and deadlines must be verified from official authorities in the module specification; this architecture intentionally does not freeze regulatory figures/dates.

---

# 24. Audit, observability and sensitive data

## 24.1 Business audit

Maintain an append-only business audit trail for consequential changes.

Capture:

```text
tenant
principal/agent
action
entity
entity_id
before/after summary or change set
request_id
timestamp
origin
reason where required
```

Audit is not the same thing as application logs.

## 24.2 Technical observability

Standardise:

- trace/correlation ID;
- structured logs;
- OpenTelemetry traces/metrics;
- Sentry errors;
- job/outbox observability;
- slow query monitoring;
- security-sensitive event monitoring.

## 24.3 Sensitive data discipline

At minimum:

- never log passwords/tokens/secrets;
- redact sensitive HR/payroll fields from ordinary logs;
- classify fields in the semantic registry;
- authorise exports separately from screen reads where appropriate;
- use provider encryption at rest and TLS in transit;
- keep secrets in managed secret storage;
- rotate integration credentials;
- make bulk export and privileged reads auditable.

Application-level field encryption may be introduced for specific high-risk data only where threat model/regulation justifies the operational cost.

---

# 25. Agent-driven development operating model

## 25.1 Canonical spine

```text
UX
 ↓
typed route contract
 ↓
generated client + mocks
 ↓
application command/query
 ↓
domain invariant
 ↓
repository
 ↓
PostgreSQL
```

Claude Code should find one canonical location for each concern.

## 25.2 Generated state

Generated:

```text
OpenAPI document
API client
TanStack Query hooks
MSW handlers/factories
contract fixtures where useful
```

Rules:

- generated directories are obvious;
- they are never edited manually;
- CI regenerates and asserts a clean diff.

```bash
pnpm generate
git diff --exit-code
```

## 25.3 ADRs

Use short ADRs for non-obvious decisions.

Initial set:

```text
ADR-001 modular monolith
ADR-002 contract-first Hono/OpenAPI
ADR-003 shared-schema RLS
ADR-004 four-plane metadata model
ADR-005 custom-field JSONB + index projection
ADR-006 money/decimal strategy
ADR-007 outbox + durable executor
ADR-008 country-pack/compliance separation
ADR-009 auth vs tenant vs policy ownership
ADR-010 production migration compatibility
```

## 25.4 Feature slicing

Good:

```text
employee emergency contact
UX → contract → mock → UI → command/query → repository → tests
```

Bad:

```text
build HRMS
```

Every task needs:

- user outcome;
- architecture touchpoints;
- explicit non-goals;
- acceptance tests;
- canonical verification command.

---

# 26. Architecture enforcement

Machine-check where practical.

Guards should detect:

```text
UI importing db/repository
module importing foreign repository/schema/private UI
business-module cycle
tenant-owned table missing tenant_id
tenant-owned table missing required RLS
application role accidentally owns tenant tables / BYPASSRLS
unapproved DB access outside repository/withTenant
country branching inside shared core
generated code modified
route missing operationId
permission used but not registered
Server Action containing business mutation
direct update of immutable posted/final records
money code using unsafe JS number arithmetic
AI tool mapped directly to repository/database
job provider SDK imported by business domain
destructive migration violating rollout policy
```

Architecture tests should be deterministic and fast enough to run continuously.

---

# 27. Verification strategy

## 27.1 Canonical gate

`pnpm verify` composes the semantic definition of green:

```text
generate cleanliness
architecture guards
typecheck
format/lint
unit tests
property tests
contract tests
RLS/security tests
integration tests
migration compatibility checks
build
selected Playwright E2E
```

Execution may use caching/parallelism. The meaning of green remains singular.

## 27.2 Tenant isolation — blocking

Automated proof:

1. seed two+ tenants;
2. use the real non-owner app role;
3. set transaction-local tenant context;
4. enumerate tenant-owned tables;
5. prove cross-tenant read/write denial;
6. prove spoofed insert denial;
7. prove host/session mismatch denial;
8. prove no tenant table escapes policy coverage.

This is a foundation gate, not a manual checklist.

## 27.3 Payroll — blocking

For every Malaysian rule-pack version:

- official-source golden fixtures;
- wage-band boundaries;
- joiner/leaver cases;
- unpaid leave;
- variable inputs;
- age/category thresholds as applicable;
- rounding boundaries;
- gross/deduction/net reconciliation;
- deterministic historical replay;
- run immutability and reversal;
- idempotent commands.

## 27.4 API contract

CI validates:

- OpenAPI 3.1;
- operation IDs;
- generated client/mocks clean;
- breaking diff;
- content-type/validation semantics;
- standard errors;
- idempotency behaviour where declared.

## 27.5 Accounting/inventory later

Property tests become merge blockers for posting algorithms.

## 27.6 E2E launch path

Flagship path:

```text
sign in
→ tenant context
→ legal entity
→ employee
→ payroll inputs
→ calculate
→ review
→ approve
→ generate payslip
→ authorised download
```

Run against an isolated database branch.

---

# 28. Infrastructure and deployment

## 28.1 Launch topology

```text
Vercel
  ├─ Next.js web
  ├─ Hono API mounted in the web deployment
  ├─ preview deployments
  └─ tenant/custom domains

Neon
  ├─ PostgreSQL
  ├─ RLS
  ├─ preview/test branches
  └─ pgvector

Trigger.dev
  └─ durable execution behind packages/jobs

Cloudflare R2
  └─ private S3-compatible file storage

Resend
  └─ transactional email

Sentry + OpenTelemetry
  └─ technical observability
```

## 28.2 Portability

Even though v1 is SaaS-only:

- domain code imports no hosting provider SDK;
- PostgreSQL remains provider-portable;
- object storage is S3-compatible;
- auth is behind a facade;
- jobs are behind the outbox/internal executor interface;
- tenant-domain provider is behind an adapter;
- local core stack can run through Docker Compose.

Portability is a property, not an on-prem support promise.

## 28.3 Extraction triggers

| Measured pain | Candidate response |
|---|---|
| API independently saturates web deployment | mount same Hono composition in dedicated `apps/api` |
| job workload needs dedicated runtime | add dedicated worker/executor |
| enterprise demands residency/isolation | dedicated regional database tier |
| PostgreSQL search misses UX SLO/relevance | add specialised search |
| hot config/domain lookup overloads DB | add cache/KV |
| outbox volume warrants streaming backbone | evaluate managed event bus/Kafka |
| file economics/region requires change | switch S3-compatible provider |

These should be extractions, not rewrites.

---

# 29. Build sequence

## Phase 0 — Canonical spine

Build:

- monorepo;
- `.architecture` baseline + ADR mechanism;
- architecture guards;
- Next.js + shadcn/Base UI + tokens;
- Hono contract pipeline;
- OpenAPI + Orval + MSW;
- Drizzle + PostgreSQL;
- canonical `pnpm verify`.

Exit:

> One trivial vertical slice completes UX → contract → mock → UI → handler → repository → DB → Playwright with generated-state and architecture gates green.

## Phase 1 — Tenancy, identity and policy

Build:

- Better Auth facade;
- tenant;
- tenant membership;
- legal-entity skeleton;
- host resolution;
- RLS;
- non-owner app role;
- `withTenant()`;
- initial policy registry;
- tenant domain onboarding.

Exit:

> Automated proof shows tenant A cannot read or mutate tenant B through any tenant-owned table, and host/session mismatch is rejected.

## Phase 2 — Design system + bounded metadata

Build:

- tokens;
- component governance;
- grid/form primitives;
- semantic registry;
- metadata renderer;
- deterministic overlays;
- custom-field JSONB;
- custom-field index projection;
- effective-configuration inspector;
- React escape hatch.

Exit:

> A representative HR master-data feature is mostly reusable without fusing Data, Contract, Experience and Policy.

## Phase 3 — HR core

Build:

- person/employee/employment;
- organisational assignment;
- leave;
- claims;
- documents;
- approvals;
- audit.

Exit:

> Employee onboarding and leave request → approval → balance lifecycle work end-to-end on desktop and mobile.

## Phase 4 — Malaysia payroll

Build:

- immutable payroll input snapshots;
- versioned Malaysian rule packs;
- pure calculation engine;
- review/approval lifecycle;
- payslip artifacts;
- defined statutory/year-end artifacts;
- bank outputs;
- reconciliation.

Exit:

> Official-source golden fixtures, deterministic replay, property checks and full payroll E2E are green.

## Phase 5 — AI copilot

Build:

- provider abstraction;
- tenant/policy-aware tools;
- employee assistant;
- HR/payroll copilot;
- document intake;
- audited draft actions;
- evaluation fixtures.

Exit:

> AI completes a useful HR/payroll workflow while provably respecting tenant, policy and approval boundaries.

## Phase 6 — Integration and tenant experience

Build as justified:

- custom domains;
- notifications;
- WhatsApp channel;
- webhooks;
- external credentials;
- compliance adapters required by product scope.

## Phase 7 — Second domain proves platform generality

Build a materially different domain, preferably:

```text
Sales + Purchasing + Inventory
```

or the Finance/Accounting spine.

Use it to find and delete HR/payroll assumptions from platform abstractions.

No generic ERP marketplace claim before this phase.

## Phase 8 — Second country / enterprise isolation

Only after the first vertical and platform abstraction are proven:

- second country pack;
- dedicated database/region tier;
- additional compliance adapters.

---

# 30. Explicitly rejected defaults

| Temptation | Decision |
|---|---|
| Microservices from day one | Reject |
| Kubernetes from day one | Reject |
| GraphQL as principal ERP API | Reject |
| tRPC as public contract | Reject |
| Server Actions as business API | Reject |
| RSC importing repositories/domain internals | Reject |
| Two business transports before measured need | Reject |
| One mega metadata object generating all planes | Reject |
| EAV as primary business persistence | Reject |
| Routine per-tenant DDL | Reject |
| Automatic arbitrary custom-field column promotion | Reject |
| Per-tenant DB as default | Reject |
| Schema-per-tenant as an assumed tier | Reject until proven |
| Arbitrary tenant server code | Reject |
| XML/XPath/deep view inheritance | Reject |
| Generic `BaseService<T>` | Reject |
| ORM abstraction that hides SQL semantics | Reject |
| Event sourcing everything | Reject |
| Kafka before measured need | Reject |
| Redis before measured need | Reject |
| Elasticsearch before measured need | Reject |
| AI direct SQL/database writes | Reject |
| Automatic metadata-to-AI mutation exposure | Reject |
| Mutable posted/final financial/payroll records | Reject |
| Country branching scattered through core | Reject |
| JS floating point for monetary truth | Reject |
| Silent last-write-wins on concurrent business editing | Reject |
| Destructive one-step production migrations | Reject |

---

# 31. Primary risks and mitigation

| Risk | Severity | Mitigation |
|---|---:|---|
| Tenant data leakage | Critical | RLS, non-owner role, transaction-local context, chokepoint, enumerated CI proof |
| Payroll miscalculation | Critical | pure engine, immutable inputs/results, official golden fixtures, deterministic replay |
| Future ledger error | Critical | hand-specified invariants + property/reconciliation tests before implementation |
| AI exceeds authority | Critical | tool-only access, policy, RLS, risk classes, proposal default, audit |
| Metadata becomes another Odoo/Frappe | High | four planes, 80/20 rule, hard escape hatches, second-domain generalisation |
| Architecture drift under long agent sessions | High | small slices, ADRs, guards, generated state, `pnpm verify` |
| Frontend inconsistency | High | tokens, component governance, Storybook, UX patterns |
| Compliance changes | High | effective-dated rules, adapter versioning, official-source evidence |
| JSONB custom fields become slow | Medium | index projection, query observability, product-level promotion only when justified |
| Vendor lock-in | Medium | internal facades, S3/Postgres portability, outbox, domain isolation |
| Async duplicate side effects | High | outbox IDs, idempotency, inbox/dedupe, reconciliation |
| Concurrent edits overwrite work | High | optimistic concurrency and explicit conflicts |
| Migration causes deployment outage | High | expand/migrate/switch/contract policy + branch verification |
| Scope explosion | High | Malaysia HR/payroll wedge + phase exit gates |

---

# 32. Architecture change control

This document is normative but not immutable.

A change requires an ADR when it modifies:

- a dependency direction;
- source-of-truth ownership;
- API compatibility strategy;
- tenancy/security boundary;
- persistence model;
- runtime/deployment boundary;
- module contract;
- money/integrity model;
- metadata authority;
- async delivery semantics;
- AI authority boundary.

An ADR contains:

```text
context
decision
alternatives
consequences
migration/rollback
verification
```

Architecture does not require an ADR for ordinary package upgrades that preserve these contracts.

---

# 33. Adoption checklist

Before this becomes `architecture-final.md`:

- [ ] repository agrees on this document as the canonical architecture;
- [ ] superseded architecture drafts are moved to an archive/history location;
- [ ] `CLAUDE.md` contains only the short architecture laws + pointers;
- [ ] ADR directory exists;
- [ ] `pnpm verify` contract is defined;
- [ ] Phase 0 is specified as a vertical slice, not a framework-building project;
- [ ] no code is generated from metadata before the four-plane ownership rules are encoded;
- [ ] tenant/RLS proof is a blocking early gate;
- [ ] package/runtime versions are pinned in manifests/lockfile rather than duplicated across architecture prose.

---

# 34. Final canonical stack

```text
TypeScript strict
Node.js 24 LTS baseline
pnpm
Turborepo
Biome

React 19
Next.js App Router
Tailwind CSS v4
shadcn/ui + Base UI
OKLCH semantic tokens
TanStack Query
TanStack Table
React Hook Form
Storybook
MSW

Hono
Zod
OpenAPI 3.1
Orval
Scalar

PostgreSQL
Drizzle + explicit SQL
PostgreSQL RLS
Neon
FTS + pg_trgm
pgvector

Better Auth behind Xforge facade
Xforge tenancy + organisation + policy

Transactional outbox
Trigger.dev behind packages/jobs

S3-compatible private object storage
Vercel for Platforms behind domain adapter
Resend

Vercel AI SDK / provider abstraction
tenant- and policy-scoped AI tools

OpenTelemetry
Sentry
structured logs
immutable business audit

Vitest
fast-check
Testcontainers
Playwright

pnpm verify
```

---

# 35. Final conclusion

Xforge should not win by being the most abstract ERP framework.

It should win by being **easier to understand, safer to change, faster to build, better to use, and harder to corrupt**.

The mature architecture is therefore intentionally asymmetric:

```text
business truth        → explicit code + relational data
external interface    → typed contract + OpenAPI
repetitive UX         → bounded metadata
tenant variation      → deterministic overlays
high-value UX         → hand-built React
tenant isolation      → PostgreSQL RLS
business authority    → explicit policy
historical truth      → immutable snapshots/ledgers
country variation     → effective-dated country packs
external compliance   → asynchronous adapters
async intent          → transactional outbox
AI                    → authorised application tools
infrastructure        → added only against measured pain
architecture          → enforced by executable guards
```

That is the intended foundation for a Claude Code–first, multi-tenant, AI-native Southeast Asian business platform:

> **simple enough to reason about, strict enough to trust, extensible enough to grow.**
