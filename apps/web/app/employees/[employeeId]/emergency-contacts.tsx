'use client'

import {
  ApiProblem,
  type EmergencyContact,
  useCreateEmergencyContact,
  useListEmergencyContacts,
  useUpdateEmergencyContact,
} from '@xforge/api-client'
/**
 * Emergency contacts -- the spine phase's vertical slice.
 *
 * This component was written and reviewed against MSW mocks before a handler
 * or a database existed. That is the property the whole contract-first pipeline
 * buys, and it is why every state below is real rather than a TODO:
 *
 *   loading · empty · error · permission-denied · version-conflict · success
 *
 * The architecture requires these to be designed BEFORE API implementation
 * (architecture-final.md 20.1). Building against mocks is what makes that
 * possible rather than aspirational.
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
    return (
      <p role="status" aria-live="polite">
        Loading emergency contacts…
      </p>
    )
  }

  if (list.isError) {
    const err = list.error as unknown
    if (err instanceof ApiProblem && err.isForbidden) {
      return (
        <section role="alert">
          <h2>You don’t have access to this</h2>
          <p>
            Viewing emergency contacts needs the <code>hr.employee.read</code> permission. Ask an
            administrator.
          </p>
        </section>
      )
    }
    return (
      <section role="alert">
        <h2>Couldn’t load emergency contacts</h2>
        <p>{err instanceof ApiProblem ? err.problem.detail : 'Something went wrong.'}</p>
        <button type="button" onClick={() => list.refetch()}>
          Try again
        </button>
      </section>
    )
  }

  const items: EmergencyContact[] = list.data?.items ?? []

  return (
    <section>
      <h2>Emergency contacts</h2>

      {conflict && (
        <p role="alert" data-testid="conflict">
          {conflict}
        </p>
      )}

      {items.length === 0 ? (
        <p data-testid="empty">No emergency contacts yet. Add one so we know who to call.</p>
      ) : (
        <ul data-testid="contacts">
          {items.map((c) => (
            <li key={c.id}>
              <strong>{c.name}</strong> · {c.relationship} · {c.phone}
              <button
                type="button"
                onClick={() =>
                  update.mutate({
                    id: c.id,
                    // The version the client READ. The server rejects if it has moved on.
                    data: { phone: c.phone, version: c.version },
                  })
                }
              >
                Save
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={create.isPending}
        onClick={() =>
          create.mutate({
            employeeId,
            data: { name: 'New contact', relationship: 'Spouse', phone: '+60 12-000 0000' },
          })
        }
      >
        {create.isPending ? 'Adding…' : 'Add contact'}
      </button>
    </section>
  )
}
