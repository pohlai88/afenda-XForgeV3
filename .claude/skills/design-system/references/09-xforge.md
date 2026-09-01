# 09 — Xforge

Read this **before `02-tokens.md`, `03-components.md`, or any review mode** when working
in this repository. The rest of the skill was consolidated from seven general sources and
knows nothing about this codebase; where it and this file disagree, this file wins.

It deliberately POINTS at authorities rather than restating them. A number copied here
would be a second source for a fact the repository already owns, which is the specific
defect this codebase is organised against.

## Where authority actually lives

`02-tokens.md` opens with "the current Figma file is the primary source of truth." That is
not true here and following it will send you looking for a file that decides nothing.

```
  design tokens        packages/tokens/tokens.json        W3C DTCG v2025.10
  UI vocabulary        packages/ui/src/contracts.ts       the contract registry
  announcement rules   packages/ui/src/live-region.ts
  decisions            .architecture/adr/
  current state        .architecture/project-state.md
```

Figma is not wired into this repository's authority chain at all. Its MCP server exists
but is unauthenticated, and no artefact here is generated from or checked against a Figma
file. Treat every Figma instruction in this skill as inapplicable unless the user has
explicitly connected one.

## Derived files are never hand-edited

Law 27. These are generated, and the `generate cleanliness` stage regenerates and diffs
them, so an edit is not merely wrong — it is reverted and reported.

```
  packages/tokens/generated/tokens.css     <- pnpm gen:tokens
  packages/ui/generated/schema.json        <- pnpm gen:ui-schema
```

That stage diffs against the **index**, deliberately. Regenerate, `git add` the output,
then run the gate — regenerating without staging reads as drift.

## The token pipeline has teeth the skill does not know about

Constitution rule 5 ("Core primitives → Semantic → Component") is exactly this
repository's model, so the instinct transfers. What does not transfer is that here the
rules are enforced rather than advised. `tooling/generators/tokens.mjs` throws on:

- an alias to a token that does not exist, and alias cycles
- a component token reaching past semantics to a primitive
- a semantic token reaching down into the component tier
- a target below the WCAG 2.5.8 floor **in any density mode**
- more than the component-token ceiling, which is a tripwire raised only in its own
  commit carrying the count and the reason

Two axes compose: `theme` owns colour, `density` owns geometry. A token rebound by BOTH is
refused, because the mode selectors have equal specificity and emission order would decide
the winner — which turns source order into architecture.

**A dangling `var()` is now caught, and this paragraph used to say it was not.** CSS drops
an undefined custom property silently, so a rename left the page rendering plausibly while
lint, guards and the token tests all passed — "adding tokens is safe, renaming one is not"
was the standing advice, with a manual grep as the only defence.

`tokens-referenced-are-tokens-that-exist` closes it: every `var()` in the token namespace
must resolve to `packages/tokens/generated/token-names.json`, fallbacks included, since
`var(--semantic-gone, 4px)` hides the same rename behind a plausible value. Regenerate
before trusting it — the guard reads the manifest, so a stale manifest describes a stale
vocabulary. **A semantic rename is now a mechanical change rather than a risky one**, which
is worth knowing before deciding one is too expensive to make.

## Styling is constrained more tightly than "match the existing system"

The skill says to express a fix in the project's idiom and lists Tailwind, CSS Modules,
styled-components, StyleX. None applies. This repository uses plain CSS with custom
properties, and three guards hold the boundary:

```
  no-bespoke-styling                    business screens carry no className and no style
  tokens-are-the-authority              no literal hex/rgb/hsl in packages/ui/**/*.css
  stylesheet-names-roles-not-primitives the stylesheet reaches semantics, never primitives
```

A variant is a `data-*` attribute on a primitive, not a class string. If no variant fits,
the fix is a new variant in `@xforge/ui` — never styling at the call site.

## Accessibility is already mechanically enforced

This matters for review mode. Re-reporting what the suites already prove is noise, and
worse, it implies the repository is uncovered where it is not. Currently enforced:

```
  axe, WCAG A/AA          every read state, write outcome, the error boundary,
                          the mounted dialog primitives
  inert contracts         a `none` profile takes no focus, declares no interactive or
                          live-region role, and wires no accessible relationship
  live-region politeness  role and aria-live are a coherent pair, and tone still
                          discriminates
  native-control          the platform element is preserved; Enter AND Space activate;
                          a disabled control does not act
  target size             the WCAG 2.5.8 floor, statically in the generator and rendered
                          in `e2e/token-modes.spec.ts`
```

So a craft review earns its place here by finding what those cannot see: announcement
ORDER and verbosity, whether a live region existed before its content changed, colour
carrying meaning alone, hierarchy, writing, and whether a screen's states are honest.
Constitution rule 7 — never let colour carry meaning alone — is genuinely uncovered by
any automated check here and is worth applying.

A11y-3 (a real screen-reader session) is owed and gated: `.architecture/a11y-evidence.json`
records sessions and the `a11y-evidence` stage reports PENDING until the design-system
phase starts, then BLOCKED. No review output substitutes for it.

## Reviews are read-only here in a stronger sense than rule 3

`pnpm verify` is the human's command, not an agent's, and a green it did not witness is
not evidence. An agent runs `pnpm verify:fast` and hands the rest over, naming what did
not run. Report findings; do not run the aggregate gate to prove them.
