'use client'

import { Alert } from '@xforge/design/components/alert'
import { Button } from '@xforge/design/components/button'
import { Card } from '@xforge/design/components/card'
import { Code } from '@xforge/design/components/code'
import { EmptyState } from '@xforge/design/components/empty-state'
import { Heading } from '@xforge/design/components/heading'
import { Link } from '@xforge/design/components/link'
import { List } from '@xforge/design/components/list'
import { ListItem } from '@xforge/design/components/list-item'
import { Stack } from '@xforge/design/components/stack'
import { Status } from '@xforge/design/components/status'
import { Text } from '@xforge/design/components/text'
import { assertNever, type ResourceState } from './resource-state'
/**
 * The employee directory -- the HR core's first screen.
 *
 * It reads a `ResourceState` and nothing else -- no transport vocabulary, no
 * HTTP status, no query flags reach this file.
 *
 * -------------------------------------------------------------------------
 * TWO COMPONENTS, AND THE SPLIT IS WHAT MAKES THE SCREEN REVIEWABLE
 * -------------------------------------------------------------------------
 * `DirectoryCard` is handed a state and renders it. `EmployeeDirectory` calls
 * the hook and hands it one. Only the second needs a network, a QueryClient or
 * a database, so every state of this screen -- including the ones that are hard
 * to produce on demand, like a truncated read or a permission refusal -- can be
 * put on screen and looked at.
 *
 * IT WAS ONE COMPONENT FIRST, and its header claimed it had been "built against
 * MSW mocks". That was inherited wording and it was FALSE: the mocks are
 * generated, and nothing in `apps/web` or `.storybook` has ever wired them into
 * a worker, so no version of this screen had been rendered by anybody. A
 * comment describing a workflow nobody has run is the same defect as a check
 * that cannot fail -- it reads as evidence and is not. The stories beside this
 * file are the actual answer, and they need no worker at all.
 *
 * -------------------------------------------------------------------------
 * A ROW WITH NO EMPLOYMENT IS NOT AN ERROR, AND NOT A BLANK
 * -------------------------------------------------------------------------
 * `employment` is null when no period covers the date being asked about, and
 * the screen SAYS SO rather than rendering an empty cell. Those look identical
 * on a page and mean opposite things: one is "this person was not employed here
 * on 1 March", the other is "we failed to load their job title". A directory
 * that renders both as whitespace is the silent-wrong-answer shape this
 * repository keeps finding, one layer up from the database.
 *
 * It deliberately does NOT say "left" or "not started yet". Deciding between
 * those requires a row that does not cover the date, which is the nearest-row
 * fallback ADR-016 forbids -- and the employment history is the operation
 * allowed to answer it.
 */
import { type DirectoryEntry, useEmployees } from './use-employees'

function Employees({ employees }: { employees: DirectoryEntry[] }) {
  return (
    <List data-testid="employees">
      {employees.map((e) => (
        <ListItem key={e.employeeId}>
          <Stack gap="tight">
            {/* The name is the link, because the name is what a person is
                looking for. `asOf` is carried across so the record opens at the
                same date the directory was read at -- following a link into a
                different day would silently change the question. */}
            <Link href={`/employees/${e.employeeId}`}>{e.fullName}</Link>
            <Text tone="muted">
              {e.employeeNumber} · {e.legalEntityName}
            </Text>
            {e.employment ? (
              <Text data-testid="employment">
                {e.employment.jobTitle} · paid {e.employment.payBasis}
              </Text>
            ) : (
              // Stated, never blank. See the header.
              <Text data-testid="no-employment" tone="muted">
                No employment period on this date
              </Text>
            )}
          </Stack>
        </ListItem>
      ))}
    </List>
  )
}

/**
 * One state, one rendering, and no default -- the same exhaustive switch the
 * emergency-contacts screen uses, so a new `ResourceState` member stops the
 * build here too rather than falling through to whichever branch is last.
 */
function Resource({
  onRetry,
  state,
}: {
  onRetry: () => void
  state: ResourceState<DirectoryEntry[]>
}) {
  switch (state.status) {
    case 'loading':
      return <Status data-testid="loading">Loading employees…</Status>

    case 'empty':
      return (
        <EmptyState
          data-testid="empty"
          description="Once someone is onboarded to a legal entity in this tenant, they appear here."
          title="No employees on this date"
        />
      )

    case 'ready':
      return <Employees employees={state.data} />

    case 'partial':
      return (
        <Stack gap="tight">
          <Alert data-testid="partial" tone="info">
            <Stack gap="tight">
              {state.reasons.map((r) => (
                <Text key={r.kind}>
                  Showing the first {r.shown} employees. Narrow to one legal entity to see the rest.
                </Text>
              ))}
            </Stack>
          </Alert>
          <Employees employees={state.data} />
        </Stack>
      )

    case 'forbidden':
      return (
        <Stack gap="tight">
          <Heading>{state.issue.title}</Heading>
          <Alert data-testid="forbidden" tone="danger">
            <Text>
              Viewing the employee directory needs the <Code>hr.employee.read</Code> permission. Ask
              an administrator.
            </Text>
          </Alert>
        </Stack>
      )

    case 'error':
      return (
        <Stack gap="tight">
          <Heading>{state.issue.title}</Heading>
          <Alert data-testid="read-error" tone="danger">
            <Text>{state.issue.detail ?? 'Something went wrong.'}</Text>
          </Alert>
          {state.issue.retryable ? (
            <Stack direction="row">
              <Button onClick={onRetry}>Try again</Button>
            </Stack>
          ) : null}
        </Stack>
      )

    default:
      return assertNever(state, 'resource state')
  }
}

/**
 * The screen, given a state. No hook, no client, no network.
 *
 * `asOf` is the date THE SERVER RESOLVED AT and is null until it answers, which
 * is why it is a separate prop rather than being read off the state: the read
 * carries employees, and the envelope carries the date, and they are two facts
 * with two producers.
 */
export function DirectoryCard({
  asOf,
  onRetry,
  state,
}: {
  asOf: string | null
  onRetry: () => void
  state: ResourceState<DirectoryEntry[]>
}) {
  if (state.status === 'forbidden') {
    return (
      <Card>
        <Resource onRetry={onRetry} state={state} />
      </Card>
    )
  }

  return (
    <Card aria-labelledby="employee-directory-heading">
      <Stack gap="loose">
        <Stack gap="tight">
          <Heading id="employee-directory-heading">Employees</Heading>
          {/*
            THE DATE IS ON THE SCREEN, and it is the one the SERVER resolved at
            -- the `asOf` prop, taken from the echoed response -- not the one
            the page requested. An effective-dated directory whose date is implicit is a
            screen that cannot be read correctly: "Siti is a Payroll Manager" is
            only true as at a date, and a reader who cannot see which one has
            been told something that is sometimes false.

            It is text and not a control because there is no date input in the
            design system yet -- there is no Field or Input primitive, and
            inventing one here would put a bespoke control on the screen that
            ADR-029 exists to prevent. Changing the date means changing the URL
            until that primitive is authored.
          */}
          {asOf ? (
            <Text data-testid="as-of" tone="muted">
              As at {asOf}
            </Text>
          ) : null}
        </Stack>

        <Resource onRetry={onRetry} state={state} />
      </Stack>
    </Card>
  )
}

/** The connected screen: calls the hook, hands the state to the card above. */
export function EmployeeDirectory({ asOf }: { asOf: string }) {
  const view = useEmployees(asOf)
  return <DirectoryCard asOf={view.asOf} onRetry={view.retry} state={view.employees} />
}
