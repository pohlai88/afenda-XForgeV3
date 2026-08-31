# Xforge — Canonical Reference Architecture

**Version:** 3.0 · **Status:** FINAL — canonical baseline for adoption
**Supersedes:** `architecture-{1,2,3}`, `v1-{1,2,3}`, `v2-{1,2,3}` (archive to `.architecture/history/`)
**Target path:** `.architecture/architecture-final.md`
**Launch wedge:** Malaysia · HRMS + Payroll · Cloud SaaS
**Long-term scope:** multi-purpose business platform across Southeast Asia

> This document is **normative**. Changes require an ADR (§28). Package versions, provider SKUs and operational thresholds live in manifests and configuration, not in this prose — architecture names capabilities, not version numbers.

---

## 0. Executive decision

Build Xforge as a **strict modular monolith** with an explicit domain core, a contract-first public API, a frontend-led delivery loop, PostgreSQL-enforced tenancy, bounded metadata composition, versioned country packs, and AI operating only through authorised application capabilities.

**Canonical thesis:**

> **Explicit core. Metadata at the edges. Contract in the middle.**

**Governing implementation rule:**

> **One authoritative source per fact. One obvious path per operation. One deterministic gate for correctness.**

**Borrow** from ERPNext/Frappe and Odoo: metadata as a first-class productivity mechanism, modular business capabilities, configurable workflows and views, decades of correct accounting/stock/HR/payroll semantics, and extensibility without customer forks.

**Reject** what makes them hard to evolve: one metadata object owning persistence + API + UX + permissions + workflow simultaneously; routine per-tenant DDL; deep inheritance and XPath view mutation; database-per-tenant as the only model; framework magic hiding business rules; privileged server paths around the public API; weakly typed boundaries; and infrastructure complexity before measured need.

And one constraint traditional ERPs were never designed around:

> Claude Code must find **one obvious place** for every fact, make a small change, get deterministic feedback in seconds, and leave the repository cleaner rather than more magical.

---

## 1. Locked decisions

| Decision | Canonical choice |
|---|---|
| Product model | Cloud SaaS first; portable architecture, not an on-prem product in v1 |
| Development model | Claude Code / agent-driven vertical feature slices |
| Language | TypeScript strict, end-to-end |
| System shape | Strict modular monolith |
| Launch vertical | **HRMS + Payroll** |
| Launch jurisdiction | **Malaysia** |
| Long-term region | MY, SG, VN, ID, TH, PH |
| Public API | REST + OpenAPI 3.1, externally consumable |
| Delivery sequence | Frontend-led, contract-before-handler |
| Database | PostgreSQL; Neon at launch |
| Tenant isolation | Shared schema + `tenant_id` + RLS |
| Enterprise escape hatch | Dedicated database/region behind identical application contracts |
| Tenant URL | Xforge subdomain default; verified custom domain on eligible tiers |
| Metadata | First-class but bounded; never the owner of all planes |
| Custom fields | Registry + JSONB canonical; **derived index projection** for hot paths |
| Core transactional data | Real relational tables, constraints, indexes |
| Authentication | Better Auth behind a facade; identity and session only |
| Business authorisation | Xforge policy layer |
| Async | Transactional outbox + swappable durable executor |
| AI | Provider-neutral application client; no privileged database path |
| AI mutation default | Draft/proposal for consequential actions |
| Localisation | Versioned country packs, separate from compliance adapters |
| Infrastructure | Managed and deliberately boring; additions require measured need |
| Definition of green | `pnpm verify` |

### 1.1 Architecture wide, delivery narrow

Architect for the eventual platform surface; **ship one vertical in one country.** The kernel may be module-agnostic and country-pack-shaped from the start. That does **not** justify building Sales, Accounting, Manufacturing, multi-country payroll or a marketplace before the Malaysia HR/payroll wedge is proven.

> **Generalise from a second real domain, not from imagination.**

---

## 2. Architecture laws

Short enough to mirror into `CLAUDE.md`. Every practical law has a mechanical guard (§21.2).

```
1.  Modular monolith until measured evidence justifies extraction.
2.  Frontend-led is build order; API-first is architectural authority.
3.  Every business operation has a typed route contract before its handler.
4.  Business UI uses only generated contract clients. One transport, one policy path.
    No hidden Server Action business API.
5.  React UI never imports repositories, Drizzle, DB handles, or another module's internals.
6.  Every fact has one authoritative source. No mega definition owns unrelated concerns.
7.  Data, Contract, Experience and Policy are separate planes joined by stable
    semantic identifiers.
8.  Core business truth is explicit TypeScript plus relational PostgreSQL data.
9.  Metadata composes repetitive experience and tenant variation. It does not replace
    high-integrity domain modelling.
10. Every tenant-owned table has tenant_id and database-enforced RLS.
11. Database access is possible only through sanctioned repositories via withTenant().
12. Tenant, legal entity, organisational structure and authentication stay distinct.
13. Modules never import another module's repository or private persistence.
14. Consequential state transitions use explicit commands, never status patches.
15. Final payroll and accounting history is immutable. Correct by reversal and replacement.
16. No JavaScript floating-point number represents monetary truth.
17. Country rules are effective-dated and never spread as if(country) branches through core.
18. Compliance connectivity is separable from transactional ledger truth.
19. AI uses the same commands, policies and tenant isolation as human clients.
20. AI never receives a database connection, and never gains a tool merely because
    an entity exists.
21. Generated state is never hand-edited.
22. Concurrent edits fail explicitly. Never silent last-write-wins.
23. Production migrations follow expand → backfill → switch → contract.
24. Architecture invariants are enforced by guards, not prose.
25. New infrastructure requires a named, measured pain.
26. Generalise a platform abstraction only after a second real use case proves it.
27. `pnpm verify` is the canonical definition of repository green.
```

---

## 3. Doctrine

### 3.1 Vibe-first

Claude Code reliability is a first-class engineering constraint. Prefer common well-documented technology, high static type density, explicit data flow, shallow dependency graphs, plain functions over reflection-heavy frameworks, generated repetition over hand-maintained repetition, small modules with narrow public surfaces, invariants enforced by code, and feature slices with executable done-conditions.

> **Verbose-but-obvious beats terse-but-magical.**

An abstraction whose main advantage is fewer lines while raising inference cost is a net negative here.

### 3.2 DRY means one source of truth *per fact*

Not "one mega entity definition generates the whole system" — that is ERPNext's actual long-term problem, not merely its `ALTER TABLE` problem.

| Fact | Authority |
|---|---|
| Persistent column, index, constraint | PostgreSQL / Drizzle schema |
| API operation and request/response semantics | Typed route contract |
| Published external API | Generated OpenAPI 3.1 document |
| Business invariant | Domain / application code |
| Generic field semantic | Semantic registry |
| Form and list composition | Experience metadata, or explicit React |
| Permission and action vocabulary | Policy registry |
| Role and scoped grant | Policy data |
| Tenant custom field definition | Metadata registry |
| Statutory rate or table | Effective-dated country rule pack |
| Authority protocol mapping | Compliance adapter |
| Generated client, hooks, mocks | OpenAPI-derived generated state |
| Business audit event | Append-only audit store |

Derived artifacts may be generated. Independent concerns remain independently authoritative.

### 3.3 KISS as an infrastructure budget

One language, one primary database, one principal deployment, one API style, one auth facade, one durable-job mechanism, one observability convention, one verification command.

A dependency is added only when it eliminates a **named, measured problem**, and the ADR records the evidence. Not "because enterprise." Not "because scale."

### 3.4 Stability over novelty

Architecture chooses capabilities, not fashion. Versions are pinned by `package.json`, the lockfile, runtime config and CI. Routine upgrades are expected and need no ADR. An upgrade needs an ADR only when it changes an architectural contract, deployment shape, data model, security model or ownership boundary.

---

## 4. System shape — strict modular monolith

```
                         ┌─────────────────────────────┐
                         │          XFORGE WEB          │
                         │ Next.js · React · shadcn/ui  │
                         │ hand-built UX + renderer     │
                         └──────────────┬───────────────┘
                                        │ generated client only
                         ┌──────────────▼───────────────┐
                         │         PUBLIC API           │
                         │ Hono · typed route contracts │
                         │ OpenAPI 3.1 projection       │
                         └──────────────┬───────────────┘
                 ┌──────────────────────▼──────────────────────┐
                 │           APPLICATION / DOMAIN              │
                 │ commands · queries · policies · domain      │
                 │ hr · payroll  (→ future business modules)   │
                 └──────────────┬─────────────────┬────────────┘
                          repositories         outbox
                                │                 │
                      ┌─────────▼─────────┐       ▼
                      │    PostgreSQL     │   durable jobs
                      │ RLS · JSONB · FTS │   integrations
                      │ pgvector · audit  │   authority APIs
                      └───────────────────┘

  CROSS-CUTTING PLATFORM KERNEL
  identity · tenancy · organisation · policy · metadata · workflow · audit
  files · events · jobs · notifications · integration · localisation
  compliance · AI
```

### 4.1 Module interaction

A business module may communicate through another module's **public application interface**, published domain events, or stable platform capabilities. It may **not** import another module's repository, Drizzle tables, private domain implementation, or private UI components.

> **The platform kernel must not know that Payroll, Sales or any future module exists.** Modules depend on the kernel; the kernel never depends on a module.

### 4.2 Module anatomy

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

`manifest.ts` declares architectural metadata only: `id`, `version`, `dependencies`, `optionalIntegrations`, `permissions`, `navigation`, `entities`, `eventsEmitted`, `eventsConsumed`, `workflows`, `countryExtensions`, `featureFlags`.

### 4.3 Repository shape

```
xforge/
├─ .architecture/    architecture-final.md · decisions.md · adr/
├─ apps/             web · admin · api (thin, optional) · docs
├─ modules/          hr · payroll  → future business modules
├─ packages/         api · api-client[GEN] · auth · db · tenancy · organisation
│                    policy · metadata · metadata-ui · workflow · audit · events
│                    jobs · files · notifications · integration · localisation
│                    compliance · ai · ui · tokens · money · testing
├─ contracts/        openapi.generated.json + snapshots
├─ tooling/          generators/ · architecture/ · verify/
├─ docs/
└─ CLAUDE.md
```

`apps` = executable compositions · `modules` = business capabilities · `packages` = platform capabilities · `contracts` = generated published artifacts · `.architecture` = normative architecture and ADRs.

### 4.4 Dependency direction

```
apps → modules → platform packages → shared primitives

Inside a request:
  HTTP handler → application command/query → domain policy → repository → PostgreSQL
```

No reverse dependencies. No business-module cycles. Both mechanically enforced.

### 4.5 One app, multiple mounts

Hono runs unchanged in all hosts, from one source. Extraction is a deployment decision, never a rewrite. **The domain layer must not import Hono.**

```
packages/api/                            ← transport-agnostic application
apps/web/app/api/[[...route]]/route.ts   ← mounts it today
apps/api/server.ts                       ← mounts it when extracted
apps/worker/                             ← imports the same commands
```

---

## 5. The four planes and the semantic registry

The central architectural model, and the resolution of the largest conflict across every draft.

| Plane | Authority for | A change is | Layered by |
|---|---|---|---|
| **Data** | tables, FKs, constraints, indexes, RLS, migration history, immutable ledgers | a reviewed migration | platform |
| **Contract** | operations, schemas, errors, pagination, idempotency, compatibility, versioning | a versioned contract change | platform |
| **Experience** | form/list composition, display, labels, ordering, visibility, saved views, dashboards, theme, preferences | an instant config edit | platform → country → tenant → user |
| **Policy** | actions, roles, scoped grants, workflow permission, row/field access, approvals, AI eligibility | an audited config edit | platform → tenant |

### 5.1 The semantic registry — the join, not the owner

Holds only what is genuinely shared across planes:

```
entity_id · field_id · semantic_type · reference_target · label_key
searchability · sensitivity_class · ai_description · customisation_capability
```

It may generate repetitive adapters and metadata. It must **never silently mutate all four planes**. Four invariants, each mechanically enforced:

- Changing `label_key` never renames a database column.
- Hiding a field never weakens API validation.
- Declaring a field AI-readable never grants permission.
- Adding a custom field never changes core table DDL automatically.

**Generation is one-directional and gated.** An entity definition *proposes* a migration; a human reviews and applies it.

> **Law:** the Experience plane may never weaken the Contract plane. If the contract requires `customer_id`, tenant metadata saying `required: false` changes the form only. The server contract is authoritative.

Without an explicit named join point, the planes silently re-fuse — someone adds a field and it grows a column, a route, a widget and a permission because nothing said it must not. The registry exists precisely to be that boundary.

---

## 6. API-first authority, frontend-led sequence

**API-first defines architectural authority. Frontend-led defines development order.** They were never in tension.

```
UX intent
   ↓  screens, states, actions, validation, empty/error/loading/permission-denied
typed route contract  (Zod)
   ↓
OpenAPI 3.1 generated
   ↓  pnpm generate
typed client + TanStack Query hooks + MSW mocks
   ↓
COMPLETE FRONTEND AGAINST MOCKS      ← no database, no backend, no infrastructure
   ↓
application command / query
   ↓
domain rule → repository → PostgreSQL
   ↓
contract + integration + E2E verification
```

The frontend never waits for infrastructure, and never invents an unofficial data path. This is the highest-leverage workflow in the architecture for agent-driven development.

### 6.1 Contract authority

The **authored typed route contract** is the code authority. The generated **OpenAPI document** is the published, language-neutral contract and compatibility surface.

### 6.2 One business transport

Browser business operations use the generated HTTP client. React Server Components handle application shell, session bootstrap, route metadata, and non-business composition — **not** business reads.

**Do not create a second in-process business query facade in v1.**

If a measured production bottleneck later proves same-host HTTP is material, an in-process contract-bound read transport may be introduced — but only with an ADR, a named benchmark and threshold, binding to a live `operationId`, read-only enforcement, and mechanical parity tests. Absent all five, it is a guard failure.

> **One business operation → one contract → one transport → one policy path.**

**Forbidden:** `React UI → Drizzle` · `React UI → repository` · `React UI → foreign module internals` · `Server Action → hidden business mutation`.

### 6.3 API conventions — establish once, in Phase 0

`/v1/...` public version prefix · stable `operationId` · consistent pagination · consistent filtering and sorting vocabulary · standard error envelope, RFC 9457 Problem Details–compatible · `request_id` correlation · explicit idempotency semantics for retryable commands · consistent date-time and decimal serialisation · no silent coercion of invalid business input.

### 6.4 Boundary hardening

Schema declaration alone does not guarantee HTTP semantics. Contract and integration tests must explicitly cover: accepted `Content-Type` · malformed body · missing required body · maximum body size · unknown-field policy · consistent validation error shape.

### 6.5 Commands, not status patches

```
POST /payroll-runs/{id}/calculate       not   PATCH { status: 'calculated' }
POST /payroll-runs/{id}/approve
POST /leave-requests/{id}/approve
POST /journal-entries/{id}/post
POST /journal-entries/{id}/reverse
```

The command expresses a business transition and gives invariants exactly one place to live. A status patch bypasses business semantics entirely.

---

## 7. Metadata and customisation

### 7.1 Overlay chain

```
System definition → Country pack → Tenant configuration → User personalisation
```

Resolution must be deterministic, typed, version-aware, conflict-detecting, and **inspectable through an effective-configuration view** showing which layer contributed each value. Without that view, debugging a tenant's form becomes archaeology.

### 7.2 Stable slots, never inheritance

```
employee form
  slots: header · identity · contact · employment · compensation
         statutory · documents · activity

MY country pack:  insert epf_socso_details into `statutory`
Tenant ABC:       hide cost_centre · rename employee_code → staff_id
```

Overlays address slots **by stable name**. Forbidden: DOM selector patches, XPath, runtime monkey-patching, tenant-provided executable server JavaScript. Claude resolves the final structure statically; Odoo cannot.

### 7.3 Hybrid persistence — the corrected model

**Core product fields:** real typed relational columns.

**Tenant custom fields:** canonical source of truth is

```
custom_field_definition   +   entity.custom JSONB
```

Normal customisation requires **zero DDL**.

**Hot custom fields — index projection, not column promotion.**

> Every earlier draft proposed promoting a hot custom field to a `GENERATED ALWAYS AS (custom->>'x') STORED` column. **That is wrong, and it is the most important correction in this document.** A shared-schema table serves every tenant. Adding a column because *one* tenant filters on `cost_centre` adds it for all of them. At a few thousand tenants each promoting two or three fields, the employee table approaches PostgreSQL's hard column ceiling and passes its practical one long before. It converts "zero per-tenant DDL" — the single largest claimed improvement over ERPNext — back into per-tenant DDL wearing a disguise.

Instead, project selected values into a controlled derived structure:

```
custom_field_index
  tenant_id · entity_type · record_id · field_id
  value_kind · value_text · value_numeric · value_date
```

The JSONB value remains canonical; the projection is derived state, rebuildable from it. This preserves one core schema, no per-tenant DDL, predictable index cardinality, and genuine support for filtering and sorting at scale.

A custom field becomes a real first-class column **only when it becomes a product-level field for all tenants**, justified by an ADR and a normal migration.

**Tenant custom entities:** a generic JSONB-backed record facility may be added later for low-risk customer-created objects. **Never permitted for** payroll results, statutory records, journal or ledger entries, stock movements, payments and settlements, or any other high-integrity transactional core. Those remain first-class relational models — no exceptions, no tenant escalation path.

### 7.4 The rules that stop this becoming Odoo

> **If exactly one entity needs a metadata capability, hardcode it.** Do not extend the metadata layer for a single caller.

> **Do not metadata-generate every screen.** Metadata handles master-data CRUD, list/detail pages, filters, saved views, simple approval flows, simple reports and configuration. **Hand-build** payroll processing, bank reconciliation, month-end close, inventory and manufacturing planning, POS, complex quotations, executive workspaces and the AI workbench.

Escape hatches are first-class: any entity may override its generated form with a hand-written component, and any route may be hand-written. **The generator is a productivity default, not a prison.**

---

## 8. Multi-tenancy

### 8.1 Distinct concepts, never collapsed

```
USER / PRINCIPAL
   └── tenant_membership
            ▼
          TENANT                          ← SaaS / customer boundary
            ├── LEGAL ENTITY              ← statutory entity
            │     ├── statutory registrations (EPF, SOCSO, LHDN E-number)
            │     └── payroll / accounting scope
            ├── BUSINESS UNIT
            ├── LOCATION / BRANCH
            └── DEPARTMENT
```

A tenant is not a legal entity. A legal entity is not the authorisation boundary. **An authentication provider's "organization" is not canonical ERP topology.**

For this product that is not abstract. A Malaysian group with three `Sdn Bhd` entities is **one tenant with three legal entities**, each with its own EPF employer number, SOCSO employer code and LHDN E-number, each filing its own Borang EA. **Payroll runs scope to `legal_entity`, never to `tenant`.** Collapsing these makes correct Malaysian payroll impossible without a rewrite — which is why it is modelled in Phase 1, before any employee row exists.

### 8.2 RLS is structural, not conventional

Every tenant-owned table has `tenant_id NOT NULL`, enables and forces RLS, carries tenant-leading indexes, and is queried by a non-owner application role without `BYPASSRLS`.

```sql
ALTER TABLE employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employee
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

**Four details decide whether this works or is theatre:**

1. **Never connect as the table owner.** RLS silently skips owners and superusers. Use a dedicated non-owner `app_user` role without `BYPASSRLS`; `FORCE ROW LEVEL SECURITY` is the second line.
2. **Transaction-scoped context only.** `SET LOCAL`, never session-wide `SET`. Under a connection pool a session-scoped variable leaks to whichever tenant borrows that connection next.
3. **Do not depend on connection-session state that can survive a pool checkout.** Where a driver cannot hold session state across statements (some HTTP-mode Postgres drivers), use a pooled connection mode that can.
4. **One chokepoint.** `withTenant(tenantId, fn)` is the only application path to a tenant-scoped handle. No package opens a connection around it.

Indexes are tenant-leading: `UNIQUE (tenant_id, code)`, `INDEX (tenant_id, status)`, `INDEX (tenant_id, created_at)`. Business identifiers are unique **per tenant**, never globally.

### 8.3 Isolation tiers

```
pooled shared schema + RLS        ← default, and the only tier built in v1
dedicated_database                ← enterprise / residency escape hatch
```

**Avoid a schema-per-tenant middle tier** unless a concrete customer proves it valuable: it adds migration complexity without the isolation clarity of a dedicated database.

The connection resolver owns the isolation decision. **Business modules never branch on it.**

### 8.4 Tenant URL

```
tenant_domain
  id · tenant_id · hostname · domain_type · status
  verification_method · verified_at · is_primary
```

```
app.xforge.com     platform
acme.xforge.app    subdomain — wildcard DNS + TLS, instant on signup
hr.acme.com.my     custom domain — eligible tier, DNS-verified, automatic TLS
```

```
Host → domain resolver → candidate tenant → authenticated principal
     → membership verification → application tenant context
```

> **The hostname selects a *candidate* tenant. It never grants authority.** The API re-derives the tenant from the session and asserts it matches. A valid session for tenant A presented at tenant B's hostname is rejected. A network-provided `x-tenant-id` is a routing hint, never an authorisation claim.

Domain provider integration sits behind an internal adapter, so the provider choice stays operational rather than architectural.

---

## 9. Authentication and authorisation

Three layers, never collapsed:

```
Authentication  → who is the principal?          Better Auth, behind packages/auth
Tenant boundary → what can this connection see?  PostgreSQL RLS  (fails safe)
Policy          → what business action is this   packages/policy
                  principal permitted?
```

**Better Auth owns** identity, sign-in and session lifecycle, MFA/passkeys/SSO as adopted, principal identity.

**Xforge owns** tenants, membership, business roles, permissions, scopes, organisational access, business audit. This avoids making an authentication library into a business-domain database, and avoids splitting authorization across two authoritative systems.

```
permission = payroll.run.approve
scope_type = legal_entity
scope_id   = MY01
```

Vocabulary is `module.resource.action`. Scopes: `tenant · legal_entity · business_unit · location · department · team · own`.

RBAC plus scoped ABAC without installing a relationship-authorization platform before it is needed. Tenants define their own roles as rows in Xforge tables. A permission code used but not registered in a module manifest is a guard failure.

> **UI permission state is presentation convenience only, never the security authority.**

---

## 10. Data discipline

### 10.1 Migration policy

Production migrations follow **expand → migrate/backfill → switch → contract**.

- No destructive schema change in the same deployment that first stops using the old shape.
- Migrations are forward-reviewed SQL.
- Long-running backfills are resumable jobs.
- Every migration is tested against an isolated branch.
- Releases remain compatible with the immediately preceding schema during rollout where practical.
- Tenant customisation does not generate ordinary DDL.

### 10.2 Concurrency

Mutable business documents that can be edited concurrently use **optimistic concurrency** — a version token, ETag, or guarded `updated_at` on update commands. **The API rejects stale writes explicitly.** Silent last-write-wins is forbidden.

### 10.3 Identifiers

Technical primary keys are opaque. Business document numbers are separate attributes, scoped by tenant and legal entity. **Human business numbers are never the database primary key.**

---

## 11. Money and numerical integrity

### 11.1 Representation

| Kind | Representation |
|---|---|
| Persisted monetary and accounting values | PostgreSQL `numeric(p,s)`, explicit scale per semantic type |
| TypeScript arithmetic | Explicit decimal library / domain type |
| Payroll statutory calculation | Integer minor units (sen) |
| Non-monetary UI display | `number` permitted only where precision is not business truth |

**No IEEE-754 floating point represents monetary truth, anywhere.**

**Minor-unit scale is data, not an assumption.** VND has 0 decimals, most SEA currencies have 2, some instruments need more. Hardcoding `×100` is a defect waiting for the Vietnam country pack.

### 11.2 Canonical Money value

```
Money { amount, currency }
```

Multi-currency transactions additionally persist:

```
transaction_amount · transaction_currency
base_amount · base_currency
exchange_rate · exchange_rate_source · exchange_rate_timestamp
rounding_policy
```

> **Never recompute historical base amounts from today's exchange rate.** The rate that applied is a stored fact, not a derivable one.

### 11.3 Rounding

Rounding policy is **named, versioned and tested**. The `price × quantity → amount` step is one explicit function — that step is where naive implementations lose cents at scale. Never sprinkle `.toFixed()` or ad hoc rounding across modules.

---

## 12. Payroll — the launch high-integrity domain

Payroll is not metadata CRUD.

### 12.1 Pure calculation engine

```ts
calculatePayroll(
  employeeSnapshot,
  payrollInputSnapshot,
  rulePack,
  period,
): PayrollCalculation
```

Properties: deterministic · no network I/O · no database I/O · **no clock reads inside calculation** · explicit input snapshot · explicit versioned rule pack · integer sen where statutory rules define rounding in sen.

### 12.2 Immutable lifecycle

```
DRAFT → calculate → CALCULATED → review → REVIEWED
      → approve → APPROVED → release → RELEASED / CLOSED
```

Each transition is a command that verifies current state, permission, **legal-entity scope**, concurrency version, required findings, snapshot hashes, rule-pack version, and idempotency.

Final run results are **immutable**. Corrections create reversal, adjustment or replacement artifacts.

### 12.3 Statutory rule packs

Every rule and table carries:

```
jurisdiction · effective_from · effective_to · version
authority_reference · source_hash / evidence reference
```

**Historical rules are never overwritten.** A historical run must be reproducible from `input snapshot + rule-pack version + calculation-engine version`.

**Statutory rates are versioned data, never code.** EPF, SOCSO and EIS are **wage-band lookup tables**, not clean percentages. Encoding them as formulas is a known, expensive mistake. An annual rate change is a data row, not a deploy.

### 12.4 Malaysia launch scope

EPF/KWSP · SOCSO/PERKESO · EIS/SIP · PCB/MTD with applicable instructions · HRD Corp levy where applicable · employer registrations on `legal_entity` · statutory and year-end outputs in approved scope · bank disbursement artifacts · Employment Act 1955 leave entitlements as amended.

> **Implementation flag, carried through every version of this document:** every rate, wage ceiling and tax table must be sourced from current official LHDN / KWSP / PERKESO publications at build time and encoded with its effective date. **Take no figure from memory, from a model, or from this document.** Architecture does not hard-code current rates.

---

## 13. Accounting and inventory — invariants now, modules later

Not built in v1, but the invariants are specified now so the ledger cannot be retrofitted badly.

Commands, not patches: `POST /sales-orders/{id}/confirm`, `/stock-transfers/{id}/post`, `/journal-entries/{id}/post`, `/journal-entries/{id}/reverse`.

Posted truth is corrected through **original + reversal + corrected replacement**, never arbitrary edits.

**Property-based invariants, written as specifications before any posting code is accepted:** debit = credit · reversal neutralises the original · posting is idempotent · subledger reconciles to GL · stock quantity and value conservation holds under the defined algorithm · allocation rounding conserves totals · FX and revaluation policy is deterministic.

These domains are not candidates for metadata-generated business logic, and not candidates for unsupervised agent authorship.

---

## 14. Workflow

> **Workflow metadata decides when a transition is allowed. Domain commands decide what the transition does.**

Workflow may define states, transitions, eligible permissions, approval levels, conditions over exposed safe facts, and notification/SLA metadata. Complex side effects remain explicit application code.

That division is the only thing preventing a workflow engine from slowly becoming a badly-designed programming language.

---

## 15. Events, outbox and durable jobs

### 15.1 Transactional outbox

```sql
BEGIN;
  UPDATE payroll_run SET status = 'approved' WHERE ...;
  INSERT INTO outbox_event (id, topic, payload, tenant_id) VALUES (...);
COMMIT;
```

**The outbox is the durable record of intent.** No dual-write — never "commit the database, then hope the queue publish succeeds."

### 15.2 Delivery semantics

Assume **at-least-once delivery**, not magical exactly-once. Consumers must be idempotent. Use stable event IDs, idempotency keys, a processed-event/inbox record where appropriate, retry with backoff, and a dead-letter state that is visible to an operator.

### 15.3 Job runner

`packages/jobs` defines the internal execution interface. Trigger.dev is the initial managed executor. **Business modules never import a job-provider SDK directly** — enforced by a guard. Executor replacement is an operational migration, not a domain rewrite, which is why this choice is reversible and does not deserve a week of debate.

### 15.4 What goes async

Payroll artifact generation · bulk imports and exports · PDF generation · email · bank-file generation · e-invoice submission and retry · webhooks · AI document processing · search and vector indexing · scheduled reports.

**Money-moving external operations require explicit idempotency and reconciliation.** Payroll must never double-pay.

---

## 16. Files, search and retrieval

### 16.1 Files

Object storage is **private by default** for sensitive artifacts. Metadata persists separately:

```
file_id · tenant_id · owner_entity_type · owner_entity_id · classification
content_type · size · checksum · storage_key · created_by · created_at
```

Sensitive files are served through short-lived signed access or authorised streaming. **Never put a permanent public URL to a payslip or employee document into a business record.**

### 16.2 Search

Start with PostgreSQL FTS, `pg_trgm`, language normalisation (`unaccent` and a normalised column where a language needs it), and explicit search projections for complex entities. Introduce a dedicated search service only against a measured latency or relevance requirement.

### 16.3 Vectors

pgvector in the same database. **Tenant and security filtering belongs inside the retrieval query.** Never retrieve globally and filter tenants afterwards — that is a data leak with extra steps.

---

## 17. AI-native architecture

AI sits **above** the application layer, never beneath it.

```
AI UI / agent → AI tool registry → application command/query
              → policy → repository → RLS-protected PostgreSQL
```

### 17.1 Provider neutrality

`packages/ai` owns `providers/ · tools/ · prompts/ · policies/ · retrieval/ · evaluations/`. **No business module depends directly on a model-provider SDK.** Per-tenant and per-workload model routing — a cheap model for classification, a strong one for analysis — is configuration, not code.

### 17.2 Tool exposure is explicit

An entity being metadata-readable does **not** automatically create write tools.

```
GENERATED from metadata    read · list · search · draft_create
AUTHORED explicitly        approve_payroll_run · release_bank_file
                           post_journal_entry · submit_einvoice
                           post_stock_transfer · terminate_employment
```

Every tool registration specifies: `tool_id · operation_id / application command · risk_class · required_permission · approval_mode · input schema · output schema · audit requirements`.

> **An entity existing is not consent for an agent to mutate it.** Auto-exposing `approve_payroll_run` because `payroll_run` is a declared entity is precisely the class of failure this architecture exists to prevent.

### 17.3 Consequential actions

```
AI proposes → human or policy approval → normal command executes
```

High-risk financial, payroll and inventory actions must **never** gain autonomous execution because a tenant toggled a generic "AI enabled" flag. Autonomy, if later supported, is configured **per action type and risk class**.

### 17.4 Guardrails

1. AI never receives raw database credentials and never authors SQL.
2. AI operates under the caller's or agent's identity and tenant context, through the same API and policy layer as a human. No back door.
3. Retrieval filters tenant, row permission, sensitivity policy and document classification **inside the query**.
4. Document extraction has confidence thresholds; below threshold routes to a human review queue. Never guess a number into a payslip.
5. Agent identity is distinct from user identity — separately scoped, independently revocable.
6. Every AI action is audited: acting principal, agent identity, tenant, model and provider, tool, request correlation, approval, resulting business command, model configuration version, prompt template version or hash. **Never log secrets or raw sensitive prompts indiscriminately.**
7. The AI app-builder ships last, once metadata and policy semantics are proven by real modules.

---

## 18. Localisation and compliance — separate concerns

### 18.1 Country packs are data

```
packages/localisation/{core,my,sg,vn,id,th,ph}/
```

A versioned pack contributes statutory identifiers, tax and payroll rule packs, address conventions, currencies and rounding defaults, date and display conventions, holiday rules, bank formats, numbering conventions, employment rules, chart-of-account templates, report definitions and translations.

Every rule is versioned and effective-dated. Core code contains **zero** `if (country === 'MY')` — enforced by a guard.

### 18.2 Compliance adapters are connectivity

```
packages/compliance/{core,my-myinvois,sg-invoicenow,vn-einvoice,id-coretax,th-etax,ph-eis}/
```

An adapter owns protocol and API mapping, credential handling, submission queue, retry and reconciliation, authority status model, and archive/receipt artifacts. **It does not own the ledger.**

```
invoice / posting truth → outbox → compliance adapter → authority
                                 → clearance / rejection / amendment state
```

> External submission failure is a **normal operational state to reconcile**, not a reason to corrupt or ambiguously roll back financial truth. The ledger must never depend on a clearance call succeeding synchronously.

This separation is why a MyInvois outage looks like a MyInvois outage rather than a payroll rules problem, and why the two have different on-call implications, different test strategies and different release cadences.

Country-specific laws, thresholds and deadlines are verified from official authorities in each module specification. **This architecture deliberately does not freeze regulatory figures or dates.**

---

## 19. Audit, observability and sensitive data

### 19.1 Business audit ≠ application logs

Maintain an **append-only business audit trail** for consequential changes: `tenant · principal/agent · action · entity · entity_id · before/after change set · request_id · timestamp · origin · reason where required`.

### 19.2 Technical observability

Trace and correlation IDs · structured logs · OpenTelemetry traces and metrics · Sentry errors · job and outbox observability · slow query monitoring · security-sensitive event monitoring.

### 19.3 Sensitive data discipline

This section exists because the launch vertical handles national identity numbers and salaries.

- Never log passwords, tokens or secrets.
- **Redact sensitive HR and payroll fields from ordinary logs.**
- Classify fields via `sensitivity_class` in the semantic registry.
- **Authorise bulk export separately from screen reads**, and make privileged reads and exports auditable.
- Provider encryption at rest, TLS in transit, secrets in managed secret storage, rotated integration credentials.
- Application-level field encryption only for specific high-risk data where the threat model or regulation justifies the operational cost.

---

## 20. Frontend and UX

The UI is a competitive product surface, not a generated admin panel. Roughly 60% of first-year effort.

### 20.1 UX priorities

Command/search palette as a first-class navigation surface — ERP menu trees are where usability dies · dense keyboard-efficient grids with frozen columns, inline edit, saved views, bulk operations and undo where safe · optimistic UI **only where rollback semantics are sound** · intentional mobile layouts, not desktop squeezed smaller · designed empty, error, permission-denied, partial-data and retry states **before** API implementation · accessible focus, keyboard and screen-reader behaviour · semantic tokens established before application screens proliferate.

### 20.2 PWA and offline — targeted, not blanket

**Do not make all of ERP offline-first.** Introduce PWA and offline-tolerant behaviour only for workflows with a real field requirement: warehouse scanning, field attendance, delivery confirmation, field sales. Offline mutation uses an explicit outbox and a defined conflict strategy — never "cache everything."

### 20.3 Performance

Budgets are **route and use-case specific, measured in CI**. Do not freeze one global bundle number in architecture. Track core route JS, LCP/INP/CLS, grid interaction latency, API latency, and behaviour on throttled mobile connections. Regressions require evidence and an owner.

---

## 21. Agent-driven development operating model

### 21.1 Canonical spine and generated state

```
UX → typed route contract → generated client + mocks
   → application command/query → domain invariant → repository → PostgreSQL
```

Generated: OpenAPI document · API client · Query hooks · MSW handlers · contract fixtures. Generated directories are obvious, never hand-edited, and CI asserts a clean diff:

```bash
pnpm generate && git diff --exit-code
```

Far stronger than asking an agent to remember not to cause drift.

### 21.2 Architecture guards

Laws that depend on an agent remembering them are decoration. CI fails on:

```
UI importing db / repository / Drizzle
module importing a foreign module's repository, schema or private UI
business-module dependency cycle
platform package importing a business module
tenant-owned table missing tenant_id
tenant-owned table missing required RLS policy
application role that owns tenant tables or holds BYPASSRLS
database access outside a repository / withTenant()
country branching inside shared core
generated code modified by hand
route missing operationId
permission code used but not registered in a manifest
Server Action containing a business mutation
direct update of an immutable posted or final record
unsafe JS number arithmetic in money code paths
AI tool mapped directly to a repository or database
metadata auto-generating a mutation tool
job-provider SDK imported by a business module
destructive migration violating rollout policy
custom-field promotion to a shared column without an ADR
```

The goal is not maximum linting. The goal is that architectural mistakes fail **immediately and deterministically**.

### 21.3 Feature slicing

Good: *"Employee emergency contact — UX → contract → mock → UI → command/query → repository → tests."*
Bad: *"Build HRMS."*

Every task carries a user outcome, architecture touchpoints, explicit non-goals, acceptance tests, and the canonical verification command.

**Hand-specify what cannot be vibe-coded.** Payroll statutory calculation and ledger posting get a written spec, then property tests, *then* implementation against those tests. Everything else may be agent-authored against the guards.

---

## 22. Verification

### 22.1 The canonical gate

```
pnpm verify
  generate cleanliness → architecture guards → typecheck → format/lint
  → unit → property → contract → RLS/security → integration
  → migration compatibility → build → selected Playwright E2E
```

Execution may use caching and parallelism. **The meaning of green remains singular.**

### 22.2 Tenant isolation — blocking foundation gate

Seed two or more tenants · use the real non-owner app role · set transaction-local context · **enumerate tenant-owned tables dynamically** · prove cross-tenant read denial · prove cross-tenant update and delete denial · prove spoofed-insert denial · prove host/session mismatch denial · prove no tenant table escapes policy coverage.

**This is a gate, not a checklist. It does not pass on manual inspection.**

### 22.3 Payroll — blocking gate

Per rule-pack version: official-source golden fixtures · wage-band boundaries · joiner and leaver cases · unpaid leave · variable inputs · age and category thresholds · rounding boundaries · gross/deduction/net reconciliation exact in integer sen · **deterministic historical replay** · run immutability and reversal · idempotent commands.

### 22.4 Contract

OpenAPI 3.1 validity · stable operation IDs · generated client and mocks clean · breaking-change diff surfaced and blocked unless explicitly versioned · content-type and validation semantics · standard error envelope · declared idempotency behaviour.

### 22.5 Flagship E2E

```
sign in → tenant context → legal entity → employee → payroll inputs
→ calculate → review → approve → generate payslip → authorised download
```

Against an isolated database branch.

---

## 23. Use-case evidence

The architecture is only as good as the scenarios it survives. Each case below traces a real workload end-to-end, names the invariants that engage, and states what breaks without them. **Three of these caught real defects in earlier drafts** — those are marked.

---

**UC-1 — Malaysian group runs monthly payroll across three `Sdn Bhd` entities**

*Scenario.* Tenant "Prisma Group" has three legal entities: MY01 (180 staff), MY02 (40), MY03 (12). Each holds its own EPF employer number, SOCSO employer code and LHDN E-number. December payroll runs separately per entity. The group HR manager may approve for MY01 and MY02 only.

*Path.* `POST /v1/payroll-runs` scoped to `legal_entity=MY01` → policy checks `payroll.run.calculate` at `scope_type=legal_entity, scope_id=MY01` → `withTenant()` opens a transaction with `SET LOCAL app.tenant_id` → immutable input snapshot taken → `calculatePayroll(snapshot, inputs, rulePack@2026.01, period)` runs pure, in integer sen → result persisted immutably → `POST /payroll-runs/{id}/approve` verifies state, permission, legal-entity scope, concurrency version, snapshot hash and rule-pack version → outbox event `payroll.run.approved` commits in the same transaction → durable job generates payslips and the bank giro file with an idempotency key.

*Invariants.* §8.1 tenant/legal-entity split · §9 scoped permissions · §12.2 command lifecycle · §12.1 pure engine · §15.1 outbox atomicity · §15.4 idempotency.

*Verdict: holds.* **Without §8.1** the approval scope cannot be expressed — the manager either approves all three entities or none — and the three sets of statutory registrations have nowhere to live. This is why tenant ≠ legal entity is a launch blocker rather than a refinement.

---

**UC-2 — Tenant filters 8,000 employees by a custom field  ⚠ caught a defect**

*Scenario.* Tenant ABC adds a custom field `cost_centre`, then sorts and filters the employee list by it. Two thousand other tenants have their own custom fields on the same table.

*Path.* `custom_field_definition` row created; values written to `employee.custom` JSONB — **zero DDL**. When the field proves hot, a projection job writes into `custom_field_index (tenant_id, entity_type, record_id, field_id, value_kind, value_text, …)`. The list query joins the projection with a tenant-leading index. JSONB stays canonical; the projection is rebuildable derived state.

*Verdict: holds — but only after correction.* **Every earlier draft, v1-1 through v2-2, proposed promoting the field to a `GENERATED ALWAYS AS (custom->>'cost_centre') STORED` column.** On a shared-schema table that column is added for *all* tenants. Two thousand tenants × two or three promoted fields drives the employee table toward PostgreSQL's hard column ceiling and past its practical one long before that. It silently converts "zero per-tenant DDL" — the largest claimed improvement over ERPNext — back into per-tenant DDL in disguise. §7.3 is the corrected model. Promotion to a real column is now reserved for fields that become **product-level for every tenant**, via ADR and normal migration.

---

**UC-3 — Employee asks the assistant for their leave balance, then books three days**

*Scenario.* A warehouse supervisor messages the assistant: *"How much annual leave do I have left? Book Mon–Wed next week."*

*Path.* `get_leave_balance` — a **generated** read tool — executes under the caller's principal, tenant context and `scope: own`; RLS makes another employee's balance unreachable regardless of tool behaviour. Booking uses `apply_leave`, an **authored** tool bound to the leave application command, which runs the same validation, entitlement and approval routing as the web form. The request enters the manager's approval queue. Both calls are audited with principal, agent identity, model, tool, correlation ID and outcome.

*Invariants.* §17.2 bounded tool generation · §17.4 no privileged path · §9 scoped policy · §8.2 RLS · §19.1 audit.

*Verdict: holds.* **Without §17.2**, `payroll_run` being a declared entity would have generated an `approve` tool alongside the read tools — an agent able to approve payroll because someone declared a schema. That is the specific failure this architecture exists to prevent.

---

**UC-4 — Two HR admins edit the same employee record  ⚠ caught a defect**

*Scenario.* Admin A opens Employee #4102 to update the bank account. Admin B opens the same record to change the department. B saves at 10:04:11; A saves at 10:04:19.

*Path.* Each load returns a version token. A's update carries the stale token; the command compares and **rejects with an explicit conflict**, returning the current state so A can re-apply against B's change.

*Verdict: holds — after correction.* **v2-1 and v2-2 had no concurrency model at all.** Under last-write-wins, A's save silently reverts B's department change with no error and no audit signal that anything was lost. In an HR system where the overwritten field might be a bank account or a salary, silent loss is a serious defect. §10.2 closes it; §2 law 22 makes it non-negotiable.

---

**UC-5 — EPF contribution table changes effective 1 January; December must still reproduce**

*Scenario.* A new statutory table takes effect 1 Jan 2027. In March 2027 an auditor requests recomputation of a December 2026 payslip.

*Path.* The 2027 pack is added as a **new version** with `effective_from`; the 2026 pack is untouched. The December run stored its input snapshot, rule-pack version and engine version. Replay reproduces the payslip exactly, because the engine is pure, takes no clock reads, and reads no database.

*Invariants.* §12.3 effective-dating and never-overwrite · §12.1 purity and no clock reads · §22.3 deterministic replay as a blocking test.

*Verdict: holds.* The "no clock reads inside calculation" rule matters here specifically — an engine that reads `now()` for an age or tenure threshold produces a different answer on replay and quietly fails the audit.

---

**UC-6 — Cross-tenant access is attempted three ways**

*Scenario.* (a) A valid session for tenant A is replayed at `tenant-b.xforge.app`. (b) An agent-written query omits `WHERE tenant_id = ?`. (c) A crafted insert carries tenant B's `tenant_id`.

*Path.* (a) The hostname resolves a *candidate* tenant; the API re-derives tenant from the session, detects mismatch, rejects — §8.4. (b) RLS returns zero rows: the connection is a non-owner role without `BYPASSRLS`, `FORCE ROW LEVEL SECURITY` is set, and `SET LOCAL app.tenant_id` is transaction-scoped — §8.2. (c) The policy's `WITH CHECK` clause rejects the insert.

*Verdict: holds, with layered defence.* The forgotten `WHERE` clause is the case that matters most for agent-written code: correctness does not depend on the agent remembering. §22.2 proves this by dynamically enumerating every tenant-scoped table, so a newly added table cannot silently escape coverage.

---

**UC-7 — Enterprise customer requires a dedicated in-country database**

*Scenario.* A regulated buyer will not sign without its data in a dedicated database in-region.

*Path.* The tenant row's `isolation` flag flips to `dedicated_database`. The connection resolver routes accordingly. **No business module changes** — modules never branch on isolation. Portability (§25.2) means the domain imports no provider SDK, so the region is an operational decision.

*Verdict: holds.* §8.3's rejection of a schema-per-tenant middle tier also holds up here — it would have added migration complexity across every release without delivering the isolation clarity this buyer is actually asking for.

---

**UC-8 — A screen is built and reviewed before any backend exists  ⚠ caught a defect**

*Scenario.* The leave-approval queue is designed on a Monday. The backend team is finishing payroll and cannot start it for two weeks.

*Path.* Route contracts are authored → OpenAPI generated → `pnpm generate` produces the typed client, Query hooks and MSW handlers → the complete screen is built against mocks, including empty, loading, error, permission-denied and partial-data states, and reviewed in Storybook. Handlers land later against a frozen contract.

*Verdict: holds — after correction.* **v2-2 (mine) admitted a server query facade for reads.** Two of three v2 drafts rejected it, and they were right for two reasons: it is a second business transport introduced with no measured need, violating law 25; and any screen whose reads bypass the generated client cannot be built against MSW — losing the mock-first property precisely on the data-heavy screens where it pays most. §6.2 now permits one transport, with the facade available later only behind an ADR, a benchmark and parity tests.

---

**UC-9 — Zero-downtime column rename while 40 tenants are live**

*Scenario.* `employee.emp_code` must become `employee.employee_number`.

*Path.* **Expand** — add the new column, dual-write, deploy. **Backfill** — a resumable job populates history. **Switch** — reads move to the new column; the release stays compatible with the preceding schema. **Contract** — a later, separate deployment drops the old column.

*Verdict: holds.* §10.1. Absent this policy, the obvious single-migration rename breaks every instance still running the previous release during rollout.

---

**UC-10 — MyInvois is unavailable for six hours during month-end (future module)**

*Scenario.* Invoices post normally; the clearance API is down.

*Path.* The journal entry posts and commits with its outbox event. The compliance adapter's submission fails, retries with backoff, and lands in a visible dead-letter state. Invoice compliance status stays `pending`; **the ledger is unaffected**. On recovery, submissions drain and reconcile to `cleared` or `rejected`.

*Verdict: holds.* §18.2. **Without the localisation/compliance split** — v1-3 folded e-invoicing into the country pack — an authority outage would present as a country-rules failure, and coupling clearance to posting would either block month-end close or leave the ledger ambiguous. Different failure modes, different on-call, different release cadence.

---

**UC-11 — Payslip document access**

*Scenario.* An employee downloads a payslip; an HR admin bulk-exports 200 payslips.

*Path.* Files live in private object storage with metadata carrying `classification`. Individual access issues a short-lived signed URL after a policy check. **Bulk export is authorised separately from screen reads** and is recorded in the business audit trail. No permanent public URL is ever written into a business record. Payslip fields are redacted from ordinary application logs.

*Verdict: holds.* §16.1 and §19.3. Neither v2-1 nor v2-2 had a sensitive-data section; for a product holding national identity numbers and salaries, "private bucket + signed URL" alone is not sufficient — the separation of bulk export from screen read is what makes exfiltration visible.

---

**UC-12 — Adding Singapore and a Sales module**

*Scenario.* Twelve months in: add SG payroll and a Sales module.

*Path.* SG arrives as a new versioned country pack — CPF, SDL, IR8A — with no change to core; a guard would fail any `if (country)` that crept in. Sales arrives as a module declaring `dependsOn: ['contacts','catalog']` and consuming posted events; it cannot import another module's repository. Phase 7 then removes HR-shaped assumptions the kernel accumulated.

*Verdict: holds, conditionally.* The country-pack seam is proven cheap. The **platform kernel's generality is not yet proven** — that is exactly why Phase 7 exists and why no generic-ERP claim is made before it. Generalise from a second real domain, not from imagination.

---

### 23.1 Where evidence changed the architecture

| Case | Draft position | Failure | Final |
|---|---|---|---|
| UC-2 | Promote custom field to a generated column (**all v1 + v2-1 + v2-2**) | Column explosion on a shared table; per-tenant DDL in disguise | §7.3 index projection; column promotion only for product-level fields |
| UC-4 | No concurrency model (**v2-1, v2-2**) | Silent last-write-wins overwrites a bank account or salary | §10.2 optimistic concurrency, explicit conflict |
| UC-8 | Server query facade for reads (**v2-2**) | Second transport with no measured need; breaks mock-first on data-heavy screens | §6.2 one transport; facade ADR-gated |
| UC-10 | E-invoicing inside the country pack (**v1-3**) | Authority outage masquerades as a rules failure | §18.2 adapters separate from packs |
| UC-11 | No sensitive-data policy (**v2-1, v2-2**) | Bulk export indistinguishable from a screen read | §19.3 separate authorisation and audit |
| UC-3 | Tools generated from metadata (**v1-2, v1-3, v2-2**) | An agent could approve payroll because an entity was declared | §17.2 bounded generation |

Six positions held by a majority of drafts failed a concrete scenario. That is the argument for validating against use cases rather than counting votes.

---

## 24. Build sequence

| Phase | Build | Exit criterion |
|---|---|---|
| **0 — Spine** | Monorepo · `.architecture` + ADR mechanism · guards · Next.js + tokens · Hono contract pipeline · OpenAPI → Orval → MSW · Drizzle + Postgres · API conventions (§6.3) · `pnpm verify` | One trivial vertical slice completes UX → contract → mock → UI → handler → repository → DB → Playwright, green. **And at least three guards demonstrably fail on deliberate violations** |
| **1 — Tenancy, identity, policy** | Better Auth facade · tenant · membership · legal entity · business unit · host resolution · RLS · non-owner role · `withTenant()` · policy registry · domain onboarding | **Automated proof that tenant A cannot read or mutate tenant B across every tenant-owned table, and host/session mismatch is denied** |
| **2 — Design system** | Tokens · component governance · grid and form primitives · command palette · Storybook | A representative screen is built entirely from system primitives with no bespoke CSS |
| **3 — Bounded metadata kernel** | Semantic registry · overlays · slots · custom-field registry + JSONB · index projection · effective-configuration inspector · renderers · React escape hatch | A tenant adds a custom field with **zero DDL**; a label change provably issues no DDL; an HR entity ships mostly from primitives without fusing the four planes |
| **4 — HR core** | Person/employee/employment · organisational assignment · leave · claims · documents · approvals · audit | Onboarding plus leave request → approval → balance works end to end, desktop and mobile |
| **5 — Malaysia payroll** | Immutable snapshots · versioned MY rule packs · pure engine · review/approval lifecycle · payslips · statutory outputs · bank files · reconciliation | **Official-source golden fixtures, deterministic replay, property checks and full payroll E2E green** |
| **6 — AI copilot** | Provider abstraction · tenant- and policy-aware tool registry · assistant · copilot · document intake · audited drafts · evaluation fixtures | AI completes a useful HR/payroll workflow while provably respecting tenant, policy and approval boundaries |
| **7 — Second domain proves generality** | Sales + Purchasing + Inventory, **or** the finance/accounting spine | **HR-specific assumptions are found and deleted from platform abstractions.** No generic-ERP claim before this |
| **8 — Second country / enterprise isolation** | Second country pack · dedicated database tier if a real deal requires it · additional compliance adapters | — |

Phase 2 and Phase 3 overlap in practice — the metadata renderer consumes design-system primitives, so tokens, grid and form primitives must land first. They are separate gates because combined they are too large for one.

**Phases 1 and 5 carry the blocking gates.** Neither passes on a manual eyeball. **Phase 0's guard-proving requirement is deliberate:** a guard never observed to fail is not a guard, it is a comment.

---

## 25. Infrastructure, portability, extraction

### 25.1 Launch topology

Vercel (Next.js web · Hono API mounted in the web deployment · preview deployments · tenant and custom domains) · Neon (PostgreSQL · RLS · preview and test branches · pgvector) · Trigger.dev behind `packages/jobs` · Cloudflare R2 private S3-compatible storage · Resend · Sentry + OpenTelemetry.

Deliberately rented and boring, so effort goes to product and UX rather than infrastructure.

### 25.2 Portability rule

Domain code imports no hosting-provider SDK · PostgreSQL stays provider-portable · object storage is S3-compatible · auth is behind a facade · jobs are behind the outbox and an internal executor interface · the tenant-domain provider is behind an adapter · the core stack runs locally under Docker Compose.

> **Portability is an architecture property maintained continuously at near-zero cost. It is not a promise to support on-prem in v1.**

### 25.3 Extraction triggers

| Measured pain | Candidate response |
|---|---|
| API independently saturates the web deployment | Mount the same Hono composition in a dedicated `apps/api` |
| Job workload needs a dedicated runtime | Add a dedicated worker/executor |
| Enterprise demands residency or hard isolation | Dedicated regional database tier via the isolation resolver |
| PostgreSQL search misses a UX SLO or relevance bar | Add a specialised search service |
| Hot configuration or domain lookup overloads the DB | Add cache/KV |
| Outbox volume warrants a streaming backbone | Evaluate a managed event bus; the outbox is already the bridge |
| File economics or region require change | Switch S3-compatible provider |

Each is an **extraction, not a rewrite** — that is what the boundaries above buy.

---

## 26. Explicitly rejected

Microservices or Kubernetes from day one · GraphQL as the principal ERP API · tRPC as the public contract · Server Actions as a business API · RSC importing repositories or domain internals · **two business transports before measured need** · one mega metadata object generating all planes · EAV as primary business persistence · routine per-tenant DDL · **automatic arbitrary custom-field column promotion** · per-tenant database as default · schema-per-tenant as an assumed tier · tier-3 custom entities for ledgers, payroll or statutory records · arbitrary tenant server code · XML/XPath/deep view inheritance · generic `BaseService<T>` · ORM abstraction that hides SQL semantics · event sourcing everything · Kafka, Redis or Elasticsearch before measured need · Prisma (second schema language) · MySQL (no RLS) · country branching scattered through core · mutable posted financial records · JS floating point for monetary truth · **silent last-write-wins on concurrent editing** · **destructive one-step production migrations** · automatic metadata-to-AI mutation exposure · **AI holding a database connection or writing SQL**.

---

## 27. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Tenant data leakage | **Critical** | RLS forced · non-owner role · transaction-local context · `withTenant()` chokepoint · enumerated CI proof (UC-6) |
| Payroll miscalculation | **Critical** | Pure engine · immutable snapshots · official golden fixtures · deterministic replay (UC-5) |
| Future ledger error | **Critical** | Invariants hand-specified before implementation · property and reconciliation tests |
| AI exceeds authority | **Critical** | Tool-only access · bounded generation · risk classes · policy · RLS · proposal default · audit (UC-3) |
| Concurrent edits overwrite work | **High** | Optimistic concurrency, explicit conflict (UC-4) |
| Async duplicate side effects | **High** | Outbox IDs · idempotency keys · inbox dedupe · reconciliation |
| Migration causes rollout outage | **High** | Expand/backfill/switch/contract + branch verification (UC-9) |
| Metadata becomes another Odoo/Frappe | **High** | Four planes · one-source-per-fact · 80/20 rule · one-entity rule · escape hatches · generalise only at Phase 7 |
| Architecture drift under long agent sessions | **High** | Small slices · ADRs · guards · generated state · one `pnpm verify` |
| Tenant ≠ legal entity discovered late | **High** | Modelled in Phase 1 before any employee row exists (UC-1) |
| Frontend inconsistency across many screens | **High** | Tokens before screens · component governance · Storybook · visual and E2E checks |
| Scope explosion | **High** | MY HR/payroll wedge · blocking phase gates · second-domain rule |
| Sensitive data exposure via logs or export | **High** | Field classification · log redaction · separately authorised and audited export (UC-11) |
| Compliance and statutory change | Medium | Effective-dated rules · adapter versioning · official-source evidence · async clearance (UC-10) |
| Custom-field query performance | Medium | Index projection · query observability · product-level promotion only by ADR (UC-2) |
| Vendor lock-in | Medium | Internal facades · Postgres/S3 portability · outbox · domain isolated from provider SDKs (UC-7) |

---

## 28. Change control and adoption

A change requires an **ADR** when it modifies: a dependency direction · source-of-truth ownership · API compatibility strategy · the tenancy or security boundary · the persistence model · a runtime or deployment boundary · a module contract · the money or integrity model · metadata authority · async delivery semantics · the AI authority boundary.

An ADR contains: `context · decision · alternatives · consequences · migration/rollback · verification`.

Ordinary package upgrades that preserve these contracts need no ADR.

**Initial ADR set, written in Phase 0 before code:**

```
ADR-001  Modular monolith over service-per-domain
ADR-002  Contract-first Hono + OpenAPI; domain independent of transport
ADR-003  Shared-schema RLS tenancy with a dedicated-database escape hatch
ADR-004  Four architecture planes + semantic registry
ADR-005  Custom-field JSONB canonical + derived index projection
ADR-006  Money and decimal strategy
ADR-007  Transactional outbox + replaceable durable executor
ADR-008  Localisation packs separate from compliance adapters
ADR-009  Auth vs tenant vs policy ownership
ADR-010  Production migration compatibility policy
ADR-011  Bounded AI tool generation; consequential tools authored
ADR-012  One business transport; conditions for a gated read facade
ADR-013  Optimistic concurrency on mutable business documents
```

**Adoption checklist:**

- [ ] This document is agreed as canonical and placed at `.architecture/architecture-final.md`
- [ ] Superseded drafts moved to `.architecture/history/`
- [ ] `CLAUDE.md` contains only the §2 laws plus pointers
- [ ] ADR directory exists with the initial set
- [ ] `pnpm verify` contract is defined
- [ ] Phase 0 is specified as a vertical slice, not a framework-building project
- [ ] No code is generated from metadata before the four-plane ownership rules are encoded
- [ ] Tenant/RLS proof is wired as a blocking early gate
- [ ] Package and runtime versions live in manifests, not duplicated in architecture prose

---

## 29. Canonical stack

```
FOUNDATION      TypeScript strict · Node LTS · pnpm · Turborepo · Biome
                Docker Compose-compatible core stack

FRONTEND        React · Next.js App Router · Tailwind CSS v4
                shadcn/ui (open-code) · OKLCH semantic tokens
                TanStack Query · TanStack Table · React Hook Form · Zod
                cmdk · next-intl · Recharts · Storybook · MSW

CONTRACT        Hono · @hono/zod-openapi · OpenAPI 3.1
                Orval → client + Query hooks + MSW · Scalar docs

DOMAIN          Plain TypeScript modules · explicit commands and queries
                typed module manifests · bounded semantic registry

DATA            PostgreSQL · Drizzle + explicit SQL · RLS
                JSONB custom fields + index projection
                FTS + pg_trgm + unaccent · pgvector · transactional outbox
                Neon at launch (branch-per-PR)

IDENTITY        Better Auth behind packages/auth (identity + session only)
                Xforge tenancy · organisation · policy

ASYNC           Transactional outbox · Trigger.dev behind packages/jobs

FILES / COMMS   S3-compatible private storage (R2) · Resend
                tenant-domain provider behind an adapter

AI              Vercel AI SDK · provider abstraction · registered tool catalogue
                pgvector retrieval · AI audit and evaluation

QUALITY         OpenTelemetry · Sentry · structured logs · immutable business audit
                Vitest · fast-check · Testcontainers · Playwright
                architecture guards · contract diff · pnpm verify
```

---

## 30. Open items

| Item | Needed by | Note |
|---|---|---|
| Neon MCP auth failing (HTTP 401) | Phase 0 start | Refresh the token or provision Postgres via the Vercel Marketplace. Blocks branch-per-PR |
| Vercel CLI not installed | Phase 0 start | `npm i -g vercel` unlocks `env pull`, `deploy`, `logs` |
| Component primitive baseline | Phase 0 | Take the `shadcn init` default. v2-1 and v2-3 state Base UI is the greenfield default and ships Combobox, Autocomplete and Number Field — **that date is after my knowledge cutoff and I have not independently confirmed it.** Per §3.4 this is a manifest concern, not doctrine. Check the reported Context Menu / Hover Card / Toast gaps against the Phase 2 critical path |
| Better Auth ownership and licensing | Phase 0 | v2-1 reports a July 2026 acquisition with MIT licensing retained. **Also post-cutoff and unconfirmed by me.** No architectural consequence — the facade stays thin regardless — but confirm before depending on it |
| Trigger.dev vs Inngest | Phase 0 end | Reversible: the outbox is the durable record either way. Do not spend a week |
| Launch jurisdiction re-confirmation | Phase 0 | Malaysia is locked and defensible. v2-1 and an earlier draft argue for one deliberate re-check "given the team is Vietnam-based" — **I have no evidence for that claim.** If true it is a genuine input; if inferred, it should not influence anything. Confirm the premise before treating it as a factor. The country-pack architecture makes either choice cheap; the *decision* stops being cheap once payroll rule packs exist |
| Figma MCP OAuth | Only if design handoff uses Figma | Cannot complete in a non-interactive session |

Everything not listed here is normative. An agent encountering a question not on this list consults `.architecture/adr/` rather than re-deciding.

---

## 31. Conclusion

Xforge should not win by being the most abstract ERP framework. It should win by being **easier to understand, safer to change, faster to build, better to use, and harder to corrupt.**

The mature architecture is therefore deliberately asymmetric:

```
business truth        → explicit code + relational data
external interface    → typed contract + OpenAPI
repetitive UX         → bounded metadata
high-value UX         → hand-built React
tenant variation      → deterministic overlays
tenant isolation      → PostgreSQL RLS
business authority    → explicit policy
historical truth      → immutable snapshots and ledgers
country variation     → effective-dated country packs
external compliance   → asynchronous adapters
async intent          → transactional outbox
AI                    → authorised application tools
infrastructure        → added only against measured pain
architecture          → enforced by executable guards
```

The differentiator is not a clever framework. It is a **canonical spine plus strict, mechanically enforced boundaries** that lets Claude Code move quickly without converting speed into architectural entropy.

> **Xforge should feel configurable like ERPNext, modular like Odoo, contract-driven like a modern SaaS platform, and maintainable like a deliberately boring TypeScript codebase.**

> **Simple enough to reason about. Strict enough to trust. Extensible enough to grow.**

This is v3.0 FINAL. The next change to any normative section arrives as an ADR, not as a fourth draft.
