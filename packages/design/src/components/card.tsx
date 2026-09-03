import { STYLE } from '#generated/style'
import { cn } from '#lib/cn'
import type { NativeProps } from '#lib/props'

/**
 * Card — a bounded surface that groups one thing's content.
 *
 * Adaptee   native `div`
 * Intent    ADOPT
 * Owns      none (the recipe, but no axis)
 * Contract  inherited from the element: a plain `div`; the caller names it (`aria-labelledby`)
 *
 * WHAT NORMALIZE DECIDED. Upstream ships seven parts — Card, CardHeader, CardTitle,
 * CardDescription, CardAction, CardContent, CardFooter — and a `size` axis. One screen uses
 * the root, as a labelled region around a list; the MetricRow composition uses it as a
 * tile. So the Target is the root only, with the native `div` attributes and no axis; the
 * six sub-parts are not adopted until a screen composes them (ADR-031 Decision 4).
 *
 * THE RECIPE IS XFORGE'S (ADR-034 step 8). This wrapped the vendored shadcn `card.tsx`
 * until 2026-09-03; a card is a `div` with a recipe, so the adaptee is the element itself.
 * Upstream word by word: `bg-card text-card-foreground` -> the card surface and its ink;
 * `rounded-xl` -> `shape.container` (12: contains); `ring-1 ring-foreground/10` -> the stroke
 * width and the border role — a hairline is a stroke, not a translucent ring; `py-6` and
 * `gap-(--card-spacing)` -> `space.normal` padding all round and a tight gap. No shadow: a
 * card groups, a shadow floats (elevation policy), and this one sits on the page.
 */

/** Section 3 — the Target. */
export type CardProps = NativeProps<'div'>

/** Section 4 — the Adapter. The element, in the language. */
export function Card(props: CardProps) {
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden',
        STYLE.surface.card.background,
        STYLE.surface.card.foreground,
        STYLE.shape.container,
        STYLE.stroke.width,
        STYLE.stroke.border.border,
        STYLE.space.normal.padding,
        STYLE.space.tight.gap,
      )}
      data-slot="card"
      {...props}
    />
  )
}
