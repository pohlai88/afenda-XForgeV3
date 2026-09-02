# Icons

How icons are sized, drawn, named and reached for in this repository.

Everything here was measured against the code on 2026-09-02 rather than restated
from the design note it came from. Where the source guidance and this repository
disagree, the disagreement is recorded with the reason.

---

## 1. Size is a token, and never a prop

Icons are sized with the `size-icon` utility. Nothing passes lucide's `size`
prop, and nothing should.

```tsx
<SearchIcon className="size-icon shrink-0 text-muted-foreground" />
```

`size-icon` reads `--semantic-icon-size`, which **density rebinds**. A `size={20}`
prop is a number frozen at author time: it would stay 20px in compact and in
comfortable, which is the exact defect `design.css` records having found — *"Forty-two
icons were sized from Tailwind numbers and stayed 16px in every density."*

The three values live in `packages/design/generated/FOUNDATIONS.md`
(`--size-icon`, `--size-icon-compact`, `--size-icon-comfortable`). **They are not
repeated here on purpose.** That file is generated from `tokens.json`; a second
copy in authored prose is a fact with two sources, and the two can only ever
agree with each other.

Components that carry an icon set the size themselves — `button.tsx` applies
`[&_svg:not([class*='size-'])]:size-icon`, so an icon dropped into a Button is
sized without the call site knowing. Write `size-icon` explicitly only where no
component is doing it for you.

---

## 2. Stroke, and what it actually renders at

Lucide draws on a 24px viewBox with `strokeWidth: 2`. Because sizing here is CSS
rather than a prop, the SVG scales and **the stroke scales with it**:

| density | icon | effective stroke |
| --- | --- | --- |
| compact | 16px | 1.33px |
| default | 20px | 1.67px |
| comfortable | 24px | 2.00px — design intent |

This is proportional scaling and it is correct. A stroke held at an absolute 2px
on a 16px icon is 12.5% of the icon's width against 8.3% at its design size — it
reads heavy and closes up the counters. Lucide's own set is drawn to be scaled,
not to be re-weighted.

Two consequences worth knowing:

**`absoluteStrokeWidth` is unavailable to us.** Lucide computes it as
`strokeWidth * 24 / size`, reading the `size` *prop*. We never pass one, so the
expression evaluates against `undefined`. The feature and CSS-based sizing are
mutually exclusive, and CSS-based sizing is the one that respects density.

**1.33px is sub-pixel on a 1× display.** At compact density on an unscaled
monitor the stroke lands between device pixels and renders soft. On 2× it is 2.67
device pixels and fine. Worth knowing before compact is recommended as a default
for a desktop-heavy audience; not worth compensating for in code, because the
compensation would be a hand-written stroke width and that is a design value.

---

## 3. Drawing or vetting a custom icon

Reach for this only when Lucide genuinely lacks the concept — see §6. When you
do, an icon that fails any of these will look wrong beside the set even if nobody
can say why.

| Property | Value |
| --- | --- |
| Base grid | 24 × 24px |
| Safe space | 2px padding on all four sides — live area is 20 × 20px |
| Stroke | 2px, uniform on curves, angles, interior and exterior alike |
| Corners | 2px radius, applied consistently — sharp or round, not both |
| Angles | 45° where possible; any deviation in 15° steps |
| Keyshapes | Shared square / circle / rectangle proportions across the set |
| Terminals | Round cap and round join (Lucide's default) |

**Safe space is the one most often skipped.** Without it an icon drawn to the
full 24px sits optically larger than its neighbours and crowds whatever follows
it, and no amount of adjusting margins fixes it because the problem is inside the
glyph.

**45° angles are about anti-aliasing, not taste.** An arbitrary angle resolves to
a different pixel-fill pattern at every size, so the same icon looks slightly
different at 16, 20 and 24px. 45° resolves cleanly at all three.

---

## 4. Accessibility

**The default is already correct, and this was verified rather than assumed.**
`lucide-react@1.38.0` applies `aria-hidden="true"` automatically to any icon with
no children and no a11y prop (`dist/cjs/lucide-react.js:92`). A decorative icon
therefore needs nothing from you.

That shifts the entire burden onto **icon-only controls**, where the icon is the
only content and lucide has just hidden it. The control must carry its own name.
Both established patterns are in the codebase:

```tsx
// Visually hidden text — dialog.tsx:65, sheet.tsx:66
<XIcon />
<span className="sr-only">Close</span>

// A label on the control — app-shell.tsx:208
<Button aria-label="Open navigation"><MenuIcon /></Button>
```

Either is fine; use whichever reads better at the call site. What is never fine
is an icon-only control with neither, because lucide has guaranteed the icon
itself contributes no accessible name.

An icon **beside visible text** needs nothing at all — it is decorative by
definition, and giving it a label makes a screen reader announce the same word
twice. `app-shell.tsx:237` (`<SearchIcon />Search`) is the reference.

---

## 5. When an icon may stand alone

Icons condense; they do not replace. The rule that survives contact with a real
product:

- **Pair icon and text by default.** Especially for anything domain-specific — a
  payroll run, a statutory filing, an employment period. No icon is universally
  recognised for those, and inventing one costs the user a click to find out.
- **An icon may stand alone only when it is universal** — close, search, delete,
  edit, chevrons, checkmarks — or when it repeats a label the user has already
  been given elsewhere on the surface.
- **Collapsed navigation is the hard case.** An icon rail with no labels is
  learnable only by clicking each item. If the rail collapses, the icons need
  tooltips, or the expanded state needs to be the default until the user
  collapses it deliberately.

The test is one question: *will the user know what this does without pressing
it?* If the honest answer is "after they've used it once", it needs a label.

---

## 6. Library policy

**Lucide, and only Lucide.** `packages/design/package.json` pins
`lucide-react@^1.38.0`. Do not add a second icon package, and do not paste an SVG
from elsewhere into a component.

Mixed icon sets are the design debt that is cheapest to avoid and most expensive
to repay. Two "home" icons from two libraries differ in stroke weight, corner
radius, optical size and aspect ratio; each looks fine alone and wrong side by
side, and the fix is eventually a sweep across every screen.

If Lucide lacks a concept, in order of preference: compose it from existing
icons, use the nearest existing icon with a text label, or draw one to §3 and put
it in the design package where the rest of the system can see it. A one-off SVG
inside a screen also fails `no-bespoke-styling`, which is the correct outcome.

---

## 7. Do not scale icons up

Lucide is drawn for roughly 16–32px. Above that the stroke reads chunky and the
lack of interior detail becomes obvious — the icon does not get more detailed,
just bigger.

There is no `size-icon-lg`, and that absence is deliberate: the token file has
one icon-size role, rebound by density, and nothing else. To give an icon
prominence, put it in a larger container rather than enlarging the glyph — a
32px icon centred in a 64px rounded surface reads as "featured" and stays at its
design size.

If a marketing or empty-state surface ever genuinely needs a display-scale icon,
that is a new semantic role with a new value, and it arrives through `tokens.json`
and an ADR — not through a one-off `className="size-12"`, which the guards refuse
in a screen anyway.

---

## 8. Rejected from the source guidance

The design note this documentation derives from recommends shipping icons **as a
font**. That is the one recommendation not adopted here, and the reasons are
concrete rather than stylistic:

- An icon font that fails to load renders tofu or, worse, an unrelated glyph —
  and the failure is silent, because the character is still "there".
- Users who override fonts at the browser or OS level — a real accessibility
  setting, not an edge case — lose the icons entirely.
- Glyphs live in the Unicode private-use area, which some assistive technology
  announces as an unknown character rather than skipping.
- A font cannot be tree-shaken; you ship every glyph to serve six.
- A font glyph is single-colour by construction, so a duotone or status-coded
  icon is unavailable.

`lucide-react` ships per-icon React components: tree-shaken, `currentColor`, no
extra network request, and — as measured in §4 — `aria-hidden` by default. The
source note's own goals (scalability, one pack for all sizes, lightweight
export) are all met by it. Only the delivery mechanism differs.

**What the source note does prove**, and what this file adopts wholesale, is the
construction spec in §3: the 24px grid, 2px stroke, 2px safe space, 2px corner
radius and 45°/15° angle discipline. Those are properties of the drawing, and
they hold regardless of how the drawing is delivered.
