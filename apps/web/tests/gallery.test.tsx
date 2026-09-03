/**
 * The gallery is a check that can fail, or it is decoration.
 *
 * Three things it must hold, each derived from the tree rather than restated here:
 *   - its groups ARE the authored components: the two sets equal, both directions
 *   - every word a component exports is on the page: each Alert tone, each Button
 *     variant, each Heading level, each component's slot
 *   - the modes it offers are the selectors `tokens.css` rebinds under; a mode the
 *     stylesheet does not know would flip a switch and change nothing
 * And the shape the page must keep: it composes `@xforge/design/components/*` and writes
 * no class, and a production build does not serve it.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ALERT_TONE } from '@xforge/design/components/alert'
import { BUTTON_VARIANT } from '@xforge/design/components/button'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DENSITIES, THEMES } from '../app/gallery/modes'
import GalleryPage from '../app/gallery/page'
import { GALLERY } from '../app/gallery/specimens'

const ROOT = join(import.meta.dirname, '../../..')
const COMPONENTS = join(ROOT, 'packages/design/src/components')
const GALLERY_DIR = join(import.meta.dirname, '../app/gallery')

const authored = readdirSync(COMPONENTS)
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => f.slice(0, -'.tsx'.length))
  .sort()

describe('the gallery shows every authored component', () => {
  it('has a population', () => {
    expect(authored.length).toBeGreaterThan(10)
  })

  it('one group per component file, and no group without a file', () => {
    const groups = GALLERY.map((g) => g.component).sort()
    expect(groups).toEqual(authored)
  })

  it('every group has states with distinct names', () => {
    for (const group of GALLERY) {
      const names = group.states.map((s) => s.name)
      expect(names.length, group.component).toBeGreaterThan(0)
      expect(new Set(names).size, group.component).toBe(names.length)
    }
  })
})

describe('the rendered page carries every word', () => {
  const html = renderToStaticMarkup(h(GalleryPage))

  it('every Alert tone', () => {
    for (const tone of Object.keys(ALERT_TONE)) {
      expect(html, tone).toContain(`data-tone="${tone}"`)
    }
  })

  it('every Button variant', () => {
    for (const variant of Object.keys(BUTTON_VARIANT)) {
      expect(html, variant).toContain(`data-variant="${variant}"`)
    }
  })

  it('every Heading level', () => {
    for (const level of [1, 2, 3]) {
      expect(html).toContain(`<h${level}`)
    }
  })

  it("every component's own slot", () => {
    for (const name of authored) {
      const source = readFileSync(join(COMPONENTS, `${name}.tsx`), 'utf8')
      const slot = /data-slot="([a-z-]+)"/.exec(source)?.[1]
      if (slot) {
        expect(html, name).toContain(`data-slot="${slot}"`)
      }
    }
  })
})

describe('the modes are the selectors tokens.css rebinds under', () => {
  const tokens = readFileSync(join(ROOT, 'packages/design/generated/tokens.css'), 'utf8')

  it('every theme', () => {
    for (const theme of THEMES) {
      expect(tokens).toContain(`[data-theme='${theme}']`)
    }
  })

  it('every density except the default, which is the absence of the attribute', () => {
    for (const density of DENSITIES) {
      if (density.value === 'default') {
        continue
      }
      expect(tokens).toContain(`[data-density='${density.value}']`)
    }
    expect(tokens).not.toContain("[data-density='default']")
  })
})

describe('the gallery keeps its shape', () => {
  const files = readdirSync(GALLERY_DIR).filter((f) => f.endsWith('.tsx'))

  it('is more than one file', () => {
    expect(files.length).toBeGreaterThan(1)
  })

  it('writes no class and no style', () => {
    for (const file of files) {
      const source = readFileSync(join(GALLERY_DIR, file), 'utf8')
      expect(source, file).not.toMatch(/\bclassName\s*=/)
      expect(source, file).not.toMatch(/\bstyle\s*=/)
    }
  })

  it('imports the design package through its components, and nothing else of it', () => {
    const allowed = /^(@xforge\/design\/components\/[a-z-]+|react|next\/navigation|\.\/[a-z-]+)$/
    for (const file of files) {
      const source = readFileSync(join(GALLERY_DIR, file), 'utf8')
      const specifiers = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1] ?? '')
      expect(specifiers.length, file).toBeGreaterThan(0)
      for (const specifier of specifiers) {
        expect(specifier, file).toMatch(allowed)
      }
    }
  })
})

describe('a production build does not serve it', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('renders in development', () => {
    expect(renderToStaticMarkup(h(GalleryPage))).toContain('<h1')
  })

  it('answers not-found in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => renderToStaticMarkup(h(GalleryPage))).toThrow()
  })
})
