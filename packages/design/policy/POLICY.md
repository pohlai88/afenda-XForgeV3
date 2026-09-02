# The design system policy

**This document governs. `packages/design/policy/` implements it.**

Where a rule here and the code disagree, one of them is a defect — and the code
is the one that runs, so the disagreement is found by a failing check rather than
by reading. That is the whole arrangement.

---

## 1. Why this exists: writing fast is only safe if the system refuses wrong work

The goal is to build screens quickly without holding the rules in your head.
That is possible under exactly one condition:

> **A design value cannot be written by hand anywhere a person types.**

Not "should not". Cannot. Every colour, space, radius, size, weight and duration
comes from `packages/design/tokens.json`, reaches components as a token, and is
checked at four separate points before it can reach a screen. A wrong value is
not a thing you have to notice — it is a thing that fails.

So the working loop is:

```
  write the component  ->  pnpm verify:fast  ->  it is right, or it is red
```

There is no step where care is the control. If you find yourself being careful
about a rule in this document, the rule is under-enforced and that is a defect to
report, not a habit to build.

---

## 2. The three planes

```
  VALUES     packages/design/tokens.json      what a colour IS
      |                                       DTCG 2025.10, three tiers
      |  packages/design/policy/generators/tokens.mjs
      v
  RULES      packages/design/policy/          what a value MAY be
      |                                       refuses at generation time
      v
  USE        packages/design/src/             where a value is APPLIED
                                              utilities, contracts, components
```

Values are data. Rules are code that reads the data and throws. Use is
components. Nothing skips a plane: a component never names a value, and a value
never knows a component.

### The tiers, and the single rule that orders them

```
  primitive   a value with no meaning      color.teal.600, space.4
  semantic    a role with no value         surface.accent, space.stack
  component   a role scoped to one thing   button.padding-block
```

`ALLOWED_EDGES` in `vocabulary.mjs`: semantic may reference semantic or primitive;
component may reference component or semantic; primitive references nothing.
**Component may never reach a primitive.** A primitive carries a value and no
role, so a mode has nothing to rebind — a component bound to one is a component
that cannot be themed, and it will look correct until the day someone switches
theme.

Component tokens are capped (`COMPONENT_TOKEN_CEILING`). The cap is a tripwire,
not a verdict: raise it in its own commit carrying the count and the reason.

### The two axes

`theme` owns colour. `density` owns geometry. Ownership is derived from the
token's DTCG `$type`, never from its name — a theme mode may rebind only `color`
tokens, a density mode only `dimension` ones.

A token rebound by **both** axes is refused. Their selectors have equal
specificity, so which one won would be decided by the order this generator
happened to emit them, which is source order masquerading as architecture.

---

## 3. What is enforced, and by what

This is the governance surface. Every row is a rule that runs.

### At generation — `pnpm gen:tokens`, refused before anything is written

| Rule | Module |
| --- | --- |
| Alias resolves; no dangling reference, no cycle | `generators/tokens.mjs` |
| Tier edge is legal | `vocabulary.mjs` |
| Value matches its DTCG `$type` | `vocabulary.mjs` |
| Token path is well-formed; CSS projection is injective | `vocabulary.mjs` |
| Contrast meets its role's floor **in every mode** | `foundations/color.mjs`, `interaction/accessibility.mjs` |
| Target size meets the WCAG 2.5.8 floor in every mode | `interaction/accessibility.mjs` |
| Type scale keeps hierarchy at every density, and at every shared rank | `foundations/typography.mjs` |
| Motion has a reduced-motion answer | `foundations/motion.mjs` |
| Every elevation layer is separated by something robust | `foundations/elevation.mjs` |
| Every role projects to exactly one Tailwind utility | `projection/tailwind.mjs` |
| No role is shadowed out of existence by another namespace | `projection/tailwind.mjs` |
| Component-token ceiling | `vocabulary.mjs` |

Each policy table is also validated **on import** (`index.mjs`), because a kernel
that checks tokens but not its own configuration is still fail-open.

### At authorship — `pnpm verify:fast`

| Rule | Enforced by |
| --- | --- |
| No literal design value in the design system's CSS | `tokens-are-the-authority` |
| The stylesheet names roles, never primitives | `stylesheet-names-roles-not-primitives` |
| Every `var()` names a token the generator emits | `tokens-referenced-are-tokens-that-exist` |
| **Every token-driven class compiles to a real rule** | `tests/unit/tailwind-classes.test.ts` |
| Generated output is byte-identical after regeneration | `generate` stage |
| Business screens carry no `className` and no `style` | `no-bespoke-styling` |

The fourth row is the one that makes utilities safe. Tailwind emits a utility
only for a theme variable that exists, and the bridge clears the default palette,
so a wrong class name produces **no CSS at all** — no error, no fallback, a page
that looks nearly right. That test puts every class through the real compiler and
fails on any that produces nothing. It is the reason class names do not need to
be checked by eye.

### At the component boundary

Every primitive declares a contract (`packages/design/src/contracts.ts`) with an
`interaction.profile`. The profile is not documentation — it decides which
conformance suites claim the component and whether it owes a recorded
screen-reader session (ADR-025). A component joins the accessibility gate by
declaring what it is; nobody edits a list.

---

## 3a. The type scale, and why a size class carries its leading

Seven roles. Three sizes doubled by weight, plus two heading steps — which is
Material 3's semantics, Apple's restraint and Carbon's productive density, rather
than any one of them adopted whole.

```
  caption        12 / 16 · 400   supporting information. AT the 12px floor,
                                 with no headroom, and nothing below it
  body-compact   14 / 20 · 400   OPERATING the software: cells, fields, rows
  label          14 / 20 · 500   what a thing IS: field names, column heads,
                                 navigation, controls
  body           16 / 24 · 400   READING the software: prose, descriptions
  emphasis       16 / 24 · 500   the term against its value; a card title
  heading        20 / 28 · 600   a section
  title          24 / 32 · 600   the page
```

**Every leading lands on the 4px grid the space scale already uses**, and the
ratios are unitless so they scale with the user's text size — a px line-height
would break exactly there. Three of the five previous roles were off it (19.6px,
26px, 31.2px), which is invisible in a card and accumulates down a payroll grid.

**A SIZE CLASS EMITS ITS OWN LINE HEIGHT.** The bridge writes
`--text-<role>--line-height` beside each `--text-<role>`, read from the
`TYPE_ROLES` pairing, so `text-body-compact` is 14px AND 20px and a component
cannot take half a role. That closed two defects at once: three sites had the
size without its leading and inherited body's 1.5, and `tailwind-merge` — which
correctly assumes a Tailwind size utility resets line-height — was silently
deleting `leading-label` from every button. The bridge now behaves the way the
merge already assumed rather than being taught an exception.

A standalone `leading-*` role still exists for a deliberate override. It must be
written AFTER the size class to survive, which is what a reader expects of one.

**Five namespaces are cleared**: `--color-*`, `--font-weight-*`, `--text-*`,
`--leading-*`, `--tracking-*`. Tracking was the last one open, and two components
were letterspacing keyboard shortcuts with Tailwind's `tracking-widest` — a value
the token file had never heard of. Found by asking which namespaces were closed,
not by anything going wrong.

## 3b. Elevation, and the three things it is made of

> **Surfaces establish hierarchy. Borders establish structure. Shadows
> establish physical separation.**

Five planes, and the default is flat:

```
  flat        no shadow    page · card · table · form · rail · tabs
  raised      subtle       a sticky surface, once content scrolls beneath it
  floating    soft         menu · select · popover · tooltip
  overlay     pronounced   sheet · drawer · command palette
  modal       deepest      dialog — WITH the scrim, which does most of the work
```

**A card does not get a shadow.** It groups content without leaving the page,
and what separates it is a boundary and a surface — both of which survive
forced-colors, where a shadow does not. Every persistent surface in the product
is flat; all four shadows are on surfaces that genuinely leave the page. If
everything floats, nothing has elevation.

`shadow-flat` is a real class that resolves to `none`, and that is deliberate: a
card DECLARING it has no shadow is a decision, where a card with no shadow class
is an omission.

**THE SHADOW'S INK IS A COLOUR ROLE, WHICH THE TWO-AXIS LAW FORCES.** A theme
may rebind only `color` tokens, so a `shadow`-typed token could never be
theme-rebound — and a dark shadow on a near-black ground does nothing. So the
geometry is a `shadow` token and the ink is `semantic.color.shadow-key` /
`-ambient`, which dark rebinds to fully transparent. Depth there is carried
entirely by surface separation: `#0a0a0c` → `#131315` → `#1c1c1f`.

Each layer keeps its colour as a live `var()` reference rather than being
resolved to a literal — for the same reason `@theme inline` emits references.
Resolving it would freeze every shadow at the base theme's ink.

**Stacking is not elevation.** One is rendering order, the other visual depth.
`semantic.layer.local` (10) and `.overlay` (50) are the whole ladder, because two
values are in use; the third arrives with the first component that genuinely has
to sit above a portalled surface. They reach components through `@utility` blocks
rather than a namespace, because Tailwind computes `z-50` from a number and there
is nothing to clear — so `no-raw-stacking-value` is what keeps a bare number out.

**`ELEVATION_LAYERS` is a different list from the shadow roles, on purpose.** It
asks a CONTRAST question — what does each plane paint with, and what keeps it
distinguishable from the one below — and there are three surfaces where there are
five shadows, because floating, overlay and modal all paint the popover surface.

## 3c. Spacing and density, which are one system

```
  GRID      viewport adaptation
  SPACING   relationship
  DENSITY   information packing
```

**Spacing names a relationship, never a number.** Six roles, and the name says
how strongly two things belong together rather than how far apart they sit:

```
  related    4px   parts of one thing -- a label and its helper
  tight      8px   strongly related -- an icon and its label
  snug      12px   inside a compact component
  normal    16px   between components
  loose     24px   between groups
  section   32px   between sections
```

**Three densities: compact 32 / default 40 / comfortable 48**, measured on the
control floor. `default` is the productive desktop mode; comfortable clears
Apple's 44pt touch target and compact still clears WCAG 2.5.8's 24px.

**Density packs information; it does not reflow the page.** `space.section` and
`space.container` are invariant across all three modes, so the page frame holds
still while productive components compress. And density never touches type: it
rebinds spacing, the control floor and the icon size, nothing else.

**WHY THIS WAS WORTH DOING, in one measurement.** Before: 129 padding and gap
values came from Tailwind numbers against nine roles, and toggling compact moved
**5 of 42** elements on screen. A mode the generator proved in every check, which
the product very nearly did not have. After the sweep: **42 of 44**, in both
directions.

It was 34 until `transition-all` was found. **`transition-property: all` on an
element whose length resolves from an INHERITED custom property stops the
browser applying a new value when that property is rebound on an ancestor** --
the transition latches the before-value and never commits, because the change
arrives through inheritance rather than through a declaration on the element.
Every button in the product was frozen at its default height by two occurrences
of it.

That hazard is not specific to height. Every token this system rebinds by theme
or density reaches a component through inheritance -- that is what the two axes
ARE -- so `all` opts every animatable property into the same trap.
`no-transition-all` refuses it.

`semantic.control.min-size` was the sharpest case. It had been rebound by density
and held to the WCAG target floor in every mode since the package was scaffolded,
and **no component read it** -- buttons were `h-6` through `h-10`, with `h-6`
sitting exactly on the 24px minimum and not moving in compact because nothing
about it was a token. A proven accessibility floor over zero pixels.

**`no-raw-spacing-value` is a guard, not a closed namespace, and that is a
correction.** Tailwind v4 derives its whole numeric scale from one `--spacing`, so
`--spacing: initial` removes it in a line -- and takes `inset-0`, `m-0`, `top-0`
and `left-2` with it, because a zero and an arrow offset are computed from the
same variable. Closing it would have been enforcement by demolition. The guard
governs padding and gap, which this system owns as spacing; widths, sizes and
offsets are examined and deliberately not governed, because there is no dimension
vocabulary yet and inventing one to give the guard more to do is the wrong order.

**The 16-column grid is decided and not built.** 4 -> 8 -> 16 is the responsive
grid when it lands; it lands with the employee list and detail, which are its
first real consumers. A column apparatus for a shell and one screen would be
infrastructure ahead of a measured pain (law 30).

## 3d. Shape

> **Structured at rest. Soft where interactive. Expressive nowhere yet.**

```
  square       0    tables, connected structure, grid cells
  precise      4    tags, checkboxes, tiny elements
  control      8    buttons, inputs, selects        <- the signature
  container   12    cards, panels, menus, popovers
  overlay     16    dialogs, drawers, command palette
  full         inf  pills, avatars, circular controls
```

**A NAME SAYS WHAT A RADIUS IS FOR, not how big it is.** These were `radius.sm`,
`.md` and `.lg`. This file already argues the mirror of that about primitives --
"a primitive named for a meaning has taken the semantic layer's job" -- and a
semantic named for its size has equally not done the semantic layer's.

**`square` and `full` are Tailwind statics, not tokens.** `rounded-full` is
`calc(infinity * 1px)` and `rounded-none` is `0`; neither reads a theme key, so
closing the namespace leaves both alive. That asymmetry is wanted here, because
both are semantic — one names an intrinsically round object, the other names
structure. It is the same asymmetry that let `leading-none` survive when
`--leading-*` was cleared, working in our favour for once.

**TWO SCALES WERE LIVE AT ONCE, AND THEY AGREED BY COINCIDENCE.** This system
owned `sm`/`md`/`lg`; Tailwind still supplied `xs`, `xl`, `2xl`, `3xl` and
`4xl`, and eleven classes used the foreign half. The dangerous pair:
`rounded-xl` is a Tailwind default of 12px and `container` is also 12px. Nothing
kept them equal, and a reader could not tell which scale any class belonged to.

It had already produced a visible error. **The card and the input inside it both
rendered 12px** — a container and the thing it contains at identical radii,
which looked acceptable only because the two scales collided at that value. A
container now sits one step above its controls: 12 outside, 8 inside.

**NO SHAPE MORPH, and it is recorded rather than merely absent.** Material 3
Expressive makes shape a motion language — morph tokens, state grammar,
polygonal shapes. It has no consumer here, and the decisive argument is its own
rule: state can never depend on shape alone, so every morph is redundant with
the colour, icon or text already carrying the state. That makes it polish, and
law 30 wants a named pain before machinery. The grammar it takes when it lands:

```
  control.press    8 -> 4 -> 8      press compresses, release restores
  selection        8 -> 12
  pill-selection   8 -> full
  drag             8 -> 12          with elevation floating
  expressive       onboarding, empty state, AI activation ONLY.
                   Never payroll, accounting, approvals, tables, settings.
```

## 3e. Motion and interaction

```
  press      70ms   a press or toggle — a RESPONSE, not an animation
  state     110ms   a fade; a small element entering or leaving
  base      150ms   the default transition speed
  overlay   240ms   an overlay or drawer, which has visual weight
  pulse       2s    the loading shimmer — the only loop in the system
  none     0.01ms   motion neutralised under prefers-reduced-motion

  standard  0.2 0 0.38 0.9    a change that begins and ends on screen
  entrance  0   0 0.38 0.9    something arriving
  exit      0.2 0 1    0.9    something leaving
```

Carbon productive, retrieved 2 Sep 2026. **Asymmetric on purpose** — an element
decelerates into place and accelerates away. What this replaced was
`cubic-bezier(0.42, 0, 0.58, 1)`, which is the exact definition of the CSS
keyword `ease-in-out`: a token reproducing a keyword names nothing. Carbon's
`slow-01`/`slow-02` (400/700ms) are omitted — they are for hero transitions and
background dimming, and this product has neither.

**`duration.none` IS NOT ZERO**, and that is why it is a token. A zero-duration
transition does not fire `transitionend`, so a component waiting for that event
would hang for exactly the people who asked for less motion.

### Reduced motion was LOST in the cutover, and is restored

The only `prefers-reduced-motion` block anywhere in the repository was in `.next`
build artefacts — compiled output of the deleted `packages/ui`. The design system
had none, while shipping a looping shimmer.

**The rule that survives it: removing the animation must never remove the state.**
A skeleton that stops pulsing is still a skeleton.

### One focus indicator, and it is an outline

Two were live: four uses of the outline utility, nineteen of a box-shadow ring,
so a keyboard user saw a different indicator depending on the component. The
tie-breaker was already written here, in `FRAGILE_MEANS`:

> Means that do NOT survive forced-colors and low-contrast displays alone.

**A focus ring built from `box-shadow` disappears in forced-colors mode** — for
the people most likely to depend on it. The elevation policy refuses a shadow as
a sole means of separation; this is the same argument with higher stakes.

### The fourth ghost

`MOTION_ROLES` held one entry naming a token that did not exist, so
`motionFailures` walked it, skipped it, and reported clean. **The fourth policy
table left pointing at the deleted system**, after `UNPROJECTED`,
`ELEVATION_LAYERS` and 33 of 68 `COLOR_ROLE_POLICIES`.

Underneath it the check was also BROKEN: `duration` had reached its DTCG object
form while the reader still matched a CSS string. Nothing caught that because the
loop skipped before reaching it. **A dormant check and a broken one look
identical from outside** — which is the argument for one staleness check across
every policy table rather than four separate discoveries.

## 3e. Interaction state

**State is not one enum. It is five axes that compose.**

```
  availability   enabled · read-only · disabled
  interaction    rest · hover · focus · pressed · dragged
  selection      unselected · selected · checked · indeterminate · expanded · current
  validation     neutral · info · success · warning · error
  process        idle · loading · saving · success · failure
```

A field is `enabled + focus + error` at once. A row is `selected + hover`. One
flat list of states cannot express that without inventing a name per
combination, which is how a component API acquires forty booleans.

**`active` IS PROHIBITED AS A STATE NAME.** CSS `:active` means pressed; an
active tab means selected; an active page means current; an active checkbox
means checked; an active account is a domain status. One word, five meanings.
Use `pressed`, `selected`, `current`, `checked`, `on`, `expanded`. The CSS
`active:` VARIANT stays — that is the pseudo-class, not our vocabulary — but
the role it paints with is `-pressed`.

**A GLOBAL OPACITY IS NOT A DISABLED STATE.** `disabled:opacity-50` dims
background, border, text, icon and children indiscriminately, and every one of
them becomes a colour that exists only after render. This system already had
the answer — `color.disabled` and `color.disabled-foreground` are governed roles
with a floor the generator proves in every mode — and **not one component was
using them**. Sixteen composited disabled states now name the pair.

The numbers are the argument. The defect this file already recorded:
`opacity: 0.6` rendered a primary label at **2.56:1** while the token graph
reported 5.17:1. The same control today measures **3.19:1** in the browser,
against a declared floor of 3 — and the claim and the render are now the same
number.

**M3 STATE LAYERS ARE A DERIVATION RULE HERE, NOT A RUNTIME MECHANIC.** Hover
8%, focus 12%, pressed 12%, dragged 16% is the right ratio set, and applying it
as a live overlay would add four more unmeasurable colours to a system that
already carries 51. So the opacities are how a `-hover` or `-pressed` role is
CHOSEN when it is minted; what ships is an explicit pair the contrast
invariant can see.

**NO COLOUR IN THIS SYSTEM IS COMPOSITED ANY MORE, WITH ONE NAMED EXCEPTION.**
Forty-four `bg-x/50`-shaped values are gone. Measured in the browser: **0**
elements with partial opacity, **1** fractional-alpha colour — the scrim, which
is a role carrying `kind: compositing` and a written exemption — and **no pair
below the 3:1 floor**.

What replaced them was almost never a new token. The hover roles already
existed; `accent` is, in its own policy's words, "a subtle tint behind a
hovered or selected row", which is what every `bg-muted/50` on a row was
reaching for. **One role was minted**: `color.field`, because `bg-input/30` was
using a BORDER colour — raised to neutral.500 for the 3:1 boundary floor — as a
surface at 30%, which is wrong twice over.

**The invalid ring was deleted rather than replaced.** Every site carrying
`aria-invalid:ring-destructive/20` also carried `aria-invalid:border-destructive`,
so the state stayed indicated by a solid measured colour — and a box-shadow ring
beside an outline focus indicator was a second mechanism for one job, which is
the defect the focus consolidation had just finished removing.

**Focus and selection are different states**, and focus is never removed
because something is selected, pressed or in error. Validation survives
interaction: an error field that is hovered is still an error field.

## 3f. Layout, and the adaptive model that is decided but not built

```
  compact      base       one pane
  medium       600px      rail navigation, one pane
  expanded     840px      two panes
  large       1200px      two panes, three conditional
  extra-large 1600px      full expert workspace
```

Material 3 window classes, which describe the AVAILABLE WINDOW rather than a
device. Tailwind ships 640/768/1024/1280/1536 and **not one value coincides** —
so every responsive variant here was firing at a number a framework default
chose. `--breakpoint-*` is cleared, so only these four exist.

**BREAKPOINTS ARE THE ONE BLOCK THAT IS NOT `@theme inline`.** `inline` emits a
reference, which is exactly what lets a theme rebind a colour — and Tailwind
puts that reference straight into `@media (width >= …)`, where no browser can
evaluate a custom property. The variants compiled, matched nothing, and the
navigation rail stopped appearing at every width. Found by resizing the gallery,
not by any check.

Nothing is lost by resolving them: a media query is evaluated at match time
rather than through the cascade, so a breakpoint could never have been rebound
by a mode anyway.

**Content has a ceiling; a workspace does not.**

```
  tip       320px    a transient annotation
  dialog    384px    a focused decision surface
  prose     720px    reading
  form      960px    a form
  workspace fluid    tables, charts, editors — deliberately no token
```

That last line is the rule: **fluid, bounded, split**. Closing `--container-*`
is what makes reaching for `max-w-4xl` fail rather than quietly stretching a
paragraph across 1500px.

**The shell is a different system from the workspace inside it.**
`shell.header` 48 · `shell.nav-collapsed` 64 · `shell.nav-expanded` 240 — the
last of which is what `w-60` already was, unnamed.

### Decided, not built

The adaptive engine — pane roles, P0–P3 priorities, minimum/preferred/maximum
widths, docked → overlay → sheet presentation, collapse order, resize anchors,
per-module preference persistence — is **recorded and not implemented**. There
is one route in this product and no list-detail, no inspector, no supporting
pane. Building the engine now would be the third vocabulary-ahead-of-use in
this repository, after nine spacing roles that 222 utilities ignored and four
policy tables left pointing at deleted tokens.

```
  SCAFFOLDS   workspace 16 · list-detail 5+11 · supporting 11+5
              expert three-pane 4+8+4 (large/XL only)

  PANE          priority   min   preferred   max
    primary           P0   560   fluid       fluid
    detail            P1   480   fluid       fluid
    list           P1/P2   280     320       420
    supporting        P2   300     360       480
    inspector         P3   280     360       480

  PRESENTATION  docked -> overlay -> sheet -> hidden
  COLLAPSE      P3 first, P0 never
  CONTINUITY    a width change is not a navigation event
```

`11 + 5` is 68.75/31.25 against Material's recommended 70/30 — the closest a
16-column grid can come, and the strongest retroactive argument for having
chosen 16 columns over 12.

**A component that appears in more than one container is responsive to its
CONTAINER, not the viewport.** Exactly one qualifies today (`card-header`).

> **Adapt the surrounding interface before shrinking the work itself.**

A payroll table, a generated document, a financial report does not get
progressively more cramped because width disappeared — the chrome goes first.
This also settles what density left open: density packs components, adaptation
removes surroundings, and neither may squeeze the primary task.

## 3f. Colour, and the invariant that was missing

**Neutral is the operating state.** Measured in the running gallery, weighted by
rendered area: **99.6% of the product is neutral or near-neutral in both themes,
with three chromatic colours on screen.** The usual enterprise failure — colour
bloat — is not the risk here. The audit found the opposite one repeatedly:
colour failing to carry meaning it was supposed to carry.

### Nothing measured surface against surface

Every contrast check in this kernel takes a FOREGROUND and the surface it sits
on. `pairsFor` returns `[]` for a `surface` role because its kind is
`pairedAgainst`, so **a surface is never the left operand of anything**. Two
roles resolving to the same colour therefore passed every check.

Four did: `card`, `popover`, `field` and `secondary` were all `#ffffff`. And in
dark, `statutory` and `warning` were **1.3 CIEDE2000 apart** — at the
just-noticeable difference. In a payroll product that is *fixed by law* and *be
careful* rendering as one colour.

`DISTINCT_PAIRS` closes it. CIEDE2000 rather than a contrast ratio, because the
question is different: contrast asks whether text can be READ, this asks whether
two surfaces can be TOLD APART — a difference in hue and chroma as much as in
luminance. Floor 3.0, above the ~2.3 JND, because these are surfaces separated by
content and seen once by someone doing something else.

**What is deliberately NOT in the table is the load-bearing half.** A pair
belongs there only when SURFACE is the means its separation rests on:

```
  background / card    IS declared — a panel's only other means is a border that
                       is `decorative`, exempt, and measured by nothing
  card / muted         IS declared — a recessed well sits on a card
  the 5 status tints   ARE declared, mutually

  card / popover       NOT declared — a popover is separated by its SHADOW. In
                       light both are white and cannot differ; white is the
                       ceiling, and a rule no palette could satisfy is not a rule
  card / field         NOT declared — a field is separated by its BOUNDARY,
                       `color.input`, measured at 4.33:1
```

### It was green and blind on its first run

The check passed a planted collision. The resolved map is keyed by FULL token
path while this table, like `COLOR_ROLE_POLICIES`, names roles relative to
`semantic.` — so every lookup returned `undefined`, every pair hit the
"absent is skipped" branch, and it reported clean over twelve pairs it had never
looked at.

It was caught by reverting `statutory` to its colliding value and watching the
generator succeed. **Nothing else would have said so** — which is ADR-024's point
exactly, and the fifth time in this migration that "absent is skipped" has hidden
something.

### Dark had no depth mechanism

Binding both shadow inks to fully transparent in dark left all five elevation
roles rendering identically, with surface steps of 1.9 and 2.9 CIEDE2000 carrying
the whole model. A black ink at 45% reads perfectly well on a RAISED surface even
when it does nothing against a near-black page.

### Dynamic colour: adopt HCT, reject DynamicScheme

Verified against primary sources. `material-color-utilities` guarantees contrast
only for the pairs M3 itself declares; where a target ratio is unattainable it
returns the nearest bound rather than failing; seven of nine variants discard the
tenant's chroma; and in the 2025 spec **the error hue is derived from the seed**,
while harmonisation rotates status *toward* brand — reducing the separation a
statutory product needs. Its output also changes across library versions, which
collides with law 33.

If per-tenant palettes are wanted, generate them at ONBOARDING time over a finite
enumerated set of approved seeds and run `assertColorPolicies` over each, so a
brand that cannot produce an accessible scheme is refused before it ships.

## 3g. Accessibility, and the difference between a scan and evidence

Three levels, and each answers a question the one below it cannot.

```
  A11y-1   axe over WCAG 2.0/2.1/2.2 A + AA          mechanical
  A11y-2   keyboard, focus and ARIA, in a browser    mechanical
  A11y-3   what a screen reader actually SAID        a person, transcribed
```

### The green that covered a third of the system

Measured 2 Sep 2026 against the running gallery: **zero axe violations across six
theme × density modes** — with **27 rules evaluated and 36 INAPPLICABLE**, because
five contracts appeared in no tree in the repository at all, and every overlay was
closed.

```
  Dialog     modal        rendered NOWHERE     owes A11y-3
  Select     composite    rendered NOWHERE     owes A11y-3
  Tooltip    disclosure   rendered NOWHERE     owes A11y-3
  Textarea   form-control rendered NOWHERE
  InputGroup none         rendered NOWHERE
```

**A scan of a page that never opens a dialog is not evidence about dialogs**, and
it prints exactly the same green. The three heaviest obligations in the registry
were carried by components nobody could look at, in a system whose gallery exists
so that every block is seen before it reaches a page.

So the rule is now mechanical: **every contract must be mounted somewhere.**
`tests/unit/design-contracts.test.ts` fails on a contract that renders in no
tree — and asserts that its own search can say *no*, so it cannot pass by
matching everything.

### `e2e/axe.ts` had no caller

The only mechanical WCAG check in the repository was an uncalled function. Both
specs that imported it were deleted in the cutover, and its own header still
described them as live. That voided ADR-025, which had written the condition
down: *"If that spec is deleted, this ADR loses its basis."* Nothing went red,
because no guard reads a sentence claiming a check exists.

Restored as two specs, and they scan different things:

```
  a11y-conformance.spec.ts            the PRODUCT — every read state, every
                                      write outcome with a surface
  design-system-conformance.spec.ts   the VOCABULARY — six theme x density
                                      modes, WITH THE OVERLAYS OPEN
```

### A session is a record, not an integer

The gate decided the whole A11y-3 question with `recorded < revision`, so
`{"Dialog": {"interactionRevision": 1}}` was a pass — while the ledger's header
promised a tool and version and ADR-025 required a verbatim transcript. Two prose
sources agreed with each other and neither agreed with the code.

`tooling/verify/lib/at-session.mjs` now requires, per run: `at{name,version}`,
`browser{name,version}`, `os`, `date`, `tester`, and `scenarios[]` each carrying a
verbatim `announced`. **Malformed evidence FAILS; absent evidence stays PENDING**,
because absence is honest and a claim is not.

**Minimum pairing: NVDA + Chrome and JAWS + Chrome.** One reader cannot separate a
component defect from a reader quirk. VoiceOver + Safari is **not required and is
recorded exposure** — it needs macOS hardware this project does not have, and a
gate nobody can satisfy is one that gets waived. ADR-030 carries the date.

### Two claims that were prose and are now measured

```
  prefers-reduced-motion: reduce   transitions -> duration.none (0.01ms)
                                   shimmer 2s infinite -> iteration-count 1
                                   AND THE SKELETON IS STILL VISIBLE
  forced-colors: active            outline 2px solid, recoloured to system
                                   Highlight rather than disappearing
```

The second is the whole argument for choosing an outline over shadcn's box-shadow
ring — `FRAGILE_MEANS` says a shadow does not survive forced-colors — and it had
been reasoning from a comment.

### The focus ring transitions, and a test that does not wait will lie

`transition` includes `outline-color`, so reading the computed colour immediately
after `Tab` returns the element's **text** colour: white on a filled button, ink
on a plain one. A first measurement reported four focus colours and an invisible
ring on the primary action. **There was no defect; there was a race.** With a
settle, 24 of 24 tab stops resolve to the ring token.

Recorded because the wrong conclusion is the tempting one: the obvious "fix" is to
change the component.

### The `aria-hidden-focus` incompletes are Base UI's focus guards

Opening any overlay leaves axe with three `aria-hidden-focus` **incompletes** —
not violations. They are:

```
  #root                                     aria-hidden + data-base-ui-inert
  span[data-base-ui-focus-guard] x2         tabindex=0, aria-hidden, clipped
```

That is how the trap is built: sentinel spans catch Tab at either end and wrap
focus back in, and the background is inerted rather than merely hidden. axe
cannot tell a sentinel from a mistake, which is exactly what *incomplete* means.

**Measured rather than assumed**: fourteen consecutive Tab presses from inside
the dialog and from inside the command palette reach background content **zero**
times. Recorded here because an incomplete that is benign and permanent is the
sort of thing that gets re-investigated every six months.

### A tooltip is visual-only, and the trigger has to say it

Found by running the new spec rather than by reading anything. On hover the
popup mounts `data-open` and visible, with **no `role`**, and the trigger gets
**no `aria-describedby`**. Base UI's own guidance says why, and it is a decision
rather than a gap:

> Tooltips are visual-only and do not replace proper labeling of the trigger
> element. **The trigger must include an `aria-label` attribute that matches the
> tooltip's content** … They are not accessible to touch or screen reader users.

So:

```
  NEVER   put information in a Tooltip that appears nowhere else
  ALWAYS  make the trigger's ACCESSIBLE NAME carry what the tooltip says
```

`role="tooltip"` is now on the popup — honesty about what the element is, not a
fix, because a role nothing references is still not announced. Wiring
`aria-describedby` ourselves would re-implement what the library deliberately
declined to do (law 34).

The specimen had this wrong on its first pass: the trigger read *"About the
statutory ceiling"* while the tooltip carried the rate. A reader got the
signpost and never the fact.

`Tooltip` keeps `disclosure` and therefore keeps owing an A11y-3 session.
Downgrading it to `none` would describe the markup accurately and remove the
obligation from the one component where a person most needs to listen.

### Rules that no scanner can enforce

- **A data table needs a row header.** `<th scope="col">` is a default on
  `TableHead`; the identifying column uses `TableRowHeader`. Without it a reader
  announces "Payroll Officer" without saying whose. axe passes a table with zero
  row headers, because a table of pure data cells is a legal table — it is simply
  the wrong one.
- **A caption is the table's accessible name.** It was reading "Showing 4
  employees, and there are more." — a completeness statement standing in for an
  identity.
- **Colour never carries meaning alone** (WCAG 1.4.1). Checked, and it holds:
  every Badge state and every Alert tone carries the word.
- **24px minimum target** (WCAG 2.5.8). `min-h-target-minimum`, and `inline-flex`
  with it — an inline box ignores height, so the minimum silently does nothing.

## 4. Drift control: one home per fact

Drift is what happens when a fact acquires a second home and the two agree, right
up until they do not. The map below is the answer to "where does this live",
and adding a second home for any row is the defect this system is arranged
against.

| Fact | Its one home |
| --- | --- |
| What a colour is | `packages/design/tokens.json` |
| What a role may be | `packages/design/policy/**/*.mjs` |
| The CSS custom-property name | `vocabulary.mjs` — `cssNameOf` |
| The Tailwind utility name | `projection/tailwind.mjs` — `tailwindNameOf` |
| Which properties exist | `generated/token-names.json` |
| The vocabulary, for humans | `generated/FOUNDATIONS.md` |
| A component's grammar | `contracts.ts` |
| A component's classes | `packages/design/src/styles.ts` and the component |
| Whether a screen may style | `no-bespoke-styling` |

**Everything under `generated/` is derived and never hand-edited** (law 27). The
`generate` stage regenerates and diffs, so an edit is not merely wrong — it is
reverted and reported.

---

## 5. Declared, not yet governing

Some policy is written ahead of the data that will exercise it. That is
deliberate and it is **not dead code**: the rule exists so that the day the data
arrives, it arrives into a system that already knows what to do with it.

| Reserved | Activates when | Where |
| --- | --- | --- |
| Token lifecycle — `experimental`, `stable`, `deprecated`, with a required replacement pointer | a token or colour role carries deprecation metadata | `contract.mjs` |
| Elevation as shadow | a shadow token is minted; the sole-means rule then needs a consumer | `elevation.mjs` |
| Compatibility across versions | a second emitted vocabulary exists to diff against | not built |

**The lifecycle vocabulary should read DTCG `$deprecated`** rather than an
invented `lifecycle:` key — `contract.mjs` records this, and it is the shape to
implement when a token is first deprecated. Inventing a parallel key would put
the document out of step with the format it claims to speak.

A reserved rule reports "not applicable yet", never "clean". The distinction
matters: a green from a rule that has never seen real data is not evidence.

---

## 5. The gallery is the guardrail

> **A block previews in the gallery before it is wired into a live page.**

`pnpm gallery` — Vite, port 4300, `packages/design/gallery`. It renders every
block with the theme and density toggles that set the same attributes the product
sets, on the same element.

**Why it is a rule and not a convenience.** Every check in §3 is structural.
Guards read text, the compiler reads types, the compile test asks whether a class
produces CSS. Not one of them can say a thing *looks* wrong, and nothing else in
this repository renders a component for a person: the conformance harness builds
an IIFE for Playwright to inject, and the app has one route. So without this, a
block can be typechecked, class-compiled, contract-registered, committed, and
shipped having never been seen.

**It earns its place immediately.** The first block put in front of it exposed a
defect nothing else could have: the destructive Button read
`bg-destructive/10 text-destructive`, which rendered a barely-legible label.
Two causes, both real —

```
  wrong role shape   `destructive` was a pale status backdrop, and shadcn uses
                     it as a strong ACTION fill. It paints a button somebody
                     presses, not a region somebody reads.
  composited opacity `/10` is not a token pair. The contrast invariant measures
                     the pair the graph can see, and opacity produces a colour
                     that exists only after render -- the same defect that once
                     showed a disabled label at 2.56:1 while every check
                     reported 5.17:1.
```

Both were fixed at the source: `destructive` became a strong fill with its own
`-foreground` and `-hover`, and the variant was rewritten to real roles.

**The order matters.** The gallery is where a mistake is cheap. A page is where
it is not.

## 5a. Build wiring, and the one alias

Three facts a reader will otherwise have to reconstruct.

**Two token packages exist, temporarily.** `packages/design` is the superseding
system; `packages/design` is the one it replaces. They are generated side by side
and never merged — a shared token file is exactly the seam where two design
systems would begin styling one screen. `packages/design` is deleted with
`packages/design`, and `TOKEN_PACKAGES` in the generator returns to one entry.

**`@/*` maps to `packages/design/src/*` in the root tsconfig, and it shadows
nothing.** Commit `4ee9b16` deleted a sixteen-entry `paths` map so workspace
packages resolve through pnpm symlinks and their own `exports`, and
`workspace-packages-resolve-as-packages` refuses any alias shadowing a workspace
specifier. `@/*` is not a package name and only one package uses it. It exists
because the shadcn CLI writes `@/lib/cn` into every component it installs; the
alternatives were a codemod after every install, or hand-copying.

**`tsconfig.json` must be strict JSON, not JSONC.** TypeScript accepts comments
there; the guard that reads the `paths` map does not, and it fails closed rather
than skipping a file it cannot parse. That is the right direction — an unchecked
alias map is how a shadowing alias would return — so the reasoning lives here
instead of above the line it explains.

## 6. How to do the four things

**Add a token.** Put it in `tokens.json` under the right tier. Run
`pnpm gen:tokens`. If it is a semantic or component role, the generator makes you
decide its Tailwind namespace — a token that is neither projected nor recorded in
`UNPROJECTED` with a reason throws. Then `git add` the generated output and gate.
Regenerating without staging reads as drift.

**Rename a token.** One pass, all at once, before anything consumes the new name.
`tokens-referenced-are-tokens-that-exist` refuses a dangling reference and the
compile test refuses a stale class, so a half-applied rename is red rather than
subtle. Renaming lazily, as each collision appears, is how the rules get
discovered by debugging instead of decided — ADR-029.

**Add a component.** Give it a contract with an `interaction.profile`. Style it
with utilities from the bridge. Put shared class strings in `styles.ts`, never
duplicated. Never build a class by interpolation — Tailwind scans source text, so
an assembled class name is invisible to it and generates nothing.

**Add a variant.** A lookup keyed by the union type, spelled out in full. The
union is the whole vocabulary, so a screen cannot compose a variant that does not
exist.

---

## 7. What this system does not check

Stated so a green is not read as more than it is.

- **Whether a component behaves as its `interaction.profile` claims.** THE
  LARGEST HOLE, and it is new. The conformance suites read the old registry's
  slot and prop grammar to build documents and mount primitives through a
  harness; this registry deliberately has no such grammar, so the harness and
  seven e2e specs were deleted with the system they interpreted —
  `a11y-conformance`, `conformance-harness`, `inert-contracts`,
  `live-region-politeness`, `native-control`, and the `documents`/`harness`
  helpers. `interaction-profile-mutation` survives against the ONE consumer that
  did: the assistive-technology evidence gate. Until the suites are rewritten, a
  profile that is wrong in a way that gate cannot see is a profile nothing
  catches.
- ~~**Primitive-level axe coverage.**~~ CLOSED 2 Sep 2026. It was worse than
  this entry said: `axe.ts` had NO CALLER at all, so it covered the application's
  state surfaces in prose only. `a11y-conformance.spec.ts` scans those states
  again and `design-system-conformance.spec.ts` scans the vocabulary with the
  overlays open. See 3g.
- **The stacking premise.** Exactly one `z-index`, on the toast layer, because
  tree order decides everything else. There is no stylesheet of plain rules to
  count declarations in and no toast component yet; `tokens.test.ts` carries it
  as `it.todo`.
- **What a screen reader actually says.** axe and the browser specs agree the
  tree is correct; announcement order and verbosity need a person. A11y-3 is
  owed on **eight** contracts -- Alert, Command, Dialog, DropdownMenu, Select,
  Sheet, Status, Tooltip -- and `.architecture/a11y-evidence.json` records zero
  sessions. It read "five" here while the derivation returned six and ADR-025
  said one; ADR-030 makes the number derived rather than transcribed.
- **Whether it looks right.** There is no visual regression check anywhere.
- **Shipped CSS size — and this is where a market number belongs.** The route
  budget counts JavaScript only; the stylesheet budget counts authored
  declarations with comments stripped, which is a growth tripwire on the
  vocabulary and explicitly not a claim about transfer size. The four authored
  assets total ~4.2 KB gzipped; the 2025 Web Almanac puts median CSS transfer
  at **82 KB** across 17.2M sites. Those two numbers are not comparable, and
  setting the tripwire from the market figure would put it 20x above anything
  these files can reach — configured, green and blind. What ships is Tailwind's
  generated utilities plus this vocabulary, nothing measures it, and a budget on
  the BUILT bundle is the instrument that would carry 82 KB as its reference.
  It arrives with the `build` stage, not before.
- **Whether a name is a good name.** The generator proves a projection is
  injective and reachable. It cannot tell you the word is wrong.

---

## Related

```
  ADR-029  one UI system; vocabulary settled in one pass, proved by the compiler
  ADR-028  Tailwind v4 and shadcn on Base UI
  ADR-025  assistive-technology evidence is required by interaction profile
  ADR-024  a guard earns authority by rejecting a known violation
  law 7    every fact has one authoritative source
  law 27   generated state is never hand-edited
  law 29   invariants are enforced by guards, not prose
```
