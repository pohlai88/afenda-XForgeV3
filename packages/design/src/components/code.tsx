import type { ComponentProps } from 'react'
import { cn } from '#lib/cn'

/**
 * Code — an identifier, a wire code, a request id: read by comparison, not as a word.
 *
 * Adaptee   native `code`
 * Intent    ADOPT
 * Owns      none
 * Contract  inherited from the element
 *
 * TABULAR FIGURES ARE THE POINT, not the monospace face. EMP-0011 and EMP-0117
 * must be the same width down a column or the eye cannot scan them, and
 * proportional digits are how a transposed pair of numbers stops being visible.
 * In a payroll product that is a correctness property, not a typographic one.
 */
export function Code({ children, className, ...props }: ComponentProps<'code'>) {
  return (
    <code
      className={cn(
        'rounded-precise bg-muted px-related font-mono text-body-compact text-foreground tabular-nums',
        className,
      )}
      data-slot="code"
      {...props}
    >
      {children}
    </code>
  )
}
