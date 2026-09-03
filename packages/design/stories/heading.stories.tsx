import type { Meta, StoryObj } from '@storybook/react-vite'
import { Heading } from '@xforge/design/components/heading'
import { Stack } from '@xforge/design/components/stack'

/**
 * Three levels, three typography roles. Side by side is the only way the scale between them is visible.
 *
 * Read through the package entry point, never a relative path (ADR-033), and never the
 * vendored tree -- the application cannot reach it, so a story of it would frame
 * something no screen can render.
 */

const LEVELS = [1, 2, 3] as const

const meta = {
  argTypes: { level: { control: 'select', options: LEVELS } },
  component: Heading,
  title: 'Design/Heading',
} satisfies Meta<typeof Heading>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { args: { children: 'Employment periods', level: 1 } }

export const EveryLevel: Story = {
  render: () => (
    <Stack gap="tight">
      {LEVELS.map((level) => (
        <Heading key={level} level={level}>
          Level {level} — employment periods
        </Heading>
      ))}
    </Stack>
  ),
}
