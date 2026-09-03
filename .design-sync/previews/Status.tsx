import { Stack, Status, Text } from '@xforge/design'

/**
 * Status previews — a polite live region for work in progress.
 *
 * It renders role="status" with aria-live="polite" and aria-busy="true", and
 * those three are not overridable: the Target omits them from its props, so a
 * caller cannot accidentally make a loading line silent. Nothing here spins;
 * the announcement IS the affordance.
 */

/** The loading line the contacts section renders. */
export const Loading = () => <Status>Loading emergency contacts…</Status>

/** A longer-running job, worded so a screen reader hears what is happening. */
export const LongRunning = () => <Status>Calculating payroll for 1,284 employees…</Status>

/** In place: the status line standing in for content that has not arrived. */
export const InASection = () => (
  <Stack gap="tight">
    <Text variant="emphasis">Emergency contacts</Text>
    <Status>Loading emergency contacts…</Status>
  </Stack>
)
