import { expect, test } from '@playwright/test'

/**
 * Theme and density, composed by a real cascade engine.
 *
 * The unit tests simulate the cascade: they parse the generated stylesheet,
 * apply the blocks whose selectors match, and resolve `var()` chains. That
 * simulator is code I wrote, and a simulator agreeing with the generator that
 * produced its input proves considerably less than it appears to. These specs
 * ask Chromium instead -- `getComputedStyle` on a real document, with the real
 * specificity rules -- which is the same ground-truth check that caught the
 * route-size metric over-counting by 39 kB in stage 0.
 *
 * Nothing in the product sets these attributes yet: there is no theme toggle,
 * and building one was not part of this stage. That is precisely why the modes
 * are worth exercising here. Generated CSS that no running page has ever
 * applied is CSS nobody has checked, and it would stay that way until the day
 * someone shipped a toggle and discovered the composition was wrong.
 */
const EMPLOYEE = '33333333-3333-4333-8333-333333333333'
const PAGE = `/employees/${EMPLOYEE}`

/** Computed custom properties on the document root, under the given modes. */
const read = (modes: Record<string, string>, names: string[]) => ({ modes, names })

async function computed(
  page: import('@playwright/test').Page,
  { modes, names }: ReturnType<typeof read>,
) {
  return await page.evaluate(
    ({ modes: m, names: n }) => {
      const root = document.documentElement
      for (const attr of ['data-theme', 'data-density']) {
        root.removeAttribute(attr)
      }
      for (const [axis, mode] of Object.entries(m)) {
        root.setAttribute(`data-${axis}`, mode)
      }
      const style = getComputedStyle(root)
      return Object.fromEntries(n.map((name) => [name, style.getPropertyValue(name).trim()]))
    },
    { modes, names },
  )
}

const COLOUR = '--semantic-surface-page'
const GEOMETRY = '--semantic-space-section'

/**
 * Dimensions are compared as NUMBERS of rem, not as text.
 *
 * The production CSS is minified, so `0.75rem` is served as `.75rem` and a
 * string comparison fails on a value that is exactly right. Asserting the
 * quantity rather than its spelling is what these tests actually mean, and it
 * survives the next minifier that decides to normalise something else.
 */
const rem = (value: string | undefined) => Number.parseFloat(value ?? 'NaN')

test.describe('theme and density compose in a real browser', () => {
  test('the base is light and comfortable', async ({ page }) => {
    await page.goto(PAGE)
    const v = await computed(page, read({}, [COLOUR, GEOMETRY]))
    expect(v[COLOUR]).toBe('#f8fafc')
    expect(rem(v[GEOMETRY])).toBe(1.5)
  })

  test('dark rebinds colour and leaves geometry alone', async ({ page }) => {
    await page.goto(PAGE)
    const v = await computed(page, read({ theme: 'dark' }, [COLOUR, GEOMETRY]))
    expect(v[COLOUR]).toBe('#020617')
    expect(rem(v[GEOMETRY])).toBe(1.5)
  })

  test('compact rebinds geometry and leaves colour alone', async ({ page }) => {
    await page.goto(PAGE)
    const v = await computed(page, read({ density: 'compact' }, [COLOUR, GEOMETRY]))
    expect(v[COLOUR]).toBe('#f8fafc')
    expect(rem(v[GEOMETRY])).toBe(0.75)
  })

  // The composition, in the engine that actually decides it. Two equal-specificity
  // blocks apply at once here; if any token were claimed by both axes, this is
  // where the cascade would pick a winner and the page would be subtly wrong.
  test('dark AND compact is the composition of both', async ({ page }) => {
    await page.goto(PAGE)
    const v = await computed(page, read({ density: 'compact', theme: 'dark' }, [COLOUR, GEOMETRY]))
    expect(v[COLOUR]).toBe('#020617')
    expect(rem(v[GEOMETRY])).toBe(0.75)
  })

  /**
   * A theme rebinds ROLES, and the component tier follows without being
   * restated -- the property that stops dark mode duplicating every component
   * token. `--component-card-padding` is geometry and must not move under a
   * theme; the card's background is a role and must.
   */
  test('a theme rebinding reaches components through the roles they alias', async ({ page }) => {
    await page.goto(PAGE)
    const names = ['--component-card-padding', '--semantic-surface-raised']
    const light = await computed(page, read({}, names))
    const dark = await computed(page, read({ theme: 'dark' }, names))

    expect(dark['--semantic-surface-raised']).not.toBe(light['--semantic-surface-raised'])
    expect(dark['--component-card-padding']).toBe(light['--component-card-padding'])
  })

  /**
   * The mode is document-level BY CONSTRUCTION, because the generated selectors
   * are `:root`-qualified. A subtree claiming a mode must not win -- otherwise a
   * Dialog rendered through a portal could sit outside the container that
   * carried the density its trigger was under, and quietly render at the wrong
   * one.
   */
  test('a mode set on a subtree does not apply', async ({ page }) => {
    await page.goto(PAGE)
    const inner = await page.evaluate(() => {
      document.documentElement.removeAttribute('data-theme')
      const el = document.createElement('div')
      el.setAttribute('data-theme', 'dark')
      document.body.appendChild(el)
      const value = getComputedStyle(el).getPropertyValue('--semantic-surface-page').trim()
      el.remove()
      return value
    })
    expect(inner).toBe('#f8fafc')
  })

  /**
   * The static half of WCAG 2.5.8, read off a rendered control rather than off
   * the token file, in the density where a target would be shaved.
   *
   * This is NOT the full rendered conformance check. It measures the buttons
   * this screen happens to have; a 20px icon button is still constructible from
   * compliant tokens, and proving that cannot happen needs the icon buttons,
   * the grid's actionable cells and the palette's controls -- none of which
   * exist yet. Claiming otherwise would be a check that passes on the easy
   * population and reads as though it covered the hard one.
   */
  test('rendered controls meet the 24px target floor in compact', async ({ page }) => {
    await page.goto(PAGE)
    await page.evaluate(() => document.documentElement.setAttribute('data-density', 'compact'))

    // Wait for the screen to leave its loading state. Counting first found zero
    // controls and reported "nothing measured", which was true and not the
    // failure it looked like: the page had not rendered any yet.
    await expect(page.getByRole('button', { name: 'Add contact' })).toBeVisible()

    const buttons = page.getByRole('button')
    const count = await buttons.count()
    expect(
      count,
      'no controls measured -- a check that found nothing has not passed',
    ).toBeGreaterThan(0)

    for (let i = 0; i < count; i += 1) {
      const box = await buttons.nth(i).boundingBox()
      const label = await buttons.nth(i).textContent()
      expect(box?.width, `width of "${label}"`).toBeGreaterThanOrEqual(24)
      expect(box?.height, `height of "${label}"`).toBeGreaterThanOrEqual(24)
    }
  })
})
