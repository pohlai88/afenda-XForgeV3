import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

/**
 * Nothing here — said as an invitation, never as an apology.
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
  className,
  description,
  title,
  ...props
}: Omit<ComponentProps<'div'>, 'title'> & {
  readonly description?: string
  readonly title: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-tight rounded-control border border-border border-dashed px-row-x py-section',
        className,
      )}
      data-slot="empty-state"
      {...props}
    >
      <p className="m-0 font-emphasis text-emphasis text-foreground">{title}</p>
      {description ? <p className="m-0 text-body text-muted-foreground">{description}</p> : null}
    </div>
  )
}
