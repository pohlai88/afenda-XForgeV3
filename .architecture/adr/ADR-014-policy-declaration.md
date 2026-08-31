# ADR-014 — Mandatory policy declaration on every route contract

**Status:** Accepted · FROZEN · 31 August 2026
**Origin:** UC-14, adversarial review. Severity: **critical**.

## Context

The architecture's central bet is that **mechanical guards make agent-authored code
safe**. Every predecessor draft carried this guard:

```
permission code used but not registered in a manifest
```

It catches a typo — `payroll.run.aprove` — and nothing else. **It is a spelling
check, not a presence check.**

A command shipped with **no permission check at all** declares no permission code, so
it trips no guard. `tsc` passes. Lint passes. The dependency DAG passes. RLS still
scopes the query to the correct tenant, so the isolation test passes too.
`pnpm verify` is green and the endpoint is open to every authenticated user in the
tenant — including, for example, a `GET /v1/employees/{id}/compensation` an intern
can call.

This is the highest-severity finding in the review, because it does not merely permit
a bug: it falsifies the claim the whole guard strategy rests on. A guard that cannot
see an *absent* check protects nothing against the most likely agent error, which is
omission rather than error.

## Decision

> Every route contract **MUST** carry a `policy` declaration — either
> `{ permission, scopeType }` or the explicit literal `'public'`. The `packages/api`
> adapter evaluates it before dispatching to the command, and **refuses at
> registration time to mount any operation whose contract omits it.**

Three properties matter and each is deliberate:

- **`'public'` is explicit, never a default.** An unauthenticated endpoint is a
  decision someone typed and a reviewer saw.
- **Refusal is at mount time, not request time.** The application fails to start
  rather than serving an unprotected route.
- **The adapter evaluates it**, so enforcement does not depend on the command
  remembering to call the policy layer.

## Alternatives considered

**Rely on code review.** Rejected: this is exactly the omission a reviewer skims
past, and the codebase is primarily agent-authored at a rate review cannot match.

**A guard that greps commands for a policy call.** Rejected: brittle against
indirection, and it detects a call rather than a *correct* call. Declaration in the
contract is data the adapter can act on.

**Default-deny at the adapter without a declaration.** Considered seriously. It fails
safe, but it fails *silently* — every route 403s until someone notices, which
converts a security defect into an availability defect and teaches developers to add
declarations by trial and error. Refusing to mount surfaces the problem at the moment
it is introduced.

**Enforce in the command layer instead.** Rejected: the command is where the omission
happens. The check belongs one layer above it.

## Consequences

**Positive.** Authorisation coverage becomes a structural property rather than a
discipline. The guard family now includes a *presence* check, closing the gap that
made the others less meaningful than they appeared. An agent cannot ship an
unprotected operation.

**Negative.** Boilerplate on every route contract, including trivial ones, and a
`'public'` literal that will occasionally be typed reflexively — mitigated only by
review, since no mechanism can distinguish a considered `'public'` from a careless
one.

## Migration / rollback

Additive: existing contracts gain a field, and the adapter's refusal makes any
oversight impossible to miss on the next start. Removing the requirement would
reopen a critical hole and requires a superseding ADR.

## Verification

**AQS-021 — policy-coverage proof.** Dynamically enumerates **every registered
operation** — the way AQS-005 enumerates tenant tables — and asserts that each has a
declaration, and that a principal lacking the declared permission receives `403`.

Dynamic enumeration is the point: a newly added route cannot silently escape
coverage, which is the same property that makes the tenant-isolation gate
trustworthy.

Guard: *route contract without a policy declaration*.
