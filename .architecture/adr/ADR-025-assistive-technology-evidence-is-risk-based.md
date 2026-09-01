# ADR-025 — Assistive-technology evidence is required by interaction profile, not by control count

**Status:** Accepted · 1 September 2026

## Context

Three accessibility levels were defined: axe (A11y-1), browser-observed
keyboard, focus and ARIA behaviour (A11y-2), and real screen-reader
verification (A11y-3). A11y-3 was owed by every contract whose
`interaction.profile` was `form-control`, `modal`, `composite` or
`composite-grid`.

Four contracts owed it after one stage of primitives. Combobox, Select, Switch,
RadioGroup, CommandPalette, DataGrid and inline edit are all still to come, so
the obligation was heading for roughly a dozen manual sessions arriving as one
batch at the certification gate — with no owner and no date.

That fails the test this repository applies to everything else. `partial` had to
have a producer and a wire marker before it could be a state; a version token
had to have a rejection path before it could be a rule. **A gate no scheduled
person can satisfy is decoration**, and it resolves one of two ways: it blocks
certification indefinitely, or it gets waived under pressure. The waiver is
worse than a narrower gate honestly recorded, because it discredits the gates
that remain.

## Prior art

### Approaches reviewed

- **Gate every interactive control.** The prior rule. Maximises nominal
  coverage and, at ~12 unscheduled sessions, minimises the chance any of them
  happens.
- **Gate a named list of components.** Rejected: a list is extended by
  intuition, and the next person adding a roving-focus widget has to remember.
- **Gate by interaction profile.** Adopted. The set is computed from what a
  component declares itself to be.

### Evidence

| Source | Retrieved | Supports |
|---|---|---|
| [W3C APG, Dialog (Modal) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | 2026-09-01 | A modal's correctness is focus management — trapping, initial target, restoration — none of which is a static property of the accessibility tree |
| [W3C APG, Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) | 2026-08-31 | `role="grid"` is a composite widget with one tab stop and managed focus; where focus lands depends on cell content, which no static check can verify |
| [WCAG 2.2, Name Role Value (4.1.2)](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value) | 2026-09-01 | Native form controls carry name, role and value from the platform — the property axe checks statically and A11y-2 observes in a browser |
| Xforge, `e2e/conformance-harness.spec.ts` | 2026-09-01 | Field, Input and Checkbox have their accessible names, descriptions and roles verified in Chromium, on a mounted document |

### What prior art does NOT prove

**No source establishes that a screen-reader session is unnecessary for a text
input.** The APG documents what correct behaviour is; WCAG documents what must
be true. Neither says which verification method suffices, because that is a
project's own risk decision — this one.

It also does not prove the reduction is safe. A11y-2 observes the computed
accessibility tree; a screen reader consumes it and then makes its own decisions
about announcement order, verbosity and virtual-cursor traversal. Those can
diverge from a correct tree. **The ungated contracts carry residual risk that is
accepted, not eliminated.**

Nor does it establish that the gated set is complete. It is complete against the
profiles that exist today.

## Decision

**A11y-3 is required where a component MANAGES FOCUS ITSELF or ANNOUNCES STATE
THE DOM DOES NOT ALREADY CARRY.** Those are the cases where axe passes, the
browser-observed checks pass, and a screen reader still says the wrong thing.

Gated profiles: `modal`, `composite`, `composite-grid`.

Not gated: `none`, `native-control`, `form-control`, `live-region` — these rest
on native semantics that A11y-1 verifies statically and A11y-2 verifies in a
browser.

> **Correction, 1 September 2026, at stage 4C.5.** "A11y-1 verifies statically"
> was not true when this was accepted. There was no axe anywhere in the
> repository — A11y-1 existed as a *defined level* and never as a running check
> — so the reduction above rested on something that had never executed. It runs
> now; see Verification below.
>
> The original wording is left standing rather than edited, because the decision
> was reached on that basis and rewriting it would conceal what was actually
> relied upon.
>
> Worth recording where this was visible and went unread: the Verification
> section below named only checks that existed, while the Decision named one
> that did not. The two sections disagreed, in one document, and nothing
> compares them — no guard reads a sentence claiming that a check exists.

The set is **derived from the profile a contract declares**, never from a list of
component names. Combobox is `composite` and will be gated the day it lands,
without anyone editing anything.

Two consequences that are part of the decision, not softenings of it:

- **The gate narrows; the coverage does not.** Field, Input and Checkbox stay in
  scope for the first session that runs — they cost minutes each once a screen
  reader is open. They simply do not block certification.
- **Evidence records what was ANNOUNCED, verbatim**, per scenario. A
  `result: pass` with a scenario list is an attestation only its author can
  check. A transcript is reviewable by someone who was not in the room, and a
  later regression is diffable against it.

## Alternatives considered

**Keep the full set and block Stage 9.** Honest, and it makes the certification
date a function of scheduling a dozen sessions nobody has scheduled. Rejected
for the reason above: an unsatisfiable gate is not a stricter standard, it is a
gate that will be waived.

**Drop A11y-3 entirely and rely on axe plus A11y-2.** Rejected. It is precisely
the composite and modal cases where those two are known to be insufficient, and
that is what the gated set now contains.

## Consequences

The debt drops from four contracts to **one**: Dialog, which manages its own
focus and has no recorded session. That is a single sitting rather than a batch,
which is the version of "schedule a session" that is actually schedulable.

Stage 8's gate — no contract may carry an `interactionRevision` above the
revision with recorded evidence — is **still red on day one**, because Dialog
exists and its evidence file does not. Narrowing shrinks that problem and does
not remove it. The gate therefore needs the `unmet()` treatment: PENDING before
the design-system phase, failing within it, so it is a certification
precondition rather than a permanently-red stage people learn to scroll past.

## Migration / rollback

Reverting means adding `form-control` back to `PROFILES_REQUIRING_AT_EVIDENCE`.
One line, and the tests asserting the gated set fail immediately, which is the
intended way to notice.

## Verification

- `tests/unit/ui-contracts.test.ts` asserts the gated profile set and asserts
  that `native-control`, `form-control`, `none` and `live-region` are absent —
  so a silent widening fails.
- The same suite asserts the currently-owing set is exactly `['Dialog']`.
- `e2e/conformance-harness.spec.ts` verifies in Chromium that Field, Input and
  Checkbox carry the names, descriptions and roles this decision relies on them
  carrying. **If that spec is deleted, this ADR loses its basis** and the
  reduction is no longer justified.
- The same spec runs A11y-1 — axe at WCAG A/AA — over the open dialog, which is
  the only place Field, Input and Checkbox are mounted together. Added at 4C.5.
  This is the level the Decision above cited, and until then it was named here
  by nothing, because it did not exist. It carries the same condition: delete
  the scan and the reduction is again resting on a claim rather than a check.
