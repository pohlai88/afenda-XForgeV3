import { Alert } from '@xforge/design/components/alert'
import { Card } from '@xforge/design/components/card'
import { EmptyState } from '@xforge/design/components/empty-state'
import { Grid } from '@xforge/design/components/grid'
import { Heading } from '@xforge/design/components/heading'
import { Link } from '@xforge/design/components/link'
import { List } from '@xforge/design/components/list'
import { ListItem } from '@xforge/design/components/list-item'
import { Stack } from '@xforge/design/components/stack'
import { Text } from '@xforge/design/components/text'
import { type Metric, MetricRow } from '../metric-row'

/**
 * The people dashboard.
 *
 * -------------------------------------------------------------------------
 * WHAT THIS SCREEN IS FOR, AND WHY IT IS NOT A CHART WALL
 * -------------------------------------------------------------------------
 * Every HR product opens on the same page: a row of numbers, a donut of
 * headcount by department, a bar chart of leave taken. Those answer questions
 * nobody urgently has. The two questions an HR or payroll administrator opens a
 * system of record with are:
 *
 *   who is on my books, and under which employer
 *   what changed since I last looked, that I have not accounted for
 *
 * So this screen is three panels answering those, and nothing else. There is no
 * chart, because a chart of four legal entities is a table with worse
 * precision, and no activity feed, because "Siti updated a record" is not a
 * fact anybody acts on.
 *
 * -------------------------------------------------------------------------
 * THE THIRD PANEL IS THE ONE THAT MATTERS, AND IT COMES FROM THE MODEL
 * -------------------------------------------------------------------------
 * "Recorded after the fact" lists employment changes whose EFFECTIVE date is
 * before the date they were ENTERED. A raise effective 1 March keyed in on the
 * 20th is invisible to a payroll run calculated on the 15th — ADR-016 calls the
 * finding RETRO_INPUT_AFTER_SNAPSHOT, and it is the single most common way a
 * payroll goes out wrong while every screen looks correct.
 *
 * Most HR products cannot show this panel at all, because they store one date
 * per record. `employment` carries valid time AND transaction time as separate
 * columns, so the difference is a fact the database already holds. That is a
 * design decision surfacing as a feature, which is the only kind of feature
 * worth putting on a dashboard.
 *
 * -------------------------------------------------------------------------
 * EVERY NUMBER ON THIS PAGE IS AS AT A DATE, AND SAYS SO
 * -------------------------------------------------------------------------
 * "Headcount 128" is not a fact; "headcount 128 as at 4 September" is. The date
 * is in the page header rather than repeated on each tile, because it governs
 * all of them — repeating it would suggest the tiles could disagree.
 */

export interface EntityHeadcount {
  readonly countryCode: string
  readonly employees: number
  readonly legalEntityId: string
  readonly name: string
  /** Shown because it decides what "today" means for this entity's payroll. */
  readonly timeZone: string
}

export interface BackdatedChange {
  readonly effectiveFrom: string
  readonly employeeId: string
  readonly fullName: string
  readonly jobTitle: string
  readonly legalEntityName: string
  readonly recordedAt: string
}

/**
 * Whole days between two `YYYY-MM-DD` dates.
 *
 * `Date.UTC` on the parsed parts, never `new Date(string)`: the latter is
 * parsed as UTC midnight and then rendered in the runtime zone, so a difference
 * taken across a DST boundary comes out at 29.958 days. Both operands here are
 * business dates with no instant attached, and the arithmetic keeps it that way.
 */
const daysBetween = (from: string, to: string): number => {
  const utc = (d: string) => {
    const [y, m, day] = d.split('-').map(Number)
    return Date.UTC(y ?? 0, (m ?? 1) - 1, day ?? 1)
  }
  return Math.round((utc(to) - utc(from)) / 86_400_000)
}

/** The instant a change was recorded, narrowed to the day it landed on. */
const recordedOn = (iso: string) => iso.slice(0, 10)

function Group({ entities }: { entities: readonly EntityHeadcount[] }) {
  if (entities.length === 0) {
    return (
      <EmptyState
        description="A legal entity is the employer of record: it holds the statutory registrations and decides what a civil date means for its payroll."
        title="No legal entities yet"
      />
    )
  }
  return (
    <Grid columns={entities.length >= 3 ? 3 : 2} gap="normal">
      {entities.map((e) => (
        <Card aria-label={`${e.name}: ${e.employees} employees`} key={e.legalEntityId}>
          <Stack gap="tight">
            <Text variant="emphasis">{e.name}</Text>
            <Text variant="display">{e.employees}</Text>
            {/* The zone is here because it is not decoration: payroll for this
                entity runs on ITS civil calendar, and two entities in one group
                can be on different days at the same instant. */}
            <Text tone="muted">
              {e.countryCode} · {e.timeZone}
            </Text>
          </Stack>
        </Card>
      ))}
    </Grid>
  )
}

function Backdated({ changes }: { changes: readonly BackdatedChange[] }) {
  if (changes.length === 0) {
    return (
      <EmptyState
        description="Every employment change on file was recorded on or before the day it took effect."
        title="Nothing was recorded late"
      />
    )
  }
  return (
    <Stack gap="normal">
      {/*
        WARNING, NOT DANGER. Nothing is broken and nothing is wrong yet — a
        backdated change is legitimate and routine. What it needs is a decision:
        recalculate, or defer to the next period. Danger would say "this
        failed", which is untrue and would teach people to ignore the panel.
      */}
      <Alert tone="warning">
        <Text>
          These took effect before they were entered. Any payroll already calculated for those
          periods will not include them.
        </Text>
      </Alert>
      <List>
        {changes.map((c) => {
          const late = daysBetween(c.effectiveFrom, recordedOn(c.recordedAt))
          return (
            <ListItem key={`${c.employeeId}-${c.effectiveFrom}`}>
              <Stack gap="tight">
                <Link href={`/employees/${c.employeeId}`}>{c.fullName}</Link>
                <Text tone="muted">
                  {c.jobTitle} · {c.legalEntityName}
                </Text>
                {/*
                  The number of days is spelled out rather than shown as a
                  coloured badge, because "14 days" is what a person needs to
                  judge whether a period has already been paid. A red dot is not.
                */}
                <Text>
                  Effective {c.effectiveFrom}, recorded {recordedOn(c.recordedAt)} — {late}{' '}
                  {late === 1 ? 'day' : 'days'} later
                </Text>
              </Stack>
            </ListItem>
          )
        })}
      </List>
    </Stack>
  )
}

export function DashboardView({
  asOf,
  backdated,
  entities,
  metrics,
}: {
  readonly asOf: string
  readonly backdated: readonly BackdatedChange[]
  readonly entities: readonly EntityHeadcount[]
  readonly metrics: readonly Metric[]
}) {
  return (
    <Stack gap="loose">
      <Stack gap="tight">
        <Text tone="muted">As at {asOf}</Text>
      </Stack>

      <MetricRow heading="People" id="dashboard-people" metrics={metrics} />

      <Stack aria-labelledby="dashboard-group" gap="normal" role="region">
        <Heading id="dashboard-group" level={2}>
          Across the group
        </Heading>
        <Text tone="muted">
          One person can be employed by more than one of these at once, and each employs them under
          its own statutory registration.
        </Text>
        <Group entities={entities} />
      </Stack>

      <Stack aria-labelledby="dashboard-backdated" gap="normal" role="region">
        <Heading id="dashboard-backdated" level={2}>
          Recorded after the fact
        </Heading>
        <Backdated changes={backdated} />
      </Stack>
    </Stack>
  )
}
