import { STYLE } from '#generated/style'
import { cn } from '#lib/cn'
import type { NativeProps } from '#lib/props'

/**
 * ListItem — one row of a `List`. Separate so a list cannot be built from loose `<li>`s.
 *
 * Adaptee   native `li`
 * Intent    ADOPT
 * Owns      none
 * Contract  inherited from the element
 */
export function ListItem({ children, ...props }: NativeProps<'li'>) {
  return (
    <li
      className={cn(
        'flex flex-col',
        STYLE.space.tight.gap,
        STYLE.shape.control,
        STYLE.stroke.width,
        STYLE.stroke.border.border,
        STYLE.surface.card.background,
        STYLE.space.rowX.paddingX,
        STYLE.space.controlY.paddingY,
      )}
      data-slot="list-item"
      {...props}
    >
      {children}
    </li>
  )
}
