import { expect, test } from '@playwright/test'
import { EMPLOYEE } from '@xforge/fixtures/employee'

/**
 * 4C.5 — error containment.
 *
 * The mapper refuses an unrecognised wire code rather than inventing a meaning
 * for it, and it runs during render. So the refusal is a throw, and the question
 * this answers is what a throw costs.
 *
 * THE PRODUCER IS REAL, and it is the one `resource-state.ts` already names. The
 * API is mounted inside this app, so client and server cannot version-skew
 * independently — but a tab open across a rolling deploy can meet a server
 * emitting a reason code its bundle predates. That window is bounded and
 * measured in minutes, which is exactly why refusing is the right trade: the
 * alternative weakens the model permanently to cover a transient case.
 *
 * Driven here by a `partialReasons` code the client has never heard of, which is
 * the shape a new reason would actually arrive in.
 */

const PAGE = `/employees/${EMPLOYEE}`
const LIST = '**/emergency-contacts'

const ROWS = [
  {
    id: '88888888-8888-4888-8888-888888888881',
    name: 'Ada Lovelace',
    phone: '+60 12-345 6789',
    relationship: 'Spouse',
    version: 1,
  },
]

/** A completeness reason from a server newer than this bundle. */
const UNKNOWN_REASON = {
  completeness: 'partial',
  partialReasons: [{ code: 'redacted', limit: 100, returned: 1 }],
} as const

test.describe('4C.5 — an unknown wire code costs one surface, not the page', () => {
  test('the failure is contained and the rest of the page survives', async ({ page }) => {
    await page.route(LIST, (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({ json: { items: ROWS, meta: UNKNOWN_REASON } })
        : route.fallback(),
    )
    await page.goto(PAGE)

    const stale = page.getByTestId('stale-client')
    await expect(stale).toBeVisible()

    // Contained to the SURFACE. The section is the surface -- its own heading
    // goes with it, because a heading claiming a section that could not render
    // is a worse lie than its absence. What must survive is the page.
    await expect(page.getByRole('heading', { name: 'Employee' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Emergency contacts' })).toHaveCount(0)
  })

  test('it offers a reload, and does NOT offer a retry', async ({ page }) => {
    await page.route(LIST, (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({ json: { items: ROWS, meta: UNKNOWN_REASON } })
        : route.fallback(),
    )
    await page.goto(PAGE)

    // The load-bearing assertion. Asking the same stale bundle again fixes
    // nothing, and `retryable` exists precisely so a control does not appear
    // for something it cannot fix.
    await expect(page.getByRole('button', { name: 'Reload the page' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0)
  })

  test('assistive technology can discover it', async ({ page }) => {
    await page.route(LIST, (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({ json: { items: ROWS, meta: UNKNOWN_REASON } })
        : route.fallback(),
    )
    await page.goto(PAGE)

    const stale = page.getByTestId('stale-client')
    await expect(stale).toHaveAttribute('role', 'alert')
    // It says what happened and what to do, not just that something broke.
    await expect(stale).toContainText('out of date')
    await expect(stale).toContainText('Reloading will fetch the current version')
  })

  /**
   * The counterpart, so containment is not "the surface is always broken".
   *
   * A reason code the client DOES know renders normally through the same path.
   */
  test('a known reason code still renders the partial state', async ({ page }) => {
    await page.route(LIST, (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({
            json: {
              items: ROWS,
              meta: {
                completeness: 'partial',
                partialReasons: [{ code: 'result_cap', limit: 100, returned: 1 }],
              },
            },
          })
        : route.fallback(),
    )
    await page.goto(PAGE)

    await expect(page.getByTestId('partial')).toBeVisible()
    await expect(page.getByTestId('stale-client')).toHaveCount(0)
    await expect(page.getByTestId('contacts')).toContainText('Ada Lovelace')
  })
})
