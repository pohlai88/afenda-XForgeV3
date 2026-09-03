import { Button, Stack, Text } from '@xforge/design'

/**
 * Button previews.
 *
 * Xforge owns exactly one axis here — `variant: primary | outline` — the two
 * words the real screens use. Upstream's `destructive`, `ghost`, `link`,
 * `secondary` and the whole `size` axis are deliberately not adopted, so they
 * are deliberately not shown.
 */

/** The axis, both values, side by side. */
export const Variants = () => (
  <Stack direction="row" gap="normal">
    <Button>Save</Button>
    <Button variant="outline">Try again</Button>
  </Stack>
)

/** Disabled is behaviour, not a variant — it comes from the element. */
export const Disabled = () => (
  <Stack direction="row" gap="normal">
    <Button disabled>Save</Button>
    <Button disabled variant="outline">
      Try again
    </Button>
  </Stack>
)

/**
 * The pairing the error boundary actually renders: an outline retry beside the
 * copy explaining what failed.
 */
export const InAFailure = () => (
  <Stack gap="tight">
    <Text>We could not load emergency contacts.</Text>
    <Stack direction="row" gap="tight">
      <Button variant="outline">Try again</Button>
    </Stack>
  </Stack>
)

/** The row action from the contacts list — a primary button ending a list row. */
export const InAListRow = () => (
  <Stack direction="row" gap="loose">
    <Stack gap="tight">
      <Text>Priya Raman · Spouse</Text>
      <Text tone="muted">+60 12-345 6789</Text>
    </Stack>
    <Button>Save</Button>
  </Stack>
)
