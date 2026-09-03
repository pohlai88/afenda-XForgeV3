# design-sync notes — @xforge/design

Repo-specific gotchas for future syncs. Read this before re-running anything.

## The build has no dist, and that is not a mistake

`packages/design` ships **source**: its `exports` map points at `./src/components/*.tsx`
and there is no build script, no `dist/`, and no `"."` export. The converter therefore runs
from a **sync entry package** at `.ds-sync/pkg/`, passed with `--entry`.

Why that package exists rather than pointing `--entry` at the real source: the converter's
synth-entry fallback walks `src/` and discovers **338** components — the 15 authored ones
plus every export of the 59 vendored files under `src/components/ui/`. The package.json
blocks those with `"./components/ui/*": null` (ADR-033) but the synth-entry path does not
read that null. `.ds-sync/pkg/index.ts` re-states the real public surface — one
`export * from` line per authored component — and `types: "./index.ts"` makes
`exportedNames` read exactly those 15.

**Adding a component to `packages/design/src/components/` means adding a line to
`.ds-sync/pkg/index.ts` AND an entry to `cfg.componentSrcMap`.** Nothing checks this; a
missing line silently drops the component from the sync.

## Callback and aria props are filtered out — two components need `dtsPropsFor`

`lib/dts.mjs` drops `on[A-Z]*` and `aria-*` props for anything it considers inherited from
another package. Its keep-rule is `fp.startsWith(pkgDir)`, and because `pkgDir` is
`.ds-sync/pkg` while the props are declared in `packages/design/src/components/`, every
Xforge-declared callback was silently filtered.

Measured: only **Combobox** (`aria-label`, `aria-labelledby`, `onValueChange`) and
**Switch** (`onCheckedChange`) declare such props, so `cfg.dtsPropsFor` hand-writes those
two bodies. Without them the design agent gets a read-only Combobox and a Switch that
cannot report a change.

The hand-written bodies also restore two things the extractor flattened: `ComboboxOption`
(referenced but never defined, which would fail `[DTS_PARSE]`) is inlined as a structural
type, and `value?: string | null` keeps its `| null` — undefined is uncontrolled, null is
controlled-empty, and they are different states.

**If a new component declares an `on*` or `aria-*` prop, it needs a `dtsPropsFor` entry
too.** Check with:
`awk '/^export (interface|type) [A-Za-z]+Props/,/^\}/' <file> | grep -E "on[A-Z]|aria-"`

## CSS: compiled from the app's own entry, and byte-checked against it

The design package's `generated/*.css` carries tokens and the Tailwind theme bridge but
**no compiled utilities** — those exist only inside the `apps/web` build. A bundle built
from `generated/` alone renders every component unstyled.

So `.ds-sync/make-entry.mjs` DERIVES a Tailwind entry from `apps/web/app/globals.css`,
rewriting only the two `@xforge/design` package imports and the one `@source` (both resolve
relative to the file that writes them) and appending a second `@source` for
`.design-sync/previews/`. Everything else — the custom `@utility` blocks, the shimmer
keyframes, the reduced-motion block — is copied verbatim.

That entry is compiled by `@tailwindcss/cli` (installed into `.ds-sync/`, never the repo
lockfile) to `.ds-sync/pkg/utilities.css`, which `cfg.cssEntry` points at. `cssEntry` is
bounded to PKG_DIR, which is why it lives inside the sync package rather than under
`.design-sync/`.

**Proof it is faithful:** compiling the derived entry and the app entry produced
**byte-identical** output (221,778 bytes). Re-check that after any change to `globals.css` —
`make-entry.mjs` throws if the file stops matching its rewrite patterns, which is the
tripwire for "someone edited globals.css and the sync entry went stale".

**Preview classes must be scanned.** Authored previews live in `.design-sync/previews/` and
that directory is a second `@source`. A preview using a class no component uses still
compiles — but only because of that line.

## Fonts: IBM Plex is declared by the repo and shipped by nobody

`tokens.css` declares `--font-sans: IBM Plex Sans, …` and `--font-mono: IBM Plex Mono, …`,
and the repository contains **no `@font-face`, no `next/font`, no font link and no font
files at all**. The application renders in the fallback stack today.

The sync ships the real families via `cfg.extraFonts` pointing at `@fontsource/ibm-plex-*`
(installed into `.ds-sync/`): sans 400/500/600 and mono 400, the four weights the semantic
weight roles actually resolve to. Eight woff/woff2 files land in `fonts/` and are reachable
from `styles.css`'s import closure, which is what rendered designs receive.

**Consequence worth knowing:** the Design System project renders more correctly than
`apps/web` does. Fixing the app is a separate job and is not this sync's to do.

## Findings for the design system itself (not sync problems)

- **`Heading` level 2 and level 3 render identically.** `heading.tsx` maps
  `1 -> text-title` but both `2` and `3` to `text-heading`. The element differs (`h2`/`h3`)
  so the document outline is right; the visual rank is not. Same shape as the compact-density
  defect ADR-031 records: `TYPE_ROLES` asserts adjacent token ranks differ, but nothing
  asserts a component's level mapping yields distinct ones.
- **`ListItem` stretches its children.** It is `flex flex-col`, so a trailing `<Button>` in
  a row spans the full width. That is what `emergency-contacts.tsx` renders today.
- **`h-control` has no consumer.** It is a defined `@utility` in `globals.css` and nothing
  in `packages/design/src/` uses it, so Tailwind never emits it. `size-icon` is used (once,
  in `alert.tsx`).

## Known render warns — expected, do not chase

- `[TOKENS_MISSING]` naming `--available-height`, `--popup-width`, `--anchor-width`,
  `--positioner-*`, `--sidebar-width`, `--accordion-panel-height`, `--ratio` and similar.
  These are **Base UI runtime variables**, set by JS at render time; ADR-031's evidence
  table records them explicitly as "Base UI's to supply, not tokens to mint".
- `[RENDER_THIN]` on **Status** — it renders one line of muted text with no spinner by
  design. The announcement is the affordance.
- `tokens/` is emitted **empty**. `cfg.cssEntry` supersedes `cfg.tokensGlob`, and the
  compiled stylesheet already inlines all 250 custom properties with the alias chain intact
  (`--semantic-color-primary: var(--color-teal-700)`). Nothing is missing; the directory is
  cosmetic.

## The repo's fix hook reformats authored previews

`pnpm run fix` (`ultracite fix`) runs as a PostToolUse hook and **does** reach
`.design-sync/previews/`. It merges imports and sorts JSX props alphabetically. Harmless,
but it rewrites the file after you author it, so expect the bytes to change under you.
Because grades follow the authored `.tsx`, a reformat can clear a grade — if a no-change
run reports `grade cleared`, this is the first thing to suspect.

## Preview composition constraint

Previews compose **only** DS components — no utility classes of their own. That is
deliberate and matches ADR-034's closed-language law: an authored card that reached for
`flex gap-4` would be demonstrating a vocabulary the design system does not sanction.
`Stack`, `Page` and `ListItem` are the layout primitives; use them.

Corollary learned the hard way: `Stack direction="row"` lays children out shrink-to-fit and
`Card` sets no width, so side-by-side surfaces squeeze until their text escapes the border.
Three cells (Stack.Gaps, Card.SideBySide, Page.SurfaceContrast) were rebuilt for this.
Give a row's children enough content to hold their width, or use a column.

## Re-sync risks

- **`.ds-sync/` is gitignored**, and it holds the sync entry package, the derived Tailwind
  entry, the compiled CSS and the font packages. A fresh clone must re-run the dep install
  (`esbuild ts-morph @types/react playwright@1.62.1 @fontsource/ibm-plex-sans
  @fontsource/ibm-plex-mono @tailwindcss/cli`), re-create `.ds-sync/pkg/` and re-run
  `make-entry.mjs` before the converter. **Everything in `.ds-sync/pkg/` is reconstructable
  from this file, but nothing reconstructs it automatically.**
- **`.ds-sync/pkg/index.ts` duplicates the component list** that `package.json` exports and
  `cfg.componentSrcMap` pins — three copies of one fact. Nothing keeps them in step. If a
  sync reports fewer than 15 components, this is why.
- **The Tailwind compile is pinned to whatever `globals.css` says today.** A new
  `@utility` block there reaches the bundle only after `make-entry.mjs` + a recompile.
- **Playwright 1.62.1 was chosen because it pins chromium 1234**, which was already in the
  local browser cache. On another machine, re-derive: read
  `node_modules/playwright-core/browsers.json` as a file and match the cached
  `chromium-<build>` directory name.
- **Only two components were verified interactively** (Switch, Combobox) and that proof
  lives in the repo's own Chromium suite, not here. The preview cards are static renders;
  no hover, focus-visible, open-popup or drag state is captured anywhere in this bundle.
