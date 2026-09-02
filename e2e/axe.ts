import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

/**
 * The mechanical half of A11y-1, with one owner.
 *
 * TWO SPECS SCAN, AND THEY SCAN DIFFERENT THINGS. `a11y-conformance.spec.ts`
 * covers the application's state surfaces. PRIMITIVE COVERAGE IS OWED: the
 * document-driven harness that mounted them was deleted with the design system
 * it interpreted, and is rewritten against the new contracts at step 16. A
 * second copy of its boot sequence would be a second source for how the design
 * system starts. What must NOT be duplicated is the scan itself, which is why it
 * is here rather than in either of them.
 *
 * Not a `.spec.ts`, so Playwright's default `testMatch` does not collect it.
 */

/** WCAG A and AA only. Axe's `best-practice` rules are opinion, not conformance. */
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/**
 * Scan, and prove the scan happened.
 *
 * `violations` being empty is the headline, and on its own it is exactly the
 * shape this repository distrusts: an empty result set and a clean result set
 * print the same green. axe over a blank page returns no violations. So the
 * count of PASSED rules is asserted too -- if axe evaluated nothing, that is a
 * failure of the check rather than a property of the page.
 */
export async function scan(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()

  expect(
    results.passes.length,
    `axe evaluated no rule against ${label} -- a pass over nothing`,
  ).toBeGreaterThan(0)

  // Mapped rather than dumped: a raw violation object is several screens of
  // JSON, and a failure nobody can read is a failure nobody acts on.
  const found = results.violations.map((v) => ({
    id: v.id,
    where: v.nodes.map((n) => n.target.join(' ')),
  }))
  expect(found, `${label} has a WCAG A/AA violation`).toEqual([])
}
