import { expect, type Locator, type Page, test } from '@playwright/test'
import { EMPLOYEE } from '@xforge/fixtures/employee'
import type { ResourceState, WriteOutcome } from '@xforge/ui/state'
import { scan } from './axe.ts'

/**
 * 4C.5 — accessibility.
 *
 * The other half of 4C.5; error containment is `error-containment.spec.ts`.
 *
 * WHAT THIS OWNS, AND WHAT IT DELIBERATELY DOES NOT. 4C.2 and 4C.3 already
 * assert the ARIA role on each state's element and what each state permits, and
 * `token-modes.spec.ts` already owns WCAG 2.5.8 target size. Re-asserting any of
 * those here would be a second source for a fact that already has an owner,
 * which is the defect this repository keeps having. So this file asks the one
 * question nothing else asks:
 *
 *   A11y-1  is there a WCAG A/AA violation a hand-written assertion did not
 *           think to look for -- contrast, accessible name, label association,
 *           duplicate id, orphaned ARIA reference?
 *
 * Every existing accessibility assertion in this repository tests a property
 * somebody thought of. Nothing had ever asked the general question, because
 * until this stage there was no axe in the tree at all.
 *
 * THE TABLES BELOW ARE EXHAUSTIVE BY THE COMPILER, NOT BY MY MEMORY. Keying them
 * on `ResourceState['status']` and `WriteOutcome['status']` means adding a member
 * to either union fails to typecheck here until somebody decides whether it has
 * a surface to scan. A hand-written list would have been a copy of the union
 * that agrees with it right up until it does not.
 *
 * That guard is only real because the `e2e` directory entered `tsconfig.json`'s
 * `include` with this commit. It was outside the program before, so ANY
 * compile-time check written in this directory would have been decorative -- a
 * check that cannot fail, which is worse than no check because it reads as
 * coverage.
 */

const PAGE = `/employees/${EMPLOYEE}`
const LIST = '**/emergency-contacts'

/**
 * ONE ITEM, and the reason the write scenarios below press `Save` rather than
 * `Add contact`: the screen renders `WriteProblem` from `save.outcome`, so
 * `conflict` and `failed` are produced by the UPDATE mutation. Routing a 409 at
 * the collection POST drives the ADD outcome, which has no banner -- the first
 * draft of this file did exactly that, and both scans timed out waiting for a
 * surface that was never going to appear.
 */
const UPDATE = '**/emergency-contacts/*'

/**
 * Rows that exist only in a response, in the `88888888` namespace the other
 * conformance specs use -- unused across the repository, so a fabricated row
 * never borrows a seeded row's identity.
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

/** A completeness reason from a server newer than this bundle -- see 4C.5 containment. */
const UNKNOWN_REASON = {
  completeness: 'partial',
  partialReasons: [{ code: 'redacted', limit: 100, returned: ROWS.length }],
} as const

interface Scenario {
  /**
   * The interaction that produces the surface, where one is needed.
   *
   * Read states arrive from a response alone. Write outcomes need a control
   * pressed, and WHICH control differs by outcome, so it belongs beside the
   * scenario rather than hard-coded in the loop.
   */
  act?: (page: Page) => Promise<unknown>
  /**
   * Drives the page into the state. Called before `goto`.
   *
   * `unknown` rather than `void`: `page.route` resolves to a `Disposable`, and
   * narrowing the return here would force every arrangement to swallow it.
   */
  arrange: (page: Page) => Promise<unknown>
  /**
   * Proof the state was actually REACHED before axe ran.
   *
   * Without it a scan of a still-loading page reports no violations and reads as
   * though the state passed. A LOCATOR rather than a test id, because not every
   * state has one: `saving` is proved by the button whose label changed, and
   * naming a test id here would have meant adding one to production markup so a
   * test could find it.
   */
  reached: (page: Page) => Locator
  /** Where a state settles only after react-query has exhausted its retries. */
  timeout?: number
}

/** Absent means "Playwright's default", which is not this file's fact to state. */
const visibility = (scenario: Scenario) =>
  scenario.timeout === undefined ? {} : { timeout: scenario.timeout }

/** A settled `ready` read, so a write scenario's assertions are about the WRITE. */
const readyList = (page: Page) =>
  page.route(LIST, (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ json: { items: ROWS, meta: COMPLETE } })
      : route.fallback(),
  )

const fulfilList = (page: Page, body: unknown) =>
  page.route(LIST, (route) => route.fulfill({ json: body }))

const READ_STATES: Record<ResourceState<unknown>['status'], Scenario> = {
  empty: {
    arrange: (page) => fulfilList(page, { items: [], meta: COMPLETE }),
    reached: (page) => page.getByTestId('empty'),
  },
  error: {
    arrange: (page) =>
      page.route(LIST, (route) =>
        route.fulfill({
          json: { detail: 'the database is unreachable', title: 'Server error' },
          status: 500,
        }),
      ),
    reached: (page) => page.getByTestId('read-error'),
    timeout: 20_000,
  },
  forbidden: {
    arrange: (page) =>
      page.route(LIST, (route) =>
        route.fulfill({
          json: { detail: 'needs hr.employee.read', title: 'Forbidden' },
          status: 403,
        }),
      ),
    reached: (page) => page.getByTestId('forbidden'),
  },
  // Never fulfilled: the read stays in flight for the life of the scan.
  loading: {
    arrange: (page) =>
      page.route(LIST, () => {
        // intentionally left pending
      }),
    reached: (page) => page.getByTestId('loading'),
  },
  partial: {
    arrange: (page) => fulfilList(page, { items: ROWS, meta: CAPPED }),
    reached: (page) => page.getByTestId('partial'),
  },
  ready: {
    arrange: (page) => fulfilList(page, { items: ROWS, meta: COMPLETE }),
    reached: (page) => page.getByTestId('contacts'),
  },
}

/**
 * `null` means NO DISTINCT SURFACE, and it is a decision rather than an omission.
 *
 * The compiler requires a member here for every `WriteOutcome`, so the two below
 * had to be argued rather than forgotten:
 *
 *   idle    renders nothing of its own -- it is the baseline every read scan
 *           above already runs under.
 *   saved   returns the control to exactly its idle rendering. Scanning it would
 *           re-scan `idle` and report a second pass for one surface.
 *
 * `saving` IS scanned: it is the one outcome that changes a control's own
 * markup, swapping the label and disabling it.
 */
const WRITE_SURFACES: Record<WriteOutcome['status'], Scenario | null> = {
  conflict: {
    act: (page) => page.getByRole('button', { name: 'Save' }).first().click(),
    arrange: async (page) => {
      await readyList(page)
      await page.route(UPDATE, (route) =>
        route.fulfill({ json: { title: 'Version conflict' }, status: 409 }),
      )
    },
    reached: (page) => page.getByTestId('conflict'),
  },
  failed: {
    act: (page) => page.getByRole('button', { name: 'Save' }).first().click(),
    arrange: async (page) => {
      await readyList(page)
      await page.route(UPDATE, (route) =>
        route.fulfill({ json: { title: 'Server error' }, status: 500 }),
      )
    },
    reached: (page) => page.getByTestId('write-failed'),
    timeout: 20_000,
  },
  idle: null,
  saved: null,
  saving: {
    act: (page) => page.getByRole('button', { name: 'Add contact' }).click(),
    arrange: async (page) => {
      await readyList(page)
      await page.route(LIST, async (route) => {
        if (route.request().method() !== 'POST') {
          return route.fallback()
        }
        // Held open so the scan happens while the write is genuinely in flight.
        await new Promise(() => {
          // never resolves
        })
      })
    },
    reached: (page) => page.getByRole('button', { name: 'Adding…' }),
  },
}

test.describe('4C.5 — A11y-1: every state, mechanically', () => {
  for (const [status, scenario] of Object.entries(READ_STATES)) {
    test(`the ${status} read state has no WCAG A/AA violation`, async ({ page }) => {
      await scenario.arrange(page)
      await page.goto(PAGE)
      await expect(scenario.reached(page)).toBeVisible(visibility(scenario))
      await scan(page, `the ${status} read state`)
    })
  }

  for (const [status, scenario] of Object.entries(WRITE_SURFACES)) {
    if (scenario === null) {
      continue
    }
    test(`the ${status} write outcome has no WCAG A/AA violation`, async ({ page }) => {
      await scenario.arrange(page)
      await page.goto(PAGE)
      await scenario.act?.(page)
      await expect(scenario.reached(page)).toBeVisible(visibility(scenario))
      await scan(page, `the ${status} write outcome`)
    })
  }

  /**
   * The contained failure is a surface a person is left sitting on, so it is
   * held to the same standard as the states that render normally.
   */
  test('the contained stale-client failure has no WCAG A/AA violation', async ({ page }) => {
    await page.route(LIST, (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({ json: { items: ROWS, meta: UNKNOWN_REASON } })
        : route.fallback(),
    )
    await page.goto(PAGE)
    await expect(page.getByTestId('stale-client')).toBeVisible()
    await scan(page, 'the contained stale-client failure')
  })
})

/**
 * A11y-2, narrowly: REACHABILITY, which is state-specific.
 *
 * Not the focus ring -- `emergency-contacts.spec.ts` already proves that, and
 * the ring is a token applied by `Button` rather than anything a state decides,
 * so asserting it again here would prove the same fact twice.
 *
 * Reachability is different. Both controls below live in surfaces that replace
 * the normal card: `error` renders a heading and an alert, and the boundary
 * renders a bare region with no card around it at all. Neither has ever had a
 * key pressed at it, and a recovery control a keyboard user cannot arrive at is
 * the same defect as no control.
 */
test.describe('4C.5 — A11y-2: the recovery controls are reachable by keyboard', () => {
  const tabTo = async (page: Page, label: string) => {
    for (let i = 0; i < 12; i += 1) {
      const onIt = await page.evaluate(
        (want) => (document.activeElement?.textContent ?? '').includes(want),
        label,
      )
      if (onIt) {
        return true
      }
      await page.keyboard.press('Tab')
    }
    return false
  }

  test('the retry beneath a failed read can be reached by Tab alone', async ({ page }) => {
    await READ_STATES.error.arrange(page)
    await page.goto(PAGE)
    await expect(page.getByTestId('read-error')).toBeVisible({ timeout: 20_000 })

    expect(await tabTo(page, 'Try again'), 'Try again was not reachable by Tab').toBe(true)
  })

  test('the reload offered by the boundary can be reached by Tab alone', async ({ page }) => {
    await page.route(LIST, (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({ json: { items: ROWS, meta: UNKNOWN_REASON } })
        : route.fallback(),
    )
    await page.goto(PAGE)
    await expect(page.getByTestId('stale-client')).toBeVisible()

    expect(await tabTo(page, 'Reload the page'), 'Reload was not reachable by Tab').toBe(true)
  })
})
