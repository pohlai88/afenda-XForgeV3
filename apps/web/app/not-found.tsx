import { EmptyState } from '@xforge/design/components/empty-state'

/**
 * An unrouted URL, and ONLY that.
 *
 * Worth being precise, because the obvious reading is wrong: a missing
 * EMPLOYEE does not arrive here. That 404 comes from the API as a wire code,
 * the experience mapper turns it into a `ResourceState`, and the screen renders
 * it inside the resource surface with the rest of the read states. Routing
 * never learns about it, which is the point -- one transport, one set of
 * failure semantics (ADR-012).
 *
 * This file covers the case routing DOES own: a path that matches no segment.
 * Next renders its own unstyled page otherwise, so a typo'd URL was the one
 * screen in the product that could not have come from the design system.
 *
 * A Server Component. It holds no state and needs no interactivity, so it costs
 * zero client JavaScript -- which is why it is worth having on a route whose
 * budget is 78% consumed by the shared baseline before any screen renders.
 */
export default function NotFound() {
  return (
    <EmptyState
      data-testid="route-not-found"
      description="The address may be mistyped, or the page may have moved."
      title="This page does not exist"
    />
  )
}
