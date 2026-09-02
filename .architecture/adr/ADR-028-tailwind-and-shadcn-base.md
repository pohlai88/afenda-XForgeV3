# ADR-028 — Tailwind v4 styles packages/ui, and shadcn on Base UI is its component base

**Status:** Accepted · migration in progress · 2026-09-02
**FROZEN when:** one primitive has migrated end to end and AQS-028 below passes.

## Context

Building a screen costs a session. Every primitive in `packages/ui` is
hand-authored: 26 components, 851 lines of `xf-*` CSS, each variant a `data-*`
attribute with a matching rule. The design system is strong — 33 contracts, four
conformance suites, a generated token pipeline with a policy kernel — and it is
also the reason there is no cheap way to add a screen.

The failure mode this addresses is not aesthetic. It is that the cost of a new
surface is high enough that the first urgent screen will be built outside the
system, which is exactly what happened on 2026-09-02: `npx shadcn@latest add`
installed 17 Radix components, Tailwind v4 and six dependencies into
`apps/web/components/`, a directory no guard reaches. It turned the gate red,
was quarantined, and is recorded in
`.architecture/history/ui-incursion-repair-2026-09-02.md`.

Two facts about the canonical document shaped this decision, and both were
counted rather than recalled:

- `architecture-final.md` **endorses shadcn**. §4's FROZEN system shape reads
  `Next.js · React · shadcn`, and line 1119 records
  `Open-code UI primitives | shadcn on Base UI (verified, §C.1) | REVERSIBLE`.
- `architecture-final.md` **never mentions Tailwind** — `grep -ni tailwind`
  returns nothing. It appears only in the superseded `history/architecture-1.md`
  and `-2.md`. Tailwind is absent from the canonical document, not rejected by
  it. It was dropped by deletion, with no argument recorded.

## Prior art

### Approaches reviewed

**Evidence-register E24 (2026-09-02) rejected the shadcn stack** on three
grounds: Radix beside Base UI (law 30), Tailwind utilities at call sites, and
`className` variants against `no-bespoke-styling`. This ADR reverses one of those
three and answers the other two rather than overruling them. E24's own closing
line — "`npx shadcn@latest add` would have installed the first of those
silently" — proved correct within hours, and is the reason the registry choice
below is stated as a requirement rather than a preference.

**The first ground has dissolved on the facts.** shadcn-studio emits Base UI: a
studio Accordion block opens with
`import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'` —
the same package `packages/ui` already pins, in the same subpath style as
`index.tsx:18-24`. So the Base UI registry introduces **no second primitive
library**, law 30 is not engaged, and `architecture-final.md:1119` is satisfied
exactly rather than reversed. The Radix registry remains available and is not
what this repository uses.

**The second and third grounds are answered by scope, not by exemption.**
`no-bespoke-styling` already exempts `packages/ui/**` and governs
`apps/web/app/**` and `modules/*/ui/**`. Keeping utilities inside `packages/ui`
means Phase 2's exit criterion — "built entirely from system primitives, no
bespoke CSS" (`architecture-final.md:1137`) — stays true and stays checkable. No
guard is weakened and none is deleted.

### Evidence

| Source | Retrieved | Supports |
|---|---|---|
| [Tailwind CSS, Theme variables](https://tailwindcss.com/docs/theme) | 2026-09-02 | Theme variables live in namespaces, each driving a utility family; `@theme inline` makes utilities resolve a referenced variable rather than copy its value; shared theme variables belong in their own package in a monorepo |
| [Tailwind CSS, Colors](https://tailwindcss.com/docs/colors) | 2026-09-02 | The exact bridge shape used here: `:root{--x}` + `[data-theme="dark"]{--x}` + `@theme inline{--color-c: var(--x)}` |
| [Tailwind CSS, Functions and directives](https://tailwindcss.com/docs/functions-and-directives) | 2026-09-02 | `@source` declares files Tailwind does not auto-detect, including a workspace package |
| [shadcn/ui, Base UI as the default](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default) | 2026-08-31 (E18) | shadcn defaults to Base UI for new projects since July 2026; Radix still supported |
| shadcn-studio Base UI block, supplied by the user | 2026-09-02 | Studio blocks import `@base-ui/react/*`, so the block catalogue does not require Radix |
| `node_modules/@biomejs/biome/configuration_schema.json` (2.5.11) | 2026-09-02 | `formatter.useEditorconfig` defaults to `false`, and biome.jsonc overrides `.editorconfig` regardless |
| Local probe: `biome check --stdin-file-path=probe.css` | 2026-09-02 | Biome 2.5.11 parses `@import`, `@source`, `@custom-variant`, `@theme inline` and `@utility` with no `noUnknownAtRules` diagnostic |
| `@base-ui/react@1.7.0` package manifest, resolved from `packages/ui` | 2026-09-02 | 83 subpath exports including `./accordion`; the studio block's import resolves against the version already installed |

### What prior art does NOT prove

**It does not prove the bridge is correct.** Tailwind's documentation establishes
that `@theme inline` emits a reference rather than a value. It says nothing about
whether *this* projection of 71 roles into nine namespaces is injective, complete,
or sensibly named — only `assertTailwindProjection` and its unit tests speak to
that, and only `e2e/token-modes.spec.ts` can show a browser agreeing.

**It transfers no accessibility assurance.** E24 already recorded that shadcn
documents no ARIA of its own and defers to Base UI. That is unchanged here. The
A11y-3 debt — Combobox, CommandPalette, DataGrid, Dialog, Toolbar owed a recorded
screen-reader session — is neither reduced nor discharged by anything in this
decision, and every migrated primitive keeps the obligation its contract declares.

**One block is not the catalogue.** A single studio Accordion establishes that
studio blocks *can* be Base UI. It does not establish that every category is, and
the studio MCP's own block metadata exposes no registry field to check against.
Blocks are inspected on arrival; a Radix import in one is a finding, not a
surprise.

**The Biome probe covers parsing, not linting at scale.** It proves five v4
at-rules parse. It does not prove that Tailwind's *generated* output survives
`noDescendingSpecificity`, `noDuplicateProperties` or the other CSS rules the
preset enables, because no Tailwind output has been generated in this repository
yet.

## Decision

**ADOPT** Tailwind v4 as the styling system for `packages/ui`, and the shadcn
**Base UI** registry as its component base.

1. **Tokens keep their authority.** `packages/tokens/tokens.json` remains the only
   place a design value is decided. The Tailwind theme is a fourth generated
   output, `packages/tokens/generated/tailwind-theme.css`, emitted by
   `tooling/generators/tokens.mjs` under law 27 and byte-diffed by the `generate`
   stage. The projection is declared in
   `tooling/design-system/token-policy/tailwind.mjs` and fails closed: a token
   that is neither mapped to a namespace nor recorded in `UNPROJECTED` with a
   reason makes the generator throw.
2. **`apps/web` owns the pipeline only.** `tailwindcss` and `@tailwindcss/postcss`
   are devDependencies there, with `postcss.config.mjs` and the entry stylesheet,
   following Tailwind's own convention. No component lives in `apps/web`.
3. **`packages/ui` owns every component.** shadcn components are installed into
   `packages/ui/src/`, never `apps/web/components/`. Runtime helpers (`clsx`,
   `tailwind-merge`, `class-variance-authority`, `lucide-react`) are
   `dependencies` of that package, because `production-source-declares-what-it-imports`
   refuses a source import of a devDependency.
4. **Business screens are unchanged.** They compose primitives and carry no
   `className` and no `style`. `no-bespoke-styling` is not weakened.
5. **Migration is incremental and contract-preserving.** A primitive keeps its
   contract id, `interaction.profile`, slots and `revision`; only its styling
   implementation changes. The conformance suites derive their subjects from the
   registry, so they keep proving the same properties across the swap.

## Alternatives considered

**Keep hand-authored `xf-*` CSS.** Rejected: it is the named, measured pain. The
incursion is the evidence that the cost is already being routed around.

**Tailwind at business-screen call sites.** Rejected. Utilities at a call site are
what permit `mt-[13px]`, which is precisely what Phase 2's exit criterion forbids.
Adopting it would require deleting that criterion, and ADR-024's rule says the
guard is deleted in the same commit — so the cost is an exit criterion replaced,
not merely relaxed. Nothing needs it: `packages/ui` is where styling lives.

**The Radix registry, for the studio block catalogue.** Rejected on the facts
rather than on principle: studio blocks import Base UI, so Radix buys nothing and
costs a second primitive library that law 30 refuses without a named pain.

**Big-bang rewrite of all 26 primitives.** Rejected. It re-proves every
accessibility guarantee at once and re-incurs the A11y-3 debt across the whole
set, in exchange for arriving at the same place sooner.

**A hand-written `@theme` block.** Rejected. It would be a second home for 71
semantic facts and would go stale on the first rename, silently — Tailwind drops
an unresolvable reference exactly as CSS does. This is the defect `CLAUDE.md` is
organised against, and the generated bridge is correct by construction instead.

## Consequences

**Positive.** Screens gain a utility vocabulary bound to the semantic tier, so
`bg-surface-page` responds to `[data-theme='dark']` and `p-stack` responds to
`[data-density='compact']` without any component knowing. shadcn and studio blocks
become usable source material. The token file stays the single authority.

**Negative, accepted knowingly.**

- **Two styling systems coexist inside `packages/ui` during migration.** This is
  the shape `CLAUDE.md`'s review prompt warns about, and it is time-boxed rather
  than permanent. It is tracked by `xf-class-has-rule`, whose governed set shrinks
  as migration proceeds.
- **`xf-class-has-rule` loses coverage silently.** It matches only static
  `className="…"`, so moving a component to `className={cn(...)}` removes its
  classes from that guard with no signal. When the last `xf-*` class goes, the
  guard governs zero files and goes blind — a stage failure unless it is given a
  `dormant:` reason or deleted in the same commit.
- **Pasted blocks need a geometry pass.** `--spacing-*` and `--radius-*` are bound
  to Xforge tokens so the density axis keeps governing, which means a block's
  `px-5` resolves against a scale with no `5` step. This is a deliberate trade:
  density holding is worth a review pass per block.
- **The A11y-3 debt is unchanged.** Five contracts still owe a screen-reader
  session, and no part of this decision reduces that.

## Migration / rollback

Staged, each stage independently committable and green on `pnpm verify:fast`:
the ADR and the token bridge (done), the `apps/web` pipeline, shadcn landing in
`packages/ui`, the first primitive migrated (`Button`, chosen because it is
`native-control` and already covered by `e2e/native-control.spec.ts`), then
`no-bespoke-styling` broadened from `apps/web/app/**` to `apps/web/**` to close
the directory hole the incursion used.

**Rollback is cheap while the bridge is unconsumed.** Deleting
`tailwind-theme.css`, its projection module, its budget entry and the package
export returns the repository to its prior state; nothing imports the bridge
until the `apps/web` pipeline lands. After a primitive migrates, rollback is a
revert of that primitive's implementation — its contract never changed, so
nothing downstream of the registry moves.

## Verification

**AQS-028.** A migrated primitive renders correctly under both mode axes through
Tailwind utilities: `e2e/token-modes.spec.ts` asks Chromium what it computes for
that component under `[data-theme='dark']` and `[data-density='compact']`, and
gets different answers in each. That is the executable consequence — a bridge
built with a plain `@theme` instead of `@theme inline` fails it, and nothing else
in the gate would notice.

Standing checks that already cover parts of this:

```
  generate cleanliness   tailwind-theme.css byte-identical after regeneration
  unit                   assertTailwindProjection over the real token set, plus
                         seven refusals: unknown group, primitive exposed,
                         name collision, empty set, bad namespace, missing
                         keepGroup, stale exclusion
  css-budgets            the bridge carries its own budget entry, because an
                         unbudgeted stylesheet is measured by nothing
  workspace-aliases      the new package export resolves
```
