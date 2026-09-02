import { type ReactNode, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Code } from '@/components/ui/code'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { Heading } from '@/components/ui/heading'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { List } from '@/components/ui/list'
import { ListItem } from '@/components/ui/list-item'
import { Page } from '@/components/ui/page'
import { ResourceBoundary } from '@/components/ui/resource-boundary'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Stack } from '@/components/ui/stack'
import { Status } from '@/components/ui/status'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHeader,
} from '@/components/ui/table'
import { Text } from '@/components/ui/text'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ContractId } from '@/contracts'
import { CommandPalette } from '@/screens/command-palette'

/**
 * THE CATALOGUE — every contract, alone, in every state it can be in.
 *
 * WHAT THE GALLERY WAS, AND WHY IT DID NOT REPLACE STORYBOOK. It showed eleven
 * COMPOSITIONS. Measured against the registry: seventeen of twenty-eight
 * contracts appeared anywhere at all, eleven appeared nowhere — List, Alert,
 * Code, EmptyState, Heading, ListItem, Status, Text, Page, ResourceBoundary,
 * Stack — and not one of the seventeen was shown ISOLATED. Every appearance was
 * incidental: `Badge` existed because the employee table happened to use it.
 *
 * That is a page preview. Storybook's actual job is the opposite one — take a
 * component OUT of a page and enumerate its states, so the disabled Input and
 * the invalid Input are visible together and nobody has to build a screen to
 * find out what they look like.
 *
 * A STORY HERE IS A NAMED STATE, which is the same unit Storybook uses, and the
 * name is load-bearing: it is what somebody says out loud when they report that
 * one of them is wrong.
 *
 * WHAT THIS HAS THAT STORYBOOK DOES NOT. The interaction contract is machine
 * readable, so the profile, the revision and the outstanding screen-reader debt
 * are DERIVED beside each component rather than maintained by hand. Storybook
 * needs an addon and a list somebody remembers to update; this repository
 * already refuses to let those two disagree.
 */

export interface Story {
  readonly name: string
  readonly node: ReactNode
}

export interface CatalogueEntry {
  readonly contract: ContractId
  /** What the component is FOR, in one line, written for a reader not a compiler. */
  readonly note: string
  readonly stories: readonly Story[]
}

/** A short, honest row of employees — reused so a table story is not a fixture essay. */
const ROWS = [
  { entity: 'Manufacturing', name: 'Nur Aisyah binti Rahman', number: 'EMP-0007' },
  { entity: 'Logistics', name: 'Arjun a/l Subramaniam', number: 'EMP-0117' },
] as const

/**
 * The palette needs an OPEN state, so it needs a component rather than a node.
 *
 * Storybook would call this a story with a play function. Here it is eight lines
 * of React, which is the whole argument for a gallery that is part of the
 * codebase rather than a parallel install with its own build.
 */
function PaletteStory() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        Open the palette
      </Button>
      <CommandPalette
        commands={[
          { group: 'Go to', id: 'employees', label: 'Employees', onRun: () => setOpen(false) },
          { group: 'Go to', id: 'payroll', label: 'Payroll runs', onRun: () => setOpen(false) },
          {
            group: 'Actions',
            id: 'add',
            label: 'Add an employee',
            onRun: () => setOpen(false),
          },
        ]}
        onOpenChange={setOpen}
        open={open}
      />
    </>
  )
}

export const CATALOGUE: readonly CatalogueEntry[] = [
  {
    contract: 'Button',
    note: 'Every action a person can take. The variant says how consequential it is.',
    stories: [
      { name: 'primary', node: <Button>Save changes</Button> },
      { name: 'secondary', node: <Button variant="secondary">Cancel</Button> },
      { name: 'outline', node: <Button variant="outline">Export</Button> },
      { name: 'ghost', node: <Button variant="ghost">Dismiss</Button> },
      { name: 'destructive', node: <Button variant="destructive">Reverse run</Button> },
      { name: 'disabled', node: <Button disabled>Unavailable</Button> },
      {
        name: 'small',
        node: (
          <Button size="sm" variant="outline">
            Filter
          </Button>
        ),
      },
    ],
  },
  {
    contract: 'DropdownMenu',
    note: 'A menu of actions on one subject. Managed focus, one tab stop.',
    stories: [
      {
        name: 'closed',
        node: (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline">Row actions</Button>} />
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>EMP-0007</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Open record</DropdownMenuItem>
              <DropdownMenuItem>Copy employee number</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
  },
  {
    contract: 'Command',
    note: 'The primary navigator. Focus stays on the input while the list moves under it.',
    stories: [{ name: 'closed, opens on click or ⌘K', node: <PaletteStory /> }],
  },
  {
    contract: 'Table',
    note: 'Tabular data. Real headers with scope, and a row header naming each row.',
    stories: [
      {
        name: 'with a row header',
        node: (
          <Table>
            <TableCaption>Employees — showing 2, and there are more.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Entity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROWS.map((row) => (
                <TableRow key={row.number}>
                  <TableRowHeader>{row.name}</TableRowHeader>
                  <TableCell className="font-mono tabular-nums">{row.number}</TableCell>
                  <TableCell className="text-muted-foreground">{row.entity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ),
      },
    ],
  },
  {
    contract: 'List',
    note: 'A real <ul>. "List, two items" comes from the element, not from us.',
    stories: [
      {
        name: 'default',
        node: (
          <List>
            <ListItem>Nur Aisyah binti Rahman · Spouse</ListItem>
            <ListItem>Arjun a/l Subramaniam · Parent</ListItem>
          </List>
        ),
      },
    ],
  },
  {
    contract: 'ListItem',
    note: 'One entry in a list. Takes no focus of its own.',
    stories: [
      {
        name: 'default',
        node: (
          <List>
            <ListItem>+60 12-345 6789</ListItem>
          </List>
        ),
      },
    ],
  },
  {
    contract: 'Alert',
    note: 'A message about the thing on screen. The icon is the redundant cue for tone.',
    stories: [
      {
        name: 'info',
        node: <Alert tone="info">Payroll for October is open until the 25th.</Alert>,
      },
      { name: 'success', node: <Alert tone="success">Contributions submitted.</Alert> },
      {
        name: 'warning',
        node: <Alert tone="warning">Someone else changed this while you were editing.</Alert>,
      },
      { name: 'danger', node: <Alert tone="danger">The run could not be reversed.</Alert> },
    ],
  },
  {
    contract: 'Avatar',
    note: 'A person, at a glance. Initials when there is no image, which is most of the time.',
    stories: [
      {
        name: 'fallback',
        node: (
          <Avatar>
            <AvatarFallback>WL</AvatarFallback>
          </Avatar>
        ),
      },
      {
        name: 'with a badge',
        node: (
          <Avatar>
            <AvatarFallback>AR</AvatarFallback>
            <AvatarBadge />
          </Avatar>
        ),
      },
      {
        name: 'group',
        node: (
          <AvatarGroup>
            <Avatar>
              <AvatarFallback>WL</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>AR</AvatarFallback>
            </Avatar>
          </AvatarGroup>
        ),
      },
    ],
  },
  {
    contract: 'Badge',
    note: 'A state, as a word. Never colour alone.',
    stories: [
      { name: 'default', node: <Badge>Draft</Badge> },
      { name: 'secondary', node: <Badge variant="secondary">Calculated</Badge> },
      { name: 'outline', node: <Badge variant="outline">Approved</Badge> },
      { name: 'destructive', node: <Badge variant="destructive">Reversed</Badge> },
    ],
  },
  {
    contract: 'Code',
    note: 'An identifier a person may need to read back or quote.',
    stories: [{ name: 'inline', node: <Code>EPF-A-2026-10</Code> }],
  },
  {
    contract: 'EmptyState',
    note: 'Nothing here yet, said out loud. An empty region asks a different question.',
    stories: [
      {
        name: 'with a description',
        node: (
          <EmptyState
            description="Add one so payroll knows who to call."
            title="No emergency contacts yet"
          />
        ),
      },
      { name: 'title only', node: <EmptyState title="No payroll runs this period" /> },
    ],
  },
  {
    contract: 'Heading',
    note: 'The level a screen reader walks; the role decides the size. They are separate.',
    stories: [
      { name: 'level 1', node: <Heading level={1}>Employee</Heading> },
      { name: 'level 2', node: <Heading level={2}>Emergency contacts</Heading> },
      { name: 'level 3', node: <Heading level={3}>Statutory</Heading> },
    ],
  },
  {
    contract: 'Label',
    note: 'Names a control. `htmlFor` is required by the signature, so it cannot drift.',
    stories: [
      {
        name: 'with a field',
        node: (
          <div className="flex flex-col gap-tight">
            <Label htmlFor="cat-label">Employee number</Label>
            <Input id="cat-label" placeholder="EMP-0001" />
          </div>
        ),
      },
    ],
  },
  {
    contract: 'Status',
    note: 'Progress, announced. A spinner is invisible to a screen reader.',
    stories: [{ name: 'loading', node: <Status>Loading emergency contacts…</Status> }],
  },
  {
    contract: 'Text',
    note: 'Body copy, in the three roles a screen actually needs.',
    stories: [
      { name: 'body', node: <Text>Statutory contributions for October 2026.</Text> },
      { name: 'emphasis', node: <Text variant="emphasis">RM 5,200.00</Text> },
      // The prop was `role` and needed four lines here explaining that it was
      // Text's own prop rather than the ARIA attribute of the same name. It is
      // `variant` now, so there is nothing left to explain.
      { name: 'label', node: <Text variant="label">Employer EPF</Text> },
      {
        name: 'muted',
        node: <Text tone="muted">Shown as it appears on the statutory submission.</Text>,
      },
    ],
  },
  {
    contract: 'Tooltip',
    note: 'Visual only. The trigger’s accessible name must already say it.',
    stories: [
      {
        name: 'on a button',
        node: (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label="Statutory ceiling: employer EPF is 13% on wages up to RM5,000"
                    variant="outline"
                  >
                    Statutory ceiling
                  </Button>
                }
              />
              <TooltipContent>Employer EPF is 13% on wages up to RM5,000.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
      },
    ],
  },
  {
    contract: 'Skeleton',
    note: 'The shape of what is coming. It stops moving under reduced motion and stays visible.',
    stories: [
      {
        name: 'text lines',
        node: (
          <div className="flex w-64 flex-col gap-tight">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ),
      },
    ],
  },
  {
    contract: 'Input',
    note: 'One line of text. The platform supplies the semantics.',
    stories: [
      { name: 'empty', node: <Input aria-label="Employee number" placeholder="EMP-0001" /> },
      { name: 'filled', node: <Input aria-label="Employee number" defaultValue="EMP-0007" /> },
      { name: 'disabled', node: <Input aria-label="Locked" defaultValue="EMP-0007" disabled /> },
      {
        name: 'invalid',
        node: <Input aria-invalid aria-label="Employee number" defaultValue="EMP-7" />,
      },
    ],
  },
  {
    contract: 'Select',
    note: 'One of a known set. Focus stays on the trigger while options move.',
    stories: [
      {
        name: 'closed',
        node: (
          <Select defaultValue="monthly">
            <SelectTrigger aria-label="Pay frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        ),
      },
    ],
  },
  {
    contract: 'Textarea',
    note: 'Several lines, kept with the record.',
    stories: [
      {
        name: 'empty',
        node: <Textarea aria-label="Adjustment note" placeholder="Why this period differs." />,
      },
      {
        name: 'disabled',
        node: <Textarea aria-label="Closed note" defaultValue="Period closed." disabled />,
      },
    ],
  },
  {
    contract: 'InputGroup',
    note: 'A control with its adornments. Takes no focus itself.',
    stories: [
      {
        name: 'currency prefix',
        node: (
          <InputGroup>
            <InputGroupAddon>
              <InputGroupText>RM</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Basic salary"
              className="tabular-nums"
              defaultValue="5,200.00"
              inputMode="decimal"
            />
          </InputGroup>
        ),
      },
    ],
  },
  {
    contract: 'Card',
    note: 'A grouped region on the page. The container radius, one step above its controls.',
    stories: [
      {
        name: 'header and content',
        node: (
          <Card className="w-72">
            <CardHeader>
              <CardTitle>Statutory</CardTitle>
            </CardHeader>
            <CardContent>
              <Text tone="muted">EPF, SOCSO and EIS are fixed by regulation.</Text>
            </CardContent>
          </Card>
        ),
      },
    ],
  },
  {
    contract: 'Dialog',
    note: 'Interrupts to ask something. Traps focus and returns it on close.',
    stories: [
      {
        name: 'trigger',
        node: (
          <Dialog>
            <DialogTrigger render={<Button variant="outline">Reverse payroll run</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reverse this payroll run</DialogTitle>
                <DialogDescription>
                  Payroll history is immutable. Reversing posts a correcting entry.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="secondary">Cancel</Button>} />
                <Button variant="destructive">Reverse run</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ),
      },
    ],
  },
  {
    contract: 'Sheet',
    note: 'A dialog that enters from an edge. The entrance is decoration; the trap is the contract.',
    stories: [
      {
        name: 'trigger',
        node: (
          <Sheet>
            <SheetTrigger render={<Button variant="outline">Open sections</Button>} />
            <SheetContent className="w-72 p-normal" side="left">
              <SheetHeader>
                <SheetTitle>Sections</SheetTitle>
              </SheetHeader>
              <List>
                <ListItem>Employees</ListItem>
                <ListItem>Payroll runs</ListItem>
              </List>
            </SheetContent>
          </Sheet>
        ),
      },
    ],
  },
  {
    contract: 'Page',
    note: 'The document surface. Declares the text roles once so plain copy inherits them.',
    stories: [
      {
        name: 'default',
        node: (
          <Page>
            <Heading level={2}>Employee</Heading>
            <Text tone="muted">Everything inside inherits the system’s text.</Text>
          </Page>
        ),
      },
    ],
  },
  {
    contract: 'ResourceBoundary',
    note: 'Costs the reader one region rather than the product when a surface fails.',
    stories: [
      {
        name: 'holding a healthy surface',
        node: (
          <ResourceBoundary>
            <Text>This region renders normally until something inside it throws.</Text>
          </ResourceBoundary>
        ),
      },
    ],
  },
  {
    contract: 'Separator',
    note: 'A rule between things that are not otherwise separated.',
    stories: [
      {
        name: 'horizontal',
        node: (
          <div className="flex w-64 flex-col gap-tight">
            <Text tone="muted">Above</Text>
            <Separator />
            <Text tone="muted">Below</Text>
          </div>
        ),
      },
      {
        name: 'vertical',
        node: (
          <div className="flex h-8 items-center gap-tight">
            <Text tone="muted">Left</Text>
            <Separator orientation="vertical" />
            <Text tone="muted">Right</Text>
          </div>
        ),
      },
    ],
  },
  {
    contract: 'Stack',
    note: 'Names the relationship between two things, so density can decide the distance.',
    stories: [
      {
        name: 'column, normal',
        node: (
          <Stack gap="normal">
            <Text>First</Text>
            <Text>Second</Text>
          </Stack>
        ),
      },
      {
        name: 'row, tight',
        node: (
          <Stack direction="row" gap="tight">
            <Badge>Draft</Badge>
            <Badge variant="outline">Approved</Badge>
          </Stack>
        ),
      },
    ],
  },
]
