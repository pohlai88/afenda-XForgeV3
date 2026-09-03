import type { Meta, StoryObj } from '@storybook/react-vite'
import { Link } from '@xforge/design/components/link'
import { Stack } from '@xforge/design/components/stack'

/**
 * The current state is the one that carries meaning, so it must not be colour alone -- worth checking in dark and in greyscale.
 *
 * Read through the package entry point, never a relative path (ADR-033), and never the
 * vendored tree -- the application cannot reach it, so a story of it would frame
 * something no screen can render.
 */

const meta = { component: Link, title: 'Design/Link' } satisfies Meta<typeof Link>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { args: { children: 'Employees', current: false, href: '#' } }

export const CurrentAndNot: Story = {
  args: { children: '', href: '#' },
  render: () => (
    <Stack direction="row" gap="normal">
      <Link href="#">Employees</Link>
      <Link current href="#">
        Emergency contacts
      </Link>
    </Stack>
  ),
}
