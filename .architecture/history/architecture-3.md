# Proposed 2026 Reference Architecture: **Vibe-First, API-First, Frontend-Led ERP Platform**

For what you described, I would **not** build “another ERPNext” or “another Odoo.” I would take their strongest architectural ideas, remove the historical coupling that makes them progressively harder to customize, and optimize the new platform around a very different constraint:

> **The architecture must be easy for Claude Code to understand, modify, test, and extend correctly.**

That changes the design substantially.

My recommended shape is:

```text
Frontend-led product development
            ↓
Canonical API contract
            ↓
Generated client + generated mocks
            ↓
Modular application/domain layer
            ↓
PostgreSQL
            ↓
Outbox / Jobs / Integrations

       ┌─────────────────────────┐
       │ Metadata / Policy Layer │
       └─────────────────────────┘
             spans all layers

       ┌─────────────────────────┐
       │     AI Copilot Layer    │
       └─────────────────────────┘
          calls normal APIs only
```

The architectural philosophy should be **“simple core, powerful composition”**, rather than trying to make every screen, table, process, and rule generic.

---

# 1. The architecture I recommend

## **Modular Monolith First**

This is the most important decision.

Do **not** start with:

```text
user-service
tenant-service
sales-service
inventory-service
workflow-service
accounting-service
hr-service
payroll-service
notification-service
ai-service
...
```

That architecture looks sophisticated but would be destructive for pure Claude Code development. Every business change becomes distributed tracing, API coordination, deployment dependencies, retries, event versions and infrastructure work.

Instead:

```text
                    ┌──────────────────────────┐
                    │      PLATFORM API        │
                    │                          │
                    │ identity                 │
                    │ tenancy                  │
                    │ metadata                 │
                    │ workflow                 │
                    │ CRM                      │
                    │ sales                    │
                    │ purchasing               │
                    │ inventory                │
                    │ accounting               │
                    │ HR                       │
                    │ payroll                  │
                    │ manufacturing            │
                    └────────────┬─────────────┘
                                 │
                           PostgreSQL
```

But enforce **module boundaries as if they could eventually become services**.

Modules communicate using application interfaces and domain events—not by randomly importing another module's database tables.

That gives you Odoo-like modularity without microservice complexity.

Odoo itself strongly centers its architecture around modules containing business objects, views, configuration data, controllers and other assets. ([Odoo][1])

---

# 2. Recommended technology stack

| Layer             | Recommendation                                | Why                                                                                           |
| ----------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Language          | **TypeScript end-to-end**                     | One language dramatically improves Claude comprehension and refactoring                       |
| Runtime           | **Current Node.js LTS**                       | Stable, huge ecosystem                                                                        |
| Package manager   | **pnpm**                                      | Excellent monorepo ergonomics                                                                 |
| Monorepo          | **Turborepo**                                 | Simple task DAG + caching                                                                     |
| Frontend          | **Next.js App Router + React 19**             | Mature React platform and excellent deployment ecosystem ([Next.js][2])                       |
| UI                | **shadcn/ui + Base UI**                       | Open-code components rather than opaque library abstractions                                  |
| Styling           | **Tailwind CSS v4 + OKLCH design tokens**     | Modern token-first styling                                                                    |
| Server state      | **TanStack Query v5**                         | Excellent API/server-state boundary ([TanStack][3])                                           |
| Tables            | **TanStack Table + virtualization**           | Suitable for ERP-scale grids                                                                  |
| Forms             | **React Hook Form + schema validation**       | Mature; hand-coded and metadata forms can coexist                                             |
| API contract      | **OpenAPI 3.1**                               | Language-neutral public contract                                                              |
| Client generation | **Orval**                                     | Generates TS models, fetch clients, React Query hooks and MSW mocks from OpenAPI ([Orval][4]) |
| Backend           | **Fastify + TypeScript**                      | Lightweight, explicit, high-performance Node API                                              |
| Validation        | **JSON Schema/Ajv + Zod where appropriate**   | API + metadata compatibility                                                                  |
| ORM/query         | **Drizzle + explicit SQL**                    | Thin abstraction; PostgreSQL stays visible                                                    |
| Database          | **PostgreSQL**                                | Core transactional engine                                                                     |
| Managed Postgres  | **Neon**                                      | Particularly attractive for agent/PR database branching ([Neon][5])                           |
| Multi-tenancy     | **tenant_id + PostgreSQL RLS**                | Strong shared-database isolation                                                              |
| Authentication    | **Better Auth**                               | TypeScript-native and extensible                                                              |
| Authorization     | **Own permission/policy layer**               | ERP authorization exceeds simple auth roles                                                   |
| Jobs              | **Trigger.dev**                               | Retries/idempotency without building queue infrastructure ([Trigger.dev][6])                  |
| Files             | **S3-compatible object storage**              | Avoid tying ERP attachments to one cloud                                                      |
| Search            | **Postgres FTS + trigram first**              | Don't introduce Elasticsearch prematurely                                                     |
| Vector search     | **pgvector**                                  | Keeps AI search inside PostgreSQL initially ([PostgreSQL][7])                                 |
| AI                | **Vercel AI SDK Core**                        | Provider-neutral model interface ([AI SDK][8])                                                |
| Observability     | **OpenTelemetry + Sentry + structured logs**  | Production diagnostics                                                                        |
| Unit tests        | **Vitest**                                    | Fast TS testing                                                                               |
| E2E               | **Playwright**                                | UX-centric acceptance testing                                                                 |
| UI development    | **Storybook**                                 | Frontend-first visual development                                                             |
| Hosting           | **Vercel frontend + managed Node API/worker** | Keeps infrastructure relatively light                                                         |
| Tenant domains    | **Vercel for Platforms**                      | Wildcard subdomains + customer domains + automatic SSL are supported ([Examples][9])          |

For a **greenfield** shadcn implementation today, I would use Base UI rather than starting a new Radix architecture. As of July 2026, shadcn made Base UI its default for new projects while continuing Radix support. ([Shadcn UI][10])

This fits vibe coding particularly well because shadcn explicitly follows an **open-code** model: the resulting components belong to your project rather than being hidden behind a black-box component package. ([Shadcn UI][11])

---

# 3. Resolve the apparent conflict: API-first **and** frontend-first

These are completely compatible.

**API-first describes architectural authority.**

**Frontend-first describes development sequence.**

I would enforce this development flow for every feature:

1. **Design the user experience first**: screen, states, actions, validation, empty/error/loading behavior.
2. Define only the API operations that experience actually requires in the module's OpenAPI contract.
3. Run code generation to produce the TypeScript client, TanStack Query hooks and MSW mocks.
4. Build the complete frontend against mocks before infrastructure exists.
5. Implement the backend handlers against the frozen contract.
6. Run contract + integration + Playwright tests before merging.

Orval is unusually valuable here because the same OpenAPI contract can generate both typed React Query clients and MSW mocks. ([Orval][4])

So Claude Code can build:

```text
UX
 ↓
OpenAPI
 ↓
generated mock API
 ↓
finished frontend

WITHOUT waiting for:

database
business implementation
integration
infrastructure
```

That is the architecture I would choose for **pure vibe coding**.

---

# 4. The most important improvement over ERPNext

Frappe's insight is excellent:

> metadata is a first-class citizen.

Its DocType can contain field metadata, model behavior and view information, and DocTypes drive database-backed applications extremely quickly. ([Frappe Documentation][12])

But I would **not duplicate DocType architecture exactly**.

The problem is excessive convergence:

```text
DocType
   ├─ persistence
   ├─ model
   ├─ metadata
   ├─ form
   ├─ API
   └─ permissions
```

It is wonderfully productive early.

Eventually, however, all concerns begin influencing one another.

Instead use **four explicitly separated planes**.

| Plane          | Authority             | Example                             |
| -------------- | --------------------- | ----------------------------------- |
| **Data**       | PostgreSQL schema     | `sales_order`, constraints, indexes |
| **Contract**   | OpenAPI               | `/sales-orders/{id}`                |
| **Experience** | UI metadata           | form/list/filter/kanban layouts     |
| **Policy**     | permissions/workflows | who can approve an order            |

They share stable identifiers but **none generates all the others**.

For example:

```text
field:
  id: sales_order.customer_id
  datatype: reference
```

might be referenced by:

```text
database
API schema
form definition
list definition
permission rule
report builder
AI semantic description
```

But changing the form label must never silently migrate the database.

That distinction is crucial.

---

# 5. The metadata architecture

I recommend:

```text
System definition
        ↓
Country pack
        ↓
Tenant customization
        ↓
User personalization
```

Each level is an overlay.

For example:

```text
Core Sales Order
      ↓
Malaysia localisation
      ↓
Tenant ABC configuration
      ↓
Jack's saved view
```

The merge must be deterministic.

Not arbitrary inheritance.

---

## UI metadata should control

```text
labels
field ordering
visibility
sections
tabs
default values
lookup configuration
saved filters
list columns
sorting
grouping
kanban grouping
dashboard widgets
conditional visibility
read-only state
custom fields
report definitions
```

But metadata **must not be allowed to weaken canonical server validation**.

If the API requires:

```text
customer_id
```

a tenant configuration cannot make the actual business rule optional simply because the form metadata says:

```text
required: false
```

The server contract remains authoritative.

---

# 6. Do not build an EAV database

A common metadata-platform mistake is:

```text
entity
attribute
value
```

for everything.

Don't.

Your important business model should remain real relational PostgreSQL:

```text
sales_order
sales_order_line
customer
supplier
product
warehouse
inventory_transaction
journal_entry
journal_line
employee
employment
payroll_run
```

Tenant custom fields can use something like:

```text
custom_field_definition

custom values:
    JSONB
    or
    custom_field_value side table
```

Then promote frequently queried custom properties into real indexed columns only when necessary.

This preserves:

**SQL clarity + metadata extensibility.**

---

# 7. Module architecture

This is where I would improve considerably on traditional Odoo add-ons.

A module should look roughly like:

```text
modules/
  sales/
    manifest.ts

    api/
      openapi.yaml

    server/
      commands/
      queries/
      policies/
      repository/
      events/

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

    tests/
      contract/
      domain/
      integration/
      e2e/
```

`manifest.ts` declares:

```text
id
version
dependencies
permissions
navigation
entities
events
workflows
country extensions
feature flags
```

For example:

```text
sales
 ├── depends on contacts
 ├── depends on catalog
 └── optionally integrates inventory

inventory
 └── depends on catalog

accounting
 └── consumes sales/inventory events
```

Not:

```text
sales imports accounting table
accounting imports inventory UI
inventory imports sales repository
...
```

Claude should encounter **one obvious path** for every concern.

---

# 8. Repository shape

I would keep the root extremely boring:

```text
/
├─ apps/
│  ├─ web/
│  ├─ api/
│  └─ worker/
│
├─ modules/
│  ├─ contacts/
│  ├─ crm/
│  ├─ catalog/
│  ├─ sales/
│  ├─ purchasing/
│  ├─ inventory/
│  ├─ accounting/
│  ├─ hr/
│  ├─ payroll/
│  ├─ manufacturing/
│  ├─ projects/
│  └─ pos/
│
├─ packages/
│  ├─ ui/
│  ├─ tokens/
│  ├─ api-client/       GENERATED
│  ├─ db/
│  ├─ auth/
│  ├─ tenancy/
│  ├─ policy/
│  ├─ metadata/
│  ├─ workflow/
│  ├─ audit/
│  ├─ files/
│  ├─ events/
│  ├─ ai/
│  └─ testing/
│
├─ contracts/
├─ tooling/
├─ docs/
└─ CLAUDE.md
```

Notice the distinction:

```text
packages = reusable platform primitives
modules  = business capabilities
apps     = executable compositions
```

This is easy for both humans and Claude to reason about.

---

# 9. Dependency direction

I would make this mechanically enforced:

```text
apps
 ↓
modules
 ↓
platform packages
 ↓
shared primitives
```

And:

```text
UI
 ↓
generated API client
 ↓
HTTP

NEVER:

UI → repository
UI → database
UI → server implementation
UI → Drizzle
```

Inside the API:

```text
HTTP handler
    ↓
application command/query
    ↓
domain policy
    ↓
repository
    ↓
PostgreSQL
```

This gives you a very clean DAG.

---

# 10. Multi-tenant architecture

Start with:

```text
ONE application
ONE logical database
SHARED schema
tenant_id everywhere
PostgreSQL RLS
```

PostgreSQL's Row-Level Security can enforce which rows are visible or mutable, with default-deny behavior possible once RLS is enabled. ([PostgreSQL][13])

Typical tables:

```text
tenant
tenant_domain
tenant_membership
tenant_setting
tenant_module
tenant_feature

legal_entity
business_unit
location
department

user
role
permission
permission_grant
```

Every tenant-owned business table:

```text
id
tenant_id
...
```

and indexes become:

```text
UNIQUE (tenant_id, code)

INDEX (tenant_id, status)

INDEX (tenant_id, created_at)
```

rather than globally unique business identifiers.

---

# 11. But don't confuse authentication, tenant and company

These are different concepts:

```text
USER
  │
  ├── membership
  ↓
TENANT
  │
  ├── Legal Entity Malaysia
  ├── Legal Entity Singapore
  ├── Legal Entity Vietnam
  │
  └── business units / branches / warehouses
```

A SaaS tenant is not automatically a legal entity.

And a legal entity is not automatically the authorization boundary.

That distinction becomes extremely important for ERP.

---

# 12. Authorization

Use:

```text
Authentication
    Better Auth

Tenant isolation
    PostgreSQL RLS

Business authorization
    Policy engine
```

Better Auth already has organization/team primitives available, but I would **not make an authentication library's Organization model the canonical ERP tenant model**. Its organization plugin is useful for membership and role-oriented scenarios, but your business topology will eventually be substantially richer. ([Better Auth][14])

Use permission codes such as:

```text
sales.order.read
sales.order.create
sales.order.approve

inventory.transfer.create

hr.employee.read
hr.compensation.read

payroll.run.calculate
payroll.run.approve
```

And scopes:

```text
tenant
legal_entity
business_unit
department
location
own
```

Therefore:

```text
permission:
sales.order.approve

scope:
legal_entity = MY01
```

This becomes RBAC + scoped ABAC without introducing a huge generic policy framework.

---

# 13. Custom tenant URL architecture

Support all three:

```text
app.example.com

acme.example.com

erp.acme.com
```

The mapping belongs in:

```text
tenant_domain
────────────────────────
id
tenant_id
hostname
type
verification_status
is_primary
created_at
verified_at
```

Request flow:

```text
HTTP Host
   ↓
domain resolver
   ↓
tenant_domain
   ↓
tenant context
   ↓
authenticated membership
   ↓
application
```

Never trust the hostname alone for authorization.

The hostname resolves **candidate tenant context**.

The authenticated user must still have access.

Vercel's current multi-tenant platform supports wildcard domains, custom domains, hostname routing and automatic SSL, making this part significantly simpler than running certificate/DNS infrastructure yourself. ([Examples][9])

---

# 14. Southeast Asia should be a first-class architectural concept

Do **not** write this:

```ts
if (country === "MY") ...
else if (country === "SG") ...
else if (country === "VN") ...
```

across the system.

Create:

```text
localisation/
  my/
  sg/
  vn/
  id/
  th/
  ph/
```

Each localisation is a **versioned country pack**.

Conceptually:

```text
CORE
  +
COUNTRY PACK
  +
TENANT CONFIGURATION
```

Country packs can contribute:

```text
tax rules
payroll rules
statutory identifiers
bank formats
invoice formats
e-invoice integrations
public holidays
currencies
address formats
numbering schemes
employment rules
local reports
chart-of-account templates
translations
```

And every regulatory rule should support:

```text
effective_from
effective_to
version
jurisdiction
authority_reference
```

Never overwrite historical rules.

A transaction from July 2025 must remain reproducible in 2028.

---

# 15. Accounting/inventory/payroll need stronger rules than CRUD

This is another place where generic metadata ERPs eventually struggle.

For operational master data:

```text
customer
supplier
employee
product
warehouse
```

normal CRUD works.

But financial domains should use explicit commands:

```text
POST /sales-orders/{id}/confirm

POST /stock-transfers/{id}/post

POST /journal-entries/{id}/post

POST /payroll-runs/{id}/approve
```

Not:

```text
PATCH status = "POSTED"
```

The first expresses a business transition.

The second bypasses business semantics.

---

# 16. Immutable ledgers where the business requires them

For domains like accounting and stock:

```text
Document
   ↓ POST
Immutable ledger entries
```

Don't continuously mutate historical financial state.

Use:

```text
original entry
+
reversal
+
replacement
```

This makes:

```text
audit
reconciliation
AI explanation
compliance
debugging
historical reproduction
```

far safer.

---

# 17. Workflow engine — but keep it restrained

Metadata can define:

```text
DRAFT
 ↓ submit
SUBMITTED
 ↓ review
REVIEWED
 ↓ approve
APPROVED
 ↓ post
POSTED
```

with:

```text
transition
allowed roles
conditions
side effects
notifications
SLA
```

But complex business behavior still lives in application commands.

Workflow metadata determines:

> **when something may happen**

Business code determines:

> **what actually happens**.

That division prevents your workflow engine becoming a programming language.

---

# 18. Customization without Odoo-style inheritance spaghetti

Odoo's view system is extremely flexible; views are stored as records and can be inherited and modified. ([Odoo][15])

The idea is good.

The potentially troublesome part is many layers of inherited modifications.

I would instead use **stable slots + deterministic overlays**:

```text
core sales-order form

slot: header
slot: parties
slot: commercial
slot: logistics
slot: lines
slot: totals
slot: approvals
```

Then a Malaysia pack might say:

```text
insert tax-registration after customer
```

Tenant customization:

```text
hide salesperson
rename customer_reference
add cost_centre
```

No arbitrary DOM selectors.

No XPath.

No unknown inherited XML chain.

Claude can resolve the resulting structure deterministically.

---

# 19. A crucial 80/20 rule

Do **not** attempt to metadata-generate every screen.

Use metadata for:

```text
CRUD forms
lists
saved views
filters
search
simple dashboards
simple reports
master data
configuration
approval states
```

Hand-build high-value UX for:

```text
POS
payroll processing
month-end closing
inventory planning
manufacturing planning
bank reconciliation
sales quotation
executive dashboards
AI workbench
```

This is how you get ERP flexibility **without looking like an ERP from 2010**.

---

# 20. AI architecture

AI should sit **above the application layer**, not below it.

```text
                 AI
                  │
            Tool Registry
                  │
          Application API
             /        \
         queries      commands
            │            │
          policy       policy
            └─────┬──────┘
                  ↓
               database
```

An agent does **not** receive:

```text
DATABASE_URL
```

and start constructing SQL.

Instead it receives tools such as:

```text
find_customer
get_customer_balance
search_sales_orders
explain_payroll_variance
draft_purchase_order
prepare_journal_entry
```

Every AI tool uses the same:

```text
tenant context
authorization
validation
audit
domain rules
```

as humans.

---

# 21. AI writes require stronger guarantees

For example:

```text
AI:
"Create purchase order"

          ↓

draft_purchase_order()

          ↓

DRAFT PO

          ↓

Human approves

          ↓

submit_purchase_order()
```

Not:

```text
AI → database → INSERT purchase_order
```

For financially sensitive operations:

```text
AI proposes
human approves
system executes
```

should remain the default.

---

# 22. Provider-neutral AI

Use a provider abstraction rather than hardwiring the entire ERP into one model provider.

Vercel AI SDK currently exposes a provider-neutral model interface across multiple providers. ([AI SDK][8])

Architecture:

```text
packages/ai/
  providers/
  tools/
  prompts/
  policies/
  retrieval/
  evaluations/
```

Then configuration can choose:

```text
tenant A → Anthropic
tenant B → OpenAI
internal workload → different model
classification → cheaper model
deep analysis → stronger model
```

without rewriting application code.

---

# 23. AI RAG should remain tenant-isolated

Start with PostgreSQL + pgvector rather than another vector database.

pgvector provides vector similarity search as a PostgreSQL extension. ([PostgreSQL][7])

Every embedding row:

```text
id
tenant_id
source_type
source_id
chunk
embedding
classification
permissions
```

And retrieval must always include tenant/security filtering.

Never perform:

```sql
ORDER BY embedding <=> query
LIMIT 20
```

globally and filter the tenant afterwards.

Tenant filtering belongs **inside the query**.

---

# 24. Events without Kafka

Do not introduce Kafka.

Use a **transactional outbox**:

```text
business transaction

BEGIN
  update sales_order
  insert inventory reservation
  insert outbox_event
COMMIT
```

Worker processes:

```text
sales.order.confirmed
```

later.

That allows:

```text
notifications
accounting projection
webhooks
search indexing
AI indexing
analytics
external integrations
```

without distributed transaction problems.

When the platform genuinely reaches a scale requiring Kafka, the outbox becomes the bridge.

---

# 25. Background processing

ERP absolutely needs durable jobs:

```text
payroll calculations
large imports
PDF generation
bulk exports
email
bank files
e-invoice submission
inventory costing
AI document processing
scheduled reports
webhooks
```

Trigger.dev currently supports task-level idempotency keys and retry-oriented execution, which fits this class of workload well without maintaining your own queue cluster. ([Trigger.dev][6])

That satisfies your priority:

> Spend engineering effort on **product and UX**, not Redis clusters.

---

# 26. Don't add Redis initially

Another simplification:

```text
Postgres
Postgres
Postgres
```

First.

Use it for:

```text
business data
metadata
audit
outbox
scheduled job metadata
feature settings
search
vector search
```

Introduce Redis only after profiling shows a real requirement.

Likewise:

```text
No Kafka by default
No Elasticsearch by default
No MongoDB by default
No Cassandra
No bespoke vector database
```

This significantly improves Claude Code reliability.

---

# 27. Database development is particularly important for vibe coding

Neon is attractive here because branch-per-preview/test workflows allow a feature branch or PR to have an isolated database branch. Their documentation explicitly describes PR, preview and test branch workflows. ([Neon][5])

That creates a powerful workflow:

```text
Git branch
     │
     ├── frontend preview
     │
     └── database branch
```

Claude can therefore modify:

```text
migration
API
UI
seed
tests
```

without wrecking everyone's shared development database.

This is unusually well matched to agentic development.

---

# 28. Claude Code needs a **canonical spine**

This may be even more important than the framework selection.

I would define this as the project law:

```text
UX requirement
     ↓
OpenAPI contract
     ↓
generated client
     ↓
application command/query
     ↓
domain rules
     ↓
repository
     ↓
database
```

There should be **one answer** to:

```text
Where does the API live?
Where does authorization live?
Where does DB access live?
Where does metadata live?
Where do tenant rules live?
Where do components live?
Where does a workflow live?
Where does an integration live?
```

Vibe coding deteriorates rapidly when Claude finds four approximately correct locations.

---

# 29. Generated code should be treated as derived state

Example:

```text
contracts/
    ↓
api-client GENERATED
API docs GENERATED
MSW mocks GENERATED
schema fixtures GENERATED
```

Claude should be told:

```text
Never edit generated/*
```

And CI should verify:

```text
pnpm generate
git diff --exit-code
```

This is much stronger than asking an AI to "remember" not to cause drift.

---

# 30. Keep CLAUDE.md small

Do not write a 2,000-line instruction manual.

I would make it closer to:

```text
# Architecture laws

1. UI talks only through generated API clients.
2. Business modules never import another module's repository.
3. Database access exists only in repositories.
4. tenant_id is mandatory for tenant-owned data.
5. API contracts change before implementation.
6. generated files are never edited.
7. historical financial records are immutable.
8. country rules live in localisation packs.
9. AI uses application tools, never database access.
10. pnpm verify is authoritative.

Canonical architecture:
docs/architecture/*
```

That is much easier for Claude to follow consistently.

---

# 31. Architecture enforcement must be deterministic

Do not rely solely on:

> "Claude, please follow architecture."

Write guards checking things such as:

```text
UI importing db
module importing foreign repository
missing tenant_id
generated code modified
API implementation missing operationId
undocumented permission
country code in core module
direct mutation of ledger table
cyclic module dependency
```

Claude gets immediate feedback.

That's ideal agent-oriented engineering.

---

# 32. My recommended platform kernel

Before building ERP functionality, establish this thin kernel:

| Kernel        | Responsibility                      |
| ------------- | ----------------------------------- |
| Identity      | users/session/SSO                   |
| Tenancy       | tenant/domain/membership            |
| Organization  | legal entity/business unit/site     |
| Policy        | permissions/scopes                  |
| Metadata      | entity/form/list/report descriptors |
| Workflow      | state transitions                   |
| Audit         | immutable activity trail            |
| Files         | attachments/object storage          |
| Events        | transactional outbox                |
| Jobs          | durable background processing       |
| Notifications | inbox/email/etc                     |
| Integration   | webhook/API credentials             |
| Localization  | country rule packs                  |
| AI            | models/tools/RAG/evaluations        |

Then everything else is just a module consuming those capabilities.

---

# 33. Business modules remain domain-focused

```text
Platform
   │
   ├── Contacts
   ├── CRM
   ├── Catalog
   ├── Sales
   ├── Purchasing
   ├── Inventory
   ├── Accounting
   ├── Projects
   ├── HR
   ├── Payroll
   ├── Manufacturing
   ├── POS
   └── Service
```

Critically:

> **The platform kernel must not know Sales exists.**

Sales may depend on platform capabilities.

Platform must never depend on Sales.

---

# 34. What I would explicitly reject

| Temptation                                           | Decision              |
| ---------------------------------------------------- | --------------------- |
| Microservices from day one                           | **Reject**            |
| GraphQL as the principal ERP API                     | **Reject**            |
| tRPC as public contract                              | **Reject**            |
| Next.js Server Actions as business API               | **Reject**            |
| Metadata generating the entire DB                    | **Reject**            |
| EAV for normal business entities                     | **Reject**            |
| Per-tenant DB/schema from day one                    | **Reject**            |
| Arbitrary tenant JavaScript executing in backend     | **Reject**            |
| XML/XPath-style deep UI inheritance                  | **Reject**            |
| Redis before demonstrated need                       | **Reject**            |
| Kafka before demonstrated need                       | **Reject**            |
| Elasticsearch before demonstrated need               | **Reject**            |
| Kubernetes initially                                 | **Reject**            |
| Event sourcing everything                            | **Reject**            |
| Generic repository abstraction over everything       | **Reject**            |
| Generic `BaseService<T>` inheritance framework       | **Reject**            |
| AI directly querying/writing production tables       | **Absolutely reject** |
| Hard-coded Malaysian/Singapore/Vietnam logic in core | **Reject**            |

This is how you get something **simpler yet architecturally stronger** than many established ERPs.

---

# 35. The resulting architecture

```text
                        ┌──────────────────────────┐
                        │          WEB             │
                        │ Next + React + shadcn    │
                        │                          │
                        │ Hand-built UX            │
                        │ Metadata renderer        │
                        └────────────┬─────────────┘
                                     │
                              generated SDK
                                     │
                         ┌───────────▼───────────┐
                         │       OPENAPI         │
                         │  canonical contract   │
                         └───────────┬───────────┘
                                     │
                  ┌──────────────────▼──────────────────┐
                  │            MODULAR API             │
                  │                                     │
                  │ CRM Sales Purchasing Inventory     │
                  │ Finance HR Payroll Manufacturing   │
                  └──────────┬────────────┬─────────────┘
                             │            │
                      ┌──────▼─────┐ ┌────▼────────┐
                      │ PostgreSQL │ │ Trigger.dev │
                      │ + RLS      │ │ jobs        │
                      │ + pgvector │ └─────────────┘
                      └──────┬─────┘
                             │
                         outbox
                             │
                    ┌────────▼─────────┐
                    │ integrations     │
                    │ webhooks         │
                    │ statutory APIs   │
                    │ external systems │
                    └──────────────────┘


 ┌─────────────────────────────────────────────────────────────┐
 │                   CROSS-CUTTING PLATFORM                    │
 │                                                             │
 │ Tenant · Policy · Metadata · Workflow · Audit · AI · Files │
 └─────────────────────────────────────────────────────────────┘
```

---

# 36. The final principle

I would describe the platform architecture with five words:

> **Explicit core. Metadata at the edges.**

Not:

> everything is metadata.

Not:

> everything is a microservice.

Not:

> everything is configurable.

Not:

> everything is AI.

Instead:

```text
business truth           → explicit code + relational data
external interface       → explicit API contract
repeatable UI structure  → metadata
tenant variation         → overlays
country variation        → versioned localisation packs
async work               → durable jobs
integration              → events + APIs
AI                       → authorized application tools
```

That combination gets you remarkably close to the productivity advantages that made ERPNext/Frappe compelling—Frappe explicitly describes its metadata-driven, monolithic model as a rapid way to generate frontends and database-driven applications—while avoiding the requirement that model, persistence and user experience remain permanently welded together. ([Frappe Documentation][12])

## My recommended **canonical stack**

```text
TypeScript
Node.js
pnpm
Turborepo

React 19
Next.js App Router
Tailwind CSS v4
shadcn/ui + Base UI
TanStack Query
TanStack Table
React Hook Form
Storybook

OpenAPI 3.1
Orval
MSW

Fastify

PostgreSQL
Drizzle
PostgreSQL RLS
Neon

Better Auth

Trigger.dev

S3-compatible storage

PostgreSQL FTS
pgvector

Vercel AI SDK
OpenTelemetry
Sentry
Vitest
Playwright

Vercel for frontend / tenant domains
Managed Node runtime for API
```

**If I were starting this platform today, this is the stack and architectural direction I would approve.** More importantly, I would freeze the *architectural laws* before adding ERP modules. The biggest competitive advantage will not come from choosing a cleverer framework than Odoo or ERPNext; it will come from having such a clear canonical spine that Claude can build Sales, Inventory, HR, Payroll, Finance, Manufacturing and future modules **without progressively destroying the architecture**.

[1]: https://www.odoo.com/documentation/19.0/developer/tutorials/backend.html?utm_source=chatgpt.com "Building a Module — Odoo 19.0 documentation"
[2]: https://nextjs.org/docs?utm_source=chatgpt.com "Next.js Docs | Next.js"
[3]: https://tanstack.com/query/latest/docs/framework/react?utm_source=chatgpt.com "React | TanStack Query React Docs"
[4]: https://orval.dev/docs/?utm_source=chatgpt.com "Orval - Generate type-safe API clients from OpenAPI"
[5]: https://neon.com/docs/get-started-with-neon/workflow-primer?a=9415b291-804f-4bb4-9807-4ce1c6e15400&utm_source=chatgpt.com "Database branching workflow primer - Neon Docs"
[6]: https://trigger.dev/docs/idempotency?utm_source=chatgpt.com "Idempotency - Trigger.dev"
[7]: https://www.postgresql.org/about/news/pgvector-082-released-3245/?utm_source=chatgpt.com "PostgreSQL: pgvector 0.8.2 Released"
[8]: https://ai-sdk.dev/docs/getting-started/choosing-a-provider?utm_source=chatgpt.com "Getting Started: Choosing a Provider"
[9]: https://examples.vercel.com/guides/nextjs-multi-tenant-application?utm_source=chatgpt.com "Vercel for Platforms"
[10]: https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default?utm_source=chatgpt.com "July 2026 - Base UI as the Default - shadcn/ui"
[11]: https://ui.shadcn.com/docs?utm_source=chatgpt.com "Introduction - shadcn/ui"
[12]: https://docs.frappe.io/framework/user/en/basics?utm_source=chatgpt.com "What is Frappe Framework?"
[13]: https://www.postgresql.org/docs/17/sql-createpolicy.html?utm_source=chatgpt.com "PostgreSQL: Documentation: 17: CREATE POLICY"
[14]: https://better-auth.com/docs/plugins/organization?utm_source=chatgpt.com "Organization | Better Auth"
[15]: https://www.odoo.com/documentation/19.0/developer/reference/user_interface/view_records.html?utm_source=chatgpt.com "View records — Odoo 19.0 documentation"
