# Design token foundations

**GENERATED FROM `packages/design/policy/tokens.json` -- DO NOT EDIT.**

Law 27: generated state is never hand-edited. Change the token file and run
`pnpm generate`; the `generate` stage regenerates this document and asserts it is
byte-identical, so an edit here is reverted and reported rather than merely wrong.

The narrative -- what the tiers mean, what each policy domain governs, and what is
declared but not enforced -- is in `docs/design-system.md`, which is hand-written and
deliberately reproduces no values.

## Coverage

- Token contract `2.0.0`, DTCG format `2025.10`.
- 238 custom properties: 118 primitive, 120 semantic, 0 component (ceiling 12).
- 3 mode blocks: `density=comfortable`, `density=compact`, `theme=dark`.

## Primitive

Raw material with no opinion about use. The stylesheet may not name these.

| Custom property | Token | Type | Value |
| --- | --- | --- | --- |
| `--breakpoint-expanded` | `breakpoint.expanded` | dimension | `840px` |
| `--breakpoint-extra-large` | `breakpoint.extra-large` | dimension | `1600px` |
| `--breakpoint-large` | `breakpoint.large` | dimension | `1200px` |
| `--breakpoint-medium` | `breakpoint.medium` | dimension | `600px` |
| `--color-amber-100` | `color.amber.100` | color | `#f2e0b9` |
| `--color-amber-300` | `color.amber.300` | color | `#d9b877` |
| `--color-amber-800` | `color.amber.800` | color | `#7c4e01` |
| `--color-amber-950` | `color.amber.950` | color | `#1a160e` |
| `--color-brass-100` | `color.brass.100` | color | `#efe4cf` |
| `--color-brass-300` | `color.brass.300` | color | `#b8b49f` |
| `--color-brass-700` | `color.brass.700` | color | `#6b5324` |
| `--color-brass-950` | `color.brass.950` | color | `#101312` |
| `--color-green-100` | `color.green.100` | color | `#d8e5db` |
| `--color-green-300` | `color.green.300` | color | `#86c9a4` |
| `--color-green-700` | `color.green.700` | color | `#27603e` |
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
| `--color-neutral-0` | `color.neutral.0` | color | `#ffffff` |
| `--color-neutral-100` | `color.neutral.100` | color | `#e0e7ee` |
| `--color-neutral-200` | `color.neutral.200` | color | `#d7dee5` |
| `--color-neutral-300` | `color.neutral.300` | color | `#c3ccd5` |
| `--color-neutral-50` | `color.neutral.50` | color | `#f2f5f9` |
| `--color-neutral-500` | `color.neutral.500` | color | `#6f7b85` |
| `--color-neutral-600` | `color.neutral.600` | color | `#5c6974` |
| `--color-neutral-900` | `color.neutral.900` | color | `#26333d` |
| `--color-red-100` | `color.red.100` | color | `#f2dcdd` |
| `--color-red-200` | `color.red.200` | color | `#eaa3a3` |
| `--color-red-300` | `color.red.300` | color | `#e08d8d` |
| `--color-red-700` | `color.red.700` | color | `#8b3334` |
| `--color-red-800` | `color.red.800` | color | `#6d2828` |
| `--color-red-950` | `color.red.950` | color | `#1c1012` |
| `--color-scrim` | `color.scrim` | color | `#00000099` |
| `--color-shadow-ambient` | `color.shadow.ambient` | color | `#26333d14` |
| `--color-shadow-ambient-dark` | `color.shadow.ambient-dark` | color | `#0000004d` |
| `--color-shadow-key` | `color.shadow.key` | color | `#26333d1f` |
| `--color-shadow-key-dark` | `color.shadow.key-dark` | color | `#00000073` |
| `--color-shadow-none` | `color.shadow.none` | color | `#00000000` |
| `--color-sky-100` | `color.sky.100` | color | `#d2e4ee` |
| `--color-sky-300` | `color.sky.300` | color | `#8fc4dd` |
| `--color-sky-700` | `color.sky.700` | color | `#114a65` |
| `--color-sky-950` | `color.sky.950` | color | `#10222c` |
| `--color-teal-100` | `color.teal.100` | color | `#d9ecea` |
| `--color-teal-200` | `color.teal.200` | color | `#c2e1dc` |
| `--color-teal-300` | `color.teal.300` | color | `#52c9b8` |
| `--color-teal-400` | `color.teal.400` | color | `#35b8a8` |
| `--color-teal-500` | `color.teal.500` | color | `#2aa093` |
| `--color-teal-600` | `color.teal.600` | color | `#2e7d7a` |
| `--color-teal-700` | `color.teal.700` | color | `#24625f` |
| `--color-teal-800` | `color.teal.800` | color | `#1c4b49` |
| `--color-teal-900` | `color.teal.900` | color | `#163a38` |
| `--color-teal-950` | `color.teal.950` | color | `#0f2523` |
| `--duration-base` | `duration.base` | duration | `[object Object]` |
| `--duration-deliberate` | `duration.deliberate` | duration | `[object Object]` |
| `--duration-fast` | `duration.fast` | duration | `[object Object]` |
| `--duration-instant` | `duration.instant` | duration | `[object Object]` |
| `--duration-none` | `duration.none` | duration | `[object Object]` |
| `--duration-pulse` | `duration.pulse` | duration | `[object Object]` |
| `--easing-entrance` | `easing.entrance` | cubicBezier | `0,0,0.38,0.9` |
| `--easing-exit` | `easing.exit` | cubicBezier | `0.2,0,1,0.9` |
| `--easing-standard` | `easing.standard` | cubicBezier | `0.2,0,0.38,0.9` |
| `--font-mono` | `font.mono` | fontFamily | `IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` |
| `--font-sans` | `font.sans` | fontFamily | `IBM Plex Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif` |
| `--leading-loose` | `leading.loose` | number | `1.5` |
| `--leading-normal` | `leading.normal` | number | `1.4286` |
| `--leading-snug` | `leading.snug` | number | `1.4` |
| `--leading-tight` | `leading.tight` | number | `1.3333` |
| `--size-border` | `size.border` | dimension | `1px` |
| `--size-content-dialog` | `size.content-dialog` | dimension | `24rem` |
| `--size-content-form` | `size.content-form` | dimension | `60rem` |
| `--size-content-prose` | `size.content-prose` | dimension | `45rem` |
| `--size-content-tip` | `size.content-tip` | dimension | `20rem` |
| `--size-control-min` | `size.control-min` | dimension | `40px` |
| `--size-control-min-comfortable` | `size.control-min-comfortable` | dimension | `48px` |
| `--size-control-min-compact` | `size.control-min-compact` | dimension | `32px` |
| `--size-focus-offset` | `size.focus-offset` | dimension | `2px` |
| `--size-focus-ring` | `size.focus-ring` | dimension | `2px` |
| `--size-icon` | `size.icon` | dimension | `1.25rem` |
| `--size-icon-comfortable` | `size.icon-comfortable` | dimension | `1.5rem` |
| `--size-icon-compact` | `size.icon-compact` | dimension | `1rem` |
| `--size-radius-lg` | `size.radius-lg` | dimension | `0.75rem` |
| `--size-radius-md` | `size.radius-md` | dimension | `0.5rem` |
| `--size-radius-overlay` | `size.radius-overlay` | dimension | `1rem` |
| `--size-radius-sm` | `size.radius-sm` | dimension | `0.25rem` |
| `--size-shell-header` | `size.shell-header` | dimension | `48px` |
| `--size-shell-nav-collapsed` | `size.shell-nav-collapsed` | dimension | `64px` |
| `--size-shell-nav-expanded` | `size.shell-nav-expanded` | dimension | `240px` |
| `--size-target-min` | `size.target-min` | dimension | `24px` |
| `--size-text-lg` | `size.text-lg` | dimension | `1.25rem` |
| `--size-text-md` | `size.text-md` | dimension | `1rem` |
| `--size-text-sm` | `size.text-sm` | dimension | `0.875rem` |
| `--size-text-xl` | `size.text-xl` | dimension | `1.5rem` |
| `--size-text-xs` | `size.text-xs` | dimension | `0.75rem` |
| `--space-1` | `space.1` | dimension | `0.25rem` |
| `--space-2` | `space.2` | dimension | `0.5rem` |
| `--space-3` | `space.3` | dimension | `0.75rem` |
| `--space-4` | `space.4` | dimension | `1rem` |
| `--space-5` | `space.5` | dimension | `1.5rem` |
| `--space-6` | `space.6` | dimension | `2rem` |
| `--space-7` | `space.7` | dimension | `2.5rem` |
| `--space-8` | `space.8` | dimension | `3rem` |
| `--space-9` | `space.9` | dimension | `4rem` |
| `--tracking-normal` | `tracking.normal` | dimension | `0em` |
| `--tracking-wide` | `tracking.wide` | dimension | `0.02em` |
| `--weight-bold` | `weight.bold` | fontWeight | `700` |
| `--weight-medium` | `weight.medium` | fontWeight | `500` |
| `--weight-normal` | `weight.normal` | fontWeight | `400` |
| `--weight-semibold` | `weight.semibold` | fontWeight | `600` |

## Semantic

The layer a stylesheet and the component tier may use. `Obligation` is what the
policy requires of the token, joined here from the colour, typography, motion and
elevation domains.

| Custom property | Token | Type | Value | Obligation |
| --- | --- | --- | --- | --- |
| `--semantic-breakpoint-expanded` | `semantic.breakpoint.expanded` | dimension | `{breakpoint.expanded}` | -- |
| `--semantic-breakpoint-extra-large` | `semantic.breakpoint.extra-large` | dimension | `{breakpoint.extra-large}` | -- |
| `--semantic-breakpoint-large` | `semantic.breakpoint.large` | dimension | `{breakpoint.large}` | -- |
| `--semantic-breakpoint-medium` | `semantic.breakpoint.medium` | dimension | `{breakpoint.medium}` | -- |
| `--semantic-color-accent` | `semantic.color.accent` | color | `{color.teal.100}` | surface · provides accent |
| `--semantic-color-accent-foreground` | `semantic.color.accent-foreground` | color | `{color.teal.800}` | text · ≥4.5:1 against accent |
| `--semantic-color-accent-hover` | `semantic.color.accent-hover` | color | `{color.teal.200}` | surface · provides accent |
| `--semantic-color-accent-pressed` | `semantic.color.accent-pressed` | color | `{color.teal.300}` | surface · provides accent |
| `--semantic-color-background` | `semantic.color.background` | color | `{color.neutral.50}` | surface · provides page |
| `--semantic-color-border` | `semantic.color.border` | color | `{color.neutral.300}` | decorative · exempt, a divider, never a sole control boundary |
| `--semantic-color-card` | `semantic.color.card` | color | `{color.neutral.0}` | surface · provides card |
| `--semantic-color-card-foreground` | `semantic.color.card-foreground` | color | `{color.neutral.900}` | text · ≥4.5:1 against card |
| `--semantic-color-destructive` | `semantic.color.destructive` | color | `{color.red.700}` | surface · provides destructive |
| `--semantic-color-destructive-foreground` | `semantic.color.destructive-foreground` | color | `{color.neutral.0}` | text · ≥4.5:1 against destructive |
| `--semantic-color-destructive-hover` | `semantic.color.destructive-hover` | color | `{color.red.800}` | surface · provides destructive |
| `--semantic-color-disabled` | `semantic.color.disabled` | color | `{color.neutral.200}` | surface · provides disabled |
| `--semantic-color-disabled-foreground` | `semantic.color.disabled-foreground` | color | `{color.neutral.500}` | inactive · ≥3:1 against disabled |
| `--semantic-color-error` | `semantic.color.error` | color | `{color.red.100}` | surface · provides error |
| `--semantic-color-error-foreground` | `semantic.color.error-foreground` | color | `{color.red.700}` | text · ≥4.5:1 against error |
| `--semantic-color-field` | `semantic.color.field` | color | `{color.neutral.0}` | surface · provides field |
| `--semantic-color-foreground` | `semantic.color.foreground` | color | `{color.neutral.900}` | text · ≥4.5:1 against field, page |
| `--semantic-color-info` | `semantic.color.info` | color | `{color.sky.100}` | surface · provides info |
| `--semantic-color-info-foreground` | `semantic.color.info-foreground` | color | `{color.sky.700}` | text · ≥4.5:1 against info |
| `--semantic-color-input` | `semantic.color.input` | color | `{color.neutral.500}` | ui · ≥3:1 against card, page |
| `--semantic-color-muted` | `semantic.color.muted` | color | `{color.neutral.100}` | surface · provides muted |
| `--semantic-color-muted-foreground` | `semantic.color.muted-foreground` | color | `{color.neutral.600}` | text · ≥4.5:1 against card, muted, page |
| `--semantic-color-popover` | `semantic.color.popover` | color | `{color.neutral.0}` | surface · provides popover |
| `--semantic-color-popover-foreground` | `semantic.color.popover-foreground` | color | `{color.neutral.900}` | text · ≥4.5:1 against popover |
| `--semantic-color-primary` | `semantic.color.primary` | color | `{color.teal.700}` | surface · provides primary |
| `--semantic-color-primary-foreground` | `semantic.color.primary-foreground` | color | `{color.neutral.0}` | text · ≥4.5:1 against primary |
| `--semantic-color-primary-hover` | `semantic.color.primary-hover` | color | `{color.teal.800}` | surface · provides primary |
| `--semantic-color-primary-pressed` | `semantic.color.primary-pressed` | color | `{color.teal.950}` | surface · provides primary |
| `--semantic-color-ring` | `semantic.color.ring` | color | `{color.teal.700}` | ui · ≥3:1 against card, page |
| `--semantic-color-scrim` | `semantic.color.scrim` | color | `{color.scrim}` | compositing · exempt, an alpha layer, not a foreground pair |
| `--semantic-color-secondary` | `semantic.color.secondary` | color | `{color.neutral.0}` | surface · provides secondary |
| `--semantic-color-secondary-foreground` | `semantic.color.secondary-foreground` | color | `{color.neutral.900}` | text · ≥4.5:1 against secondary |
| `--semantic-color-secondary-hover` | `semantic.color.secondary-hover` | color | `{color.neutral.50}` | surface · provides secondary |
| `--semantic-color-secondary-pressed` | `semantic.color.secondary-pressed` | color | `{color.neutral.100}` | surface · provides secondary |
| `--semantic-color-shadow-ambient` | `semantic.color.shadow-ambient` | color | `{color.shadow.ambient}` | compositing · exempt, the wide, faint layer of a shadow; composited, not a pair |
| `--semantic-color-shadow-key` | `semantic.color.shadow-key` | color | `{color.shadow.key}` | compositing · exempt, the tight, nearer layer of a shadow; composited, not a pair |
| `--semantic-color-sidebar` | `semantic.color.sidebar` | color | `{color.neutral.100}` | surface · provides sidebar |
| `--semantic-color-sidebar-accent` | `semantic.color.sidebar-accent` | color | `{color.teal.100}` | surface · provides sidebar-accent |
| `--semantic-color-sidebar-accent-foreground` | `semantic.color.sidebar-accent-foreground` | color | `{color.teal.800}` | text · ≥4.5:1 against sidebar-accent |
| `--semantic-color-sidebar-border` | `semantic.color.sidebar-border` | color | `{color.neutral.300}` | decorative · exempt, a divider inside the rail, never a sole control boundary |
| `--semantic-color-sidebar-foreground` | `semantic.color.sidebar-foreground` | color | `{color.neutral.900}` | text · ≥4.5:1 against sidebar |
| `--semantic-color-sidebar-ring` | `semantic.color.sidebar-ring` | color | `{color.teal.700}` | ui · ≥3:1 against sidebar |
| `--semantic-color-statutory` | `semantic.color.statutory` | color | `{color.brass.100}` | surface · provides statutory |
| `--semantic-color-statutory-foreground` | `semantic.color.statutory-foreground` | color | `{color.brass.700}` | text · ≥4.5:1 against statutory |
| `--semantic-color-success` | `semantic.color.success` | color | `{color.green.100}` | surface · provides success |
| `--semantic-color-success-foreground` | `semantic.color.success-foreground` | color | `{color.green.700}` | text · ≥4.5:1 against success |
| `--semantic-color-warning` | `semantic.color.warning` | color | `{color.amber.100}` | surface · provides warning |
| `--semantic-color-warning-foreground` | `semantic.color.warning-foreground` | color | `{color.amber.800}` | text · ≥4.5:1 against warning |
| `--semantic-content-dialog` | `semantic.content.dialog` | dimension | `{size.content-dialog}` | -- |
| `--semantic-content-form` | `semantic.content.form` | dimension | `{size.content-form}` | -- |
| `--semantic-content-prose` | `semantic.content.prose` | dimension | `{size.content-prose}` | -- |
| `--semantic-content-tip` | `semantic.content.tip` | dimension | `{size.content-tip}` | -- |
| `--semantic-control-min-size` | `semantic.control.min-size` | dimension | `{size.control-min}` | -- |
| `--semantic-ease-entrance` | `semantic.ease.entrance` | cubicBezier | `{easing.entrance}` | -- |
| `--semantic-ease-exit` | `semantic.ease.exit` | cubicBezier | `{easing.exit}` | -- |
| `--semantic-ease-standard` | `semantic.ease.standard` | cubicBezier | `{easing.standard}` | -- |
| `--semantic-elevation-flat` | `semantic.elevation.flat` | shadow | `` | -- |
| `--semantic-elevation-floating` | `semantic.elevation.floating` | shadow | `[object Object],[object Object]` | -- |
| `--semantic-elevation-modal` | `semantic.elevation.modal` | shadow | `[object Object],[object Object]` | -- |
| `--semantic-elevation-overlay` | `semantic.elevation.overlay` | shadow | `[object Object],[object Object]` | -- |
| `--semantic-elevation-raised` | `semantic.elevation.raised` | shadow | `[object Object],[object Object]` | -- |
| `--semantic-font-mono` | `semantic.font.mono` | fontFamily | `{font.mono}` | -- |
| `--semantic-font-sans` | `semantic.font.sans` | fontFamily | `{font.sans}` | -- |
| `--semantic-icon-size` | `semantic.icon.size` | dimension | `{size.icon}` | -- |
| `--semantic-layer-local` | `semantic.layer.local` | number | `10` | -- |
| `--semantic-layer-overlay` | `semantic.layer.overlay` | number | `50` | -- |
| `--semantic-leading-body` | `semantic.leading.body` | number | `{leading.loose}` | type body · leading ≥1.5 |
| `--semantic-leading-caption` | `semantic.leading.caption` | number | `{leading.tight}` | type caption · leading ≥1.33 |
| `--semantic-leading-compact` | `semantic.leading.compact` | number | `{leading.normal}` | type body-compact · leading ≥1.4 |
| `--semantic-leading-heading` | `semantic.leading.heading` | number | `{leading.snug}` | type heading · leading ≥1.15 |
| `--semantic-leading-label` | `semantic.leading.label` | number | `{leading.normal}` | type label · leading ≥1.4 |
| `--semantic-leading-title` | `semantic.leading.title` | number | `{leading.tight}` | type title · leading ≥1.15 |
| `--semantic-motion-duration-base` | `semantic.motion.duration.base` | duration | `{duration.base}` | one-shot · shortened under reduced motion |
| `--semantic-motion-duration-none` | `semantic.motion.duration.none` | duration | `{duration.none}` | one-shot · unaffected under reduced motion |
| `--semantic-motion-duration-overlay` | `semantic.motion.duration.overlay` | duration | `{duration.deliberate}` | one-shot · shortened under reduced motion |
| `--semantic-motion-duration-press` | `semantic.motion.duration.press` | duration | `{duration.instant}` | one-shot · shortened under reduced motion |
| `--semantic-motion-duration-pulse` | `semantic.motion.duration.pulse` | duration | `{duration.pulse}` | loops · removed under reduced motion |
| `--semantic-motion-duration-state` | `semantic.motion.duration.state` | duration | `{duration.fast}` | one-shot · shortened under reduced motion |
| `--semantic-radius-container` | `semantic.radius.container` | dimension | `{size.radius-lg}` | -- |
| `--semantic-radius-control` | `semantic.radius.control` | dimension | `{size.radius-md}` | -- |
| `--semantic-radius-overlay` | `semantic.radius.overlay` | dimension | `{size.radius-overlay}` | -- |
| `--semantic-radius-precise` | `semantic.radius.precise` | dimension | `{size.radius-sm}` | -- |
| `--semantic-shell-header` | `semantic.shell.header` | dimension | `{size.shell-header}` | -- |
| `--semantic-shell-nav-collapsed` | `semantic.shell.nav-collapsed` | dimension | `{size.shell-nav-collapsed}` | -- |
| `--semantic-shell-nav-expanded` | `semantic.shell.nav-expanded` | dimension | `{size.shell-nav-expanded}` | -- |
| `--semantic-size-ring` | `semantic.size.ring` | dimension | `{size.focus-ring}` | -- |
| `--semantic-size-ring-offset` | `semantic.size.ring-offset` | dimension | `{size.focus-offset}` | -- |
| `--semantic-size-stroke` | `semantic.size.stroke` | dimension | `{size.border}` | -- |
| `--semantic-space-container` | `semantic.space.container` | dimension | `{space.5}` | -- |
| `--semantic-space-control-x` | `semantic.space.control-x` | dimension | `{space.3}` | -- |
| `--semantic-space-control-y` | `semantic.space.control-y` | dimension | `{space.2}` | -- |
| `--semantic-space-loose` | `semantic.space.loose` | dimension | `{space.5}` | -- |
| `--semantic-space-normal` | `semantic.space.normal` | dimension | `{space.4}` | -- |
| `--semantic-space-related` | `semantic.space.related` | dimension | `{space.1}` | -- |
| `--semantic-space-row-x` | `semantic.space.row-x` | dimension | `{space.4}` | -- |
| `--semantic-space-row-y` | `semantic.space.row-y` | dimension | `{space.3}` | -- |
| `--semantic-space-section` | `semantic.space.section` | dimension | `{space.6}` | -- |
| `--semantic-space-snug` | `semantic.space.snug` | dimension | `{space.3}` | -- |
| `--semantic-space-tight` | `semantic.space.tight` | dimension | `{space.2}` | -- |
| `--semantic-target-minimum` | `semantic.target.minimum` | dimension | `{size.target-min}` | -- |
| `--semantic-tracking-body` | `semantic.tracking.body` | dimension | `{tracking.normal}` | -- |
| `--semantic-tracking-shortcut` | `semantic.tracking.shortcut` | dimension | `{tracking.wide}` | -- |
| `--semantic-type-body` | `semantic.type.body` | dimension | `{size.text-md}` | type body · ≥14px at a 16px root |
| `--semantic-type-body-compact` | `semantic.type.body-compact` | dimension | `{size.text-sm}` | type body-compact · ≥14px at a 16px root |
| `--semantic-type-caption` | `semantic.type.caption` | dimension | `{size.text-xs}` | type caption · ≥12px at a 16px root |
| `--semantic-type-emphasis` | `semantic.type.emphasis` | dimension | `{size.text-md}` | type emphasis · ≥14px at a 16px root |
| `--semantic-type-heading` | `semantic.type.heading` | dimension | `{size.text-lg}` | type heading · ≥16px at a 16px root |
| `--semantic-type-label` | `semantic.type.label` | dimension | `{size.text-sm}` | type label · ≥12px at a 16px root |
| `--semantic-type-title` | `semantic.type.title` | dimension | `{size.text-xl}` | type title · ≥18px at a 16px root |
| `--semantic-weight-body` | `semantic.weight.body` | fontWeight | `{weight.normal}` | -- |
| `--semantic-weight-body-compact` | `semantic.weight.body-compact` | fontWeight | `{weight.normal}` | -- |
| `--semantic-weight-caption` | `semantic.weight.caption` | fontWeight | `{weight.normal}` | -- |
| `--semantic-weight-emphasis` | `semantic.weight.emphasis` | fontWeight | `{weight.medium}` | -- |
| `--semantic-weight-heading` | `semantic.weight.heading` | fontWeight | `{weight.semibold}` | -- |
| `--semantic-weight-label` | `semantic.weight.label` | fontWeight | `{weight.medium}` | -- |
| `--semantic-weight-medium` | `semantic.weight.medium` | fontWeight | `{weight.medium}` | -- |

## Component

_None._

## Modes

Two axes compose: `theme` owns colour, `density` owns geometry. A token rebound by
both is refused, because the selectors have equal specificity and emission order
would decide the winner.

### `density=comfortable`

Selector `:root[data-density='comfortable']`, 11 rebound.

| Custom property | Value in this mode |
| --- | --- |
| `--semantic-control-min-size` | `{size.control-min-comfortable}` |
| `--semantic-icon-size` | `{size.icon-comfortable}` |
| `--semantic-space-control-x` | `{space.4}` |
| `--semantic-space-control-y` | `{space.3}` |
| `--semantic-space-loose` | `{space.6}` |
| `--semantic-space-normal` | `{space.5}` |
| `--semantic-space-related` | `{space.2}` |
| `--semantic-space-row-x` | `{space.5}` |
| `--semantic-space-row-y` | `{space.3}` |
| `--semantic-space-snug` | `{space.4}` |
| `--semantic-space-tight` | `{space.3}` |

### `density=compact`

Selector `:root[data-density='compact']`, 11 rebound.

| Custom property | Value in this mode |
| --- | --- |
| `--semantic-control-min-size` | `{size.control-min-compact}` |
| `--semantic-icon-size` | `{size.icon-compact}` |
| `--semantic-space-control-x` | `{space.2}` |
| `--semantic-space-control-y` | `{space.1}` |
| `--semantic-space-loose` | `{space.3}` |
| `--semantic-space-normal` | `{space.2}` |
| `--semantic-space-related` | `{space.1}` |
| `--semantic-space-row-x` | `{space.3}` |
| `--semantic-space-row-y` | `{space.1}` |
| `--semantic-space-snug` | `{space.2}` |
| `--semantic-space-tight` | `{space.1}` |

### `theme=dark`

Selector `:root[data-theme='dark']`, 47 rebound.

| Custom property | Value in this mode |
| --- | --- |
| `--semantic-color-accent` | `{color.teal.950}` |
| `--semantic-color-accent-foreground` | `{color.teal.300}` |
| `--semantic-color-accent-hover` | `{color.teal.900}` |
| `--semantic-color-accent-pressed` | `{color.teal.800}` |
| `--semantic-color-background` | `{color.ink.950}` |
| `--semantic-color-border` | `{color.ink.600}` |
| `--semantic-color-card` | `{color.ink.850}` |
| `--semantic-color-card-foreground` | `{color.ink.100}` |
| `--semantic-color-destructive` | `{color.red.300}` |
| `--semantic-color-destructive-foreground` | `{color.ink.950}` |
| `--semantic-color-destructive-hover` | `{color.red.200}` |
| `--semantic-color-disabled` | `{color.ink.750}` |
| `--semantic-color-disabled-foreground` | `{color.ink.400}` |
| `--semantic-color-error` | `{color.red.950}` |
| `--semantic-color-error-foreground` | `{color.red.300}` |
| `--semantic-color-field` | `{color.ink.900}` |
| `--semantic-color-foreground` | `{color.ink.100}` |
| `--semantic-color-info` | `{color.sky.950}` |
| `--semantic-color-info-foreground` | `{color.sky.300}` |
| `--semantic-color-input` | `{color.ink.400}` |
| `--semantic-color-muted` | `{color.ink.1000}` |
| `--semantic-color-muted-foreground` | `{color.ink.300}` |
| `--semantic-color-popover` | `{color.ink.800}` |
| `--semantic-color-popover-foreground` | `{color.ink.100}` |
| `--semantic-color-primary` | `{color.teal.500}` |
| `--semantic-color-primary-foreground` | `{color.ink.950}` |
| `--semantic-color-primary-hover` | `{color.teal.400}` |
| `--semantic-color-primary-pressed` | `{color.teal.300}` |
| `--semantic-color-ring` | `{color.teal.500}` |
| `--semantic-color-secondary` | `{color.ink.900}` |
| `--semantic-color-secondary-foreground` | `{color.ink.100}` |
| `--semantic-color-secondary-hover` | `{color.ink.850}` |
| `--semantic-color-secondary-pressed` | `{color.ink.800}` |
| `--semantic-color-shadow-ambient` | `{color.shadow.ambient-dark}` |
| `--semantic-color-shadow-key` | `{color.shadow.key-dark}` |
| `--semantic-color-sidebar` | `{color.ink.900}` |
| `--semantic-color-sidebar-accent` | `{color.teal.950}` |
| `--semantic-color-sidebar-accent-foreground` | `{color.teal.300}` |
| `--semantic-color-sidebar-border` | `{color.ink.600}` |
| `--semantic-color-sidebar-foreground` | `{color.ink.100}` |
| `--semantic-color-sidebar-ring` | `{color.teal.500}` |
| `--semantic-color-statutory` | `{color.brass.950}` |
| `--semantic-color-statutory-foreground` | `{color.brass.300}` |
| `--semantic-color-success` | `{color.green.950}` |
| `--semantic-color-success-foreground` | `{color.green.300}` |
| `--semantic-color-warning` | `{color.amber.950}` |
| `--semantic-color-warning-foreground` | `{color.amber.300}` |
