# ADR-011 — Bounded AI tool generation; the definition of consequential

**Status:** Accepted · FROZEN · 31 August 2026

## Context

Because entities are declared in a metadata registry, AI tool definitions can be
generated from them. Several drafts celebrated this: "AI capability grows for free as
modules ship."

That is true for reads and **dangerous for writes**. If declaring an entity generates
its mutation tools, then adding `payroll_run` to the registry grants an agent the
ability to approve payroll. An entity existing is not consent for an agent to mutate
it, and the failure would be introduced by an ordinary, correct-looking schema
change.

A second problem surfaced in UC-11. Drafts said consequential actions must be
authored while routine ones may be generated — but left "consequential" to intuition.
Asked whether `apply_leave` is consequential, intuition says no: it reads as routine
administration. Intuition is wrong. Leave changes a balance, the balance feeds
unpaid-leave proration, proration changes gross pay, and gross pay changes statutory
contributions.

## Decision

```
GENERATED from metadata   read · list · search · draft_create
AUTHORED explicitly       everything else
```

And a **definition rather than a vibe**:

> **A capability is consequential if it changes money, statutory filings, stock, an
> approved record, or an input to any of those.**

The trailing clause is what catches leave. Under it `apply_leave` is authored, bound
to an application command, and produces a draft requiring approval.

`risk_class` is **derived from this definition**, so it is reviewable rather than
asserted. Every tool registration specifies `tool_id · operation_id · risk_class ·
required_permission · approval_mode · input schema · output schema · audit
requirements`.

**Autonomy is configured per action type and risk class** — never enabled wholesale
by a generic "AI enabled" tenant flag.

Guardrails, all non-negotiable:

1. AI never receives database credentials and never authors SQL.
2. AI operates under the caller's or agent's identity and tenant context, through the
   same API and policy layer as a human. No back door.
3. Retrieval filters tenant, row permission, sensitivity and classification **inside
   the query** — never rank globally then filter, which is a leak with extra steps.
4. Consequential writes create drafts requiring approval.
5. Extraction has confidence thresholds; below threshold routes to a human. Never
   guess a number into a payslip.
6. Agent identity is a distinct principal type (ADR-018) — separately scoped,
   independently revocable.
7. Every AI action is audited: principal, agent identity, tenant, model and provider,
   tool, correlation, approval, resulting command, model configuration version,
   prompt template version or hash. Never log secrets or raw sensitive prompts.
8. The AI app-builder ships last, once metadata and policy semantics are proven.

## Alternatives considered

**Generate all tools from metadata.** Rejected — see Context. This was the position
of three drafts.

**Author every tool by hand.** Rejected: it forfeits the real benefit for reads,
where generation is safe and the catalogue is large.

**`risk_class` as a hand-assigned field with no rule.** Rejected: it pushes the
decision back to the intuition that gets `apply_leave` wrong. Deriving it from a
stated definition makes the classification reviewable in a PR.

**Tenant-level "enable AI autonomy" flag.** Rejected: a single toggle cannot express
that a tenant is comfortable with automated leave-conflict detection but not with
automated bank-file release.

## Consequences

**Positive.** Read capability grows with the product at no cost. A schema change
cannot silently widen an agent's authority. Consequential tools get code review.

**Negative.** Authoring is real work per consequential capability, and the definition
requires judgement at the margin — "an input to any of those" is deliberately broad
and will occasionally classify something as consequential that feels routine. That
error direction is the safe one.

## Migration / rollback

Reclassifying a capability from generated to authored is additive. The reverse — 
generating something previously authored — requires a superseding ADR, because it
widens authority.

## Verification

**AQS-017** — AI excessive-agency and adversarial suite:

- a prompt requesting another tenant's data returns nothing and is audited;
- a prompt asking the agent to bypass approval fails;
- an entity declared in metadata with no authored consequential tool exposes none;
- low-confidence extraction routes to a human;
- a user lacking `payroll.run.approve` cannot achieve it via the agent;
- prompt injection attempting to invoke an unrelated tool fails.

Guard: *metadata auto-generating a mutation tool*; *AI tool mapped directly to a
repository or database*.
