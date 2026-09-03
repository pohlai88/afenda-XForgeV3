import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '#lib/cn'

/**
 * One-dimensional layout, and the only way a screen gets to space things.
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
      loose: 'gap-loose',
      normal: 'gap-normal',
      tight: 'gap-tight',
    },
  },
})

export function Stack({
  children,
  className,
  direction,
  gap,
  ...props
}: ComponentProps<'div'> & VariantProps<typeof stackVariants>) {
  return (
    <div className={cn(stackVariants({ direction, gap }), className)} data-slot="stack" {...props}>
      {children}
    </div>
  )
}

export { stackVariants }
