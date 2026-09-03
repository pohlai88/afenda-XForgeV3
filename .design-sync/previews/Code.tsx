import { Code, Stack, Text } from '@xforge/design'

/**
 * Code previews — an inline monospace span for an identifier a person may need
 * to read back or quote in a ticket.
 *
 * It sets tabular-nums deliberately: an id or a reference number should not
 * shift width digit by digit. IBM Plex Mono is the family, from the token file.
 */

/** Inline in a sentence, which is the only place it appears. */
export const Inline = () => (
  <Text>
    Employee <Code>EMP-004821</Code> has no primary contact on file.
  </Text>
)

/** A reference in an error line — the failed-write case. */
export const InAnError = () => (
  <Stack gap="tight">
    <Text>The contact could not be saved.</Text>
    <Text tone="muted">
      Quote reference <Code>req_8f21c0a4</Code> if you contact support.
    </Text>
  </Stack>
)

/** Digits line up: tabular-nums means these three read as a column, not a jumble. */
export const TabularDigits = () => (
  <Stack gap="tight">
    <Text>
      <Code>EMP-000412</Code>
    </Text>
    <Text>
      <Code>EMP-118820</Code>
    </Text>
    <Text>
      <Code>EMP-904117</Code>
    </Text>
  </Stack>
)
