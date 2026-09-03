import type { Meta, StoryObj } from '@storybook/react-vite'
import { Heading } from '@xforge/design/components/heading'
import { Link } from '@xforge/design/components/link'
import { Shell } from '@xforge/design/components/shell'
import { Stack } from '@xforge/design/components/stack'
import { Text } from '@xforge/design/components/text'

/**
 * Header, nav and body together. It is the only component whose job is the relationship between regions rather than its own surface.
 *
 * Read through the package entry point, never a relative path (ADR-033), and never the
 * vendored tree -- the application cannot reach it, so a story of it would frame
 * something no screen can render.
 */

const meta = { component: Shell, title: 'Design/Shell' } satisfies Meta<typeof Shell>
export default meta
type Story = StoryObj<typeof meta>

export const Full: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <Shell
      header={<Heading level={1}>Xforge</Heading>}
      nav={
        <Stack direction="row" gap="normal">
          <Link current href="#">
            Employees
          </Link>
          <Link href="#">Payroll</Link>
        </Stack>
      }
    >
      <Text>The body region, where a screen renders.</Text>
    </Shell>
  ),
}

export const BodyOnly: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <Shell>
      <Text>No header and no nav: both are optional and the body must still sit correctly.</Text>
    </Shell>
  ),
}
