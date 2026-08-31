# Xforge — Canonical Reference Architecture v2.0 FINAL

**Status:** **FROZEN — evidence-backed canonical baseline**  
**Date:** 31 August 2026  
**Supersedes:** `xforge-canonical-reference-architecture-v2-1.md`, `v2-2.md`, `v2-3.md`, and all v1 architecture drafts  
**Intended repository target:** `C:\JackProject\afeda-Xforge\.architecture\architecture-final.md`  
**Optimised for:** Claude Code–first development · DRY · KISS · API-first authority · frontend-led delivery · strict multi-tenancy · bounded metadata extensibility · AI-native operation · Southeast Asia localisation  
**Launch wedge:** Malaysia HRMS + Payroll  
**Long-term scope:** Multi-purpose business / ERP platform across Southeast Asia

---

## How this final version was qualified

This final version reconciles **v2-1, v2-2 and v2-3**. It does not average disagreements.

- **v2-3** is the normative base because it most clearly separates architectural invariants from package/provider versions, keeps one business transport at launch, adds concurrency and migration safety, and replaces arbitrary custom-field column promotion with a controlled index projection.
- **v2-1** contributes the strongest freeze/stability discipline, bounded AI-tool exposure, separation of localisation from compliance connectivity, and explicit architectural fitness functions.
- **v2-2** contributes the strongest requirement that architecture guards must be deliberately observed to fail, the clearest second-domain generality gate, and useful production-oriented modularity/use-case framing.

### Evidence rule

A decision is **FROZEN** only when all of the following are true:

1. it is supported by a durable standard, database invariant, established production pattern, or major production precedent;
2. it directly answers an Xforge use case or failure mode;
3. Xforge has a named executable qualification test or fitness function for it;
4. replacing it later would change source-of-truth ownership, security boundaries, integrity semantics, or dependency direction.

A technology/provider is **not** frozen merely because it is currently recommended.

### Decision classes

| Class | Meaning | Change rule |
|---|---|---|
| **FROZEN** | Architectural invariant or ownership boundary | Superseding ADR + architecture version bump |
| **STABLE** | Established implementation pattern | ADR only if semantics/boundary changes |
| **REVERSIBLE** | Provider/library/tool selected behind an internal boundary | Change on measured need; no architecture rewrite |
| **OPEN** | Deliberately undecided and explicitly listed | Resolve by named phase/gate |

### What “battle-proven” means here

The architecture is **battle-proven by external precedent** and **testable by explicit Xforge fitness functions**.

It is **not** correct to claim that the Xforge implementation itself is already battle-tested before those tests run.

The qualification model is therefore:

```text
external production precedent / standard
                 +
Xforge failure-mode analysis
                 +
executable qualification test
                 =
architectural confidence
```

The final architecture may be frozen now. An implementation layer becomes **Xforge-qualified** only after its blocking qualification suite passes.

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

> **Classification:** the capability boundaries in this section are STABLE; most named vendors and UI/tooling libraries are REVERSIBLE. No provider choice may become a domain dependency.

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
│  ├─ compliance/
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

# 29. Build and qualification sequence

The sequence is intentionally designed as a series of **architecture qualification experiments**, not as a framework-building marathon.

## Phase 0 — Spine qualification

Build:

- monorepo and dependency graph;
- `.architecture` baseline + ADR mechanism;
- architecture-guard harness;
- Next.js + design-token bootstrap;
- Hono typed-route pipeline;
- OpenAPI generation;
- Orval client + TanStack Query + MSW;
- Drizzle + PostgreSQL;
- canonical `pnpm verify`.

Required use case:

```text
employee emergency contact
UX → contract → generated mock → complete UI → handler → repository → DB → Playwright
```

Blocking evidence:

- generated-state cleanliness passes;
- OpenAPI diff is reviewable;
- the browser UI has no repository/DB import path;
- **at least five architecture guards are deliberately violated and observed to fail**.

Exit:

> The canonical spine works end-to-end and the enforcement system has proven that it can reject violations.

## Phase 1 — Tenancy / identity / policy qualification

Build:

- Better Auth facade;
- tenant;
- tenant membership;
- legal entity;
- business-unit/location skeleton;
- host/domain resolution;
- RLS;
- non-owner application role;
- `withTenant()`;
- Xforge permission registry and scoped grants.

Blocking evidence:

```text
Tenant A and Tenant B share the same tables.
A valid A session is presented at B's hostname.
A repository bug intentionally omits tenant filtering.
An INSERT intentionally tries to spoof tenant B.
```

All must be denied by structural controls and tests.

Exit:

> Tenant isolation is demonstrated across every tenant-owned table dynamically, not by sampling.

## Phase 2 — Design-system qualification

Build:

- semantic tokens;
- typography, spacing, radius and elevation rules;
- shadcn/Base UI governance;
- form controls;
- data-grid primitives;
- command/search navigation;
- Storybook;
- accessibility checks;
- mobile shell.

Blocking evidence:

- representative HR desktop screen;
- same workflow on mobile;
- keyboard-only grid/form use;
- no bespoke CSS required for the representative screen;
- loading/error/permission/empty states exist as first-class stories.

Exit:

> The component vocabulary exists before the metadata renderer is allowed to depend on it.

## Phase 3 — Bounded metadata qualification

Build:

- four-plane ownership rules;
- semantic registry;
- deterministic overlay resolver;
- stable slots;
- effective-configuration inspector;
- custom-field registry + JSONB;
- typed custom-field index projection;
- `<EntityForm>` / `<EntityList>` for low-complexity surfaces;
- explicit React escape hatch.

Failure-injection cases:

1. rename a form label → **no DDL**;
2. hide a required field → contract remains required;
3. add a tenant custom field → **zero core-table DDL**;
4. deny a field by policy → metadata cannot re-enable it;
5. conflicting country/tenant overlays → deterministic conflict result;
6. high-integrity entity requests generic custom-entity storage → rejected.

Exit:

> A representative HR master-data surface is configurable without fusing Data, Contract, Experience and Policy.

## Phase 4 — HR core qualification

Build:

- person / employee / employment;
- effective-dated assignment;
- leave;
- claims;
- documents;
- approvals;
- audit.

Use cases:

- employee onboarding;
- internal transfer between business units;
- effective-dated manager change;
- leave request → approval → balance;
- privileged compensation read vs ordinary employee read;
- stale concurrent edit rejected.

Exit:

> HR core proves organisational scoping, workflow, policy, audit and concurrency without payroll-specific shortcuts in platform packages.

## Phase 5 — Malaysia payroll qualification

Build:

- immutable employee/payroll-input snapshots;
- versioned Malaysian rule packs;
- pure calculation engine;
- review/approval lifecycle;
- findings;
- payslip artifacts;
- approved statutory outputs;
- bank artifacts;
- reconciliation and closure.

Blocking evidence:

- official-source golden fixtures;
- wage-band boundaries;
- joiner/leaver;
- unpaid leave;
- variable period inputs;
- statutory rounding boundaries;
- gross/deduction/net reconciliation;
- deterministic historical replay;
- same idempotency key cannot approve/release twice;
- finalized run cannot be mutated;
- correction is reversal/adjustment/replacement.

Exit:

> A complete payroll cycle is reproducible, reconcilable and immutable.

## Phase 6 — Async / integration qualification

Before relying on external integrations, prove the outbox semantics with failure injection:

1. business transaction rolls back → no outbox intent survives;
2. business transaction commits and executor is down → intent remains recoverable;
3. executor sends duplicate delivery → consumer remains idempotent;
4. executor crashes after side effect but before acknowledgement → retry does not duplicate the business effect;
5. poison message → visible failed/dead-letter state;
6. event ordering requirement → deterministic ordering strategy is demonstrated.

Exit:

> External reliability no longer depends on a process staying alive after `COMMIT`.

## Phase 7 — AI qualification

Build:

- provider abstraction;
- tenant-scoped retrieval;
- explicit AI tool registry;
- employee assistant;
- HR/payroll copilot;
- document intake;
- audited draft/proposal actions;
- evaluation fixtures.

Adversarial cases:

- prompt requests tenant B data;
- prompt asks agent to bypass approval;
- metadata declares an entity but no consequential tool is authored;
- low-confidence document extraction;
- user lacks `payroll.run.approve`;
- prompt injection attempts to invoke an unrelated tool.

Exit:

> The AI remains inside user/tenant/policy boundaries even when the prompt asks it not to.

## Phase 8 — Tenant domain / operational qualification

Build as needed:

- subdomain onboarding;
- custom domain verification;
- notifications;
- webhook delivery;
- secrets/credential storage;
- provider adapters.

Blocking cases:

- hostname/session tenant mismatch;
- unverified custom domain;
- duplicate webhook delivery;
- revoked integration credential;
- signed sensitive-file URL expiry.

## Phase 9 — Second domain proves platform generality

Build a materially different domain:

```text
preferred: Sales + Purchasing + Inventory
alternative: Finance / Accounting spine
```

The goal is not feature count. The goal is to falsify bad abstractions.

Required outcome:

- identify HR/payroll assumptions in platform packages;
- remove or relocate them;
- prove module boundaries with a second dependency graph;
- prove commands, events, metadata, policy and outbox in a different workflow shape.

Exit:

> Xforge may call itself a general business-platform architecture only after the second domain passes.

## Phase 10 — Second country / enterprise isolation

Only after the first vertical and second-domain generality gate:

- second country pack;
- required compliance adapter;
- dedicated database/region tier if a real requirement exists.

The dedicated tier must prove the **same application contracts and module code** work without tenant-specific forks.

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

# 35. Battle-proven evidence and Xforge qualification matrix

This appendix is part of the canonical architecture, not a bibliography added for appearance.

External evidence supports the **pattern**. The Xforge proof column supports the **implementation**.

| Architectural decision | External production/standard evidence | Xforge use case | Required Xforge proof | Status |
|---|---|---|---|---|
| **Strict modular monolith** | Shopify publicly describes componentising its large monolith with public entrypoints and dependency enforcement; GitHub continues to operate a very large Rails monolith with high deployment frequency | Claude Code must work in a large codebase without distributed-system overhead | cyclic/foreign-private imports fail CI; second domain uses same kernel without kernel→module dependency | **FROZEN** |
| **REST + OpenAPI contract spine** | OpenAPI is a language-neutral API standard; GitHub publishes its REST API as OpenAPI and uses it for SDK generation and contract tests | frontend-first mocks, partner APIs, future mobile/AI clients | OpenAPI validates; generated client/mocks clean; breaking diff blocks; full UI built against MSW before handler | **FROZEN** |
| **Shared-schema pooled tenancy + RLS** | PostgreSQL provides RLS/default-deny/FORCE RLS semantics; AWS Prescriptive Guidance explicitly recommends RLS for pooled PostgreSQL SaaS tenant isolation | many SME tenants share infrastructure; enterprise tier later | dynamically enumerate every tenant table and prove cross-tenant SELECT/INSERT/UPDATE/DELETE denial with real non-owner role | **FROZEN** |
| **Tenant ≠ legal entity ≠ auth organisation** | SaaS partitioning guidance separates tenant isolation from application/business modelling; auth products expose generic organisations/teams rather than statutory employer semantics | one Malaysian tenant may own several Sdn Bhd legal entities with separate payroll/statutory registrations | one tenant with 2+ legal entities runs separately scoped payroll while sharing tenant identity/membership | **FROZEN** |
| **Bounded metadata, shared-schema customisation** | Salesforce documents an internet-scale metadata-driven, shared-schema multitenant platform; Frappe demonstrates the productivity of model/view metadata; Odoo demonstrates modular/view inheritance | configurable HR/business app without tenant forks or per-tenant core schema changes | form label causes no DDL; tenant field causes no core DDL; effective overlay is inspectable; second domain proves abstractions | **FROZEN** |
| **Four planes + semantic registry** | This is an Xforge synthesis informed by the coupling visible in Frappe DocTypes and the extension depth available in Odoo views; it intentionally does not copy either implementation | prevent UI/config changes from silently changing persistence/policy | three cross-plane invariants are encoded as guards and mutation tests | **FROZEN** |
| **Transactional outbox** | AWS and Microsoft both document the outbox as a solution to database/message dual-write inconsistency | payroll approval, webhooks, e-invoice, PDF/bank generation | crash/rollback/duplicate-delivery failure injection; no lost committed intent; idempotent consumers | **FROZEN** |
| **At-least-once + idempotency** | AWS outbox guidance explicitly warns of duplicates; Stripe exposes idempotency keys for safely retrying consequential API requests | approve/release/pay/send operations may be retried by users, clients and jobs | same idempotency key cannot duplicate a business effect; mismatch payload is rejected | **FROZEN** |
| **Immutable financial/payroll posting** | Mature ledger products document balanced entries, atomic writes, idempotency and immutability after posting; double-entry systems depend on auditable history | payroll finalisation; future accounting/stock ledger | direct mutation fails; reversal neutralises original; reconciliation properties hold | **FROZEN** |
| **Pure/versioned payroll calculation** | Deterministic rule engines and versioned effective-dated financial/tax logic are standard auditability techniques; Xforge adds jurisdiction-specific golden evidence | recompute a July-2026 payroll years later | snapshot + rule-pack + engine version reproduces identical lines; official-source golden tests pass | **FROZEN** |
| **Least-privilege AI tool layer** | OWASP LLM Excessive Agency recommends minimum tool functionality/permissions, user-context execution, downstream authorisation and human approval for high-impact actions | AI assistant may read HR/payroll but must not autonomously release money or cross tenants | adversarial prompt/tool tests; consequential tools explicitly authored; no DB handle; policy denial remains authoritative | **FROZEN** |
| **Online-compatible migration discipline** | Large production systems such as Stripe document multi-stage online migrations with dual writing/backfill/cutover to preserve availability | evolve payroll/ERP schema without unsafe one-step destructive deploys | expand/backfill/switch/contract migration tested on isolated branch; rollback/cutover criteria explicit | **FROZEN** |
| **Database branch per PR/test** | Neon documents isolated database branches for PR previews, tests and destructive-query validation | agent-generated migrations need isolated evidence before merge | PR creates isolated DB branch; migration + integration + E2E run there; branch disposed automatically | **STABLE / REVERSIBLE provider** |
| **Custom tenant domains behind adapter** | Vercel documents single-codebase multi-tenant subdomains, custom domains and automatic SSL | `acme.xforge.app` and `hr.acme.com.my` | DNS verification, host/session cross-check, unverified domain denial | **STABLE / REVERSIBLE provider** |
| **Open-code UI primitives** | shadcn currently recommends Base UI for new projects while continuing Radix support; both are designed as inspectable headless/open-code primitives | Claude Code needs to inspect and modify UI rather than infer opaque package behaviour | design-system stories, accessibility/keyboard tests, critical ERP primitives proven before metadata renderer | **REVERSIBLE** |
| **Auth behind facade** | Better Auth exposes organisations, membership, teams and auth capabilities, demonstrating why it is useful infrastructure but broader than Xforge's desired ownership boundary | switch auth implementation without rewriting tenant/legal-entity/policy model | business modules import only Xforge auth facade; no statutory/business topology stored solely in auth plugin | **STABLE / REVERSIBLE provider** |
| **Durable job executor behind outbox** | Trigger.dev supports task idempotency, but AWS/Microsoft outbox evidence shows the durable business intent should live in the transaction rather than a job vendor | PDF, email, bank-file, e-invoice and AI processing | executor outage/replacement leaves committed intent intact | **REVERSIBLE** |

## 35.1 External evidence register

The following official/primary sources were used to qualify the frozen patterns. Package/vendor choices remain subordinate to the architecture.

**E01 — Shopify Engineering, _Under Deconstruction: The State of Shopify's Monolith_.**  
Production precedent for componentising a large monolith, public entrypoints, privacy boundaries and dependency-graph enforcement.

**E02 — GitHub Engineering, _Architecture & optimization_.**  
Current production precedent that a large monolith can support a very large engineering organisation and frequent deployment when continuously engineered.

**E03 — OpenAPI Initiative, _OpenAPI Specification 3.1.x_.**  
Language-neutral HTTP API description standard explicitly intended for documentation, code generation and testing.

**E04 — GitHub, _REST API OpenAPI Description_ and GitHub Docs.**  
Production precedent: GitHub uses OpenAPI descriptions to generate SDKs/documentation and power contract testing/validation.

**E05 — PostgreSQL Documentation, _Row Security Policies_ and `CREATE POLICY`.**  
Database semantics for RLS, default deny, table-owner bypass and `FORCE ROW LEVEL SECURITY`.

**E06 — AWS Prescriptive Guidance, _Implementing managed PostgreSQL for multi-tenant SaaS applications_ / RLS recommendations.**  
Production architecture guidance for pool/silo/bridge SaaS partitioning and RLS-based pooled isolation.

**E07 — Salesforce Architects, _Platform Multitenant Architecture_.**  
Large-scale production precedent for shared-schema multitenancy and metadata-driven tenant customisation.

**E08 — Frappe Framework, _Understanding DocTypes_ / _DocField_.**  
Production precedent for the productivity gained when metadata drives model/view behaviour—and direct evidence that field metadata maps to persistent columns.

**E09 — Odoo 19 Documentation, _Building a Module_ and _View Records_.**  
Production precedent for module inheritance and XPath-based view extension, which Xforge deliberately replaces with explicit dependencies and stable slots.

**E10 — AWS Prescriptive Guidance, _Transactional outbox pattern_.**  
Established solution for database/message dual-write atomicity; explicitly notes duplicate delivery and idempotent-consumer requirements.

**E11 — Microsoft Azure Architecture Center, _Transactional Outbox Pattern_.**  
Independent vendor guidance confirming the same pattern and reliable event-publication model.

**E12 — Stripe API, _Idempotent requests_.**  
Major financial-platform precedent for safe retry semantics using idempotency keys.

**E13 — Modern Treasury, _Ledgers Guarantees_ / _Ledger Transactions Overview_.**  
Financial-ledger precedent for balanced entries, write atomicity, idempotency and posted-entry immutability.

**E14 — Stripe Engineering, _Online migrations at scale_.**  
Production precedent for staged migrations using dual writing, backfill, cutover and validation rather than destructive one-step changes.

**E15 — OWASP GenAI Security Project, _LLM06:2025 Excessive Agency_.**  
Security guidance for minimum tool functionality/permissions, user-context execution, downstream authorisation and human approval for high-impact actions.

**E16 — Neon Documentation, _Database branching workflow primer_.**  
Provider evidence for branch-per-preview/test environments and testing SQL migrations on isolated Postgres branches.

**E17 — Vercel, _Vercel for Platforms_ / multi-tenant application guidance.**  
Provider evidence for single-codebase tenant subdomains, custom domains, automatic SSL and preview support.

**E18 — shadcn/ui, _Base UI as the Default_ (July 2026).**  
Current implementation evidence for Base UI as the recommended greenfield primitive while Radix remains supported.

**E19 — Better Auth, _Organization Plugin_.**  
Current implementation evidence for generic identity/membership/team/role capabilities; supports keeping Xforge's richer business topology outside the auth library.

**E20 — Trigger.dev, _Idempotency_.**  
Current executor capability evidence; not the source of Xforge's durable business intent.

## 35.2 Evidence confidence rule

Do not cite vendor scale claims as proof of Xforge correctness.

Use evidence in this order:

```text
database/standards semantics
        ↓
independent architecture guidance
        ↓
large production precedent
        ↓
provider capability documentation
        ↓
Xforge qualification tests
```

The final step is mandatory.

---

# 36. Architecture Qualification Suite (AQS)

`pnpm verify` remains the repository-wide green gate. The **Architecture Qualification Suite** is the subset that proves architecture, not feature behaviour.

Minimum AQS:

```text
AQS-001 dependency DAG / module privacy
AQS-002 generated-state cleanliness
AQS-003 OpenAPI compatibility + operationId registry
AQS-004 frontend forbidden-import scan
AQS-005 tenant-table discovery + RLS policy coverage
AQS-006 cross-tenant read/write/spoof proof
AQS-007 app-role owner/BYPASSRLS proof
AQS-008 host/session tenant mismatch proof
AQS-009 four-plane metadata invariants
AQS-010 zero-DDL tenant custom-field proof
AQS-011 optimistic-concurrency stale-write proof
AQS-012 immutable payroll/ledger mutation proof
AQS-013 outbox rollback/crash/duplicate proof
AQS-014 command idempotency proof
AQS-015 money/rounding property suite
AQS-016 payroll deterministic-replay suite
AQS-017 AI excessive-agency/adversarial suite
AQS-018 migration expand/backfill/switch/contract proof
AQS-019 sensitive-file authorization/expiry proof
AQS-020 second-domain generality proof
```

### Guard mutation testing

For every architecture guard, CI must have a small fixture or mutation test showing a violating example actually fails.

> A guard that has never been observed to reject a deliberate violation is not yet trusted.

---

# 37. Canonical use-case evidence set

These scenarios are the minimum architecture-level use cases. They are intentionally cross-cutting.

| ID | Scenario | Architecture exercised | Pass condition |
|---|---|---|---|
| **UC-01** | Two tenants share Employee table | RLS / tenancy | A cannot read/write/spoof B |
| **UC-02** | One tenant owns two Malaysian legal entities | org topology / payroll scope | payroll and statutory registration are legal-entity scoped |
| **UC-03** | Tenant adds searchable custom field | metadata / JSONB / projection | zero core DDL; indexed filter works |
| **UC-04** | Rename/hide a required field | four planes | UI changes; contract/data do not |
| **UC-05** | Build UI before handler exists | OpenAPI / MSW | complete screen works against generated mock |
| **UC-06** | Module tries foreign repository import | modular monolith | architecture guard fails |
| **UC-07** | User retries payroll approval | explicit command / idempotency | one transition and one side-effect intent |
| **UC-08** | Process dies after DB commit before job publish | outbox | committed intent is later processed |
| **UC-09** | Executor sends event twice | idempotent consumer | downstream business effect occurs once |
| **UC-10** | Recompute old payroll | snapshots / rule packs | byte/semantic-equivalent calculation result |
| **UC-11** | Correct finalized payroll | immutability | reversal/adjustment path; direct update denied |
| **UC-12** | Two managers edit employee concurrently | concurrency | stale writer receives explicit conflict |
| **UC-13** | Valid tenant-A session on tenant-B domain | domains + tenancy | request rejected |
| **UC-14** | AI prompt asks for another tenant's payroll | AI / policy / RLS | no data returned and attempt audited |
| **UC-15** | AI asks to release bank file | AI risk controls | no generated write capability; explicit command + approval required |
| **UC-16** | Compliance authority is offline | outbox / adapter separation | core business truth remains consistent; retry state visible |
| **UC-17** | Destructive schema evolution | migration discipline | staged migration passes old/new compatibility window |
| **UC-18** | PR modifies schema | Neon/DB isolation | migration and E2E run on isolated branch |
| **UC-19** | New Sales+Inventory module added | generality | platform kernel needs no HR-specific fork |
| **UC-20** | Job vendor replaced | portability | domain/modules unchanged; outbox truth retained |

Passing this set is the evidence required before describing the *implementation* as battle-tested.

---

# 38. Final conclusion

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


## Freeze statement

With the three v2 candidates reconciled and the evidence/qualification model above added, this document is the **canonical architecture for implementation**.

Future architecture discussion should occur only when one of the following exists:

- a failing qualification test;
- measured production evidence;
- a real second-domain contradiction;
- a regulatory/security requirement;
- a provider limitation that crosses an architectural boundary.

Preference, novelty, or framework fashion is not sufficient reason to reopen a FROZEN decision.

The intended repository action is:

```text
.architecture/
  architecture-final.md        ← this document
  evidence-register.md         ← compact source/use-case register
  history/
    v1-*
    v2-1.md
    v2-2.md
    v2-3.md
  adr/
```

After adoption, **stop writing competing canonical drafts**. Changes to FROZEN sections arrive as ADRs with evidence and verification.
