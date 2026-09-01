# 08 — Implementation recipes

Working code for the polish rules. Read when applying a fix, not when finding one. All
values here match `00-standards.md`; where a value is called non-negotiable, it is.

Express every fix in the project's existing styling system — Tailwind utilities in a
Tailwind project, plain declarations in CSS, CSS Modules, styled-components, StyleX. Never
introduce a second approach to land a fix.

## Contents

- [Concentric radius](#concentric-radius)
- [Optical alignment](#optical-alignment)
- [Shadows instead of borders](#shadows-instead-of-borders)
- [Image outlines](#image-outlines)
- [Interruptible animations](#interruptible-animations)
- [Enter animations](#enter-animations)
- [Exit animations](#exit-animations)
- [Contextual icon animations](#contextual-icon-animations)
- [Scale on press](#scale-on-press)
- [Skip animation on page load](#skip-animation-on-page-load)
- [Icon stroke and state](#icon-stroke-and-state)

## Concentric radius

```
outerRadius = innerRadius + padding
```

Most useful when nested surfaces sit close together. If padding exceeds `24px`, treat the
layers as separate surfaces and choose each radius independently rather than forcing the
math. Preserve an established component token when the layers are independent or the
padding is intentionally asymmetric.

```css
/* Good */
.card       { border-radius: 20px; padding: 8px; }  /* 12 + 8 */
.card-inner { border-radius: 12px; }

/* Bad — same radius on both, reads as visual tension */
.card       { border-radius: 12px; padding: 8px; }
.card-inner { border-radius: 12px; }
```

```tsx
// Good: outer radius accounts for padding
<div className="rounded-2xl p-2">   {/* 16px radius, 8px padding */}
  <div className="rounded-lg">      {/* 8px = 16 − 8 ✓ */}
```

## Optical alignment

When an icon makes otherwise symmetric padding look unbalanced, reduce padding on the icon
side. Starting point: `icon-side padding = text-side padding − 2px`.

```css
.button-with-icon {
  padding-inline-start: 16px;
  padding-inline-end: 14px;   /* trailing-icon side */
}
```

Play triangles, chevrons, and other asymmetric glyphs need the same treatment — adjust with
padding, or fix the SVG's own geometry.

## Shadows instead of borders

For buttons, cards, and containers whose border exists only to create depth, replace it
with a layered transparent `box-shadow`. Shadows adapt to any background because they use
transparency; solid borders don't, which matters over images or multi-colored surfaces.

**Do not apply this to dividers** (`border-b`, `border-t`, side borders) or any border whose
purpose is layout separation or state. Those stay borders.

```css
/* Light mode: ring + lift + ambient depth */
:root {
  --shadow-border:
    0px 0px 0px 1px oklch(0 0 0 / 0.06),
    0px 1px 2px -1px oklch(0 0 0 / 0.06),
    0px 2px 4px 0px  oklch(0 0 0 / 0.04);
  --shadow-border-hover:
    0px 0px 0px 1px oklch(0 0 0 / 0.08),
    0px 1px 2px -1px oklch(0 0 0 / 0.08),
    0px 2px 4px 0px  oklch(0 0 0 / 0.06);
}

/* Dark mode: a single white ring — layered depth isn't visible on dark surfaces.
   Adapt to whatever the project uses: prefers-color-scheme, class, data attribute. */
--shadow-border:       0 0 0 1px oklch(1 0 0 / 0.08);
--shadow-border-hover: 0 0 0 1px oklch(1 0 0 / 0.13);
```

```css
.card {
  box-shadow: var(--shadow-border);
  transition-property: box-shadow;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}
.card:hover { box-shadow: var(--shadow-border-hover); }
```

| Use shadows | Use borders |
| --- | --- |
| Cards, containers with depth | Dividers between list items |
| Buttons with bordered styles | Table cell boundaries |
| Elevated elements (dropdowns, modals) | Form input outlines (accessibility) |
| Elements on varied backgrounds | Hairline separators in dense UI |
| Hover/focus lift states | Selected and focus state borders |

## Image outlines

```css
img {
  outline: 1px solid oklch(0 0 0 / 0.1);   /* light mode */
  outline-offset: -1px;                     /* ring sits just inside the edge */
}

img {
  outline: 1px solid oklch(1 0 0 / 0.1);   /* dark mode */
  outline-offset: -1px;
}
```

```tsx
<img className="outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10" />
```

**Color rules, non-negotiable.** Pure black in light mode, pure white in dark. Never a
near-black or near-white from the project palette — `slate-900`, `zinc-900`, `#0a0a0a`,
`#111827`, `#f5f5f7`. A tinted outline picks up the surface color underneath and reads as
dirt on the image edge. Never match the outline to the accent or ink color; it is a neutral
separator, not a themed element.

`outline` rather than `border` because outline never affects layout at any offset, and
`outline-offset: -1px` hugs the corner radius instead of sitting outside it.

## Interruptible animations

| | CSS transitions | CSS keyframes |
| --- | --- | --- |
| Behavior | Interpolate toward latest state | Run on a fixed timeline |
| Interruptible | Yes — retargets mid-flight | No — restarts from the beginning |
| Use for | Interactive state changes: hover, toggle, open/close | Staged one-shot sequences: entrances, loading |

```css
/* Good: interruptible toggle. Clicking again mid-animation reverses smoothly. */
.drawer      { transform: translateX(-100%); transition: transform 200ms ease-out; }
.drawer.open { transform: translateX(0); }

/* Bad: closing mid-animation snaps or restarts. */
.drawer.open { animation: slideIn 200ms ease-out forwards; }
```

## Enter animations

For infrequent staged entrances where sequence communicates hierarchy — a page hero on
first load, a success state, an empty state. Split into semantic chunks, stagger by ~100ms,
and combine `opacity`, `blur`, and `translateY`. Titles can split into words at ~80ms.

Anything the user triggers often animates as one container, or not at all.

```tsx
<motion.div
  initial="hidden"
  animate="visible"
  variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
>
  <motion.h1 variants={{
    hidden:  { opacity: 0, y: 12, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0,  filter: "blur(0px)" },
  }}>
    Welcome
  </motion.h1>
  {/* description and buttons repeat the same variants */}
</motion.div>
```

```css
/* CSS-only stagger */
.stagger-item {
  opacity: 0;
  transform: translateY(12px);
  filter: blur(4px);
  animation: fadeInUp 400ms ease-out forwards;
}
.stagger-item:nth-child(1) { animation-delay: 0ms; }
.stagger-item:nth-child(2) { animation-delay: 100ms; }
.stagger-item:nth-child(3) { animation-delay: 200ms; }

@keyframes fadeInUp {
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}
```

## Exit animations

Softer and less attention-grabbing than enters — the user's focus is already moving on. Use
a small fixed `translateY`, never full height. `ease-out` for both directions.

## Contextual icon animations

Animate contextual icons with `opacity`, `scale`, and `blur` rather than toggling
visibility.

**Check `package.json` first.** Import from `"motion/react"` when `motion` is installed, or
`"framer-motion"` when that is. If both exist, follow the imports already used by the
component or its nearest peers. If neither is present, use the CSS cross-fade below — don't
add a dependency for icon transitions.

```tsx
import { AnimatePresence, motion } from "motion/react";

<AnimatePresence mode="popLayout">
  <motion.span
    key={isActive ? "active" : "inactive"}
    initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
    animate={{ opacity: 1, scale: 1,    filter: "blur(0px)" }}
    exit=   {{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
    transition={{ type: "spring", duration: 0.3, bounce: 0 }}
  >
    <Icon />
  </motion.span>
</AnimatePresence>
```

Without a motion library, keep both icons in the DOM — one absolutely positioned over the
other — and cross-fade. Neither unmounts, so both enter and exit animate.

```tsx
<div className="relative">
  <div className={cn(
    "absolute inset-0 flex items-center justify-center",
    "transition-[opacity,filter,scale] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
    isActive ? "scale-100 opacity-100 blur-0"
             : "scale-[0.25] opacity-0 blur-[4px]"
  )}>
    <ActiveIcon />
  </div>
  <div className={cn(
    "transition-[opacity,filter,scale] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
    isActive ? "scale-[0.25] opacity-0 blur-[4px]"
             : "scale-100 opacity-100 blur-0"
  )}>
    <InactiveIcon />
  </div>
</div>
```

The non-absolute icon defines the layout size; the absolute one overlays without affecting
flow.

**Exact values, no deviation:** scale `0.25 → 1` (never `0.5` or `0.6`), opacity `0 → 1`,
blur `4px → 0px`, transition `{ type: "spring", duration: 0.3, bounce: 0 }` — bounce is
always `0`.

| Animate | Don't animate |
| --- | --- |
| Icons appearing on hover (action buttons) | Static navigation icons |
| State-change icons (play → pause, like → liked) | Decorative icons |
| Icons in contextual toolbars | Always-visible icons |
| Loading and success indicators | Text labels beside icons |

## Scale on press

```css
.button {
  transition-property: scale;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}
.button:active { scale: 0.96; }
```

Always `0.96`; never below `0.95`. CSS transitions so a mid-press release returns smoothly.
Not every button needs this — add a `static` prop that disables it where the motion would
distract.

## Skip animation on page load

```tsx
<AnimatePresence initial={false}>
  <motion.div initial="hidden" animate="visible" variants={...} />
</AnimatePresence>
```

Prevents stateful icons and toggles from animating their default state on first render.
Verify the component still looks right on a full refresh, and that intentional page
entrances still play.

## Icon stroke and state

Stroke widths per adjacent text weight are in `00-standards.md`.

```html
<!-- stroke tuned to the label weight -->
<button class="flex items-center gap-2 font-semibold">
  <PlusIcon stroke-width="2" class="size-4" />
  New project
</button>
```

One SVG using `currentColor`; states come from CSS color and opacity, never separate
assets. Outline is the default variant, fill marks the active state. One stroke weight per
icon set, one family per surface.

## Reduced motion

Every recipe on this page is wrapped:

```css
@media (prefers-reduced-motion: no-preference) {
  /* motion here */
}
```

Under reduced motion, replace slides and scales with opacity crossfades; remove parallax
and autoplay entirely. Every essential state must remain understandable with motion absent.
