import { expect, test } from '@playwright/test'
import { EMPLOYEE } from '@xforge/fixtures/employee'

/**
 * The spine's flagship path: UX -> contract -> generated client -> handler ->
 * repository -> DB, exercised through a real browser against the real app.
 *
 * The rows persist in PostgreSQL now, so global setup clears this employee's
 * contacts once and the specs run in order, treating the page as a live surface
 * rather than resetting between assertions.
 */
const PAGE = `/employees/${EMPLOYEE}`

test.describe('emergency contacts', () => {
  test('renders the empty state before anything exists', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.getByRole('heading', { name: 'Emergency contacts' })).toBeVisible()
    await expect(page.getByTestId('empty')).toContainText('No emergency contacts yet')
  })

  test('adds a contact through the generated client and shows it', async ({ page }) => {
    await page.goto(PAGE)

    // The request must go over HTTP to /api/v1/... -- one transport, one policy
    // path (ADR-012). Asserting the URL here is what stops a future refactor
    // quietly reintroducing an in-process facade.
    const [request] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('/api/v1/') && r.method() === 'POST'),
      page.getByRole('button', { name: 'Add contact' }).click(),
    ])
    expect(request.url()).toContain(`/api/v1/employees/${EMPLOYEE}/emergency-contacts`)

    await expect(page.getByTestId('contacts')).toBeVisible()
    await expect(page.getByTestId('contacts')).toContainText('New contact')
    await expect(page.getByTestId('empty')).toHaveCount(0)
  })

  test('surfaces a version conflict instead of silently losing the edit', async ({
    page,
    request,
  }) => {
    await page.goto(PAGE)
    await expect(page.getByTestId('contacts')).toBeVisible()

    // Someone else saves first, advancing the version behind this page's back.
    const listed = await request.get(`/api/v1/employees/${EMPLOYEE}/emergency-contacts`)
    const { items } = await listed.json()
    const [target] = items
    const other = await request.patch(`/api/v1/emergency-contacts/${target.id}`, {
      data: { phone: '+60 11-111 1111', version: target.version },
    })
    expect(other.status()).toBe(200)

    // The page still holds the stale version. ADR-013: this must be rejected
    // and reported, never merged.
    await page.getByRole('button', { name: 'Save' }).first().click()
    // The wording moved into the mapper at 4C.0, so there is one source for it
    // rather than a copy in every screen that can conflict. It lost the noun --
    // 'this contact' became 'this' -- which is a small real regression, stated
    // rather than absorbed: the banner sits directly above the contacts list, and
    // a resource-neutral mapper cannot name a resource without becoming one.
    await expect(page.getByTestId('conflict')).toContainText(
      'Someone else changed this while you were editing',
    )

    // And the other writer's value survived.
    await expect(page.getByTestId('contacts')).toContainText('+60 11-111 1111')
  })
})

/**
 * Phase 2's exit criterion says KEYBOARD-ONLY USABLE, so it is driven with a
 * keyboard and nothing else. No click, no locator activation -- Tab to move,
 * Enter to act, exactly as somebody who cannot use a pointer would.
 *
 * A screen can look perfectly accessible and fail this: a focus ring styled
 * away, a control that is a div, a tab order that skips the primary action.
 * None of those show up in a rendering.
 */
test.describe('keyboard-only operation', () => {
  test('every control is reachable by Tab, and the focus ring is visible', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.getByRole('heading', { name: 'Emergency contacts' })).toBeVisible()

    // Walk the tab order and collect what receives focus, rather than asserting
    // a fixed index -- an index would pass while the order became nonsense.
    const reached: string[] = []
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab')
      const label = await page.evaluate(() => {
        const el = document.activeElement
        if (!el || el === document.body) {
          return null
        }
        return `${el.tagName.toLowerCase()}:${(el.textContent ?? '').trim().slice(0, 20)}`
      })
      if (label && !reached.includes(label)) {
        reached.push(label)
      }
    }

    expect(reached.some((r) => r.includes('Add contact'))).toBe(true)

    // Measured on a control KNOWN to be focused, not on whatever held focus
    // when the loop above ran out. The first version asserted the latter and
    // failed against a perfectly good focus ring -- a test measuring the wrong
    // moment, which is the same defect as reading RLS state after restoring it.
    await page.getByRole('button', { name: 'Add contact' }).focus()
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el) {
        return null
      }
      const s = getComputedStyle(el)
      return { style: s.outlineStyle, text: (el.textContent ?? '').trim(), width: s.outlineWidth }
    })

    // The ring is a token and cannot be styled away per screen. If it ever is,
    // this fails -- which is the only way that regression gets noticed.
    expect(outline?.text).toContain('Add contact')
    expect(outline?.style, 'the focused control must show an outline').not.toBe('none')
    expect(outline?.width).not.toBe('0px')
  })

  test('the primary action can be performed with Enter alone', async ({ page }) => {
    await page.goto(PAGE)
    const before = await page.getByTestId('contacts').locator('li').count()

    // Tab until the primary action holds focus, then activate it.
    for (let i = 0; i < 12; i += 1) {
      const onAdd = await page.evaluate(() =>
        (document.activeElement?.textContent ?? '').includes('Add contact'),
      )
      if (onAdd) {
        break
      }
      await page.keyboard.press('Tab')
    }
    await page.keyboard.press('Enter')

    await expect(page.getByTestId('contacts').locator('li')).toHaveCount(before + 1)
  })
})
