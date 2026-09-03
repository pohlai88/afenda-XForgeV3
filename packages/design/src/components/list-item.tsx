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
 *
 * A ROW, NOT A COLUMN. Its children lie across it, centred, the first at the start and the
 * last at the end: content, then the action. It was a column, and the employee screen's
 * Save button stretched to the row's full width under the contact's name; the gallery
 * showed the same bar in every list. Wrapping the pair in a row Stack on every screen
 * would have repeated one layout decision everywhere it is made, so it is made here, once.
 * Stacked content inside a row -- a name over a phone number -- is a Stack, as it was.
 */
export function ListItem({ children, ...props }: NativeProps<'li'>) {
  return (
    <li
      className={cn(
        'flex items-center justify-between',
        STYLE.space.tight.gap,
        STYLE.shape.control,
        STYLE.stroke.width,
        STYLE.outline.variant.border,
        STYLE.surface.lowest.background,
        // A row's padding is the row role on both axes; it borrowed the control's
        // vertical padding until the space plate showed rowY worn by nothing.
        STYLE.space.rowX.paddingX,
        STYLE.space.rowY.paddingY,
      )}
      data-slot="list-item"
      {...props}
    >
      {children}
    </li>
  )
}
