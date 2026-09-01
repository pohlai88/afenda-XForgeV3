# The design system

What the model is, what governs it, and what it does not yet govern.

**This file reproduces no token values.** Every number, colour and name lives in
`packages/tokens/tokens.json` and is presented in
`packages/tokens/generated/FOUNDATIONS.md`, which is generated from it. A table
copied into prose would be a second home for every value in the system, and it
would go stale the first time someone edited the source — silently, because
nothing compares a paragraph to a token file. What follows is only the part that
cannot be derived.

## Where authority lives

| Fact | Authority |
| --- | --- |
| Token values | `packages/tokens/tokens.json`, in the W3C DTCG shape |
| Emitted custom properties | `packages/tokens/generated/token-names.json` |
| The stylesheet | `packages/tokens/generated/tokens.css` |
| The foundations table | `packages/tokens/generated/FOUNDATIONS.md` |
| Token policy | `tooling/design-system/token-policy/` |
| UI vocabulary | `packages/ui/src/contracts.ts` |
| Announcement rules | `packages/ui/src/live-region.ts` |
| Decisions | `.architecture/adr/` |

The three generated files are never hand-edited (law 27). `pnpm generate`
rebuilds them and the `generate` stage diffs the result against the index, so an
edit is reverted and reported rather than merely wrong.

Figma is not part of this chain. Its MCP server exists but is unauthenticated,
and no artefact here is generated from or checked against a Figma file.

## Three tiers, one direction

```
  primitive  ->  semantic  ->  component
```

**Primitive** is raw material named for what it *is*, never for what it means.
There is no `color.error` — a primitive named for a meaning has taken the
semantic layer's job, and the day dark mode arrives it is the wrong colour under
a name nobody can change.

**Semantic** names a role. This is the only layer a stylesheet or the component
tier may use, and the reason a theme change is a token change rather than a sweep
through every screen.

**Component** consumes semantics. A component token reaching past semantics to a
primitive makes the semantic layer optional decoration, because the quickest way
to style anything becomes reaching straight past it.

The direction is enforced, not advised: `ALLOWED_EDGES` in `tiers.mjs` states
which tier may alias which, and the generator throws on an illegal edge, a
dangling alias, or a cycle.

### Names are property-first

What is styled, then the role or state it carries — `text.danger`, not
`danger.text`. The v2 contract normalised the last of the intent-first names;
`COLOR_ROLE_GROUPS` in `color.mjs` closes the vocabulary so a new family cannot
arrive without a policy edit.

## Two axes that compose

`theme` owns colour. `density` owns geometry. Nothing owns both.

A token rebound by both axes is refused. Their mode selectors have equal
specificity, so which value won would be decided by whichever block the generator
emitted last — source order masquerading as architecture, and it fails silently:
the page looks plausible while `dark + compact` is quietly not the composition of
dark and compact.

Axis ownership is derived from DTCG `$type`, not from a naming convention. A
theme mode may rebind only `color` tokens and a density mode only `dimension`
ones, which is checkable and does not depend on anyone naming a group carefully.

## What each policy domain governs

Each module in `tooling/design-system/token-policy/` owns one question, validates
its own table on import, and takes its subject as an argument so it can be shown a
violation rather than only ever shown the constant beside it.

| Domain | The question it answers |
| --- | --- |
| `contract` | Which vocabulary version consumers depend on, and what a token ID promises |
| `tiers` | Which tier a group is in, and which tier may alias which |
| `identity` | The naming grammar, and that the CSS projection is one-to-one |
| `values` | What a value may look like per `$type`, and how it becomes CSS |
| `accessibility` | The contrast and target floors, and which criterion each cites |
| `color` | What a role proves, what it may be composed against, and the pairs derived from that |
| `typography` | Rank, size and leading floors, and hierarchy under density |
| `motion` | The answer every role owes to `prefers-reduced-motion` |
| `elevation` | Layers, and what may separate one from the one beneath |
| `freeze` | That a canonical table cannot be edited by a consumer |

Two properties are worth knowing because they are unusual:

**Floors cite their source.** `accessibility.mjs` separates what a WCAG success
criterion *requires* from what this system *adopts*, so the assertion compares two
different facts and the system may be stricter and never looser. A floor citing no
criterion — the disabled-text contrast — must state why it exists.

**Pairs are derived, never listed.** A colour role declares the contexts it
consumes and provides; which pairs get measured falls out of that. Three
consecutive reviews found a hand-maintained pair list short by one surface, which
said the enumeration method was the defect rather than any particular list.

## What is declared but not enforced

Stated plainly, because a policy that reads as governance while governing nothing
is worse than an absent one.

| Declared | Actually enforced? |
| --- | --- |
| Token lifecycle (`stable` / `deprecated` / `experimental`) | **No.** The states are declared and validated, and no token carries lifecycle metadata. No lint, no registry, no compatibility gate. |
| The contract version | **No consumer.** Nothing reads `TOKEN_CONTRACT_VERSION`; that a major accompanies a breaking rename is a human promise. |
| Motion duration ceilings | **Dormant.** The one motion role loops, and looping roles are exempt from a ceiling by design, so the duration check measures nothing today. |
| "A shadow may never be the only separation" | **Not against a stylesheet.** Nothing renders a shadow; what refuses one today is the hardcoded-literal guard and the absence of a shadow `$type`, neither of which is this rule. |
| Reduced motion | **Two homes.** The policy says the pulse is removed; `ui.css` implements it in a media query. Nothing connects them. |
| Typography pixel floors | **At an assumed root.** The floors hold at the root named by `ASSUMED_ROOT_PX` in `typography.mjs`. Type scales in rem, so that is a premise about the document, not a measurement of one — and the margin at it is zero, which a test in `tokens.test.ts` holds. |

## What is enforced mechanically

Do not re-verify these by inspection; they have suites.

- axe / WCAG A and AA over every read state, write outcome, the error boundary,
  and the mounted dialog primitives.
- Inert contracts, live-region politeness, and native-control activation.
- The WCAG 2.5.8 target floor, statically in the generator **and** rendered in
  `e2e/token-modes.spec.ts`.
- Every `var()` in the token namespace resolving to the emitted manifest,
  fallbacks included — so a semantic rename is a mechanical change rather than a
  risky one.
- No literal hex, rgb or hsl in `packages/ui/**/*.css`; the stylesheet names
  semantics, never primitives; business screens carry no `className` and no
  `style`.

**A real screen-reader session is owed and gated.** `.architecture/a11y-evidence.json`
records sessions and the `a11y-evidence` stage reports PENDING until the
design-system phase starts, then BLOCKED. No automated suite substitutes for it.

## Changing something

- **A value** — edit `packages/tokens/tokens.json`, run `pnpm generate`, stage the
  generated output.
- **A variant** — a `data-*` attribute on a primitive in `@xforge/ui`, never a
  class at the call site. If no variant fits, add one to the primitive.
- **A new semantic role** — it needs a policy entry in the domain that governs it
  before the generator will emit it. That refusal is deliberate: a role cannot
  quietly escape the check.
- **A breaking rename** — mechanical, and covered. Rename, regenerate, and the
  dangling-`var()` guard finds every stylesheet that named the old form.
