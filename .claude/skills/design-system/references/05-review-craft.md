# 05 — Review: craft

A senior-level critique of a screen, component, flow, or repository. Opinionated and
specific, not a checklist dump. Read `00-standards.md` for every number and
`07-report-and-annotate.md` for the output shape.

Calibrate depth to the surface: a marketing hero gets motion and type scrutiny; a form gets
states and accessibility scrutiny; a dashboard gets density and data-legibility scrutiny.

## Contents

- [How to look](#how-to-look)
- [Recon](#recon)
- [Accessibility](#accessibility)
- [Layout](#layout)
- [Writing](#writing)
- [Typography](#typography)
- [UI polish](#ui-polish)
- [Visual hierarchy](#visual-hierarchy)
- [Component states](#component-states)
- [Motion](#motion)
- [Common mistakes](#common-mistakes)

## How to look

Slow the interface down.

- Walk it **keyboard-only first**. Every flow must complete without a mouse.
- **Read** the page instead of scanning the code. Squint to check the hierarchy holds. Read
  one full paragraph for comfort.
- **Resize** the viewport to catch bad wrapping and truncation at real content lengths.
- **Replay motion at 10% speed** in the browser's Animations panel and walk every state:
  hover, focus, active, loading, empty. What feels off at 10% is what's subtly wrong at
  full speed.
- Check actual numbers — contrast ratios, line-heights, measure in `ch`, tap targets in px,
  durations in ms — rather than vibes.

## Recon

Before judging anything, identify: framework, styling system, component library, design
tokens, supported viewports, available preview or test commands. For copy, inspect nearby
interface text, product terminology, localization conventions, and any voice or content
style guide.

Then express every proposed fix in that system. Never introduce a second styling approach
to land a fix.

Review is read-only by default. Edit source only when the user also asks for
implementation; then preserve the report as the change scope and re-run verification
afterwards.

## Accessibility

Not a compliance checkbox bolted on at the end — the floor for interface craft. Most of it
is free if you use the platform. When unsure, prefer the platform default over a custom
rebuild, and remove ARIA rather than add it.

**1. Native elements first.** `<button>` for actions, `<a href>` for navigation (it must
support Cmd/Ctrl/middle-click), never `<div onClick>`. No ARIA is better than bad ARIA.

**2. Visible focus rings.** `:focus-visible`, not bare `:focus`. Specs in
`00-standards.md`.

**3. Full keyboard support.** Every pointer interaction needs a keyboard path, following
ARIA APG patterns: Escape closes overlays, arrow keys move within composite widgets (tabs,
menus, listboxes), Tab moves between widgets, Enter and Space activate. Only `tabindex="0"`
and `tabindex="-1"` — never positive values. Composite widgets use roving tabindex: active
item `0`, all others `-1`.

**4. Trap and restore focus.** Modals set `inert` on background content, move focus inside
on open, and return focus to the trigger on close. Add `overscroll-behavior: contain` so
the background doesn't scroll.

**5. Minimum hit area.** Thresholds in `00-standards.md`.

**6. Label and type every control.** Every input gets a `<label for>` or wrapping
`<label>`; a placeholder is never a label. Label and control share one hit target — no dead
zone between a checkbox and its text. Add `autocomplete` with a meaningful `name`, and the
correct `type` and `inputmode` for the keyboard. **Never block paste** — people paste
passwords and one-time codes.

**7. Accessible names everywhere.** Icon-only buttons need a descriptive `aria-label`.
Visible label text must appear in the accessible name. Decorative elements get
`aria-hidden="true"` — never on a focusable element.

**8. Don't rely on color alone.** Status needs a redundant cue. Measure the rendered pair
against the applicable requirement; report the pair and the requirement it misses.

**9. Honor `prefers-reduced-motion`.** Contract in `00-standards.md`.

**Also:** semantic structure — headings in order, landmarks, ARIA only to fill genuine
gaps. Meaningful `alt` on every image, or empty `alt` when decorative. Form errors
announced and programmatically linked to their field. Logical focus order. Zoom to 200%.

## Layout

Layout communicates before a word is read. A good layout also survives stress: resize it,
translate it, mirror it for RTL, and it should still hold.

**1. Group with space, not lines.** Negative space first, background shapes second,
separator lines last. Gap ratio in `00-standards.md`.

**2. Keep controls distinct from content.** Interactive elements must look interactive — a
background shape, a border, or a consistent placement zone. Never style a control
identically to adjacent static text.

**3. Align to shared edges.** Pick alignment edges and stick to them; every stray edge
reads as noise. Use logical properties for direction-dependent layout.

**4. Order by importance.** Most important content near the top and the leading edge.
Reading order flows top-to-bottom, leading-to-trailing. Think leading/trailing, not
left/right.

**5. Breathing room between targets.** Values in `00-standards.md`.

**6. Hold structure until it breaks.** Breakpoints come from the content. Collapse late.
Prefer container queries for component-level adaptation. Test smallest and largest first.

**7. Plan for growth and clipping.** No fixed widths or heights on text containers; let
rows wrap. Never park critical actions where resizing or scrolling clips them.

## Writing

Clear and brief beats clever; consistency beats variety; and the best error message is the
interaction redesigned so the error can't happen. Preserve intentional brand character
where it stays clear and appropriate to the stakes — a departure from generic plain
language is a finding only when it creates inconsistency, ambiguity, translation risk, or
an inappropriate tone.

**1. One voice, flexible tone.** The voice comes from the existing system, not from a local
edit. Keep terms consistent: if it's "Archive" in the menu, it isn't "Move to storage" in
the toast.

| Context | Tone |
| --- | --- |
| Success, onboarding, empty states | Warm, can be light |
| Routine actions, settings | Neutral, minimal |
| Errors, destructive confirmations | Calm, plain, zero playfulness |
| Data loss, security | Serious, explicit |

**2. Plain words over clever ones.** Delete every word that isn't needed. No idioms,
colloquialisms, or humor that won't translate. Skip unnecessary gender: "Subscribers can
post recipes", not "each subscriber can post his or her recipes". Match the input device:
"tap" on touch, "click" with a pointer, "select" when both are possible. Never concatenate
fragments around variables — word order changes per language. Use full templated strings
with proper pluralization.

**3. Verb-first buttons.** Labels start with a verb naming the specific action: "Send",
"Save draft", "Delete project". Never "OK!", "Let's go!", or bare Yes/No on consequential
actions. Confirmation buttons repeat the consequence so the dialog is answerable without
reading the body: "Delete this project?" offers `Delete project` and `Cancel`.

**4. Links describe their destination.** Screen-reader users navigate by a list of links.
"Read the billing docs", never "Click here" (which also fails the device-verb rule on
touch), and never a bare "Learn more" when several appear on one page — suffix each: "Learn
more about exports".

**5. One capitalization policy.** Pick title case or sentence case per element type and
apply it consistently. Sentence case is the safer default: calmer, no per-word rules,
localizes cleanly. "Save Changes" beside "Discard changes" reads as sloppiness.

**6. Errors say how to fix, next to where it broke.**

| Bad | Good |
| --- | --- |
| That password is too short | Choose a password with at least 8 characters |
| Invalid name | Use only letters for your name |
| Oops! Something went wrong. | Unable to save. Check your connection and try again. |

No blame, no "oops", no exclamation marks. Phrase hints positively ("Use only letters", not
"Don't use numbers") and show them before the mistake, not after. If the same error keeps
firing for many users, redesign the interaction instead of rewording it.

**7. Empty states point forward.** Say what this place is and how to fill it, with one
clear next action.

```html
<!-- Bad: a shrug -->
<p>No results.</p>

<!-- Good: orientation plus a next step -->
<p class="font-medium">No projects yet</p>
<p class="text-sm text-zinc-500">Projects keep your tasks and files together.</p>
<button class="mt-4">Create a project</button>
```

Search and filter empty states name the query and offer an exit: "No results for
'quarterly'. Clear filters". Never park crucial persistent information in an empty state —
it disappears the moment content exists.

**8. No misleading states.** A "Sent ✓" that didn't actually send is a HIGH finding.

## Typography

Mostly restraint. A sensible scale, comfortable spacing, and enough contrast beat any
clever effect. A label, a table cell, a marketing headline, and an article paragraph should
not share one set of rules.

All numeric rules — scale, line-height, measure, weight floors, family count, tabular
numerals, truncation, mobile input size — are in `00-standards.md`. What to check here:

- Hard-coded one-off sizes instead of the scale.
- A visually subordinate heading overpowering its parent.
- Fixed-unit line-height that won't scale.
- Uncapped long-form measure.
- Numbers causing layout shift as they update.
- Truncated text with no route to the full value.
- Mixed-script text with unbalanced punctuation spacing or inconsistent baselines.
- Widows, orphans, and rivers on headlines.

Pick semantic heading elements per the accessibility rules; typography controls only their
visual treatment.

## UI polish

Great interfaces are rarely one thing — they're small details compounding. Every recipe
here assumes the animation or effect *belongs*; whether it belongs at all, and what it
costs at its trigger frequency, is a prior question whose default answer is no.

The rules: concentric radius, optical alignment, shadows for elevation and borders for
structure, interruptible animations, split and staggered enters, subtle exits, contextual
icon animations, image outlines, scale on press, skipping animation on page load, no
`transition: all`, sparing `will-change`, icon stroke matched to text weight, and one SVG
recolored per state.

Exact values live in `00-standards.md`; working code for each lives in `08-recipes.md`.

## Visual hierarchy

- One clear focal point; obvious primary action. The eye knows where to go first.
- The scan path follows importance — size, weight, color, position.
- Related items grouped by proximity; unrelated items separated. Gestalt holds up.
- Everything aligns to a grid or shared edges — no near-but-not-quite alignments.
- Whitespace is structure, not leftover, and generous around focal elements.
- Density appropriate to content: touch UIs roomier than dense dashboards.
- Every visible element earns its place; quiet information is genuinely quiet.
- Without the logo, the interface still feels specific to this product.

## Component states

- Every interactive element has hover, `:focus-visible`, active, and disabled.
- Loading, empty, and error states are designed — not just the happy path.
- Selection, focus, modified, running, progress, disabled, and error are unambiguous
  without leaning on color or excess chrome.
- Primary versus secondary actions are clearly differentiated; buttons and links look the
  part.
- Menus, popovers, drawers, and dialogs communicate origin, layer, dismissal, and focus
  behavior.
- Disabled and placeholder have enough contrast to be read without reading as active.

## Motion

Purposeful — guides attention, shows continuity, explains a state change. Not decoration
that delays. Durations, easing, and the reduced-motion contract are in `00-standards.md`.
Check for layout shift, jank, animation blocking interaction, and anything that fades,
slides, floats, bounces, or springs merely because everything else does.

## Common mistakes

| Mistake | Fix |
| --- | --- |
| `outline: none` to remove the focus ring | Style `:focus-visible` instead; mouse clicks won't show it |
| `<div onClick>` for a button or link | `<button>` for actions, `<a href>` for navigation |
| Placeholder used as the only label | Add a visible `<label for>`; placeholders disappear on input |
| Positive `tabindex` to fix focus order | Fix the DOM order; only `0` and `-1` |
| `aria-hidden="true"` on a focusable element | Remove it, or make the element non-focusable |
| Submit disabled until the form is valid | Keep it enabled; validate on submit and focus the first error |
| Separator line where spacing would do | Remove the line, double the gap between groups |
| `margin-left` / `padding-right` in a localizable layout | `margin-inline-start` / `padding-inline-end` |
| Breakpoints at 768/1024 because they're the defaults | Break where the content actually stops fitting |
| Fixed-width text container sized to one language | `max-width` + wrapping; test pseudo-localization |
| `OK` / `Yes` confirming a destructive dialog | Repeat the consequence: "Delete project" |
| "Click here" or bare "Learn more" | Describe the destination |
| "Oops! Something went wrong." | Say what to do, next to the failing field |
| "Save Changes" beside "Discard changes" | One capitalization policy per element type |
| Hard-coded one-off font sizes | Use the type scale |
| `line-height: 24px` on scalable text | Unitless value (`1.5`) |
| Full-width paragraphs | Cap at 60–75 characters per line |
| Numbers cause layout shift | `tabular-nums` |
| Truncated text with no way to read it | Tooltip or expanded view |
| Inputs below 16px zoom on iOS | `text-base sm:text-sm` |
| Same radius on closely nested parent and child | `outerRadius = innerRadius + padding` |
| Icons look off-center | Adjust optically with padding, or fix the SVG |
| Border used only to fake elevation | Layered `box-shadow`; keep structural and state borders |
| Stateful icon animates its default state on load | `initial={false}` on that `AnimatePresence` |
| `transition: all` | Specify exact properties |
| First-frame animation stutter | `will-change: transform`, sparingly |
| Hairline icon beside bold text | Match stroke width to text weight |
| Separate icon assets per state | One `currentColor` SVG, states via CSS |
| Filled icons everywhere | Outline default, fill for active only |
| Six disconnected domain reports | One ranked findings table |
| Visual claim inferred only from source | Inspect the rendered state, or mark it not verified |
| Review silently edits code | Stay read-only unless implementation was requested |
| "Approve" with pending actionable findings | Use `Needs changes` or `Block` |
