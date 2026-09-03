import { Heading } from '@xforge/design/components/heading'
import { ResourceBoundary } from '@xforge/design/components/resource-boundary'
import { EmergencyContacts } from './emergency-contacts'

/**
 * A Server Component that composes the shell only.
 *
 * It does not fetch business data (ADR-012): business reads go through the
 * generated client from a client component, so there is one transport, one
 * policy path, and one set of failure semantics.
 */
export default async function EmployeePage({
  params,
}: {
  params: Promise<{ employeeId: string }>
}) {
  const { employeeId } = await params
  return (
    <main>
      {/* The PRIMITIVE, not a raw <h1>, and Tailwind's preflight is what made
          the difference visible. Preflight sets `h1..h6 { font-size: inherit;
          font-weight: inherit }`, so this rendered at 16px/400 while the
          Heading primitive beside it rendered at its token size. Every xf-*
          component sets its own size, weight and margin, so preflight changed
          nothing about the design system -- it changed only the one element on
          this screen that had gone around it.

          Worth keeping in mind rather than treating as a one-off fix:
          `no-bespoke-styling` catches a screen that writes className or style.
          It cannot catch a screen that writes a bare element and accepts the
          browser's defaults, because there is nothing there to match on. */}
      <Heading level={1}>Employee</Heading>
      {/* Contained HERE, not inside the component. The mapper refuses an
          unrecognised wire code and runs during render -- but it runs in the
          controller HOOK, before any JSX exists, so a boundary inside
          EmergencyContacts cannot catch its own hook. The surface is the whole
          section; the shell above it survives. */}
      <ResourceBoundary data-testid="stale-client">
        <EmergencyContacts employeeId={employeeId} />
      </ResourceBoundary>
    </main>
  )
}
