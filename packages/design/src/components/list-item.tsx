import type { ComponentProps } from 'react'
import { cn } from '#lib/cn'

/**
 * ListItem — one row of a `List`. Separate so a list cannot be built from loose `<li>`s.
 *
 * Adaptee   native `li`
 * Intent    ADOPT
 * Owns      none
 * Contract  inherited from the element
 */
export function ListItem({ children, className, ...props }: ComponentProps<'li'>) {
  return (
    <li
      className={cn(
        'flex flex-col gap-tight rounded-control border border-border bg-card px-row-x py-control-y',
        className,
      )}
      data-slot="list-item"
      {...props}
    >
      {children}
    </li>
  )
}
