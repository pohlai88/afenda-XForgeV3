# ADR-018 — Machine principals; credential revocation model

**Status:** Accepted · FROZEN · 31 August 2026
**Origin:** adversarial review (partner-API and machine-identity seam). Severity: **high**.

## Context

Every draft described the OpenAPI surface as "first-class and externally consumable"
by partners, integrations and future mobile and AI clients, and separately required
that "agent identity is distinct from user identity — separately scoped and
independently revocable."

**None said how a machine authenticates.** Better Auth was scoped to human identity
and session; nothing described API keys, OAuth clients, service accounts or machine
principals, and nothing said how a machine principal maps onto tenant context, RLS or
the policy scope model.

Investigating the obvious implementation surfaced the trap. Better Auth ships an
`api-key` plugin, and it works by **mocking a session tied to a user** — the key
carries a `referenceId` that resolves to a user record. Used as-is, a partner
integration authenticates *as a human*: policy evaluates that human's grants, and the
audit trail records **"Siti approved this"** when a machine did.

That is the same class of mistake the architecture already refuses elsewhere —
collapsing tenant, legal entity and auth organisation into one concept — applied to
principals.

A second gap sits beside it: **no revocation object existed anywhere.** Nothing
described how a departed employee's access ends, how a leaked integration credential
is killed, or how temporary delegation expires.

## Decision

**A machine principal is a first-class principal type — never a user with a
credential attached.** It has its own identity, its own scoped grants, its own audit
identity and its own rate limits. `packages/auth` may use the auth library to mint
and verify the credential; the **principal** it resolves to is an Xforge machine
principal. The business audit trail represents non-human actors natively.

**AI agent identity uses the same model**, distinct from both user and integration
principals — separately scoped, independently revocable. This aligns with Better
Auth's Agent Auth direction (scoped capabilities, short-lived signed JWTs, approval
flows), which is the stated focus of its post-acquisition roadmap.

Machine credentials are **tenant-bound** under ADR-015, so a leaked credential cannot
be replayed against a sibling tenant.

**Revocation is an object, not an event:**

> `tenant_membership` and every scoped grant carry a status and `valid_from` /
> `valid_to`, and `packages/policy` evaluates validity on **every** request — so
> temporary delegation expires by construction rather than by someone remembering.
> `packages/auth` exposes `revokePrincipal(principalId, reason)`, which in **one
> transaction** terminates sessions and marks memberships, grants and credentials
> revoked, with an audit row. An `hr.employment.ended` outbox consumer invokes it
> after a configured grace window.

## Alternatives considered

**Use the auth library's API-key plugin as shipped.** Rejected — see Context. It
produces a false audit trail, which is worse than no audit trail because it is
believed.

**A shared "integration user" per tenant.** Rejected: the same collapse with extra
steps, and it makes per-integration revocation impossible.

**Defer machine identity until a partner asks.** Rejected: the principal model is
foundational. Retrofitting a second principal type after policy, audit and RLS
context all assume "principal = user" is a rewrite of the authorisation layer, and
the AI agent requirement needs it in the AI phase regardless.

**Revocation by deleting rows.** Rejected: it destroys the audit trail of what access
existed, and it races with in-flight sessions. Status plus validity window is both
auditable and evaluable.

## Consequences

**Positive.** The audit trail is truthful about who acted. Integrations and agents are
independently scoped and revocable. Temporary delegation expires without a cleanup
job. Departure revokes access on the next request rather than eventually.

**Negative.** A principal model with three kinds is more complex than one, and every
policy evaluation now checks a validity window — a small per-request cost, paid
always. Rate limiting per principal must exist, which is infrastructure the HTTP layer
must carry (and another reason ADR-012 permits only one transport).

## Migration / rollback

Decided before any principal exists. Adding a fourth principal kind later is
additive; collapsing kinds is a superseding ADR.

## Verification

**AQS-027 — revocation propagation proof:**

- a principal whose employment ended yesterday is **denied on the next request**;
- a revoked credential fails immediately, including one presented mid-session;
- a grant past `valid_to` evaluates to no grant without any cleanup having run;
- revocation writes an audit row naming the actor and reason.

Audit assertion: an action taken by a machine principal records the **machine** as
actor, never a human. Phase gate: the HR-core phase does not exit until the
employment-ended denial is demonstrated.
