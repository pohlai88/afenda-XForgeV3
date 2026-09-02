/**
 * The design system's registry, checked against the components it describes.
 *
 * A CONTRACT REGISTRY IS ONLY WORTH ITS AGREEMENT WITH REALITY. Every consumer
 * downstream — the conformance suites, the accessibility gate, eventually a
 * schema generator — reads this registry and believes it. So the two failures
 * that matter are the ones nothing else would notice:
 *
 *   a component with no contract    installed, rendered, and claimed by no
 *                                   conformance suite; reported as covered
 *                                   because nothing asked after it
 *   a contract with no component    an obligation recorded against something
 *                                   that no longer exists, which reads exactly
 *                                   like coverage
 *
 * Both are drift between a list and a directory, which is this repository's
 * recurring defect in its most literal form.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// Relative, because the registry is deliberately absent from the package's
// `exports`: it is how the design system describes itself, not an API a screen
// consumes.
import {
  type Contract,
  contractIds,
  contracts,
  contractsOwingAtEvidence,
  INTERACTION_PROFILES,
  PROFILES_REQUIRING_AT_EVIDENCE,
} from '../../packages/design/policy/contracts'

const ROOT = join(import.meta.dirname, '../..')
const UI_DIR = join(ROOT, 'packages/design/src/components/ui')

/** `DropdownMenu` -> `dropdown-menu`, which is what the CLI writes. */
const fileNameOf = (id: string): string =>
  `${id.replace(/(?<!^)([A-Z])/g, '-$1').toLowerCase()}.tsx`

const componentFiles = readdirSync(UI_DIR)
  .filter((f) => f.endsWith('.tsx'))
  .sort((a, b) => a.localeCompare(b))

/**
 * A HAND-WRITTEN COPY OF THE EIGHT PROFILE NAMES STOOD HERE.
 *
 * It could only fail if the copy drifted from the union it was transcribed
 * from -- which is the failure it existed to prevent, asserted against itself.
 * `INTERACTION_PROFILES` is now the declaration the union is derived FROM, so
 * the check below reads the same list the type does.
 *
 * WHAT THAT MAKES THE ASSERTION, stated honestly rather than left to look
 * stronger than it is: the compiler already refuses a `profile` outside the
 * union, so this is a RUNTIME reading of `contracts` as data -- the same way a
 * schema generator or the accessibility gate reads it, neither of which the
 * compiler protects. It catches the registry being edited as JSON, not a
 * type error. The real cross-check between the profile list and what each
 * profile owes is `assertProfileKeyboard`, in
 * `tests/unit/interaction-policy.test.ts`.
 */

describe('the design system registry', () => {
  it('is not empty, so a passing suite cannot mean it checked nothing', () => {
    expect(contractIds.length).toBeGreaterThan(10)
    expect(componentFiles.length).toBeGreaterThan(10)
  })

  /**
   * The property every downstream consumer depends on. A guard, a schema
   * generator and eventually a metadata renderer all read this, and not one of
   * them should execute JavaScript to find out what a Button is.
   */
  it('is pure serializable data', () => {
    expect(JSON.parse(JSON.stringify(contracts))).toEqual(contracts)
  })

  it('describes every component that exists', () => {
    const described = contractIds.map(fileNameOf).sort((a, b) => a.localeCompare(b))
    expect(described).toEqual(componentFiles)
  })

  it.each(Object.entries(contracts) as [string, Contract][])(
    '%s declares a profile the suites can dispatch on',
    (_id, contract) => {
      expect(INTERACTION_PROFILES).toContain(contract.interaction.profile)
    },
  )

  /**
   * A one-directional rule, and the direction matters.
   *
   * Anything carrying obligations this project defined must carry a positive
   * revision, because that is what a recorded session is keyed against. The
   * REVERSE — that revision 0 implies `none` — is deliberately not asserted:
   * welding the two lets a `none` contract never bump its revision for an
   * unrelated reason, and compares two fields of one declaration to each other
   * while proving nothing about the component.
   */
  it.each(Object.entries(contracts) as [string, Contract][])(
    '%s versions a behavioural profile',
    (_id, contract) => {
      if (contract.interaction.profile === 'none') {
        return
      }
      expect(contract.interaction.revision).toBeGreaterThan(0)
    },
  )
})

/**
 * THE MOUNT AND CATALOGUE CHECKS ARE GONE, AND THEIR SUBJECT IS WHY.
 *
 * Two suites stood here and both read `packages/design/gallery`:
 *
 *   every contract is rendered somewhere   RENDER_ROOTS spanned the product, the
 *                                          gallery and the screens, and refused a
 *                                          contract no tree opened as a tag
 *   the component workbench                read `catalogue.tsx` as text and
 *                                          refused a contract with no entry, or
 *                                          an entry with no named story
 *
 * The gallery was deleted. Neither check can be repointed, because the gallery
 * was not one render root among three -- it was the ONLY tree that rendered the
 * vocabulary. Measured at deletion: 17 of 28 contracts are opened as a tag
 * nowhere else in this repository.
 *
 *   Alert, Avatar, Badge, Dialog, EmptyState, Input, InputGroup, Label, List,
 *   ListItem, ResourceBoundary, Select, Separator, Skeleton, Status, Textarea,
 *   Tooltip
 *
 * SO THE COVERAGE IS NOT REDUCED, IT IS REMOVED, and this paragraph is what
 * stands in its place. Those seventeen have a contract, an obligation, and in
 * several cases a recorded screen-reader debt -- against a component that no
 * tree in this repository renders. `e2e/design-system-conformance.spec.ts` went
 * with them: it was the only axe scan of the vocabulary, and it scanned the
 * gallery.
 *
 * The hole is the one the deleted suite was written to close, restated by its
 * own header: *a contract with no MOUNT is an obligation nothing can ever be
 * observed against -- scanning green because there was nothing on the page to
 * scan.* Nothing checks that now, and no stage reports it missing.
 *
 * RESTORING THE CHECKS IS RESTORING THEIR SUBJECT. `git checkout <rev> --
 * packages/design/gallery` brings back four files and both suites work again
 * unchanged. That is written down so the next reader knows they were not found
 * wrong -- they were left with nothing to read.
 */

describe('the assistive-technology debt', () => {
  /**
   * The debt, written down where a change to it is visible in a diff.
   *
   * This is not a duplicate of the registry: it is the DERIVED consequence, and
   * it goes red the day a profile changes — which is the day somebody needs
   * telling that the number of screen-reader sessions owed has moved. ADR-025's
   * point was never that the number stays small; it was that it is known when
   * the obligation is incurred rather than discovered at certification.
   */
  it('is owed by exactly these components', () => {
    expect(contractsOwingAtEvidence()).toEqual([
      'Alert',
      'Command',
      'Dialog',
      'DropdownMenu',
      'Select',
      'Sheet',
      'Status',
      'Tooltip',
    ])
  })

  it('is derived from the profiles rather than listed', () => {
    // Shown a dishonest registry: a component claiming `modal` owes a session
    // whatever its name is, and one claiming `none` owes nothing.
    const invented = contractsOwingAtEvidence({
      Invented: { interaction: { profile: 'modal', revision: 1 }, kind: 'layout' },
      Passive: { interaction: { profile: 'none', revision: 0 }, kind: 'content' },
    })
    expect(invented).toEqual(['Invented'])
  })

  it('gates every profile a machine cannot observe', () => {
    // `native-control` and `form-control` are absent on purpose: the platform
    // supplies their behaviour and the browser suites can observe it. What is
    // listed is what only a person can answer.
    //
    // `live-region` JOINED at ADR-030. It matches ADR-025's own stated criterion
    // -- "announces state the DOM does not already carry" -- which that ADR then
    // contradicted by listing the profile as ungated two lines later.
    expect([...PROFILES_REQUIRING_AT_EVIDENCE]).toEqual([
      'composite',
      'composite-grid',
      'disclosure',
      'live-region',
      'modal',
    ])
  })
})

/**
 * THE FOURTH DRIFT, and the shape of the three above.
 *
 * This file already refuses a component with no contract, a contract with no
 * component, and a contract with no mount. The family has a fourth member that
 * nothing was asking after:
 *
 *   a contract with no EXPORT    a component the product cannot reach
 *
 * Ten of twenty-eight were in that state when this was written — `Dialog`,
 * `Select`, `Sheet` and `Tooltip` among them, which between them carry the
 * heaviest profiles the registry can declare. Catalogued, mounted in the
 * gallery, described by a contract, obligated to a screen-reader session, and
 * unreachable from `apps/web`.
 *
 * REACHABILITY IS THE `exports` MAP, not the barrel, because those are different
 * claims. `ResourceBoundary` is deliberately not in `index.ts` — it has its own
 * `./boundary` subpath — and a check that read only the barrel would report a
 * component the product uses today as missing.
 */
describe('the design system is reachable', () => {
  const barrel = readFileSync(join(ROOT, 'packages/design/src/index.ts'), 'utf8')
  const manifest = JSON.parse(readFileSync(join(ROOT, 'packages/design/package.json'), 'utf8')) as {
    exports: Record<string, string>
  }

  /** Names re-exported from the barrel, from every `export { ... }` clause. */
  const fromBarrel = new Set(
    [...barrel.matchAll(/export\s*\{([^}]*)\}/g)].flatMap((m) =>
      (m[1] ?? '').split(',').map((n) => n.trim()),
    ),
  )

  /**
   * Contracts reachable through a subpath that points straight at their file.
   * `./boundary` -> `resource-boundary.tsx` -> `ResourceBoundary`.
   */
  const fromSubpath = new Set(
    Object.values(manifest.exports)
      .filter((target) => target.includes('/components/ui/'))
      .map((target) => (target.split('/').pop() ?? '').replace(/\.tsx$/, ''))
      .map((slug) =>
        slug
          .split('-')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(''),
      ),
  )

  it('found exports to check, so a passing suite cannot mean it read nothing', () => {
    expect(fromBarrel.size).toBeGreaterThan(10)
    expect(fromSubpath.size).toBeGreaterThan(0)
  })

  it.each(contractIds)('%s is reachable from outside the package', (id) => {
    expect(
      fromBarrel.has(id) || fromSubpath.has(id),
      `${id} has a contract, a component, a catalogue entry and a mount, and no way ` +
        'for a screen to import it -- the obligations are recorded against something ' +
        'the product cannot use',
    ).toBe(true)
  })

  it('refuses a name the package does not export', () => {
    expect(fromBarrel.has('NotAComponent') || fromSubpath.has('NotAComponent')).toBe(false)
  })
})

/**
 * The component API, held to one shape.
 *
 * WHY THIS IS HERE RATHER THAN IN A GUARD. A guard sees one file at a time, and
 * two of these three questions are about the file's relationship to the REGISTRY
 * — which slug it must stamp, and whether it is a contract at all. That is the
 * same reason `test-id-plumbing.test.ts` gives for being a test.
 *
 * WHAT IS DELIBERATELY NOT ASSERTED: that variants are declared with `cva`.
 * It is the convention, and this pass applied it everywhere a variant is purely
 * appearance — but a rule would be wrong about the two places it is not.
 * `alert.tsx`'s `TONE` binds an ICON to each tone, and `heading.tsx`'s `ROLE`
 * picks the ELEMENT a screen reader walks. `cva` emits class strings and can
 * carry neither, so forcing those two would split one decision across two
 * places to satisfy a check. Naming the convention here is honest; asserting it
 * would enforce uniformity against the two files that are right.
 */
describe('every component presents the same API', () => {
  const sources = componentFiles.map((file) => ({
    file,
    slug: file.replace(/\.tsx$/, ''),
    source: readFileSync(join(UI_DIR, file), 'utf8'),
  }))

  it('has components to read', () => {
    expect(sources.length).toBeGreaterThan(10)
  })

  /**
   * THE PROPERTY THAT COST 35 END-TO-END FAILURES, stated positively.
   *
   * The employee screen wrote `<Alert data-testid="conflict">`. `Alert` declared
   * `testId` and did not spread, so the attribute never reached the DOM: every
   * state rendered perfectly and no spec could find any of them. Nothing could
   * have caught it — the page was right, so no visual check applies; axe was
   * clean, because a missing test id is not an accessibility fault; and
   * **TypeScript is structurally unable to see it**, because a JSX attribute
   * whose name contains a hyphen is exempt from excess-property checking. A
   * closed props type gives no protection here at all.
   *
   * THIS SUPERSEDES `tests/unit/test-id-plumbing.test.ts`, deleted in the same
   * commit under ADR-024. That suite policed the CONSEQUENCE — a `data-testid`
   * handed to a component that would drop it — and computed its subjects as
   * "components declaring `testId` that do not spread". Opening the last of
   * them emptied that set, and a suite with no subjects passes because it
   * checked nothing. This removes the CAUSE instead: a component that forwards
   * its props cannot drop one, and the set this reads is every component there
   * is.
   */
  it.each(sources)('$file forwards the props it does not name', ({ source }) => {
    // TWO IDIOMS, BOTH REAL. Most components spread; `badge.tsx` hands its props
    // to Base UI's `mergeProps`, which is what gives it the `render`
    // polymorphism its `[a]:hover:` classes are written for. Both deliver an
    // unknown attribute to the element, which is the property being asserted --
    // so the check accepts both rather than forcing one file to restate itself.
    const spreads = /\{\s*\.\.\.\w+\s*\}/.test(source)
    const merges = /mergeProps<[^>]*>\(/.test(source)
    expect(spreads || merges).toBe(true)
  })

  /**
   * `testId` is what a sealed component grows INSTEAD of forwarding props, and
   * it appeared on exactly the five that were sealed. It is a second spelling of
   * `data-testid` that agrees with the first everywhere except the DOM.
   */
  it.each(sources)('$file spells a test hook only one way', ({ source }) => {
    expect(/\btestId\s*\??\s*:/.test(source)).toBe(false)
  })

  /**
   * `data-slot` is what the conformance suites and the utility selectors address
   * a component by, so it has to be present and it has to be the contract's own
   * slug — `in-data-[slot=button-group]` in `button.tsx` is a live example.
   *
   * BOTH SPELLINGS ACCEPTED, and the reason is a real one rather than laxity:
   * `badge.tsx` emits the attribute through Base UI's `state`, which is what
   * gives it the `render` polymorphism its `[a]:hover:` classes depend on.
   * The attribute reaches the DOM identically. Reading source text cannot see
   * that, so it is granted rather than pretended away.
   *
   * NAMESPACED, NOT EXACT, and this is the part that took a measurement to get
   * right. `select.tsx`'s root is `SelectPrimitive.Root` — a context provider
   * that renders NO DOM element, so there is nothing there to stamp and a rule
   * demanding `data-slot="select"` would be demanding a wrapper element that
   * exists only to satisfy the rule. What the suites and the utility selectors
   * actually need is that a component's slots belong to it: `select-trigger`
   * and `select-content` are addressable as Select's, and that is the property.
   */
  const slotsIn = (source: string): string[] => [
    ...[...source.matchAll(/data-slot="([^"]+)"/g)].map((m) => m[1] ?? ''),
    ...[...source.matchAll(/slot:\s*'([^']+)'/g)].map((m) => m[1] ?? ''),
  ]

  /**
   * DELEGATION IS THE ONE WAY OUT, and it is structural rather than a name on a
   * list. `resource-boundary.tsx` renders no element at all — healthy it returns
   * its children, failed its whole output is an `Alert` — so the only slot it
   * could stamp would be one it took off a component that needs it. A file that
   * opens no intrinsic tag has nothing of its own to label; a file that does,
   * has no excuse. Written this way, a component that later grows a `<div>`
   * loses the exemption on the same edit, which a list of filenames would not do.
   */
  const delegatesEntirely = (source: string): boolean =>
    !(/<[a-z][a-z0-9-]*[\s/>]/.test(source) || source.includes('@base-ui'))

  it.each(sources)('$file stamps a slot that belongs to it', ({ slug, source }) => {
    const slots = slotsIn(source)
    if (slots.length === 0) {
      expect(
        delegatesEntirely(source),
        'stamps no slot, and renders an element that could carry one',
      ).toBe(true)
      return
    }
    /**
     * EVERY slot, not merely one. "At least one owned" was the first version and
     * a mutation walked straight through it: renaming `card`'s root slot to
     * `dialog` left six `card-*` slots behind, so the check stayed green while
     * the DOM claimed a Card was a Dialog. Measured across the library, no
     * component stamps a slot outside its own namespace — so the stronger rule
     * is a statement of fact rather than an aspiration, and it is the one that
     * can actually catch a borrowed identity.
     */
    const foreign = slots.filter((s) => s !== slug && !s.startsWith(`${slug}-`))
    expect(
      foreign,
      `stamps ${foreign.join(', ')}, which belong to another contract -- a ` +
        'conformance suite and a utility selector both address the DOM by slot, ' +
        'and would find this component under the wrong name',
    ).toEqual([])
    expect(
      slots.length - foreign.length,
      'has no slot of its own, so nothing can address it by contract',
    ).toBeGreaterThan(0)
  })

  it('can tell an owned slot from a borrowed one, and an element from a delegation', () => {
    expect(slotsIn('<div data-slot="select-trigger" />')).toEqual(['select-trigger'])
    expect(slotsIn("state={{ slot: 'badge' }}")).toEqual(['badge'])
    expect(slotsIn('<div data-slot="alert" />').filter((s) => s.startsWith('code'))).toEqual([])
    // Renders another contract's component and nothing else: nothing to label.
    expect(delegatesEntirely('<Alert tone="danger">text</Alert>')).toBe(true)
    // Both of these have an element of their own, so neither is excused.
    expect(delegatesEntirely('<div className="x" />')).toBe(false)
    expect(delegatesEntirely("import { X } from '@base-ui/react/x'\n<X />")).toBe(false)
  })
})
