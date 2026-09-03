# ADR-034 — Xforge is a closed design language: every value, relationship and CSS capability is declared before use

**Status:** Proposed (amended) · 2026-09-03. **Nothing here is built.** No section is
FROZEN and none may be — law 34 gates a freeze on evidence, and the evidence here is a
measurement of the tree plus five verified external claims.

The first draft of this ADR was reviewed and found **too conservative in four places**. The
review was right, and a second measurement pass is why: the first pass measured the token
file and stopped. The second measured what the authored layer actually renders, and the
answer reframes every closure question in this document. **Decisions 2, 4 and 5 are
amended; Decisions 7 and 8 are new; part of Decision 6 is routed to ADR-031 rather than
taken here.** The superseded reasoning is kept in place and marked, because the argument is
the artefact.

**Relates to:** ADR-029 (one UI system), ADR-031 (component policy is authored — Decisions
1, 2, 7 and 9 are load-bearing here, and Decision 6 below identifies one amendment this ADR
cannot make on its own), ADR-024 (a guard whose name overclaims is worse than none),
ADR-028 (Tailwind v4 + shadcn base), ADR-033 (the vendored tree is unexported).

## The law this ADR is arguing for

> **Xforge is a closed design language. Every design-bearing value and every design-bearing
> CSS capability is declared before use. Tokens define values; policy defines meaning,
> relationships, pairing and permitted CSS use; the compiler emits the only legal styling
> vocabulary. Tailwind may compile that vocabulary but may not enlarge it. Adapters may
> consume it but may not invent it.**

Operationally:

```
  NO UNDECLARED VALUE.
  NO UNDECLARED CLASS.
  NO INFERRED RELATIONSHIP.
  NO UNDECLARED PIXEL.
  NO FOREIGN STYLE LEAKAGE.
```

The rest of this document is the measurement that says how far the repository already is
from that law, and which of the five lines it is actually failing.

## Context

A design arrived proposing an **Adaptive Schema Engine**: a five-stage compiler emitting an
**Adaptive Style Manifest**, beneath a static **Adaptive Component Schema**, with the
Adapter of ADR-031 on top. It named a real gap. It also assumed a repository that does not
exist here, and the difference between the two is most of this document.

The proposal's stated motivation was four independent generators diverging. **That state
does not exist.** `packages/design/policy/generators/tokens.mjs` is 1,453 lines and is one
compiler — `flatten` → `resolve` → `readMode` → the `assert*` family → `emit` — writing
**five** artifacts from **one** resolved graph: `generated/tokens.css`,
`generated/tailwind-theme.css`, `generated/token-names.json`, `generated/twmerge.ts`,
`generated/FOUNDATIONS.md`. The DRY argument in §18 of the proposal is an argument for the
architecture the repository already has.

### First pass — what the token plane already enforces

Stages 1 through 3 of the proposed pipeline exist, are enforced, and have tests written to
go red:

```
  TOKEN GRAPH     flatten() inherits $type down from the declaring group; TIER_OF_GROUP
                  classifies every top-level group EXPLICITLY, so `colro.blue.600` is a
                  refusal rather than a silent primitive
  ALIAS GRAPH     resolve() + ALLOWED_EDGES + FORBIDDEN_EDGES. `component -> primitive`
                  is refused; so is a cycle, and so is an alias to a token that does not
                  exist. tokens.test.ts has a case for each
  MODE GRAPH      $modes is a root property with two axes — theme owns colour, density
                  owns geometry — and a token claimed by both is refused, because their
                  selectors have equal specificity and emission order would decide
```

`policy/vocabulary.mjs` (944 lines) additionally proves the CSS projection injective
(`assertUniqueCssNames`), states DTCG conformance type by type
(`DTCG_VALUE_COMPATIBILITY`), and holds `TOKEN_CONTRACT_VERSION` separately from
`DTCG_VERSION` so a breaking rename and a format revision cannot be confused.

**Stage 4 exists in a stronger form than the one proposed.** `TYPE_ROLES` in
`policy/foundations/typography.mjs` binds each of seven roles to
`{ size, weight, leading, tracking? }` and then carries what a DTCG composite cannot: a
`minimumPx` floor, a `minimumLeading` floor, a `rank`, and `HIERARCHY_DIMENSIONS`
asserting two roles differ in size or weight **in every density mode**. That assertion
exists because a defect shipped: `density.compact` rebound `semantic.type.heading` onto the
same step as `semantic.type.body`, and at compact a heading and a paragraph rendered
identically. Every individual token was valid. Nothing caught it.

**Stage 5 does not exist.** 48 semantic colour roles collapse to **26 stems in four
shapes**:

```
  base + foreground + hover + pressed    accent, primary, secondary                  3
  base + foreground + hover              destructive                                 1
  base + foreground                      card, disabled, error, info, muted,
                                         popover, sidebar, sidebar-accent,
                                         statutory, success, warning                11
  base only                              background, border, field, foreground,
                                         input, ring, scrim, shadow-ambient,
                                         shadow-key, sidebar-border, sidebar-ring   11
```

`destructive` has a hover and no pressed. **Nothing in this repository can say whether that
is a decision or an omission.** The pairing of `card` with `card-foreground` — which
`tokens.json` describes in its own header as the one structural departure worth naming — is
carried entirely by a naming convention that no check reads. The stem is the model.

This is appearance six of the defect `CLAUDE.md` keeps a list of. A fact acquired a second
source: the intent that `x` and `x-foreground` are a contrast pair, and the suffix on the
name. They agree, and have gone on agreeing, and nothing complains in between.

The typography namespaces are not parallel either:

```
  semantic.type       7    body body-compact caption emphasis heading label title
  semantic.weight     7    body body-compact caption emphasis heading label medium
  semantic.leading    6    body caption compact heading label title
  semantic.tracking   2    body shortcut
```

`weight` has no `title` and carries an orphan `medium`; `leading` says `compact` where
`type` says `body-compact`, and has no `emphasis`; `tracking` has no per-role coverage.

### Second pass — what the authored layer actually renders, and why it changes the answer

The first draft stopped at the token file. That was the mistake, and it produced four
decisions that were too cautious. Measured on 2026-09-03 across the 15 authored components
in `packages/design/src/components/*.tsx`, `apps/web/app/**`, and the 59 vendored files in
`components/ui/`:

```
                                    AUTHORED (15)   APP     VENDORED (59)   REACHABLE (15)
  numeric spacing utilities              6           0           823            219
    ...of which are non-zero             0           0           823            219
  opacity modifiers  (bg-x/50)           0           0             —             61
  arbitrary [...] DESIGN values          0           0            29              —
  role-named spacing utilities          16           —             0              0
```

`REACHABLE` is the 15 vendored files an authored Adapter actually imports — `button`,
`card`, `combobox`, `dialog`, `dropdown-menu`, `input`, `input-group`, `label`, `separator`,
`sheet`, `skeleton`, `switch`, `textarea`, `toggle`, `tooltip`. The other 44 vendored files
are unreachable (ADR-033), so 604 of the 823 are already dead.

**The authored layer is already living the closed-language law.** All six of its numeric
spacing classes are `m-0` (5) and `p-0` (1) — resets, not design values. Its four
bracketed expressions are attribute selectors (`[variant]`, `[tone]`, `[level]`), not
arbitrary design values. It uses zero opacity modifiers. Its spacing is
`gap-tight`, `px-row-x`, `py-control-y`, `py-section`, `px-related`, `gap-normal`,
`gap-loose` — role names, every one.

So **the cost of every closure proposed below falls entirely on the vendored tree**, which
ADR-031 Decision 7 already declares is never edited and never exported, and which ADR-033
already made unreachable. That single row is what makes Decisions 4, 7 and 8 tractable
rather than reckless, and it is what the first draft failed to measure before deciding.

### The tenth namespace

Nine Tailwind namespaces are closed in `generated/tailwind-theme.css`:

```
  --color-*  --font-weight-*  --text-*  --leading-*  --tracking-*
  --shadow-*  --radius-*  --breakpoint-*  --container-*
```

**`--spacing-*` is not among them**, and the same generated file adds 19 role names into
it — `--spacing-control-x`, `--spacing-row-y`, `--spacing-section`, `--spacing-container`
and so on. Tailwind's `--spacing` multiplier is untouched, so `p-control-x` and `p-13`
compile side by side.

That is precisely the defect `CLOSURE_REASON.radius` records as the reason radius was
closed — *"the one where two scales were live at once… a reader could not tell which of the
two scales any class belonged to."* Spacing is namespace ten, it has the same defect, and
nothing has looked at it. It is also, again, the CLAUDE.md prompt working exactly as
intended: having fixed something in one place, ask what else holds a copy of that fact.

### The capability hole, and the precedent for closing it

`generated/tailwind-theme.css` projects 108 roles into `--color-*`, which is a namespace,
not a channel: projecting `semantic.color.scrim` makes `bg-scrim`, `text-scrim` and
`border-scrim` all real, and only one of them means anything.

**The generator already solved this once, coarsely, and wrote down why.** Its own header
lists what is *deliberately not projected*:

> `semantic.color.shadow-ambient` — an alpha ink consumed by the elevation tokens through
> `var()`, not by a utility. Projected, it made `bg-shadow-key` and `text-shadow-ambient`
> compilable classes that produce composited colour nothing can measure

That is the capability argument, already made, already acted on — but with an all-or-nothing
lever. A role is either projected with every channel its namespace implies, or not projected
at all. There is no way to say *background yes, text no*.

## Prior art

### Approaches reviewed

**The repository's own generator and policy trees.** The most relevant prior art is local:
stages 1–3, determinism, injectivity, tier direction, DTCG accounting, nine namespace
closures, and one role-level capability refusal with its reasoning recorded. Any new
mechanism must explain why it is not a second implementation of something already there.

**W3C DTCG 2025.10.** Composite tokens, `$type` inheritance, aliasing, and the rule against
inferring meaning from group membership.

**Tailwind CSS v4 theme model.** Namespaces determine which utilities exist; `--*: initial`
empties the default theme; `--spacing` drives numeric spacing utilities by a `calc()`
formula; `@source not` and `source(none)` bound class detection.

**Figma variables.** Per-variable `scopes` — cited by the proposal as precedent, and the
citation says something narrower than the proposal used it for.

**Material 3 colour roles.** Cited by the review as evidence that unpaired roles like
`outline` and `scrim` are first-class rather than leftovers. **This citation could not be
verified** — both `developer.android.com/reference/…/ColorScheme` and
`m3.material.io/styles/color/roles` returned navigation shells rather than content on
retrieval. It is therefore **not** relied on below; Decision 2 stands on the local
observation that these roles were deliberately authored here.

### Evidence

| Source | Retrieved | Supports |
|---|---|---|
| W3C DTCG *Format Module* 2025.10, §3.7 / §6.1 — "Groups are arbitrary and tools _SHOULD NOT_ use them to infer the type or purpose of design tokens." (register **E22**) | 2026-09-03 | That "declare, never infer" is the published rule and not an Xforge preference. The direct argument against deriving a family from four name stems |
| Same, §6.3.2 — a group's `$type` acts as a default for tokens that do not declare their own | 2026-09-03 | The behaviour `flatten()` already implements; cited so the existing code has its source attached |
| Same, Example 37 — a typography composite carrying `fontFamily`, `fontSize`, `fontWeight`, `lineHeight` | 2026-09-03 | That the composite type exists. **§9.7 was truncated in the retrieved render**, so the complete sub-value list is unverified; Decision 3 does not rest on it |
| Tailwind CSS v4 *Theme variables* — "Theme variables are defined in _namespaces_ and each namespace corresponds to one or more utility class or variant APIs. Defining new theme variables in these namespaces will make new corresponding utilities and variants available"; and "To completely disable the default theme and use only custom values, set the global theme variable namespace to `initial`… Now none of the default utility classes that are driven by theme variables will be available" (**E25**, owed) | 2026-09-03 | That closure is the supported mechanism, not a hack — and that adding `--spacing-row-y` *enlarges* the namespace rather than replacing it |
| Tailwind CSS v4 *Margin* — quick reference: `m-<number>` → `margin: calc(var(--spacing) * <number>)`; and "The `m-<number>`, `mx-<number>`, … utilities are driven by the `--spacing` theme variable" (**E26**, owed) | 2026-09-03 | That the numeric spacing scale is **derived from a multiplier, not enumerated**. The docs do not state an upper bound; unboundedness follows from the formula and is inferred here, not quoted |
| Tailwind CSS v4 *Detecting classes in source files* — "Use `@source not` to ignore specific paths… useful when you have large directories… like legacy components or third-party libraries"; "Use `source(none)` to completely disable automatic source detection" (**E27**, owed) | 2026-09-03 | That the vendored tree can be excluded from class detection. See Decision 7 for what this does **not** buy |
| Figma REST API *Variables — types* — "Setting scopes for a variable does not prevent that variable from being bound in other scopes (for example, via the Plugin API). This only limits the variables that are shown in pickers within the Figma UI." (**E24**, owed) | 2026-09-03 | That a shipped design tool modelled per-variable scope — and that its scopes are advisory. Adopting the field without the enforcement would import a name that promises more than it delivers |

For the relationship layer itself:

```
    prior_art_result: no-direct-match
    sources_examined: DTCG 2025.10 (composite types are enumerated; a family of
                      base/foreground/hover/pressed is not among them), Figma
                      variables (individual variables with aliases; no modelled
                      relation BETWEEN variables), shadcn's paired-stem convention
                      (a naming rule, not a model), Material 3 colour roles
                      (RETRIEVAL FAILED, twice), this repository's TYPE_ROLES
                      (the closest match, and it is local)
    observed problem: 48 roles, 26 stems, four shapes, one asymmetry nothing can
                      classify as decision or omission
```

### What prior art does NOT prove

- **DTCG's `SHOULD NOT` is about groups, not relationships.** It rules out inferring a
  family from a shared prefix. It says nothing about whether a declared contract is the
  right answer, and nothing about whether the 26 stems here are correctly paired.
- **Tailwind documents closure; it does not endorse closing spacing.** E25 and E26 establish
  the mechanism and the multiplier. They say nothing about whether a project should remove
  the numeric scale — that is a local decision resting on the local measurement, and only
  the measurement in Decision 7 supports it.
- **E27 proves `@source not` exists; it does not make it a fix.** Excluding the vendored tree
  from detection has the *identical visual consequence* as closing the namespace: the classes
  become inert either way. It bounds the emitted CSS. It does not restore the padding. That
  distinction is Decision 7's whole sequencing constraint and is easy to misread as a
  cheaper option.
- **Figma proves scopes are wanted and proves they are not enforced.** Reading it as support
  for normative scopes reads the citation backwards.
- **DTCG defining a typography composite is not precedent for migrating to it.** The
  composite has no field for `minimumPx`, `rank`, or the per-mode hierarchy assertion.
- **Material 3 proves nothing here, because it was not retrieved.** Recorded as a failure
  rather than paraphrased from memory.
- **Nothing external qualifies any of this.** Only Verification does, and every check named
  there is unwritten.

## Decision

### 1. REJECT a new engine, and REJECT the four-name vocabulary — *unchanged*

There is no Adaptive Schema Engine. Stages 1–3 exist in the compiler; stage 4 exists in
policy. Law 30: new infrastructure requires a named, measured pain. The existing
`generate()` grows a contract-compilation step and more emitters; it does not acquire a
sibling.

The taxonomy **ACS / ASE / ASM / Component Contract** is rejected as vocabulary: three of
the four name things that already have names here. Introducing four nouns to accommodate new
tables is the mechanism by which ADR-031 measured 13,962 lines of policy against 503 lines of
authored component and found four dead surfaces.

### 2. ADOPT: `COLOR_ROLE_CONTRACTS` — all 26 roots declared, absence designed — *amended*

> **Superseded:** the first draft called these `COLOR_FAMILIES`, forced every role into
> `container` / `content` / `hover` / `pressed`, and treated the 11 unpaired roots as
> singleton leftovers that a family model need not cover. Both are wrong. `border`, `ring`,
> `scrim`, `field` and `foreground` were each authored deliberately, with their own job;
> re-describing `scrim` as "a family with only a container" loses the semantic identity the
> role name already carries.

`COLOR_ROLE_CONTRACTS` in `policy/foundations/color.mjs`, shaped after `TYPE_ROLES`. **All
26 role roots are declared, including the 11 with no companion.** The relationship is
expressed inside the role, not by wrapping the role in a generic container:

```js
export const COLOR_ROLE_CONTRACTS = {
  primary: { base: …, foreground: …, hover: …, pressed: … },
  card:    { base: …, foreground: … },
  scrim:   { base: … },
  border:  { base: … },
}
```

**Designed absence is written down.** This is the part that makes the contract closed rather
than merely descriptive:

```
  a token reference    =  a designed value
  NONE                 =  a designed absence — "no separate pressed colour exists"
  field missing        =  DEFECT, refused at compile time
```

So `destructive` must say `pressed: NONE` or mint one. It may not stay silent.

The assertion is the decision, not the table:

```
  every one of the 26 roots is declared                       ->  else refuse
  every semantic colour token is owned by exactly one root    ->  else refuse
  every declared reference resolves                           ->  else refuse
  every companion slot is a reference or NONE, never absent   ->  else refuse
  a token whose name carries a companion suffix but is not
    declared as that root's companion                         ->  REFUSE
```

The last rule inverts the naming convention's authority: the suffix stops being the model
and becomes the thing the model is checked against. **The first run is expected to be red.**

### 3. REJECT moving `TYPE_ROLES` into `tokens.json` — and ADOPT completing it — *amended*

The rejection stands: `TYPE_ROLES` already *is* the typography composite and holds floors,
rank and a per-mode hierarchy assertion the DTCG shape has no field for. Moving it would
either lose those or split one fact across two homes.

> **Superseded:** the first draft treated the typography namespaces' non-parallelism as a
> *reason a complete composite is not appropriate*. Under the closed-language law the
> conclusion inverts — the asymmetry means **the contract is incomplete**, not that
> completeness is unattainable.

Every one of the seven roles declares all five fields — `font`, `size`, `weight`, `leading`,
`tracking` — by an explicit reference, an explicit reuse, or `NONE`. No field is omitted so
that a browser default or an inherited value decides. That makes today's gaps into work
items rather than silence: `weight` has no `title`, `leading` has no `emphasis` and names
`compact` where `type` names `body-compact`, `tracking` covers two roles of seven, and
`weight.medium` belongs to no role at all.

If a manifest is emitted (Decision 5), `TYPE_ROLES` is *projected* into it read-only.
`policy/` remains the authority.

### 4. ADOPT: CSS capability is normative and enforced by emission — *amended*

> **Superseded:** the first draft made scopes advisory in the utility layer and *documented
> the hole* — that `--color-scrim` makes `text-scrim` compilable and nothing can stop it.
> ADR-024's own rule condemns that: a check reporting clean while `text-scrim` renders is
> worse than no check. The hole should be closed, not annotated.

Each role declares the CSS channels it may be used through, and **the compiler emits only
those**:

```js
scrim: {
  base: …,
  css: { background: true, text: false, border: false, fill: false, stroke: false },
}
```

A role whose channels are narrower than its namespace leaves `--color-*` and is emitted as
explicit `@utility` blocks instead — `bg-scrim` exists, `text-scrim` does not exist, and the
compile test that asserts every class in source resolves turns any use of it into an
authorship-time failure. Roles whose semantics genuinely span the whole namespace
(`primary`, `foreground`) keep the namespace projection.

This is not a new idea in this repository; it is the generalisation of one already applied.
`shadow-ambient` and `shadow-key` are withheld from projection today for exactly this
reason, recorded in the generated header. The upgrade is from **per-role all-or-nothing** to
**per-channel**.

**One cost was measured before adopting this, because it is the obvious objection.** Leaving
`--color-*` for hand-written `@utility` blocks gives up Tailwind's opacity modifier
(`bg-muted/50`) for those roles. The authored layer uses **zero** opacity modifiers and the
application uses zero; all 61 occurrences are in the reachable vendored files. The objection
does not bind on any code Xforge owns.

### 5. ADOPT NOW: the style manifest and the typed projection — *amended*

> **Superseded:** the first draft deferred both on the grounds that they had no consumer,
> and that emitting an artifact only its own test reads is the failure ADR-031 measured four
> times. The premise was wrong. The consumer is the Adapter.

Under the closed-language law an authored component must not invent a design-bearing class
string. It composes symbols:

```tsx
cn(STYLE.color.primary.background, STYLE.color.primary.foreground,
   STYLE.radius.control, STYLE.type.label)
```

rather than `cn('bg-primary', 'text-primary-foreground', 'rounded-md', 'text-sm',
'font-medium')`. Strings still exist — CSS and HTML require them — but they are *generated*.
No authored string carries design authority. That gives `generated/style.ts` a real
consumer, which gives `generated/style-manifest.json` one, and law 30 is satisfied rather
than evaded. Emission comes from the same `generate()` call as the existing five artifacts;
`token-names.json` is subsumed and deleted in that commit (ADR-024's rule).

**Two obligations this creates, named because they are not free:**

- ADR-031's **normative** Adapter file schema shows `cva('<base classes, roles only>')` —
  string classes in the recipe. A symbol-composed recipe changes that schema, and the change
  belongs to ADR-031.
- `design-system-classes.test.ts` enforces "every class in a recipe names a token role"
  **lexically**. Symbol indirection defeats a lexical reader. The replacement check must
  exist in the same commit that introduces the symbols, or the guarantee silently lapses —
  which is ADR-024's rule and this repository's recurring defect at once.

### 6. Component schema: the JSON DSL stays REJECTED; the universal grammar is ADR-031's to decide

ADR-031 Decision 2 rejected `policy/components/`, a slot grammar and an adapter registry;
Decision 9 rejected generating React from a declarative spec. **Both stand.** A
per-component JSON spec and a React generator are refused here as there.

The review distinguishes those from a **single universal TypeScript grammar** every
component satisfies — `identity`, `anatomy`, `axes`, `states`, `behavior`, `accessibility`,
`style` — with no per-component file, no registry and no generator. The distinction is
real and the idea is sound.

**It was not this ADR's to take, and it has since been taken where it belongs.** ADR-031
Decision 1 explicitly refused to mandate a recipe and a contract on every component —
*"Card owns no axis and carries neither"* — so a universal grammar had to be argued against
ADR-031's evidence rather than declared here.

**Resolved 2026-09-03 as ADR-031 Decision 12**, and the answer was that the grammar already
existed: ADR-031's **Adapter file schema is normative** and every authored component already
follows it — `0 PROVENANCE`, `1 RECIPE`, `2 CONTRACT`, `3 TARGET`, `4 ADAPTER`. There was
nothing to build, only something to recognise, and a second per-component JSON copy of a
schema the TypeScript already enforces is exactly the tree Decision 2 refused. What Decision
12 changed is narrower and is this ADR's consequence rather than its content: section 1 is
renamed STYLE SELECTION and holds generated symbols instead of authored class strings, and
public Targets stop inheriting `className` and `style`. The verdict here is therefore
**REJECT the per-component JSON schema, ADOPT the recognition** — and the argument lives in
ADR-031 where its evidence is.

One boundary belongs here and is stated so the two do not merge by drift: the manifest of
Decision 5 is a consumer of **style roles**, which are token-plane facts. A manifest that
grows a `style` map keyed by component slot has crossed into the component plane and has
triggered ADR-031 Decision 2 rather than satisfied Decision 5.

The review's earlier suggestion to stop ADR-031 before component adaptation and adapt Card
first is stale rather than wrong: Alert, Button and Card were written to the Adapter file
schema on 2026-09-03, and Switch and Combobox behaviour was proved in Chromium.

### 7. ADOPT: close `--spacing`, the tenth namespace — *new*

Nine namespaces are closed. `--spacing-*` is open while the generated theme adds 19 role
names into it, so `p-control-x` and `p-13` compile side by side — the same two-scales-on-one-
prefix defect that closing `--radius-*` removed, still live and never examined.

Closed, the numeric scale ceases to exist and `p-row-x` is the only way to say padding.
The measured cost:

```
  authored components   6 classes, all of them m-0 / p-0 — zero design values lost
  application code      0
  vendored, reachable   219 classes across 15 files
  vendored, unreachable 604 across 44 files, already dead under ADR-033
```

**The sequencing constraint, stated because it is the whole risk.** Those 219 classes are
what gives the reachable vendored primitives their padding. Making them inert — whether by
closing the namespace or by `@source not` on the tree, which have identical visual
consequence — leaves Card, Dialog, Combobox and the rest visibly unpadded. So the closure
lands **after** the Adapters above those files own their spacing in role names, one
component at a time, not as a single flag flip. The same is true of arbitrary design values
(`[3px]`, `[2.5rem]`, `[0.8rem]`, `[0.35s]` — 29 in the vendored tree, **0** in the authored
layer): refusing them in authored code costs nothing today and is adopted immediately;
refusing them everywhere waits on the same migration.

### 8. ADOPT: the compiler emits the complete legal vocabulary — *new*

The corollary of Decisions 4 and 7. Where a namespace is closed, the compiler emits the
enumerated utilities that replace it, from the same policy tables — role-named spacing,
`rounded-control`, complete `type-*` role utilities setting all five typography fields at
once, `motion-*` pairing duration with easing, `elevation-*` for the five planes. The
authored layer then has a complete vocabulary and never needs to reassemble one from parts.

Tailwind's job in this architecture is variants, selectors, state composition and
tree-shaking. **Tailwind is the execution engine; Xforge is the design language.**

## Alternatives considered

1. **Adopt the proposal whole and build the ASE as a new subsystem.** Rejected. Stages 1–3
   exist and are tested; stage 4 exists and is stronger. A second compiler over the same
   graph is the repository's named defect at subsystem scale.
2. **Infer relationships from `-foreground` / `-hover` / `-pressed` suffixes.** Rejected on
   DTCG §3.7 and on local evidence: inference is the mechanism by which `destructive`'s
   missing `pressed` stays invisible. It reports the same green whether the design is
   complete or not.
3. **Declare the contracts in `tokens.json` under `$extensions.xforge`.** Rejected. The
   established split is values in `tokens.json`, rules in `policy/`; `TYPE_ROLES` is the
   precedent. Colour relations in JSON while typography relations stay in `.mjs` splits one
   kind of fact across two homes on no principle but which was written first.
4. **A new `policy/adaptive/` tree.** Rejected. `policy/index.mjs` documents why there are
   four trees and how a fifth authority produced five duplicated facts that agreed until
   they were merged.
5. **Adopt Figma's `scopes` semantics as published.** Rejected — advisory scopes under a
   normative name is the overclaiming ADR-024 exists to refuse. Superseded further by
   Decision 4: capability is enforced by *emission*, so nothing needs to be linted after
   the fact.
6. **Treat the 11 unpaired roles as leftovers a contract need not cover** (the first
   draft). Rejected: they were authored deliberately, and 100% coverage is the point of a
   closed language, not over-engineering.
7. **Represent designed absence by omitting the field.** Rejected: omission and defect
   become indistinguishable, which is the exact failure mode this ADR was written about.
8. **Keep the numeric spacing scale and lint against it.** Rejected. A lexical lint over
   utilities is the weaker half of the pair ADR-031 already chose between, and
   `CLOSURE_REASON.color` records the reasoning: *"No guard reads class names… Removing the
   namespace enforces it by construction instead: the utility does not exist."*
9. **`@source not` on the vendored tree instead of closing namespaces.** Rejected as a
   substitute, adopted later as a complement. It bounds emitted CSS; it does not restore
   padding, and it leaves the numeric scale available to any file still scanned.
10. **Defer the manifest until a consumer appears** (the first draft). Superseded: the
    Adapter is the consumer once authored code composes symbols instead of strings.
11. **Take the universal component grammar here.** Rejected on ownership, not merit — it
    amends ADR-031 Decision 1 and belongs there.

## Consequences

**Positive.**
- Every design-bearing value in authored code becomes traceable to a declaration, and the
  authored layer already satisfies this — the measurement says the gap is the vendored tree,
  not the components Xforge writes.
- `destructive` gets an answer on the record. So does every other silent asymmetry.
- The two-scales-on-one-prefix defect is removed from the tenth namespace, having been
  removed from the seventh by the same reasoning.
- `text-scrim` stops existing rather than being documented as a known hole.

**Negative, and accepted.**
- **The vendored tree loses its styling as the closures land.** 219 classes across 15
  reachable files. This is the largest cost in the ADR and the reason Decision 7 is
  sequenced per component rather than flipped once.
- Several first runs are red, and clearing them is design work: minting `weight.title`,
  `leading.emphasis`, answering `destructive`, and either minting `leading.body-compact` or
  renaming `leading.compact`. A check that could not go red on today's tree would not be
  worth writing, but this is more red than the first draft budgeted for.
- Symbol-composed recipes change ADR-031's normative Adapter file schema and defeat
  `design-system-classes.test.ts`'s lexical mechanism. Both must be replaced in the same
  commits, not after.
- Roles that leave `--color-*` lose opacity modifiers. Measured cost to Xforge-owned code:
  zero. Cost to the vendored tree: 61 occurrences, on the same migration path as the rest.
- Hand-written `@utility` blocks are more generated CSS to keep deterministic than a
  namespace projection was.

## Migration / rollback

Ordered, each step its own commit, and each of steps 1–4 must leave
`packages/design/generated/` **byte-identical** — a declaration and an assertion are not a
projection, so if `tokens.css` moves, the step is wrong.

```
   1  COLOR_ROLE_CONTRACTS in policy/foundations/color.mjs — all 26 roots, NONE allowed
   2  assertColorRoleContracts(), wired into the existing assertColorPolicies call site.
      WRITE THE TESTS FIRST AND WATCH THEM FAIL
   3  clear the red: destructive's pressed, and every other slot the assertion names
   4  complete TYPE_ROLES — five fields per role, explicit reuse or NONE; mint or alias
      weight.title, leading.emphasis, leading.body-compact; retire or own weight.medium
   5  declare css capabilities per role; emit narrow roles as @utility; withdraw them
      from --color-*                                        (generated output CHANGES here)
   6  emit style-manifest.json and style.ts from the same generate(); delete
      token-names.json in the same commit
   7  move authored recipes onto STYLE.* symbols, replacing the lexical class check in
      the same commit  -- REQUIRES the ADR-031 schema amendment in Decision 6
   8  per component, move the Adapter's spacing onto role names, then @source not the
      vendored file it wraps
   9  close --spacing-* once step 8 covers all 15 reachable files
  10  refuse arbitrary [...] design values in authored code (cost today: zero)
```

Steps 1–4 are independent of everything below them and can land alone. Rollback for those is
deleting the tables and assertions; nothing else references them, and step 3's and step 4's
token edits stand on their own merits. Steps 5–9 roll back by restoring the namespace
projection, which is a one-line change to the `closes` table in `TOKEN_PACKAGES`.

## Verification

Qualification test: **`packages/design/tests/tokens.test.ts`**, under its existing
`what the generator refuses` block, each case observed RED before the table satisfying it is
written:

```
  a semantic colour token owned by no declared root
  a root declaring a companion slot that is neither a reference nor NONE
  a token whose name carries a companion suffix but is undeclared
  a typography role omitting any of its five fields
  a role used through a CSS channel its capability set refuses
```

Closure and emission, once step 5 lands — the check that a closed namespace is actually
closed, which is the one thing a green generator cannot tell you:

```
  text-scrim compiles to no rule          (compile test, existing mechanism)
  p-13 compiles to no rule                (after step 9)
  bg-scrim still compiles to a rule       — the check must be able to fail in both
                                            directions, or it only proves CSS is missing
```

Determinism, law 27 and law 33, and the check that steps 1–4 are declarative:

```
  pnpm gen:tokens && git diff --exit-code packages/design/generated/
```

The runnable command for the suite is `vitest run --project unit`.

**Obligations this ADR does not discharge, recorded rather than left as absences:**

- **E24 – E27 are owed.** `.architecture/evidence-register.md` ends at E23; the Figma
  scopes source and the three Tailwind v4 sources above are E24–E27 and are not yet written
  into the register. The ADR index row in `.architecture/adr/README.md` is likewise owed.
  This change was scoped to this file alone. Neither may be skipped before this ADR leaves
  Proposed.
- **The Material 3 citation failed retrieval, twice**, and is not relied on. If the
  unpaired-roles argument is ever wanted with external support, it needs a source that
  actually returns content.
- **`pnpm verify` does not exist in this checkout.** `CLAUDE.md` specifies
  `verify:fast` / `verify` / `verify:ci` and a `tooling/verify/stages.mjs` declaring
  `authorship: true` per stage. As of 2026-09-03 `package.json` declares no `verify` script
  of any kind and `tooling/verify/` contains one file, `lib/util.mjs`. Recorded because an
  ADR must name an executable proof and the commands above are the ones that run. It is the
  same category as `branches: [master]` — a policy written down reading exactly like a
  policy enforced — and it belongs on that list in `CLAUDE.md`, which this change did not
  edit.
