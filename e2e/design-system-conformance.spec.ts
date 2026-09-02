import { expect, test } from '@playwright/test'
import { GALLERY_ORIGIN } from '../tooling/e2e/config.ts'
import { scan } from './axe.ts'

/**
 * A11y-1 and A11y-2 over the VOCABULARY, which no route renders.
 *
 * `a11y-conformance.spec.ts` scans what the product shows. That is eleven of
 * twenty-eight contracts. The rest -- including Dialog (`modal`), Select
 * (`composite`) and Tooltip (`disclosure`), the three heaviest obligations in
 * the registry -- are mounted only in the gallery, and until this file existed
 * they were mounted nowhere a check could reach.
 *
 * WHAT THE MEASUREMENT LOOKED LIKE BEFORE. axe over the gallery reported ZERO
 * violations across six theme x density modes, with 27 rules evaluated and 36
 * INAPPLICABLE -- because five contracts appeared in no tree in the repository
 * at all, and every overlay was closed. A clean scan of a page with no dialog on
 * it is not evidence about dialogs, and it prints exactly the same green.
 *
 * SO THE OVERLAYS ARE OPENED. That is the difference between this file and a
 * page-load scan, and it is where the rules that matter for a modal finally have
 * something to apply to.
 */

const THEMES = ['light', 'dark'] as const
const DENSITIES = ['compact', 'default', 'comfortable'] as const

/** The ring token, resolved. Asserted as a value so a silent rebinding is visible. */
const RING = 'rgb(36, 98, 95)'

/**
 * The toggles, driven the way a person drives them.
 *
 * Setting the attributes directly would be a second way to enter a mode -- and
 * the gallery's own comment is that it sets "the same attributes the product
 * sets, on the same element" precisely so what is seen is what a page will do.
 * Reaching past the controls would test a state the product cannot produce.
 */
async function setMode(
  page: import('@playwright/test').Page,
  theme: (typeof THEMES)[number],
  density: (typeof DENSITIES)[number],
) {
  const toggles = page.locator('header button')
  for (let i = 0; i < 4; i += 1) {
    if ((await page.evaluate(() => document.documentElement.dataset.theme)) === theme) {
      break
    }
    await toggles.nth(0).click()
  }
  for (let i = 0; i < 4; i += 1) {
    if ((await page.evaluate(() => document.documentElement.dataset.density)) === density) {
      break
    }
    await toggles.nth(1).click()
  }
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme)
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.density))
    .toBe(density)
}

test.describe('A11y-1 — the vocabulary, in every mode', () => {
  for (const theme of THEMES) {
    for (const density of DENSITIES) {
      test(`${theme} + ${density}`, async ({ page }) => {
        await page.goto(GALLERY_ORIGIN)
        await setMode(page, theme, density)
        await scan(page, `gallery: ${theme} + ${density}`)
      })
    }
  }
})

test.describe('A11y-1 — the surfaces a closed page never shows', () => {
  test('the command palette, open', async ({ page }) => {
    await page.goto(GALLERY_ORIGIN)
    await page
      .getByRole('button', { name: /search/i })
      .first()
      .click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await scan(page, 'command palette, open')
  })

  test('the dialog, open', async ({ page }) => {
    await page.goto(GALLERY_ORIGIN)
    await page.getByRole('button', { name: 'Reverse payroll run' }).click()
    await expect(page.getByRole('heading', { name: 'Reverse this payroll run' })).toBeVisible()
    await scan(page, 'dialog, open')
  })

  test('the select, open', async ({ page }) => {
    await page.goto(GALLERY_ORIGIN)
    await page.getByRole('combobox', { name: 'Pay frequency' }).click()
    await expect(page.getByRole('option', { name: 'Weekly' })).toBeVisible()
    await scan(page, 'select, open')
  })

  test('the tooltip, shown', async ({ page }) => {
    await page.goto(GALLERY_ORIGIN)
    await page.getByRole('button', { name: /Statutory ceiling/i }).hover()
    await expect(page.getByRole('tooltip')).toBeVisible()
    await scan(page, 'tooltip, shown')
  })
})

test.describe('A11y-2 — behaviour a tree inspection cannot see', () => {
  /**
   * FOCUS RETURNS TO WHAT OPENED IT. Half of the `modal` contract, and the half
   * axe has no opinion about: a dialog that traps focus correctly and then drops
   * it on `<body>` at close leaves a keyboard user at the top of the document.
   */
  test('closing a modal returns focus to its trigger', async ({ page }) => {
    await page.goto(GALLERY_ORIGIN)
    const trigger = page.getByRole('button', { name: 'Reverse payroll run' })
    await trigger.click()
    await expect(page.getByRole('heading', { name: 'Reverse this payroll run' })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: 'Reverse this payroll run' })).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  /**
   * THE FOCUS RING IS ONE RING, and the assertion has to WAIT for it.
   *
   * Measured directly: reading `outlineColor` immediately after `Tab` returns
   * the element's TEXT colour, not the ring -- white on a filled button, ink on
   * a plain one -- because `transition` includes `outline-color` and the read
   * catches it at the start of a 70ms interpolation. The first version of this
   * measurement reported four different focus colours and an invisible ring on
   * the primary action. There was no defect; there was a race.
   *
   * `expect.poll` is therefore load-bearing rather than defensive. A bare read
   * here would fail, and the obvious "fix" would be to change the component.
   */
  test('every tab stop settles on the ring token', async ({ page }) => {
    await page.goto(GALLERY_ORIGIN)
    await page.locator('body').click({ position: { x: 2, y: 2 } })

    let stops = 0
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab')
      const focused = await page.evaluate(() => document.activeElement?.tagName ?? 'BODY')
      if (focused === 'BODY') {
        break
      }
      stops += 1
      await expect
        .poll(() =>
          page.evaluate(
            () => getComputedStyle(document.activeElement ?? document.body).outlineColor,
          ),
        )
        .toBe(RING)
    }
    expect(stops, 'nothing took focus, so the loop asserted over nothing').toBeGreaterThan(5)
  })
})

/**
 * The two properties this repository asserted in prose and could not test,
 * because the preview pane cannot emulate a media query and Chromium can.
 *
 * A CONTEXT PER TEST, not `test.use`. `reducedMotion` and `forcedColors` are
 * BrowserContext options and this Playwright version does not lift them into
 * TestOptions -- `test.use({ reducedMotion })` does not typecheck. Opening the
 * context by hand states the emulation at the point it applies, and needs no
 * fixture that does not exist.
 */
test.describe('A11y-2 — the media queries', () => {
  /**
   * REMOVING THE ANIMATION MUST NOT REMOVE THE STATE. A skeleton that stops
   * pulsing is still a skeleton, so this asserts BOTH halves: the loop stops,
   * and the element is still on screen.
   *
   * `duration.none` is 0.01ms rather than 0 on purpose -- a zero-duration
   * transition fires no `transitionend`, which would hang anything waiting on
   * one for exactly the people who asked for less motion.
   */
  test('reduced motion collapses the durations and stops the one loop', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    try {
      const page = await context.newPage()
      await page.goto(GALLERY_ORIGIN)

      const skeleton = page.locator('[data-slot="skeleton"]').first()
      await expect(skeleton, 'the skeleton stopped being rendered at all').toBeVisible()

      const motion = await skeleton.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { count: cs.animationIterationCount, duration: cs.animationDuration }
      })
      expect(motion.count, 'the shimmer still loops under prefers-reduced-motion').not.toBe(
        'infinite',
      )
      expect(Number.parseFloat(motion.duration)).toBeLessThan(0.01)
    } finally {
      await context.close()
    }
  })

  /**
   * THE ARGUMENT FOR AN OUTLINE OVER A BOX-SHADOW, finally checked.
   *
   * `FRAGILE_MEANS` in the token policy says a shadow does not survive
   * forced-colors, and that sentence is why nineteen `focus-visible:ring-*`
   * utilities were swept onto one outline. It was reasoning from a comment. The
   * outline must still be drawn here, recoloured by the system -- so this
   * asserts a real width AND a colour that is no longer the ordinary ring.
   */
  test('the focus indicator survives forced-colors, recoloured', async ({ browser }) => {
    const context = await browser.newContext({ forcedColors: 'active' })
    try {
      const page = await context.newPage()
      await page.goto(GALLERY_ORIGIN)
      await page.locator('body').click({ position: { x: 2, y: 2 } })
      await page.keyboard.press('Tab')

      const ring = await page.evaluate(() => {
        const el = document.activeElement
        const cs = getComputedStyle(el ?? document.body)
        return { color: cs.outlineColor, style: cs.outlineStyle, width: cs.outlineWidth }
      })
      expect(ring.style, 'the outline stopped being drawn under forced-colors').toBe('solid')
      expect(Number.parseFloat(ring.width)).toBeGreaterThanOrEqual(2)
      expect(ring.color, 'forced-colors did not recolour the ring').not.toBe(RING)
    } finally {
      await context.close()
    }
  })
})
