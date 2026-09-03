# 09 — Xforge

Read this **before `02-tokens.md`, `03-components.md`, or any review mode** when working
in this repository. The rest of the skill was consolidated from seven general sources and
knows nothing about this codebase; where it and this file disagree, this file wins.

It deliberately POINTS at authorities rather than restating them. A number copied here
would be a second source for a fact the repository already owns, which is the specific
defect this codebase is organised against.

**And pointing is only safe while the pointer resolves.** Every path below was wrong on
2026-09-02: `packages/tokens/` and `packages/ui/` were merged into `packages/design/`, and
this file — whose entire job is to stop an agent inventing authority — sent it to six
directories that were not there, plus a generator script that no longer exists. Nothing
caught it, because no check reads a path out of prose.

So before trusting this file, spend the one command that would have caught it — run from
the repository root:

```
  grep -ohE '(packages|tooling|e2e|\.architecture)/[A-Za-z0-9_./-]+' \
    .claude/skills/design-system/references/09-xforge.md \
    | sed 's/[.,`]*$//' | sort -u \
    | while read -r p; do [ -e "$p" ] || echo "GONE $p"; done
```

**Expect exactly two hits — `packages/tokens/` and `packages/ui/` — from the paragraph
above, which names them precisely because they are dead.** Anything else it prints is this
file rotting again. A check whose own known output is undocumented is a check people learn
to skim past.

## Where authority actually lives

`02-tokens.md` opens with "the current Figma file is the primary source of truth." That is
not true here and following it will send you looking for a file that decides nothing.

```
  design tokens        packages/design/policy/tokens.json        W3C DTCG v2025.10
  UI vocabulary        packages/design/src/components/*.tsx      each file is the Adapter;
                                                                  its exported tables (ALERT_TONE,
                                                                  BUTTON_VARIANT) are its contract
  the schema           .architecture/adr/ADR-031-component-policy-is-authored-the-primitive-is-projected.md
                                                                  §Beta, "Adapter file schema"
  decisions            .architecture/adr/
  current state        .architecture/project-state.md
```

**Announcement rules have no module of their own.** There was a `live-region.ts`; there is
not one now. A component's announcement behaviour is declared by its
`interaction.profile` in the contract registry and implemented in the component — `Status`
is the worked example, and `live-region` is the profile name. Look for the profile, not
for a file.

Figma is not wired into this repository's authority chain at all. Its MCP server exists
but is unauthenticated, and no artefact here is generated from or checked against a Figma
file. Treat every Figma instruction in this skill as inapplicable unless the user has
explicitly connected one.

## Derived files are never hand-edited

Law 27. These are generated, and the `generate cleanliness` stage regenerates and diffs
them, so an edit is not merely wrong — it is reverted and reported.

```
  packages/design/generated/tokens.css           <- pnpm gen:tokens
  packages/design/generated/tailwind-theme.css   <- pnpm gen:tokens
  packages/design/generated/style.ts             <- pnpm gen:tokens (the STYLE symbols)
  packages/design/generated/style-manifest.json  <- pnpm gen:tokens (the same, for tools)
  packages/design/generated/twmerge.ts           <- pnpm gen:tokens
  packages/design/generated/FOUNDATIONS.md       <- pnpm gen:tokens
```

One generator emits all five, so there is one command to re-run and one directory to
leave alone. `pnpm generate` chains it with `gen:openapi` and `gen:client`, which are the
contract pipeline rather than the design system. There is no `gen:ui-schema`; the script
and the `schema.json` it wrote are both gone.

That stage diffs against the **index**, deliberately. Regenerate, `git add` the output,
then run the gate — regenerating without staging reads as drift.

## The token pipeline has teeth the skill does not know about

Constitution rule 5 ("Core primitives → Semantic → Component") is exactly this
repository's model, so the instinct transfers. What does not transfer is that here the
rules are enforced rather than advised. `packages/design/policy/generators/tokens.mjs` throws on:

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
must resolve to a class in `packages/design/generated/style-manifest.json`, fallbacks included, since
`var(--semantic-gone, 4px)` hides the same rename behind a plausible value. Regenerate
before trusting it — the guard reads the manifest, so a stale manifest describes a stale
vocabulary. **A semantic rename is now a mechanical change rather than a risky one**, which
is worth knowing before deciding one is too expensive to make.

## Styling is constrained more tightly than "match the existing system"

The skill says to express a fix in the project's idiom and lists Tailwind, CSS Modules,
styled-components, StyleX. Tailwind v4 utilities apply, but only utilities that name a
token role — the generated `@theme` bridge erases Tailwind's default scale on purpose.
THE THREE GUARDS THIS PARAGRAPH USED TO NAME (`no-bespoke-styling`,
`tokens-are-the-authority`, `stylesheet-names-roles-not-primitives`) WERE DELETED in
a3cf31b with the rest of the guard subsystem. What holds the boundary now:

```
  tests/unit/design-system-classes.test.ts     every class the authored layer writes
                                                compiles, and none carries a raw value
  packages/design/tests/adapter-schema.test.ts  an authored component never re-exports
                                                or leaks its adaptee, and reaches other
                                                primitives only through their adapters
  packages/design/package.json                  "./components/ui/*": null -- the vendored
                                                tree is unreachable from outside
```

A variant is a `data-*` attribute stamped by the Adapter, driven by an axis Xforge owns.
If no variant fits, the fix is a new axis value in the authored component — never styling
at the call site, never an edit to `src/components/ui/**`. (The published packages are
`api`, `api-client`, `db`, `design`, `policy`, `tenancy`; there is no `@xforge/ui`.)

## Accessibility is already mechanically enforced

This matters for review mode. Re-reporting what the suites already prove is noise, and
worse, it implies the repository is uncovered where it is not.

**Read the list rather than trusting one written here.** This file previously named four
suites — `inert-contracts`, `live-region-politeness`, `native-control` and a
`conformance-harness` — and on 2026-09-02 all four had been deleted and the coverage
folded into rewritten specs. Naming suites is the same mistake as naming paths, one
directory up: the spec files are the most volatile thing this document could point at.

```
  what runs        ls e2e/*.spec.ts                        (browser + database; not the fast loop)
                   packages/design/tests/*.test.tsx         (per-component contract tests, node)
                   packages/design/tests/*.browser.test.tsx (behaviour in Chromium:
                                                             vitest run --project browser)
  what is gated    NOTHING MECHANICALLY TODAY. The registry that derived the gated set
                   and the stage that read it are both deleted (ae4e294, a3cf31b).
                   A component's announcement contract is the table beside it, e.g.
                   ALERT_TONE in packages/design/src/components/alert.tsx, asserted by
                   packages/design/tests/alert.test.tsx
  target size      the WCAG 2.5.8 floor, statically in the generator and rendered
                   in e2e/token-modes.spec.ts
```

The durable facts, which are about the mechanism rather than the files: axe runs against
read states, write outcomes, the error boundary and mounted dialog primitives; a `none`
profile is held inert; role and `aria-live` must be a coherent pair; a native control keeps
its platform element, Enter AND Space. Which spec asserts which is a question for `ls`.

So a craft review earns its place here by finding what those cannot see: announcement
ORDER and verbosity, whether a live region existed before its content changed, colour
carrying meaning alone, hierarchy, writing, and whether a screen's states are honest.
Constitution rule 7 — never let colour carry meaning alone — is genuinely uncovered by
any automated check here and is worth applying.

A11y-3 (a real screen-reader session) is owed and not gated: `.architecture/a11y-evidence.json`
records sessions (none yet), and the stage that read it went with the gate. No review
output substitutes for it.

## Reviews are read-only here in a stronger sense than rule 3

There is no `pnpm verify` on this branch; the gate was deleted in a3cf31b. The authorship
loop an agent runs is `pnpm check`, `pnpm exec tsc --noEmit -p tsconfig.json` and
`pnpm exec vitest run --project unit`. Report findings; do not claim a green nobody ran.
