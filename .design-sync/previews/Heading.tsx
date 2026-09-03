import { Heading, Stack, Text } from '@xforge/design'

/**
 * Heading previews.
 *
 * `level` sets the element (h1..h3) AND the type role together, so the document
 * outline and the visual rank cannot drift apart. Semantics are inherent in
 * rendering the element, which is why this component earns no contract table.
 *
 * Worth knowing: Tailwind's preflight sets `h1..h6 { font-size: inherit }`, so a
 * bare <h1> on a screen renders at body size. This primitive is what keeps rank
 * visible — the employee page carries a comment about exactly that.
 */

/** The three ranks, in order. */
export const Levels = () => (
  <Stack gap="normal">
    <Heading level={1}>Employee</Heading>
    <Heading level={2}>Emergency contacts</Heading>
    <Heading level={3}>Primary contact</Heading>
  </Stack>
)

/** A heading with the copy that follows it — the real reading rhythm. */
export const WithBody = () => (
  <Stack gap="tight">
    <Heading level={2}>Emergency contacts</Heading>
    <Text>Every employee should have at least one contact we can reach outside working hours.</Text>
  </Stack>
)

/** A section heading above a labelled figure. */
export const AsSectionTitle = () => (
  <Stack gap="tight">
    <Heading level={3}>This pay period</Heading>
    <Text variant="display">RM 412,900</Text>
  </Stack>
)
