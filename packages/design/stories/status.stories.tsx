import type { Meta, StoryObj } from '@storybook/react-vite'
import { Status } from '@xforge/design/components/status'

/**
 * A live region. What matters is not how it looks but that it existed before its content changed -- announcement order is not visible here, only in a screen reader.
 *
 * Read through the package entry point, never a relative path (ADR-033), and never the
 * vendored tree -- the application cannot reach it, so a story of it would frame
 * something no screen can render.
 */

const meta = { component: Status, title: 'Design/Status' } satisfies Meta<typeof Status>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { args: { children: 'Saving emergency contact...' } }

export const Settled: Story = { args: { children: 'Emergency contact saved.' } }
