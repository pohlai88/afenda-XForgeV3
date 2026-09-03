import type { Meta, StoryObj } from '@storybook/react-vite'
import { List } from '@xforge/design/components/list'
import { ListItem } from '@xforge/design/components/list-item'
import { Stack } from '@xforge/design/components/stack'
import { Text } from '@xforge/design/components/text'

/**
 * Framed inside a List, because an item outside its container is styled by nothing and proves nothing.
 *
 * Read through the package entry point, never a relative path (ADR-033), and never the
 * vendored tree -- the application cannot reach it, so a story of it would frame
 * something no screen can render.
 */

const meta = { component: ListItem, title: 'Design/ListItem' } satisfies Meta<typeof ListItem>
export default meta
type Story = StoryObj<typeof meta>

export const InAList: Story = {
  render: () => (
    <List>
      <ListItem>
        <Stack gap="tight">
          <Text>Marlow, J.</Text>
          <Text tone="muted">+44 7700 900112 — spouse</Text>
        </Stack>
      </ListItem>
    </List>
  ),
}
