import type { ComponentProps } from 'react'
import { cn } from '#lib/cn'

/**
 * A collection, kept as a real `<ul>`.
 *
 * THE ELEMENT IS THE FEATURE. A screen reader announces "list, four items" and
 * lets a reader jump between them; a stack of divs announces nothing and offers
 * no navigation. The visual reset — no marker, no indent — is styling, and it
 * does not cost the semantics, which is the whole reason not to reach for divs.
 */
export function List({ children, className, ...props }: ComponentProps<'ul'>) {
  return (
    <ul
      className={cn('flex list-none flex-col gap-tight p-0', className)}
      data-slot="list"
      {...props}
    >
      {children}
    </ul>
  )
}
