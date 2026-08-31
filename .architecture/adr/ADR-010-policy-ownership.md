# ADR-010 — All authorisation in packages/policy; Better Auth for identity only

**Status:** Accepted · FROZEN · 31 August 2026

## Context

Better Auth ships an organization plugin with membership, teams, roles, invitations
and **dynamic access control** — roles created at runtime with custom permission
maps. It is genuinely capable, and an early draft proposed using it for
tenant-defined roles alongside an Xforge policy engine.

That is two authoritative locations for the same fact, which is the failure the
architecture's own DRY doctrine forbids: "one source of truth per fact." It also
produces the "four approximately-correct locations" problem that degrades agent
reliability — an agent asked to add a permission check has to know which system owns
the answer.

A related question: who owns tenant *membership*? Drafts disagreed.

## Decision

Three layers, never collapsed:

```
Authentication  → who is the principal?          Better Auth, behind packages/auth
Tenant boundary → what can this connection see?  PostgreSQL RLS  (fails safe)
Policy          → what may this principal do?    packages/policy
```

**Better Auth owns** identity, sign-in and session lifecycle, MFA, passkeys and SSO.

**Xforge owns** tenants, **membership**, business roles, permissions, scopes,
organisational access and business audit.

Membership specifically is Xforge's because it is the fact the tenant-binding check
(ADR-015) evaluates on every request, and that check must run against RLS-protected
Xforge data — not against an auth library's own schema, where the authorisation-
critical join would sit outside the isolation guarantee.

Vocabulary is `module.resource.action`. Scopes:
`tenant · legal_entity · business_unit · location · department · own`.
`team` is added later by ADR against a real use case.

```
permission = payroll.run.approve
scope_type = legal_entity
scope_id   = MY01
```

**The evaluator rejects an unrecognised `scope_type` and fails closed.**

> **UI permission state is presentation convenience only, never the security
> authority.** Field-level access is enforced in the **response**, not by the client
> declining to render a column — a contract test asserts the field is *absent* for a
> principal without the permission.

## Alternatives considered

**Better Auth dynamic access control for tenant-defined roles.** Rejected — two
authorities for one fact. Tenants still define their own roles; those roles are rows
in Xforge tables.

**A general policy engine (OpenFGA, Permify) from the start.** Rejected: RBAC plus
scoped ABAC covers the known cases, and a relationship-authorization platform is
infrastructure with no measured pain. Revisit when a customer genuinely needs
relationship rules ("managers of the branch that owns the project").

**RLS for business authorisation as well as tenancy.** Rejected: RLS is the right
tool for a single structural boundary and the wrong one for scoped, role-derived,
field-level business rules. Attempting both makes the policies unreadable and couples
authorisation changes to migrations.

## Consequences

**Positive.** One place to look for "may this principal do this." Auth provider is
replaceable behind a facade without touching the business topology. Tenant-defined
roles need no deploy.

**Negative.** Xforge maintains membership, role and grant tables that a library would
have provided — genuine duplicated effort, accepted for the ownership boundary.

## Migration / rollback

Replacing the auth provider is a facade change: `packages/auth` is the only importer.
Moving authorisation *into* an external policy platform later is an additive ADR, as
the permission vocabulary and scope model are already explicit data.

## Verification

- **AQS-021** — policy-coverage proof (see ADR-014): every operation declares and
  enforces a policy.
- Guard: *permission code used but not registered in a manifest* (and, per ADR-019,
  removed without a tombstone).
- Contract test: a principal without `hr.compensation.read` receives the field
  **absent** from the response, not merely hidden.
