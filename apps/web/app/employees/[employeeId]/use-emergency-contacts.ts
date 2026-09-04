/**
 * The one place that decides what the emergency-contacts screen is looking at.
 *
 * Before this existed the screen read `list.isPending`, `list.isError`,
 * `err.isForbidden` and `items.length === 0` itself, and kept the conflict text
 * in its own `useState`. That is a second state machine: individually correct,
 * and a second source for a fact the mapper already owns. It also silently
 * dropped `meta`, so a truncated list rendered as a complete one -- the screen
 * was not merely duplicating the model, it was contradicting it.
 *
 * TRANSPORT ENDS HERE. This file may name react-query and the generated client;
 * the component may not, and a guard enforces that rather than a convention.
 *
 * TWO WRITES, TWO OUTCOMES. `add` and `save` are independent mutations and each
 * carries its own `WriteOutcome`. Merging them into "the current write" would
 * invent a concept nothing produces, and the screen genuinely needs both at once
 * -- a conflict banner above a list while the add button is idle.
 */
import {
  type EmergencyContact,
  useCreateEmergencyContact,
  useListEmergencyContacts,
  useUpdateEmergencyContact,
} from '@xforge/api-client'
import {
  type ResourceState,
  readOutcomeOf,
  toResourceState,
  toWriteOutcome,
  type WriteOutcome,
  writeOutcomeOf,
} from '../resource-state'

export type Contact = EmergencyContact

export interface EmergencyContactsView {
  add: { outcome: WriteOutcome; run: () => void }
  contacts: ResourceState<Contact[]>
  retry: () => void
  save: { outcome: WriteOutcome; run: (contact: Contact) => void }
}

export function useEmergencyContacts(employeeId: string): EmergencyContactsView {
  const list = useListEmergencyContacts(employeeId)

  const create = useCreateEmergencyContact({
    mutation: { onSuccess: () => list.refetch() },
  })

  const update = useUpdateEmergencyContact({
    mutation: {
      // ADR-013: a stale write is rejected, never merged. Refetching is what
      // makes the banner's promise true -- the user is looking at current state
      // when they re-apply. The banner's WORDS come from the mapper; this hook
      // does not compose user-facing copy.
      onError: () => list.refetch(),
      onSuccess: () => list.refetch(),
    },
  })

  return {
    add: {
      outcome: toWriteOutcome(writeOutcomeOf(create.status, create.error)),
      run: () =>
        create.mutate({
          data: { name: 'New contact', phone: '+60 12-000 0000', relationship: 'Spouse' },
          employeeId,
        }),
    },
    contacts: toResourceState(readOutcomeOf(list.status, list.error, list.data)),
    retry: () => {
      list.refetch()
    },
    save: {
      outcome: toWriteOutcome(writeOutcomeOf(update.status, update.error)),
      run: (contact: Contact) =>
        update.mutate({
          // The version the client READ. The server rejects if it has moved on.
          data: { phone: contact.phone, version: contact.version },
          id: contact.id,
        }),
    },
  }
}
