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
      <EmergencyContacts employeeId={employeeId} />
    </main>
  )
}
