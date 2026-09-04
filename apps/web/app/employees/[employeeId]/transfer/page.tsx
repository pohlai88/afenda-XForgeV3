import { Heading } from '@xforge/design/components/heading'
import { ResourceBoundary } from '@xforge/design/components/resource-boundary'
import { Shell } from '@xforge/design/components/shell'
import { TransferScreen } from './transfer-screen'

/**
 * A Server Component that composes the shell and settles the reading date.
 *
 * `asOf` follows the same rule as the directory: a business date the caller
 * states, defaulting to the runtime's civil date only as the stand-in
 * `packages/time` will replace. Here it decides WHO the subject is read as --
 * which employer holds them on that day -- until a transfer date is chosen, at
 * which point that date takes over.
 */
export const metadata = { title: 'Transfer — Xforge' }

const todayInRuntimeZone = () => new Date().toLocaleDateString('en-CA')
const isBusinessDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)

export default async function TransferPage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>
  searchParams: Promise<{ asOf?: string }>
}) {
  const { employeeId } = await params
  const { asOf } = await searchParams
  const resolved = asOf && isBusinessDate(asOf) ? asOf : todayInRuntimeZone()

  return (
    <Shell header={<Heading level={1}>Transfer</Heading>}>
      <ResourceBoundary data-testid="stale-client">
        <TransferScreen asOf={resolved} employeeId={employeeId} />
      </ResourceBoundary>
    </Shell>
  )
}
