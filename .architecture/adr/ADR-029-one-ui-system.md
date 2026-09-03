# ADR-029 — One UI system: Tailwind and shadcn on Base UI, decided at the token, not discovered by debugging

**Status:** Accepted · 2026-09-02
**Supersedes:** evidence-register E36 (filed as E36 until 3 September 2026)'s REJECT of the shadcn stack.
**Amends:** ADR-028, which staged this as an incremental migration. This decides the destination and the method; ADR-028's mechanics still hold where they do not conflict.

## Context

Two things forced this, and only the first is technical.

**The repository had two UI systems and a rule against having two of anything.**
`packages/ui` carried 851 lines of hand-authored `xf-*` CSS. Tailwind and shadcn
arrived beside it. Law 7 says a fact has one authoritative source; a styling
system is a fact.

**The working method was costing more than the work.** The migration proceeded
component by component, and each step surfaced a defect only when something
downstream used it: a font-weight role no utility could reach, a class that
generated nothing because the palette was cleared, a fixture that had quietly
become its own opposite. Every one was caught — the gate did its job — and every
one was caught LATE, after the code was written, by reading a failure.

That is the actual complaint this ADR answers. Not that the checks are wrong:
that discovering a naming decision through a red test is a slow way to make a
naming decision.

## Decision

**One system. Tailwind v4 utilities over shadcn's Base UI registry, inside
`packages/ui`. The `xf-*` stylesheet is archived, not maintained.**

And the method, which is the part that supersedes rather than repeats ADR-028:

1. **The token vocabulary is designed for how it is CONSUMED, not only for how it
   is stored.** A role's name has to read correctly as a utility class, because
   that is where it is written a hundred times. `--semantic-control-padding-block`
   is a good custom property and `py-control-padding-block` is not a good class,
   and the second fact was invisible while only the first was considered.
2. **Naming is settled in ONE pass over the token file, before components consume
   it** — not amended per component as each collision appears.
3. **Correctness is established by asking the compiler, once, for everything.**
   `tests/unit/tailwind-classes.test.ts` puts every token-driven class through the
   real Tailwind pipeline and fails on any that produces nothing. That replaces
   the discover-it-later loop for the entire class of silent-utility failures.
4. **Contracts are not styling and are retained.** All 33 keep their id, profile,
   slots and revision, so the four conformance suites and the ADR-025 evidence
   gate keep working across the rewrite unchanged.
   *(No longer true since ae4e294 deleted the registry on 2026-09-03. ADR-031
   replaces the registry with a table beside each component; see its Decision 1
   and §Beta. Left in place as the record of what this ADR decided at the time.)*
5. **Business screens are unchanged.** They compose primitives and carry no
   `className`. Phase 2's exit criterion stays true and stays checkable.

## Prior art

### Approaches reviewed

**E36 (2026-09-02) rejected the shadcn stack** on three grounds. One has since
been shown false on the facts — shadcn-studio emits Base UI, the same primitive
library `packages/ui` already pins, so there is no second primitive library and
law 30 is not engaged. The other two — Tailwind utilities and `className`
variants — are answered by scope rather than by exemption: utilities live inside
`packages/ui`, which `no-bespoke-styling` already exempts. E36's REJECT is
superseded; its reasoning is not discarded, and its warning that
`npx shadcn@latest add` would install Radix silently was correct and is why the
registry is named rather than assumed.

**`architecture-final.md` already endorsed the destination.** §4's FROZEN system
shape reads `Next.js · React · shadcn`, and line 1119 records
`Open-code UI primitives | shadcn on Base UI`. Tailwind appears nowhere in that
document — it did not survive from the superseded drafts — so adopting it is a
new decision, which is what this ADR is for.

### Evidence

| Source | Retrieved | Supports |
|---|---|---|
| [Tailwind CSS, Theme variables](https://tailwindcss.com/docs/theme) | 2026-09-02 | Namespaces drive utility families; `@theme inline` emits a reference rather than copying a value; `--color-*: initial` removes a namespace's defaults entirely |
| [Tailwind CSS, Adding custom styles](https://tailwindcss.com/docs/adding-custom-styles) | 2026-09-02 | `@utility` with `--value()` is the sanctioned way to add a utility for a property Tailwind has no namespace for |
| [shadcn/ui, Base UI as the default](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default) | 2026-08-31 (E18) | shadcn defaults to Base UI since July 2026 |
| shadcn-studio Base UI block, supplied by the user | 2026-09-02 | Studio blocks import `@base-ui/react/*`, so the catalogue does not require Radix |
| `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md` (Next 16.3.3) | 2026-09-02 | The prescribed Tailwind setup: devDependencies, `postcss.config.mjs`, `@import` in `app/globals.css`, imported from the root layout |
| Measured in this repository | 2026-09-02 | The bridge compiles: `bg-surface-page` → `background-color: var(--semantic-surface-page)`; `dark:` → `:where([data-theme="dark"], …)`; theme and density both move computed values in a browser |

### What prior art does NOT prove

**It does not prove this token vocabulary is right.** Tailwind's documentation
describes how namespaces resolve. It says nothing about whether `ink`, `line` or
`control-block` are good names for these roles, and no external source can — that
is a judgement about this product's own language.

**It transfers no accessibility assurance.** shadcn documents no ARIA of its own
and defers to Base UI. The A11y-3 debt — five contracts owed a recorded
screen-reader session — is unchanged by this decision, and `sessions` in
`.architecture/a11y-evidence.json` is still empty.

> **Corrected 2 September 2026, see ADR-030.** "Five contracts" was never the
> derived number: `contractsOwingAtEvidence()` returned six on the day this was
> written, while ADR-025 said one. It is **eight** under ADR-030, which adds
> `live-region`. The figure is left standing because three documents carrying
> three different numbers for one derived fact is the point — none of them was
> reading the derivation.

**Measuring that the pipeline compiles is not measuring that the product looks
right.** Nothing here is a visual regression check, and there is none in the gate.

## Alternatives considered

**Keep the `xf-*` CSS and use Tailwind only for new components.** Rejected by the
author: two styling systems permanently, which is the defect this repository is
organised against.

**Incremental per-component migration** (ADR-028's plan). Amended rather than
rejected — the destination was right and the pacing was wrong. Migrating first
and naming as collisions appeared is what produced the debugging the author
objected to.

**Rename tokens lazily, as each collision is found.** Rejected. It was tried for
two collisions and both were found by a failing test after the consuming code
existed.

## Consequences

**Positive.** One styling system. A token vocabulary that reads correctly at the
point of use. Every silent-utility failure caught by one check instead of by a
person noticing a page looks slightly wrong.

**Negative, accepted knowingly.**

- A single large rename touches the token file, the policy tables that key off
  token paths, the generated outputs, and every class string. It is mechanical —
  `tokens-referenced-are-tokens-that-exist` refuses a dangling reference — but it
  is not small, and a half-applied rename leaves dangling aliases (observed).
- Archiving `ui.css` ends `xf-class-has-rule`'s subject set. That guard goes blind
  and must be deleted or declared dormant in the same commit (ADR-024).
- `clsx` and `tailwind-merge` cost ~8.5 kB in every route carrying a primitive.
- The A11y-3 debt is unchanged, and rebuilding components does not reduce it.

## Migration / rollback

One pass over `packages/tokens/tokens.json` and the policy tables that key off
token paths, regenerated and verified against the compiler BEFORE any component
consumes the new names. Then components, in batches, against a vocabulary that is
already settled.

Rollback is `git revert` of the rename commit: the token file is the only source,
and everything downstream of it is generated or mechanically derived.

## Verification

**AQS-029.** `pnpm verify:fast` green with `tests/unit/tailwind-classes.test.ts`
passing over the whole design system — every token-driven class it writes
produces a rule from the real Tailwind pipeline. A rename that misses a
consumer, a token that projects into no namespace, and a typo are the same
failure to that test, and it is the check this ADR exists to put in front of the
work rather than behind it.
