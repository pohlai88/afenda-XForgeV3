# 06 — Review: consistency

Auditing screens, components, or flows for patterns that are *unintentionally* inconsistent
across a product, and explaining how to make the interface feel cohesive, predictable, and
scalable.

This is a different question from `05-review-craft.md`. Craft asks "is this element good?"
Consistency asks "do equivalent elements behave the same way, and should they?" Run both
when reviewing a multi-screen product; run this one alone for design QA, pre-development
review, UI cleanup, or design-system preparation.

Do not redesign during an audit. Do not modify the file unless explicitly asked.

## Contents

- [Best used for](#best-used-for)
- [Workflow](#workflow)
- [Review areas](#review-areas)
- [Evidence standards](#evidence-standards)
- [Finding format](#finding-format)
- [Output structure](#output-structure)
- [Rules](#rules)

## Best used for

SaaS products, web and mobile applications, dashboards, multi-screen products, design QA,
pre-development reviews, product redesigns, UI cleanup, and design-system preparation.

## Workflow

1. Inspect the selected screens, components, or flow.
2. Identify repeated UI patterns.
3. Compare similar elements across screens.
4. Detect inconsistent visual and interaction behavior.
5. Group related inconsistencies.
6. Prioritize by user impact and frequency.
7. State the evidence behind each finding.
8. Recommend one consistent pattern.

## Review areas

### 1. Layout

Page margins · container widths · grid alignment · section spacing · card spacing · content
alignment · header and footer positioning · vertical rhythm · horizontal rhythm.

Identify repeated layouts that should follow the same structure.

### 2. Typography

Font family · heading sizes · body sizes · weights · line heights · letter spacing · text
hierarchy · button text · labels · helper text · error messages.

Flag visually similar text using different styles without an apparent reason.

### 3. Color

Primary · secondary · text · background · border · semantic (success, warning, error,
information).

Identify similar-but-not-identical colors, and semantically incorrect usage — an error
color used for a neutral badge, a brand color used for a destructive action.

### 4. Components

Compare repeated buttons, inputs, selects, cards, tables, modals, tabs, navigation,
dropdowns, tooltips, badges, alerts, and avatars across: size, shape, padding, radius,
border, icon placement, typography, states, and behavior.

### 5. Icons

Icon family · stroke weight · size · alignment · spacing · visual style · filled vs
outlined usage. Flag icons inconsistent with the established product style.

### 6. Forms and controls

Field height · label placement · placeholder styling · input padding · required indicators
· error states · helper text · checkbox and radio patterns · button placement · form
spacing.

### 7. Navigation

Header patterns · sidebar patterns · breadcrumbs · tabs · active states · back navigation ·
menu behavior · navigation labels · icon usage.

### 8. States and feedback

Default · hover · focus · active · selected · disabled · loading · error · success · empty.

Similar components should communicate similar states in similar ways.

### 9. Responsive

When multiple breakpoints are available: layout transitions · navigation behavior ·
container resizing · component scaling · typography changes · spacing changes · mobile
controls · content priority.

Do not claim responsive problems when only one viewport is available, unless the issue can
be reasonably inferred from the construction.

## Evidence standards

Every important finding carries a classification:

- **Confirmed inconsistency** — the same or equivalent pattern clearly behaves or appears
  differently.
- **Likely inconsistency** — the elements appear to represent the same pattern, but
  available context is incomplete.
- **Recommendation** — a consistency improvement rather than a confirmed defect.

Do not assume two elements must be identical when there is a clear contextual reason for
variation. A dense table row and a marketing card legitimately differ.

## Finding format

Each significant finding provides:

- **Issue** — what is inconsistent.
- **Evidence** — where it appears.
- **Pattern affected** — button, typography, spacing, navigation, etc.
- **Expected behavior** — the pattern that should be standardized.
- **Why it matters** — user, usability, accessibility, or product-quality impact.
- **Classification** — confirmed / likely / recommendation.
- **Severity** — HIGH / MEDIUM / LOW per `SKILL.md`.
- **Recommendation** — the specific action that creates consistency.
- **Confidence** — high / medium / low.

## Output structure

Use the shared report shell from `07-report-and-annotate.md`, with these
consistency-specific sections in place of the generic findings body.

### UI Consistency Health

Overall assessment · strongest consistency area · biggest inconsistency · most important
improvement.

### Consistency Score

A 0–100 score, **only when enough screens or patterns are available** to justify one.
Explain the main factors behind it. Do not score a single screen.

### Priority Findings

| Priority | Pattern | Finding | Severity | Impact |
| --- | --- | --- | --- | --- |

### Detailed Audit

One subsection per review area that produced findings: Layout, Typography, Colors,
Components, Icons, Forms, Navigation, States, Responsive Behavior. Omit areas with nothing
to report rather than writing "no issues found" nine times.

### Repeated Pattern Opportunities

Patterns that should become shared components, variants, tokens, templates, or standardized
interaction patterns. This section is the bridge into `02-tokens.md` and
`03-components.md`.

### Quick Wins

The highest-impact consistency fixes achievable quickly.

### Recommended Standard

For each major repeated pattern, one clear standard — button height, input height, card
radius, heading style, section spacing, icon size, navigation behavior. Recommend a
standard **only when there is enough evidence to justify it**.

## Rules

- Do not redesign the interface during an audit.
- Do not modify the file unless explicitly asked.
- Do not treat every visual difference as an error.
- Consider product context and intentional exceptions.
- Compare equivalent patterns, not unrelated elements.
- Never invent undocumented design-system rules.
- Separate confirmed inconsistencies from recommendations.
- Prioritize repeated patterns and high-impact workflows.
- Prefer one reusable standard over many isolated fixes.
- Focus on consistency that improves usability, predictability, accessibility, and
  maintainability — not uniformity for its own sake.
