import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Page } from '@playwright/test'

/**
 * Booting the conformance harness, with one owner.
 *
 * Two specs now mount configuration documents: `conformance-harness.spec.ts`
 * asks whether the grammar can EXPRESS the shipping screen, and
 * `inert-contracts.spec.ts` asks whether a contract declaring `none` behaves
 * inertly. They are different questions over the same machinery, and a second
 * copy of the boot sequence would be a second source for how the design system
 * starts -- the stylesheets it inlines, the readiness attribute it waits on,
 * and how a refusal is surfaced.
 *
 * Not a `.spec.ts`, so Playwright's default `testMatch` does not collect it.
 */

const ROOT = join(import.meta.dirname, '..')

const harnessBundle = () => readFileSync(join(ROOT, 'tests/harness/dist/harness.iife.js'), 'utf8')

export const stylesheet = (p: string) => readFileSync(join(ROOT, p), 'utf8')

export const documents = JSON.parse(
  readFileSync(join(ROOT, 'tests/harness/emergency-contacts.config.json'), 'utf8'),
) as Record<string, unknown>

/**
 * Mount a configuration document in a blank page.
 *
 * `setContent` rather than a route: the harness must not ship. The stylesheets
 * are inlined because target size and focus behaviour are only real once the
 * design system's CSS is applied -- an accessible tree would compare fine
 * without them and a keyboard spec would not.
 *
 * Resolves to the harness's refusal message, or `undefined` when the document
 * rendered. A caller asserting a REFUSAL needs to read the reason, and a
 * harness that failed silently would make an invalid document indistinguishable
 * from an empty one.
 */
export async function mount(page: Page, config: unknown) {
  await page.setContent(
    // The TITLE is not decoration. WCAG 2.4.2 requires one, and the axe scans
    // found this page failing it -- a document the harness itself was
    // malformed, while being used to assert that a configured tree is
    // EQUIVALENT to the shipping screen's. Comparing against an invalid page
    // makes every such comparison weaker than it reads.
    `<!doctype html><html lang="en"><head><title>Xforge conformance harness</title><style>
       ${stylesheet('packages/tokens/generated/tokens.css')}
       ${stylesheet('packages/ui/src/ui.css')}
     </style></head><body><div id="root"></div>
     <script>window.__XFORGE_CONFIG__ = ${JSON.stringify(config)}</script>
     <script>${harnessBundle()}</script>
     </body></html>`,
  )
  await page.waitForFunction(
    () =>
      document.documentElement.hasAttribute('data-harness-ready') ||
      document.documentElement.hasAttribute('data-harness-error'),
  )
  return await page.evaluate(() => window.__XFORGE_HARNESS_ERROR__)
}
