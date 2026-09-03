import type { ComponentProps } from 'react'
import { cn } from '#lib/cn'

/**
 * The document surface: the one element that establishes the type and colour
 * every screen inherits.
 *
 * IT SETS THE ROLES ONCE, AT THE TOP. Family, body size, body weight, body
 * leading and the page ground are declared here and nowhere else, so a screen
 * that renders plain text gets the system's text without asking. A component
 * that needed its own font-size was the failure this replaces -- forty-six of
 * them, each individually reasonable.
 */
export function Page({ children, className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'min-h-screen bg-background font-body font-sans text-body text-foreground',
        className,
      )}
      data-slot="page"
      {...props}
    >
      {children}
    </div>
  )
}
