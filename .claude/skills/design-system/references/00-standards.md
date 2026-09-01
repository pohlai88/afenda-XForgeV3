# 00 — Craft standards

The settled numbers. Read in every mode. Where the source documents disagreed, the value
here is the reconciliation — use it and do not re-derive from memory.

Values are starting points for interfaces with no established density system. A project
token that differs is not automatically a finding; it becomes one when it fails a
hit-area, contrast, zoom, localization, or viewport stress test.

## Contents

- [Contrast](#contrast)
- [Hit area and spacing between targets](#hit-area-and-spacing-between-targets)
- [Focus](#focus)
- [Spacing](#spacing)
- [Typography](#typography)
- [Geometry and elevation](#geometry-and-elevation)
- [Icons](#icons)
- [Motion](#motion)
- [Responsive](#responsive)
- [Conflicts resolved](#conflicts-resolved)

## Contrast

Determine which requirement applies from the content and state, then measure the rendered
foreground/background pair. Report the pair and the requirement it misses; do not repaint
the project unless asked.

| Content | Minimum |
| --- | --- |
| Body text, and any text under 24px / 19px bold | 4.5:1 |
| Large text — ≥24px, or ≥19px at bold | 3:1 |
| UI component boundaries, icons, focus indicators, chart strokes | 3:1 |

Disabled and placeholder text must be distinguishable without reading as active. Verify
every semantic state against its own surface, not against the page background.

## Hit area and spacing between targets

| Threshold | Value | Failure |
| --- | --- | --- |
| Absolute floor (WCAG 2.5.8 AA) | 24×24 CSS px | HIGH |
| Touch target | 44×44 px | MEDIUM if below but above floor |
| Desktop pointer target | 40×40 px | MEDIUM if below but above floor |

WCAG's spacing, equivalent-control, inline, user-agent, and essential exceptions apply to
the 24px floor. Extend a small visible control with a pseudo-element rather than growing
it; never let two extended hit areas overlap.

Clearance between adjacent controls, absent a project density system:

- **12px** between adjacent bordered or filled controls.
- **24px** of clearance around borderless text- and icon-only controls.

Compact professional layouts may go tighter when hit areas don't overlap and controls stay
visually distinct.

## Focus

- Style `:focus-visible`, never bare `:focus`.
- Prefer the browser's unmodified indicator. A custom ring uses a project focus token or an
  explicit color, verified against every adjacent color it crosses. `currentColor` is
  acceptable only after that check.
- At least a **2px** solid perimeter, or equivalent visible area, at ≥3:1.
- Never `outline: none` without a verified replacement. Preserve system colors in
  forced-colors mode.

## Spacing

- One scale, 4/8-based. No arbitrary 13px or 27px gaps.
- **Inter-group gap ≥ 2× intra-group gap** (8px inside a group → 16px+ between groups), or
  the grouping reads as noise.
- Negative space is the primary grouping tool; background shapes second; separator lines
  last, only where space alone can't carry the structure.
- One spacing step per level of subordination — 16px is a useful default.
- Vertical rhythm consistent between sections; padding symmetric where expected.
- Use logical properties (`padding-inline-start`, `margin-inline-end`) for
  direction-dependent layout; reserve physical left/right for genuinely physical geometry.

## Typography

**Scale.** 5–7 steps, each at least a ~1.2 ratio from its neighbour, with semantic names
(`text-body-sm`, not `text-14`) on any team project. Deviate from the scale as rarely as
possible. Heading sizes descend with level; adjacent levels may share a size at the small
end if weight or spacing keeps them distinct.

**Line-height.** Unitless, always, so it scales with font size.

| Role | Value |
| --- | --- |
| Display and headings | 1.1–1.2 |
| Body copy | 1.5–1.6 |
| Anything wrapping to 3+ lines, including constrained rows | ≥1.4 |

**Measure.** Long-form body text caps at **60–75 characters** per line. 45ch is the
absolute floor for deliberately narrow columns. Any unit works — `65ch`, or roughly
`560–680px` at a 16px body size. What matters is that a cap exists and the rendered line
length lands in range.

**Weight floors.** Below 18px, stay at weight 400 or above. Weights under 300 are
display-only at 28px+; they disappear at text sizes.

**Families.** Two global roles — Primary and Secondary — is the architecture. Three
families is the hard ceiling, and only when the third is a genuine mono role. Pair for
contrast, not similarity: a serif headline with a sans body reads as deliberate, two
near-identical sans-serifs read as a mistake.

**Details.**

- `text-wrap: balance` on headings; `text-wrap: pretty` on descriptions; neither on
  long-form.
- `overflow-wrap: break-word` where long words, links, or IDs could escape a container.
- `white-space: nowrap` on labels and badges where a break looks broken.
- `font-variant-numeric: tabular-nums` on any value that changes — timers, counters,
  prices, and any column being compared vertically.
- Truncate with `text-overflow: ellipsis` (single line) or `line-clamp` (multiple), and
  keep the full value reachable in a tooltip or expanded view.
- Inputs at **16px** on mobile viewports (`text-base sm:text-sm`) — iOS Safari zooms the
  page below that. Never use `maximum-scale=1`; it blocks zoom everywhere but Safari and
  fails WCAG.
- No widows or orphans on headlines; no rivers; consistent numerals.

## Geometry and elevation

- **Concentric radius: `outerRadius = innerRadius + padding`.** Mismatched radii on nested
  elements is the single most common thing that makes an interface feel off.
- A restrained radius hierarchy — controls, panels, popovers, dialogs, media — with no
  shared radius across unrelated object classes.
- **Borders communicate structure and state; shadows communicate elevation.** A border
  that exists only to fake depth becomes a layered transparent `box-shadow`. Keep
  dividers, layout separators, and selected/focus borders. Don't add shadow where surface
  contrast and layer order already explain the level.
- Establish surface hierarchy with contrast and borders first; reach for shadow only when
  it clarifies depth, overlap, or a transient layer.
- Glass, blur, glow, and translucency only where they express a deliberate material or
  clarify depth.
- Align optically when geometric centering looks wrong — icon buttons, play triangles, and
  asymmetric glyphs all need manual adjustment.
- Images get a **1px** low-opacity outline: `oklch(0 0 0 / 0.1)` in light mode,
  `oklch(1 0 0 / 0.1)` in dark. Never a tinted near-black like slate or zinc — it picks up
  the surface underneath and reads as dirt on the edge.

## Icons

One family per surface, one stroke weight per set. Never mix libraries on one screen.
Never use emoji or arbitrary symbols as interface icons.

| Adjacent text | Stroke width (24px grid) |
| --- | --- |
| Regular (400), 14–16px | 1.5px |
| Medium/Semibold (500–600) | 2px |
| Bold (700), or emphasized standalone | 2.5px |

One SVG using `currentColor`, recolored per state through CSS color and opacity — never
separate assets per state. Outline is the default variant; fill marks the active state.
Icon-only controls need a descriptive `aria-label`; unfamiliar icons need a visible label
or tooltip.

## Motion

| Purpose | Duration |
| --- | --- |
| UI state transitions — hover, toggle, color, small moves | 150–250ms |
| Entrances, larger or spatial transitions | 300–500ms |
| Stagger between chunks in an infrequent staged entrance | ~100ms |

- `ease-out` for both enter and exit. Avoid `linear` except for continuous motion.
- CSS transitions for interactive state changes — they interrupt mid-flight. Reserve
  keyframes for staged sequences that run once.
- Never `transition: all`. Name the properties: `transition-property: scale, opacity`.
- `will-change` only for `transform`, `opacity`, `filter`, and only after observing
  first-frame stutter. Never `will-change: all`.
- Press feedback: `scale(0.96)`. Never below 0.95.
- Icon crossfade: scale `0.25 → 1`, opacity `0 → 1`, blur `4px → 0`. With a motion
  library, `{ type: "spring", duration: 0.3, bounce: 0 }` — bounce is always 0. Without
  one, keep both icons in the DOM and cross-fade with `cubic-bezier(0.2, 0, 0, 1)`.
- Exits are softer than enters: a small fixed `translateY`, never full height.
- Skip enter animations on first render (`initial={false}` on `AnimatePresence`), then
  verify intentional page entrances still play.
- Wrap motion in `@media (prefers-reduced-motion: no-preference)`. Under reduced motion,
  replace slides and scales with opacity crossfades; kill parallax and autoplay entirely.
  Every essential state must remain understandable with motion absent.
- Independent of the preference: autoplaying media needs a visible pause control, and
  toasts carrying actions or errors stay until dismissed.
- No layout shift, no jank, nothing that blocks interaction.

Before reaching for any of this: an animation has to earn its trigger frequency. Something
the user hits fifty times a day should not stagger, and often should not animate at all.

## Responsive

- Breakpoints come from the content, not device presets. Keep the expanded layout as long
  as it genuinely fits and collapse late. Prefer container queries for component-level
  adaptation.
- Test the smallest and largest sizes first. No horizontal scroll, nothing clipped or
  overlapping, from 320px to 1440px+.
- Adapt by priority, not by shrinking. At narrow widths, reconsider hierarchy, density,
  navigation, and target size. Collapse or overlay secondary sidebars and inspectors
  before squeezing the primary workspace. A narrow frame is not a miniature of the
  desktop frame.
- No fixed widths or heights on text containers; let rows wrap. Plan for substantial,
  language-dependent string growth rather than a universal percentage — test
  pseudo-localization and representative locales.
- Fluid type and spacing via `clamp`, or sensible breakpoints. `aspect-ratio` so images
  don't distort.
- Keep dialogs and primary actions visible and reachable at every size; never park a
  critical action where resizing or scrolling clips it.
- Support zoom to 200%.

## Conflicts resolved

What the seven source documents disagreed on, and what this file settles.

| Topic | Sources disagreed | Settled |
| --- | --- | --- |
| Hit target | 24×24 (WCAG floor) vs 44×44 iOS / 48dp Android | 24×24 is the AA floor and a HIGH failure; 44×44 touch / 40×40 desktop is the target and a MEDIUM miss |
| Measure | 45–75ch vs 60–75ch | 60–75ch target, 45ch floor for deliberately narrow columns |
| Line-height (headings) | 1.0–1.2 vs ~1.1 | 1.1–1.2, with a ≥1.4 override for anything wrapping 3+ lines |
| Font count | ≤2 typefaces vs "rarely more than three" vs two named global roles | Two global roles (Primary, Secondary); three families max, third only for mono |
| Borders vs shadows | "prefer borders and surface contrast before shadow" vs "shadows for elevation, borders are fake depth" | Borders own structure and state; shadows own elevation; surface contrast is tried first; a border used purely to fake depth becomes a shadow |
| Severity scale | Blocking/Important/Polish vs Critical/High/Medium/Low vs HIGH/MEDIUM/LOW | HIGH / MEDIUM / LOW, mapping in `SKILL.md` |
| Figma mutation | "never modify" vs "apply the safe fixes" vs "annotate the frame" | Read-only by default; annotations additive on their own layer; fixes only on explicit request, and only the safe class |
| Type scale naming | `text-sm` fine vs semantic names required | Semantic names on team projects; size-based names acceptable solo when usage rules are clear |
| Foundations docs chrome | Two near-identical dark specs | The checksum in `04-documentation.md` is canonical; it is documentation chrome and never a product theme |
