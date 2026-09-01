# 04 — Document: foundations

Generating complete, deterministic, developer-ready documentation of the variables and
styles that **actually exist** in the current Figma file.

This is the most rule-bound mode in the skill, because its failure mode is quiet: plausible
documentation that doesn't match the source is worse than none. Creating Figma layers is
not proof of success. Output is valid only when the actual generated layers have been read
back and verified against the actual source.

Transaction:

```
Discover → Inventory → Normalize → Classify → Prepare → Stage → Prove Renderers
→ Render → Read Back → Validate → Repair → Validate Again → Completion Gate → Atomic Commit
```

## Contents

- [Constitution](#constitution)
- [Schema and transaction](#schema-and-transaction)
- [Discovery](#discovery)
- [Source models](#source-models)
- [Foundation classification](#foundation-classification)
- [Number variable classifier](#number-variable-classifier)
- [Grouping](#grouping)
- [Typography variable aggregation](#typography-variable-aggregation)
- [Developer tokens](#developer-tokens)
- [Renderer registry](#renderer-registry)
- [Paint style contract](#paint-style-contract)
- [Typography contracts](#typography-contracts)
- [Other renderer contracts](#other-renderer-contracts)
- [Visual system](#visual-system)
- [Table system](#table-system)
- [Column contract](#column-contract)
- [Preview sizes](#preview-sizes)
- [Batch execution](#batch-execution)
- [Validation contracts](#validation-contracts)
- [Read-back contracts](#read-back-contracts)
- [Repair contract](#repair-contract)
- [Generated components](#generated-components)
- [Completion gate](#completion-gate)
- [Visual checksum](#visual-checksum)
- [Invalid outputs](#invalid-outputs)
- [Execution state](#execution-state)

## Constitution

**C1 — Source is authoritative.** Document only real data discovered from the current file.
Never invent variables, styles, collections, modes, aliases, descriptions, paint values,
gradient data, typography properties, grid properties, breakpoints, states, or semantic
relationships. If a property genuinely does not exist, preserve its absence. Use `—` only
where a fixed table schema requires a visible cell.

**C2 — Source entities are immutable.** Never modify source variables, styles, collections,
modes, aliases, descriptions, components, component sets, product screens, or source
frames. Developer tokens are documentation metadata only.

**C3 — Source identity is immutable.** Every entity retains its real identity through every
pipeline stage. Variables preserve `sourceKind = VARIABLE`, `variableId`, `variableType`,
`collectionId`, `collectionName`. Styles preserve `sourceKind = STYLE`, `styleId`,
`styleType`. Identity survives normalization, classification, grouping, token generation,
rendering, and read-back.

**C4 — Labels never determine source type.** A name that looks like a color does not make
something a paint style. Type comes from the actual source entity.

**C5 — Variables and Styles are independent pipelines.** A style never enters the variable
inventory; a variable never enters the style inventory. No style is ever rendered by a
variable renderer, and vice versa.

**C6 — Fail closed.** A row is valid only when its generated output passes its renderer
contract. Missing, empty, generic, clipped, incorrect, wrong-cell, wrong-renderer,
visually absent, or technically divergent output makes the row invalid. Repair or rebuild.
Never silently accept partial output.

**C7 — First row proves a renderer.** Every renderer proves itself on the first real row of
its dataset before the rest are rendered.

**C8 — Read back actual output.** Verify against what was generated, not what was intended.

**C9 — Every source entity must be represented.**

**C10 — Nothing important may be hidden.** Never truncate, clip, or ellipsize names, values,
aliases, modes, descriptions, developer tokens, gradient stops, typography values, grid
values, or previews. Grow the layout instead of removing information.

**C11 — Visual system is locked.** The checksum below is fixed between executions.

**C12 — English documentation UI.** Chrome labels are English; source names are reproduced
exactly as they exist.

**C13 — Determinism beats cleverness.** The same source produces the same documentation.

**C14 — Generated output carries provenance.** Every generated row stores at minimum
`docs.sourceKind`, `docs.sourceId`, `docs.renderer`, `docs.schemaVersion`, and where
applicable `docs.collectionId`, `docs.styleType`, `docs.variableType`, `docs.sourceHash`.
Labels are for humans; metadata is for identity and reconciliation.

**C15 — Last known-good documentation is protected.** Never destroy or partially overwrite
valid existing documentation while building its replacement. All new output goes to
staging first.

## Schema and transaction

`DOCS_SCHEMA_VERSION = 2`

A generated component may be reused only when its expected name matches, its schema version
matches, **and** its required internal structure matches. Otherwise rebuild it.

Roots:

- Active: `Foundations Documentation`
- Staging: `Foundations Documentation / __staging__`

Never mutate the active root while staging is incomplete.

**On success:** verify staging passes every completion condition → remove or replace the
previous documentation → promote staging to active → run a final read-back smoke
validation.

**On failure:** stop the commit → preserve existing active documentation → remove invalid
staging where safe → return a structured failure report.

Never leave active documentation half regenerated.

## Discovery

Behave like a design-system indexer, in this priority order: variable collections →
variables → variable modes → styles → aliases → descriptions → style properties → targeted
canvas inspection only when required.

Do not perform a full product-screen audit.

## Source models

```
VariableRecord = {
  sourceKind: VARIABLE, variableId, variableType, sourceName,
  collectionId, collectionName, modes, description, sourceReference
}

StyleRecord = {
  sourceKind: STYLE, styleId, styleType, sourceName,
  description, sourceReference, sourceProperties
}
```

Recognized style families, at minimum: Paint, Text, Effect, Grid.

## Foundation classification

Create a foundation only where real source data exists. Never create empty foundations.
Order:

1. Colors · 2. Typography · 3. Spacing · 4. Sizing · 5. Radius · 6. Borders & Stroke ·
7. Opacity · 8. Effects & Shadows · 9. Grid & Layout · 10. Other Variables

## Number variable classifier

Numeric value alone never determines foundation. Classification uses deterministic source
context — collection, group path, and recognized terminal segment.

| Foundation | Recognized terminals |
| --- | --- |
| Typography | `font-size`, `line-height`, `letter-spacing`, `font-weight` |
| Spacing | `spacing`, `space`, `gap`, `padding`, `margin`, `inset` |
| Radius | `radius`, `corner`, `rounded` |
| Borders & Stroke | `border`, `stroke`, `outline`, `divider` (width) |
| Opacity | `opacity`, `alpha` |
| Sizing | `size`, `width`, `height`, `icon`, `control`, `avatar` |

Precedence: explicit terminal segment → group path → collection semantics → `Other`. Never
classify by the number itself.

## Grouping

**Variables** group first by collection, then by real source hierarchy:

```
Labels/Primary          Group: Labels
Labels/Secondary   →    Rows:  Primary, Secondary
```

**Styles** preserve meaningful style hierarchy:

```
Orange/Button/btn.orange.hover   →   Group: Orange / Button
                                     Row:   btn.orange.hover
```

Where no meaningful hierarchy exists, the root group is `General`.

## Typography variable aggregation

One typography style may exist as several property variables. Aggregate them into a single
row only when **all** conditions pass:

1. identical normalized prefix;
2. recognized terminal properties (`font`, `font-family`, `family`, `font-style`, `style`,
   `weight`, `font-weight`, `size`, `font-size`, `line-height`, `leading`,
   `letter-spacing`, `tracking`);
3. compatible source collection;
4. compatible modes;
5. no conflicting duplicate property.

```
Large Title / Regular / Font            TypographyVariableRow = {
Large Title / Regular / Weight            sourceKind: VARIABLE, sourceVariableIds: [...],
Large Title / Regular / Size        →     collectionId, name: Regular, group: Large Title,
Large Title / Regular / Line Height       fontFamily, fontStyle, fontWeight, fontSize,
Large Title / Regular / Letter Spacing    lineHeight, lineHeightUnit, letterSpacing,
                                          letterSpacingUnit, description, developerToken }
```

If any condition fails, do not aggregate those variables. Never render partial
property-by-property typography rows when a valid complete aggregate exists.

## Developer tokens

Derived documentation metadata. They never alter source entities.

| Foundation | Prefix | | Foundation | Prefix |
| --- | --- | --- | --- | --- |
| Colors | `--color-` | | Opacity | `--opacity-` |
| Typography | `--font-` | | Effects | `--effect-` |
| Spacing | `--space-` | | Grid | `--grid-` |
| Sizing | `--size-` | | Other | `--var-` |
| Radius | `--radius-` | | Border | `--border-` |

**Character rules.** Lowercase, deterministic, unique, stable. No spaces, `/`, `.`, `_`, or
duplicate hyphens. Normalize reliable abbreviations only: `btn → button`, `bg →
background`, `txt → text`. Never invent suffixes like `-2`, `-copy`, `-new`.

**Default-state normalization.** Standalone `orange.default` may become `--color-orange`.
But inside a state family, `button/primary/default` stays
`--color-button-primary-default`. Do not erase meaningful hierarchy.

**Semantic aliases.** Preserve semantic source naming: `Labels/Primary` →
`--color-labels-primary`. Never replace semantic identity with the primitive alias target.

**Collision algorithm**, exactly:

1. generate the preferred normalized candidate;
2. if unique, accept;
3. on collision, restore the nearest omitted meaningful parent segment;
4. repeat outward through the hierarchy until unique;
5. still colliding → prepend normalized collection name;
6. still colliding → prepend normalized source kind;
7. full deterministic hierarchy still colliding → token generation fails.

Never resolve collisions randomly.

**Grid range normalization.** Treat `-`, `–`, `—` as range separators; remove `px`; preserve
both bounds. `1920px and above` → `--grid-1920-up`. `1919–1536px` → `--grid-1919-1536`.
Never collapse `1919–1536` into `19191536`.

## Renderer registry

| Source kind | Type / Foundation | Renderer |
| --- | --- | --- |
| VARIABLE | Colors | Color Variable |
| VARIABLE | Typography | Typography Variable |
| VARIABLE | Spacing, Sizing | Dimension Variable |
| VARIABLE | Radius | Radius Variable |
| VARIABLE | Borders & Stroke | Stroke Variable |
| VARIABLE | Opacity | Opacity Variable |
| VARIABLE | Other | Other Variable |
| STYLE | TEXT_STYLE | Text Style |
| STYLE | PAINT_STYLE | Paint Style |
| STYLE | EFFECT_STYLE | Effect Style |
| STYLE | GRID_STYLE | Grid Style |

Before rendering every row, verify the active renderer accepts it. If not, do not render.
Reset renderer state before every source block.

## Paint style contract

Preserve actual paint data. Recognize at minimum: Solid, Transparent Solid, Linear
Gradient, Radial Gradient, Angular Gradient, Diamond Gradient, Image, Video, Pattern,
Shader, Multiple Paints, Unsupported Future Paint. **Never infer paint type from the style
name.**

**Solid** — actual color value, preserving opacity.

**Gradient** — the value must contain real source gradient data. `Gradient` or
`Linear Gradient` as the *value* is invalid. Every stop preserves position, color, and
opacity, formatted `Position · Color · Opacity` (e.g. `0% · #FF4700 · 100%`). Preserve
direction only where reliably available; never invent it. Require
`sourceGradientStopCount > 0` and `renderedGradientStopCount == sourceGradientStopCount`.
The preview must visually use the actual gradient — a solid preview for a gradient source
is invalid.

**Multiple paints** — document every paint, never only the first.

**Unsupported future paint** — preserve source style identity and the actual paint type
string, render a deterministic technical record, do not fabricate a preview, mark preview
status unsupported, and never silently map it to another renderer.

## Typography contracts

Two independent pipelines.

**Typography variable pipeline:** `Variable Values → TypographyVariableRow → apply resolved
properties to preview`. Preview text is `Ag`. Where a property exists in source, require
exact parity for font family, font style/weight, font size, line height, letter spacing.

**Text style pipeline:** `Actual Text Style → apply actual style to TEXT → Ag`. Primary
strategy is `styleId` → source text style → actual TEXT node → apply the actual style. Do
not route through typography variable logic. If direct style application is technically
unavailable, exact-property reconstruction from that same text style is allowed, and the
original `styleId` stays attached to row provenance.

**Font availability — exactly two preview states:**

- `EXACT` — the source font loads; the preview exactly matches normalized source
  typography.
- `SOURCE_FONT_UNAVAILABLE` — the font cannot be loaded. Preserve all technical source
  typography exactly, render a clearly identified fallback preview for visibility only,
  record the status, never claim parity, and never rewrite technical values to match the
  fallback.

Preview-parity assertions apply only when `previewStatus == EXACT`. A font-unavailable
preview must never masquerade as exact.

## Other renderer contracts

**Color variables** — single mode:
`Token Name | Mode | [Description] | Developer Token`. Multi mode:
`Token Name | Mode 1 | Mode 2 | … | [Description] | Developer Token`. Every mode cell
contains, where applicable, preview, alias, resolved value, and opacity. Require actual
mode count == rendered mode count.

**Spacing / Sizing / Radius / Border / Opacity** — same mode-aware schema. The preview
changes only the property that foundation represents.

**Effect styles** — `Preview | Style Name | Effect Data | [Description] | Developer Token`.
Preserve all actual effects:

```
Drop Shadow
X 0 · Y 4
Blur 16 · Spread 0
#000000 · 16%
```

**Grid & layout** —
`Style Name | Columns | Column Size | Gutter | Alignment | Margin | [Description] | Developer Token`.
Separate columns; never collapse grid properties into one generic stack.

## Visual system

Exactly one active documentation system: `Foundations Documentation`. Page background
`#333333`. Sections are vertical, aligned to one X position, gap `160px`.

**Section** — default width `1440px` (increase when content requires), height hug,
background `#0F0F0F`, radius `16px`, padding `48px`, vertical Auto Layout, clip false.
Never hide content merely to preserve 1440px.

**Section title** — `Inter / 600 / 28 / 34`, `#F5F5F5`.

**Source block label** — `Inter / 500 / 14 / 20`, `#8C8C8C`. Source blocks separate actual
source kinds: `Variables · Colors`, `Variables · Typography`, `Styles`. Before rendering a
variable source block require `ALL_ROWS.sourceKind == VARIABLE`; before a style source
block require `ALL_ROWS.sourceKind == STYLE`.

**Group** — title `Inter / 600 / 16 / 22`, `#F1F1F1`. Title-to-table gap `12px`, group gap
`32px`, source block gap `48px`.

## Table system

Every table gets a fresh shell: `Table Shell → Header → Body → Rows`.

| Part | Spec |
| --- | --- |
| **Shell** | Width fill, height hug, bg `#181818`, radius `8px`, vertical Auto Layout, **clip true**. Only the shell owns the table radius. |
| **Header** | Min height `40px`, height hug, bg `#222222`, padding `10px 16px`, radius 0, clip false. `Inter / 500 / 11 / 15`, `#8F8F8F`. |
| **Body** | Width fill, height hug, bg `#181818`, radius 0, clip false. |
| **Row** | Width fill, min height `64px`, height hug, bg `#181818`, radius 0, padding `12px 16px`, clip false. The tallest cell determines row height; shorter cells fill vertically and stay centered. |
| **Dividers** | `1px #2A2A2A` on every row except the last. Last row: none. Single row: none. |

**Table typography** — primary `Inter / 400 / 13 / 18` `#F1F1F1`; secondary
`Inter / 400 / 12 / 17` `#8C8C8C`; developer token `Inter / 400 / 12 / 17` `#6EA8E5`.

## Column contract

Calculate **one column schema per table** and apply it identically to the header and every
row. Never calculate widths row-by-row.

The description column is dynamic: include it if at least one row has a real source
description, otherwise omit it. It always sits immediately before `Developer Token`.

**Required wrapping.** Names, descriptions, and developer tokens support multi-line
wrapping — width fill container, height auto, auto-resize height only, wrap enabled, clip
false. Never ellipsis. Never fixed single-line truncation. Never hug width for potentially
long values. The name cell fills container height and centers vertically; the row grows
when the name wraps. Developer token cell minimum `280px`.

**Overflow repair order** — horizontal: fix wrapping → grow cell → redistribute columns →
grow table → grow section. Vertical: fix auto height → grow row → grow body → grow shell →
grow section. **Never remove source data.**

## Preview sizes

| Foundation | Size |
| --- | --- |
| Color | 72 × 48 |
| Spacing | 120 × 48 |
| Sizing | 96 × 64 |
| Radius | 48 × 48 |
| Border | 96 × 48 |
| Opacity | 96 × 48 |
| Effect | 96 × 64 |

Typography preview text is `Ag`, initial/minimum width `96px`, minimum height `56px`.
Never allow a required preview width or height to resolve to zero.

## Batch execution

Read-back parity is mandatory for every row; a separate external round-trip per row is not.

- **Renderer proof** — first row: `Render → Read Back → Validate`, always isolated.
- **Remaining rows** — `Render Batch → Read Back Batch → validate every row individually
  in memory`.

Use smaller batches for fragile renderers: text styles, typography variables, gradients.
Never sacrifice per-row validation merely to reduce round-trips.

**Complete dataset rule.** Discover and prepare every row before drawing its group. Never
discover new rows while rendering. Rendering consumes prepared data; it does not perform
discovery.

## Validation contracts

**Universal row assertions** — source identity preserved; renderer accepts source; required
cells exist; required text visible; required preview valid; developer token exists; no
clipping; no required width or height of 0; no required child outside its cell.

**Count** — `Rendered Row Count == Prepared Row Count`. For variables,
`Rendered Mode Count == Source Mode Count`.

**Width** — header, body, and row widths all equal table width; column schema aligned; no
required child outside table bounds.

**Height** — row height content-driven; body hug; shell hug; final row fully visible.

**Radius** — shell radius 8 and clip true; header, body, and row radius 0; top and bottom
corners visible.

## Read-back contracts

**Gradient** — read back preview, type, and value. Require the actual gradient type
represented, rendered stop count == source stop count, and a preview using the actual
source gradient.

**Text style** — read back preview cell, TEXT node, characters, actual typography, and
source provenance. Require the preview child exists, TEXT exists, characters are `Ag`,
`styleId` provenance preserved, and exact typography when `previewStatus = EXACT`.

**Typography variable** — actual preview TEXT properties must match normalized variable
typography when `previewStatus = EXACT`. Technical table values alone are not proof.

## Repair contract

Bounded. Never repeat the same failed action indefinitely.

1. **Attempt 1** — repair child configuration: wrapping, sizing, font loading, wrong
   preview child, wrong cell configuration.
2. **Attempt 2** — rebuild the invalid row from the normalized source model.
3. **Attempt 3** — rebuild the renderer/table from a clean prepared dataset.

Still invalid → stop the affected transaction. Do not commit staging.

## Generated components

Create or reuse: `Docs / Section`, `Source Block`, `Group`, `Group Title`, `Table Shell`,
`Table Header`, `Table Body`, `Variable Row`, `Paint Style Row`, `Typography Row`,
`Grid Row`, `Effect Row`, `Mode Cell`, and `Docs / Preview / {Color, Typography, Spacing,
Sizing, Radius, Border, Opacity, Effect}`.

Reuse only when schema provenance matches. **Never reuse a component solely because its
name matches.**

## Completion gate

Commit staging only when every applicable condition is true:

```
All discovered source entities accounted for
All prepared Rows represented
All Rows preserve source identity and correct sourceKind
No Style rendered by a Variable renderer; no Variable by a Style renderer
All Modes represented
All required Previews valid
All Gradient Rows contain actual source stops; no generic Gradient Value
All exact Text Style Previews contain TEXT, use "Ag", and match source typography
All exact Typography Variable Previews match normalized typography
All font-unavailable previews explicitly marked; no fallback claimed as exact
No required text Width or Height = 0
No source Name, Developer Token, or Description clipped
No required content outside its Cell
Rendered Row Count == Prepared Row Count
Rendered Mode Count == Source Mode Count
Last Row divider removed
Table radius correct; Final Row visible
Generated provenance present; schema version correct
Staging root internally valid
```

Any false condition → do not commit.

## Visual checksum

Fixed between executions. This is **documentation chrome** — it is never a product theme
and never leaks into `01`–`03` output.

```
DOCS_SCHEMA_VERSION = 2

PAGE_BG = #333333

SECTION_WIDTH_DEFAULT = 1440    SECTION_BG      = #0F0F0F
SECTION_RADIUS        = 16      SECTION_PADDING = 48
SECTION_GAP           = 160

TABLE_BG = #181818    TABLE_HEADER_BG = #222222    TABLE_RADIUS = 8

ROW_DIVIDER = #2A2A2A           LAST_ROW_DIVIDER = NONE

TITLE_FONT = Inter / 600 / 28   BODY_FONT = Inter / 400 / 13
META_FONT  = Inter / 400 / 12   TOKEN_COLOR = #6EA8E5

COLOR_PREVIEW = 72 × 48
TYPOGRAPHY_PREVIEW_INITIAL_WIDTH = 96
TYPOGRAPHY_PREVIEW_MIN_HEIGHT    = 56
```

Do not creatively alter these during execution.

## Invalid outputs

Always invalid, no exceptions:

- Gradient with `Type = Linear Gradient, Value = Gradient`, or an empty value.
- Text style with technical fields populated but the preview empty.
- Generic `Ag` present without the actual source style or exact properties applied.
- A visible typography-variable preview whose typography doesn't match while
  `previewStatus = EXACT`.
- Fallback typography rendered and claimed to match source.
- Any clipped developer token, or a long source name overlapping another column.
- A final row containing a divider.
- A generated component whose name matches but whose schema provenance is absent or wrong.

Never finalize documentation containing: generic gradient values; missing gradient stops;
fabricated paint data or semantic relationships; empty required previews; generic text
style previews; cross-routed rows; lost, fake, or missing source IDs or provenance;
required width or height of 0; typography preview using unsafe hug width; clipped names,
tokens, or descriptions; omitted modes or rows; duplicate developer tokens; random token
suffixes; final-row divider; broken table corners; mixed-generation active documentation;
partially committed staging; creative documentation redesign; or a page background other
than `#333333`.

## Execution state

Reset before every new source block, at minimum:

```
ACTIVE_SOURCE_KIND      ACTIVE_STYLE_TYPE        ACTIVE_RENDERER
ACTIVE_COLUMN_SCHEMA    ACTIVE_ROW_COMPONENT     ACTIVE_PREVIEW_RENDERER
ACTIVE_VALUE_FORMATTER  ACTIVE_MODE_CELL         ACTIVE_FONT_STATE
ACTIVE_STYLE_ID         ACTIVE_VARIABLE_IDS      ACTIVE_VARIABLE_COLLECTION
ACTIVE_TABLE_WIDTHS
```

Initialize state from the actual current prepared dataset. Never allow previous renderer
state to determine the next source block.
