# ADR-034 — Xforge is a closed design language

**Status:** Proposed · 2026-09-03 · **All ten migration steps and the follow-through are built**,
the same day (`88dceb6` … `f4c4e40`; each step's DONE note below names its commit). The colour and
typography contracts exist and their refusals are tested RED-first. Per-channel colour
capability is enforced by emission: 52 `@utility` blocks, no colour role projected into
`--color-*`, and an empty shim table, because no Adapter imports a vendored file any more.
`generated/style.ts` and `style-manifest.json` carry 159 semantic symbols and replace
`token-names.json`; every authored recipe selects those symbols and no Target exposes
`className` or `style`; the app no longer scans the vendored tree for classes; the numeric
spacing scale is closed and the zero is a role; arbitrary bracket values are refused on any
prefix. The qualification tests are written and green on the author's machine, and three
evidence-reviewer passes are recorded below; that is the whole qualification this repository
runs (CLAUDE.md, Repository workflow: no CI by decision). No section is FROZEN yet: the freeze
is the owner's call on that evidence, not a gate this ADR is waiting for.

**Measurements in the Context below are the ones the decisions were taken on**, made on
2026-09-03 before the steps ran. Where a step changed a figure, the sentence says so or the
step's DONE note carries the new one; a figure with no such mark is unchanged.

**Simplified on the owner's review, 2026-09-03.** The first draft (commit `ca61f6a`, kept
whole in history) ran to eight decisions because it was answering three questions at once:
what the Xforge design language is, what shape every Xforge component follows, and how a
foreign component is translated into one. Only the first is this ADR's. The second and third
are ADR-031's, and it already answers them — the Adapter file schema is the component shape,
the Adaptation Protocol is the translation. This revision keeps the first draft's
measurements and evidence, drops its component-grammar reasoning, and folds eight decisions
into five. The superseded argument is not reproduced inline; `git show ca61f6a` is the
artefact.

**Relates to:** ADR-031 (the component language; Decision 12 there is the consuming side of
this ADR), ADR-029 (one UI system), ADR-028 (Tailwind v4 + shadcn base), ADR-033 (the vendored
tree is unexported), ADR-024 (a guard whose name overclaims is worse than none).

## The law

> **Xforge is a closed design language. Every design-bearing value and every design-bearing
> CSS capability is declared before use. Tokens define values; policy defines meaning,
> relationships, pairing and permitted CSS use; the compiler emits the only legal styling
> vocabulary. Tailwind may compile that vocabulary but may not enlarge it. Components may
> select from it but may not invent in it.**

```
  NO UNDECLARED VALUE.
  NO UNDECLARED CLASS.
  NO INFERRED RELATIONSHIP.
  NO UNDECLARED PIXEL.
  NO FOREIGN STYLE LEAKAGE.
```

## What this ADR owns, and what it does not

It answers one question: **what styling vocabulary is legal in Xforge, and how is that
vocabulary declared and generated.**

```
  OWNS                                   DOES NOT OWN  (ADR-031)
  colour roles and their companions      what props Button has
  typography roles                       what slots Combobox has
  spacing, radius, motion, elevation     whether Card carries a recipe
  breakpoints and layout values          how Switch exposes checked state
  which CSS channel a role may use       how shadcn Button maps onto Xforge Button
  what pairs with what                   what a component file looks like
  the generated style symbols
```

The two ADRs meet at one artefact. This one emits `generated/style.ts`; ADR-031's components
consume it and nothing else. In one line each: **ADR-034 is the dictionary. ADR-031 is the
grammar. An Adapter is a translator. A component is a sentence.**

```
  ┌───────────────────────────────┐
  │ ADR-034  closed design        │  tokens.json → policy/ → generator
  │          language             │
  └──────────────┬────────────────┘
                 │ generated/style.ts, generated CSS   (consume only)
                 ▼
  ┌───────────────────────────────┐
  │ ADR-031  component language   │  provenance · style selection · contract ·
  │                               │  target · adapter
  └──────────────┬────────────────┘
                 ▼
             component  →  application
```

## Context

### What already exists, and is one compiler

A design arrived proposing an *Adaptive Schema Engine*: a five-stage compiler emitting an
*Adaptive Style Manifest*, beneath an *Adaptive Component Schema*, with ADR-031's Adapter on
top. It named a real gap and assumed a repository that does not exist here. Its motivation
was four generators diverging. There is one: `packages/design/policy/generators/tokens.mjs`
(1,462 lines when measured; 1,499 after step 11, which removed the alias emitter) runs `flatten` → `resolve` → `readMode` → the `assert*` family → `emit` and
writes its artefacts from one resolved graph — `tokens.css`, `tailwind-theme.css`,
`twmerge.ts`, `FOUNDATIONS.md`, and since step 6 `style.ts` and `style-manifest.json` in
place of `token-names.json`.

Three of the proposal's five stages are already enforced with tests that go red:

```
  TOKEN GRAPH   flatten() inherits $type down from the declaring group; TIER_OF_GROUP
                classifies every top-level group explicitly, so `colro.blue.600` is a
                refusal rather than a silent primitive
  ALIAS GRAPH   resolve() + ALLOWED_EDGES + FORBIDDEN_EDGES: component → primitive is
                refused, so is a cycle, so is an alias to nothing
  MODE GRAPH    $modes has two axes — theme owns colour, density owns geometry — and a
                token claimed by both is refused, because their selectors tie on
                specificity and emission order would decide
```

`policy/vocabulary.mjs` (944 lines then, 955 now) proves the CSS projection injective
(`assertUniqueCssNames`), states DTCG conformance type by type (`DTCG_VALUE_COMPATIBILITY`),
and keeps `TOKEN_CONTRACT_VERSION` apart from `DTCG_VERSION`.

The fourth stage exists in a stronger form than proposed: `TYPE_ROLES` in
`policy/foundations/typography.mjs` binds each role to size, weight and leading and carries
what a DTCG composite cannot — a pixel floor, a leading floor, a rank, and a per-mode
assertion that adjacent ranks differ in size or weight. That assertion exists because a defect
shipped: compact density once rebound `heading` onto `body`'s step, every token stayed valid,
and nothing caught it.

### What does not exist: declared relationships

When measured, before step 3, the 48 semantic colour roles collapsed to **26 stems in four
shapes**:

```
  base + foreground + hover + pressed   accent, primary, secondary                    3
  base + foreground + hover             destructive                                   1
  base + foreground                     card, disabled, error, info, muted, popover,
                                        sidebar, sidebar-accent, statutory,
                                        success, warning                             11
  base only                             background, border, field, foreground, input,
                                        ring, scrim, shadow-ambient, shadow-key,
                                        sidebar-border, sidebar-ring                 11
```

`destructive` had a hover and no pressed, and nothing in the repository could say whether that
was a decision or an omission — the motivating defect. Step 3 answered it by minting
`destructive-pressed` (49 roles; the second row above is empty and the first holds four). That `card` pairs with `card-foreground` is carried entirely by
a naming convention no check reads. The stem is the model — the sixth appearance of the
defect `CLAUDE.md` keeps a list of: a fact with two sources that agree until they do not.

Typography was not parallel either. Measured 2026-09-03 after ADR-031 step 7 added `display`
and before this ADR's step 7 added `subheading` and step 11 deleted the two shim tokens (type 9,
weight 6, leading 8, tracking 1 now):

```
  semantic.type       8   caption body-compact label body emphasis heading title display
  semantic.weight     7   caption body-compact body label emphasis heading medium
  semantic.leading    7   caption compact label body heading title display
  semantic.tracking   2
```

`weight` had no `title` or `display` (both borrowed `heading`'s) and carried an orphan
`medium`; `leading` said `compact` where `type` said `body-compact` and had no `emphasis`;
`tracking` covered two roles. Each gap was either a decision or an omission, and the table
could not say which. Step 4 made it say: `title` and `display` reuse `heading`'s weight
explicitly, `emphasis` reuses `body`'s leading, `weight.medium` was a listed shim with its
reason until step 11 deleted it, and `compact` against `body-compact` was renamed in that same
step.

### What the authored layer renders

Measured 2026-09-03 across the 15 authored components in
`packages/design/src/components/*.tsx`, `apps/web/app/**`, and the 59 vendored files under
`components/ui/`. REACHABLE is the transitive import closure of the four vendored files the
Adapters import (`button`, `card`, `combobox`, `switch` → plus `input`, `input-group`,
`textarea`): 7 files before step 8, and 0 after it — no Adapter imports a vendored file now. Counted by regular expression over class strings, so the figures are
the order of magnitude, not an audit.

```
                                        AUTHORED (15)   APP    VENDORED (59)   REACHABLE (7)
  numeric spacing / size utilities            6           0         741             106
    ...of which are non-zero                  0           0         741             106
  opacity modifiers  (bg-x/50)                0           0         160              50
  arbitrary [...] design values               0           0          65              16
  role-named spacing utilities               16           —           0               0
```

**The authored layer already lived under the law.** Its six numeric classes were `m-0` and
`p-0` — resets, not design values, and since step 9 the role `space.none`. Its bracketed expressions are attribute selectors
(`[variant]`, `[tone]`, `[level]`). Its spacing is `gap-tight`, `px-row-x`, `py-control-y`,
`py-section`, `px-related` — role names, every one. So **the cost of every closure below
falls on the vendored tree**, which ADR-031 Decision 7 never edits and ADR-033 never exports.
That single fact is what makes Decision 3 tractable.

### The tenth namespace

Nine Tailwind namespaces are closed in `generated/tailwind-theme.css` with `--<ns>-*:
initial`: `color`, `font-weight`, `text`, `leading`, `tracking`, `shadow`, `radius`,
`breakpoint`, `container`. **The tenth was not**: numeric spacing is Tailwind's `--spacing`
MULTIPLIER, not a namespace, and it survived while the same file projected twenty role names
(25 now) beside it, so `p-control-x` and `p-13` compiled side by side — the
two-scales-on-one-prefix defect that `CLOSURE_REASON.radius` records as the reason radius was
closed, live in a tenth place nobody had looked at. Closed in step 9 (`e352b39`).

### The capability hole

`--color-*` is a namespace, not a channel. Projecting `semantic.color.scrim` made
`bg-scrim`, `text-scrim` and `border-scrim` all real; one of them meant something. The
generator had solved this once, coarsely: `shadow-ambient` and `shadow-key` were withheld from
projection, and the generated header said why. But the lever was all-or-nothing — a role was
projected into every channel its namespace implies, or into none. Step 5 (`3ad8ce8`) made the
lever per channel; step 8 (`3edbc58`) made the emission total. No colour role projects into
`--color-*` today.

## Prior art

**The repository's own compiler and policy trees** are the closest prior art: three stages,
determinism, injectivity, tier direction, nine closures, one capability refusal with its
reasoning recorded. Any new mechanism must say why it is not a second copy of one of those.

**W3C DTCG 2025.10** — composite tokens, `$type` inheritance, aliasing, and the rule against
inferring meaning from group membership. **Tailwind CSS v4** — namespaces decide which
utilities exist; `--*: initial` empties a namespace; `--spacing` drives numeric utilities by a
formula; `@source not` bounds detection. **Figma variables** — per-variable `scopes`, cited
by the proposal, and the citation says less than the proposal used it for. **Material 3
colour roles** — cited for unpaired roles being first-class; **retrieval failed twice**
(navigation shells, no content) and it is not relied on.

### Evidence

Retrieved 2026-09-03 by the first draft's author; **all four re-fetched for this revision**
and every quoted sentence found on its page (the Figma variables reference now lives at
`developers.figma.com/docs/rest-api/variables-types/`; the old URL redirects). Register IDs: the
register has one number sequence. The 31 August block was numbered first and holds E22–E28;
the two DTCG rows filed on 2 September as E22–E23 collided with it and are **E29–E30** since
the collision was resolved on 3 September; the four sources below are **E32–E35** (the first
evidence pass found them filed as E28–E31, colliding with the 31 August E28). Grades: E29 is a
published standard (S); the three Tailwind pages and the Figma reference are
vendor documentation (V). The primary-sources table carries no grade column; the register's
decision row grades the DTCG pair S, and this table says so beside the rows.

| Source | Supports |
|---|---|
| W3C DTCG *Format Module* 2025.10 §3.7 (repeated at the head of §6) — "Groups are arbitrary and tools _SHOULD NOT_ use them to infer the type or purpose of design tokens." (E29) | That "declare, never infer" is the published rule; the direct argument against deriving a family from a name stem |
| Same, §6.3 `$type` (the rule is numbered §6.7.3, Type Inheritance) — a group's `$type` is a default for tokens that declare none (E29) | The behaviour `flatten()` already implements |
| Same, Example 37 — a typography composite whose spec source enumerates `fontFamily`, `fontSize`, `fontWeight`, `letterSpacing`, `lineHeight` (E29). §9.8 (Typography) is truncated in every rendered fetch so far; the five come from the source markdown | That the composite exists; Decision 2 does not rest on its full field list |
| Tailwind v4 *Theme variables* — "Theme variables are defined in _namespaces_ and each namespace corresponds to one or more utility class or variant APIs"; "set the global theme variable namespace to `initial`… none of the default utility classes that are driven by theme variables will be available" (**E33**) | That closure is the supported mechanism — and that adding `--spacing-row-y` enlarges the namespace rather than replacing it |
| Tailwind v4 *Margin* — `m-<number>` → `margin: calc(var(--spacing) * <number>)`; the utilities "are driven by the `--spacing` theme variable" (**E34**) | That the numeric scale is derived from a multiplier, not enumerated. Unboundedness follows from the formula and is inferred, not quoted |
| Tailwind v4 *Detecting classes in source files* — "Use `@source not` to ignore specific paths… legacy components or third-party libraries"; `source(none)` (**E35**) | That the vendored tree can leave detection. See Decision 3 for what this does not buy |
| Figma REST API *Variables* — "Setting scopes for a variable does not prevent that variable from being bound in other scopes… This only limits the variables that are shown in pickers within the Figma UI." (**E32**) | That a shipped tool modelled per-variable scope, and that its scopes are advisory |
| Material Design 3 *Color roles* — "There are 26 standard color roles organized into six groups"; surface / primary–secondary–tertiary / container / on / variant as the words every role is built from; "apply colors only in the intended pairs or layering orders"; outline for "important boundaries, such as a text field outline", outline variant for "decorative elements, such as dividers" (**E37**, read 2026-09-04) | The colour-role grammar and the pairing law the tokens now follow: `surface`, `surface-lowest`, `surface-container`, `on-surface`, `on-surface-variant`, `primary` / `on-primary` / `primary-container`, `error` / `error-container`, `outline` / `outline-variant`, and `COLOR_PAIRS`. ADAPT: hover and pressed stay explicit fills where M3 uses state layers, and the status containers follow M3's custom-colour pattern with no high-emphasis fill |

For the relationship layer itself:

```
    prior_art_result: no-direct-match
    sources_examined: DTCG 2025.10 (composites enumerated; base/foreground/hover/pressed
                      is not among them); Figma variables (aliases, no modelled relation
                      BETWEEN variables); shadcn's paired-stem convention (a naming rule,
                      not a model); Material 3 (retrieval failed); this repository's
                      TYPE_ROLES (the closest match, and it is local)
```

### What prior art does NOT prove

- **DTCG's `SHOULD NOT` is about groups.** It rules out inferring a family from a prefix. It
  says nothing about whether a declared contract is right, or whether these 26 stems are
  correctly paired.
- **Tailwind documents closure; it does not endorse closing spacing.** E33 and E34 establish
  the mechanism and the multiplier. Whether to remove the numeric scale rests on the local
  measurement alone.
- **E35 proves `@source not` exists; it does not make it a fix.** Excluding the vendored tree
  from detection has the same visual consequence as closing the namespace: the classes go
  inert — which the page does not state; it is inferred, and proved here by the compile test.
  It bounds emitted CSS. It does not restore the padding.
- **Figma proves scopes are wanted and proves they are not enforced.** Reading it as support
  for normative scopes reads it backwards.
- **A DTCG typography composite is not precedent for migrating to one.** It has no field for
  a floor, a rank, or a per-mode hierarchy assertion.
- **Material 3 (E37) proves the grammar, not our values.** Its roles were retrieved on
  2026-09-04 and the colour roots were renamed and merged to its shape the same day. What it
  says nothing about is whether our 20 roots are the right rungs for a payroll product, whether
  ink.850 and ink.750 are the right dark surfaces, or whether keeping hover and pressed as fills
  rather than state layers costs anything; only `color-pairs.test.ts`, the distinctness check
  and the gallery proof say anything about those, and only on this tree.
- **Nothing external supports the words this ADR minted while building.** The semantic
  taxonomy in `STYLE_NAMES` was minted without a benchmark and renamed against Material 3 on
  2026-09-04 (`surface.default`, `ink.onSurface`, `accent.primaryContainer`, `error.container`,
  `outline.variant`); the `INTERACTION_STATES` mapping of Base
  UI's data attributes to roles (checked → primary, unchecked → field, highlighted → accent), and
  the rule that every state at rest excludes disabled so disabled wins by selector rather than
  by stylesheet order (added 2026-09-04 after the gallery proof measured the order winning);
  `pressed` as `:active` and `disabled` as `:disabled`; the switch track aliased to the control
  minimum and the target floor; the `subheading` and `space.none` roles; Button's outline
  hovering `secondary`; and channels declared per KIND rather than per role — every one is
  local design, qualified only by tests written the same day by the same hands, and graded by
  no source. The register's `no-direct-match` for the relationship layer covers what they
  extend, not them.
- **Nothing external qualifies any of this.** Only Verification does, on the author's machine,
  by the owner's decision to run no CI; its cases are written, red first, and green.

## Decision

### 1. One compiler. No new engine, no new vocabulary.

Stages 1–3 exist in `generate()`; stage 4 exists in `policy/`. Law 30: new infrastructure
requires a named, measured pain, and the pain here is missing tables, not a missing compiler.
`generate()` grows a contract-compilation step and more emitters; it does not acquire a
sibling. The names **ACS / ASE / ASM / Component Contract** are rejected as vocabulary: three
of the four rename things that already have names here — `tokens.json`, `policy/`, the
generator, `generated/`, and ADR-031's Adapter file schema. Four new nouns for existing
things is how ADR-031 measured 13,962 lines of policy against 503 of component.

### 2. Complete role contracts. Every design role declared, absence designed.

Every role a component may select is declared in `policy/foundations/*.mjs`, shaped after
`TYPE_ROLES`, with every field a reference, an explicit reuse, or `NONE`. **A missing field
is a defect and the generator refuses the file.** Colour and typography first, because they
are where the asymmetries were measured; spacing, radius, motion and elevation take the same
shape when a contract is first needed (law 31), not before.

**Colour — `COLOR_ROLE_CONTRACTS`.** All 26 roots declared, including the 11 with no
companion; the relationship lives inside the role, not in a generic wrapper:

```js
export const COLOR_ROLE_CONTRACTS = {
  primary:     { base: …, foreground: …, hover: …, pressed: … },
  destructive: { base: …, foreground: …, hover: …, pressed: NONE },   // or mint one
  card:        { base: …, foreground: … },
  scrim:       { base: … },
}
```

```
  a token reference   =  a designed value
  NONE                =  a designed absence — "no separate pressed colour exists"
  field missing       =  DEFECT, refused
```

The assertion is the decision, not the table: every root declared; every semantic colour
token owned by exactly one root; every reference resolves; every companion slot a reference
or `NONE`; **a token whose name carries a companion suffix but is not declared as that root's
companion is refused.** That last rule inverts the convention's authority — the suffix stops
being the model and becomes the thing checked against the model. The first run is expected
red.

**Typography — `TYPE_ROLES` completed, not moved.** It already is the typography composite
and holds what DTCG's has no field for; moving it into `tokens.json` would lose the floors or
split one fact across two homes. Every role declares `font`, `size`, `weight`, `leading`,
`tracking` — reference, explicit reuse, or `NONE`. The gaps measured in Context were work
items, all discharged: `title` and `display` reuse `heading`'s weight explicitly and `emphasis`
reuses `body`'s leading (step 4); `compact` became `body-compact` and `weight.medium` was
deleted with the alias table that needed it (step 11).

### 3. Closed CSS vocabulary. Tailwind compiles Xforge; it does not invent Xforge.

Three closures, one rule: **a design-bearing value or capability nobody declared cannot
compile.**

**Per-channel capability, enforced by emission.** A colour role's KIND declares the CSS
channels its roles may be used through (`text` and `inactive` roles through `text`; surfaces
through `bg`; `ui` roles through `border`, `outline` and `ring`; decorative roles through
`border`; compositing inks through none), and the compiler emits one `@utility` per channel and nothing
else: `bg-error` exists, `text-error` does not, and the compile test asserts both directions.
The draft wrote this per role; it was built per kind, one table instead of forty-nine entries.
A role stays projected into `--color-*` only under a SHIM — a declared list of the extra
channels or opacity modifiers a reachable vendored file still writes, held to that file by a
test — and **the shim table is empty since step 8**, so no colour role is in the namespace and
every one is `@utility`. This generalises what `shadow-ambient` already got, from per-role
all-or-nothing to per-channel. The cost measured before step 8: roles that leave the namespace
lose Tailwind's opacity modifier, which the authored layer and the application never used and
the then-reachable vendored files used 50 times. That cost was never paid: the Adapters
stopped importing those files.

**Close the numeric spacing scale.** It is Tailwind's `--spacing` multiplier, not a namespace
— `p-13` is `calc(var(--spacing) * 13)` — so clearing the variable closes the scale and leaves
the `--spacing-<role>` custom properties alone; `p-row-x` is the only way to say padding, and
the zero is a role (`space.none`) because `m-0` went with the numbers. The cost measured before
step 8: zero design values in authored code (six resets), zero in the application, 106
utilities across the 7 then-reachable vendored files — the classes that padded Card, Combobox
and Switch. **Sequencing was the whole risk**, and the risk was retired rather than paid: step
8 moved every Adapter onto Base UI or the element itself, so by step 9 no vendored file was
reachable and nothing lost its padding. `@source not` on the tree (step 8) and the closure
(step 9) then landed as flags, because there was nothing left for them to break.

**Refuse arbitrary `[...]` design values.** In authored code now (cost: zero; the bracketed
expressions there are attribute selectors). Everywhere else, on the same per-component
migration.

### 4. Generate the style contract.

From the same `generate()` call, two more artefacts: `generated/style.ts`, a typed tree of
symbols over the emitted classes — `STYLE.action.primary.background`,
`STYLE.radius.control`, `STYLE.type.label` — and `generated/style-manifest.json`, the same
facts for tools. `token-names.json` is subsumed and deleted in that commit (ADR-024: the
replaced check goes in the same change). Where Decision 3 closes a namespace, the compiler
emits the utilities that replace it from the same tables — role-named spacing is emitted
today. The composite utilities this decision also named — `type-*` setting all five
typography fields at once, `motion-*` pairing a duration with an easing, `elevation-*` for the
planes — are **NOT BUILT**: a typography symbol resolves to `font-heading text-title`, a motion
symbol to `duration-press`, elevation through the `--shadow-*` projection. They wait for a
consumer that needs the composite rather than the parts.

The consumer is the component: ADR-031 Decision 12 makes STYLE SELECTION hold these symbols
rather than authored class strings, which is what makes `style.ts` law-27 generated state with
a reader instead of an artefact only its own test opens. **Two obligations, named because
they are not free:** `design-system-classes.test.ts` enforces "every class names a role"
lexically, and symbol indirection defeats a lexical reader — the replacement check lands in
the same commit as the symbols or the guarantee lapses while looking stronger; and the
manifest is a projection of **style roles**, token-plane facts. A manifest that grows a map
keyed by component slot has crossed into ADR-031's plane and triggered its Decision 2 rather
than satisfied this one.

### 5. ADR-031 consumes it.

Authored components consume generated style symbols under ADR-031. Component structure,
public APIs, axes, states, accessibility contracts and adaptation of foreign UI remain
governed exclusively by ADR-031. This ADR defines only the vocabulary those components may
consume. Nothing more is decided here about components.

## Alternatives considered

1. **Build the ASE as a new subsystem.** Rejected; stages 1–3 exist and are tested. A second
   compiler over the same graph is the repository's named defect at subsystem scale.
2. **Infer relationships from `-foreground` / `-hover` / `-pressed` suffixes.** Rejected on
   DTCG §3.7 and on local evidence: inference is how `destructive`'s missing `pressed` stays
   invisible, reporting the same green whether the design is complete or not.
3. **Declare contracts in `tokens.json` under `$extensions.xforge`.** Rejected. Values live in
   `tokens.json`, rules in `policy/`; `TYPE_ROLES` is the precedent.
4. **Represent designed absence by omitting the field.** Rejected: omission and defect become
   indistinguishable, the exact failure this ADR is about.
5. **Keep the numeric spacing scale and lint against it.** Rejected. A lexical lint over
   utilities is the weaker half of a pair ADR-031 already chose between; `CLOSURE_REASON.color`
   records why removal beats detection: the utility does not exist.
6. **`@source not` on the vendored tree instead of closing namespaces.** Rejected as a
   substitute, adopted later as a complement: it bounds emitted CSS and leaves the numeric
   scale available to any file still scanned.
7. **Adopt Figma's `scopes` as published.** Rejected: advisory scopes under a normative name is
   the overclaiming ADR-024 refuses. Capability is enforced by emission instead.
8. **Decide the universal component grammar here** (the first draft's Decision 6). Removed on
   ownership: it is ADR-031's, and ADR-031 Decision 12 has since taken it.

## Consequences

**Positive.** Every design-bearing value in authored code traces to a declaration, and the
authored layer already satisfies this; the gap is the vendored tree. `destructive` gets an
answer on the record, and so does every other silent asymmetry. The tenth namespace loses the
two-scales defect the seventh already lost. `text-scrim` stops existing rather than being
documented as a known hole. ADR-031 gets the closed vocabulary its Decision 12 presupposes.

**Negative, accepted.** The reachable vendored primitives lose their padding as closures land
— 106 classes across 7 files — which is why Decision 3 is sequenced per component. Several
first runs are red, and clearing them is design work: minting or reusing weights and leadings,
answering `destructive`. Symbol-composed recipes defeat the lexical class check and change
ADR-031's schema; both are replaced in the same commits, not after. Hand-written `@utility`
blocks are more generated CSS to keep deterministic than a namespace projection was.

## Migration / rollback

Ordered, each step its own commit. Steps 1–4 must leave `packages/design/generated/`
**byte-identical**: a declaration and an assertion are not a projection, so if `tokens.css`
moves, the step is wrong.

```
   1  COLOR_ROLE_CONTRACTS in policy/foundations/color.mjs — all 26 roots, NONE allowed
                                                            DONE 88dceb6, byte-identical
   2  assertColorRoleContracts(), wired beside assertColorPolicies.
      WRITE THE TESTS FIRST AND WATCH THEM FAIL                DONE 04199cc: seven red first
   3  clear the red: destructive's pressed, and every slot the assertion names
                                                            DONE 04199cc, with step 2 --
                                                            a generator that refuses the
                                                            shipped file is not a state to
                                                            check in; the red is recorded
   4  complete TYPE_ROLES — five fields per role; mint, reuse or NONE
                                                            DONE d4f31dc, byte-identical;
                                                            164bc22 fixed the tracking
                                                            measurement it exposed
   5  declare css capabilities per role; emit narrow roles as @utility; withdraw them
      from --color-*                                     (generated output CHANGES here)
                                                            DONE: channels per KIND, not per
                                                            role; COLOR_CHANNEL_SHIMS keeps a
                                                            role whole while a reachable
                                                            vendored file still needs it, and
                                                            a test holds every shim to that
                                                            file. 40 utilities, 8 namespaced
   6  emit style-manifest.json and style.ts from the same generate(); delete
      token-names.json in the same commit                    DONE: STYLE_NAMES in
                                                            foundations/style.mjs names the
                                                            26 colour roots semantically
                                                            (action.danger = destructive);
                                                            the other groups project from
                                                            their role tables; 124 symbols,
                                                            6 omissions with reasons; every
                                                            class compiles (test)
   7  move authored recipes onto STYLE.* symbols, replacing the lexical class check in
      the same commit                       (ADR-031 Decision 12 governs the recipe side)
                                                            DONE: 15 Adapters; a subheading
                                                            role minted for Heading level 3;
                                                            Targets drop className/style via
                                                            NativeProps; the literal check
                                                            became "no design-bearing
                                                            literal" (46 red before, 0 after)
   8  per component, move the Adapter's spacing onto role names, then @source not the
      vendored file it wraps                                  DONE: Button, Card, Switch,
                                                            Combobox each sit on Base UI or
                                                            the element and own the recipe;
                                                            no Adapter imports a vendored
                                                            file, the shim table is empty,
                                                            every colour role is @utility,
                                                            and globals.css @source-nots
                                                            components/ui. The component
                                                            tier gains its first four
                                                            tokens (the switch track)
   9  close --spacing-* once step 8 covers the reachable vendored files
                                                            DONE: `--spacing: initial` (the
                                                            multiplier, not a namespace);
                                                            space.none minted for the zero
                                                            resets it takes with it
  10  refuse arbitrary [...] design values in authored code (cost today: zero)
                                                            DONE: any prefix, values only;
                                                            predicate proved on upstream's
                                                            words; zero offenders
  11  follow-through: retire the vendor shims the ten steps made pointless
                                                            DONE: SCALE_ALIASES and its
                                                            emitter deleted (ADR-031
                                                            Decision 10's condition met);
                                                            semantic.weight.medium and
                                                            semantic.tracking.shortcut
                                                            deleted; TYPE_TOKEN_SHIMS empty;
                                                            semantic.leading.compact renamed
                                                            body-compact, its role's name
```

Steps 1–4 land alone and roll back by deleting the tables and assertions; nothing else
references them. Steps 5, 6 and 9 roll back in the generator (the channel emission, the two
style artefacts, the `spacing` closure). Steps 7 and 8 rewrote fifteen Adapters and
`globals.css` and roll back only by reverting their commits.

## Verification

Qualification test: **`packages/design/tests/tokens.test.ts`**, each case observed RED before
the table that satisfies it is written:

```
  a semantic colour token owned by no declared root              WRITTEN, red first (04199cc)
  a root declaring a companion slot that is neither a reference nor NONE       WRITTEN, red first
  a token whose name carries a companion suffix but is undeclared              WRITTEN, red first
  a typography role omitting any of its five fields                 WRITTEN, red first (d4f31dc)
  a typography token no role names and no shim lists                WRITTEN, red first (d4f31dc)
  a role used through a CSS channel its capability set refuses    WRITTEN, red first (step 5):
                                                                    text-error and
                                                                    bg-error-foreground compile
                                                                    to nothing, bg-error and
                                                                    text-error-foreground do
```

Two more landed with step 4 because the work exposed them: a shim a role also names is
refused (a stale list is a second source), and the shipped package configuration is run
through `generate()` with its own options and held to the committed `tokens.css` — the unit
suite had never run those options, which is how `d4f31dc` landed with the CLI generator red
while every case was green (`164bc22`).

Closure and emission, once step 5 lands — the check that a closed namespace is closed, which a
green generator cannot tell you:

```
  text-error compiles to no rule           DONE (step 5) — and border-scrim, bg-shadow-key
  p-13 compiles to no rule                 DONE (step 9) — and m-0, p-0, gap-2; p-none, m-none compile
  bg-error still compiles to a rule        DONE — the check fails in both directions
```

Scrim itself has no channel today: `compositing` declares none, and no authored or reachable
file paints with it. The first overlay Adapter declares `bg` for it in NORMALIZE, not before.

Determinism (laws 27 and 33) and the proof that steps 1–4 are declarative:

```
  pnpm gen:tokens && git diff --exit-code packages/design/generated/
```

The suite runs as `vitest run --project unit`.

**Recorded, not discharged.** The Material 3 citation failed retrieval twice and is not relied
on; if the unpaired-roles argument ever wants external support it needs a source that returns
content. `pnpm verify` does not exist in this checkout — `CLAUDE.md` describes
`verify:fast` / `verify` / `verify:ci` and a `tooling/verify/stages.mjs`, and as of 2026-09-03
`package.json` declares no `verify` script and `tooling/verify/` holds one directory with one file. An ADR must
name an executable proof, so the commands above are the ones that run; the drift belongs on
`CLAUDE.md`'s own list of policies written down that read like policies enforced.

## Review record

First draft 2026-09-03: eight decisions, two measurement passes, evidence table E22 (the DTCG
format module; E29 since the register's collision was resolved) plus four
sources then unregistered; committed whole as `ca61f6a`. Owner's review the same day: the
draft answered three questions at once, and Decision 6 spent its length routing the component
grammar back to ADR-031 — the signal that ADR-034 should stop there. This revision: Decision 3
folded into 2; Decisions 4, 7 and 8 folded into 3; the emission half of 8 into 4; Decision 6
reduced to Decision 5's one paragraph; the ownership boundary stated once at the top. The
draft's `REACHABLE (15)` was re-measured as **7** (transitive import closure from the four
files the Adapters import), and its vendored counts were re-measured by a stated method; the
figures changed, the conclusion did not. The four unregistered sources became register
entries, and the README index row was added, in the same commit as this revision.

First `adr-evidence-reviewer` pass, after all ten steps (HEAD `e2c0af2`): every quoted
sentence found on its page, all five register URLs resolve, every WRITTEN verification case
found, `gen:tokens` byte-identical, the unit suite green (407). Five blocking findings, all
folded in here: the Status paragraph still carried step-5/6 figures (forty utilities, eight
shimmed roles, 124 symbols) against a tree with 52, none and 159; the four sources had
been filed as E28–E31 while the 31 August table already held an E28 (now E32–E35; the E22
collision between the two tables is recorded, not resolved); Decision 3 described per-role
channel declarations and roles "keeping the projection" while the tree declares per kind and
projects no colour role, and its own test asserts so; Decision 4 named composite `type-*`,
`motion-*` and `elevation-*` utilities that do not exist; and "does NOT prove" said every check
was unwritten. Non-blocking, also folded in: the Context measurements are now marked as the
pre-step figures they are, with the post-step values beside them; three DTCG section numbers;
the three Tailwind sources regraded S → V; the typography shims' reasons, which cited a
vendored tree no longer scanned; the rollback claim for steps 7 and 8; and a new "does NOT
prove" bullet naming the words the build minted with no source behind them.

Second pass, after step 11 (HEAD `39170b1`): every first-pass correction holds; step 11
verified against the tree (no `SCALE_ALIASES`, no `weight.medium` or `tracking.shortcut`,
`leading.body-compact` present, the alias custom properties gone, the shim table empty); unit
407 green; `gen:tokens` byte-identical. One blocking finding, folded in: Context still said
`weight.medium` "is a listed shim" after step 11 deleted it. Non-blocking, folded in: "ten
steps" where there are eleven; the generator's line count moved again (1,499); weight 6 and
tracking 1 marked; the register misreported the first filing as E24–E27 (it was E28–E31);
ADR-031's "Deleted" paragraph credited the literal check with refusing `shadow-md` and
`tracking-widest`, which the namespace closures refuse and the check did not see — the check
now covers both prefixes; the `inactive` kind added to Decision 3's list; Decision 2's work
items marked discharged; Example 37's five sub-properties taken from the spec source, since
the rendered page truncates before §9.8; E22's grade stated (then E22, now E29). Not folded: the closure proof is
a Tailwind compile on one machine, which the last "does NOT prove" bullet already says.

Third pass, after the register renumbering (HEAD `e98a001`): all six sources re-fetched and
found; the renumbering complete and consistent; every second-pass correction holding; the tree
unmoved (52 utilities, no colour role in `--color-*`, 159 symbols, 248 custom properties);
unit 407 green; `gen:tokens` byte-identical. Two blocking findings, both in the register and
both folded in: E24 was two sources — the 31 August RLS post and a shadcn prior-art section
filed on 2 September — under a note that said a number is never reused, so the shadcn section
is E36 and its citations in ADR-028, ADR-029, two history files and `.mcp.json` carry the old
number beside the new; and the register's Xforge-proof column for this ADR still said "all
unwritten" against six written, green cases. Non-blocking, folded in: the numbering note now
says what is true — a number carries one source at a time and every move is recorded — since
E29 and E30 were themselves reissued; the 3 September block's intro regained its actual
rationale; two grade sentences corrected. Recorded without action: a unit run launched beside
`gen:tokens` timed out once on the `#generated/*` existence check while the generator was
rewriting the files, and passed alone — contention, not a defect.

Fourth pass, by the owner's instruction rather than a reviewer's (HEAD `07cf465`, 2026-09-04):
the colour roles compared one by one against Material 3's twenty-six (E37, retrieved at last —
the third pass had recorded it as never retrieved) and renamed to its grammar. Three words
lied: `action.secondary` was a white neutral, `action.accent` was the primary container,
`surface.muted.foreground` was the on-surface-variant ink paired in the contract with a fill
it rarely sat on. Four colours carried two names through shadcn's sidebar block. The dark muted
fill was pure black below the page. Twenty-six roots became twenty; ten tokens retired as
duplicates; light values unchanged; dark `surface-lowest` ink.850 and `surface-container`
ink.750, the first because ink.900 was 1.9 dE from the page and the distinctness check refused
it. The pairing law (`COLOR_PAIRS`, `color-pairs.test.ts`) is M3's first colour law made
mechanical, computed from the token file in both themes; every declared pair clears its floor,
the tightest at 4.52. `on-surface` and `on-surface-variant` are roots of their own because a
token is one role and three surfaces would have to claim one ink. Not decided: a tertiary
group, a secondary container as a tonal fill, the deeper surface ladder, inverse roles and the
fixed roles, each absent because nothing here has asked; and a coincidence to know, that
ink.750 is both the dark container and the dark disabled fill.
