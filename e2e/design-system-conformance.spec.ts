import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { scan } from './axe.ts'

/**
 * A11y-1, PRIMITIVE HALF — restored, with Storybook as the harness.
 *
 * `a11y-conformance.spec.ts` records what this file is for, and records that it was
 * missing: "design-system-conformance.spec.ts scanned the component vocabulary -- the 17
 * of 28 contracts that no route mounts -- by driving the gallery. The gallery was
 * deleted, so that spec was deleted with it, and this file is the only axe scan left in
 * the repository." It then names the cost: "Dialog, Select and Tooltip carry the modal,
 * composite and disclosure profiles, appear on no route, and are now scanned by nothing.
 * A clean run of this file is not a clean run over the design system."
 *
 * `axe.ts` says the same from the other side: "PRIMITIVE COVERAGE IS OWED: the
 * document-driven harness that mounted them was deleted with the design system it
 * interpreted... A second copy of its boot sequence would be a second source for how the
 * design system starts."
 *
 * Storybook is that harness. It owns the boot sequence, so this file does not: it asks
 * Storybook which stories exist and drives each one. THE SCAN IS NOT DUPLICATED -- it is
 * `scan()` from `axe.ts`, which is where the one copy lives, and which already refuses a
 * pass over nothing by asserting that axe evaluated at least one rule.
 *
 * WHY STORY BY STORY rather than one page of everything. A violation in a grid of
 * thirty-six specimens reports a selector inside one of them and nothing about which
 * component owns it. One story per scan makes the label the answer. It is also the only
 * way to reach a state no route renders -- a disabled Switch, an EmptyState with no
 * description, a ResourceBoundary that caught -- which is the entire reason the primitive
 * half exists.
 *
 * WHAT A GREEN RUN HERE DOES NOT MEAN, stated for the same reason the sibling states it:
 * this scans what a story frames. A component state nobody wrote a story for is scanned
 * by nothing, and `packages/design/tests/stories.test.ts` is what holds the story set
 * equal to the component set -- not this file.
 */

const STORYBOOK = process.env.STORYBOOK_ORIGIN ?? 'http://localhost:6006'

interface StoryIndex {
  readonly entries: Record<
    string,
    { readonly id: string; readonly name: string; readonly title: string }
  >
}

/**
 * ONE TEST PER COMPONENT, not one test for everything.
 *
 * The first version scanned all thirty-six stories inside a single test and hit
 * Playwright's 30s timeout with the failure reported against the last locator it happened
 * to be waiting on -- which named neither the component nor the rule. Splitting by
 * component is what makes the report the answer, which is what this file's own header
 * said before its body did the opposite.
 *
 * The component list is read from the filesystem so the tests exist at collection time;
 * which STORIES each has is asked of Storybook at run time, because story ids are its to
 * generate and duplicating that mapping would be a second source for it.
 */
const COMPONENTS = readdirSync(join(import.meta.dirname, '../packages/design/stories'))
  .filter((f) => f.endsWith('.stories.tsx'))
  .map((f) => f.replace(/\.stories\.tsx$/, ''))
  .sort()

test.describe('the component vocabulary conforms', () => {
  test('Storybook is serving a populated index', async ({ page }) => {
    const response = await page.request.get(`${STORYBOOK}/index.json`)
    expect(response.ok(), `Storybook is not serving at ${STORYBOOK}`).toBe(true)
    const index = (await response.json()) as StoryIndex
    /**
     * The empty-set failure this repository is organised against: an index that returned
     * nothing would make every scan below vacuous and the suite would report green having
     * evaluated no component at all.
     */
    expect(Object.values(index.entries).length, 'Storybook indexed no stories').toBeGreaterThan(25)
    expect(COMPONENTS.length, 'no story files on disk').toBeGreaterThan(15)
  })

  for (const component of COMPONENTS) {
    test(component, async ({ page }) => {
      const index = (await (await page.request.get(`${STORYBOOK}/index.json`)).json()) as StoryIndex
      const stories = Object.values(index.entries).filter(
        (s) => s.title.toLowerCase() === `design/${component.replace(/-/g, '')}`,
      )
      expect(stories.length, `no stories indexed for ${component}`).toBeGreaterThan(0)

      for (const story of stories) {
        await page.goto(`${STORYBOOK}/iframe.html?id=${story.id}&viewMode=story`)
        // The story root exists before axe runs; a scan of a blank frame is the pass over
        // nothing that `scan()` refuses, but failing here names the story instead of axe.
        await expect(page.locator('#storybook-root')).toBeAttached()
        await scan(page, `${story.title} — ${story.name}`)
      }
    })
  }
})
