'use client'

import {
  ApiProblem,
  type EmergencyContact,
  useCreateEmergencyContact,
  useListEmergencyContacts,
  useUpdateEmergencyContact,
} from '@xforge/api-client'
import { Alert, Button, Card, Code, Heading, List, ListItem, Stack, Status, Text } from '@xforge/ui'
/**
 * Emergency contacts -- the design system's representative screen.
 *
 * Every state was designed before the API existed, against MSW mocks:
 *
 *   loading · empty · error · permission-denied · version-conflict · success
 *
 * Phase 2 changes how they are BUILT, not which exist. There is no `className`,
 * no `style`, and no raw element with an appearance -- only composed primitives.
 * A guard enforces that, because "no bespoke CSS" is otherwise a habit rather
 * than a property, and habits are what the first urgent screen abandons.
 *
 * Accessibility is inherited rather than re-decided here: the alert tones carry
 * their own roles and politeness, the buttons carry the one focus ring, and the
 * heading level is a prop so the document outline stays correct.
 */
import { useState } from 'react'

export function EmergencyContacts({ employeeId }: { employeeId: string }) {
  const list = useListEmergencyContacts(employeeId)
  const [conflict, setConflict] = useState<string | null>(null)

  const create = useCreateEmergencyContact({
    mutation: { onSuccess: () => list.refetch() },
  })

  const update = useUpdateEmergencyContact({
    mutation: {
      onSuccess: () => {
        setConflict(null)
        list.refetch()
      },
      onError: (err: unknown) => {
        // ADR-013: a stale write is rejected, never merged. The user is told
        // what happened and shown current state -- silently losing their edit
        // is the failure this rule exists to prevent.
        if (err instanceof ApiProblem && err.isVersionConflict) {
          setConflict(
            'Someone else changed this contact while you were editing. Reloaded below — please re-apply your change.',
          )
          list.refetch()
        }
      },
    },
  })

  // ---------------------------------------------------------------- states

  if (list.isPending) {
    return <Status>Loading emergency contacts…</Status>
  }

  if (list.isError) {
    const err = list.error as unknown
    if (err instanceof ApiProblem && err.isForbidden) {
      return (
        <Card>
          <Stack gap="tight">
            <Heading>You don’t have access to this</Heading>
            <Alert tone="danger">
              <Text>
                Viewing emergency contacts needs the <Code>hr.employee.read</Code> permission. Ask
                an administrator.
              </Text>
            </Alert>
          </Stack>
        </Card>
      )
    }
    return (
      <Card>
        <Stack gap="tight">
          <Heading>Couldn’t load emergency contacts</Heading>
          <Alert tone="danger">
            <Text>{err instanceof ApiProblem ? err.problem.detail : 'Something went wrong.'}</Text>
          </Alert>
          <Stack direction="row">
            <Button onClick={() => list.refetch()}>Try again</Button>
          </Stack>
        </Stack>
      </Card>
    )
  }

  const items: EmergencyContact[] = list.data?.items ?? []

  return (
    <Card labelledBy="emergency-contacts-heading">
      <Stack gap="loose">
        <Heading id="emergency-contacts-heading">Emergency contacts</Heading>

        {conflict && (
          // WARNING, not danger: nothing is broken. The write was refused and
          // the user has a decision to make, which is a different thing to tell
          // somebody than "this failed".
          <Alert tone="warning" testId="conflict">
            <Text>{conflict}</Text>
          </Alert>
        )}

        {items.length === 0 ? (
          <Alert tone="info" testId="empty">
            <Text>No emergency contacts yet. Add one so we know who to call.</Text>
          </Alert>
        ) : (
          <List testId="contacts">
            {items.map((c) => (
              <ListItem key={c.id}>
                <Stack gap="tight">
                  <Text>
                    {c.name} · {c.relationship}
                  </Text>
                  <Text tone="muted">{c.phone}</Text>
                </Stack>
                <Button
                  onClick={() =>
                    update.mutate({
                      id: c.id,
                      // The version the client READ. The server rejects if it has moved on.
                      data: { phone: c.phone, version: c.version },
                    })
                  }
                >
                  Save
                </Button>
              </ListItem>
            ))}
          </List>
        )}

        <Stack direction="row">
          <Button
            variant="primary"
            disabled={create.isPending}
            onClick={() =>
              create.mutate({
                employeeId,
                data: { name: 'New contact', relationship: 'Spouse', phone: '+60 12-000 0000' },
              })
            }
          >
            {create.isPending ? 'Adding…' : 'Add contact'}
          </Button>
        </Stack>
      </Stack>
    </Card>
  )
}
