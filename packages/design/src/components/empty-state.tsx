import { STYLE } from '#generated/style'
import { cn } from '#lib/cn'
import type { NativeProps } from '#lib/props'

/**
 * EmptyState — nothing here, said as an invitation, never as an apology.
 *
 * Adaptee   native `div`
 * Intent    ADOPT
 * Owns      none (title and description are content slots, not axes)
 * Contract  inherited from the element
 *
 * TWO LINES, AND THEY DO DIFFERENT JOBS. The title states the fact; the
 * description says what to do about it. Collapsing them into one sentence is how
 * an empty state becomes decoration: a reader learns there is nothing here and
 * not what would put something here.
 *
 * NOT CENTRED IN A HERO. This is a dense working tool, and an empty collection
 * is a routine state a person passes through dozens of times a day, not an
 * event. It occupies the space the content would have occupied.
 */
export function EmptyState({
  description,
  title,
  ...props
}: Omit<NativeProps<'div'>, 'title'> & {
  readonly description?: string
  readonly title: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col border-dashed',
        STYLE.space.tight.gap,
        STYLE.shape.control,
        STYLE.stroke.width,
        STYLE.stroke.border.border,
        STYLE.space.rowX.paddingX,
        STYLE.space.section.paddingY,
      )}
      data-slot="empty-state"
      {...props}
    >
      <p className={cn('m-0', STYLE.typography.emphasis, STYLE.ink.default.text)}>{title}</p>
      {description ? (
        <p className={cn('m-0', STYLE.typography.body, STYLE.surface.muted.foreground)}>
          {description}
        </p>
      ) : null}
    </div>
  )
}
