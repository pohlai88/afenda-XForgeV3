import { STYLE } from '#generated/style'
import { cn } from '#lib/cn'
import type { NativeProps } from '#lib/props'

/**
 * Page — the document surface: the one element that establishes the type and colour
 * every screen inherits.
 *
 * Adaptee   native `div`
 * Intent    ADOPT
 * Owns      none
 * Contract  inherited from the element
 *
 * IT SETS THE ROLES ONCE, AT THE TOP. Family, body size, body weight, body
 * leading and the page ground are declared here and nowhere else, so a screen
 * that renders plain text gets the system's text without asking. A component
 * that needed its own font-size was the failure this replaces -- forty-six of
 * them, each individually reasonable.
 */
export function Page({ children, ...props }: NativeProps<'div'>) {
  return (
    <div
      className={cn(
        'min-h-screen',
        STYLE.surface.default.background,
        STYLE.family.sans,
        STYLE.typography.body,
        STYLE.ink.onSurface.text,
      )}
      data-slot="page"
      {...props}
    >
      {children}
    </div>
  )
}
