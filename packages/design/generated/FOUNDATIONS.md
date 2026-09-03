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
- 236 custom properties: 120 primitive, 112 semantic, 4 component (ceiling 12).
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
| `--size-text-2xl` | `size.text-2xl` | dimension | `1.875rem` |
| `--size-text-lg` | `size.text-lg` | dimension | `1.25rem` |
| `--size-text-md` | `size.text-md` | dimension | `1rem` |
| `--size-text-sm` | `size.text-sm` | dimension | `0.875rem` |
| `--size-text-xl` | `size.text-xl` | dimension | `1.5rem` |
| `--size-text-xs` | `size.text-xs` | dimension | `0.75rem` |
| `--space-0` | `space.0` | dimension | `0px` |
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
| `--semantic-color-disabled` | `semantic.color.disabled` | color | `{color.neutral.200}` | surface · provides disabled · bg only |
| `--semantic-color-error` | `semantic.color.error` | color | `{color.red.700}` | surface · provides error · bg only |
| `--semantic-color-error-container` | `semantic.color.error-container` | color | `{color.red.100}` | surface · provides error-container · bg only |
| `--semantic-color-error-hover` | `semantic.color.error-hover` | color | `{color.red.800}` | surface · provides error · bg only |
| `--semantic-color-error-pressed` | `semantic.color.error-pressed` | color | `{color.red.950}` | surface · provides error · bg only |
| `--semantic-color-focus` | `semantic.color.focus` | color | `{color.teal.700}` | ui · ≥3:1 against surface, surface-lowest · border, outline, ring only |
| `--semantic-color-info-container` | `semantic.color.info-container` | color | `{color.sky.100}` | surface · provides info-container · bg only |
| `--semantic-color-on-disabled` | `semantic.color.on-disabled` | color | `{color.neutral.500}` | inactive · ≥3:1 against disabled · text only |
| `--semantic-color-on-error` | `semantic.color.on-error` | color | `{color.neutral.0}` | text · ≥4.5:1 against error · text only |
| `--semantic-color-on-error-container` | `semantic.color.on-error-container` | color | `{color.red.700}` | text · ≥4.5:1 against error-container, surface, surface-lowest · text only |
| `--semantic-color-on-info-container` | `semantic.color.on-info-container` | color | `{color.sky.700}` | text · ≥4.5:1 against info-container · text only |
| `--semantic-color-on-primary` | `semantic.color.on-primary` | color | `{color.neutral.0}` | text · ≥4.5:1 against primary · text only |
| `--semantic-color-on-primary-container` | `semantic.color.on-primary-container` | color | `{color.teal.800}` | text · ≥4.5:1 against primary-container · text only |
| `--semantic-color-on-statutory-container` | `semantic.color.on-statutory-container` | color | `{color.brass.700}` | text · ≥4.5:1 against statutory-container · text only |
| `--semantic-color-on-success-container` | `semantic.color.on-success-container` | color | `{color.green.700}` | text · ≥4.5:1 against success-container, surface, surface-lowest · text only |
| `--semantic-color-on-surface` | `semantic.color.on-surface` | color | `{color.neutral.900}` | text · ≥4.5:1 against surface, surface-lowest, surface-container, error-container, info-container, success-container, warning-container, statutory-container · text only |
| `--semantic-color-on-surface-variant` | `semantic.color.on-surface-variant` | color | `{color.neutral.600}` | text · ≥4.5:1 against surface, surface-lowest, surface-container · text only |
| `--semantic-color-on-warning-container` | `semantic.color.on-warning-container` | color | `{color.amber.800}` | text · ≥4.5:1 against warning-container · text only |
| `--semantic-color-outline` | `semantic.color.outline` | color | `{color.neutral.500}` | ui · ≥3:1 against surface, surface-lowest · border, outline, ring only |
| `--semantic-color-outline-variant` | `semantic.color.outline-variant` | color | `{color.neutral.300}` | decorative · exempt, a divider or a card edge, never a sole control boundary · border only |
| `--semantic-color-primary` | `semantic.color.primary` | color | `{color.teal.700}` | surface · provides primary · bg only |
| `--semantic-color-primary-container` | `semantic.color.primary-container` | color | `{color.teal.100}` | surface · provides primary-container · bg only |
| `--semantic-color-primary-container-hover` | `semantic.color.primary-container-hover` | color | `{color.teal.200}` | surface · provides primary-container · bg only |
| `--semantic-color-primary-container-pressed` | `semantic.color.primary-container-pressed` | color | `{color.teal.300}` | surface · provides primary-container · bg only |
| `--semantic-color-primary-hover` | `semantic.color.primary-hover` | color | `{color.teal.800}` | surface · provides primary · bg only |
| `--semantic-color-primary-pressed` | `semantic.color.primary-pressed` | color | `{color.teal.950}` | surface · provides primary · bg only |
| `--semantic-color-scrim` | `semantic.color.scrim` | color | `{color.scrim}` | compositing · exempt, an alpha layer, not a foreground pair · no utility |
| `--semantic-color-shadow-ambient` | `semantic.color.shadow-ambient` | color | `{color.shadow.ambient}` | compositing · exempt, the wide, faint layer of a shadow; composited, not a pair · no utility |
| `--semantic-color-shadow-key` | `semantic.color.shadow-key` | color | `{color.shadow.key}` | compositing · exempt, the tight, nearer layer of a shadow; composited, not a pair · no utility |
| `--semantic-color-statutory-container` | `semantic.color.statutory-container` | color | `{color.brass.100}` | surface · provides statutory-container · bg only |
| `--semantic-color-success-container` | `semantic.color.success-container` | color | `{color.green.100}` | surface · provides success-container · bg only |
| `--semantic-color-surface` | `semantic.color.surface` | color | `{color.neutral.50}` | surface · provides surface · bg only |
| `--semantic-color-surface-container` | `semantic.color.surface-container` | color | `{color.neutral.100}` | surface · provides surface-container · bg only |
| `--semantic-color-surface-lowest` | `semantic.color.surface-lowest` | color | `{color.neutral.0}` | surface · provides surface-lowest · bg only |
| `--semantic-color-surface-lowest-hover` | `semantic.color.surface-lowest-hover` | color | `{color.neutral.50}` | surface · provides surface-lowest · bg only |
| `--semantic-color-surface-lowest-pressed` | `semantic.color.surface-lowest-pressed` | color | `{color.neutral.100}` | surface · provides surface-lowest · bg only |
| `--semantic-color-warning-container` | `semantic.color.warning-container` | color | `{color.amber.100}` | surface · provides warning-container · bg only |
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
| `--semantic-leading-body-compact` | `semantic.leading.body-compact` | number | `{leading.normal}` | type body-compact · leading ≥1.4 |
| `--semantic-leading-caption` | `semantic.leading.caption` | number | `{leading.tight}` | type caption · leading ≥1.33 |
| `--semantic-leading-display` | `semantic.leading.display` | number | `{leading.tight}` | type display · leading ≥1.15 |
| `--semantic-leading-heading` | `semantic.leading.heading` | number | `{leading.snug}` | type heading · leading ≥1.15 |
| `--semantic-leading-label` | `semantic.leading.label` | number | `{leading.normal}` | type label · leading ≥1.4 |
| `--semantic-leading-subheading` | `semantic.leading.subheading` | number | `{leading.loose}` | type subheading · leading ≥1.5 |
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
| `--semantic-space-none` | `semantic.space.none` | dimension | `{space.0}` | -- |
| `--semantic-space-normal` | `semantic.space.normal` | dimension | `{space.4}` | -- |
| `--semantic-space-related` | `semantic.space.related` | dimension | `{space.1}` | -- |
| `--semantic-space-row-x` | `semantic.space.row-x` | dimension | `{space.4}` | -- |
| `--semantic-space-row-y` | `semantic.space.row-y` | dimension | `{space.3}` | -- |
| `--semantic-space-section` | `semantic.space.section` | dimension | `{space.6}` | -- |
| `--semantic-space-snug` | `semantic.space.snug` | dimension | `{space.3}` | -- |
| `--semantic-space-tight` | `semantic.space.tight` | dimension | `{space.2}` | -- |
| `--semantic-target-minimum` | `semantic.target.minimum` | dimension | `{size.target-min}` | -- |
| `--semantic-tracking-body` | `semantic.tracking.body` | dimension | `{tracking.normal}` | -- |
| `--semantic-type-body` | `semantic.type.body` | dimension | `{size.text-md}` | type body · ≥14px at a 16px root |
| `--semantic-type-body-compact` | `semantic.type.body-compact` | dimension | `{size.text-sm}` | type body-compact · ≥14px at a 16px root |
| `--semantic-type-caption` | `semantic.type.caption` | dimension | `{size.text-xs}` | type caption · ≥12px at a 16px root |
| `--semantic-type-display` | `semantic.type.display` | dimension | `{size.text-2xl}` | type display · ≥24px at a 16px root |
| `--semantic-type-emphasis` | `semantic.type.emphasis` | dimension | `{size.text-md}` | type emphasis · ≥14px at a 16px root |
| `--semantic-type-heading` | `semantic.type.heading` | dimension | `{size.text-lg}` | type heading · ≥16px at a 16px root |
| `--semantic-type-label` | `semantic.type.label` | dimension | `{size.text-sm}` | type label · ≥12px at a 16px root |
| `--semantic-type-subheading` | `semantic.type.subheading` | dimension | `{size.text-md}` | type subheading · ≥14px at a 16px root |
| `--semantic-type-title` | `semantic.type.title` | dimension | `{size.text-xl}` | type title · ≥18px at a 16px root |
| `--semantic-weight-body` | `semantic.weight.body` | fontWeight | `{weight.normal}` | -- |
| `--semantic-weight-body-compact` | `semantic.weight.body-compact` | fontWeight | `{weight.normal}` | -- |
| `--semantic-weight-caption` | `semantic.weight.caption` | fontWeight | `{weight.normal}` | -- |
| `--semantic-weight-emphasis` | `semantic.weight.emphasis` | fontWeight | `{weight.medium}` | -- |
| `--semantic-weight-heading` | `semantic.weight.heading` | fontWeight | `{weight.semibold}` | -- |
| `--semantic-weight-label` | `semantic.weight.label` | fontWeight | `{weight.medium}` | -- |

## Component

| Custom property | Token | Type | Value |
| --- | --- | --- | --- |
| `--component-switch-inset` | `component.switch.inset` | dimension | `{semantic.size.ring-offset}` |
| `--component-switch-thumb` | `component.switch.thumb` | dimension | `{semantic.icon.size}` |
| `--component-switch-track-height` | `component.switch.track-height` | dimension | `{semantic.target.minimum}` |
| `--component-switch-track-width` | `component.switch.track-width` | dimension | `{semantic.control.min-size}` |

## Colour rules

The colour roots follow the grammar of Material 3's colour roles
(m3.material.io/styles/color/roles, read 2026-09-04; evidence register E37):

- **surface** is a background; **surface-lowest** and **surface-container** are its rungs
  above the page, white and a tint in light, ink.850 and ink.750 in dark.
- **on-`<fill>`** is the one ink paired with that fill. `on-surface` and `on-surface-variant`
  are roots of their own because they sit on every surface rung.
- **`<accent>`-container** is the low-emphasis tint of an accent, for fills that carry text and
  icons; **`<status>`-container** follows the same shape for info, success, warning, statutory.
- **outline** is a boundary that must be seen (3:1); **outline-variant** is a divider or a card
  edge, decorative, and the edge of a target only where what is inside carries the contrast.
- **Hover and pressed are fills**, not state layers: a composite is a pair the token graph
  cannot measure.

**The pairing law.** An ink may sit only on the fills declared for it, and every declared pair
clears its floor in both themes -- 4.5:1 for text, 3:1 for boundaries and the disabled pair.
The table below is computed from the token file; `color-pairs.test.ts` refuses a pair under
its floor and the generator refuses a root placed against no Material 3 role.

### Material 3 roles, placed

| M3 role | Ours | Verdict |
| --- | --- | --- |
| `error` | `error` | carried |
| `error-container` | `error-container` | carried |
| `inverse-on-surface` | -- | no inverse surface exists here, so there is no ink to pair with it |
| `inverse-primary` | -- | no inverse surface exists here for an inverse action to sit on |
| `inverse-surface` | -- | the inverse roles exist for snackbars; there is no Toast (project-state records why) |
| `on-error` | `on-error` | carried |
| `on-error-container` | `on-error-container` | carried |
| `on-primary` | `on-primary` | carried |
| `on-primary-container` | `on-primary-container` | carried |
| `on-primary-fixed` | -- | no fixed primary exists here, so there is no ink to pair with it |
| `on-primary-fixed-variant` | -- | no fixed primary exists here, so there is no lower-emphasis ink for it either |
| `on-secondary` | -- | no secondary accent exists here, so there is no ink to pair with it |
| `on-secondary-container` | -- | no secondary container exists here, so there is no ink to pair with it |
| `on-secondary-fixed` | -- | no fixed secondary exists here, so there is no ink to pair with it |
| `on-secondary-fixed-variant` | -- | no fixed secondary exists here, so there is no lower-emphasis ink for it either |
| `on-surface` | `on-surface` | carried |
| `on-surface-variant` | `on-surface-variant` | carried |
| `on-tertiary` | -- | no tertiary accent exists here, so there is no ink to pair with it |
| `on-tertiary-container` | -- | no tertiary container exists here, so there is no ink to pair with it |
| `on-tertiary-fixed` | -- | no fixed tertiary exists here, so there is no ink to pair with it |
| `on-tertiary-fixed-variant` | -- | no fixed tertiary exists here, so there is no lower-emphasis ink for it either |
| `outline` | `outline` | carried |
| `outline-variant` | `outline-variant` | carried |
| `primary` | `primary` | carried |
| `primary-container` | `primary-container` | carried |
| `primary-fixed` | -- | M3: 'if you aren't sure whether your product should use the add-on roles, it probably shouldn't' |
| `primary-fixed-dim` | -- | a fixed accent that ignores the theme; M3 warns it is likely to break contrast, and nothing has asked |
| `scrim` | `scrim` | carried |
| `secondary` | -- | a lower-emphasis accent has no consumer; our former `secondary` was a neutral fill and is `surface-lowest` now |
| `secondary-container` | -- | the tonal-button fill; the day a tonal button arrives it is this role, not a reuse of primary-container |
| `secondary-fixed` | -- | as primary-fixed, and there is no secondary accent |
| `secondary-fixed-dim` | -- | a fixed accent that ignores the theme, of an accent that does not exist here |
| `shadow` | `shadow-ambient`, `shadow-key` | carried |
| `surface` | `surface` | carried |
| `surface-bright` | -- | an add-on surface that keeps its brightness across themes; nothing here has asked for one |
| `surface-container` | `surface-container` | carried |
| `surface-container-high` | -- | three rungs carry two screens; the ladder grows when nesting asks |
| `surface-container-highest` | -- | three rungs carry two screens; the ladder grows when nesting asks |
| `surface-container-low` | -- | three rungs carry two screens; the ladder grows when nesting asks, one rung at a time |
| `surface-container-lowest` | `surface-lowest` | carried |
| `surface-dim` | -- | keeps relative brightness across themes; M3: 'most products won't need' the add-ons, and nothing here has asked |
| `tertiary` | -- | M3: 'at the designer's discretion'; nothing here has asked for a third accent |
| `tertiary-container` | -- | no tertiary accent exists here, so no container tint of it either |
| `tertiary-fixed` | -- | as primary-fixed, and there is no tertiary accent |
| `tertiary-fixed-dim` | -- | a fixed accent that ignores the theme, of an accent that does not exist here |

### Roots with no Material 3 role

| Root | Why it exists |
| --- | --- |
| `disabled` | M3 draws disabled as on-surface at 38% over a 12% container; ours are explicit fills so the pair can be measured (3.2:1, held to 3:1) |
| `focus` | M3 has no focus role -- its indicators borrow the accent colours; ours is the one focus ring, defined once |
| `info-container` | M3's custom-colour pattern: a status container with its on-colour and no high-emphasis fill, because nothing has asked for one |
| `on-disabled` | the ink of the explicit disabled fill; see disabled |
| `statutory-container` | a custom status container: EPF, SOCSO, EIS and PCB are law, not advice, and do not borrow info |
| `success-container` | a custom status container; see info-container |
| `warning-container` | a custom status container; see info-container |

### Declared pairs

| Ink | Fill | Floor | Light | Dark |
| --- | --- | --- | --- | --- |
| `focus` | `surface` | 3:1 | 6.43:1 | 6.17:1 |
| `focus` | `surface-lowest` | 3:1 | 7.03:1 | 5.58:1 |
| `on-disabled` | `disabled` | 3:1 | 3.19:1 | 3.22:1 |
| `on-error` | `error` | 4.5:1 | 8.01:1 | 7.88:1 |
| `on-error` | `error-hover` | 4.5:1 | 10.58:1 | 9.67:1 |
| `on-error` | `error-pressed` | 4.5:1 | 18.55:1 | 15.12:1 |
| `on-error-container` | `error-container` | 4.5:1 | 6.13:1 | 7.39:1 |
| `on-error-container` | `surface` | 4.5:1 | 7.33:1 | 7.88:1 |
| `on-error-container` | `surface-lowest` | 4.5:1 | 8.01:1 | 7.13:1 |
| `on-info-container` | `info-container` | 4.5:1 | 7.33:1 | 8.63:1 |
| `on-primary` | `primary` | 4.5:1 | 7.03:1 | 6.17:1 |
| `on-primary` | `primary-hover` | 4.5:1 | 9.76:1 | 8.08:1 |
| `on-primary` | `primary-pressed` | 4.5:1 | 16.04:1 | 9.80:1 |
| `on-primary-container` | `primary-container` | 4.5:1 | 7.96:1 | 7.95:1 |
| `on-primary-container` | `primary-container-hover` | 4.5:1 | 7.02:1 | 6.13:1 |
| `on-primary-container` | `primary-container-pressed` | 4.5:1 | 4.84:1 | 4.84:1 |
| `on-statutory-container` | `statutory-container` | 4.5:1 | 5.77:1 | 8.96:1 |
| `on-success-container` | `success-container` | 4.5:1 | 5.71:1 | 9.26:1 |
| `on-success-container` | `surface` | 4.5:1 | 6.79:1 | 10.27:1 |
| `on-success-container` | `surface-lowest` | 4.5:1 | 7.42:1 | 9.30:1 |
| `on-surface` | `surface` | 4.5:1 | 11.83:1 | 16.21:1 |
| `on-surface` | `surface-lowest` | 4.5:1 | 12.94:1 | 14.67:1 |
| `on-surface` | `surface-lowest-hover` | 4.5:1 | 11.83:1 | 14.67:1 |
| `on-surface` | `surface-lowest-pressed` | 4.5:1 | 10.37:1 | 13.93:1 |
| `on-surface` | `surface-container` | 4.5:1 | 10.37:1 | 12.35:1 |
| `on-surface` | `error-container` | 4.5:1 | 9.89:1 | 15.20:1 |
| `on-surface` | `info-container` | 4.5:1 | 9.90:1 | 13.37:1 |
| `on-surface` | `success-container` | 4.5:1 | 9.95:1 | 14.61:1 |
| `on-surface` | `warning-container` | 4.5:1 | 9.94:1 | 14.77:1 |
| `on-surface` | `statutory-container` | 4.5:1 | 10.27:1 | 15.31:1 |
| `on-surface-variant` | `surface` | 4.5:1 | 5.15:1 | 6.19:1 |
| `on-surface-variant` | `surface-lowest` | 4.5:1 | 5.63:1 | 5.60:1 |
| `on-surface-variant` | `surface-container` | 4.5:1 | 4.52:1 | 4.72:1 |
| `on-warning-container` | `warning-container` | 4.5:1 | 5.48:1 | 9.50:1 |
| `outline` | `surface` | 3:1 | 3.96:1 | 4.22:1 |
| `outline` | `surface-lowest` | 3:1 | 4.33:1 | 3.82:1 |

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

Selector `:root[data-theme='dark']`, 36 rebound.

| Custom property | Value in this mode |
| --- | --- |
| `--semantic-color-disabled` | `{color.ink.750}` |
| `--semantic-color-error` | `{color.red.300}` |
| `--semantic-color-error-container` | `{color.red.950}` |
| `--semantic-color-error-hover` | `{color.red.200}` |
| `--semantic-color-error-pressed` | `{color.red.100}` |
| `--semantic-color-focus` | `{color.teal.500}` |
| `--semantic-color-info-container` | `{color.sky.950}` |
| `--semantic-color-on-disabled` | `{color.ink.400}` |
| `--semantic-color-on-error` | `{color.ink.950}` |
| `--semantic-color-on-error-container` | `{color.red.300}` |
| `--semantic-color-on-info-container` | `{color.sky.300}` |
| `--semantic-color-on-primary` | `{color.ink.950}` |
| `--semantic-color-on-primary-container` | `{color.teal.300}` |
| `--semantic-color-on-statutory-container` | `{color.brass.300}` |
| `--semantic-color-on-success-container` | `{color.green.300}` |
| `--semantic-color-on-surface` | `{color.ink.100}` |
| `--semantic-color-on-surface-variant` | `{color.ink.300}` |
| `--semantic-color-on-warning-container` | `{color.amber.300}` |
| `--semantic-color-outline` | `{color.ink.400}` |
| `--semantic-color-outline-variant` | `{color.ink.600}` |
| `--semantic-color-primary` | `{color.teal.500}` |
| `--semantic-color-primary-container` | `{color.teal.950}` |
| `--semantic-color-primary-container-hover` | `{color.teal.900}` |
| `--semantic-color-primary-container-pressed` | `{color.teal.800}` |
| `--semantic-color-primary-hover` | `{color.teal.400}` |
| `--semantic-color-primary-pressed` | `{color.teal.300}` |
| `--semantic-color-shadow-ambient` | `{color.shadow.ambient-dark}` |
| `--semantic-color-shadow-key` | `{color.shadow.key-dark}` |
| `--semantic-color-statutory-container` | `{color.brass.950}` |
| `--semantic-color-success-container` | `{color.green.950}` |
| `--semantic-color-surface` | `{color.ink.950}` |
| `--semantic-color-surface-container` | `{color.ink.750}` |
| `--semantic-color-surface-lowest` | `{color.ink.850}` |
| `--semantic-color-surface-lowest-hover` | `{color.ink.850}` |
| `--semantic-color-surface-lowest-pressed` | `{color.ink.800}` |
| `--semantic-color-warning-container` | `{color.amber.950}` |
