import type { Meta, StoryObj } from '@storybook/react-vite'
import { Card } from '@xforge/design/components/card'
import { GRID_COLUMNS, Grid } from '@xforge/design/components/grid'
import { Text } from '@xforge/design/components/text'

/**
 * Column counts come from GRID_COLUMNS. The gap is a token, so this is also where a density change shows itself.
 *
 * Read through the package entry point, never a relative path (ADR-033), and never the
 * vendored tree -- the application cannot reach it, so a story of it would frame
 * something no screen can render.
 */

const COLUMNS = Object.keys(GRID_COLUMNS).map(Number) as (keyof typeof GRID_COLUMNS)[]

const meta = {
  argTypes: { columns: { control: 'select', options: COLUMNS } },
  component: Grid,
  title: 'Design/Grid',
} satisfies Meta<typeof Grid>

export default meta
type Story = StoryObj<typeof meta>

/** Stable ids rather than array indices: a key that is a position breaks on reorder. */
const CELL_IDS = ['one', 'two', 'three', 'four'] as const

const cells = (n: number) =>
  CELL_IDS.slice(0, n).map((id) => (
    <Card key={id}>
      <Text>{id}</Text>
    </Card>
  ))

export const Playground: Story = {
  args: { columns: 2 },
  render: (args) => <Grid {...args}>{cells(4)}</Grid>,
}

export const EveryColumnCount: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: 560 }}>
      {COLUMNS.map((columns) => (
        <Grid columns={columns} key={columns}>
          {cells(columns)}
        </Grid>
      ))}
    </div>
  ),
}
