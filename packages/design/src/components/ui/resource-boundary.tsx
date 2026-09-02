'use client'

import { Component, type ComponentProps, type ErrorInfo } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'

/**
 * Contains the failure of ONE resource surface, and deliberately not the page.
 *
 * WHY THE SCOPE IS THIS SMALL. The failure it exists for is a client bundle
 * meeting a server that has moved on: an experience mapper is handed a wire
 * code it has never heard of and refuses it rather than guessing. One unknown
 * code should cost the reader the collection it came from, not the whole
 * product, so this wraps a surface and the route-level boundary catches
 * everything outside it.
 *
 * RELOAD, NOT RETRY, and that is the whole difference between the two
 * boundaries. The cause here is a STALE BUNDLE — asking the same code again
 * cannot fix it, and a retry button that never works teaches people the product
 * is flaky. The route boundary offers `reset()` because its cause is unknown and
 * a re-render might genuinely help.
 *
 * A CLASS COMPONENT because React offers no hook for this. `componentDidCatch`
 * has no functional equivalent, and that is a React constraint rather than a
 * choice worth revisiting.
 *
 * IT STAMPS NO SLOT OF ITS OWN, and that is the honest shape rather than an
 * omission. This renders no element: healthy, it returns its children
 * untouched; failed, its entire output is an `Alert`. A `data-slot` here would
 * mean either a wrapper element that exists only to carry it, or taking the
 * slot off the Alert and leaving that surface unaddressable as what it is.
 * The props it does not name are forwarded to the Alert, so `data-testid` lands
 * on the failure surface — which is the element a test wants anyway.
 */
export class ResourceBoundary extends Component<
  ComponentProps<'div'>,
  { readonly failed: boolean }
> {
  // ANNOTATED, not inferred. Without the type, `{ failed: false }` infers the
  // literal `false`, and the guard below reads as dead code to a linter that is
  // correct about the type and wrong about the program -- `setState` from
  // `getDerivedStateFromError` is what makes it reachable.
  override state: { readonly failed: boolean } = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  // Reported, never swallowed. A boundary that renders a message and logs
  // nothing turns a crash into a design decision nobody can see afterwards.
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('resource surface failed to render', error, info.componentStack)
  }

  override render() {
    const { children, ...props } = this.props
    if (!this.state.failed) {
      return children
    }
    return (
      <Alert tone="danger" {...props}>
        <Text>This section could not be displayed.</Text>
        <Text tone="muted">
          The page is out of date with the server. Reloading will fetch the current version.
        </Text>
        <Button onClick={() => window.location.reload()} variant="outline">
          Reload the page
        </Button>
      </Alert>
    )
  }
}
