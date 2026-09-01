import { expect, test } from '@playwright/test'
import { type Contract, contracts } from '@xforge/ui/contracts'
import { ANNOUNCEMENT, TONE_ANNOUNCEMENT } from '@xforge/ui/live-region'
import { minimalDocument } from './documents.ts'
import { mount } from './harness.ts'

/**
 * 4C.6 — `interaction.profile: 'live-region'` announces at the politeness it
 * declares.
 *
 * The profile's own definition says politeness is the whole design. 4C.2 already
 * asserts the ROLE on each state element of the shipping screen, and this does
 * not repeat that: the polite/assertive split is a separate fact, it lives on the
 * component rather than the screen, and this file is what asserts it.
 *
 * THE MAPPING IS CALLED, NOT COPIED. `TONE_ANNOUNCEMENT` is the one authority
 * for which tone announces how -- it was four statements before this stage: the
 * contract's comment, the component's comment, and two independently computed
 * ternaries in the markup. A spec restating it would have been the fifth, and
 * would have passed while agreeing with a mistake.
 *
 * SO WHAT DOES THIS ACTUALLY CHECK, if it reads the same map the component
 * reads? Three things the map cannot vouch for:
 *
 *   1. the DOM matches the map at all -- the component could ignore it
 *   2. role and politeness are a COHERENT pair, which is W3C's rule and not
 *      this repository's, so asserting it is not a copy of anything here
 *   3. the map still DISCRIMINATES -- degrade it to all-polite and every
 *      per-tone assertion still passes, because they read it. Only an invariant
 *      about the map catches that.
 */

const liveRegions = Object.entries(contracts)
  .filter(([, c]) => c.interaction.profile === 'live-region')
  .map(([id]) => id)
  .sort()

/** The enum a contract declares for a prop, or nothing if it declares no such prop. */
function declaredValues(id: string, prop: string): readonly unknown[] | undefined {
  const spec = (contracts[id as keyof typeof contracts] as Contract).props?.[prop]
  return spec && spec.type === 'enum' ? spec.values : undefined
}

const observeRoot = () => {
  const root = document.getElementById('root')?.firstElementChild
  return root ? { ariaLive: root.getAttribute('aria-live'), role: root.getAttribute('role') } : null
}

const pairs = Object.values(ANNOUNCEMENT).map((a) => `${a.role}/${a.ariaLive}`)

test.describe('4C.6 — a live region announces at the politeness it declares', () => {
  test('there are live-region contracts to check', () => {
    // A suite that iterates nothing prints the same green as one that proved
    // every announcement correct.
    expect(liveRegions.length).toBeGreaterThan(0)
  })

  /**
   * Coherence, for every live-region contract whatever discriminator it has.
   *
   * `role="alert"` carries an implicit `aria-live="assertive"` and
   * `role="status"` an implicit `polite`, so the crossed combinations declare an
   * urgency their own role contradicts. That is the defect two independent
   * ternaries could produce from one edit, and it is a W3C rule rather than an
   * Xforge one -- which is why asserting it here duplicates nothing.
   */
  for (const id of liveRegions) {
    test(`${id} pairs its role and politeness coherently`, async ({ page }) => {
      const failure = await mount(page, minimalDocument(id))
      expect(failure, 'the harness refused the generated document').toBeUndefined()

      const root = await page.evaluate(observeRoot)
      expect(root, `${id} rendered no element`).not.toBeNull()
      expect(pairs, `${id} announces ${root?.role}/${root?.ariaLive}`).toContain(
        `${root?.role}/${root?.ariaLive}`,
      )
    })
  }

  /**
   * Every tone the CONTRACT declares, not a list written here.
   *
   * Add a fourth tone and it is exercised without anyone remembering to; and if
   * the component ignores the map for that tone, this is what says so.
   */
  const tones = declaredValues('Alert', 'tone') ?? []

  test('the tone vocabulary is read from the contract and is not empty', () => {
    expect(
      tones.length,
      'Alert declares no tone enum -- this suite governs nothing',
    ).toBeGreaterThan(1)
  })

  for (const tone of tones as string[]) {
    test(`an Alert toned ${tone} announces as the mapping says`, async ({ page }) => {
      const failure = await mount(page, minimalDocument('Alert', { props: { tone } }))
      expect(failure, 'the harness refused the generated document').toBeUndefined()

      const expected = ANNOUNCEMENT[TONE_ANNOUNCEMENT[tone as keyof typeof TONE_ANNOUNCEMENT]]
      const root = await page.evaluate(observeRoot)
      expect(root?.role, `${tone} role`).toBe(expected.role)
      expect(root?.ariaLive, `${tone} politeness`).toBe(expected.ariaLive)
    })
  }

  /**
   * The invariant ABOUT the mapping, which the per-tone specs cannot supply.
   *
   * They read `TONE_ANNOUNCEMENT`, so flattening it to a single politeness keeps
   * every one of them green while `tone` silently stops deciding anything. This
   * is the assertion that notices: a prop whose values all mean the same thing
   * is a prop that has quietly become decoration.
   */
  test('tone still discriminates -- both politeness levels are reachable', () => {
    const used = new Set(Object.values(TONE_ANNOUNCEMENT))
    expect([...used].sort()).toEqual(Object.keys(ANNOUNCEMENT).sort())

    // And every declared tone is actually mapped, so a new one added to the
    // contract cannot render at whatever `undefined` produces.
    for (const tone of tones as string[]) {
      expect(
        Object.keys(TONE_ANNOUNCEMENT),
        `the contract declares tone "${tone}" and the mapping does not name it`,
      ).toContain(tone)
    }
  })

  /**
   * The one fact here with no other owner, recorded as such.
   *
   * `Status` reports work in progress and takes no discriminating prop, so
   * nothing derives its politeness -- the component chooses `polite` and this is
   * the only thing that says it must. It IS therefore a second copy, kept
   * deliberately: the alternative is a silent hole where a progress indicator
   * could become assertive and interrupt every reader on every load.
   *
   * It stops being a copy when politeness moves into contract data, which
   * `project-state.md` records as undecided.
   */
  test('Status does not interrupt', async ({ page }) => {
    const failure = await mount(page, minimalDocument('Status'))
    expect(failure).toBeUndefined()

    const root = await page.evaluate(observeRoot)
    expect(root?.ariaLive, 'a progress announcement must not interrupt').toBe(
      ANNOUNCEMENT.polite.ariaLive,
    )
  })
})
