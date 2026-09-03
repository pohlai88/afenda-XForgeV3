import { ListItem, Stack, Text } from '@xforge/design'

/**
 * Stack previews — the layout primitive, and the only one screens use.
 *
 * Two axes: `direction` (column | row) and `gap` (tight | normal | loose). Every
 * gap value is a token role, never a number, so density rebinds all three at
 * once. A screen that needs space says which KIND of space it means.
 */

/**
 * The three gaps, as three stacked groups of full-width rows.
 *
 * NOT three columns side by side: a row lays its children out shrink-to-fit, so
 * three columns of surfaces squeeze each one until its text escapes the border.
 * That is the primitive behaving correctly and the preview composing it badly.
 */
export const Gaps = () => (
  <Stack gap="loose">
    <Stack gap="tight">
      <Text tone="muted" variant="label">
        tight
      </Text>
      <ListItem>
        <Text>Priya Raman · Spouse</Text>
      </ListItem>
      <ListItem>
        <Text>Arun Raman · Parent</Text>
      </ListItem>
    </Stack>
    <Stack gap="normal">
      <Text tone="muted" variant="label">
        normal
      </Text>
      <ListItem>
        <Text>Priya Raman · Spouse</Text>
      </ListItem>
      <ListItem>
        <Text>Arun Raman · Parent</Text>
      </ListItem>
    </Stack>
    <Stack gap="loose">
      <Text tone="muted" variant="label">
        loose
      </Text>
      <ListItem>
        <Text>Priya Raman · Spouse</Text>
      </ListItem>
      <ListItem>
        <Text>Arun Raman · Parent</Text>
      </ListItem>
    </Stack>
  </Stack>
)

/** A row: items centre on the cross axis, which is what a toolbar wants. */
export const Row = () => (
  <Stack direction="row" gap="normal">
    <Text variant="emphasis">Priya Raman</Text>
    <Text tone="muted">Spouse</Text>
    <Text tone="muted">+60 12-345 6789</Text>
  </Stack>
)

/** Nested: the two-line row inside a horizontal group — the contacts pattern. */
export const Nested = () => (
  <Stack direction="row" gap="loose">
    <Stack gap="tight">
      <Text>Priya Raman · Spouse</Text>
      <Text tone="muted">+60 12-345 6789</Text>
    </Stack>
    <Stack gap="tight">
      <Text>Arun Raman · Parent</Text>
      <Text tone="muted">+60 19-887 2231</Text>
    </Stack>
  </Stack>
)
