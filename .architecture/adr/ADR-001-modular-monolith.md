# ADR-001 — Modular monolith over service-per-domain

**Status:** Accepted · FROZEN · 31 August 2026

## Context

Xforge is an ERP-class platform: HR and payroll first, then sales, inventory,
accounting and more. Domains of that kind are conventionally decomposed into
services, and the decomposition looks disciplined on a diagram.

The constraint that overrides the convention is that **Claude Code is the primary
author**. Under service-per-domain, an ordinary business change — "add an emergency
contact to an employee" — becomes distributed tracing, API coordination, deployment
ordering, retry semantics and event versioning. Every one of those multiplies the
context an agent must hold to make a correct small change, and agent reliability
degrades roughly with the amount of context a change spans.

A second constraint: payroll and accounting need **transactional consistency across
what would otherwise be service boundaries** (approve a run, write payslip lines,
write the outbox event — atomically). Distributed transactions or sagas to recover
that are complexity bought for no benefit at this size.

## Decision

Build a **strict modular monolith**: one deployable, with module boundaries enforced
as if they were already service boundaries.

- `apps` = deployable compositions · `modules` = business capabilities ·
  `packages` = platform capabilities.
- Dependency direction `apps → modules → platform packages → shared primitives`,
  mechanically enforced. No reverse dependencies, no business-module cycles.
- A module communicates only through another module's **public application
  interface**, published domain events, or platform capabilities. Never through
  another module's repository, Drizzle tables, private domain code or private UI.
- **The platform kernel must not know that Payroll, Sales or any future module
  exists.**

## Alternatives considered

**Microservices from day one.** Rejected. It buys independent scaling and team
autonomy — neither of which is a current constraint — at the cost of the agent
velocity that is the project's actual bet. It also forfeits the single transaction
that payroll approval depends on.

**Unstructured monolith.** Rejected. The productivity is identical on day one and
gone by month nine: without enforced boundaries, modules reach into each other's
tables and the codebase becomes unsplittable exactly when splitting matters. This is
the failure mode this ADR exists to prevent, and prose alone does not prevent it —
hence the guards.

**Modular monolith with boundaries by convention.** Rejected for the same reason.
"Laws that depend on an agent remembering them are decoration."

## Consequences

**Positive.** One deployment, one database transaction, one local `docker compose`.
Refactoring across module boundaries is a compiler problem rather than a migration
and deprecation cycle. An agent can hold the whole request path in context.

**Negative, stated plainly.** A module that develops radically different scaling or
availability requirements — a POS needing offline-first sync and sub-100ms local
writes — will need extraction, and the boundaries make that *possible* but not
*free*. See `architecture-final.md` §26.4.

**Cost accepted.** Boundary enforcement is upfront tooling work in the spine phase,
before it has visibly paid for anything.

## Migration / rollback

Extraction is a **mount change, not a rewrite**, because `packages/api` is
transport-agnostic from day one and the domain never imports Hono: the same
composition mounts in the web deployment, in `apps/api`, or in the worker.

Extraction happens only against a measured trigger (`architecture-final.md` §27),
never "because enterprise."

## Verification

- **AQS-001** — dependency DAG and module privacy: cyclic dependencies, foreign
  repository imports and platform→module imports all fail CI.
- **AQS-020** — second-domain generality proof: a materially different module builds
  on the same kernel without the kernel gaining knowledge of it.

The second-domain gate is the real test. Until a module unlike HR has run through
the kernel, the boundaries are asserted rather than demonstrated.
