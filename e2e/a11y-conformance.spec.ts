import { expect, test } from '@playwright/test'
import { EMPLOYEE } from '@xforge/fixtures/employee'
import { scan } from './axe.ts'

/**
 * A11y-1 — the general question, asked of every surface the product can show.
 *
 * RESTORED, AND THE REASON IT HAD TO BE. `e2e/axe.ts` was written at 4C.5 with
 * the commit message "Prove the accessibility claims this repository was already
 * making". The two specs that called it were deleted in the cutover to
 * `packages/design`, and the helper survived with NO CALLER — so the only
 * mechanical WCAG check in the repository stopped running while its own header
 * still read "TWO SPECS SCAN, AND THEY SCAN DIFFERENT THINGS". Zero specs
 * scanned. A grep for `axe` across the tree returned the word "axes" and prose.
 *
 * THAT IS NOT A TIDINESS PROBLEM, it voided an ADR. ADR-025 reduced the
 * screen-reader gate from four contracts to one partly because the ungated
 * profiles "rest on native semantics that A11y-1 verifies statically", and its
 * Verification section says outright: "If that spec is deleted, this ADR loses
 * its basis and the reduction is no longer justified." The spec was deleted.
 * Nothing went red, because no guard reads a sentence claiming a check exists --
 * which is the SECOND time this exact document has failed this exact way, both
 * recorded in its own correction note.
 *
 * WHY THIS FILE OWNS ITS OWN ROUTE TABLE rather than importing the state specs'.
 * The deleted version did the same, and the duplication is deliberate: those
 * specs assert what each state PERMITS, and re-entering them to bolt a scan onto
 * every assertion would give each test two jobs and one failure mode covering
 * both. The question here is different from theirs --
 *
 *   is there a WCAG A/AA violation nobody thought to write an assertion for?
 *
 * -- and the states are merely how a surface is reached. What must NOT be
 * duplicated is the scan itself, which is why it lives in `axe.ts`.
 *
 * IT WAS PAIRED, AND IT IS NOW ALONE. `design-system-conformance.spec.ts` scanned
 * the component vocabulary -- the 17 of 28 contracts that no route mounts -- by
 * driving the gallery. The gallery was deleted, so that spec was deleted with it,
 * and this file is the only axe scan left in the repository.
 *
 * WHAT THAT MEANS FOR A GREEN RUN HERE, stated because a scan is the easiest
 * green in a repository to over-read: this covers what the PRODUCT renders and
 * nothing else. Dialog, Select and Tooltip carry the `modal`, `composite` and
 * `disclosure` profiles, appear on no route, and are now scanned by nothing. A
 * clean run of this file is not a clean run over the design system.
 */

const PAGE = `/employees/${EMPLOYEE}`
const LIST = '**/emergency-contacts'
const UPDATE = '**/emergency-contacts/*'

/**
 * Rows that exist only in a response, in the `88888888` namespace that nothing
 * else in the repository uses -- a fabricated row must not borrow the seeded
 * row's identity.
 */
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

test.describe('A11y-1 — every read state survives a WCAG A/AA scan', () => {
  test('empty', async ({ page }) => {
    await page.route(LIST, (route) => route.fulfill({ json: { items: [], meta: COMPLETE } }))
    await page.goto(PAGE)
    await expect(page.getByTestId('empty')).toBeVisible()
    await scan(page, 'read state: empty')
  })

  test('ready', async ({ page }) => {
    await page.route(LIST, (route) => route.fulfill({ json: { items: ROWS, meta: COMPLETE } }))
    await page.goto(PAGE)
    await expect(page.getByTestId('contacts')).toBeVisible()
    await scan(page, 'read state: ready')
  })

  test('partial', async ({ page }) => {
    await page.route(LIST, (route) => route.fulfill({ json: { items: ROWS, meta: CAPPED } }))
    await page.goto(PAGE)
    await expect(page.getByTestId('partial')).toBeVisible()
    await scan(page, 'read state: partial')
  })

  /**
   * The two refusals are scanned separately because they render different
   * surfaces, and because contrast on a message nobody expected to read is
   * exactly the sort of thing a hand-written assertion does not think to check.
   */
  test('forbidden', async ({ page }) => {
    await page.route(LIST, (route) =>
      route.fulfill({
        json: { detail: 'needs hr.employee.read', title: 'Forbidden' },
        status: 403,
      }),
    )
    await page.goto(PAGE)
    await expect(page.getByTestId('forbidden')).toBeVisible()
    await scan(page, 'read state: forbidden')
  })

  test('error', async ({ page }) => {
    await page.route(LIST, (route) =>
      route.fulfill({ json: { title: 'Server error' }, status: 500 }),
    )
    await page.goto(PAGE)
    await expect(page.getByTestId('read-error')).toBeVisible()
    await scan(page, 'read state: error')
  })
})

test.describe('A11y-1 — every write outcome with a surface survives it too', () => {
  const ready = async (page: import('@playwright/test').Page) => {
    await page.route(LIST, (route) => route.fulfill({ json: { items: ROWS, meta: COMPLETE } }))
  }

  /**
   * `conflict` is the one that matters most here and the reason this suite is
   * not just the read states. A 409 keeps the read visible AND reports a
   * problem, so two live regions and a full list are on screen at once -- the
   * densest surface the product can produce, and the one a scan is most likely
   * to find something in.
   */
  test('conflict', async ({ page }) => {
    await ready(page)
    await page.route(UPDATE, (route) =>
      route.fulfill({ json: { title: 'Version conflict' }, status: 409 }),
    )
    await page.goto(PAGE)
    await page.getByRole('button', { name: 'Save' }).first().click()
    await expect(page.getByTestId('conflict')).toBeVisible()
    await scan(page, 'write outcome: conflict')
  })

  test('failed', async ({ page }) => {
    await ready(page)
    await page.route(UPDATE, (route) =>
      route.fulfill({ json: { title: 'Server error' }, status: 500 }),
    )
    await page.goto(PAGE)
    await page.getByRole('button', { name: 'Save' }).first().click()
    await expect(page.getByTestId('write-failed')).toBeVisible()
    await scan(page, 'write outcome: failed')
  })
})
