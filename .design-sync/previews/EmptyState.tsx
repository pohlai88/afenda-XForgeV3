import { EmptyState, Stack } from '@xforge/design'

/**
 * EmptyState previews.
 *
 * `title` is required and `description` optional — the component owns the pair,
 * so an empty state cannot ship as a bare sentence with no heading. Both are
 * plain strings, not children: there is one way to write one.
 */

/** Title and description — the full form. */
export const Full = () => (
  <EmptyState
    description="Add one so we know who to call outside working hours."
    title="No emergency contacts yet"
  />
)

/** Title alone, when the next step is obvious from context. */
export const TitleOnly = () => <EmptyState title="No results for that search" />

/** Two side by side, so the vertical rhythm reads consistently. */
export const Variations = () => (
  <Stack gap="loose">
    <EmptyState
      description="Add one so we know who to call outside working hours."
      title="No emergency contacts yet"
    />
    <EmptyState
      description="Once a pay run completes, its payslips appear here."
      title="No payslips for this period"
    />
  </Stack>
)
