import { expect, type Page, test } from '@playwright/test'
import { EMPLOYEE } from '@xforge/fixtures/employee'

/**
 * 4C.4 — cross-axis composition.
 *
 * 4C.2 proved the read axis and 4C.3 the write axis, each alone. These are the
 * states neither can reach: a read and a write are ORTHOGONAL, so the screen is
 * always in one of each, and the interesting cases are the pairs.
 *
 * `ready + conflict` is the one the retired seven-state model could not express
 * at all. It had `conflict` as a read state, so a refused write meant the list
 * stopped being `ready` — forcing a choice between showing the data and showing
 * the problem, when the honest answer is both.
 *
 * The last two rows are the ones that can find a defect rather than confirm a
 * composition, because they ask what a write control does when the read did not
 * succeed.
 */

const PAGE = `/employees/${EMPLOYEE}`
const LIST = '**/emergency-contacts'
const UPDATE = '**/emergency-contacts/*'

const ROWS = [
  {
    id: '88888888-8888-4888-8888-888888888881',
    name: 'Ada Lovelace',
    phone: '+60 12-345 6789',
    relationship: 'Spouse',
    version: 1,
  },
]

const COMPLETE = { completeness: 'complete' } as const
const CAPPED = {
  completeness: 'partial',
  partialReasons: [{ code: 'result_cap', limit: 100, returned: ROWS.length }],
} as const

const readAs = (page: Page, body: unknown, status = 200) =>
  page.route(LIST, (route) =>
    route.request().method() === 'GET' ? route.fulfill({ json: body, status }) : route.fallback(),
  )

const conflictOnSave = (page: Page) =>
  page.route(UPDATE, (route) => route.fulfill({ json: { title: 'Version conflict' }, status: 409 }))

test.describe('4C.4 — the two axes compose', () => {
  test('ready + conflict shows the list AND the banner', async ({ page }) => {
    await readAs(page, { items: ROWS, meta: COMPLETE })
    await conflictOnSave(page)
    await page.goto(PAGE)
    await page.getByRole('button', { name: 'Save' }).first().click()

    // The case the old model could not express: neither displaces the other.
    await expect(page.getByTestId('contacts')).toContainText('Ada Lovelace')
    await expect(page.getByTestId('conflict')).toBeVisible()
  })

  test('partial + conflict keeps the incompleteness notice as well', async ({ page }) => {
    await readAs(page, { items: ROWS, meta: CAPPED })
    await conflictOnSave(page)
    await page.goto(PAGE)
    await page.getByRole('button', { name: 'Save' }).first().click()

    // Three independent facts on screen at once, none of them cancelling another.
    await expect(page.getByTestId('contacts')).toContainText('Ada Lovelace')
    await expect(page.getByTestId('partial')).toBeVisible()
    await expect(page.getByTestId('conflict')).toBeVisible()
  })

  test('ready + add pending keeps the list readable while the write is in flight', async ({
    page,
  }) => {
    await readAs(page, { items: ROWS, meta: COMPLETE })
    let release: (() => void) | undefined
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route(LIST, async (route) => {
      if (route.request().method() !== 'POST') {
        return route.fallback()
      }
      await held
      return route.fulfill({ json: { id: 'x' }, status: 201 })
    })

    await page.goto(PAGE)
    await page.getByRole('button', { name: 'Add contact' }).click()

    await expect(page.getByRole('button', { name: 'Adding…' })).toBeDisabled()
    await expect(page.getByTestId('contacts')).toContainText('Ada Lovelace')
    release?.()
  })

  test('partial + save pending keeps both the rows and the notice', async ({ page }) => {
    await readAs(page, { items: ROWS, meta: CAPPED })
    let release: (() => void) | undefined
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route(UPDATE, async (route) => {
      await held
      return route.fulfill({ json: {}, status: 200 })
    })

    await page.goto(PAGE)
    await page.getByRole('button', { name: 'Save' }).first().click()

    // A bounded read is still usable during a write against it.
    await expect(page.getByTestId('partial')).toBeVisible()
    await expect(page.getByTestId('contacts')).toContainText('Ada Lovelace')
    release?.()
  })

  /**
   * The two rows that ask a question rather than confirm an answer.
   *
   * A write control beneath a read that did not succeed offers an action whose
   * result the user cannot see. For a collection, that means creating a
   * duplicate of something they were never shown.
   */
  test('forbidden offers no write control at all', async ({ page }) => {
    await readAs(page, { detail: 'needs hr.employee.read', title: 'Forbidden' }, 403)
    await page.goto(PAGE)

    await expect(page.getByTestId('forbidden')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add contact' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0)
  })

  test('error offers no interactive write control either', async ({ page }) => {
    await readAs(page, { detail: 'the database is unreachable', title: 'Server error' }, 500)
    await page.goto(PAGE)

    await expect(page.getByTestId('read-error')).toBeVisible({ timeout: 20_000 })
    // Recovery is the retry, not a blind write into a collection nobody can see.
    await expect(page.getByRole('button', { name: 'Try again' })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Add contact' })).toBeDisabled()
  })

  /**
   * The counterpart, so the rule above is not "writes are simply off".
   *
   * `empty` is a SUCCESSFUL read, and adding the first contact is the entire
   * point of the state — its own copy says "Add one so we know who to call".
   */
  test('empty is a successful read, so the write control stays available', async ({ page }) => {
    await readAs(page, { items: [], meta: COMPLETE })
    await page.goto(PAGE)

    await expect(page.getByTestId('empty')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add contact' })).toBeEnabled()
  })
})
