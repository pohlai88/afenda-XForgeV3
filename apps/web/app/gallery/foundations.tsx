import { Alert } from '@xforge/design/components/alert'
import { Button } from '@xforge/design/components/button'
import { Card } from '@xforge/design/components/card'
import { Code } from '@xforge/design/components/code'
import { EmptyState } from '@xforge/design/components/empty-state'
import { Heading } from '@xforge/design/components/heading'
import { List } from '@xforge/design/components/list'
import { ListItem } from '@xforge/design/components/list-item'
import { Stack } from '@xforge/design/components/stack'
import { Text } from '@xforge/design/components/text'
import type { State } from './specimens'

/**
 * The type and space dictionaries, shown through the components that wear each role.
 *
 * The gallery cannot write a class, so a type role is shown as the component that
 * selects it -- Heading for the three heading roles, Text for its four variants, Code for
 * the compact body -- and a spacing role as the layout that owns it. The plate reads back
 * which `typography.*` or `space.*` symbol each sample actually drew and what it measured,
 * and names the roles no sample wore, so a role nothing says is visible as a gap rather
 * than invisible as an absence.
 */

const SAMPLE = 'Payroll for September'

export const TYPE_SAMPLES: readonly State[] = [
  { name: 'Heading, level 1', node: <Heading level={1}>{SAMPLE}</Heading> },
  { name: 'Heading, level 2', node: <Heading level={2}>{SAMPLE}</Heading> },
  { name: 'Heading, level 3', node: <Heading level={3}>{SAMPLE}</Heading> },
  { name: 'Text, display', node: <Text variant="display">{SAMPLE}</Text> },
  { name: 'Text, emphasis', node: <Text variant="emphasis">{SAMPLE}</Text> },
  { name: 'Text, body', node: <Text>{SAMPLE}</Text> },
  { name: 'Text, label', node: <Text variant="label">{SAMPLE}</Text> },
  { name: 'Code', node: <Code>EMP-004821</Code> },
]

const block = (label: string) => (
  <Card>
    <Text>{label}</Text>
  </Card>
)

export const SPACE_SAMPLES: readonly State[] = [
  {
    name: 'Stack, tight',
    node: (
      <Stack gap="tight">
        {block('one')}
        {block('two')}
      </Stack>
    ),
  },
  {
    name: 'Stack, normal',
    node: (
      <Stack gap="normal">
        {block('one')}
        {block('two')}
      </Stack>
    ),
  },
  {
    name: 'Stack, loose',
    node: (
      <Stack gap="loose">
        {block('one')}
        {block('two')}
      </Stack>
    ),
  },
  { name: 'Card padding', node: block('The card pads all round') },
  {
    name: 'Alert padding',
    node: (
      <Alert tone="info">
        <Text>Row padding across, control padding down.</Text>
      </Alert>
    ),
  },
  { name: 'Button padding', node: <Button>Save</Button> },
  {
    name: 'Code padding',
    node: (
      <Text>
        Reference <Code>req_8f21c0a4</Code>
      </Text>
    ),
  },
  {
    name: 'List: no indent',
    node: (
      <List>
        <ListItem>
          <Text>Priya Raman · Spouse</Text>
        </ListItem>
      </List>
    ),
  },
  {
    name: 'Empty state: section padding',
    node: <EmptyState title="No results for that search" />,
  },
]
