import { Card, Heading, ResourceBoundary, Stack, Text } from '@xforge/design'

/**
 * ResourceBoundary previews.
 *
 * A React error boundary that renders its children until one of them throws
 * during render, then replaces that subtree with a danger Alert offering a
 * reload. It takes Alert's props except `tone` — the tone is its decision, not
 * the caller's.
 *
 * THE FAILED CARD IS REAL, NOT MOCKED. `Boom` throws on render and the boundary
 * catches it, so what you see is the component's own output. React logs the
 * caught error to the console; that is the boundary working, not a broken card.
 */

const Boom = (): never => {
  throw new Error('The page is out of date with the server.')
}

/** The healthy path: the boundary is invisible and children render. */
export const Healthy = () => (
  <ResourceBoundary>
    <Card>
      <Stack gap="tight">
        <Heading level={2}>Emergency contacts</Heading>
        <Text>Priya Raman · Spouse</Text>
        <Text tone="muted">+60 12-345 6789</Text>
      </Stack>
    </Card>
  </ResourceBoundary>
)

/** The caught path: a child threw, and this is what the section becomes. */
export const Failed = () => (
  <ResourceBoundary>
    <Boom />
  </ResourceBoundary>
)

/**
 * Containment: the boundary wraps the section, so the heading above it survives
 * while only the section below is replaced. That scoping is the whole point.
 */
export const ContainedToASection = () => (
  <Stack gap="normal">
    <Heading level={1}>Employee</Heading>
    <ResourceBoundary>
      <Boom />
    </ResourceBoundary>
  </Stack>
)
