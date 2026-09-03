import type { ComponentProps } from 'react'
import { Button as Primitive } from '#components/ui/button'
import { cn } from '#lib/cn'

/**
 * Button — the one control a person presses to make something happen.
 *
 * Adaptee   shadcn `button` (style base-nova) over Base UI Button
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
 *
 * ONE CLASS IS XFORGE'S, AND IT IS A FLOOR, NOT A STYLE. `h-control` sets
 * `min-block-size` to the control minimum -- the WCAG 2.5.8 target floor the
 * density axis rebinds (40px, 48 comfortable, 32 compact). It was defined in
 * globals.css and consumed by nothing, so Tailwind never emitted it, and
 * upstream's `h-8` held every button at 32px beneath a 40px floor. The
 * design-sync preview found that on 2026-09-03. A button is the one control
 * an Adapter renders directly, so the floor is applied here; a min-height
 * wins over upstream's height without the two classes colliding, and twMerge
 * knows no group for an `@utility`, so neither is dropped.
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

/** Section 4 — the Adapter. Translation, and the control floor. */
export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  return (
    <Primitive
      className={cn('h-control', className)}
      data-variant={variant}
      variant={BUTTON_VARIANT[variant]}
      {...props}
    />
  )
}
