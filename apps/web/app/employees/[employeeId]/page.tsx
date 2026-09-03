import { Heading } from '@xforge/design/components/heading'
import { ResourceBoundary } from '@xforge/design/components/resource-boundary'
import { Shell } from '@xforge/design/components/shell'
import { EmergencyContacts } from './emergency-contacts'

/**
 * A Server Component that composes the shell only.
 *
 * It does not fetch business data (ADR-012): business reads go through the
 * generated client from a client component, so there is one transport, one
 * policy path, and one set of failure semantics.
 *
 * THE SHELL IS THE LANGUAGE'S, not this file's. Its docked header holds the
 * title and its content is inset by the container role; before it, this screen
 * wrote a bare `<main>` and its content touched the viewport edge. The rail slot
 * is left empty until the product decides what an employee screen navigates
 * between -- the Shell renders no rail when given none.
 */
export default async function EmployeePage({
  params,
}: {
  params: Promise<{ employeeId: string }>
}) {
  const { employeeId } = await params
  return (
    // The PRIMITIVE in the header, not a raw <h1>: Tailwind's preflight sets
    // `h1..h6 { font-size: inherit; font-weight: inherit }`, so a bare element
    // rendered at 16px/400 beside components at their token sizes. A screen that
    // writes a bare element and accepts the browser's defaults leaves nothing
    // for a check to match on, which is why the Heading is used even here.
    <Shell header={<Heading level={1}>Employee</Heading>}>
      {/* Contained HERE, not inside the component. The mapper refuses an
          unrecognised wire code and runs during render -- but it runs in the
          controller HOOK, before any JSX exists, so a boundary inside
          EmergencyContacts cannot catch its own hook. The surface is the whole
          section; the shell above it survives. */}
      <ResourceBoundary data-testid="stale-client">
        <EmergencyContacts employeeId={employeeId} />
      </ResourceBoundary>
    </Shell>
  )
}
