import { expect, test } from '@playwright/test'
import { EMPLOYEE } from '@xforge/fixtures/employee'

/**
 * 4C.3 — write-outcome behavioural conformance.
 *
 * The companion to 4C.2, on the other axis. `ResourceState` says what a READ
 * is; `WriteOutcome` says what a WRITE did, and they are orthogonal — which is
 * why `conflict` was removed from the read union at 4B. A write that fails
 * leaves the user holding an edit; a read that fails leaves them holding
 * nothing, and one vocabulary cannot say both.
 *
 * ONLY PRODUCER-BACKED OUTCOMES. All five are reachable: the controller derives
 * them from react-query's own closed status union through an exhaustive switch,
 * so `idle`, `saving`, `saved` and `failed` are as real as `conflict`. Nothing
 * here is asserted about a state the application cannot enter.
 *
 * Addressed by test id with the ARIA role asserted on that element, the same
 * discipline as 4C.2 and for the same reason: `role="alert"` is ambiguous at
 * page scope because Next injects its own route announcer.
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

/** A settled, `ready` read, so every assertion below is about the WRITE. */
const readyList = (page: import('@playwright/test').Page) =>
  page.route(LIST, (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ json: { items: ROWS, meta: COMPLETE } })
      : route.fallback(),
  )

test.describe('4C.3 — what each write outcome must prove', () => {
  /**
   * `idle` — no write has happened, and the screen says nothing about one.
   *
   * The baseline the other four are read against. A screen that shows a stale
   * banner from a previous write is reporting an outcome that is no longer
   * true.
   */
  test('idle reports no outcome at all', async ({ page }) => {
    await readyList(page)
    await page.goto(PAGE)

    await expect(page.getByTestId('contacts')).toBeVisible()
    await expect(page.getByTestId('conflict')).toHaveCount(0)
    await expect(page.getByTestId('write-failed')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Add contact' })).toBeEnabled()
  })

  /**
   * `saving` — the write is in flight, and it is NOT represented as done.
   *
   * The control that started it says so and cannot start it again. A button
   * that stays idle-looking during a write invites a second one.
   */
  test('saving disables the control that started it and says so', async ({ page }) => {
    await readyList(page)
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

    const adding = page.getByRole('button', { name: 'Adding…' })
    await expect(adding).toBeVisible()
    await expect(adding).toBeDisabled()
    // In flight is not finished: no outcome is claimed either way.
    await expect(page.getByTestId('write-failed')).toHaveCount(0)
    await expect(page.getByTestId('conflict')).toHaveCount(0)

    release?.()
  })

  /**
   * `saved` — the control returns to actionable and nothing claims a problem.
   */
  test('saved leaves no problem behind and restores the control', async ({ page }) => {
    await readyList(page)
    await page.route(LIST, (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ json: { id: 'x' }, status: 201 })
        : route.fallback(),
    )

    await page.goto(PAGE)
    await page.getByRole('button', { name: 'Add contact' }).click()

    await expect(page.getByRole('button', { name: 'Add contact' })).toBeEnabled()
    await expect(page.getByTestId('write-failed')).toHaveCount(0)
    await expect(page.getByTestId('conflict')).toHaveCount(0)
  })

  /**
   * `conflict` — five obligations, and the read underneath survives all of them.
   *
   * ADR-013: a stale write is refused, never merged. The distinction from
   * `failed` is the whole point — an error says something broke, a conflict says
   * someone else changed this and here is what to do — and collapsing them loses
   * the only part that tells the user what to do next.
   */
  test('conflict keeps the read visible, is not an error, and offers a way out', async ({
    page,
  }) => {
    await readyList(page)
    await page.route(UPDATE, (route) =>
      route.fulfill({ json: { title: 'Version conflict' }, status: 409 }),
    )

    await page.goto(PAGE)
    await page.getByRole('button', { name: 'Save' }).first().click()

    const conflict = page.getByTestId('conflict')

    // 1. the existing ResourceState remains visible
    await expect(page.getByTestId('contacts')).toBeVisible()
    await expect(page.getByTestId('contacts')).toContainText('Ada Lovelace')

    // 2. it is not rendered as a read failure
    await expect(page.getByTestId('read-error')).toHaveCount(0)
    await expect(page.getByTestId('forbidden')).toHaveCount(0)

    // 3. the attempted write is not represented as successful
    await expect(conflict).toBeVisible()

    // 4. the user is given a resolution path, not just a diagnosis
    await expect(conflict).toContainText('Someone else changed this while you were editing')
    await expect(conflict).toContainText('re-apply your change')

    // 5. assistive technology can discover it
    await expect(conflict).toHaveAttribute('role', 'alert')
  })

  /**
   * `failed` — a write that broke, distinguishable from one that was refused.
   *
   * The discriminating pair with `conflict`, in the same way `forbidden` and
   * `error` are the pair on the read axis: either alone could be satisfied by a
   * screen that renders one banner for everything.
   */
  test('failed is distinguishable from conflict, and the read still survives', async ({ page }) => {
    await readyList(page)
    await page.route(UPDATE, (route) =>
      route.fulfill({ json: { title: 'Server error' }, status: 500 }),
    )

    await page.goto(PAGE)
    await page.getByRole('button', { name: 'Save' }).first().click()

    const failed = page.getByTestId('write-failed')
    await expect(failed).toBeVisible({ timeout: 20_000 })
    await expect(failed).toHaveAttribute('role', 'alert')

    // Not a conflict, and not a read failure.
    await expect(page.getByTestId('conflict')).toHaveCount(0)
    await expect(page.getByTestId('read-error')).toHaveCount(0)

    // The list the user was working from is still there.
    await expect(page.getByTestId('contacts')).toContainText('Ada Lovelace')
  })
})
