# ADR-003 — Shared-schema RLS tenancy; two chokepoints; no schema-per-tenant

**Status:** Accepted · FROZEN · 31 August 2026

## Context

The launch vertical holds salaries and national identity numbers. A cross-tenant leak
is existential, not embarrassing. The code is written primarily by an AI agent, so
the isolation guarantee **must not depend on anyone remembering to filter**.

The tenant population is many SME tenants plus occasional enterprise groups, which
rules out a model whose per-tenant cost is a provisioning job.

## Prior art

Backfilled under law 34 before the tenancy phase is certified. The decision was
made without this check, which is the practice the law exists to end -- so what
follows records where precedent and this design DIFFER, not only where they agree.

### Approaches reviewed

Shared schema + RLS, schema-per-tenant, and database-per-tenant are the three
partitioning models the SaaS literature treats as standard. The isolation enum
here keeps the first and the third and closes the middle.

### Evidence

| Source | Retrieved | Supports |
|---|---|---|
| [PostgreSQL, Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) | 2026-08-31 | Superusers and `BYPASSRLS` roles ALWAYS bypass row security; `FORCE` subjects only the table OWNER; TRUNCATE and REFERENCES are not subject to row security |
| [OWASP Multi-Tenant Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html) | 2026-08-31 | Enable RLS with `FORCE`; do not serve ordinary tenant-scoped requests through a privileged connection; re-establish tenant context per transaction with `SET LOCAL`; prefer schema-derived RLS coverage discovery, because a hand-maintained table list can drift |
| [Postgres RLS in practice](https://queryplane.com/blog/postgres-row-level-security-in-practice/) | 2026-08-31 | Permissive policies combine with OR; `SECURITY DEFINER` evaluates the OWNER's policies; `pg_dump` by a role without `BYPASSRLS` exports zero rows under FORCE |

### What prior art does NOT prove

**The two-chokepoint shape is not borrowed.** No source found argues for a
sanctioned, audited cross-tenant path on the grounds that WITHOUT one somebody
adds a privileged connection at 2am. The sources describe how to isolate. The
claim that an escape hatch makes isolation more durable than no escape hatch is
an Xforge judgement, held by T14 and T15 rather than by precedent.

**Closing the schema-per-tenant tier is ours.** Nothing found compares the three
models with data at our scale, because our scale does not exist yet.

**And none of it says this implementation is correct.** That is T01-T21.

## Decision

Shared schema, `tenant_id` on every tenant-owned table, isolation enforced by
**PostgreSQL row-level security** — a database invariant, not an application
convention.

Four details decide whether this works or is theatre:

1. **Never connect as the table owner.** RLS silently skips owners and superusers.
   A dedicated non-owner `app_user` without `BYPASSRLS`, with
   `FORCE ROW LEVEL SECURITY` as the second line — **unconditional, no
   "where appropriate"**, asserted per table by the isolation gate.
2. **`SET LOCAL`, never session-wide `SET`.** Under a connection pool a
   session-scoped variable leaks to whichever tenant borrows the connection next.
3. **Never depend on connection-session state that can survive a pool checkout.**
   A driver test (AQS-022) proves the selected driver keeps `SET LOCAL` across a
   transaction and drops it on checkout, replacing an unverified vendor claim.
4. **Two chokepoints, and only two:** `withTenant(tenantId, fn)` and
   `withPlatformAccess(reason, fn)`.

The isolation enum is frozen at **`pooled | dedicated_database`**.

## Alternatives considered

**Database per tenant** (Odoo's model). Rejected as the default: N migrations per
release, N backup jobs, no shared connection pool, and tenant signup becomes a
provisioning job rather than an `INSERT`. Retained as the `dedicated_database` tier
for residency and enterprise deals.

**Schema per tenant** (roughly ERPNext's model). Rejected outright, and the enum is
closed against it. It adds migration complexity across every release without
delivering the isolation clarity a buyer asking for isolation actually wants. Earlier
drafts left it "open unless a customer proves it valuable"; the shared reasoning is
an argument for closing the question, not for reopening it per deal.

**Application-level filtering only.** Rejected. One forgotten `WHERE` clause is a
salary leak, and agent-written queries are exactly where that happens.

**A single chokepoint (`withTenant` only).** Rejected — and this is the
counter-intuitive part. It *sounds* stricter and is in fact unenforceable: the admin
console, billing rollups and platform analytics genuinely need cross-tenant reads.
With no sanctioned path, an engineer under deadline pressure adds a privileged
connection or disables RLS on a table "just for the admin query," and the guarantee
dies quietly. **This is the documented way RLS architectures fail.**
`withPlatformAccess` is restricted to `apps/admin`, requires a stated reason, writes
an audit row on every call, and is forbidden in `modules/**` by a guard. The point is
not that cross-tenant access is safe — it is that it is rare, named and logged rather
than improvised at 2am.

## Consequences

**Positive.** Isolation survives agent error (UC-13: a query with no tenant predicate
still returns only the current tenant's rows). One migration path, one pool, one
backup. Tenant signup is an `INSERT`.

**Negative, stated plainly.** Cross-tenant analytics is deliberately awkward;
`withPlatformAccess` is a controlled escape, not a query engine, and product
analytics will eventually want an outbox-fed read model (§26.1 — that is an ADR, not
an improvisation). **Data residency is a project, not a config flag** (§26.2): the
isolation column is true of application code and false of the deployment.

**Residual risk.** RLS covers the *tenant* boundary only. Nothing structural enforces
the *legal-entity* boundary — see ADR-009 and §26.7.

## Migration / rollback

A tenant moves to `dedicated_database` by changing its isolation value; the
connection resolver reads it and **all other application code is identical** —
business modules never branch on isolation. Adding a third tier requires a
superseding ADR.

## Verification

- **AQS-005** — dynamic tenant-table discovery; every one has `tenant_id`, RLS
  enabled *and* forced.
- **AQS-006** — cross-tenant read, update, delete and spoofed-insert denial, as the
  real non-owner role.
- **AQS-007** — app role is not owner, superuser, or `BYPASSRLS`.
- **AQS-008** — host/session tenant mismatch denied (see ADR-015).
- **AQS-022** — driver session-state proof.

Enumeration is **dynamic**, so a newly added table cannot silently escape coverage.
This gate never passes on manual inspection.
