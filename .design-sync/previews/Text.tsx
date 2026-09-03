import { Stack, Text } from '@xforge/design'

/**
 * Text previews, composed from the vocabulary the employee screen actually uses.
 *
 * Content is HR/payroll domain, not lorem: these cards are browsed by people and
 * imitated by the design agent, so a placeholder here becomes a placeholder in
 * every design built from it.
 */

/** The four roles the type scale has, top to bottom in rank order. */
export const Variants = () => (
  <Stack gap="normal">
    <Text variant="display">1,284</Text>
    <Text variant="emphasis">Emergency contacts</Text>
    <Text variant="body">
      Every employee should have at least one contact we can reach outside working hours.
    </Text>
    <Text variant="label">Relationship</Text>
  </Stack>
)

/** The four tones. `muted` is "still true, less urgent" — never used to hide something actionable. */
export const Tones = () => (
  <Stack gap="tight">
    <Text tone="default">Priya Raman · Spouse</Text>
    <Text tone="muted">+60 12-345 6789</Text>
    <Text tone="success">Payroll run completed</Text>
    <Text tone="danger">Bank details could not be verified</Text>
  </Stack>
)

/**
 * A trend, and the rule that governs it: a tone names MEANING, not direction,
 * and never carries the meaning alone. The delta is words with a sign in front
 * of it, so the colour is reinforcement rather than the only signal.
 */
export const Trend = () => (
  <Stack direction="row" gap="loose">
    <Stack gap="tight">
      <Text tone="muted" variant="label">
        Overtime hours
      </Text>
      <Text variant="display">312</Text>
      <Text tone="success">−8.4% vs last month</Text>
    </Stack>
    <Stack gap="tight">
      <Text tone="muted" variant="label">
        Open exceptions
      </Text>
      <Text variant="display">17</Text>
      <Text tone="danger">+5 vs last month</Text>
    </Stack>
  </Stack>
)

/** The two-line row the contacts list is built from — the screen's real pattern. */
export const InARow = () => (
  <Stack gap="tight">
    <Text>Priya Raman · Spouse</Text>
    <Text tone="muted">+60 12-345 6789</Text>
  </Stack>
)
