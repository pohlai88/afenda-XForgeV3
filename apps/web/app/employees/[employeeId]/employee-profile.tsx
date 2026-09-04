import { Alert } from '@xforge/design/components/alert'
import { Card } from '@xforge/design/components/card'
import { EmptyState } from '@xforge/design/components/empty-state'
import { Grid } from '@xforge/design/components/grid'
import { Heading } from '@xforge/design/components/heading'
import { List } from '@xforge/design/components/list'
import { ListItem } from '@xforge/design/components/list-item'
import { Stack } from '@xforge/design/components/stack'
import { Text } from '@xforge/design/components/text'

/**
 * The employee record: who this is, under which employer, and every period.
 *
 * -------------------------------------------------------------------------
 * THE TIMELINE IS THE SCREEN, NOT AN ARCHIVE TAB
 * -------------------------------------------------------------------------
 * Most HR products put employment history behind a tab called "History", which
 * is where facts go to stop being read. Here it is the body of the record,
 * because in an effective-dated system the periods ARE the employment — the
 * "current" job title is just whichever period covers today, and it stops being
 * current at a date somebody already typed in.
 *
 * Putting it on the page also makes the one distinction the directory
 * deliberately refuses to make: a person with no period covering today has
 * either not started or has left, and the only way to tell is to look at the
 * periods. The directory cannot say which without guessing from a row that does
 * not cover the date (ADR-016 forbids exactly that fallback); this screen shows
 * the rows and lets a person read them.
 *
 * -------------------------------------------------------------------------
 * OPEN-ENDED IS DRAWN AS OPEN-ENDED
 * -------------------------------------------------------------------------
 * A NULL `effectiveTo` means "no end recorded", which is not the same as "ends
 * today" and not the same as "unknown". It renders as `2024-04-01 →` with
 * nothing after the arrow: the shape of the row says the period runs on. A
 * blank cell, or the word "Present", would both be the system inventing an end
 * date it does not have.
 *
 * -------------------------------------------------------------------------
 * A PERIOD RECORDED LATE SAYS SO, HERE TOO
 * -------------------------------------------------------------------------
 * The dashboard lists these across the tenant; this shows it on the record
 * itself, because the person looking at one employee is the person who can say
 * whether it matters. Same fact, two surfaces, one producer — `recordedAt`
 * being later than `effectiveFrom` — and neither surface computes it
 * differently from the other.
 */

export interface ProfileEmployment {
  readonly effectiveFrom: string
  readonly effectiveTo: string | null
  readonly id: string
  readonly jobTitle: string
  readonly payBasis: 'daily' | 'hourly' | 'monthly'
  readonly recordedAt: string
}

export interface ProfileEmployee {
  readonly employeeNumber: string
  readonly fullName: string
  readonly legalEntity: {
    readonly countryCode: string
    readonly name: string
    readonly registrationNumber: string | null
    readonly timeZone: string
  }
  readonly preferredName: string | null
}

/** True when the row was entered after the day it took effect. */
const wasBackdated = (e: ProfileEmployment) => e.recordedAt.slice(0, 10) > e.effectiveFrom

/** `[from, to)` — half-open, and an open end is drawn as one. */
const period = (e: ProfileEmployment) => `${e.effectiveFrom} → ${e.effectiveTo ?? ''}`

function Identity({ asOf, employee }: { asOf: string; employee: ProfileEmployee }) {
  const { legalEntity: entity } = employee
  return (
    <Card aria-labelledby="employee-identity-heading">
      <Stack gap="normal">
        <Stack gap="tight">
          <Heading id="employee-identity-heading" level={2}>
            {employee.fullName}
          </Heading>
          {/* The name people actually use, only when it differs. Rendering
              "known as Siti" for someone called Siti is noise. */}
          {employee.preferredName && employee.preferredName !== employee.fullName ? (
            <Text tone="muted">Known as {employee.preferredName}</Text>
          ) : null}
        </Stack>

        <Grid columns={3} gap="normal">
          <Stack gap="tight">
            <Text variant="label">Employee number</Text>
            <Text>{employee.employeeNumber}</Text>
            <Text tone="muted">Unique within the employer, not across the group</Text>
          </Stack>
          <Stack gap="tight">
            <Text variant="label">Employer of record</Text>
            <Text>{entity.name}</Text>
            <Text tone="muted">
              {entity.registrationNumber ?? 'No registration number on file'}
            </Text>
          </Stack>
          <Stack gap="tight">
            <Text variant="label">Payroll calendar</Text>
            <Text>{entity.timeZone}</Text>
            {/* Not decoration. Every date on this screen — including "as at"
                above — means a day in THIS zone, and a group with entities in
                two zones has two answers to "today". */}
            <Text tone="muted">{entity.countryCode} · dates on this record resolve here</Text>
          </Stack>
        </Grid>

        <Text tone="muted">As at {asOf}</Text>
      </Stack>
    </Card>
  )
}

function Timeline({ employments }: { employments: readonly ProfileEmployment[] }) {
  if (employments.length === 0) {
    return (
      <EmptyState
        description="This person is on the books at this employer but no period has been recorded, so payroll has nothing to operate on."
        title="No employment periods"
      />
    )
  }

  const backdated = employments.filter(wasBackdated)

  return (
    <Stack gap="normal">
      {backdated.length > 0 ? (
        <Alert tone="warning">
          <Text>
            {backdated.length} of these {employments.length} were entered after they took effect.
            Any payroll already run for those periods will not include them.
          </Text>
        </Alert>
      ) : null}

      <List>
        {employments.map((e) => (
          <ListItem key={e.id}>
            <Stack gap="tight">
              <Text variant="emphasis">{e.jobTitle}</Text>
              {/* The period reads as a range, with an open end left open. */}
              <Text>{period(e)}</Text>
              <Text tone="muted">
                Paid {e.payBasis} · recorded {e.recordedAt.slice(0, 10)}
              </Text>
              {wasBackdated(e) ? (
                // Words, not only a tone: the row states the fact so it survives
                // being read aloud, printed, or seen by someone who cannot
                // distinguish the ink.
                <Text tone="danger">Recorded after it took effect</Text>
              ) : null}
            </Stack>
          </ListItem>
        ))}
      </List>
    </Stack>
  )
}

export function EmployeeProfile({
  asOf,
  employee,
  employments,
}: {
  readonly asOf: string
  readonly employee: ProfileEmployee
  readonly employments: readonly ProfileEmployment[]
}) {
  return (
    <Stack gap="loose">
      <Identity asOf={asOf} employee={employee} />

      <Stack aria-labelledby="employee-timeline-heading" gap="normal" role="region">
        <Heading id="employee-timeline-heading" level={2}>
          Employment
        </Heading>
        <Text tone="muted">
          Every period at this employer, earliest first. Periods are half-open: a row ends the day
          before the next begins.
        </Text>
        <Timeline employments={employments} />
      </Stack>
    </Stack>
  )
}
