import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { EMPLOYEE } from '@xforge/fixtures/employee'

/**
 * The gate builds and then tests. This asserts it tested what it built.
 *
 * `reuseExistingServer: false` closes the path that was actually found here --
 * a leftover `next start` holding the port, adopted by three consecutive verify
 * runs, serving a build from two hours earlier while the E2E stage reported
 * passing. But removing one mechanism is not the same as establishing the
 * property. A proxy in front, a CDN edge holding chunks, a container serving a
 * mounted volume from an earlier image, or someone exporting CI=true locally
 * would each reproduce the same failure by a different route.
 *
 * So this checks the PROPERTY instead: the running server is serving this
 * build. Next writes a random `BUILD_ID` per build -- which is a gift, because
 * it means "the artefact on disk" and "the artefact being served" can be
 * compared rather than assumed.
 *
 * Two independent checks, because they fail differently:
 *
 *   1. The served document carries the BUILD_ID that is on disk. Catches a
 *      whole server serving a different build.
 *   2. Every static asset the document references exists in this build's output
 *      AND is fetchable. Catches a server serving THIS document with chunks
 *      from another build, which is what a caching layer in front produces --
 *      and it is the symptom that surfaced first, as Internal Server Error for
 *      a chunk whose filename no longer existed.
 *
 * This is the ninth appearance of the defect this repository keeps having: a
 * fact acquired a second source -- the build on disk and the build being served
 * -- and the two agreed until something rebuilt. A check aimed at the property
 * rather than at the mechanism is the only kind that survives the next costume.
 */
const NEXT = join(import.meta.dirname, '../apps/web/.next')
const PAGE = `/employees/${EMPLOYEE}`

/** The build id written by the `next build` this gate just ran. */
const buildIdOnDisk = () => readFileSync(join(NEXT, 'BUILD_ID'), 'utf8').trim()

test.describe('the server is serving the build the gate produced', () => {
  test('the served document carries the build id that is on disk', async ({ page }) => {
    const response = await page.goto(PAGE)
    const html = (await response?.text()) ?? ''

    expect(html.length, 'no document served').toBeGreaterThan(0)
    expect(
      html,
      'the served document does not carry this build id -- the server is running a different build',
    ).toContain(buildIdOnDisk())
  })

  test('every static asset the document references exists in this build', async ({ page }) => {
    const response = await page.goto(PAGE)
    const html = (await response?.text()) ?? ''

    const referenced = [
      ...new Set([...html.matchAll(/\/_next\/(static\/[^"'\\)\s]+)/g)].map((m) => m[1])),
    ]

    expect(
      referenced.length,
      'no static assets referenced -- this check would pass having verified nothing',
    ).toBeGreaterThan(0)

    const missing = referenced.filter((asset) => !existsSync(join(NEXT, asset)))
    expect(missing, 'referenced assets absent from this build').toEqual([])

    // Present on disk is not the same as served: a proxy or a stale process can
    // still answer for a path the build output happens to contain.
    for (const asset of referenced) {
      const res = await page.request.get(`/_next/${asset}`)
      expect(res.status(), `${asset} did not serve`).toBe(200)
    }
  })
})
