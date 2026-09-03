import { expect, test } from '@playwright/test'
import { EMPLOYEE } from '@xforge/fixtures/employee'

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

/*
 * REPOINTED AT THE SURVIVING VOCABULARY, 2 Sep 2026. These read
 * `--semantic-surface-page` and `--semantic-space-section`, which are
 * `packages/ui`'s names -- the package this spec outlived. Chromium returned
 * "" for both and the failure said `expected "#f8fafc", received ""`, which
 * reads as a wrong colour rather than as a property that does not exist.
 *
 * GEOMETRY ALSO HAD TO MOVE, and not only its name: `space.section` is not
 * rebound by density in this system, so the density half of every assertion
 * below would have compared a constant with itself and passed. `space.loose`
 * is rebound by all three modes, which is what these tests are actually about.
 */
const COLOUR = '--semantic-color-surface'
const GEOMETRY = '--semantic-space-loose'

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
  // THE BASE IS `default`, NOT `comfortable`. The old system had two densities
  // and the bare `:root` was the roomy one; this system has three and the bare
  // `:root` is the middle. A title naming the wrong mode is how the next reader
  // learns the wrong default.
  test('the base is light and default density', async ({ page }) => {
    await page.goto(PAGE)
    const v = await computed(page, read({}, [COLOUR, GEOMETRY]))
    expect(v[COLOUR]).toBe('#f2f5f9')
    expect(rem(v[GEOMETRY])).toBe(1.5)
  })

  test('comfortable rebinds geometry upward, and leaves colour alone', async ({ page }) => {
    await page.goto(PAGE)
    const v = await computed(page, read({ density: 'comfortable' }, [COLOUR, GEOMETRY]))
    expect(v[COLOUR]).toBe('#f2f5f9')
    expect(rem(v[GEOMETRY])).toBe(2)
  })

  test('dark rebinds colour and leaves geometry alone', async ({ page }) => {
    await page.goto(PAGE)
    const v = await computed(page, read({ theme: 'dark' }, [COLOUR, GEOMETRY]))
    expect(v[COLOUR]).toBe('#0a0a0c')
    expect(rem(v[GEOMETRY])).toBe(1.5)
  })

  test('compact rebinds geometry and leaves colour alone', async ({ page }) => {
    await page.goto(PAGE)
    const v = await computed(page, read({ density: 'compact' }, [COLOUR, GEOMETRY]))
    expect(v[COLOUR]).toBe('#f2f5f9')
    expect(rem(v[GEOMETRY])).toBe(0.75)
  })

  // The composition, in the engine that actually decides it. Two equal-specificity
  // blocks apply at once here; if any token were claimed by both axes, this is
  // where the cascade would pick a winner and the page would be subtly wrong.
  test('dark AND compact is the composition of both', async ({ page }) => {
    await page.goto(PAGE)
    const v = await computed(page, read({ density: 'compact', theme: 'dark' }, [COLOUR, GEOMETRY]))
    expect(v[COLOUR]).toBe('#0a0a0c')
    expect(rem(v[GEOMETRY])).toBe(0.75)
  })

  /**
   * THE AXES STAY SEPARATE UNDER A THEME: a theme rebinds colour and must not
   * touch geometry. That is the invariant the generator refuses to emit a
   * violation of, checked here in the engine that actually resolves it.
   *
   * It used to read `--component-card-padding` against
   * `--semantic-surface-raised`. THERE IS NO COMPONENT TIER in this system --
   * the generator emits primitive and semantic only -- so that name resolved to
   * "" and the geometry half compared "" with "" and passed. An assertion over
   * two empty strings is the shape this repository distrusts everywhere else,
   * and it was sitting inside the suite that exists BECAUSE a simulator agreeing
   * with itself proves nothing.
   */
  test('a theme rebinds colour and leaves geometry untouched', async ({ page }) => {
    await page.goto(PAGE)
    const names = [GEOMETRY, '--semantic-color-surface-lowest']
    const light = await computed(page, read({}, names))
    const dark = await computed(page, read({ theme: 'dark' }, names))

    // Both are read, so neither half can pass by being absent.
    expect(light['--semantic-color-surface-lowest']).not.toBe('')
    expect(light[GEOMETRY]).not.toBe('')

    expect(dark['--semantic-color-surface-lowest']).not.toBe(
      light['--semantic-color-surface-lowest'],
    )
    expect(dark[GEOMETRY]).toBe(light[GEOMETRY])
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
      const value = getComputedStyle(el).getPropertyValue('--semantic-color-surface').trim()
      el.remove()
      return value
    })
    expect(inner).toBe('#f2f5f9')
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
