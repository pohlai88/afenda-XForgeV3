import { Heading } from '@xforge/design/components/heading'
import { ResourceBoundary } from '@xforge/design/components/resource-boundary'
import { Shell } from '@xforge/design/components/shell'
import { OnboardScreen } from './onboard-screen'

/**
 * A Server Component that composes the shell only.
 *
 * It does not fetch and it does not write (ADR-012): the employer list and the
 * onboarding command both go through the generated client from a client
 * component, so there is one transport, one policy path and one set of failure
 * semantics.
 */
export const metadata = { title: 'Onboard an employee — Xforge' }

export default function NewEmployeePage() {
  return (
    <Shell header={<Heading level={1}>Onboard an employee</Heading>}>
      <ResourceBoundary data-testid="stale-client">
        <OnboardScreen />
      </ResourceBoundary>
    </Shell>
  )
}
