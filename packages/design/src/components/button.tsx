import type { ComponentProps } from 'react'
import { Button as Primitive } from '#components/ui/button'

/**
 * Button — the one control a person presses to make something happen.
 *
 * Adaptee   shadcn `button` (style base-nova, refreshed 2026-09-03) over Base UI Button
 * Intent    ADOPT
 * Owns      variant (primary | outline)
 * Contract  inherited from the adaptee: a real `<button>`, Enter AND Space, focus ring
 *
 * WHAT NORMALIZE DECIDED. Upstream speaks `variant: default | destructive | ghost |
 * link | outline | secondary` and `size: xs | sm | default | lg | icon`. Two screens
 * exist and they need two words: the primary action, and the outlined secondary one
 * the error boundary offers. So the Target owns `variant` with exactly those two
 * values and maps each onto upstream's name (`BUTTON_VARIANT`). `size` is not
 * adopted — nothing asks for it — and `destructive` is not adopted because this
 * system says `tone` for meaning and has not needed a destructive action yet
 * (ADR-031 Decision 4: no speculative axis). Upstream's remaining vocabulary stays
 * behind the boundary; adding a value here is a one-line change and a decision.
 *
 * THE RECIPE IS UPSTREAM'S. The classes live in the vendored file and are its
 * business until a token policy says otherwise; what Xforge owns is the word a
 * screen writes and its translation. That is why section 1 here is a mapping
 * table and not a cva object.
 */

/** Section 1 — the axis Xforge owns, translated to the adaptee's vocabulary. */
export const BUTTON_VARIANT = {
  outline: 'outline',
  primary: 'default',
} as const satisfies Record<string, NonNullable<PrimitiveProps['variant']>>

/** Internal: the adaptee's own props, allowed inside the adapter and never exported. */
type PrimitiveProps = ComponentProps<typeof Primitive>

/** Section 3 — the Target. Xforge vocabulary over the native button's attributes. */
export interface ButtonProps extends ComponentProps<'button'> {
  readonly variant?: keyof typeof BUTTON_VARIANT
}

/** Section 4 — the Adapter. Translation only. */
export function Button({ variant = 'primary', ...props }: ButtonProps) {
  return <Primitive data-variant={variant} variant={BUTTON_VARIANT[variant]} {...props} />
}
