# 02 — Build: tokens

Turning an existing product's visual language into a structured, scalable token
architecture in Figma. You are not making a generic UI kit, and you are not redesigning
the product.

Target architecture:

```
SOURCE PRODUCT → FOUNDATIONS → PRIMITIVES → SEMANTIC TOKENS
→ TEXT / EFFECT / GRID STYLES → COMPONENTS → PATTERNS → TEMPLATES → GUIDELINES
```

## Contents

- [Analyze first](#analyze-first)
- [Page structure](#page-structure)
- [Documentation layout rules](#documentation-layout-rules)
- [Collections](#collections)
- [01 · Core / Color](#01--core--color)
- [02 · Core / Dimension](#02--core--dimension)
- [03 · Core / Typography](#03--core--typography)
- [10 · Theme / Color](#10--theme--color)
- [Light and dark](#light-and-dark)
- [11 · Semantic / Typography](#11--semantic--typography)
- [Text styles](#text-styles)
- [12 · Layout / Responsive](#12--layout--responsive)
- [20 · Component / Tokens](#20--component--tokens)
- [Scopes](#scopes)
- [Naming](#naming)
- [Effect and grid styles](#effect-and-grid-styles)
- [Execution order](#execution-order)
- [Foundation QA gate](#foundation-qa-gate)
- [Failure conditions](#failure-conditions)

## Analyze first

The current Figma file is the primary source of truth. Before creating anything, inspect
the entire file and extract: brand colors, neutral colors, typography, font families,
weights, sizes, line heights, letter spacing, spacing, sizing, radii, borders, opacity,
effects, grids, breakpoints, existing components, repeated UI patterns, navigation, forms,
cards, overlays, light/dark appearance, and responsive behavior.

Do not generate generic design values.

**Do not redesign the product.** Never change existing screens' colors, fonts, or spacing,
replace their components, rewrite their text, move their content, or migrate them onto the
new tokens. The product is reference material. Build the system beside it.

**Detect the platform** before building components — web, SaaS, dashboard, mobile, desktop,
or multi-platform. It determines the component catalog, control sizing, navigation,
responsive architecture, grids, patterns, and templates. For web/SaaS, build a broad
production library by default.

## Page structure

```
00 — Overview
01 — Foundations
02 — Components
03 — Patterns
04 — Templates
05 — Guidelines
```

No duplicate equivalent pages. **Empty pages are forbidden** — every page created must
contain real, usable content before the job is done.

## Documentation layout rules

Every documentation page gets **one root vertical Auto Layout container**.

- **Never fix documentation height.** Root, sections, and showcase containers hug their
  contents. A fixed height clips content the moment anything grows.
- Width is chosen deliberately and stays consistent across sections; content that needs
  more width gets more width rather than being clipped.
- Sections do not overlap. Clip is off on documentation containers.

## Collections

Create exactly these unless there is a clear architectural reason for more:

| Collection | Level | Contains |
| --- | --- | --- |
| `01 · Core / Color` | primitive | Raw color values, no modes |
| `02 · Core / Dimension` | primitive | Spacing, size, radius, border, opacity |
| `03 · Core / Typography` | primitive | Family, weight, size, line height, letter spacing |
| `10 · Theme / Color` | semantic | All semantic UI color, Light + Dark modes |
| `11 · Semantic / Typography` | semantic | Typography intent + global family roles |
| `12 · Layout / Responsive` | semantic | Breakpoint-driven layout values |
| `20 · Component / Tokens` | component | Component-specific decisions, only when needed |

The number communicates architectural level: `01–09` core primitives, `10–19` semantic and
contextual systems, `20+` component-specific. Never mix abstraction levels in one
collection.

Dependency direction is one-way:

```
CORE PRIMITIVES → SEMANTIC TOKENS → COMPONENT TOKENS (only if necessary) → STYLES / COMPONENTS
```

Never bind a component directly to a raw value when an appropriate semantic token exists.

## 01 · Core / Color

Raw values only. No light/dark modes at this level.

Possible groups — create only what the product needs: `Neutral`, `Brand`, `Accent`,
`Success`, `Warning`, `Error`, `Info`, `Chart`.

**Extraction.** Collect the colors actually used in the product first: primary brand,
secondary brand, neutral scale, backgrounds, surfaces, foreground/text, borders,
interactions, statuses. Preserve exact brand values.

**Naming** describes family and intensity, never usage:

```
Neutral/0, Neutral/50, Neutral/100 … Neutral/900
Brand/100, Brand/200, Brand/300 …
Error/100, Error/500, Error/700
```

Never `Button Blue`, `Text Gray`, `Error Background`, `Primary Button`.

**No useless ramps.** Do not auto-generate 50–900 for every hue. Create tonal steps only
where required for interaction states, subtle backgrounds, borders, dark theme, statuses,
or charts. A smaller intentional palette beats a large artificial one.

## 02 · Core / Dimension

Raw reusable number variables in groups: `Spacing`, `Size`, `Radius`, `Border`, `Opacity`.

**Spacing** — a coherent scale derived from actual source values, e.g.
`Spacing/0, 2, 4, 6, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64, 80, 96`. Don't create unused
numbers.

**Size** — meaningful subgroups using source-product sizing:

```
Size/Icon/12 · 16 · 20 · 24 · 32
Size/Control/32 · 36 · 40 · 44 · 48
Size/Avatar/24 · 32 · 40 · 48
```

**Radius** — `Radius/0, 2, 4, 6, 8, 12, 16, 20, 24, Full`.

**Border** — width only (`Border/0, 1, 2`). Border *colors* belong to semantic color.

**Opacity** — purposeful values only: `Opacity/Disabled`, `Opacity/Overlay`,
`Opacity/Subtle`. Don't tokenize arbitrary decorative opacity.

## 03 · Core / Typography

Raw primitives in groups: `Family`, `Weight`, `Size`, `Line Height`, `Letter Spacing`.

Detect existing font families in the source first. The system supports **two global family
roles** — Primary and Secondary. If the source has only one font, both roles may initially
point at it; the architecture still exists so a second can be introduced without a rebuild.

Raw family variables carry the real font name (`Family/Inter`, `Family/Manrope`). Weight,
size, line-height, and letter-spacing variables carry values, not roles.

## 10 · Theme / Color

All semantic UI color. Modes: **Light**, **Dark**. Semantic tokens alias
`01 · Core / Color` wherever possible — do not duplicate raw hex.

Groups (retain only what the product needs): `Background`, `Foreground`, `Surface`,
`Action`, `Border`, `Input`, `Selection`, `Feedback`, `Focus`, `Overlay`, `Navigation`,
`Chart`.

```
Background/Canvas · Surface · Surface Secondary · Surface Tertiary · Raised · Inverse · Brand

Foreground/Primary · Secondary · Tertiary · Disabled · Inverse · Brand · Link

Surface/Card/Background      Surface/Card/Foreground
Surface/Popover/Background   Surface/Popover/Foreground
Surface/Dialog/Background    Surface/Dialog/Foreground
Surface/Tooltip/Background   Surface/Tooltip/Foreground

Action/Primary/Background/Default · Hover · Pressed · Disabled
Action/Primary/Foreground/Default · Disabled
Action/Primary/Border/Default
Action/Secondary/…    Action/Tertiary/…    Action/Destructive/…

Border/Subtle · Default · Strong · Disabled · Focus · Destructive

Input/Background/Default · Disabled
Input/Border/Default · Hover · Focus · Error · Disabled
Input/Foreground/Value · Placeholder · Label · Helper · Error

Feedback/{Success|Warning|Error|Info}/{Background|Foreground|Border}

Focus/Ring

Navigation/Background · Foreground · Foreground Active · Background Active · Border
```

Surface tokens are paired so foreground/background pairing is obvious. **Complete
interaction sets are mandatory** on every action variant the product actually has.

## Light and dark

Light and dark use **exactly the same semantic names**. Only the alias differs.

```
Foreground/Primary   Light → Neutral/900
                     Dark  → Neutral/100
```

Components always consume `Foreground/Primary`. Never create
`Foreground Primary Light` / `Foreground Primary Dark`, and never duplicate components per
theme.

**Dark is not an inversion.** Build it intentionally, maintaining surface hierarchy,
contrast, readable foreground, brand identity, status meaning, and interaction states.
Avoid pure black and pure white unless the source requires them.

Dark surface depth, typical: `Canvas` (darkest) → `Surface` (slightly lighter) → `Raised`
(lighter) → `Popover/Dialog` (elevated). Preserve perceptual depth.

Re-verify every contrast pair in both modes against `00-standards.md`.

## 11 · Semantic / Typography

Typography **intent**, not a duplicate of raw values. Groups: `Family`, `Display`,
`Heading`, `Body`, `Label`, `Caption`.

**Global family roles are mandatory:**

```
Family/Primary   → 03 · Core / Typography / Family / Inter
Family/Secondary → 03 · Core / Typography / Family / Manrope
```

Changing `Family/Primary` in one place must update every dependent text style and
component. Same for `Family/Secondary`. No manual text-style editing may be required. This
is a hard requirement — test it (see [Execution order](#execution-order), phase 13).

Create only the roles the source hierarchy supports. Typical:

```
Display/Large · Medium · Small
Heading/XL · L · M · S
Body/Large · Medium · Small
Label/Large · Medium · Small
Caption
```

Each role specifies family role, size, weight, line height, and letter spacing — bound to
variables, not typed in. Display may use Secondary; headings may use either; body, label,
caption, and all control typography use Primary unless the brand says otherwise.

## Text styles

Create **real Figma text styles** for every semantic role, and **bind them to the
typography variables** wherever Figma supports binding. Variables that exist but aren't
bound are the single most common failure in this work.

QA each style:

- Family resolves through `Family/Primary` or `Family/Secondary`, not a hard-coded name.
- Font size, line height, and letter spacing are bound to variables.
- No avoidable hard-coded typographic values remain.
- Component typography consumes text styles, not local overrides.

## 12 · Layout / Responsive

Breakpoint-driven layout values — container widths, gutters, page padding, grid columns,
section rhythm. Modes here are **breakpoints**, and they are an independent axis from the
light/dark theme axis. Never fold responsive values into the theme collection; a user must
be able to switch theme and breakpoint independently.

## 20 · Component / Tokens

Only when a component genuinely needs a decision that no semantic token expresses. Audit
components for local raw values; wherever a valid semantic token exists, replace the raw
value with a binding. A large component-token collection is a symptom that the semantic
layer is incomplete.

## Scopes

Configure variable scopes so the Figma picker offers the right variables in the right
place — color variables scoped to fills/strokes as appropriate, spacing to gap and padding,
radius to corner radius, sizing to width/height. Then run the **picker test**: open a real
component, try to bind each property, and confirm the correct variables appear and the
irrelevant ones don't.

## Naming

Hierarchical, intent-based: `category / concept / property / variant / state`. Not every
token needs every level.

```
Action/Primary/Background/Hover
Feedback/Error/Foreground
Spacing/16
Heading/Large
```

Never: `Blue Button`, `Red New`, `Gray 3`, `Text Dark`, `Spacing Big`, `Color 51`,
`Property 1`.

For components, use a block-oriented model compatible with frontend thinking — component
is the block, internal reusable parts are elements, variants and states are modifiers.
Don't force literal CSS BEM strings where they don't fit.

## Effect and grid styles

Create effect styles for the elevation levels the product actually uses, named by role
(`Elevation/Raised`, `Elevation/Overlay`) rather than by value. Create grid styles for the
layout grids in use. Both get documented alongside color and typography.

## Execution order

Follow this sequence exactly. Each phase depends on the one before it.

| Phase | Work |
| --- | --- |
| 1 | Analyze source |
| 2 | Detect platform and visual system |
| 3 | Create page structure |
| 4 | Core color variables |
| 5 | Core dimension variables |
| 6 | Core typography variables |
| 7 | Semantic color variables (Light + Dark) |
| 8 | Primary / Secondary typography family roles |
| 9 | Semantic typography variables |
| 10 | Responsive layout variables |
| 11 | Validate collections, modes, aliases, scopes |
| 12 | Create text styles and bind variables |
| 13 | **Global font change test** — swap `Family/Primary`, confirm propagation, revert |
| 14 | Effect and grid styles |
| 15 | Generate foundations documentation from real tokens (`04-documentation.md`) |
| 16 | **Foundation QA gate** |
| 17–19 | Component library, per-component QA, component documentation (`03-components.md`) |
| 20–23 | Patterns, pattern QA, templates, template QA (`03-components.md`) |
| 24 | Guidelines |
| 25–28 | Full variable QA, component QA, canvas QA, final validation |

## Foundation QA gate

Before starting components, verify every line. If any fails, **stop and fix it** — do not
proceed.

- Color primitives exist.
- Semantic colors exist, count > 0.
- Every semantic token has both a Light and a Dark value.
- Aliases resolve; no circular aliases.
- Typography variables exist.
- `Family/Primary` and `Family/Secondary` exist and reference available fonts.
- Text styles are actually bound to variables.
- Font size, line height, and letter-spacing bindings exist where applicable.
- Global Primary font change propagates. Global Secondary font change propagates.
- Spacing, sizing, and radius exist. Grid exists where required.
- Collections are navigable: primitives separated from semantics, readable groups, scopes
  configured, modes used correctly, responsive context separate from theme context, no
  giant flat lists, no duplicate token families without purpose.
- Documentation is populated from real variables.

## Failure conditions

The system has failed if any of these are true at the end:

- Semantic colors are empty.
- Semantic variables use raw values where an alias was available.
- Primitive and semantic tokens are mixed in one collection.
- Typography variables exist but text styles don't use them.
- Primary or Secondary font cannot be changed globally.
- Text styles contain avoidable hard-coded typography.
- Components contain raw colors while semantic tokens exist.
- Documentation uses fixed height, or components are clipped.
- Focus states are missing.
- Dark mode is a simple inversion.
- Patterns or templates redraw controls instead of instancing them.
- Created pages are empty, or documentation sections overlap.
- The variables panel is hard to navigate.
- The component library contains only a few basic controls.
- Component architecture is not composable.

**Success standard.** A designer opens the variables panel and immediately understands
what is primitive, what is semantic, what controls theme, what controls typography, what
controls layout, and what is component-specific. They can change `Family/Primary` in one
place and update every dependent text style and component. They can switch Light ↔ Dark
without touching a component. The system scales without rebuilding its architecture.
