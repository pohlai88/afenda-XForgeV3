import { Alert } from '@xforge/design/components/alert'
import { Heading } from '@xforge/design/components/heading'
import { Shell } from '@xforge/design/components/shell'
import { Stack } from '@xforge/design/components/stack'
import { Text } from '@xforge/design/components/text'
import { notFound } from 'next/navigation'
import { DashboardView } from './dashboard-view'
import { SAMPLE_AS_OF, SAMPLE_BACKDATED, SAMPLE_ENTITIES, SAMPLE_METRICS } from './sample'

/**
 * The people dashboard.
 *
 * DEVELOPMENT ONLY, AND IT SAYS SO ON THE PAGE — twice: `notFound()` in a
 * production build, exactly as `/gallery` and `/` do, and a notice above the
 * content in development.
 *
 * The reason is that the three panels need aggregates no operation returns yet.
 * The screen is built first, against representative data, which is the build
 * order this architecture chose (law 2). What it must never do is present
 * invented figures as though they were this tenant's: a dashboard is the
 * surface people trust most and check least, and one that lies convincingly for
 * a fortnight while the contracts are written is worse than no dashboard at all.
 *
 * When `listLegalEntities` gains a headcount, and a `listBackdatedChanges`
 * operation exists, this file loses the notice, loses the `notFound`, and
 * changes nothing else — `DashboardView` already takes exactly the data those
 * operations will return.
 */
export const metadata = { title: 'People — Xforge' }

export default function DashboardPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }
  return (
    <Shell header={<Heading level={1}>People</Heading>}>
      <Stack gap="loose">
        {/*
          INFO, not warning. Nothing is wrong; the reader simply needs to know
          the figures are illustrative. A warning tone here would cry wolf on a
          page that will later carry a real warning about backdated pay.
        */}
        <Alert tone="info">
          <Stack gap="tight">
            <Text>These figures are sample data, not this tenant.</Text>
            <Text>
              The layout is built against the shape the aggregate operations will return; those
              contracts are not authored yet, so this route is not served in a production build.
            </Text>
          </Stack>
        </Alert>

        <DashboardView
          asOf={SAMPLE_AS_OF}
          backdated={SAMPLE_BACKDATED}
          entities={SAMPLE_ENTITIES}
          metrics={SAMPLE_METRICS}
        />
      </Stack>
    </Shell>
  )
}
