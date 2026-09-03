import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * EVERY AUTHORED COMPONENT IS READ BY THE SECOND SURFACE, OR SAYS WHY NOT.
 *
 * Storybook exists here to be a reader of `packages/design` that is not routed through
 * the gallery. `tooling/gallery/proof.mjs` navigates to `/gallery` and probes selectors
 * inside it, so its entire view is mediated by the page's own specimen list: a state that
 * list omits is a state the proof cannot report on. Two readers of the same components,
 * neither downstream of the other, is the whole point -- and it is worth nothing if the
 * second reader silently covers one component out of nineteen.
 *
 * This is the same shape as `apps/web/tests/gallery.test.tsx`'s group check, deliberately:
 * the set of stories is held equal to the set of authored files, less exactly the ones
 * declared below with a reason. A component added to `src/components/` is red here until
 * somebody either writes its story or writes down why it has none.
 */

const COMPONENTS = join(import.meta.dirname, '../src/components')
const STORIES = join(import.meta.dirname, '../stories')

/** Authored components with no story, each with the reason. */
const NOT_STORIED: Readonly<Record<string, string>> = {
  page: 'a viewport-tall ground with nothing in it; the story canvas is not a page and framing one proves nothing',
  specimen:
    'the frame the gallery draws around a state -- it has no appearance of its own to inspect, and a specimen of a specimen is a mirror',
}

const authored = readdirSync(COMPONENTS)
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => f.replace(/\.tsx$/, ''))
  .sort()

const storied = readdirSync(STORIES)
  .filter((f) => f.endsWith('.stories.tsx'))
  .map((f) => f.replace(/\.stories\.tsx$/, ''))
  .sort()

describe('stories cover the authored layer', () => {
  /**
   * The empty-set failure: `readdirSync` over a renamed or moved directory returns
   * nothing, every set comparison below is then trivially satisfied, and the suite goes
   * green having checked no components at all.
   */
  it('has a population', () => {
    expect(authored.length).toBeGreaterThan(10)
    expect(authored).toContain('button')
  })

  it('one story file per component, and no story without a component', () => {
    const expected = authored.filter((c) => !(c in NOT_STORIED))
    expect(storied).toEqual(expected)
  })

  it('a component with no story is an authored file, and carries a reason', () => {
    for (const [name, reason] of Object.entries(NOT_STORIED)) {
      expect(authored, name).toContain(name)
      expect(reason.length, name).toBeGreaterThan(20)
    }
  })

  /**
   * A story file that imports through a relative path would reach across the workspace
   * boundary ADR-033 closes, and one that imports the vendored tree would frame a
   * component the application cannot reach at all (`"./components/ui/*": null`).
   */
  it('every story reaches its component through the package entry point', () => {
    for (const name of storied) {
      const src = readFileSync(join(STORIES, `${name}.stories.tsx`), 'utf8')
      expect(src, name).toContain(`@xforge/design/components/${name}`)
      expect(src, name).not.toContain('components/ui/')
      expect(src, name).not.toMatch(/from '\.\.\//)
    }
  })
})
