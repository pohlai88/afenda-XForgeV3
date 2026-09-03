import { Alert } from '@xforge/design/components/alert'
import { Button } from '@xforge/design/components/button'
import { Card } from '@xforge/design/components/card'
import { Code } from '@xforge/design/components/code'
import { Combobox } from '@xforge/design/components/combobox'
import { EmptyState } from '@xforge/design/components/empty-state'
import { Grid } from '@xforge/design/components/grid'
import { Heading } from '@xforge/design/components/heading'
import { List } from '@xforge/design/components/list'
import { ListItem } from '@xforge/design/components/list-item'
import { ResourceBoundary } from '@xforge/design/components/resource-boundary'
import { Specimen } from '@xforge/design/components/specimen'
import { Stack } from '@xforge/design/components/stack'
import { Status } from '@xforge/design/components/status'
import { Switch } from '@xforge/design/components/switch'
import { Text } from '@xforge/design/components/text'
import type { ReactNode } from 'react'

/**
 * Every authored component, in every word it owns, alone.
 *
 * ONE GROUP PER FILE in `packages/design/src/components/`, keyed by the file's name, so
 * the gallery test can hold the two sets equal in both directions: a component with no
 * specimen is a component nobody has looked at, and a specimen with no component is a
 * screen that will not compile. The states inside a group enumerate the component's own
 * axes -- Alert × tone, Button × variant, Text × tone × variant, Heading × level -- with
 * the copy the employee screen actually uses, so what is judged here is what a page does.
 *
 * WHAT IS NOT HERE. A ResourceBoundary catching a thrown child, because the throw would
 * happen during the server render of this page rather than inside the boundary; its own
 * test covers that state. A Combobox with its list open, because the popup is portalled
 * on interaction; open one here and look.
 *
 * Nothing in this file writes a class. The components' props do not admit one.
 */

export interface State {
  readonly name: string
  readonly node: ReactNode
}

export interface Group {
  /** How many frames sit side by side; wide states (a field, a list) take fewer. */
  readonly columns?: 1 | 2 | 3 | 4
  /** The component's file name under `packages/design/src/components/`, without `.tsx`. */
  readonly component: string
  readonly states: readonly State[]
}

/**
 * Authored components the gallery does not frame, each with the reason. The test holds
 * the groups equal to the authored files less exactly these.
 */
export const NOT_SHOWN: Readonly<Record<string, string>> = {
  page: 'the gallery renders on the Page the root layout provides; a Page inside a frame is a viewport-tall empty ground',
}

const RELATIONSHIPS = [
  { label: 'Spouse', value: 'spouse' },
  { label: 'Parent', value: 'parent' },
  { label: 'Sibling', value: 'sibling' },
  { label: 'Child', value: 'child' },
  { label: 'Guardian', value: 'guardian' },
] as const

const contactRow = (name: string, phone: string) => (
  <Stack gap="tight">
    <Text>{name}</Text>
    <Text tone="muted">{phone}</Text>
  </Stack>
)

export const GALLERY: readonly Group[] = [
  {
    component: 'alert',
    states: [
      {
        name: 'The four tones, each with the copy it is for',
        node: (
          <Stack gap="tight">
            <Alert tone="info">
              <Text>No emergency contacts yet. Add one so we know who to call.</Text>
            </Alert>
            <Alert tone="success">
              <Text>Emergency contact saved.</Text>
            </Alert>
            <Alert tone="warning">
              <Text>This record changed while you were editing.</Text>
            </Alert>
            <Alert tone="danger">
              <Text>The contact could not be saved.</Text>
            </Alert>
          </Stack>
        ),
      },
      {
        name: 'A refused write: two lines, both at default tone',
        node: (
          <Alert tone="warning">
            <Stack gap="tight">
              <Text>This record changed while you were editing.</Text>
              <Text>Reload to see the current version, then make your change again.</Text>
            </Stack>
          </Alert>
        ),
      },
    ],
  },
  {
    columns: 3,
    component: 'button',
    states: [
      {
        name: 'Variants',
        node: (
          <Stack direction="row" gap="normal">
            <Button>Save</Button>
            <Button variant="outline">Try again</Button>
          </Stack>
        ),
      },
      {
        name: 'Disabled',
        node: (
          <Stack direction="row" gap="normal">
            <Button disabled>Save</Button>
            <Button disabled variant="outline">
              Try again
            </Button>
          </Stack>
        ),
      },
      {
        name: 'In a list row',
        node: (
          <Stack direction="row" gap="loose">
            {contactRow('Priya Raman · Spouse', '+60 12-345 6789')}
            <Button>Save</Button>
          </Stack>
        ),
      },
    ],
  },
  {
    component: 'card',
    states: [
      {
        name: 'A surface with a heading',
        node: (
          <Card aria-labelledby="gallery-card-heading">
            <Stack gap="tight">
              <Heading id="gallery-card-heading" level={2}>
                Emergency contacts
              </Heading>
              <Text tone="muted">Two contacts on file.</Text>
            </Stack>
          </Card>
        ),
      },
      {
        name: 'Side by side, each carrying a figure',
        node: (
          <Stack direction="row" gap="normal">
            <Card>
              <Stack gap="tight">
                <Text tone="muted" variant="label">
                  Malaysia
                </Text>
                <Text variant="display">642</Text>
                <Text tone="muted">Employees on payroll this period</Text>
              </Stack>
            </Card>
            <Card>
              <Stack gap="tight">
                <Text tone="muted" variant="label">
                  Singapore
                </Text>
                <Text variant="display">411</Text>
                <Text tone="success">+18 since last run</Text>
              </Stack>
            </Card>
          </Stack>
        ),
      },
    ],
  },
  {
    component: 'code',
    states: [
      {
        name: 'Inline, in a sentence',
        node: (
          <Text>
            Employee <Code>EMP-004821</Code> has no primary contact on file.
          </Text>
        ),
      },
      {
        name: 'Tabular digits, stacked',
        node: (
          <Stack gap="tight">
            <Text>
              <Code>EMP-000412</Code>
            </Text>
            <Text>
              <Code>EMP-118820</Code>
            </Text>
            <Text>
              <Code>EMP-904117</Code>
            </Text>
          </Stack>
        ),
      },
    ],
  },
  {
    component: 'combobox',
    states: [
      {
        name: 'Empty',
        node: (
          <Combobox
            aria-label="Relationship"
            options={RELATIONSHIPS}
            placeholder="Select a relationship"
          />
        ),
      },
      {
        name: 'Selected',
        node: <Combobox aria-label="Relationship" options={RELATIONSHIPS} value="spouse" />,
      },
      {
        name: 'Disabled',
        node: (
          <Combobox
            aria-label="Relationship"
            disabled
            options={RELATIONSHIPS}
            placeholder="Select a relationship"
          />
        ),
      },
      {
        name: 'In a form, with a label and a hint',
        node: (
          <Stack gap="tight">
            <Text id="gallery-relationship" variant="label">
              Relationship
            </Text>
            <Combobox
              aria-labelledby="gallery-relationship"
              options={RELATIONSHIPS}
              placeholder="Select a relationship"
            />
            <Text tone="muted">How this person is related to the employee.</Text>
          </Stack>
        ),
      },
    ],
  },
  {
    component: 'empty-state',
    states: [
      {
        name: 'Title and description',
        node: (
          <EmptyState
            description="Add one so we know who to call outside working hours."
            title="No emergency contacts yet"
          />
        ),
      },
      {
        name: 'Title only',
        node: <EmptyState title="No results for that search" />,
      },
    ],
  },
  {
    columns: 1,
    component: 'grid',
    states: [
      {
        name: 'Three columns of tiles, normal gap',
        node: (
          <Grid columns={3}>
            <Card>
              <Text tone="muted" variant="label">
                Malaysia
              </Text>
              <Text variant="display">642</Text>
            </Card>
            <Card>
              <Text tone="muted" variant="label">
                Singapore
              </Text>
              <Text variant="display">411</Text>
            </Card>
            <Card>
              <Text tone="muted" variant="label">
                Jakarta
              </Text>
              <Text variant="display">231</Text>
            </Card>
          </Grid>
        ),
      },
      {
        name: 'Two columns, tight gap',
        node: (
          <Grid columns={2} gap="tight">
            <Card>
              <Text>one</Text>
            </Card>
            <Card>
              <Text>two</Text>
            </Card>
            <Card>
              <Text>three</Text>
            </Card>
            <Card>
              <Text>four</Text>
            </Card>
          </Grid>
        ),
      },
    ],
  },
  {
    component: 'heading',
    states: [
      {
        name: 'The three levels',
        node: (
          <Stack gap="normal">
            <Heading level={1}>Employee</Heading>
            <Heading level={2}>Emergency contacts</Heading>
            <Heading level={3}>Primary contact</Heading>
          </Stack>
        ),
      },
      {
        name: 'With body text',
        node: (
          <Stack gap="tight">
            <Heading level={2}>Emergency contacts</Heading>
            <Text>
              Every employee should have at least one contact we can reach outside working hours.
            </Text>
          </Stack>
        ),
      },
    ],
  },
  {
    component: 'list',
    states: [
      {
        name: 'Rows with an action',
        node: (
          <List>
            <ListItem>
              {contactRow('Priya Raman · Spouse', '+60 12-345 6789')}
              <Button>Save</Button>
            </ListItem>
            <ListItem>
              {contactRow('Arun Raman · Parent', '+60 19-887 2231')}
              <Button>Save</Button>
            </ListItem>
          </List>
        ),
      },
      {
        name: 'Read only',
        node: (
          <List>
            <ListItem>{contactRow('Kuala Lumpur', '642 employees')}</ListItem>
            <ListItem>{contactRow('Singapore', '411 employees')}</ListItem>
            <ListItem>{contactRow('Jakarta', '231 employees')}</ListItem>
          </List>
        ),
      },
    ],
  },
  {
    component: 'list-item',
    states: [
      {
        name: 'Two lines',
        node: <ListItem>{contactRow('Arun Raman · Parent', '+60 19-887 2231')}</ListItem>,
      },
      {
        name: 'With a reference',
        node: (
          <ListItem>
            <Stack gap="tight">
              <Text>Nurul Hassan · Guardian</Text>
              <Text tone="muted">
                <Code>EMP-004821</Code> · added 12 August
              </Text>
            </Stack>
          </ListItem>
        ),
      },
    ],
  },
  {
    columns: 1,
    component: 'resource-boundary',
    states: [
      {
        name: 'Healthy: the boundary renders its children and nothing of itself',
        node: (
          <ResourceBoundary>
            <Card>
              <Stack gap="tight">
                <Heading level={2}>Emergency contacts</Heading>
                {contactRow('Priya Raman · Spouse', '+60 12-345 6789')}
              </Stack>
            </Card>
          </ResourceBoundary>
        ),
      },
    ],
  },
  {
    columns: 1,
    component: 'specimen',
    states: [
      {
        name: 'A frame: caption, the state on the page ground, a footnote',
        node: (
          <Specimen footer={<Code>action.primary.background</Code>} label="Primary button">
            <Button>Save</Button>
          </Specimen>
        ),
      },
    ],
  },
  {
    component: 'stack',
    states: [
      {
        name: 'Column, the three gaps',
        node: (
          <Stack direction="row" gap="loose">
            <Stack gap="tight">
              <Text>tight</Text>
              <Text>tight</Text>
            </Stack>
            <Stack gap="normal">
              <Text>normal</Text>
              <Text>normal</Text>
            </Stack>
            <Stack gap="loose">
              <Text>loose</Text>
              <Text>loose</Text>
            </Stack>
          </Stack>
        ),
      },
      {
        name: 'Row',
        node: (
          <Stack direction="row" gap="normal">
            <Text>one</Text>
            <Text>two</Text>
            <Text>three</Text>
          </Stack>
        ),
      },
    ],
  },
  {
    columns: 1,
    component: 'status',
    states: [
      {
        name: 'A polite live region, busy',
        node: <Status>Loading emergency contacts…</Status>,
      },
    ],
  },
  {
    columns: 1,
    component: 'switch',
    states: [
      {
        name: 'Off, on, disabled',
        node: (
          <Stack direction="row" gap="normal">
            <Switch aria-label="Off" />
            <Switch aria-label="On" defaultChecked />
            <Switch aria-label="Disabled" disabled />
            <Switch aria-label="Disabled, on" defaultChecked disabled />
          </Stack>
        ),
      },
    ],
  },
  {
    component: 'text',
    states: [
      {
        name: 'Tones',
        node: (
          <Stack gap="tight">
            <Text>default — the ink every screen reads in</Text>
            <Text tone="muted">muted — secondary, measured against page and card</Text>
            <Text tone="success">success — what a change means, not its sign</Text>
            <Text tone="danger">danger — a failed write</Text>
          </Stack>
        ),
      },
      {
        name: 'Variants',
        node: (
          <Stack gap="tight">
            <Text variant="label">label</Text>
            <Text>body</Text>
            <Text variant="emphasis">emphasis</Text>
            <Text variant="display">display</Text>
          </Stack>
        ),
      },
    ],
  },
]
