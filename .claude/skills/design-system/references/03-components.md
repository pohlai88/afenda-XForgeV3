# 03 — Build: components, patterns, templates

Building the component library on top of a passing foundation. Do not start until the
Foundation QA gate in `02-tokens.md` passes.

## Contents

- [Scope and reference](#scope-and-reference)
- [Component page structure](#component-page-structure)
- [Catalog](#catalog)
- [Composition](#composition)
- [Properties, not variant explosion](#properties-not-variant-explosion)
- [Component documentation](#component-documentation)
- [Per-component QA](#per-component-qa)
- [Patterns](#patterns)
- [Templates](#templates)
- [Guidelines](#guidelines)
- [Final gates](#final-gates)

## Scope and reference

Create the smallest *complete* family the product surface needs — but "complete" for
web/SaaS normally means roughly **40–60 useful foundational component sets**. Do not stop
at Button, Input, Checkbox, Card and call it a library.

Reuse and extend existing Figma components before creating parallel ones.

Use mature libraries such as shadcn/ui as a reference for **breadth, API thinking,
composition, reusable subcomponents, states, and developer mapping**. Do not copy their
visual design — appearance comes from the current product and its tokens.

For every component define: purpose, variants, sizes, content limits, visual states, and
when it should *not* be used.

## Component page structure

```
02.01 — Actions          02.06 — Feedback
02.02 — Form Controls    02.07 — Disclosure
02.03 — Selection        02.08 — Overlays
02.04 — Navigation       02.09 — Loading
02.05 — Data Display     02.10 — Layout & Utilities
```

## Catalog

Create what the detected platform actually needs. Web/SaaS default:

**Actions** — Button, Icon Button, Button Group, Link, Toggle, Toggle Group, and Split
Button where appropriate.

**Form controls** — Label, Field, Input, Input Group, Textarea, Select, Native Select,
Search Input, Password Input, Number Input, Input OTP, File Input, Combobox, Date Picker,
and Calendar where appropriate.

**Selection** — Checkbox, Radio, Radio Group, Switch, Slider, Segmented Control.

**Navigation** — Tabs, Tab Item, Breadcrumb, Pagination, Navigation Item, Navigation Menu,
Menubar. Where relevant: Sidebar (+ Header, Content, Group, Item, Footer, Trigger), Bottom
Navigation Item.

**Data display** — Avatar, Badge, Tag, Card, Item, Separator, Table, Table Header, Table
Row, Table Cell, Kbd, Aspect Ratio, Scroll Area.

**Feedback** — Alert, Toast/Notification, Status Badge, Progress, Spinner, Skeleton, Empty
State.

**Disclosure** — Accordion, Accordion Item, Collapsible.

**Overlays** — Dialog, Alert Dialog, Popover, Tooltip, Dropdown Menu, Context Menu, Hover
Card, Sheet, Drawer.

**Loading** — Spinner, Skeleton, Progress.

**Advanced, when relevant** — Command, Calendar, Date Picker, Date Range Picker, Carousel,
Resizable, Scroll Area, Combobox. Don't add complexity purely to raise the component
count.

### Button

| Property | Values |
| --- | --- |
| Style | Primary, Secondary, Outline, Ghost, Destructive, Link |
| Size | Small, Medium, Large |
| State | Default, Hover, Pressed, Focus, Disabled |
| Optional | Leading Icon, Trailing Icon |

Adjust naming to the source product where it differs. Use component properties for the
icon slots rather than multiplying variants.

### Field architecture

Build a composable field system rather than duplicating form metadata into every input:

```
Field
├ Label
├ Description
├ Control Slot
├ Helper
└ Error
```

Controls are reusable inside Field. Input supports Empty, Filled, Hover, Focus, Error, and
Disabled, consuming the semantic `Input/*` tokens. Long helper and error text increases
height naturally — **never clip**.

Input Group composes Input + Icon + Addon + Prefix + Suffix + Button. Don't build a variant
for every combination.

### Menu system

Prefer reusable subcomponents — Menu, Menu Item, Menu Label, Menu Separator, Menu Checkbox
Item, Menu Radio Item — used across Dropdown Menu, Context Menu, and Menubar.

### Alert and empty state

Alert types: Info, Success, Warning, Error. Optional icon, title, description, action,
close.

Empty State covers No Data, No Results, and First Use, structured as visual/icon, title,
description, optional action. The action is a **real Button instance**. Copy rules are in
`05-review-craft.md`.

### Data table

Compose from Table + Checkbox + Sort Control + Dropdown Menu + Pagination + Search +
Filters. Do not attempt to encode a data table into one variant set.

## Composition

Complex components reuse smaller ones. Never redraw a control locally.

```
Dialog        → Button instances
Data Table    → Table + Checkbox + Dropdown + Pagination
Sidebar       → Navigation Item + Separator + Button
Search        → Search Input + Spinner + Empty State
```

Sidebar in particular composes as `Sidebar → Header / Content → Group → Item / Footer /
Trigger` rather than one monolith with hundreds of combinations.

Figma architecture should map reasonably to frontend architecture: composition, nested
components, clean properties, semantic tokens. Avoid detached children, duplicated states,
light/dark component duplicates, and giant flat variant grids.

## Properties, not variant explosion

Use boolean properties for optional slots, instance-swap for icons, and text properties for
labels. Reserve variants for genuinely orthogonal dimensions (style, size, state). If a
variant matrix is exploding, a property or a subcomponent is missing.

## Component documentation

Each component gets a showcase container that hugs its contents — **never a fixed height**
— inside a category container, inside the page root.

For each component show: the variant matrix, the state matrix, sizes, composition
examples, and usage guidance including when not to use it. Large components get their
documentation split across multiple containers rather than one oversized frame.

## Per-component QA

Run immediately after building each component, not in a batch at the end.

**Every component:** all states present and visually distinct; focus state visible;
tokens bound rather than raw values; Auto Layout resizes correctly; nothing clipped;
text wraps rather than truncating silently; touch/pointer targets meet
`00-standards.md`.

**Button:** every style × size × state renders; icon slots align optically; label doesn't
clip at long strings; disabled is distinguishable from default without relying on color
alone.

**Input:** every state renders; long helper and error text grows the field; placeholder is
distinguishable from a value; label is present and associated.

**Checkbox / Radio / Switch:** checked, unchecked, indeterminate (checkbox), focus,
disabled, and disabled-checked all render correctly; the check or thumb is centered
optically; the label shares the hit target with the control.

**Accessibility pass on every component:** contrast, non-color state cues, hit area,
focus visibility, and a sensible keyboard path.

## Patterns

Page `03 — Patterns`. Patterns compose components; they never redraw controls.

Build at minimum: Form Validation, Search, Filter, Error, Loading, Confirmation, and Table
Toolbar. Each pattern documents its states and the components it consumes.

**Pattern QA:** every control is an instance; states are complete; the pattern reads as
something a developer could implement directly.

## Templates

Page `04 — Templates`. Templates compose patterns and components.

Build: App Shell, Dashboard, List Page, Detail Page, Form Page, Authentication Page.

**Template QA:** no redrawn controls; responsive behavior defined; the primary task is
preserved at every breakpoint; dialogs and primary actions stay reachable.

## Guidelines

Page `05 — Guidelines`:

```
05.01 — Architecture     05.06 — Components
05.02 — Color Usage      05.07 — Accessibility
05.03 — Dark Theme       05.08 — Responsive
05.04 — Typography       05.09 — Naming
05.05 — Spacing & Layout
```

**Architecture** shows the real token chain, using tokens that exist in this file:

```
Core / Color / Brand / 600
  ↓ Theme / Color / Action / Primary / Background / Default
    ↓ Button / Primary

Core / Typography / Family / Inter
  ↓ Semantic / Typography / Family / Primary
    ↓ Body/Medium
      ↓ Input
```

**Color** explains the three layers plainly: primitive = what the color *is*, semantic =
what it *means*, component = where that meaning is *consumed*.

**Dark theme** explains that dark is not inverted light, covering surface depth, foreground
hierarchy, chromatic intensity, focus, status colors, and contrast.

**Typography** covers Primary and Secondary fonts, the display/heading/body/label/caption
hierarchy, and exactly how to globally swap each family.

**Responsive** documents Auto Layout, hug, fill, wrap, containers, grid, and responsive
modes. No fixed-size responsive hacks.

**Naming** carries the rules from `02-tokens.md` with real examples from this file.

## Final gates

**Page completeness** — every created page contains real content. No empty sections, no
"to be added later."

**Component coverage** — the library covers the detected platform's needs, not just the
four easy controls.

**Component token audit** — inspect components for local raw values; where a valid
semantic token exists, replace the raw value with a binding.

**Auto Layout QA** — no fixed heights on documentation or growing content; hug and fill
used correctly; nothing clipped at any content length.

**Do not accept partial completion.** If an area was created, populate it now.
