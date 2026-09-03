'use client'

import { Alert } from '@xforge/design/components/alert'
import { Button } from '@xforge/design/components/button'
import { Stack } from '@xforge/design/components/stack'
import { Text } from '@xforge/design/components/text'

/**
 * The OUTER net, and deliberately not a replacement for `ResourceBoundary`.
 *
 * `ResourceBoundary` contains a failure of one resource SURFACE, and its own
 * comment says why it is scoped that way: "One unknown code should cost the
 * reader the collection it came from, not the whole product." That boundary
 * sits inside the page and catches first, so nothing here changes what happens
 * when the experience mapper refuses a wire code.
 *
 * What had no net at all is everything OUTSIDE that surface -- a throw in the
 * page shell, in composition, in anything the boundary does not wrap. React
 * unwinds to the nearest boundary, and with none declared the nearest one is
 * Next's built-in error page: unbranded, outside the design system, and in a
 * production build a bare "Application error: a client-side exception has
 * occurred". A contained failure and an uncontained one looked identical to the
 * reader, which is the distinction this file restores.
 *
 * `reset()` re-renders the segment rather than reloading the document. That is
 * the right verb here and the wrong one in `ResourceBoundary`, which offers
 * RELOAD precisely because its producer is a stale bundle meeting a newer
 * server -- asking the same bundle again cannot fix it. Here the cause is
 * unknown, so the cheap recovery is offered first and the reader still has the
 * browser's own reload if it does not take.
 *
 * A Client Component because Next requires it: an error boundary is React state
 * and cannot be a Server Component. It costs nothing measurable -- the
 * `@xforge/design` barrel is already in this route's client graph via
 * `emergency-contacts.tsx`.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Reported, not swallowed -- the same rule `ResourceBoundary` states for the
  // surface it contains. `digest` is the server-side correlation id Next
  // attaches when the throw happened during render, and it is the only thing
  // linking this screen to the server log entry for it.
  console.error('route segment failed to render', error, error.digest)
  return (
    <Stack>
      <Alert data-testid="route-error" tone="danger">
        <Text>Something on this page failed to load.</Text>
        <Text tone="muted">
          The rest of the application is unaffected. Trying again re-renders this section.
        </Text>
      </Alert>
      <Button data-testid="route-error-retry" onClick={reset}>
        Try again
      </Button>
    </Stack>
  )
}
