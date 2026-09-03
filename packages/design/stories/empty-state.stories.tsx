import type { Meta, StoryObj } from '@storybook/react-vite'
import { EmptyState } from '@xforge/design/components/empty-state'

/**
 * The state a data surface spends most of its life in before anyone has entered anything.
 *
 * Read through the package entry point, never a relative path (ADR-033), and never the
 * vendored tree -- the application cannot reach it, so a story of it would frame
 * something no screen can render.
 */

const meta = { component: EmptyState, title: 'Design/EmptyState' } satisfies Meta<typeof EmptyState>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: {
    description: 'Add a contact so payroll can reach someone in an emergency.',
    title: 'No emergency contacts',
  },
}

export const TitleOnly: Story = { args: { title: 'No emergency contacts' } }
