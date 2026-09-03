import { Alert, Stack, Text } from '@xforge/design'

/**
 * Alert previews — the four tones, and the distinction the component exists for.
 *
 * `warning` and `danger` are NOT the same thing: a refused write (nothing is
 * broken, you have a decision to make) versus a failed one. They were the same
 * class string once, and only the copy told them apart.
 *
 * Tone also decides announcement: danger and warning carry role="alert", info
 * and success carry role="status" (ALERT_TONE, ADR-031 Decision 11). Each tone
 * binds an icon too, so colour never carries the meaning alone.
 */

/** All four tones with the copy each one is actually for. */
export const Tones = () => (
  <Stack gap="tight">
    <Alert tone="info">
      <Text>No emergency contacts yet. Add one so we know who to call.</Text>
    </Alert>
    <Alert tone="success">
      <Text>Emergency contact saved.</Text>
    </Alert>
    <Alert tone="warning">
      <Text>This record changed while you were editing.</Text>
    </Alert>
    <Alert tone="danger">
      <Text>The contact could not be saved.</Text>
    </Alert>
  </Stack>
)

/**
 * A refused write, exactly as the employee screen renders it: two lines inside a
 * tight stack, both at default tone. NOT `muted` on a tint — muted-foreground is
 * measured against the page and the card, never against a warning fill, and axe
 * found that contrast failure the moment the scan was wired up.
 */
export const RefusedWrite = () => (
  <Alert tone="warning">
    <Stack gap="tight">
      <Text>This record changed while you were editing.</Text>
      <Text>Reload to see the current version, then make your change again.</Text>
    </Stack>
  </Alert>
)

/** The empty-list notice — an info tone doing the job of an empty state inline. */
export const EmptyNotice = () => (
  <Alert tone="info">
    <Text>No emergency contacts yet. Add one so we know who to call.</Text>
  </Alert>
)
