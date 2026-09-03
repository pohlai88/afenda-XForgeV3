/*
 * GENERATED FROM packages/design/policy -- DO NOT EDIT. Run `pnpm gen:tokens`.
 *
 * The style contract (ADR-034 Decision 4). A recipe selects a symbol; the class it
 * resolves to names a role the kernel declared and the bridge emits. The word is
 * Xforge's (`action.danger`); the class is the role's (`bg-destructive`); STYLE_NAMES in
 * policy/foundations/style.mjs is where the two meet. Interaction companions carry their
 * variant (`hover:`, `active:`) so that which selector means pressed is a fact of the
 * language, decided once.
 *
 * 153 symbols. Roles without one, and why:
 *   semantic.color.scrim -- compositing: declares no CSS channel until an overlay Adapter needs one
 *   semantic.color.shadow-ambient -- consumed by the elevation tokens through var(), never a class
 *   semantic.color.shadow-key -- consumed by the elevation tokens through var(), never a class
 *   semantic.layer.transient -- no utility emits it; nothing stacks at this level yet
 *   semantic.motion.duration.none -- the reduced-motion answer, applied by the stylesheet
 *   semantic.motion.duration.pulse -- a looping duration drives a keyframe, not a transition
 */
export const STYLE = {
  accent: {
    primary: {
      background: 'bg-primary',
      border: 'border-primary',
      foreground: 'text-on-primary',
      hover: 'hover:bg-primary-hover',
      hoverForeground: 'hover:text-on-primary',
      outline: 'outline-primary',
      pressed: 'active:bg-primary-pressed',
    },
    primaryContainer: {
      background: 'bg-primary-container',
      foreground: 'text-on-primary-container',
      hover: 'hover:bg-primary-container-hover',
      hoverForeground: 'hover:text-on-primary-container',
      pressed: 'active:bg-primary-container-pressed',
    },
  },
  component: {
    switch: {
      inset: 'p-switch-inset',
      thumb: 'size-switch-thumb',
      trackHeight: 'h-switch-track-height',
      trackWidth: 'w-switch-track-width',
    },
  },
  easing: {
    entrance: 'ease-entrance',
    exit: 'ease-exit',
    standard: 'ease-standard',
  },
  elevation: {
    above: 'shadow-floating',
    base: 'shadow-flat',
    panel: 'shadow-flat',
  },
  error: {
    container: {
      background: 'bg-error-container',
      foreground: 'text-on-error-container',
    },
    default: {
      background: 'bg-error',
      border: 'border-error',
      foreground: 'text-on-error',
      hover: 'hover:bg-error-hover',
      hoverForeground: 'hover:text-on-error',
      outline: 'outline-error',
      pressed: 'active:bg-error-pressed',
    },
  },
  family: {
    mono: 'font-mono',
    sans: 'font-sans',
  },
  field: {
    placeholder: 'placeholder:text-on-surface-variant',
  },
  focus: {
    ring: 'focus-visible:focus-ring',
  },
  ink: {
    onSurface: {
      text: 'text-on-surface',
    },
    onSurfaceVariant: {
      text: 'text-on-surface-variant',
    },
  },
  interaction: {
    checked: {
      background: 'data-checked:not-data-disabled:bg-primary',
      border: 'data-checked:not-data-disabled:border-primary',
      foreground: 'data-checked:not-data-disabled:text-on-primary',
      outline: 'data-checked:not-data-disabled:outline-primary',
    },
    disabled: {
      background: 'data-disabled:bg-disabled',
      foreground: 'data-disabled:text-on-disabled',
    },
    highlighted: {
      background: 'data-highlighted:not-data-disabled:bg-primary-container',
      foreground: 'data-highlighted:not-data-disabled:text-on-primary-container',
    },
    unchecked: {
      background: 'data-unchecked:not-data-disabled:bg-surface-lowest',
    },
  },
  layer: {
    local: 'layer-local',
    overlay: 'layer-overlay',
  },
  motion: {
    base: 'duration-base',
    overlay: 'duration-overlay',
    press: 'duration-press',
    state: 'duration-state',
  },
  outline: {
    default: {
      border: 'border-outline',
      outline: 'outline-outline',
      ring: 'ring-outline',
    },
    focus: {
      border: 'border-focus',
      outline: 'outline-focus',
      ring: 'ring-focus',
    },
    variant: {
      border: 'border-outline-variant',
    },
  },
  shape: {
    container: 'rounded-container',
    control: 'rounded-control',
    overlay: 'rounded-overlay',
    precise: 'rounded-precise',
  },
  shell: {
    columns: 'grid-shell',
    header: 'shell-header',
    nav: 'shell-nav',
  },
  size: {
    control: 'h-control',
    icon: 'size-icon',
  },
  space: {
    container: {
      gap: 'gap-container',
      margin: 'm-container',
      padding: 'p-container',
      paddingX: 'px-container',
      paddingY: 'py-container',
    },
    controlX: {
      gap: 'gap-control-x',
      margin: 'm-control-x',
      padding: 'p-control-x',
      paddingX: 'px-control-x',
      paddingY: 'py-control-x',
    },
    controlY: {
      gap: 'gap-control-y',
      margin: 'm-control-y',
      padding: 'p-control-y',
      paddingX: 'px-control-y',
      paddingY: 'py-control-y',
    },
    loose: {
      gap: 'gap-loose',
      margin: 'm-loose',
      padding: 'p-loose',
      paddingX: 'px-loose',
      paddingY: 'py-loose',
    },
    none: {
      gap: 'gap-none',
      margin: 'm-none',
      padding: 'p-none',
      paddingX: 'px-none',
      paddingY: 'py-none',
    },
    normal: {
      gap: 'gap-normal',
      margin: 'm-normal',
      padding: 'p-normal',
      paddingX: 'px-normal',
      paddingY: 'py-normal',
    },
    related: {
      gap: 'gap-related',
      margin: 'm-related',
      padding: 'p-related',
      paddingX: 'px-related',
      paddingY: 'py-related',
    },
    rowX: {
      gap: 'gap-row-x',
      margin: 'm-row-x',
      padding: 'p-row-x',
      paddingX: 'px-row-x',
      paddingY: 'py-row-x',
    },
    rowY: {
      gap: 'gap-row-y',
      margin: 'm-row-y',
      padding: 'p-row-y',
      paddingX: 'px-row-y',
      paddingY: 'py-row-y',
    },
    section: {
      gap: 'gap-section',
      margin: 'm-section',
      padding: 'p-section',
      paddingX: 'px-section',
      paddingY: 'py-section',
    },
    snug: {
      gap: 'gap-snug',
      margin: 'm-snug',
      padding: 'p-snug',
      paddingX: 'px-snug',
      paddingY: 'py-snug',
    },
    tight: {
      gap: 'gap-tight',
      margin: 'm-tight',
      padding: 'p-tight',
      paddingX: 'px-tight',
      paddingY: 'py-tight',
    },
  },
  state: {
    disabled: {
      background: 'disabled:bg-disabled',
      foreground: 'disabled:text-on-disabled',
    },
  },
  status: {
    info: {
      background: 'bg-info-container',
      foreground: 'text-on-info-container',
    },
    statutory: {
      background: 'bg-statutory-container',
      foreground: 'text-on-statutory-container',
    },
    success: {
      background: 'bg-success-container',
      foreground: 'text-on-success-container',
    },
    warning: {
      background: 'bg-warning-container',
      foreground: 'text-on-warning-container',
    },
  },
  stroke: {
    width: 'border-stroke',
  },
  surface: {
    container: {
      background: 'bg-surface-container',
    },
    default: {
      background: 'bg-surface',
    },
    lowest: {
      background: 'bg-surface-lowest',
      hover: 'hover:bg-surface-lowest-hover',
      pressed: 'active:bg-surface-lowest-pressed',
    },
  },
  typography: {
    body: 'font-body text-body tracking-body',
    bodyCompact: 'font-body-compact text-body-compact tracking-body-compact',
    caption: 'font-caption text-caption tracking-caption',
    display: 'font-heading text-display tracking-display',
    emphasis: 'font-emphasis text-emphasis tracking-emphasis',
    heading: 'font-heading text-heading tracking-heading',
    label: 'font-label text-label tracking-label',
    subheading: 'font-heading text-subheading tracking-subheading',
    title: 'font-heading text-title tracking-title',
  },
} as const
