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
 * 124 symbols. Roles without one, and why:
 *   semantic.color.scrim -- compositing: declares no CSS channel until an overlay Adapter needs one
 *   semantic.color.shadow-ambient -- consumed by the elevation tokens through var(), never a class
 *   semantic.color.shadow-key -- consumed by the elevation tokens through var(), never a class
 *   semantic.layer.transient -- no utility emits it; nothing stacks at this level yet
 *   semantic.motion.duration.none -- the reduced-motion answer, applied by the stylesheet
 *   semantic.motion.duration.pulse -- a looping duration drives a keyframe, not a transition
 */
export const STYLE = {
  action: {
    accent: {
      background: 'bg-accent',
      foreground: 'text-accent-foreground',
      hover: 'hover:bg-accent-hover',
      pressed: 'active:bg-accent-pressed',
    },
    danger: {
      background: 'bg-destructive',
      foreground: 'text-destructive-foreground',
      hover: 'hover:bg-destructive-hover',
      pressed: 'active:bg-destructive-pressed',
    },
    primary: {
      background: 'bg-primary',
      foreground: 'text-primary-foreground',
      hover: 'hover:bg-primary-hover',
      pressed: 'active:bg-primary-pressed',
    },
    secondary: {
      background: 'bg-secondary',
      foreground: 'text-secondary-foreground',
      hover: 'hover:bg-secondary-hover',
      pressed: 'active:bg-secondary-pressed',
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
  focus: {
    ring: 'focus-visible:focus-ring',
  },
  ink: {
    default: {
      text: 'text-foreground',
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
  shape: {
    container: 'rounded-container',
    control: 'rounded-control',
    overlay: 'rounded-overlay',
    precise: 'rounded-precise',
  },
  size: {
    control: 'h-control',
    icon: 'size-icon',
  },
  space: {
    container: {
      gap: 'gap-container',
      padding: 'p-container',
      paddingX: 'px-container',
      paddingY: 'py-container',
    },
    controlX: {
      gap: 'gap-control-x',
      padding: 'p-control-x',
      paddingX: 'px-control-x',
      paddingY: 'py-control-x',
    },
    controlY: {
      gap: 'gap-control-y',
      padding: 'p-control-y',
      paddingX: 'px-control-y',
      paddingY: 'py-control-y',
    },
    loose: {
      gap: 'gap-loose',
      padding: 'p-loose',
      paddingX: 'px-loose',
      paddingY: 'py-loose',
    },
    normal: {
      gap: 'gap-normal',
      padding: 'p-normal',
      paddingX: 'px-normal',
      paddingY: 'py-normal',
    },
    related: {
      gap: 'gap-related',
      padding: 'p-related',
      paddingX: 'px-related',
      paddingY: 'py-related',
    },
    rowX: {
      gap: 'gap-row-x',
      padding: 'p-row-x',
      paddingX: 'px-row-x',
      paddingY: 'py-row-x',
    },
    rowY: {
      gap: 'gap-row-y',
      padding: 'p-row-y',
      paddingX: 'px-row-y',
      paddingY: 'py-row-y',
    },
    section: {
      gap: 'gap-section',
      padding: 'p-section',
      paddingX: 'px-section',
      paddingY: 'py-section',
    },
    snug: {
      gap: 'gap-snug',
      padding: 'p-snug',
      paddingX: 'px-snug',
      paddingY: 'py-snug',
    },
    tight: {
      gap: 'gap-tight',
      padding: 'p-tight',
      paddingX: 'px-tight',
      paddingY: 'py-tight',
    },
  },
  state: {
    disabled: {
      background: 'bg-disabled',
      foreground: 'text-disabled-foreground',
    },
  },
  status: {
    danger: {
      background: 'bg-error',
      foreground: 'text-error-foreground',
    },
    info: {
      background: 'bg-info',
      foreground: 'text-info-foreground',
    },
    statutory: {
      background: 'bg-statutory',
      foreground: 'text-statutory-foreground',
    },
    success: {
      background: 'bg-success',
      foreground: 'text-success-foreground',
    },
    warning: {
      background: 'bg-warning',
      foreground: 'text-warning-foreground',
    },
  },
  stroke: {
    border: {
      border: 'border-border',
    },
    field: {
      border: 'border-input',
      outline: 'outline-input',
      ring: 'ring-input',
    },
    focus: {
      border: 'border-ring',
      outline: 'outline-ring',
      ring: 'ring-ring',
    },
    rail: {
      border: 'border-sidebar-border',
    },
    railFocus: {
      border: 'border-sidebar-ring',
      outline: 'outline-sidebar-ring',
      ring: 'ring-sidebar-ring',
    },
    width: 'border-stroke',
  },
  surface: {
    card: {
      background: 'bg-card',
      foreground: 'text-card-foreground',
    },
    field: {
      background: 'bg-field',
    },
    muted: {
      background: 'bg-muted',
      foreground: 'text-muted-foreground',
    },
    page: {
      background: 'bg-background',
    },
    popover: {
      background: 'bg-popover',
      foreground: 'text-popover-foreground',
    },
    rail: {
      background: 'bg-sidebar',
      foreground: 'text-sidebar-foreground',
    },
    railAccent: {
      background: 'bg-sidebar-accent',
      foreground: 'text-sidebar-accent-foreground',
    },
  },
  typography: {
    body: 'font-body text-body tracking-body',
    bodyCompact: 'font-body-compact text-body-compact',
    caption: 'font-caption text-caption',
    display: 'font-heading text-display',
    emphasis: 'font-emphasis text-emphasis',
    heading: 'font-heading text-heading',
    label: 'font-label text-label',
    title: 'font-heading text-title',
  },
} as const
