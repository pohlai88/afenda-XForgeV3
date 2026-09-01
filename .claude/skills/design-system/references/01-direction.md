# 01 — Direction

Deciding the visual language before any frame is drawn. Act as a senior visual identity and
product design director: translate product purpose, audience, workflows, brand evidence,
and supplied references into an intentional direction.

## Contents

- [Before the first frame](#before-the-first-frame)
- [Principles](#principles)
- [Brand direction](#brand-direction)
- [Color](#color)
- [Typography character](#typography-character)
- [Surfaces, geometry, material](#surfaces-geometry-material)
- [Icon language](#icon-language)
- [Layout models](#layout-models)
- [Interaction and motion tone](#interaction-and-motion-tone)
- [Surface types are not interchangeable](#surface-types-are-not-interchangeable)
- [Anti-patterns](#anti-patterns)

## Before the first frame

Define, in writing, before creating anything:

- Product personality and visual tone
- Density
- Hierarchy — what is seen first, second, and what stays quiet
- The primary action
- Focal points, and how many the frame can support
- Typography character
- Layout structure and region ownership
- Surface strategy
- Icon language
- Motion tone

Then create **two to four signature visual motifs**. Each one gets a stated role in
comprehension, hierarchy, action, navigation, or brand recognition. A motif without a job
is decoration — cut it.

## Principles

1. **Start from evidence.** Study the product goal, users, key tasks, brand signals,
   current visual language, and supplied references before selecting a direction.
2. **Protect reference fidelity.** When an authoritative design exists, preserve its
   content hierarchy, geometry, color roles, typography, iconography, assets, and
   interaction intent.
3. **Set hierarchy before decoration.**
4. **Design around the real task.** The main workflow determines the composition. A
   working surface should feel like a purposeful tool, not a generic analytics template.
5. **Visual economy.** Every visible element adds information, hierarchy, action,
   navigation, feedback, or meaningful brand reinforcement. Remove everything else.
6. **Premium through restraint.** Typography, proportion, spacing, alignment, composition,
   and interaction quality are the sources of sophistication.
7. **Use conventions deliberately.** Reach for a familiar pattern only when it improves
   comprehension, comparison, navigation, or action.
8. **Keep the system coherent.** Reuse semantic variables, text styles, effect styles,
   layout rules, and component families rather than making one-off decisions.
9. **Make states unmistakable** — without relying on color alone.
10. **Design for access** from the start: readable contrast, visible focus, clear labels,
    reachable targets, understandable state changes, meaningful image descriptions.
11. **Adapt by priority, not by shrinking.**
12. **Preserve product authenticity.** With the logo removed, the interface should still
    feel specific to this product.
13. **For macOS-like surfaces, use principles rather than imitation** — compact chrome,
    stable panels, quiet surfaces, disciplined iconography, clear state changes, spatial
    continuity, and the main workspace preserved on laptop-size frames.

## Brand direction

- Convert abstract brand traits into concrete choices for typography, color, spacing,
  composition, surfaces, icons, imagery, and motion.
- Keep brand expression strongest at focal moments and quieter in high-frequency work
  areas.
- Use concise, operational product language. No generic filler, no decorative labels.
- Retain the source visual identity when extending an existing product. A new theme
  happens only when the brief explicitly asks for one.

## Color

Define semantic roles first; keep raw values in the primitive layer. The minimum role set:

`background`, `surface`, `surface-secondary`, `text-primary`, `text-secondary`,
`text-muted`, `border`, `border-subtle`, `accent`, `accent-hover`, `focus`, `success`,
`warning`, `error`.

- Reserve success, warning, and error for their actual meanings.
- Use the accent sparingly — to guide attention, show action, or reinforce identity.
- Establish surface hierarchy with contrast and borders before adding shadows.
- Verify text, controls, focus indicators, and semantic states against their *surrounding*
  surfaces, at the ratios in `00-standards.md`.
- Restrained palette. Never communicate an important state through color alone.

Full token architecture, naming, and light/dark construction live in `02-tokens.md`.

## Typography character

Define roles for display, headings (three levels), body, small body, label, caption,
control, data, and mono where relevant. Specify family, size, weight, line height, and
letter spacing for every role.

- Build hierarchy through measured contrast in size, weight, spacing, and placement.
- Keep body text calm and readable. Avoid oversized or excessively heavy type unless it is
  an explicit brand characteristic.
- Tighten letter-spacing on display sizes; loosen slightly on small caps and labels.
- Compact but legible type for tables, metadata, toolbars, sidebars, inspectors, and dense
  workspaces. Stable row and control heights so repeated information scans cleanly.
- For mixed CJK and Latin text, check visual balance, punctuation spacing, line wrapping,
  and consistent baseline behavior.

Numbers in `00-standards.md`.

## Surfaces, geometry, material

- A restrained radius hierarchy across controls, panels, popovers, dialogs, and media.
- Surface contrast, borders, spacing, and layer order before shadow.
- Borders and dividers quiet but visible enough to explain structure.
- Never apply the same radius, border, or elevation treatment to unrelated object classes.

## Icon language

One coherent family with consistent optical size, stroke or fill treatment, alignment, and
active-state behavior. Match icon weight to surrounding typography and control density.
Icons improve recognition or save space — they are not decoration. Pair unfamiliar icons
with labels or tooltips.

## Layout models

Begin with content priority and region ownership: define the role of every major area
before arranging details. Then select the model that fits the task rather than defaulting:

> canvas · rail · sidebar · split view · inspector · table · timeline · list · command
> surface · editor · workspace · band · stack · open composition

- Give the largest stable area to the primary work — editor, canvas, review surface,
  trace, table, or whatever defines the task.
- Navigation for orientation. Toolbars for immediate actions. Inspectors for contextual
  properties. Status areas for quiet ongoing feedback.
- Rows and lists for scan-and-act. Tables for comparison. Split views for simultaneous
  context. Drawers and popovers for transient controls.
- Define a consistent grid, alignment logic, max content width, gutters, section rhythm,
  and whitespace strategy. Whitespace is structure, not leftover.
- One coherent spacing scale drives gaps, padding, row heights, control heights, and
  section separation.
- Auto Layout, constraints, and systematic alignment so content can grow, wrap, collapse,
  or reorder predictably.
- Avoid nested containers where spacing, dividers, rows, bands, or surface contrast
  communicate the same grouping more clearly.
- Interactive elements must look interactive — a background shape, a border, or a
  consistent placement zone. Never style a control identically to adjacent static text.
- Order by importance: the most important content sits near the top and the leading edge.
  Think leading/trailing, not left/right.
- At each width, decide explicitly what reflows, hides, collapses, overlays, scrolls, or
  changes priority. Define overflow behavior for tables, dense data, command bars, long
  labels, and inspector content.
- Sticky regions only when available height, overlap behavior, and exit path stay clear.

## Interaction and motion tone

- Primary, secondary, and contextual actions must be visually distinct.
- Place contextual controls near the object they affect.
- Design keyboard-first paths where appropriate, with visible focus order and states.
- Menus, popovers, drawers, and dialogs communicate origin, layer, dismissal, and focus
  behavior.
- Motion explains state transition, hierarchy, navigation, context, feedback, or spatial
  continuity — nothing else. Keep it subtle, fast, intentional.
- Let panels enter from their spatial edge when that relationship clarifies where they
  belong. Crossfade when content changes without changing spatial location. Short color,
  icon, or content transitions for status changes.
- Do not make every element fade, slide upward, float, bounce, or spring.

Durations, easing, and the reduced-motion contract are in `00-standards.md`.

## Surface types are not interchangeable

Distinguish the needs of a marketing surface, a product application, a dashboard, a
developer workspace, and a creative tool. Do not force them into one visual template. For
workspaces and developer tools specifically, treat chrome, tables, toolbars, sidebars,
inspectors, labels, status regions, and mono content as one coordinated family.

## Anti-patterns

Check every frame against this list. Each entry is a finding when it appears without a
stated, evidence-backed reason.

- Defaulting to a card grid or bento layout when a list, table, rail, split view, canvas,
  band, or open composition fits the task better.
- Purple or blue gradients that aren't established brand signals or meaningful state.
- Huge radii, giant rounded wrappers, or oversized containers without a deliberate brand
  or tactile-media reason.
- Card overload, nested cards, or boxed sections where spacing, rows, dividers, or surface
  contrast would be clearer. Use a card only when a boundary is genuinely needed for
  grouping, comparison, interaction, or elevation.
- Pills and badges as decoration or as substitutes for plain labels. They are for compact
  status, filters, or taxonomy.
- Fake metrics, charts, activity, or data without a clear illustrative label and a genuine
  role in the experience.
- Repeated icon-title-description blocks where users need a narrative, workflow, list,
  comparison, or real product surface.
- Glass, blur, glow, gradients, or shadows added to appear modern or premium.
- Generic avatars where identity isn't meaningful to the task.
- A marketing hero inside a working product surface.
- Huge generic hero text, cheap gradients, noisy sections, overdecorated backgrounds, or
  multiple competing focal points.
- Emoji or arbitrary symbols as interface icons.
- Mixed icon families, radius values, spacing values, type scales, or surface treatments.
- Meaning hidden in color alone.
- Narrow frames that are miniature desktop frames.
- Decorative animation competing with content or slowing frequent actions.
- Copying a familiar product's appearance instead of deriving a language from the supplied
  brand and task.
- Any element whose removal would not reduce comprehension, hierarchy, action, navigation,
  feedback, or product identity.
