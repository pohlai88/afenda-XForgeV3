import type { ComponentProps } from 'react'
import { Card as Primitive } from '#components/ui/card'

/**
 * Card — a bounded surface that groups one thing's content.
 *
 * Adaptee   shadcn `card` (style base-nova)
 * Intent    ADOPT
 * Owns      none
 * Contract  inherited from the adaptee: a plain `div`; the caller names it (`aria-labelledby`)
 *
 * WHAT NORMALIZE DECIDED. Upstream ships seven parts — Card, CardHeader, CardTitle,
 * CardDescription, CardAction, CardContent, CardFooter. One screen uses one of them,
 * as a labelled region around a list. So the Target is the root only, with the
 * native `div` attributes and no axis of its own; the six sub-parts are not adopted
 * until a screen composes them, and then each is a decision (ADR-031 Decision 4).
 * This file exists so the application never imports the vendored tree, which is
 * unexported (ADR-033) — and so that when Card does earn a recipe or a contract,
 * there is one place for it to land.
 */

/** Section 3 — the Target. */
export type CardProps = ComponentProps<'div'>

/** Section 4 — the Adapter. Translation only; today that is identity. */
export function Card(props: CardProps) {
  return <Primitive {...props} />
}
