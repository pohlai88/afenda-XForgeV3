# Typeset in the Xforge repository

**Read this before the rest of the skill when working here.** The general skill
describes a pattern that is correct in most projects and is largely refused by
this one. Where a general reference and this file disagree, the repository wins.

## The verdict, up front

**Do not port typeset into `@xforge/design` today.** Not because the guards
refuse it — that part is fixable — but because law 30 says new infrastructure
requires a named, measured pain, and the pain typeset exists to solve does not
occur in this repository yet.

Typeset styles *a tree you did not author*. This repository does not have one:

```bash
grep -rn "react-markdown\|remark\|rehype\|markdown-it\|marked\|mdx" \
  package.json apps/*/package.json packages/*/package.json modules/*/package.json
grep -rn "dangerouslySetInnerHTML" apps modules packages --include=*.tsx --include=*.ts
```

Both return nothing (measured 2026-09-02). There is no markdown renderer and no
raw HTML injection anywhere in the product. Every element on every screen is
authored as JSX and composed from `@xforge/design` primitives — `Text`,
`Heading`, `List`, `ListItem`, `Code`, `Table` — each of which already carries
its type role, its leading and its spacing from the token file.

Adopting typeset now would add a second typography authority governing zero
elements. That is the defect CLAUDE.md names in its own words: *a fact acquires a
second source, the two agree, and go on agreeing, until they do not.*

### What would change the verdict

One trigger, stated so it is recognised when it arrives rather than argued about:

> **A renderer enters the product that emits an element tree no component
> authored** — a docs site, a changelog page, an AI assistant rendering markdown
> responses, a CMS-backed marketing surface, a rich-text field.

At that point the pain is real and measured, and the shape below is the one to
build. Until then, record it as considered and rejected; do not build ahead of it.

## What the guards actually do to the vendor recipe

Measured by running this repository's guards against a candidate stylesheet and
screen, not inferred from reading them. Re-run it yourself with
`scripts/probe-guards.mjs` — the point of a bundled probe is that this table stops
being trustworthy the moment a guard changes, and the probe does not.

| Vendor construct | Verdict | Mechanism |
| --- | --- | --- |
| `<div className="typeset typeset-docs">` in a screen | **REFUSED** | `no-bespoke-styling` (law 6) — fires on any `className=` or `style=` in `apps/web/app/**` (outside `api/`) or `modules/*/ui/**` |
| `font-size: var(--typeset-size)` in `packages/design/src/**.css` | **REFUSED** | `stylesheet-names-roles-not-primitives` (law 8) — every `var()` there must name a **semantic or component tier** token; `--typeset-*` is in no tier |
| `line-height: 1.75`, `font-weight: 600` | **REFUSED** | `tokens-are-the-authority` (law 7) — both are governed properties |
| any hex / `rgb()` / `oklch()` | **REFUSED** | `tokens-are-the-authority` — colour is matched by pattern wherever it lands |
| `.dark .typeset { … }` | **Silently never matches** | Dark is `[data-theme="dark"]` here. `design.css` redefines `@custom-variant dark` precisely so two dark mechanisms cannot coexist |
| `--typeset-size: 15px` as a *declaration* | passes | `font-size` and custom-property names are not in the governed-property list |
| `margin-block-start: 1.25em` | passes | Lengths at large are documented as ungoverned, with the gap stated in the guard's own comment |
| `:where()`, `not-typeset`, one-direction flow, `+` separators | **ADOPT unchanged** | Nothing in this repository objects to any of it |

The last row matters as much as the refusals. **Typeset's structure is sound
here; only its values are not.**

## The refusal nobody sees

The three refusals above are all mechanical — something goes red and you fix it.
The important one is the fourth, and **no guard catches it**:

> `--typeset-size: 15px` is a font size `tokens.json` has never heard of.

`tooling/design-system/token-policy/form.mjs` proves the type scale keeps
hierarchy at every density and at every shared rank. Seven roles, each with its
leading paired to it, each landing on the 4px grid. A size introduced through a
typeset preset is outside that proof entirely: nothing checks its hierarchy,
nothing checks its leading lands on the grid, and no mode rebinds it.

Worse, it collides with an axis rule. POLICY.md §3c: **density packs information
and never touches type.** A typeset preset whose whole purpose is to vary type
size for a reading mode is therefore a *third* axis — and the two-axis law
refuses a token rebound by both, because their selectors have equal specificity
and the winner would be decided by generator emit order.

So a typeset preset here cannot be "type three numbers". That is the adaptation.

## The shape to build, when the trigger arrives

Four changes, and each closes one row of the table above.

**1. `typeset` becomes a semantic token group.** Add it to `TIER_OF_GROUP` in
`tooling/design-system/token-policy/vocabulary.mjs` at the `semantic` tier, and
declare the roles in `tokens.json` as aliases of existing semantic roles:

```jsonc
"typeset": {
  "size":    { "$value": "{semantic.type.body}" },
  "leading": { "$value": "{semantic.leading.body}" },
  "flow":    { "$value": "{semantic.space.normal}" }
}
```

`isGovernedName('--typeset-size')` then returns true and
`stylesheet-names-roles-not-primitives` passes — not by exemption, but because
the name has become a real role with a tier, which is what the guard was asking
for all along. The group name must not contain a hyphen, or
`assertGroupNamesProjectUnambiguously` refuses it.

**2. Presets rebind roles; they never carry numbers.** This is the whole
adaptation in one line:

```css
/* Vendor: three literals, governed by nothing */
.typeset-docs { --typeset-size: 15px; --typeset-flow: 1.5em; }

/* Here: three roles, each already proven by the type and spacing policies */
.typeset-docs {
  --typeset-size: var(--semantic-type-body);
  --typeset-flow: var(--semantic-space-loose);
}
```

Every value a preset can express is a value the generator has already checked for
contrast, hierarchy and grid alignment. The preset chooses among proven roles
rather than introducing unproven ones — which is a genuinely better position than
the vendor design, and is available only because this repository has the
semantic layer to choose from.

This is verified, not proposed. A stylesheet in this shape —

```css
.typeset {
  font-size: var(--semantic-type-body);
  line-height: var(--semantic-leading-body);
  color: var(--semantic-color-foreground);
}
.typeset :where(p) { margin-block-start: var(--semantic-space-normal); }
```

— passes every governing guard, measured with
`probe-guards.mjs --clean` at `packages/design/src/` (2026-09-02). All five token
names exist in `generated/token-names.json`. The same file one directory up
passes too, and that is the trap: `--clean` refuses it as **ungoverned** rather
than certifying it, because no design-system guard reaches outside
`packages/design/src/`.

**3. The container ships as a component, not a class.** `no-bespoke-styling`
refuses `className` in a screen, and it is right to: a screen that can write
`typeset typeset-docs` can write anything. So the wrapper is a primitive exported
from the barrel, and the preset is a prop:

```tsx
// packages/design/src/components/ui/prose.tsx
export function Prose({ children, preset = 'default' }: {
  readonly children: ReactNode
  readonly preset?: keyof typeof PRESET
}) {
  return <div className={cn('typeset', PRESET[preset])} data-slot="prose">{children}</div>
}
```

A screen then writes `<Prose preset="docs">{rendered}</Prose>` and styles nothing.
Export it from `src/index.ts`; do not export `cn`, for the reason stated there.

**4. Dark mode costs nothing, and that is the point.** Because rule 3 of the
general skill already says colour comes from theme tokens, and here those tokens
are `--semantic-color-*` which `[data-theme='dark']` rebinds, the vendor's
`.dark .typeset` block is not translated — it is *deleted*. There is nothing for
it to do.

## Placement and the guard boundary

If the stylesheet is ever written, it goes in `packages/design/src/` — and the
reason is not convention.

The three CSS guards all scope to `^packages/design/src/.*\.css$`. A
`typeset.css` in `apps/web/app/` would be outside every one of them: no literal
check, no role check, no token-existence check. It would pass `verify` while
holding exactly the values the whole token system exists to prevent.

**Unguarded is worse than refused.** A refusal is a red build; an unguarded file
is a green one that has inspected nothing, which is the ADR-024 failure this
repository names explicitly.

Note also that `apps/web/app/globals.css` holds one import and no design values
by design. A second `@import` there would create a second place where import
order is decided, and import order is what puts the density axis in charge of
spacing.

## Before freezing any of this

This is an exploratory sketch, and law 34 does not gate those. If it becomes a
decision — an ADR, or a commit that adds the token group — it needs the evidence
record: sources with retrieval dates, the alternatives reviewed, and the
load-bearing part, what the prior art does **not** prove.

For this one, that last section writes itself:

> shadcn/typeset establishes that a container-scoped, three-control rhythm model
> is a credible way to style unauthored markup, and that `:where()` plus an
> escape-hatch class is the right specificity contract. It proves nothing about
> whether three controls are the right granularity for a system that already has
> seven proven type roles, and nothing about whether the streaming contract pays
> for itself on a surface that does not stream. The verdict is **ADAPT** on
> structure and **REJECT** on values — and until a renderer exists, **REJECT**
> entire, on law 30.

## Checklist for an agent asked to "add prose styling" here

1. **Ask what emits the elements.** If the answer is JSX, this skill does not
   apply — compose `Text`, `Heading`, `List` and `Code` from `@xforge/design`,
   and add a variant there if none fits.
2. If a renderer genuinely emits the tree, say that the trigger above has been
   met and that the work is an ADR plus a token-group change, not a stylesheet.
3. Never write `className` in `apps/web/app/**` or `modules/*/ui/**`.
4. Never write a literal design value in `packages/design/src/**.css`.
5. Run `pnpm verify:fast`, and hand the full gate to the human — it is not an
   agent's to run.
