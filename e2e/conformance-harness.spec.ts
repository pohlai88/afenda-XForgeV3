import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, type Page, test } from '@playwright/test'

/**
 * Does the vocabulary actually say anything?
 *
 * Every contract and slot so far was designed against an imagined caller.
 * The compiler checked that components match contracts; a schema checked that
 * documents match the grammar. Neither ever took a document and produced a
 * screen, so nothing has established that the grammar can EXPRESS the screen it
 * was designed from.
 *
 * These specs render the emergency-contacts screen twice -- once from the
 * hand-built JSX that ships, once from configuration through the harness -- and
 * compare the accessible trees. Functional equivalence, not pixel identity:
 * roles, names, states and order are what a screen reader consumes and what a
 * metadata renderer would have to reproduce.
 *
 * THE REAL OUTPUT IS THE DIVERGENCE LIST. A harness that renders *something*
 * gets declared a pass; what tells you whether stage 1 was designed right is
 * the set of things the vocabulary could not say. Where these specs find one,
 * it is fixed or recorded as a known grammar gap -- never quietly accommodated
 * by editing the configuration until it matches.
 */
/**
 * A DIFFERENT employee from the emergency-contacts specs, deliberately.
 *
 * These specs add a contact to compare a populated list, and sharing an
 * employee meant consuming the precondition the spec beside them depends on --
 * "renders the empty state before anything exists" failed because this file
 * sorts first and had already added one. Fixing that by renaming a file would
 * make alphabetical order load-bearing, which is the same defect as trusting
 * CSS source order.
 *
 * `emergency_contact.employee_id` carries no foreign key, so a distinct id
 * isolates the two suites completely.
 */
const EMPLOYEE = '44444444-4444-4444-8444-444444444444'
const PAGE = `/employees/${EMPLOYEE}`
const ROOT = join(import.meta.dirname, '..')

const harnessBundle = () => readFileSync(join(ROOT, 'tests/harness/dist/harness.iife.js'), 'utf8')
const stylesheet = (p: string) => readFileSync(join(ROOT, p), 'utf8')
const documents = JSON.parse(
  readFileSync(join(ROOT, 'tests/harness/emergency-contacts.config.json'), 'utf8'),
) as Record<string, unknown>

/**
 * Mount a configuration document in a blank page.
 *
 * `setContent` rather than a route: the harness must not ship. The stylesheets
 * are inlined because target size and focus behaviour are only real once the
 * design system's CSS is applied -- an accessible tree would compare fine
 * without them and a keyboard spec would not.
 */
async function mount(page: Page, config: unknown) {
  await page.setContent(
    `<!doctype html><html lang="en"><head><style>
       ${stylesheet('packages/tokens/generated/tokens.css')}
       ${stylesheet('packages/ui/src/ui.css')}
     </style></head><body><div id="root"></div>
     <script>window.__XFORGE_CONFIG__ = ${JSON.stringify(config)}</script>
     <script>${harnessBundle()}</script>
     </body></html>`,
  )
  await page.waitForFunction(
    () =>
      document.documentElement.hasAttribute('data-harness-ready') ||
      document.documentElement.hasAttribute('data-harness-error'),
  )
  const failure = await page.evaluate(() => window.__XFORGE_HARNESS_ERROR__)
  return failure
}

const card = (page: Page) => page.getByRole('region', { name: 'Emergency contacts' })

test.describe('the grammar can express the screen it was designed from', () => {
  test('the empty state renders an equivalent accessible tree', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.getByTestId('empty')).toBeVisible()
    const handBuilt = await card(page).ariaSnapshot()

    const failure = await mount(page, documents.empty)
    expect(failure, 'the harness refused the document').toBeUndefined()
    const fromConfig = await card(page).ariaSnapshot()

    expect(fromConfig).toBe(handBuilt)
  })

  test('the populated list renders an equivalent accessible tree', async ({ page }) => {
    await page.goto(PAGE)
    await page.getByRole('button', { name: 'Add contact' }).click()
    await expect(page.getByTestId('contacts')).toBeVisible()
    const handBuilt = await card(page).ariaSnapshot()

    const failure = await mount(page, documents.ready)
    expect(failure, 'the harness refused the document').toBeUndefined()
    const fromConfig = await card(page).ariaSnapshot()

    expect(fromConfig).toBe(handBuilt)
  })

  /**
   * Criterion 2: the keyboard behaviour survives the change of renderer.
   *
   * Not a copy of the A11y-2 spec's assertions with the selectors adjusted --
   * that would be a second spec agreeing with the first because both were
   * written by the same hand on the same day. These are the properties that
   * spec asserts about the shipping screen, asked of the configured one.
   */
  test('every control is reachable by Tab, in the same order', async ({ page }) => {
    // Deliberately does NOT add a contact: the previous test added one, and the
    // `ready` document describes a list of exactly one. Adding a second here
    // made the real page show two Save buttons against a document describing
    // one, and the resulting difference looked like a grammar gap when it was
    // only a difference in data. The specs in this file share state in order,
    // as the emergency-contacts specs beside them do.
    await page.goto(PAGE)
    await expect(page.getByTestId('contacts')).toBeVisible()
    const handBuilt = await tabOrder(page)

    await mount(page, documents.ready)
    const fromConfig = await tabOrder(page)

    expect(fromConfig).toEqual(handBuilt)
    expect(
      fromConfig.length,
      'no controls found -- this would pass having checked nothing',
    ).toBeGreaterThan(0)
  })
})

/**
 * The accessible names of the buttons Tab reaches, in order, stopping when the
 * sequence wraps.
 *
 * Breaks on ANY repeat rather than on a return to the first entry. Two
 * identically-named controls -- two rows each offering Save -- would otherwise
 * end the walk at the second one and silently report a shorter sequence than
 * the page actually has.
 */
async function tabOrder(page: Page): Promise<string[]> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  const seen: string[] = []
  for (let i = 0; i < 20; i += 1) {
    await page.keyboard.press('Tab')
    const label = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body || el.tagName !== 'BUTTON') {
        return ''
      }
      return (el.textContent ?? '').trim()
    })
    if (!label) {
      continue
    }
    if (seen.includes(label)) {
      break
    }
    seen.push(label)
  }
  return seen
}

test.describe('the harness refuses what the grammar forbids', () => {
  // The pipeline is validate -> resolve -> render, and the first step has to be
  // real. A harness that rendered whatever it was given would prove the
  // registry works and say nothing about the grammar.
  test('a document naming an unregistered component', async ({ page }) => {
    const failure = await mount(page, { component: 'Toolbar', slots: { children: 'x' } })
    expect(failure).toMatch(/not valid against the UI grammar/)
  })

  test('a Button where the grammar permits only ListItem', async ({ page }) => {
    const failure = await mount(page, {
      component: 'List',
      slots: { children: [{ component: 'Button', slots: { children: 'Save' } }] },
    })
    expect(failure).toMatch(/not valid against the UI grammar/)
  })

  /**
   * The obligation JSON Schema could not express.
   *
   * The generated schema's own description records that a document can be valid
   * against it and still nest past `MAX_NESTING_DEPTH`, because JSON Schema has
   * no recursion bound -- and it names the validator as owing the check. This
   * is that validator, and this is the check.
   */
  test('a document nested deeper than the stated maximum', async ({ page }) => {
    let doc: unknown = { component: 'Text', slots: { children: 'deep' } }
    for (let i = 0; i < 12; i += 1) {
      doc = { component: 'Stack', slots: { children: [doc] } }
    }
    const failure = await mount(page, doc)
    expect(failure).toMatch(/nests deeper than/)
  })
})

/**
 * APG conformance for the modal, hand-authored.
 *
 * This is the "two authorities" rule in practice. The contracts could generate
 * a coverage test asserting that Dialog has a title and closes on Escape, and
 * it would agree with the contract by construction -- set the contract wrong
 * and the generated test, the documentation and the implementation would all
 * agree and all be wrong. These assertions come from the APG dialog pattern
 * instead, and are written to disagree with the contract if the behaviour is
 * broken.
 *
 * It also discharges the A11y-2 half of the evidence debt for Dialog, Field,
 * Input and Checkbox. Nothing in the repository had ever mounted them; the
 * behaviour was delegated to Base UI and verified by reading its source, which
 * is not the same as observing it. A11y-3 -- an actual screen reader -- remains
 * owed and unscheduled.
 */
test.describe('the modal behaves as the APG dialog pattern requires', () => {
  const open = async (page: Page) => {
    await mount(page, documents.dialog)
    await page.getByRole('button', { name: 'Remove' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  }

  test('the trigger is a real button, not a wrapper around one', async ({ page }) => {
    await mount(page, documents.dialog)
    const trigger = page.getByRole('button', { name: 'Remove' })
    await expect(trigger).toBeVisible()
    // The composed Button, not a span holding one, and not a button inside a
    // button -- both of which this component shipped at some point today.
    expect(await trigger.evaluate((el) => el.tagName)).toBe('BUTTON')
    expect(await trigger.locator('button').count()).toBe(0)
  })

  test('it is named by its title and described by its description', async ({ page }) => {
    await open(page)
    await expect(page.getByRole('dialog')).toHaveAccessibleName('Remove emergency contact')
    await expect(page.getByRole('dialog')).toHaveAccessibleDescription('This cannot be undone.')
  })

  test('focus moves into the dialog when it opens', async ({ page }) => {
    await open(page)
    const inside = await page.evaluate(
      () => document.activeElement?.closest('[role="dialog"]') !== null,
    )
    expect(inside).toBe(true)
  })

  /**
   * Polls rather than reading `activeElement` once.
   *
   * The first version asserted synchronously after each keypress and failed
   * about one run in six, always on the fourth Tab -- which is exactly the wrap,
   * this dialog having four focusable descendants. A focus trap moves focus
   * itself to wrap the sequence, so there is a moment where the previous
   * element has blurred and the next has not yet been focused. Reading in that
   * window sees `body`.
   *
   * The property is that focus SETTLES inside the dialog, not that it is inside
   * at every instant of a transition the trap is performing.
   */
  test('Tab does not leave the dialog', async ({ page }) => {
    await open(page)
    const focusIsInside = () =>
      page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null)

    for (let i = 0; i < 10; i += 1) {
      await page.keyboard.press('Tab')
      await expect.poll(focusIsInside, { message: `focus escaped after ${i + 1} tabs` }).toBe(true)
    }
  })

  test('Escape closes it and focus returns to the trigger', async ({ page }) => {
    await open(page)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    const returned = await page.evaluate(() => (document.activeElement?.textContent ?? '').trim())
    expect(returned).toBe('Remove')
  })

  /**
   * The labelling chain the Field contract exists to guarantee, observed rather
   * than inferred from Base UI's source. A text input and a checkbox both take
   * their accessible name from the Field that wraps them -- which is the claim
   * that a whitelist of `accepts: ['Input']` was briefly built on top of, and
   * got backwards.
   */
  test('each field control is named by its Field label', async ({ page }) => {
    await open(page)
    await expect(page.getByRole('textbox')).toHaveAccessibleName('Reason')
    await expect(page.getByRole('textbox')).toHaveAccessibleDescription(
      'Recorded on the audit trail.',
    )
    await expect(page.getByRole('checkbox')).toHaveAccessibleName('Notify the employee')
  })

  test('every control in the dialog meets the 24px target floor', async ({ page }) => {
    await open(page)
    const controls = page.getByRole('dialog').getByRole('button')
    const count = await controls.count()
    expect(count, 'no controls measured').toBeGreaterThan(0)
    for (let i = 0; i < count; i += 1) {
      const box = await controls.nth(i).boundingBox()
      expect(box?.width).toBeGreaterThanOrEqual(24)
      expect(box?.height).toBeGreaterThanOrEqual(24)
    }
    const checkbox = await page.getByRole('checkbox').boundingBox()
    expect(checkbox?.width).toBeGreaterThanOrEqual(24)
    expect(checkbox?.height).toBeGreaterThanOrEqual(24)
  })
})
