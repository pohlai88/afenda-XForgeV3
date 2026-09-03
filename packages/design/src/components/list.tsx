import { STYLE } from '#generated/style'
import { cn } from '#lib/cn'
import type { NativeProps } from '#lib/props'

/**
 * List — a collection, kept as a real `<ul>`.
 *
 * Adaptee   native `ul`
 * Intent    ADOPT
 * Owns      none
 * Contract  inherited from the element: "list, four items" and item navigation
 *
 * THE ELEMENT IS THE FEATURE. A screen reader announces "list, four items" and
 * lets a reader jump between them; a stack of divs announces nothing and offers
 * no navigation. The visual reset — no marker, no indent — is styling, and it
 * does not cost the semantics, which is the whole reason not to reach for divs.
 */
export function List({ children, ...props }: NativeProps<'ul'>) {
  return (
    <ul
      className={cn('flex list-none flex-col', STYLE.space.none.padding, STYLE.space.tight.gap)}
      data-slot="list"
      {...props}
    >
      {children}
    </ul>
  )
}
