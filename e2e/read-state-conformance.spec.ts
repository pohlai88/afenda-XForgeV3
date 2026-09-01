import { expect, test } from '@playwright/test'
import { EMPLOYEE } from '@xforge/fixtures/employee'

/**
 * 4C.2 — read-state behavioural conformance.
 *
 * `.architecture/project-state.md` states the obligation: appearance is not it,
 * behaviour is. A state that looks right and permits the wrong action has not
 * been proven. So each spec below asserts what the state ALLOWS, not only what
 * it displays.
 *
 * WHY THE RESPONSE IS INTERCEPTED. Four of the six states — loading, partial,
 * forbidden, error — have no route through the seeded database. Reaching them by
 * arranging real data would mean revoking a permission or capping a read from
 * outside the test, which makes the spec depend on state it does not own. The
 * response IS the producer of a read state, so producing it directly is the
 * faithful move rather than a shortcut, and it uses Playwright's own routing:
 * law 30 wants a named pain before new machinery, and there is none here.
 *
 * These specs are hermetic as a consequence. They touch no row, so they neither
 * depend on nor disturb `emergency-contacts.spec.ts`, which deliberately treats
 * the page as a live surface.
 *
 * EXPOSURE, NOT VISIBILITY. `Status` and an info `Alert` carry `role="status"`;
 * a danger `Alert` carries `role="alert"`. Each spec asserts the role on the
 * element it addresses, so that "progress is exposed" means exposed to a screen
 * reader rather than merely painted.
 *
 * Addressed by test id and CHECKED for its role, rather than queried by role.
 * Next injects `#__next-route-announcer__` with `role="alert"`, so a page-scoped
 * role query resolves to two elements -- and did, intermittently, because the
 * announcer appears on client navigation. Asserting the role on a known element
 * proves the same property without depending on the framework owning none.
 */

const PAGE = `/employees/${EMPLOYEE}`

/**
 * The list read. Ends with the collection, so it cannot also capture the write
 * at `/api/v1/emergency-contacts/:id`.
 */
const LIST = '**/emergency-contacts'

/**
 * Rows that exist only in a response.
 *
 * A fabricated row is not the seeded row and must not borrow its identity —
 * `709aaea` landed because one literal named two unrelated facts. The `88888888`
 * namespace is unused across the repository, so these collide with nothing even
 * though nothing here reaches a database.
 */
const ROWS = [
  {
    id: '88888888-8888-4888-8888-888888888881',
    name: 'Ada Lovelace',
    phone: '+60 12-345 6789',
    relationship: 'Spouse',
    version: 1,
  },
  {
    id: '88888888-8888-4888-8888-888888888882',
    name: 'Grace Hopper',
    phone: '+60 12-345 6790',
    relationship: 'Parent',
    version: 1,
  },
]

const COMPLETE = { completeness: 'complete' } as const

const CAPPED = {
  completeness: 'partial',
  partialReasons: [{ code: 'result_cap', limit: 100, returned: ROWS.length }],
} as const

test.describe('4C.2 — what each read state must prove', () => {
  /**
   * `loading` — progress is exposed, and no stale interaction acts as if current.
   *
   * The second half is the one worth testing. A screen that leaves last render's
   * rows on display while a new read is in flight offers Save buttons that act
   * on data nobody is looking at any more.
   */
  test('loading exposes progress, and offers nothing from a settled state', async ({ page }) => {
    // Never fulfilled: the read stays in flight for the life of the test.
    await page.route(LIST, () => {
      // intentionally left pending
    })
    await page.goto(PAGE)

    await expect(page.getByRole('status')).toContainText('Loading emergency contacts')

    await expect(page.getByTestId('contacts')).toHaveCount(0)
    await expect(page.getByTestId('empty')).toHaveCount(0)
    await expect(page.getByTestId('partial')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0)
  })

  /**
   * `empty` — an explicit empty meaning, not an absence of content.
   *
   * The distinction the type exists for: a blank region and "there is nothing
   * here yet, add the first one" ask different things of a person.
   */
  test('empty states its meaning rather than rendering nothing', async ({ page }) => {
    await page.route(LIST, (route) => route.fulfill({ json: { items: [], meta: COMPLETE } }))
    await page.goto(PAGE)

    const empty = page.getByTestId('empty')
    await expect(empty).toContainText('No emergency contacts yet')
    await expect(empty).toHaveAttribute('role', 'status')

    // Explicit meaning INSTEAD of an empty list, not alongside one.
    await expect(page.getByTestId('contacts')).toHaveCount(0)
  })

  /** `ready` — the normal actions are available. */
  test('ready offers the normal actions', async ({ page }) => {
    await page.route(LIST, (route) => route.fulfill({ json: { items: ROWS, meta: COMPLETE } }))
    await page.goto(PAGE)

    await expect(page.getByTestId('contacts').locator('li')).toHaveCount(ROWS.length)
    await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(ROWS.length)
    await expect(page.getByRole('button', { name: 'Add contact' })).toBeEnabled()

    // Nothing claims the data is incomplete, because it is not.
    await expect(page.getByTestId('partial')).toHaveCount(0)
  })

  /**
   * `partial` — the data is usable AND its incompleteness is visible.
   *
   * Both halves, because either alone is a different state. Rows without the
   * notice is `ready` and a lie; the notice without rows throws away data the
   * server actually returned.
   *
   * This state had no rendering at all until 4C.0: the screen discarded `meta`,
   * so a capped list drew as a complete one.
   */
  test('partial keeps the data usable and says it is incomplete', async ({ page }) => {
    await page.route(LIST, (route) => route.fulfill({ json: { items: ROWS, meta: CAPPED } }))
    await page.goto(PAGE)

    // Usable.
    await expect(page.getByTestId('contacts').locator('li')).toHaveCount(ROWS.length)
    await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(ROWS.length)

    // And incomplete, said out loud.
    const partial = page.getByTestId('partial')
    await expect(partial).toContainText(`Showing the first ${ROWS.length} contacts`)
    await expect(partial).toHaveAttribute('role', 'status')
  })

  /**
   * `forbidden` — permission semantics, and no retry affordance at all.
   *
   * With the `error` spec below this forms the discriminating pair, and the pair
   * is the actual proof. Either state alone could be satisfied by a screen that
   * always shows a retry button or never does; only the two together show that
   * the control tracks `retryable`.
   */
  test('forbidden offers no retry, because nothing about it is retryable', async ({ page }) => {
    await page.route(LIST, (route) =>
      route.fulfill({
        json: { detail: 'needs hr.employee.read', title: 'Forbidden' },
        status: 403,
      }),
    )
    await page.goto(PAGE)

    const refusal = page.getByTestId('forbidden')
    await expect(refusal).toBeVisible()
    await expect(refusal).toHaveAttribute('role', 'alert')
    await expect(page.getByText('You do not have access to this')).toBeVisible()

    // The obligation. A retry control here teaches people the button is
    // decorative, which costs more than the missing button.
    await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0)

    // A refused read has nothing to frame: no heading, no add.
    await expect(page.getByRole('button', { name: 'Add contact' })).toHaveCount(0)
  })

  /**
   * `error` — failure semantics, and retry ONLY when `retryable`.
   *
   * Generous timeout: the query client retries a 500 twice with backoff before
   * the state settles, which is correct behaviour and simply takes a few
   * seconds. A 403 is not retried at all, which is why the spec above is fast.
   */
  test('error offers retry, because this one is retryable', async ({ page }) => {
    await page.route(LIST, (route) =>
      route.fulfill({
        json: { detail: 'the database is unreachable', title: 'Server error' },
        status: 500,
      }),
    )
    await page.goto(PAGE)

    await expect(page.getByText('This could not be loaded')).toBeVisible({ timeout: 20_000 })
    const failure = page.getByTestId('read-error')
    await expect(failure).toContainText('the database is unreachable')
    await expect(failure).toHaveAttribute('role', 'alert')
    await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(1)
  })
})
