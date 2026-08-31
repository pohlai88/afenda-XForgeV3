# ADR-023 — How membership is read before a tenant context exists

**Status:** Accepted · FROZEN · 31 August 2026
**Refines:** ADR-003 (two chokepoints), ADR-022 (verified tenant context), law 12.

## Context

ADR-022 settled the order: host proposes a candidate, membership authorises it,
and only then does a `VerifiedTenantContext` exist. Implementing it produces a
circularity the design did not name.

```
withTenant  requires  VerifiedTenantContext
VerifiedTenantContext  requires  a membership check
the membership check  requires  reading tenant_membership
reading tenant_membership  requires  a database handle
                                     ...which only withTenant provides
```

Law 12 permits exactly two paths to the database: `withTenant()` for
tenant-scoped data and `withPlatformAccess()` for cross-tenant data. Membership
resolution fits neither. It is not cross-tenant — it reads one candidate
tenant's rows — and it cannot use `withTenant`, because it is the step that
produces `withTenant`'s argument.

This is exactly the situation the architecture warns about: a genuine need with
no sanctioned path, which is how somebody adds a privileged connection at 2am
and the isolation model quietly stops being true. It gets an ADR instead.

## Decision

**A closed, single-purpose authorisation primitive in `packages/db`. Not a third
chokepoint.**

```ts
hasActiveMembership(tenantId, principalId, asOf): Promise<boolean>
```

It opens a transaction, sets `app.tenant_id` to the CANDIDATE tenant, runs one
`SELECT` against `tenant_membership`, and returns a boolean.

The decisive property is what it does **not** do: **no `TenantClient` escapes.**
A general `withCandidateTenant(id, fn)` would hand a caller full tenant-scoped
access to an *unverified* tenant — the entire guarantee, handed out one
convenience helper at a time. This function cannot be repurposed, because there
is nothing to repurpose: it takes no callback and returns a boolean.

Binding an unverified tenant id is therefore bounded twice: by the function's
own shape, and by RLS, which confines the statement to that tenant's membership
rows regardless of what the caller intended.

`tenant_membership` keeps `tenant_id`, RLS enabled AND forced, and the same
isolation policy as every other tenant-owned table. Law 11 is untouched, and
the membership read is subject to the boundary rather than excepted from it.

**Law 12 is read as: no general tenant-scoped database handle is obtained
outside `withTenant()`.** A closed boolean primitive is not a handle. A guard
confines callers to `packages/tenancy` and the composition root.

## Alternatives considered

**`withPlatformAccess`.** Wrong on two counts. It is for CROSS-tenant access and
this is not; and it writes an audit row per call, so every request in the system
would produce one. An audit trail where the overwhelming majority of entries are
routine is an audit trail nobody reads — the record of a genuinely dangerous
access would sit in a haystack of logins.

**A third general chokepoint, `withCandidateTenant(id, fn)`.** Rejected: it
hands out a tenant-scoped client for a tenant nobody has verified. The first
awkward feature does its "quick lookup" inside that callback and the
verification step becomes decorative.

**A second RLS policy letting a principal read their own membership rows across
tenants, keyed on `app.principal_id`.** Genuinely attractive — "a principal may
read their own memberships" is a clean sentence — but it needs a second
transaction-local setting, a second policy on a security-critical table, and it
widens `tenant_membership` to a legitimate cross-tenant read. More moving parts
for the same answer.

**Treat `tenant`, `tenant_domain` and `tenant_membership` as platform tables
outside RLS.** Rejected. §9 requires the membership check to run against
RLS-protected data, and it is the check the whole tenant boundary rests on.
Exempting it would put the most security-critical table in the system outside
the mechanism protecting everything else.

## Prior art

Checked after this decision was drafted, which is the wrong order and is why
the prior-art law now exists.

| Source | Retrieved | Supports |
|---|---|---|
| [PostgreSQL 18, Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) | 2026-08-31 | Superusers and `BYPASSRLS` roles always bypass RLS; `FORCE` subjects only the table OWNER |
| [OWASP Multi-Tenant Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html) | 2026-08-31 | Client-supplied tenant identifiers are SELECTORS ONLY, verified against membership; ordinary requests must not use a privileged connection |
| [Postgres RLS in practice](https://queryplane.com/blog/postgres-row-level-security-in-practice/) | 2026-08-31 | Permissive policies OR together; `SECURITY DEFINER` evaluates the OWNER's policies; `pg_dump` without `BYPASSRLS` exports zero rows |

### What prior art does NOT prove

No source found addresses the bootstrap
circularity directly — how to read the tables that decide the tenant before a
tenant is decided. OWASP describes the verification, not where the membership
row comes from. The closed-primitive answer is therefore an Xforge synthesis,
qualified by T06, T07 and T18 rather than by precedent, and it is labelled that
way instead of borrowing authority from sources that do not cover it.

**SECURITY DEFINER doctrine.** A PostgreSQL function is the obvious next step if
this lookup ever needs more privilege than a plain SELECT, and it is a trap: a
`SECURITY DEFINER` function evaluates the OWNER's policies, not the caller's, so
it can hand back cross-tenant rows while every policy above it looks correct. If
one is ever introduced here it requires a fixed `search_path`, fully qualified
objects, no dynamic SQL, `REVOKE EXECUTE FROM PUBLIC`, a non-superuser owner,
and the smallest possible return shape. Until then, no function.

## Consequences

**Positive.** The circularity is resolved without widening any general-purpose
path. `tenant_membership` stays inside RLS. The blast radius of an unverified
tenant id is one boolean.

**Negative.** One more exported function that reaches the database outside
`withTenant`, and therefore one more thing a guard must confine. An extra
round trip per request, cacheable later — but a cache here is security-relevant,
because an entry outliving a revocation reopens ADR-018's window, so it needs
its own decision rather than being added for speed.

**Cost accepted.** Law 12's wording is now read more precisely than it was
written. That is recorded here rather than left to inference.

## Migration / rollback

New tables in slice 2 of the tenancy phase; no data migration. Reverting means
reverting the whole membership path.

## Verification

- T06: a valid session at another tenant's host, with no membership there, is
  denied.
- T07: a principal in two tenants, at A's host with a navigation preference of
  B, resolves to A.
- T18: a membership revoked between requests denies the second.
- Guard: `hasActiveMembership` called outside `packages/tenancy` or the
  composition root fails the build.
- The suite asserts `tenant_membership` carries RLS enabled AND forced, like
  every other tenant-owned table.
