# ADR-019 — Permission-code lifecycle and fail-closed policy compilation

**Status:** Accepted · FROZEN · 31 August 2026
**Origin:** adversarial review (metadata and policy lifecycle seam). Severity: **high**.

## Context

Permission codes are declared in module manifests and referenced from three places
that outlive any single deploy: **tenant grants** (rows a customer created),
**field-access rules**, and **workflow transition conditions**.

The guard every draft carried — *permission code used but not registered* — runs in
one direction only. It catches a reference to a code that does not exist. It does not
catch a **code that is removed while references still exist**.

The consequence depends entirely on how the policy compiler treats an unknown code,
and no draft said. The dangerous default is the natural one: a field-access rule
referencing an unknown code compiles to **no restriction**, because there is no rule
left to apply. Deleting `hr.compensation.read` during a refactor therefore does not
lock compensation down — **it opens it**, silently, for every tenant whose field rule
referenced it.

## Decision

**Codes carry a lifecycle** in the module manifest:

```
status: active | deprecated(replaced_by) | retired(not_before)
```

A code reaches `retired` only after a deprecation window.

**The guard becomes bidirectional.** A generated `permission-vocabulary.json`
snapshot is committed, so **CI fails when a code disappears without a tombstone** —
the reverse direction the original guard could not see.

**The policy compiler fails closed:**

> A row or field rule referencing an unknown or retired code compiles to **DENY**,
> never to "no restriction," and raises a policy-integrity error. An unknown code in
> a grant evaluates to **no grant**.

Note the deliberate asymmetry: an unknown code in a *restriction* denies, and an
unknown code in a *grant* also denies. Both directions fail safe.

**Rewriting tenant grants and field rules through `replaced_by` is an audited,
resumable migration job** under expand → backfill → switch → contract — never an
implicit deploy-time side effect that silently rewrites customer data.

The same reference-graph discipline applies to metadata generally (ADR-005 §7.3):
deleting a custom field, slot or permission code is **refused while a workflow
condition, saved view, report, policy rule or AI tool description still references
it**, and the refusal names the references. A workflow condition whose referenced
field has vanished evaluates to **error, never to false** — a silently-false condition
skips an approval level, which is the same failure wearing different clothes.

## Alternatives considered

**Fail open on unknown codes** (the implicit default). Rejected — see Context. It
converts a cleanup into a privilege escalation.

**Forbid removing codes entirely.** Rejected: the vocabulary would accrete forever,
and a code that was a mistake could never be withdrawn. A deprecation window achieves
the same safety with an exit.

**Rewrite grants automatically at deploy time.** Rejected: silently rewriting customer
authorisation data during a deploy is exactly the kind of invisible change that makes
an incident unexplainable. As an audited migration it is reviewable and reversible.

**Rely on the existing one-directional guard plus review.** Rejected: the removal is
usually a tidy-up in an unrelated PR, which is where review attention is lowest.

## Consequences

**Positive.** Vocabulary changes are safe in both directions. A refactor cannot widen
access. Tenant grants referencing withdrawn codes are migrated deliberately, with a
record.

**Negative.** A committed vocabulary snapshot is another generated artifact to keep
clean, and the deprecation window slows genuine cleanup. Fail-closed compilation means
a mistake in the vocabulary locks users out rather than letting them through — the
correct direction, but it will produce support tickets rather than silent breaches,
and that trade is the point.

## Migration / rollback

Additive; the snapshot is generated from existing manifests. Reverting to fail-open
compilation would reopen a privilege-escalation path and requires a superseding ADR.

## Verification

- **AQS-021** (extended) — a rule referencing an unknown or retired code compiles to
  DENY and raises a policy-integrity error; an unknown code in a grant yields no
  grant.
- Guard: *permission code used but not registered, **or removed without a
  tombstone***.
- Metadata reference-graph test: deleting a referenced custom field is refused and the
  references are named; a workflow condition on a missing field errors rather than
  evaluating false.
