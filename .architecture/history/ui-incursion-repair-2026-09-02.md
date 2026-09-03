# The shadcn incursion, and its repair — 2026-09-02

> Register note, 2026-09-03: the shadcn prior-art entry this record cites as E24 was renumbered
> E36; E24 belongs to the 31 August block (PostgreSQL RLS in practice). The text below is left
> as written.

## What was wrong

The working tree carried a second UI system. `npx shadcn@latest add` had been run
against `apps/web`, installing:

```
  apps/web/components/ui/*.tsx      17 components, 1930 lines, Radix + Tailwind + cva
  apps/web/lib/utils.ts             the `cn` helper (clsx + tailwind-merge)
  apps/web/hooks/use-mobile.ts      shadcn's sidebar breakpoint hook
  apps/web/components.json          shadcn registry config
  apps/web/postcss.config.mjs       Tailwind v4 pipeline
  apps/web/app/globals.css          a 125-line bridge mapping 154 semantic tokens
                                    into Tailwind's @theme namespaces
  pnpm-workspace.yaml               catalog entries for radix-ui, tailwindcss,
                                    class-variance-authority, clsx, tailwind-merge,
                                    lucide-react
  apps/web/tsconfig.json            baseUrl + `@/*` paths, for shadcn's aliases
```

**This was already decided against, in writing, on the same day.** Evidence register
E24 (retrieved 2 September 2026) records a REJECT of the shadcn stack on three
named grounds:

```
  Radix beside Base UI    a second primitive library for one component set, which
                          law 30 refuses without a named, measured pain
  Tailwind utilities      09-xforge.md states the styling systems the general skill
                          lists -- Tailwind, CSS Modules, styled-components,
                          StyleX -- and says none applies here
  className variants      no-bespoke-styling fails a business screen carrying
                          className; variants here are data-* attributes
```

E24 closes that section with one sentence: *"`npx shadcn@latest add` would have
installed the first of those silently."* It then was.

## Why nothing complained

Two independent invisibilities, stacked.

**The guard's universe does not reach there.** `no-bespoke-styling` applies to
`apps/web/app/**` (minus `api/`) and `modules/*/ui/**`. `apps/web/components/**` is
in neither. A complete parallel component library can be installed one directory
away from a guarded path and every guard reports green over it.

**Untracked files are invisible to every guard.** The guards enumerate
`git ls-files`, which reads the index. Nothing here was ever staged. This is the
same shape project-state.md already recorded for `tone-mark.ts`, arriving a second
time at a larger size.

The only thing that objected was `tsc`, and only by accident: the 17 components
could not resolve `@/lib/utils` under this repo's module resolution, so the gate
went RED with 20 type errors. A stack that had compiled would have sat there
silently.

## Collateral, found while separating the change

`packages/tokens/tokens.json` had `space.0` and `space.6` deleted. Unmotivated by
anything written down, and incomplete: `packages/tokens/generated/tokens.css`
(lines 70, 76) and `generated/token-names.json` both still carry them, so the
`generate cleanliness` stage would have gone red. Worse, `tooling/design-system/
token-policy/values.mjs` documents `space.0` as *"the single documented legacy
exception"* for a unitless zero length — a comment that would have been describing
a token that no longer existed.

One fact, four copies, three of them disagreeing. Reverted. Pruning unused
primitives is a legitimate change; it is a deliberate commit that regenerates.

## What was repaired

Quarantined (moved, not deleted, to the session scratchpad under
`shadcn-quarantine/`) and reverted:

```
  22 untracked files             the whole shadcn install
  apps/web/app/layout.tsx        the ./globals.css import
  apps/web/package.json          6 runtime deps + 2 devDeps
  apps/web/tsconfig.json         baseUrl and the @/* path mapping
  pnpm-workspace.yaml            6 catalog entries
  pnpm-lock.yaml                 reinstalled clean
  packages/tokens/tokens.json    space.0 and space.6 restored
```

## What was KEPT, and why it is good work

The same working tree held four changes that belong. All four were verified
individually before being kept.

**`xf-class-has-rule`, a new guard.** Every `xf-*` class used in `packages/ui/**/*.tsx`
must have a matching rule in `ui.css`. It throws rather than passing if the
stylesheet is missing, so it cannot go green by having read nothing. Proven against
its fixtures: the violating fixture yields
`xf-* class has no CSS rule: xf-nobody-defined-me`, the clean one yields nothing.

**It found two real defects, which is why it is not decorative.**
`xf-combobox-positioner` was a class the stylesheet never defined — a styling
intent that silently did nothing. Removed from `index.tsx`. `xf-command-item-label`
was used in `command-palette.tsx:130` with no rule; the rule now exists, carrying
the `flex: 1` and `min-inline-size: 0` that a `space-between` row actually needs.

**`xf-focusable` added to the reload button in `boundary.tsx`.** `.xf-focusable:focus-visible`
exists at `ui.css:42`; the error boundary's own button was the one control not
wearing it.

## Verification

`pnpm verify:fast` — AUTHORSHIP LOOP GREEN.

```
  architecture guards           1028 file-checks, 44 guards proven
  typecheck                     no type errors
  format / lint                 clean
  unit tests                    870 passed
  stylesheet growth budgets     within budget, 244 B spare on ui.css
  assistive-technology evidence PENDING (expected in phase `tenancy`)
```

**This is not the gate.** Ten stages did not run: generate cleanliness, property
tests, contract tests, tenancy + policy proof, integration tests, migration
compatibility, build, per-route performance budgets, selected E2E, gate leaves no
trace. `pnpm verify` is owed by a human before this is committed — and `generate
cleanliness` is the one to watch, because `tokens.json` was touched and reverted.

## The hole that is still open

The incursion was removed. Nothing yet stops the next one.

E24 is prose, and law 29 says invariants are enforced by guards, not prose. Two
candidate closures, neither built:

```
  path        broaden no-bespoke-styling's `applies` from apps/web/app/** to
              apps/web/** (minus api/, minus tests). Strict superset; flags
              nothing in the tree today, verified. Closes the directory hole.

  dependency  refuse a styling or primitive library in apps/web/package.json --
              tailwindcss, radix-ui, class-variance-authority, tailwind-merge.
              This is the one that catches `npx shadcn add` at the moment it
              runs, rather than after someone writes a className.
```

The path guard is one line and clean today. The dependency guard is the one with
teeth, and it is also the one that needs a decision about its exact list.
