import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { contracts, contractsOwingAtEvidence } from '@/contracts'
import { AppShell } from '@/screens/app-shell'
import { CommandPalette } from '@/screens/command-palette'
import { ElevationSpecimen } from '@/screens/elevation-specimen'
import { EmployeeMasterData } from '@/screens/employee-master-data'
import { MotionSpecimen } from '@/screens/motion-specimen'
import { ShapeSpecimen } from '@/screens/shape-specimen'
import { TypeSpecimen } from '@/screens/type-specimen'
import { CATALOGUE, type CatalogueEntry } from './catalogue'

/**
 * The gallery. Every block, in every mode, before it reaches a page.
 *
 * THE TWO AXES ARE THE POINT. Theme and density are the two things a component
 * can silently get wrong -- a colour that only works on paper, a control that
 * only fits when comfortable -- and neither is visible from reading the source.
 * The toggles set the same attributes the product sets, on the same element, so
 * what is seen here is what a page will do.
 */

interface Entry {
  readonly id: string
  readonly node: React.ReactNode
  readonly title: string
}

const NAV = [
  {
    items: [
      { href: '/employees', label: 'Employees' },
      { href: '/payroll', label: 'Payroll runs' },
    ],
    title: 'People',
  },
  {
    items: [{ href: '/settings', label: 'Settings' }],
    title: 'Administration',
  },
]

const COMMANDS = [
  { group: 'Go to', id: 'employees', label: 'Employees', onRun: () => undefined },
  { group: 'Go to', id: 'payroll', label: 'Payroll runs', onRun: () => undefined },
  { group: 'Actions', id: 'new-employee', label: 'Add an employee', onRun: () => undefined },
]

function ShellPreview() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  return (
    // The shell is `min-h-screen` because a page is. Framed to a fixed height
    // here so it does not eat a viewport and push every other block below the
    // fold -- a gallery that has to be scrolled past is one nobody scans.
    <div className="h-[26rem] overflow-hidden rounded-control border border-border">
      <AppShell
        account={{ name: 'Wei Ling', onSignOut: () => undefined }}
        binding={{
          legalEntity: 'Xforge Manufacturing Sdn Bhd',
          switchHref: '/select-tenant',
          tenant: 'Acme Group',
        }}
        currentHref="/employees"
        onOpenPalette={() => setPaletteOpen(true)}
        sections={NAV}
        title="Employees"
      >
        <p className="m-0 text-muted-foreground">Twelve employees across two legal entities.</p>
        <CommandPalette commands={COMMANDS} onOpenChange={setPaletteOpen} open={paletteOpen} />
      </AppShell>
    </div>
  )
}

const ENTRIES: readonly Entry[] = [
  {
    id: 'app-shell',
    node: <ShellPreview />,
    title: 'Application shell — binding bar, rail, palette, account',
  },
  {
    id: 'motion-specimen',
    node: <MotionSpecimen />,
    title: 'Motion and interaction — every state, and the one loop',
  },
  {
    id: 'shape-specimen',
    node: <ShapeSpecimen />,
    title: 'Shape — six roles, and the concentric relationship',
  },
  {
    id: 'elevation-specimen',
    node: <ElevationSpecimen />,
    title: 'Elevation — the five planes, and the scrim that carries the modal',
  },
  {
    id: 'type-specimen',
    node: <TypeSpecimen />,
    title: 'Type — the seven roles, against each other',
  },
  {
    id: 'employee-master-data',
    node: <EmployeeMasterData />,
    title: 'Employee master data — the type scale under real rows',
  },
  {
    id: 'buttons',
    node: (
      <div className="flex flex-wrap items-center gap-tight">
        <Button>Save changes</Button>
        <Button variant="secondary">Cancel</Button>
        <Button variant="outline">Export</Button>
        <Button variant="ghost">Dismiss</Button>
        <Button variant="destructive">Reverse run</Button>
        <Button disabled>Unavailable</Button>
      </div>
    ),
    title: 'Button — every variant, including disabled',
  },
  {
    id: 'field',
    node: (
      <div className="flex max-w-prose flex-col gap-tight">
        <Label htmlFor="gallery-employee">Employee number</Label>
        <Input id="gallery-employee" placeholder="EMP-0001" />
        <p className="text-label text-muted-foreground">
          Shown as it appears on the statutory submission.
        </p>
      </div>
    ),
    title: 'Field — label, input, hint',
  },
  {
    id: 'statuses',
    node: (
      <div className="flex flex-wrap items-center gap-tight">
        <Badge>Draft</Badge>
        <Badge variant="secondary">Calculated</Badge>
        <Badge variant="outline">Approved</Badge>
        <Badge variant="destructive">Reversed</Badge>
      </div>
    ),
    title: 'Badge — payroll run states',
  },
  {
    id: 'surfaces',
    node: (
      <div className="flex flex-wrap gap-normal">
        <Card className="w-72">
          <CardHeader>
            <CardTitle>Statutory</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-tight">
            <p className="m-0 text-label text-muted-foreground">
              EPF, SOCSO and EIS are fixed by regulation.
            </p>
            <Separator />
            <p className="m-0 rounded-precise bg-statutory px-control-x py-control-y text-label text-statutory-foreground">
              Employer EPF 13% · wages ≤ RM5,000
            </p>
          </CardContent>
        </Card>
        <Card className="w-72">
          <CardHeader>
            <CardTitle>Loading</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-tight">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    ),
    title: 'Card — surfaces, and the statutory role',
  },
]

/**
 * THE ORDER OF THE COMPOSITIONS, and it is an argument rather than a filing
 * system: foundations first, because everything below is assembled from them.
 * Not alphabetical, and not numbered — numbering promises a sequence to follow,
 * and this is a reference.
 */
const COMPOSITION_ORDER = [
  'type-specimen',
  'shape-specimen',
  'elevation-specimen',
  'motion-specimen',
  'app-shell',
  'employee-master-data',
]

/** Anything the order above forgot, shown rather than dropped. */
const COMPOSITIONS = [
  ...COMPOSITION_ORDER.map((id) => ENTRIES.find((e) => e.id === id)).filter(
    (e): e is Entry => e !== undefined,
  ),
  ...ENTRIES.filter((e) => !COMPOSITION_ORDER.includes(e.id)),
]

/** `name — why it exists` split into its two jobs. */
const splitTitle = (title: string): readonly [string, string | undefined] => {
  const [name, ...rest] = title.split('—')
  return [name?.trim() ?? title, rest.join('—').trim() || undefined]
}

/**
 * THE INDEX IS GROUPED BY `kind`, WHICH THE REGISTRY ALREADY DECIDES.
 *
 * Not a hand-written taxonomy beside a hand-written registry — that pair is this
 * repository's recurring defect, and a workbench is exactly where it would rot
 * unnoticed. A component joins a group by declaring what it is.
 */
const KINDS = ['action', 'field', 'collection', 'content', 'feedback', 'layout'] as const

/**
 * The component workbench.
 *
 * WHAT IT REPLACES, and the measurement that said it had to. The previous
 * gallery showed eleven compositions: seventeen of twenty-eight contracts
 * appeared anywhere, eleven appeared nowhere, and NOT ONE was shown in
 * isolation. Storybook's job is the reverse — a component out of its page, with
 * its states enumerated and named — so the old gallery could not stand in for
 * it however it was styled.
 *
 * TWO REGISTERS, and the order is the argument. Components first, alone, every
 * state at once. Compositions second, because a composition is only interesting
 * once the parts are known.
 *
 * THE ONE THING IT SAYS OUT LOUD is the debt. Eight components owe a recorded
 * screen-reader session; the header counts them and the index marks each one.
 * Most catalogues show what exists. In a payroll product an outstanding
 * liability is displayed rather than filed, and this is the same instinct
 * applied to the system that builds it.
 */
export function Gallery() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  // THREE MODES, and the middle one is the product's real default. The toggle
  // used to read 'Comfortable' over a 36px control -- a label for a mode that did
  // not exist beside one that was neither of the two it named.
  const DENSITIES = ['compact', 'default', 'comfortable'] as const
  const [density, setDensity] = useState<(typeof DENSITIES)[number]>('default')
  const [filter, setFilter] = useState('')

  // The same attributes the product sets, on the same element. Anything else
  // would be a gallery that agrees with itself and not with a page.
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.setAttribute('data-density', density)

  const owing = new Set(contractsOwingAtEvidence())
  const query = filter.trim().toLowerCase()
  const matches = (id: string) => query === '' || id.toLowerCase().includes(query)
  const shown = CATALOGUE.filter((entry) => matches(entry.contract))
  // THE FILTER REACHES BOTH REGISTERS. It used to narrow the components and
  // leave every composition standing, so searching for one Alert still printed
  // the whole type specimen underneath it -- a filter that answers half the
  // page is worse than none, because the half it ignores reads as a result.
  const shownCompositions = COMPOSITIONS.filter((entry) => matches(splitTitle(entry.title)[0]))

  return (
    <div className="min-h-screen bg-background font-sans text-body text-foreground">
      <header className="layer-local sticky top-0 flex h-shell-header items-center gap-normal border-border border-b bg-card px-row-x">
        <span className="font-emphasis text-card-foreground text-emphasis">
          Xforge design system
        </span>
        <span className="medium:inline hidden font-mono text-caption text-muted-foreground tabular-nums">
          {CATALOGUE.length} components · {owing.size} owe a recorded screen-reader session
        </span>
        <div className="ml-auto flex items-center gap-tight">
          <Button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            size="sm"
            variant="outline"
          >
            {theme === 'light' ? 'Paper' : 'Obsidian'}
          </Button>
          <Button
            onClick={() =>
              setDensity(
                // A modular index is provably in range to a reader and not to
                // the compiler. Stated, rather than asserted away with a bang.
                DENSITIES[(DENSITIES.indexOf(density) + 1) % DENSITIES.length] ?? 'default',
              )
            }
            size="sm"
            variant="outline"
          >
            {density.replace(/^./, (c) => c.toUpperCase())}
          </Button>
        </div>
      </header>

      <div className="flex items-start">
        {/*
          Plain anchors under a plain filter, so Tab order, the browser's find,
          and open-in-new-tab all keep working, and every component has a URL.
          A workbench nobody can link to is one nobody cites in a review.
        */}
        <nav
          aria-label="Components"
          className="sticky top-shell-header medium:flex hidden max-h-screen w-shell-nav-expanded shrink-0 flex-col gap-loose overflow-y-auto border-border border-r px-normal py-normal"
        >
          <Input
            aria-label="Filter components"
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter"
            value={filter}
          />

          {KINDS.map((kind) => {
            const inKind = shown.filter((e) => contracts[e.contract].kind === kind)
            return inKind.length === 0 ? null : (
              <div className="flex flex-col gap-related" key={kind}>
                <span className="px-control-x font-label text-caption text-muted-foreground uppercase tracking-wide">
                  {kind}
                </span>
                {inKind.map((entry) => (
                  <a
                    className="focus-visible:focus-ring flex items-baseline gap-tight rounded-control px-control-x py-related text-body-compact text-muted-foreground hover:bg-muted hover:text-foreground"
                    href={`#${entry.contract}`}
                    key={entry.contract}
                  >
                    {entry.contract}
                    {/* The debt, in the navigation. Carried by the word, never
                        by colour — and short enough to sit in a rail. */}
                    {owing.has(entry.contract) ? (
                      <span className="ml-auto font-mono text-caption">owes</span>
                    ) : null}
                  </a>
                ))}
              </div>
            )
          })}

          {shownCompositions.length === 0 ? null : (
            <div className="flex flex-col gap-related">
              <span className="px-control-x font-label text-caption text-muted-foreground uppercase tracking-wide">
                compositions
              </span>
              {shownCompositions.map((entry) => (
                <a
                  className="focus-visible:focus-ring rounded-control px-control-x py-related text-body-compact text-muted-foreground hover:bg-muted hover:text-foreground"
                  href={`#${entry.id}`}
                  key={entry.id}
                >
                  {splitTitle(entry.title)[0]}
                </a>
              ))}
            </div>
          )}
        </nav>

        <main className="flex min-w-0 flex-1 flex-col">
          {shown.length === 0 && shownCompositions.length === 0 ? (
            <div className="p-section">
              <EmptyState
                description="No component matches that filter. Clear it to see all of them."
                title={`Nothing named “${filter}”`}
              />
            </div>
          ) : null}

          {KINDS.map((kind) => {
            const inKind = shown.filter((e) => contracts[e.contract].kind === kind)
            return inKind.length === 0 ? null : (
              <div key={kind}>
                <h2 className="m-0 border-border border-t bg-muted px-section py-tight font-label text-caption text-muted-foreground uppercase tracking-wide">
                  {kind}
                </h2>
                {inKind.map((entry) => (
                  <ComponentEntry
                    entry={entry}
                    key={entry.contract}
                    owes={owing.has(entry.contract)}
                  />
                ))}
              </div>
            )
          })}

          {shownCompositions.length === 0 ? null : (
            <h2 className="m-0 border-border border-t bg-muted px-section py-tight font-label text-caption text-muted-foreground uppercase tracking-wide">
              compositions
            </h2>
          )}
          {shownCompositions.map((entry) => (
            <Specimen entry={entry} key={entry.id} />
          ))}
        </main>
      </div>
    </div>
  )
}

/**
 * One component, alone, with every state it can be in.
 *
 * THE STORY NAME IS THE POINT, and it sits UNDER the specimen rather than over
 * it. A caption above reads as a heading and takes the eye first; the thing
 * being examined should. The name still matters — it is what somebody says out
 * loud when they report that one of these is wrong.
 *
 * The specification line is DERIVED: kind, profile, revision and the debt all
 * come from the registry, so it cannot describe a component that has since
 * changed underneath it.
 */
function ComponentEntry({
  entry,
  owes,
}: {
  readonly entry: CatalogueEntry
  readonly owes: boolean
}) {
  const { interaction, kind } = contracts[entry.contract]
  return (
    <section
      aria-labelledby={`${entry.contract}-title`}
      className="flex scroll-mt-shell-header flex-col gap-normal border-border border-t px-section py-loose"
      id={entry.contract}
    >
      <div className="flex flex-col gap-related">
        <h3
          className="m-0 font-heading text-foreground text-heading"
          id={`${entry.contract}-title`}
        >
          {entry.contract}
        </h3>
        <p className="m-0 font-mono text-caption text-muted-foreground">
          {kind} · {interaction.profile} · revision {interaction.revision}
          {owes ? <span className="text-foreground"> · owes A11y-3</span> : null}
        </p>
        <p className="m-0 max-w-prose text-body-compact text-muted-foreground">{entry.note}</p>
      </div>

      <div className="flex flex-wrap items-start gap-loose">
        {entry.stories.map((story) => (
          <div className="flex flex-col gap-tight" key={story.name}>
            {story.node}
            <span className="font-mono text-caption text-muted-foreground">{story.name}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * One composition — a real screen fragment, kept because a component that is
 * correct alone can still be wrong in company.
 *
 * NO CARD FRAME, deliberately. Framing these in a raised surface put the
 * elevation specimen inside a surface and the shape specimen inside a radius:
 * a gallery cannot frame its exhibits in the materials the exhibits are made of.
 */
function Specimen({ entry }: { readonly entry: Entry }) {
  const [name, argument] = splitTitle(entry.title)
  return (
    <section
      aria-labelledby={`${entry.id}-title`}
      className="flex scroll-mt-shell-header flex-col gap-normal border-border border-t px-section py-loose"
      id={entry.id}
    >
      <div className="flex flex-col gap-related">
        <h3 className="m-0 font-heading text-foreground text-heading" id={`${entry.id}-title`}>
          {name}
        </h3>
        {argument ? (
          <p className="m-0 max-w-prose text-body-compact text-muted-foreground">{argument}</p>
        ) : null}
      </div>
      {entry.node}
    </section>
  )
}
