import { Heading, Link, Shell, Stack, Text } from '@xforge/design'

/**
 * Shell previews — the frame a screen sits in.
 *
 * A docked header, a docked rail and the content inset by the container role. Header and
 * rail are slots: a screen with neither still gets the inset, which is the whole reason
 * the root layout would wrap every screen in one.
 */

/** Content only: the inset, no chrome. */
export const ContentOnly = () => (
  <Shell>
    <Text>Every screen sits this far from the edge.</Text>
  </Shell>
)

/** Header and rail, as the gallery uses them. */
export const WithChrome = () => (
  <Shell
    header={<Heading level={1}>Gallery</Heading>}
    nav={
      <Stack gap="tight">
        <Link href="#colour">Colour</Link>
        <Link current href="#alert">
          Alert
        </Link>
        <Link href="#button">Button</Link>
      </Stack>
    }
  >
    <Text>The plates.</Text>
  </Shell>
)
