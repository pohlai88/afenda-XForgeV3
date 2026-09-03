import type { Meta, StoryObj } from '@storybook/react-vite'
import { Code } from '@xforge/design/components/code'
import { Text } from '@xforge/design/components/text'

/**
 * Inline monospace. Its job is to sit on the body baseline without disturbing it, which only shows in a sentence.
 *
 * Read through the package entry point, never a relative path (ADR-033), and never the
 * vendored tree -- the application cannot reach it, so a story of it would frame
 * something no screen can render.
 */

const meta = { component: Code, title: 'Design/Code' } satisfies Meta<typeof Code>
export default meta
type Story = StoryObj<typeof meta>

export const InProse: Story = {
  render: () => (
    <Text>
      The period is stored as <Code>[from, to)</Code> and never as a closed range.
    </Text>
  ),
}
