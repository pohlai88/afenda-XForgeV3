import { Button, List, ListItem, Stack, Text } from '@xforge/design'

/**
 * List previews.
 *
 * A `ul` with the bullets and padding removed and a tight gap between rows. It
 * carries no axis: what varies is what a ListItem holds, so these cards show
 * the compositions the screen actually builds.
 */

/** The contacts list, exactly as emergency-contacts.tsx composes it. */
export const Contacts = () => (
  <List>
    <ListItem>
      <Stack gap="tight">
        <Text>Priya Raman · Spouse</Text>
        <Text tone="muted">+60 12-345 6789</Text>
      </Stack>
      <Button>Save</Button>
    </ListItem>
    <ListItem>
      <Stack gap="tight">
        <Text>Arun Raman · Parent</Text>
        <Text tone="muted">+60 19-887 2231</Text>
      </Stack>
      <Button>Save</Button>
    </ListItem>
  </List>
)

/** A single row — the smallest true list. */
export const SingleRow = () => (
  <List>
    <ListItem>
      <Stack gap="tight">
        <Text>Priya Raman · Spouse</Text>
        <Text tone="muted">+60 12-345 6789</Text>
      </Stack>
    </ListItem>
  </List>
)

/** Read-only rows: no action, so the row is just its two lines. */
export const ReadOnly = () => (
  <List>
    <ListItem>
      <Stack gap="tight">
        <Text>Kuala Lumpur</Text>
        <Text tone="muted">642 employees</Text>
      </Stack>
    </ListItem>
    <ListItem>
      <Stack gap="tight">
        <Text>Singapore</Text>
        <Text tone="muted">411 employees</Text>
      </Stack>
    </ListItem>
    <ListItem>
      <Stack gap="tight">
        <Text>Jakarta</Text>
        <Text tone="muted">231 employees</Text>
      </Stack>
    </ListItem>
  </List>
)
