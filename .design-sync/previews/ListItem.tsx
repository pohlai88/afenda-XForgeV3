import { Button, Code, ListItem, Stack, Text } from '@xforge/design'

/**
 * ListItem previews — the bounded row.
 *
 * It brings its own card surface, border, control radius and row padding, so a
 * row is a surface rather than a line of text. Shown outside a List here so the
 * row itself is what you are looking at; in real use it always sits inside one.
 */

/** The two-line row with a trailing action — the contacts pattern. */
export const WithAction = () => (
  <ListItem>
    <Stack gap="tight">
      <Text>Priya Raman · Spouse</Text>
      <Text tone="muted">+60 12-345 6789</Text>
    </Stack>
    <Button>Save</Button>
  </ListItem>
)

/** Two lines, no action. */
export const TwoLine = () => (
  <ListItem>
    <Stack gap="tight">
      <Text>Arun Raman · Parent</Text>
      <Text tone="muted">+60 19-887 2231</Text>
    </Stack>
  </ListItem>
)

/** A row carrying an identifier a person might quote. */
export const WithReference = () => (
  <ListItem>
    <Stack gap="tight">
      <Text>Nurul Hassan · Guardian</Text>
      <Text tone="muted">
        <Code>EMP-004821</Code> · added 12 August
      </Text>
    </Stack>
  </ListItem>
)
