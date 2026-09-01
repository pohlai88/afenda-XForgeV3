import { ResourceBoundary } from '@xforge/ui/boundary'
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
      <h1>Employee</h1>
      {/* Contained HERE, not inside the component. The mapper refuses an
          unrecognised wire code and runs during render -- but it runs in the
          controller HOOK, before any JSX exists, so a boundary inside
          EmergencyContacts cannot catch its own hook. The surface is the whole
          section; the shell above it survives. */}
      <ResourceBoundary testId="stale-client">
        <EmergencyContacts employeeId={employeeId} />
      </ResourceBoundary>
    </main>
  )
}
