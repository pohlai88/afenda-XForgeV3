import { expect, test } from '@playwright/test'

/**
 * The spine's flagship path: UX -> contract -> generated client -> handler ->
 * repository -> DB, exercised through a real browser against the real app.
 *
 * The rows persist in PostgreSQL now, so global setup clears this employee's
 * contacts once and the specs run in order, treating the page as a live surface
 * rather than resetting between assertions.
 */
const EMPLOYEE = '33333333-3333-4333-8333-333333333333'
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
    const target = items[0]
    const other = await request.patch(`/api/v1/emergency-contacts/${target.id}`, {
      data: { phone: '+60 11-111 1111', version: target.version },
    })
    expect(other.status()).toBe(200)

    // The page still holds the stale version. ADR-013: this must be rejected
    // and reported, never merged.
    await page.getByRole('button', { name: 'Save' }).first().click()
    await expect(page.getByTestId('conflict')).toContainText('Someone else changed this contact')

    // And the other writer's value survived.
    await expect(page.getByTestId('contacts')).toContainText('+60 11-111 1111')
  })
})
