# Design token foundations

**GENERATED FROM `packages/tokens/tokens.json` -- DO NOT EDIT.**

Law 27: generated state is never hand-edited. Change the token file and run
`pnpm generate`; the `generate` stage regenerates this document and asserts it is
byte-identical, so an edit here is reverted and reported rather than merely wrong.

The narrative -- what the tiers mean, what each policy domain governs, and what is
declared but not enforced -- is in `docs/design-system.md`, which is hand-written and
deliberately reproduces no values.

## Coverage

- Token contract `2.0.0`, DTCG format `2025.10`.
- 152 custom properties: 81 primitive, 63 semantic, 8 component (ceiling 12).
- 2 mode blocks: `density=compact`, `theme=dark`.

## Primitive

Raw material with no opinion about use. The stylesheet may not name these.

| Custom property | Token | Type | Value |
| --- | --- | --- | --- |
| `--color-amber-100` | `color.amber.100` | color | `#f2e0b9` |
| `--color-amber-200` | `color.amber.200` | color | `#e7c38a` |
| `--color-amber-300` | `color.amber.300` | color | `#d9b877` |
| `--color-amber-800` | `color.amber.800` | color | `#7c4e01` |
| `--color-amber-850` | `color.amber.850` | color | `#3a3020` |
| `--color-amber-950` | `color.amber.950` | color | `#1a160e` |
| `--color-green-100` | `color.green.100` | color | `#d8e5db` |
| `--color-green-200` | `color.green.200` | color | `#a8d4b6` |
| `--color-green-300` | `color.green.300` | color | `#86c9a4` |
| `--color-green-700` | `color.green.700` | color | `#27603e` |
| `--color-green-800` | `color.green.800` | color | `#223a2c` |
| `--color-green-950` | `color.green.950` | color | `#0f1a14` |
| `--color-ink-100` | `color.ink.100` | color | `#e8e8ee` |
| `--color-ink-1000` | `color.ink.1000` | color | `#000000` |
| `--color-ink-300` | `color.ink.300` | color | `#8f8f9b` |
| `--color-ink-400` | `color.ink.400` | color | `#73737e` |
| `--color-ink-50` | `color.ink.50` | color | `#f5f5f8` |
| `--color-ink-600` | `color.ink.600` | color | `#45454e` |
| `--color-ink-700` | `color.ink.700` | color | `#33333a` |
| `--color-ink-750` | `color.ink.750` | color | `#26262a` |
| `--color-ink-800` | `color.ink.800` | color | `#1c1c1f` |
| `--color-ink-850` | `color.ink.850` | color | `#171719` |
| `--color-ink-900` | `color.ink.900` | color | `#131315` |
| `--color-ink-950` | `color.ink.950` | color | `#0a0a0c` |
| `--color-navy-800` | `color.navy.800` | color | `#14324a` |
| `--color-neutral-0` | `color.neutral.0` | color | `#ffffff` |
| `--color-neutral-100` | `color.neutral.100` | color | `#eef2f6` |
| `--color-neutral-200` | `color.neutral.200` | color | `#d7dee5` |
| `--color-neutral-300` | `color.neutral.300` | color | `#c3ccd5` |
| `--color-neutral-50` | `color.neutral.50` | color | `#f7f9fb` |
| `--color-neutral-500` | `color.neutral.500` | color | `#6f7b85` |
| `--color-neutral-600` | `color.neutral.600` | color | `#5c6974` |
| `--color-neutral-900` | `color.neutral.900` | color | `#26333d` |
| `--color-red-100` | `color.red.100` | color | `#f2dcdd` |
| `--color-red-200` | `color.red.200` | color | `#f2b6b2` |
| `--color-red-300` | `color.red.300` | color | `#e08d8d` |
| `--color-red-700` | `color.red.700` | color | `#8b3334` |
| `--color-red-800` | `color.red.800` | color | `#3d2024` |
| `--color-red-950` | `color.red.950` | color | `#1c1012` |
| `--color-scrim` | `color.scrim` | color | `#000000e6` |
| `--color-sky-100` | `color.sky.100` | color | `#d2e4ee` |
| `--color-sky-200` | `color.sky.200` | color | `#a1c7db` |
| `--color-sky-300` | `color.sky.300` | color | `#8fc4dd` |
| `--color-sky-700` | `color.sky.700` | color | `#114a65` |
| `--color-sky-800` | `color.sky.800` | color | `#1f3d4d` |
| `--color-sky-950` | `color.sky.950` | color | `#10222c` |
| `--color-teal-100` | `color.teal.100` | color | `#d9ecea` |
| `--color-teal-300` | `color.teal.300` | color | `#52c9b8` |
| `--color-teal-400` | `color.teal.400` | color | `#35b8a8` |
| `--color-teal-500` | `color.teal.500` | color | `#2aa093` |
| `--color-teal-600` | `color.teal.600` | color | `#2e7d7a` |
| `--color-teal-700` | `color.teal.700` | color | `#24625f` |
| `--color-teal-800` | `color.teal.800` | color | `#1c4b49` |
| `--color-teal-950` | `color.teal.950` | color | `#0f2523` |
| `--duration-slow` | `duration.slow` | duration | `[object Object]` |
| `--easing-in-out` | `easing.in-out` | cubicBezier | `0.42,0,0.58,1` |
| `--font-mono` | `font.mono` | fontFamily | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` |
| `--font-sans` | `font.sans` | fontFamily | `ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif` |
| `--leading-normal` | `leading.normal` | number | `1.5` |
| `--leading-tight` | `leading.tight` | number | `1.3` |
| `--size-border` | `size.border` | dimension | `1px` |
| `--size-control-min` | `size.control-min` | dimension | `36px` |
| `--size-control-min-compact` | `size.control-min-compact` | dimension | `32px` |
| `--size-focus-offset` | `size.focus-offset` | dimension | `2px` |
| `--size-focus-ring` | `size.focus-ring` | dimension | `2px` |
| `--size-measure` | `size.measure` | dimension | `42rem` |
| `--size-radius-md` | `size.radius-md` | dimension | `0.5rem` |
| `--size-radius-sm` | `size.radius-sm` | dimension | `0.25rem` |
| `--size-target-min` | `size.target-min` | dimension | `24px` |
| `--size-text-lg` | `size.text-lg` | dimension | `1.25rem` |
| `--size-text-md` | `size.text-md` | dimension | `1rem` |
| `--size-text-sm` | `size.text-sm` | dimension | `0.875rem` |
| `--space-0` | `space.0` | dimension | `0` |
| `--space-1` | `space.1` | dimension | `0.25rem` |
| `--space-2` | `space.2` | dimension | `0.5rem` |
| `--space-3` | `space.3` | dimension | `0.75rem` |
| `--space-4` | `space.4` | dimension | `1rem` |
| `--space-5` | `space.5` | dimension | `1.5rem` |
| `--space-6` | `space.6` | dimension | `2rem` |
| `--weight-regular` | `weight.regular` | fontWeight | `400` |
| `--weight-semibold` | `weight.semibold` | fontWeight | `600` |

## Semantic

The layer a stylesheet and the component tier may use. `Obligation` is what the
policy requires of the token, joined here from the colour, typography, motion and
elevation domains.

| Custom property | Token | Type | Value | Obligation |
| --- | --- | --- | --- | --- |
| `--semantic-border-danger` | `semantic.border.danger` | color | `{color.red.200}` | decorative · exempt, status is carried by text and surface |
| `--semantic-border-default` | `semantic.border.default` | color | `{color.neutral.300}` | decorative · exempt, a divider, never a sole control boundary |
| `--semantic-border-disabled` | `semantic.border.disabled` | color | `{color.neutral.300}` | decorative · exempt, the boundary of a control that cannot be operated, not one to be found |
| `--semantic-border-info` | `semantic.border.info` | color | `{color.sky.200}` | decorative · exempt, status is carried by text and surface |
| `--semantic-border-strong` | `semantic.border.strong` | color | `{color.neutral.500}` | ui · ≥3:1 against neutral |
| `--semantic-border-success` | `semantic.border.success` | color | `{color.green.200}` | decorative · exempt, status is carried by text and surface |
| `--semantic-border-warning` | `semantic.border.warning` | color | `{color.amber.200}` | decorative · exempt, status is carried by text and surface |
| `--semantic-container-measure` | `semantic.container.measure` | dimension | `{size.measure}` | -- |
| `--semantic-container-padding` | `semantic.container.padding` | dimension | `{space.5}` | -- |
| `--semantic-control-min-size` | `semantic.control.min-size` | dimension | `{size.control-min}` | -- |
| `--semantic-control-padding-block` | `semantic.control.padding-block` | dimension | `{space.2}` | -- |
| `--semantic-control-padding-inline` | `semantic.control.padding-inline` | dimension | `{space.3}` | -- |
| `--semantic-focus-ring` | `semantic.focus.ring` | color | `{color.teal.600}` | ui · ≥3:1 against neutral |
| `--semantic-font-body` | `semantic.font.body` | fontFamily | `{font.sans}` | -- |
| `--semantic-font-code` | `semantic.font.code` | fontFamily | `{font.mono}` | -- |
| `--semantic-leading-body` | `semantic.leading.body` | number | `{leading.normal}` | type body · leading ≥1.5 |
| `--semantic-leading-heading` | `semantic.leading.heading` | number | `{leading.tight}` | type heading · leading ≥1.15 |
| `--semantic-motion-duration-pulse` | `semantic.motion.duration.pulse` | duration | `{duration.slow}` | loops · removed under reduced motion |
| `--semantic-motion-easing-default` | `semantic.motion.easing.default` | cubicBezier | `{easing.in-out}` | -- |
| `--semantic-overlay-scrim` | `semantic.overlay.scrim` | color | `{color.scrim}` | compositing · exempt, an alpha layer, not a foreground pair |
| `--semantic-radius-container` | `semantic.radius.container` | dimension | `{size.radius-md}` | -- |
| `--semantic-radius-control` | `semantic.radius.control` | dimension | `{size.radius-sm}` | -- |
| `--semantic-row-gap` | `semantic.row.gap` | dimension | `{space.4}` | -- |
| `--semantic-row-padding` | `semantic.row.padding` | dimension | `{space.3}` | -- |
| `--semantic-space-inline` | `semantic.space.inline` | dimension | `{space.4}` | -- |
| `--semantic-space-inline-tight` | `semantic.space.inline-tight` | dimension | `{space.1}` | -- |
| `--semantic-space-section` | `semantic.space.section` | dimension | `{space.5}` | -- |
| `--semantic-space-stack` | `semantic.space.stack` | dimension | `{space.4}` | -- |
| `--semantic-space-stack-loose` | `semantic.space.stack-loose` | dimension | `{space.5}` | -- |
| `--semantic-space-stack-tight` | `semantic.space.stack-tight` | dimension | `{space.2}` | -- |
| `--semantic-stroke-focus-offset` | `semantic.stroke.focus-offset` | dimension | `{size.focus-offset}` | -- |
| `--semantic-stroke-focus-ring` | `semantic.stroke.focus-ring` | dimension | `{size.focus-ring}` | -- |
| `--semantic-stroke-width` | `semantic.stroke.width` | dimension | `{size.border}` | -- |
| `--semantic-surface-accent` | `semantic.surface.accent` | color | `{color.teal.600}` | ui · ≥3:1 against neutral |
| `--semantic-surface-accent-active` | `semantic.surface.accent-active` | color | `{color.teal.800}` | ui · ≥3:1 against neutral |
| `--semantic-surface-accent-hover` | `semantic.surface.accent-hover` | color | `{color.teal.700}` | ui · ≥3:1 against neutral |
| `--semantic-surface-accent-subtle` | `semantic.surface.accent-subtle` | color | `{color.teal.100}` | surface · provides neutral |
| `--semantic-surface-danger` | `semantic.surface.danger` | color | `{color.red.100}` | surface · provides danger |
| `--semantic-surface-disabled` | `semantic.surface.disabled` | color | `{color.neutral.200}` | surface · provides disabled |
| `--semantic-surface-info` | `semantic.surface.info` | color | `{color.sky.100}` | surface · provides info |
| `--semantic-surface-overlay` | `semantic.surface.overlay` | color | `{color.neutral.0}` | surface · provides neutral |
| `--semantic-surface-page` | `semantic.surface.page` | color | `{color.neutral.50}` | surface · provides neutral |
| `--semantic-surface-raised` | `semantic.surface.raised` | color | `{color.neutral.0}` | surface · provides neutral |
| `--semantic-surface-raised-active` | `semantic.surface.raised-active` | color | `{color.neutral.100}` | surface · provides neutral |
| `--semantic-surface-raised-hover` | `semantic.surface.raised-hover` | color | `{color.neutral.50}` | surface · provides neutral |
| `--semantic-surface-success` | `semantic.surface.success` | color | `{color.green.100}` | surface · provides success |
| `--semantic-surface-sunken` | `semantic.surface.sunken` | color | `{color.neutral.100}` | surface · provides neutral |
| `--semantic-surface-warning` | `semantic.surface.warning` | color | `{color.amber.100}` | surface · provides warning |
| `--semantic-target-minimum` | `semantic.target.minimum` | dimension | `{size.target-min}` | -- |
| `--semantic-text-danger` | `semantic.text.danger` | color | `{color.red.700}` | text · ≥4.5:1 against danger, neutral |
| `--semantic-text-default` | `semantic.text.default` | color | `{color.neutral.900}` | text · ≥4.5:1 against neutral |
| `--semantic-text-disabled` | `semantic.text.disabled` | color | `{color.neutral.500}` | inactive · ≥3:1 against disabled, neutral |
| `--semantic-text-heading` | `semantic.text.heading` | color | `{color.navy.800}` | text · ≥4.5:1 against neutral |
| `--semantic-text-info` | `semantic.text.info` | color | `{color.sky.700}` | text · ≥4.5:1 against info, neutral |
| `--semantic-text-muted` | `semantic.text.muted` | color | `{color.neutral.600}` | text · ≥4.5:1 against neutral |
| `--semantic-text-on-accent` | `semantic.text.on-accent` | color | `{color.neutral.0}` | text · ≥4.5:1 against accent |
| `--semantic-text-success` | `semantic.text.success` | color | `{color.green.700}` | text · ≥4.5:1 against neutral, success |
| `--semantic-text-warning` | `semantic.text.warning` | color | `{color.amber.800}` | text · ≥4.5:1 against neutral, warning |
| `--semantic-type-body` | `semantic.type.body` | dimension | `{size.text-md}` | type body · ≥14px at a 16px root |
| `--semantic-type-heading` | `semantic.type.heading` | dimension | `{size.text-lg}` | type heading · ≥16px at a 16px root |
| `--semantic-type-label` | `semantic.type.label` | dimension | `{size.text-sm}` | type label · ≥12px at a 16px root |
| `--semantic-weight-body` | `semantic.weight.body` | fontWeight | `{weight.regular}` | -- |
| `--semantic-weight-heading` | `semantic.weight.heading` | fontWeight | `{weight.semibold}` | -- |

## Component

| Custom property | Token | Type | Value |
| --- | --- | --- | --- |
| `--component-alert-padding-block` | `component.alert.padding-block` | dimension | `{semantic.control.padding-block}` |
| `--component-alert-padding-inline` | `component.alert.padding-inline` | dimension | `{semantic.space.inline}` |
| `--component-button-min-size` | `component.button.min-size` | dimension | `{semantic.control.min-size}` |
| `--component-button-padding-block` | `component.button.padding-block` | dimension | `{semantic.control.padding-block}` |
| `--component-button-padding-inline` | `component.button.padding-inline` | dimension | `{semantic.control.padding-inline}` |
| `--component-card-padding` | `component.card.padding` | dimension | `{semantic.container.padding}` |
| `--component-list-item-gap` | `component.list-item.gap` | dimension | `{semantic.row.gap}` |
| `--component-list-item-padding` | `component.list-item.padding` | dimension | `{semantic.row.padding}` |

## Modes

Two axes compose: `theme` owns colour, `density` owns geometry. A token rebound by
both is refused, because the selectors have equal specificity and emission order
would decide the winner.

### `density=compact`

Selector `:root[data-density='compact']`, 11 rebound.

| Custom property | Value in this mode |
| --- | --- |
| `--semantic-container-padding` | `{space.3}` |
| `--semantic-control-min-size` | `{size.control-min-compact}` |
| `--semantic-control-padding-block` | `{space.1}` |
| `--semantic-control-padding-inline` | `{space.2}` |
| `--semantic-row-gap` | `{space.3}` |
| `--semantic-row-padding` | `{space.2}` |
| `--semantic-space-inline` | `{space.3}` |
| `--semantic-space-section` | `{space.3}` |
| `--semantic-space-stack` | `{space.2}` |
| `--semantic-space-stack-loose` | `{space.3}` |
| `--semantic-space-stack-tight` | `{space.1}` |

### `theme=dark`

Selector `:root[data-theme='dark']`, 32 rebound.

| Custom property | Value in this mode |
| --- | --- |
| `--semantic-border-danger` | `{color.red.800}` |
| `--semantic-border-default` | `{color.ink.600}` |
| `--semantic-border-disabled` | `{color.ink.700}` |
| `--semantic-border-info` | `{color.sky.800}` |
| `--semantic-border-strong` | `{color.ink.400}` |
| `--semantic-border-success` | `{color.green.800}` |
| `--semantic-border-warning` | `{color.amber.850}` |
| `--semantic-focus-ring` | `{color.teal.500}` |
| `--semantic-surface-accent` | `{color.teal.500}` |
| `--semantic-surface-accent-active` | `{color.teal.300}` |
| `--semantic-surface-accent-hover` | `{color.teal.400}` |
| `--semantic-surface-accent-subtle` | `{color.teal.950}` |
| `--semantic-surface-danger` | `{color.red.950}` |
| `--semantic-surface-disabled` | `{color.ink.750}` |
| `--semantic-surface-info` | `{color.sky.950}` |
| `--semantic-surface-overlay` | `{color.ink.800}` |
| `--semantic-surface-page` | `{color.ink.950}` |
| `--semantic-surface-raised` | `{color.ink.900}` |
| `--semantic-surface-raised-active` | `{color.ink.800}` |
| `--semantic-surface-raised-hover` | `{color.ink.850}` |
| `--semantic-surface-success` | `{color.green.950}` |
| `--semantic-surface-sunken` | `{color.ink.1000}` |
| `--semantic-surface-warning` | `{color.amber.950}` |
| `--semantic-text-danger` | `{color.red.300}` |
| `--semantic-text-default` | `{color.ink.100}` |
| `--semantic-text-disabled` | `{color.ink.400}` |
| `--semantic-text-heading` | `{color.ink.50}` |
| `--semantic-text-info` | `{color.sky.300}` |
| `--semantic-text-muted` | `{color.ink.300}` |
| `--semantic-text-on-accent` | `{color.ink.950}` |
| `--semantic-text-success` | `{color.green.300}` |
| `--semantic-text-warning` | `{color.amber.300}` |
