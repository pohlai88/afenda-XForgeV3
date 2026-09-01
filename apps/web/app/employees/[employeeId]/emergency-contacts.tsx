'use client'

import { Alert, Button, Card, Code, Heading, List, ListItem, Stack, Status, Text } from '@xforge/ui'
import { assertNever, type ResourceState, type WriteOutcome } from '@xforge/ui/state'
/**
 * Emergency contacts -- the design system's representative screen.
 *
 * Every state was designed before the API existed, against MSW mocks. What
 * changed at 4C.0 is not which states exist but WHO DECIDES which one holds:
 * this file used to read `isPending`, `isError`, `isForbidden` and
 * `items.length` itself, which made it a second interpreter of the same facts.
 * It now reads a `ResourceState` and a `WriteOutcome` and nothing else.
 *
 * NO TRANSPORT VOCABULARY REACHES HERE. No `ApiProblem`, no HTTP status, no
 * query flags, no generated client -- a guard enforces it, because the previous
 * version of this comment was true and unenforced right up until it was not.
 *
 * The read state and the write outcome are ORTHOGONAL, not seven mutually
 * exclusive screens. `ready` + `conflict` is a real and common combination: a
 * perfectly good list with a refused edit above it. Rendering them on one axis
 * would have forced a choice between showing the list and showing the problem.
 *
 * Accessibility is inherited rather than re-decided here: the alert tones carry
 * their own roles and politeness, the buttons carry the one focus ring, and the
 * heading level is a prop so the document outline stays correct.
 */
import { type Contact, useEmergencyContacts } from './use-emergency-contacts'

/** The banner for a refused write. Its words come from the mapper, not here. */
function WriteProblem({ outcome }: { outcome: WriteOutcome }) {
  if (outcome.status === 'conflict') {
    // WARNING, not danger: nothing is broken. The write was refused and the
    // user has a decision to make, which is a different thing to tell somebody
    // than "this failed".
    return (
      <Alert testId="conflict" tone="warning">
        <Stack gap="tight">
          <Text>{outcome.conflict.title}</Text>
          {outcome.conflict.detail ? <Text tone="muted">{outcome.conflict.detail}</Text> : null}
        </Stack>
      </Alert>
    )
  }
  if (outcome.status === 'failed') {
    return (
      <Alert testId="write-failed" tone="danger">
        <Text>{outcome.issue.title}</Text>
      </Alert>
    )
  }
  return null
}

function Contacts({ contacts, onSave }: { contacts: Contact[]; onSave: (c: Contact) => void }) {
  return (
    <List testId="contacts">
      {contacts.map((c) => (
        <ListItem key={c.id}>
          <Stack gap="tight">
            <Text>
              {c.name} · {c.relationship}
            </Text>
            <Text tone="muted">{c.phone}</Text>
          </Stack>
          <Button onClick={() => onSave(c)}>Save</Button>
        </ListItem>
      ))}
    </List>
  )
}

/**
 * One state, one rendering, and no default.
 *
 * The switch is exhaustive over `ResourceState` for the same reason the mapper
 * is exhaustive over the wire: a new state must stop the build and force
 * somebody to decide what it looks like, rather than falling through to
 * whatever the last branch happened to be.
 */
function Resource({
  state,
  onRetry,
  onSave,
}: {
  onRetry: () => void
  onSave: (c: Contact) => void
  state: ResourceState<Contact[]>
}) {
  switch (state.status) {
    case 'loading':
      return <Status>Loading emergency contacts…</Status>

    case 'empty':
      return (
        <Alert testId="empty" tone="info">
          <Text>No emergency contacts yet. Add one so we know who to call.</Text>
        </Alert>
      )

    case 'ready':
      return <Contacts contacts={state.data} onSave={onSave} />

    // Usable data with bounded uncertainty. The list is shown because it is
    // real; the notice is shown because it is incomplete. Neither on its own
    // would be honest, which is why this is not `ready` and not `error`.
    case 'partial':
      return (
        <Stack gap="tight">
          <Alert testId="partial" tone="info">
            <Stack gap="tight">
              {state.reasons.map((r) => (
                <Text key={r.kind}>
                  Showing the first {r.shown} contacts. Narrow your search to see the rest.
                </Text>
              ))}
            </Stack>
          </Alert>
          <Contacts contacts={state.data} onSave={onSave} />
        </Stack>
      )

    case 'forbidden':
      return (
        <Stack gap="tight">
          <Heading>{state.issue.title}</Heading>
          <Alert tone="danger">
            <Text>
              Viewing emergency contacts needs the <Code>hr.employee.read</Code> permission. Ask an
              administrator.
            </Text>
          </Alert>
        </Stack>
      )

    case 'error':
      return (
        <Stack gap="tight">
          <Heading>{state.issue.title}</Heading>
          <Alert tone="danger">
            <Text>{state.issue.detail ?? 'Something went wrong.'}</Text>
          </Alert>
          {/* Only when the problem says so. Offering "Try again" for a refusal
              teaches people the control is decorative. */}
          {state.issue.retryable ? (
            <Stack direction="row">
              <Button onClick={onRetry}>Try again</Button>
            </Stack>
          ) : null}
        </Stack>
      )

    // Not `return null`. A state with no rendering is a state nobody decided to
    // show, and rendering nothing is the visual form of the forgiving default
    // the mapper refuses one layer down.
    default:
      return assertNever(state, 'resource state')
  }
}

export function EmergencyContacts({ employeeId }: { employeeId: string }) {
  const { add, contacts, retry, save } = useEmergencyContacts(employeeId)

  // A refused read has nothing to frame: no heading, no add button, no list.
  if (contacts.status === 'forbidden') {
    return (
      <Card>
        <Resource onRetry={retry} onSave={save.run} state={contacts} />
      </Card>
    )
  }

  return (
    <Card labelledBy="emergency-contacts-heading">
      <Stack gap="loose">
        <Heading id="emergency-contacts-heading">Emergency contacts</Heading>

        <WriteProblem outcome={save.outcome} />
        <Resource onRetry={retry} onSave={save.run} state={contacts} />

        <Stack direction="row">
          <Button disabled={add.outcome.status === 'saving'} onClick={add.run} variant="primary">
            {add.outcome.status === 'saving' ? 'Adding…' : 'Add contact'}
          </Button>
        </Stack>
      </Stack>
    </Card>
  )
}
