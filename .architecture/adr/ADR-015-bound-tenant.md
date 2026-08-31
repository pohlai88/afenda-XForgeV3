# ADR-015 — Bound tenant per request; multi-membership selection

**Status:** Accepted · FROZEN · 31 August 2026
**Origin:** UC-15, adversarial review. Severity: **critical**.

## Context

Every predecessor draft stated the same tenant-URL rule, and treated it as settled:

> The hostname resolves a *candidate* tenant. It never authorises. The API re-derives
> the tenant from the session and asserts it matches. A valid session for tenant A
> presented at tenant B's hostname is rejected.

That reasoning holds only if a session belongs to exactly one tenant.

**For a principal who belongs to more than one tenant, the check is a tautology.**
The session is valid for both tenants, so "re-derive tenant from session and assert
it matches the host" always passes — the host has become the sole selector, and the
assertion that was supposed to constrain it confirms whatever the host said.

Multi-membership is an ordinary case, not an exotic one: an outsourced accountant
serving several clients, a consultant, a group-company HR manager with access to two
tenants, an implementation partner. In an SEA SME market where outsourced payroll
bureaux are common, it may be a *typical* case.

## Decision

> An authenticated request context carries **exactly one `tenant_id`**, bound at an
> explicit tenant-selection step and re-verified against the membership record on
> every request.
>
> Where a principal holds two or more memberships, **selection is a distinct
> operation that mints a tenant-bound session or credential.** Any request whose
> host-resolved tenant differs from the bound tenant is rejected.

The host still resolves a candidate and still never authorises; the difference is
that the session now carries a *binding* rather than a set, so the comparison has
content.

Membership lives in Xforge tables (ADR-010), so this verification runs against
RLS-protected data.

## Alternatives considered

**Keep host-derived tenant with a session-set check.** Rejected — see Context. This
is the status quo that the scenario breaks.

**Let the session carry all memberships and resolve per request from the host.**
Rejected: it is the tautology restated. It also means a compromised or mistaken host
resolution silently switches tenant context for a legitimate user, with no explicit
act by the principal.

**Require an explicit `X-Tenant-Id` header the client sets.** Rejected: a
network-provided value is a routing hint, never an authorisation claim — the
architecture already forbids trusting one, and this would smuggle it back in.

**Separate sessions per tenant with no selection step** (log in again per tenant).
Equivalent in safety and rejected only on usability; the selection step produces the
same binding without a second authentication.

## Consequences

**Positive.** The host/session comparison becomes meaningful for every principal, not
only single-tenant ones. Tenant switching becomes an explicit, auditable act.
Credentials — including machine credentials under ADR-018 — are tenant-bound, so a
leaked credential cannot be replayed against a sibling tenant.

**Negative.** A tenant-selection step in the login flow for multi-membership
principals, and session state that must be invalidated when membership is revoked
(ADR-018). Clients must handle "your bound tenant does not match this host."

## Migration / rollback

Decided before any session exists, so no migration. Reversing it reopens a critical
hole.

## Verification

**AQS-008** — host/session tenant mismatch, extended beyond the single-membership
case to cover:

- a principal holding **N ≥ 2 memberships** presented at a sibling tenant's hostname;
- a tenant-bound credential replayed at a foreign hostname;
- a request whose bound tenant no longer corresponds to a valid membership.

**UC-13** is updated to include the multi-membership variant. The original
single-membership test passes under both the old and new rules, which is precisely
why it never exposed this — a reminder that a passing test proves only what it
covers.
