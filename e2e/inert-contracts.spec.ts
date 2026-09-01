import { expect, test } from '@playwright/test'
import { type Contract, contracts } from '@xforge/ui/contracts'
import { type ConfigNode, minimalDocument } from './documents.ts'
import { mount } from './harness.ts'

/**
 * 4C.6 — `interaction.profile: 'none'` means inert, and is shown to be.
 *
 * ADR-025 derives the whole assistive-technology gate from the profile a
 * contract declares, so `none` is the cheapest possible escape from it: a
 * one-word edit.
 *
 * `interaction-profile-mutation.test.ts` is the record of which contracts that
 * escape is noticed for, and THIS FILE is what every one of its
 * `provenElsewhere` rows points at -- a contract whose root accepts focus,
 * carries a live-region marker, or wires an accessible name. Those rows name
 * this path, and one of that suite's assertions fails if this file stops
 * existing, so the two cannot drift apart quietly.
 *
 * SUBJECTS ARE DERIVED, NEVER LISTED. The set below is read from the registry
 * by profile. A hand-written list of component names would protect only the
 * contracts that existed when somebody typed it, and would reintroduce -- one
 * level down -- exactly what ADR-025 removed.
 *
 * THE DOCUMENTS ARE GENERATED FOR THE SAME REASON. Hand-writing a fixture per
 * contract is a list of component names wearing a different hat, and it rots
 * the moment a contract gains a required prop. `minimalDocument()` reads the
 * contract's own props and slots and builds the smallest thing the grammar
 * accepts, so a contract that changes shape either still mounts or fails here
 * loudly.
 *
 * THE ASSERTION IS ABOUT THE ROOT, NEVER THE SUBTREE. Stack, ListItem and
 * EmptyState legitimately contain a Button -- those three, and NOT Card or Page,
 * whose slots admit `layout`, `content`, `collection` and `feedback` but
 * deliberately not `action`. The first draft of the spec below put a Button in a
 * Card on the strength of this paragraph and the harness refused the document,
 * which is the grammar being right and the comment being written from memory.
 *
 * `none` describes what the contract itself contributes to the interaction
 * model. A naive "nothing inside this is focusable" would be false for every
 * container that admits an action, so a test written to pass against that
 * falsity would be worse than no test. The last spec in this file exists to keep
 * that honest.
 */

/** Roles that make an element a control. A `none` root may declare none of them. */
const INTERACTIVE_ROLES = [
  'button',
  'checkbox',
  'combobox',
  'gridcell',
  'link',
  'menuitem',
  'option',
  'radio',
  'slider',
  'switch',
  'tab',
  'textbox',
  'treeitem',
]

/**
 * Roles that announce. A `none` root may declare none of these either.
 *
 * THIS CLAUSE WAS NOT IN THE FIRST DRAFT of the obligation, and writing the
 * mutation table is what added it: a live region is not focusable and carries no
 * interactive role, so inertness scoped to focus alone would have passed an
 * Alert or a Status mis-declared as `none`. The hole was found by construction.
 */
const LIVE_ROLES = ['alert', 'log', 'marquee', 'status', 'timer']

/** What the contract's own root element does, observed rather than inspected. */
const observeRoot = () => {
  const root = document.getElementById('root')?.firstElementChild as HTMLElement | null
  if (!root) {
    return null
  }
  // BEHAVIOURAL, not a property read. Asking the element to take focus and
  // seeing whether it did is the question; `tabIndex === -1` is an
  // implementation detail that can be true of something focus still reaches.
  root.focus()
  return {
    ariaLive: root.getAttribute('aria-live'),
    role: root.getAttribute('role'),
    tabindex: root.getAttribute('tabindex'),
    tag: root.tagName.toLowerCase(),
    tookFocus: document.activeElement === root,
  }
}

/**
 * Elements named or described by pointing at another element the SAME contract
 * rendered.
 *
 * `aria-labelledby` whose target sits outside this document is a caller's
 * business -- `Card` takes a `labelledBy` prop naming a heading its consumer
 * owns, and that is not the contract wiring anything. What this catches is a
 * contract supplying both ends: a label it rendered, and a control it pointed at
 * that label.
 */
const referencedNames = () => {
  const root = document.getElementById('root')
  if (!root) {
    return []
  }
  const wired: string[] = []
  for (const el of root.querySelectorAll('[aria-labelledby], [aria-describedby]')) {
    const ids = ['aria-labelledby', 'aria-describedby']
      .flatMap((attribute) => (el.getAttribute(attribute) ?? '').split(/\s+/))
      .filter(Boolean)
    if (ids.some((id) => root.querySelector(`#${CSS.escape(id)}`))) {
      wired.push(`${el.tagName.toLowerCase()}[role=${el.getAttribute('role') ?? 'none'}]`)
    }
  }
  return wired
}

const INERT = Object.entries(contracts)
  .filter(([, c]) => c.interaction.profile === 'none')
  .map(([id]) => id)
  .sort()

test.describe('4C.6 — a contract declaring `none` introduces no interaction stop', () => {
  test('the subject set comes from the registry and is not empty', () => {
    // A suite that iterates nothing reports the same green as one that proved
    // every contract inert.
    expect(INERT.length).toBeGreaterThan(0)

    // AND NOTHING ELSE, deliberately. Two stronger-looking lines stood here and
    // both were incapable of failing:
    //
    //   rebuilding INERT with the same filter and comparing lengths -- a
    //   derivation measured against itself
    //
    //   splitting the registry on `=== 'none'` and `!== 'none'` and requiring
    //   the halves to sum -- exact complements, so the sum is the total by
    //   construction. Verified by planting a contract and watching it stay
    //   green.
    //
    // Conservation is the right instinct and the wrong shape here: it catches
    // items falling out of every bucket, and two complementary predicates have
    // no such gap. The population risk this file actually carries is the set
    // going EMPTY, which the line above catches. Whether a profile is one the
    // vocabulary knows is asked once, in
    // `tests/unit/interaction-profile-mutation.test.ts`, and asking it twice
    // would be the second source this stage exists to remove.
  })

  /**
   * The wiring clause's soundness, asserted rather than commented.
   *
   * It attributes every wired relationship to the contract under test, which
   * holds only while no generated document contains a `form-control` -- a nested
   * Field wires names of its own, and the clause cannot tell whose they are.
   * That was not hypothetical: capability-first filling produced
   * `Stack{Field{Checkbox}}` and reported Stack as wiring a name it never wired.
   *
   * The generator now prefers the cheapest kind, so no document reaches one. If
   * a slot ever admits ONLY a form-control, this goes red rather than the wiring
   * clause quietly returning a wrong answer -- which is the difference between a
   * caveat somebody has to remember and one the suite enforces.
   */
  test('no inert contract generates a form-control, which the wiring clause assumes', () => {
    const componentsIn = (node: ConfigNode): string[] => [
      node.component,
      ...Object.values(node.slots ?? {}).flatMap((value) =>
        Array.isArray(value) ? value.flatMap(componentsIn) : [],
      ),
    ]

    const offenders = INERT.flatMap((id) =>
      componentsIn(minimalDocument(id))
        .filter(
          (component) =>
            (contracts[component as keyof typeof contracts] as Contract).interaction.profile ===
            'form-control',
        )
        .map((component) => `${id} -> ${component}`),
    )
    expect(offenders, 'the wiring clause can no longer attribute what it finds').toEqual([])
  })

  for (const id of INERT) {
    test(`${id} takes no focus and announces nothing of its own`, async ({ page }) => {
      const document_ = minimalDocument(id)
      const failure = await mount(page, document_)
      expect(
        failure,
        `the harness refused the generated document ${JSON.stringify(document_)}`,
      ).toBeUndefined()

      const root = await observeRootIn(page)
      expect(root, `${id} rendered no element`).not.toBeNull()

      expect(root?.tookFocus, `${id} root accepted focus`).toBe(false)
      expect(root?.tabindex, `${id} root declares an author-created tab stop`).toBeNull()
      expect(INTERACTIVE_ROLES, `${id} root declares an interactive role`).not.toContain(root?.role)
      expect(
        root?.ariaLive,
        `${id} root carries aria-live while declaring no interaction`,
      ).toBeNull()
      expect(LIVE_ROLES, `${id} root declares a live-region role`).not.toContain(root?.role)

      // AND IT WIRES NO ACCESSIBLE RELATIONSHIP. Naming another element BY
      // REFERENCE is `form-control` behaviour, and it is the only signature that
      // separates a Field from an inert wrapper: a Field is not focusable,
      // declares no interactive role and carries no live-region marker, so every
      // clause above passes one mis-declared as `none`. This is the clause that
      // does not.
      //
      // BY REFERENCE is the whole precision. A Button inside a ListItem is named
      // by its own text content and wires nothing, which is why the obvious
      // version of this check -- "no descendant control has an accessible name"
      // -- failed List and ListItem while still missing Field, whose control is a
      // `span[role=checkbox]` that a tag-based selector never saw.
      expect(await page.evaluate(referencedNames), `${id} wires a name for something`).toEqual([])
    })
  }

  /**
   * The spec that keeps the rule from being read as "nothing inside is
   * focusable".
   *
   * A Card holding a Button is legal, common, and must remain conformant. If
   * this ever fails, the inertness assertion above has drifted from the root to
   * the subtree, and every container in the vocabulary is about to be reported
   * as violating a profile it satisfies.
   */
  test('descendant interactivity is permitted and outside the assertion', async ({ page }) => {
    const failure = await mount(page, {
      component: 'Stack',
      slots: { children: [{ component: 'Button', slots: { children: 'Save' } }] },
    })
    expect(failure, 'a Stack containing a Button is a legal document').toBeUndefined()

    const root = await observeRootIn(page)
    expect(root?.tag, 'the Stack is still the root').toBe('div')
    expect(root?.tookFocus, 'the Stack root is still inert').toBe(false)

    // And the control inside it is genuinely focusable, so the case is real
    // rather than a Card that happens to contain nothing interactive.
    const button = page.getByRole('button', { name: 'Save' })
    await button.focus()
    await expect(button).toBeFocused()
  })
})

async function observeRootIn(page: import('@playwright/test').Page) {
  return await page.evaluate(observeRoot)
}
