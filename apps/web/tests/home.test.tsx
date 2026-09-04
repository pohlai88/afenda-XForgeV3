/**
 * The development index at `/`: the routes that exist, one click from the root.
 *
 * Red before app/page.tsx existed (2026-09-04): the root answered not-found, and the gallery
 * and the seeded employee page were reached by typing their URLs.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HomePage from '../app/page'

const ROOT = join(import.meta.dirname, '../../..')

describe('the development index', () => {
  const html = renderToStaticMarkup(h(HomePage))

  it('links to the gallery by its real path and names the employee route', () => {
    expect(html).toContain('href="/gallery"')
    // The seeded id is owned by a fixture under tests/, which the app may not import and
    // must not restate; the index names the route and says where the id lives.
    expect(html).toContain('/employees/&lt;id&gt;')
    expect(html).toContain('tests/fixtures/employee.ts')
    // A UUID-SHAPED SEGMENT, not any subpath. The rule is "the seeded id is not
    // restated here", and the first form of it -- forbidding `href="/employees/`
    // outright -- also forbade `/employees/new`, a static route carrying no id
    // at all. It went red the moment the onboarding screen was linked, which is
    // a check refusing the thing it was never about.
    expect(html).not.toMatch(
      /href="\/employees\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    )
  })

  it('is a page in the language: a Shell, links, no class of its own, nothing from tests/', () => {
    expect(html).toContain('data-slot="shell"')
    expect(html.match(/data-slot="link"/g)?.length ?? 0).toBeGreaterThanOrEqual(1)
    const source = readFileSync(join(ROOT, 'apps/web/app/page.tsx'), 'utf8')
    expect(source).not.toMatch(/\bclassName\s*=/)
    for (const specifier of [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1] ?? '')) {
      expect(specifier).toMatch(/^(@xforge\/design\/components\/[a-z-]+|next\/navigation)$/)
    }
  })
})

describe('a production build does not serve the index', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('answers not-found in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => renderToStaticMarkup(h(HomePage))).toThrow()
  })
})
