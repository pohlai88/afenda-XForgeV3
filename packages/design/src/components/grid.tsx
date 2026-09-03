import { cva, type VariantProps } from 'class-variance-authority'
import { STYLE } from '#generated/style'
import type { NativeProps } from '#lib/props'

/**
 * Grid — two-dimensional layout: equal columns, on the gap roles.
 *
 * Adaptee   native `div`
 * Intent    ADOPT
 * Owns      columns (1 | 2 | 3 | 4), gap (tight | normal | loose)
 * Contract  inherited from the element; layout carries no semantics
 *
 * THE SECOND LAYOUT WORD, AND WHY IT IS THIS ONE. Stack was the only way to place two
 * things next to each other, so the gallery showed fifteen components as one column six
 * thousand pixels tall, and the MetricRow composition laid tiles in a row Stack that wraps
 * nowhere. A grid of equal tracks is the layout every list-of-tiles screen reaches for
 * first; that is the second real use case law 31 asks for before a word is minted.
 *
 * COLUMNS ARE A COUNT, GAP IS A ROLE. A count is not a design value -- there is no token
 * for "three" -- so `grid-cols-3` is written as itself, and the closed union is what stops a
 * screen writing twelve. The gap is a density-bound role exactly as Stack's is, so compact
 * tightens both words together. A minimum column width, and with it wrapping by viewport,
 * is not here: it needs a length, a length needs a token, and no screen has asked.
 */
export const GRID_COLUMNS = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
} as const

const gridVariants = cva('grid', {
  defaultVariants: {
    columns: 2,
    gap: 'normal',
  },
  variants: {
    columns: GRID_COLUMNS,
    gap: {
      loose: STYLE.space.loose.gap,
      normal: STYLE.space.normal.gap,
      tight: STYLE.space.tight.gap,
    },
  },
})

/** Section 3 — the Target. */
export type GridProps = NativeProps<'div'> & VariantProps<typeof gridVariants>

/** Section 4 — the Adapter. */
export function Grid({ children, columns = 2, gap, ...props }: GridProps) {
  return (
    <div
      className={gridVariants({ columns, gap })}
      data-columns={columns}
      data-slot="grid"
      {...props}
    >
      {children}
    </div>
  )
}
