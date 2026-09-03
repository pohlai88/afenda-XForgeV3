import type { Meta, StoryObj } from '@storybook/react-vite'
import { Card } from '@xforge/design/components/card'
import { STACK_DIRECTION, STACK_GAP, Stack } from '@xforge/design/components/stack'
import { Text } from '@xforge/design/components/text'

/**
 * Direction times gap. Every gap is a token rebound by density, so this is the clearest place to watch the compact axis work.
 *
 * Read through the package entry point, never a relative path (ADR-033), and never the
 * vendored tree -- the application cannot reach it, so a story of it would frame
 * something no screen can render.
 */

const DIRECTIONS = Object.keys(STACK_DIRECTION) as (keyof typeof STACK_DIRECTION)[]
const GAPS = Object.keys(STACK_GAP) as (keyof typeof STACK_GAP)[]

const meta = {
  argTypes: {
    direction: { control: 'select', options: DIRECTIONS },
    gap: { control: 'select', options: GAPS },
  },
  component: Stack,
  title: 'Design/Stack',
} satisfies Meta<typeof Stack>

export default meta
type Story = StoryObj<typeof meta>

const boxes = () =>
  [1, 2, 3].map((n) => (
    <Card key={n}>
      <Text>{n}</Text>
    </Card>
  ))

export const Playground: Story = {
  args: { direction: 'row', gap: 'normal' },
  render: (args) => <Stack {...args}>{boxes()}</Stack>,
}

export const EveryGap: Story = {
  render: () => (
    <Stack gap="loose">
      {GAPS.map((gap) => (
        <Stack direction="row" gap={gap} key={gap}>
          {boxes()}
        </Stack>
      ))}
    </Stack>
  ),
}
