import { Card, Heading, Page, Stack, Text } from '@xforge/design'

/**
 * Page previews — the application shell.
 *
 * It sets the page background, the body font and the base text colour, and it
 * is the only place those three are decided. Everything else inherits. A design
 * that forgets it renders on the browser's white with the browser's font.
 */

/** The shell with a heading and a card on it — the shape every screen takes. */
export const Shell = () => (
  <Page>
    <Stack gap="normal">
      <Heading level={1}>Employee</Heading>
      <Card>
        <Stack gap="tight">
          <Heading level={2}>Emergency contacts</Heading>
          <Text tone="muted">Two contacts on file.</Text>
        </Stack>
      </Card>
    </Stack>
  </Page>
)

/** The page ground against a card surface — the contrast every screen relies on. */
export const SurfaceContrast = () => (
  <Page>
    <Stack gap="normal">
      <Text tone="muted">This paragraph sits directly on the page.</Text>
      <Card>
        <Stack gap="tight">
          <Text variant="emphasis">And this one sits on a card</Text>
          <Text tone="muted">
            The card is the lighter surface; the page is the ground behind it.
          </Text>
        </Stack>
      </Card>
    </Stack>
  </Page>
)
