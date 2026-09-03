import { Link, Stack, Text } from '@xforge/design'

/**
 * Link previews — an anchor in the language.
 *
 * Underlined at rest, so the affordance never rests on colour alone; the default ink;
 * the one focus ring. `current` marks the anchor for assistive technology
 * (`aria-current="page"`) and by weight, not by colour.
 */

/** At rest, in a sentence. */
export const InProse = () => (
  <Text>
    Back to <Link href="/employees">Employees</Link>.
  </Text>
)

/** An index: several anchors in a row, one of them current. */
export const Index = () => (
  <Stack direction="row" gap="normal">
    <Link href="#alert">Alert</Link>
    <Link current href="#button">
      Button
    </Link>
    <Link href="#card">Card</Link>
  </Stack>
)
