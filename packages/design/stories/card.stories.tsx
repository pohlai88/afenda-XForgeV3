import type { Meta, StoryObj } from '@storybook/react-vite'
import { Card } from '@xforge/design/components/card'
import { Heading } from '@xforge/design/components/heading'
import { Stack } from '@xforge/design/components/stack'
import { Text } from '@xforge/design/components/text'

/**
 * A surface with no variants of its own: what it proves is the ground, the border and the radius against the theme.
 *
 * Read through the package entry point, never a relative path (ADR-033), and never the
 * vendored tree -- the application cannot reach it, so a story of it would frame
 * something no screen can render.
 */

const meta = { component: Card, title: 'Design/Card' } satisfies Meta<typeof Card>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card>
      <Stack gap="tight">
        <Heading level={2}>Emergency contacts</Heading>
        <Text tone="muted">Two contacts on file for this employee.</Text>
      </Stack>
    </Card>
  ),
}
