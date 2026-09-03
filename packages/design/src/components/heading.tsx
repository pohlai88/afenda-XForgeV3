import type { ComponentProps } from 'react'
import { cn } from '#lib/cn'

/**
 * Heading — a heading, with its level and its size decided separately.
 *
 * Adaptee   native `h1` | `h2` | `h3`
 * Intent    ADOPT
 * Owns      level (1 | 2 | 3), and the type role each level renders at
 * Contract  inherited from the element: the level IS the document outline
 *
 * THE DOCUMENT OUTLINE IS NOT THE TYPE SCALE, and conflating them is how a page
 * ends up with an h3 chosen because 20px looked right. `level` picks the
 * element a screen reader walks; the role picks what it looks like. They happen
 * to line up here, and the point is that they are allowed not to.
 *
 * `title` for the page, `heading` for a section. Both were 20px/600 until the
 * scale grew its fourth step -- an h1 and an h2 that were pixel-identical, so
 * the outline had no visual counterpart at all.
 *
 * A TABLE RATHER THAN `cva`, WHICH THE REST OF THE SYSTEM USES. `level` does not
 * only choose an appearance: it chooses the ELEMENT, and `cva` emits class
 * strings. Converting this would move the size into a variant and leave the tag
 * selection beside it, which is one decision described in two places. Same
 * reason `alert.tsx` keeps its `TONE` table -- there the value carries an icon.
 * Where a variant is purely appearance (`text`, `stack`, `button`, `badge`), it
 * is `cva`.
 */
const ROLE = {
  1: 'text-title',
  2: 'text-heading',
  3: 'text-heading',
} as const

export function Heading({
  children,
  className,
  level = 2,
  ...props
}: ComponentProps<'h2'> & {
  readonly level?: keyof typeof ROLE
}) {
  const Tag = `h${level}` as const
  return (
    <Tag
      className={cn('m-0 font-heading text-foreground', ROLE[level], className)}
      data-slot="heading"
      {...props}
    >
      {children}
    </Tag>
  )
}
