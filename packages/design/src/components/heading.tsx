import { STYLE } from '#generated/style'
import { cn } from '#lib/cn'
import type { NativeProps } from '#lib/props'

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
 * AND THEN h2 AND h3 WERE, one level down, until 2026-09-03: both mapped to
 * `text-heading`. The design-sync preview showed it; no check here could have,
 * because the kernel proves adjacent TYPE ROLES differ and nothing proved this
 * table used different ones. Level 3 is now the `subheading` role -- 16px/600, minted for
 * it in ADR-034 step 7; apart from h2 by size, from `emphasis` by weight -- and `heading.test.tsx` holds every level to its own role.
 *
 * A TABLE RATHER THAN `cva`, WHICH THE REST OF THE SYSTEM USES. `level` does not
 * only choose an appearance: it chooses the ELEMENT, and `cva` emits class
 * strings. Converting this would move the size into a variant and leave the tag
 * selection beside it, which is one decision described in two places. Same
 * reason `alert.tsx` keeps `ALERT_TONE` -- there the value carries an icon and a
 * role. Where a variant is purely appearance (`text`, `stack`), it is `cva`.
 */
const ROLE = {
  1: STYLE.typography.title,
  2: STYLE.typography.heading,
  3: STYLE.typography.subheading,
} as const

export function Heading({
  children,
  level = 2,
  ...props
}: NativeProps<'h2'> & {
  readonly level?: keyof typeof ROLE
}) {
  const Tag = `h${level}` as const
  return (
    <Tag
      className={cn(STYLE.space.none.margin, STYLE.ink.default.text, ROLE[level])}
      data-slot="heading"
      {...props}
    >
      {children}
    </Tag>
  )
}
