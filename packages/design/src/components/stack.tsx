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
const stackVariants = cva('flex', {
  defaultVariants: {
    direction: 'column',
    gap: 'normal',
  },
  variants: {
    direction: {
      column: 'flex-col',
      row: 'flex-row items-center',
    },
    gap: {
      loose: STYLE.space.loose.gap,
      normal: STYLE.space.normal.gap,
      tight: STYLE.space.tight.gap,
    },
  },
})

export function Stack({
  children,
  direction,
  gap,
  ...props
}: NativeProps<'div'> & VariantProps<typeof stackVariants>) {
  return (
    <div className={stackVariants({ direction, gap })} data-slot="stack" {...props}>
      {children}
    </div>
  )
}
