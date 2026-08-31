# ADR-022 — Verified tenant context: host selects, membership authorises, session identifies

**Status:** Accepted · FROZEN · 31 August 2026
**Refines:** ADR-015 (bound tenant per request). Settled before Phase 1 code is written.

## Context

ADR-015 established that a request carries exactly one bound tenant, because the
host/session check is a tautology for a principal belonging to two tenants. It
did not say *where the binding lives*, and the obvious implementation is a
mutable session field:

```
session.activeTenantId
```

That is wrong in a way which only shows up in ordinary use. Jack belongs to
Tenant A and Tenant B and has two tabs open — `a.xforge.app` and `b.xforge.app`.
With a single mutable session field, switching tenants in one tab changes the
security context of the other. Nothing errors. The second tab simply starts
reading a different tenant's data, and the user has no reason to notice.

A second, quieter risk: if `withTenant` accepts any string, deep application
code can reach for `withTenant(request.body.tenantId, ...)` and the entire
isolation guarantee then rests on an untrusted value having been checked
somewhere upstream — which is exactly the kind of "checked somewhere" that
stops being true during a refactor.

## Decision

**Host selects. Membership authorises. Session identifies.**

```
hostname or route
      ↓  selects
candidate tenant                 ← never an authority, only a proposal
      ↓
authenticated principal          ← session identifies WHO, not WHICH TENANT
      ↓
does this principal hold a valid membership in the candidate tenant?
      ↓ yes
VerifiedTenantContext            ← the only thing withTenant accepts
```

`activeTenantId` may exist as a **navigation preference**. It never grants
access. Access is re-derived per request from the host or route plus the
membership record, so two tabs cannot influence each other's authority.

On `app.xforge.com`, where no tenant hostname exists, the tenant comes from the
route — `/app/t/{tenantSlug}/...` — and is still only a *candidate*, subject to
the same membership verification.

**`withTenant` accepts a branded `VerifiedTenantContext`, not a string.**

```ts
declare const brand: unique symbol
export type VerifiedTenantContext = { readonly tenantId: string; readonly [brand]: true }
```

The type is constructible only by the request-context layer, after host
resolution, principal authentication and membership verification. Repositories
and application code receive `ctx.tenant`; a raw UUID does not typecheck.

```
untrusted tenant identifier
        ↓
candidate
        ↓  membership verification
VerifiedTenantContext
        ↓
withTenant()
```

## Alternatives considered

**A mutable `session.activeTenantId` as the authority.** Rejected — see Context.
It is the natural implementation and it breaks multi-tab silently, which is the
worst combination.

**Re-verify membership only at tenant switch.** Rejected: the window between
switch and revocation is exactly when a revoked membership must stop working
(ADR-018). Verification is per request.

**`withTenant(tenantId: string)` with a documented rule that callers must pass a
verified value.** Rejected. That is a rule enforced by memory, and this
architecture's whole position is that such rules are decoration. A branded type
makes the compiler enforce it, and a guard cannot be argued with.

**A single global "current tenant" per process.** Rejected: it cannot express
concurrent requests for different tenants, which is the normal case.

## Consequences

**Positive.** Multi-tab and multi-membership behave safely by construction
rather than by care. A raw UUID cannot reach `withTenant`. Revocation takes
effect on the next request because membership is checked per request.

**Negative.** A membership lookup per request — cacheable, but a real cost, and
the cache becomes security-relevant the moment it exists (an entry outliving a
revocation reopens ADR-018's window). Threading the context through application
code is more ceremony than a global.

**Cost accepted.** Branded types are unfamiliar and produce type errors that
read oddly until the pattern is learned.

## Migration / rollback

Decided before Phase 1 code. The spine's stub principal already carries a bound
tenant, so this replaces the stub rather than migrating data.

## Verification

- **AQS-008** extended: a principal with N≥2 memberships, two concurrent
  contexts, and a tenant switch in one that must not affect the other.
- A membership revoked between two requests denies the second (with ADR-018).
- Guard: `withTenant` called with anything other than a `VerifiedTenantContext`
  fails the type check; a guard flags construction of the branded type outside
  `packages/tenancy`.
- The decisive test, per the Phase 1 standard: **delete the tenant predicate
  from a real HR repository query and confirm isolation still holds** — because
  RLS wins, not because the query was careful.
