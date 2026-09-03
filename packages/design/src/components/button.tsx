import { Button as Primitive } from '@base-ui/react/button'
import { cva } from 'class-variance-authority'
import { STYLE } from '#generated/style'
import type { NativeProps } from '#lib/props'

/**
 * Button — the one control a person presses to make something happen.
 *
 * Adaptee   Base UI Button (`@base-ui/react/button`), directly
 * Intent    ADOPT
 * Owns      variant (primary | outline), and the whole recipe
 * Contract  inherited from the adaptee: a real `<button>`, Enter AND Space, disabled state
 *
 * THE RECIPE IS XFORGE'S NOW (ADR-031 Decision 12; ADR-034 step 8). Until 2026-09-03 this
 * file wrapped the vendored shadcn `button.tsx` and let upstream decide what `variant`
 * looked like -- its own header said "until a token policy says otherwise". ADR-034 is that
 * policy. The Adapter now sits on Base UI's Button, which owns the behaviour (a real
 * button element, keyboard activation, the disabled state), and every class it renders is
 * a STYLE symbol the kernel projects. The vendored file is no longer imported by anything.
 *
 * WHAT NORMALIZE DECIDED, upstream word by upstream word. `h-8` -> the control floor
 * (`size.control`, 40px, density-bound). `px-2.5` / `gap-1.5` -> `space.controlX` and
 * `space.tight`. `rounded-lg` -> `shape.control`. `text-sm font-medium` -> the `label`
 * type role. `focus-visible:ring-3 ring-ring/50` -> the system's one focus ring. `border
 * border-transparent` stays as geometry so the outline variant does not shift a pixel.
 * `disabled:opacity-50` -> the declared disabled role, not a fade. `transition-all` ->
 * colour only, at the press duration. Upstream's `default` is `primary`; its `outline`
 * hover (`bg-muted`) is expressed through the neutral ACTION fill, `secondary`, which has
 * the hover and pressed companions a pressable surface needs and `muted` does not.
 * `size`, `ghost`, `link`, `secondary`, `destructive` and the icon sizes are not adopted --
 * nothing asks for them (Decision 4). The 1px press nudge is dropped: the pressed colour
 * carries the state, and a hand-typed length has no role.
 */

/** Section 1 — STYLE SELECTION. The axis Xforge owns, each value a set of symbols. */
export const BUTTON_VARIANT = {
  outline: [
    STYLE.stroke.border.border,
    STYLE.surface.page.background,
    STYLE.ink.default.text,
    STYLE.action.secondary.hover,
    STYLE.action.secondary.hoverForeground,
    STYLE.action.secondary.pressed,
  ].join(' '),
  primary: [
    STYLE.action.primary.background,
    STYLE.action.primary.foreground,
    STYLE.action.primary.hover,
    STYLE.action.primary.pressed,
  ].join(' '),
} as const

const buttonRecipe = cva(
  [
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap',
    'border-transparent outline-none transition-colors disabled:cursor-not-allowed',
    STYLE.size.control,
    STYLE.space.controlX.paddingX,
    STYLE.space.tight.gap,
    STYLE.shape.control,
    STYLE.stroke.width,
    STYLE.typography.label,
    STYLE.focus.ring,
    STYLE.motion.press,
    STYLE.state.disabled.background,
    STYLE.state.disabled.foreground,
  ].join(' '),
  {
    defaultVariants: { variant: 'primary' },
    variants: { variant: BUTTON_VARIANT },
  },
)

/** Section 3 — the Target. Xforge vocabulary over the native button's attributes. */
export interface ButtonProps extends NativeProps<'button'> {
  readonly variant?: keyof typeof BUTTON_VARIANT
}

/** Section 4 — the Adapter. Behaviour from Base UI; every class a symbol. */
export function Button({ variant = 'primary', ...props }: ButtonProps) {
  return (
    <Primitive
      className={buttonRecipe({ variant })}
      data-slot="button"
      data-variant={variant}
      {...props}
    />
  )
}
