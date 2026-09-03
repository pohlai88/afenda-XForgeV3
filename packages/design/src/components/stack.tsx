import { cva, type VariantProps } from 'class-variance-authority'
import { STYLE } from '#generated/style'
import type { NativeProps } from '#lib/props'

/**
 * Stack — one-dimensional layout, and the only way a screen gets to space things.
 *
 * Adaptee   native `div`
 * Intent    ADOPT
 * Owns      direction (column | row), gap (tight | normal | loose)
 * Contract  inherited from the element; layout carries no semantics
 *
 * GAP IS A ROLE, NEVER A NUMBER. `tight`, `normal` and `loose` are density-bound
 * tokens, so compact rebinds all three at once; a screen writing `gap-tight` would
 * have opted out of that silently. The union is the whole vocabulary, which is
 * what stops a screen inventing a fourth.
 */
/**
 * Section 1 — STYLE SELECTION. The axes Xforge owns, each value a set of symbols.
 *
 * EXPORTED, AND STAMPED, for the reason `ALERT_TONE` and `TEXT_TONE` are: the table IS
 * the contract (ADR-031), and a check that wants to prove every value is rendered
 * somewhere has to be able to read the vocabulary rather than re-type it. Both the
 * gallery's coverage test and the story suite's derive from these; before they were
 * exported, each held its own copy of the three gap names and neither could notice a
 * fourth.
 */
export const STACK_DIRECTION = {
  column: 'flex-col',
  row: 'flex-row items-center',
} as const

export const STACK_GAP = {
  loose: STYLE.space.loose.gap,
  normal: STYLE.space.normal.gap,
  tight: STYLE.space.tight.gap,
} as const

const stackVariants = cva('flex', {
  defaultVariants: {
    direction: 'column',
    gap: 'normal',
  },
  variants: {
    direction: STACK_DIRECTION,
    gap: STACK_GAP,
  },
})

export function Stack({
  children,
  direction = 'column',
  gap = 'normal',
  ...props
}: NativeProps<'div'> & VariantProps<typeof stackVariants>) {
  return (
    <div
      className={stackVariants({ direction, gap })}
      data-direction={direction}
      data-gap={gap}
      data-slot="stack"
      {...props}
    >
      {children}
    </div>
  )
}
