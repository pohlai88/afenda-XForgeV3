import { expect, test } from '@playwright/test'
import { type Contract, contracts } from '@xforge/ui/contracts'
import { minimalDocument } from './documents.ts'
import { mount } from './harness.ts'

/**
 * 4C.6 — `interaction.profile: 'native-control'` preserves the platform's control.
 *
 * The profile's definition is "a native element carrying the platform's own
 * semantics", so the obligation is that the platform is still the one supplying
 * them: the element is really focusable, it declares no role of its own, and it
 * activates the way the platform activates.
 *
 * WHAT IT PROVES, AND WHAT IT REFUSES TO. It does not restate the HTML
 * specification. Enter and Space are asserted and nothing else, because those
 * two are a discriminating pair rather than the start of a keyboard matrix:
 * Enter activates on keydown and Space on keyup, so a component that has quietly
 * reimplemented activation in an `onKeyDown` handler passes the Enter assertion
 * BY CONSTRUCTION and only Space catches it.
 *
 * HOW ACTIVATION IS OBSERVED, given a configuration document is pure JSON and
 * cannot carry an `onClick`. A native control emits a click event whether or not
 * anything is listening, and a DISABLED one emits none -- so counting clicks
 * arriving at the document measures activation without the harness having to
 * grow a way to pass functions. The harness must not acquire capabilities to
 * suit a test.
 *
 * OVERLAP, DECLARED. `conformance-harness.spec.ts` already asserts that the
 * Button composed as a Dialog trigger is a real `<button>` and not a nested one.
 * That is the harder, composed case and it stays there. This asks a different
 * question of every native-control contract: that no explicit `role` overrides
 * what the element already means.
 */

const nativeControls = Object.entries(contracts)
  .filter(([, c]) => c.interaction.profile === 'native-control')
  .map(([id]) => id)
  .sort()

/** Those declaring a boolean `disabled`, since only they can be asked not to act. */
const disableable = nativeControls.filter((id) => {
  const spec = (contracts[id as keyof typeof contracts] as Contract).props?.disabled
  return spec?.type === 'boolean'
})

interface ClickCounter extends Window {
  __xfClicks?: number
}

/** Activation is a click event reaching the document, handler or not. */
const armClicks = () => {
  const w = window as ClickCounter
  w.__xfClicks = 0
  document.addEventListener('click', () => {
    w.__xfClicks = (w.__xfClicks ?? 0) + 1
  })
}

const readClicks = () => (window as ClickCounter).__xfClicks ?? 0

const rootOf = () => {
  const root = document.getElementById('root')?.firstElementChild as HTMLElement | null
  if (!root) {
    return null
  }
  root.focus()
  return {
    nested: root.querySelectorAll('button, a[href], input, select, textarea').length,
    role: root.getAttribute('role'),
    takesFocus: document.activeElement === root,
  }
}

test.describe('4C.6 — a native-control contract preserves the platform’s control', () => {
  test('the subject sets come from the registry and are not empty', () => {
    // Either set going empty would leave every obligation below governing
    // nothing while reporting the same green.
    expect(nativeControls.length).toBeGreaterThan(0)
    expect(disableable.length, 'no native control declares `disabled`').toBeGreaterThan(0)
  })

  for (const id of nativeControls) {
    test(`${id} is a real control the platform names`, async ({ page }) => {
      const failure = await mount(page, minimalDocument(id))
      expect(failure, 'the harness refused the generated document').toBeUndefined()

      const root = await page.evaluate(rootOf)
      expect(root, `${id} rendered no element`).not.toBeNull()

      expect(root?.takesFocus, `${id} is not focusable`).toBe(true)
      // The whole meaning of the profile: an explicit role would mean the
      // component is naming itself rather than being a control that already is
      // one -- and a role attribute can disagree with the element under it.
      expect(root?.role, `${id} overrides the role its element already carries`).toBeNull()
      expect(root?.nested, `${id} contains a nested control`).toBe(0)
    })

    test(`${id} activates on pointer, Enter and Space alike`, async ({ page }) => {
      await mount(page, minimalDocument(id))
      const control = page.locator('#root > *').first()

      // ARMED ONCE, and the count is cumulative. Re-arming per gesture added a
      // second listener to the same document, so one click incremented twice and
      // the suite reported an activation defect that was the test's own. A
      // running total also proves each gesture fires EXACTLY one activation,
      // which a per-gesture reset would have hidden.
      await page.evaluate(armClicks)
      let expected = 0

      for (const [gesture, activate] of [
        ['pointer', async () => await control.click()],
        [
          'Enter',
          async () => {
            await control.focus()
            await page.keyboard.press('Enter')
          },
        ],
        [
          'Space',
          async () => {
            await control.focus()
            await page.keyboard.press('Space')
          },
        ],
      ] as const) {
        await activate()
        expected += 1
        expect(await page.evaluate(readClicks), `${id} did not activate on ${gesture}`).toBe(
          expected,
        )
      }
    })
  }

  for (const id of disableable) {
    /**
     * "Looks disabled" and "is inert" are different claims, and 4C.3 proves only
     * the first: it asserts the saving control is disabled and says so, never
     * that pressing it does nothing.
     */
    test(`${id} disabled does not act, by pointer or by key`, async ({ page }) => {
      const failure = await mount(page, minimalDocument(id, { props: { disabled: true } }))
      expect(failure).toBeUndefined()

      const control = page.locator('#root > *').first()
      await page.evaluate(armClicks)

      // `force` because Playwright would otherwise wait for the control to
      // become actionable and time out -- the question here is what the browser
      // does with a real gesture at a disabled control, which is nothing.
      await control.click({ force: true })
      await control.focus()
      await page.keyboard.press('Enter')
      await page.keyboard.press('Space')

      expect(await page.evaluate(readClicks), `${id} activated while disabled`).toBe(0)
    })
  }
})
