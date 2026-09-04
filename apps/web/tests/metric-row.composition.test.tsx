/**
 * INSPIRE: a shadcn-studio "statistics-component" block, reduced to Xforge components
 * (ADR-031 beta, exit question D).
 *
 * ACQUIRE   shadcn-studio, statistics-component, block 1 of 6 (fetched 2026-09-03 through
 *           the studio MCP as data; nothing installed, nothing copied).
 * DIGEST    six variants of one recipe: a centred grid of 4–6 Cards, each an icon tile,
 *           a large value, a label, and a comparison in words ("than last week"); colour
 *           reserved for a 10%-tinted icon and a sign-coloured delta badge; no sparklines;
 *           accessibility thin (no headings, no aria on deltas, decorative SVGs unnamed);
 *           depends on studio's card/badge/avatar/dropdown/progress and lucide icons.
 * NORMALIZE what Xforge keeps is the IDEA — a row of equal tiles, one number each, every
 *           number carrying its baseline in words so a figure is never presented without
 *           one. Two words Xforge did not have were recorded here rather than invented
 *           (Decision 4), and were admitted the same day, by the owner, with this
 *           composition as their consumer:
 *             - `display`, a type role one step above `title`; the value renders in it
 *             - a trend tone on Text (`success` / `danger`), set by the SCREEN for what
 *               the change means, not by the sign: fewer overtime hours is `success`.
 *               The delta stays words with a sign, so colour never carries the meaning
 *               alone (constitution rule 7), and this test reads that back.
 *           Studio's CardHeader/CardContent anatomy is not adopted: Card is a root and
 *           Stack does the layout. Icons, badges and the period dropdown are dropped —
 *           nothing on a payroll screen has asked for them.
 * ADAPT     none. This is a COMPOSITION, not an Adapter: it consumes
 *           `@xforge/design/components/*` and nothing else, and it lives in the app.
 * PROVE     below.
 *
 * -------------------------------------------------------------------------------------
 * THE COMPOSITION HAS MOVED, AND THIS FILE NOW PROVES SOMETHING IT DOES NOT CONTAIN.
 * -------------------------------------------------------------------------------------
 * It was defined inside this test, with the header saying "the day a screen asks for it,
 * it moves beside that screen unchanged". The dashboard asked. It lives at
 * `apps/web/app/metric-row.tsx`, and the source-readback below reads THAT file rather
 * than this one.
 *
 * That is not a detail. The old readback sliced this file's own text between a function
 * and a sentinel comment, so the assertion and its subject were the same bytes — which
 * worked, and would have gone on passing unchanged while the thing a screen actually
 * renders drifted anywhere it liked. A proof that cannot see its subject is the shape
 * this repository keeps finding.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { type Metric, MetricRow } from '../app/metric-row'

const ROOT = join(import.meta.dirname, '../../..')
const COMPOSITION = join(ROOT, 'apps/web/app/metric-row.tsx')

const sample: readonly Metric[] = [
  {
    baseline: 'than last month',
    delta: { text: '+3', trend: 'success' },
    label: 'Headcount',
    value: '128',
  },
  { baseline: 'of 42 submitted', label: 'Timesheets pending', value: '7' },
  // A falling number that is GOOD: the trend is the screen's judgement, not the sign's.
  {
    baseline: 'than last month',
    delta: { text: '−2%', trend: 'success' },
    label: 'Overtime hours',
    value: '212',
  },
]

describe('a studio statistics block reduces to Xforge components', () => {
  const html = renderToStaticMarkup(h(MetricRow, { heading: 'This period', metrics: sample }))

  it('renders one labelled region with a real heading and one tile per metric', () => {
    expect(html).toContain('role="region"')
    expect(html).toContain('<h2')
    expect(html.match(/data-slot="card"/g)).toHaveLength(sample.length)
  })

  /** A Grid, not a row Stack: a fifth tile wraps instead of squeezing the other four. */
  it('lays the tiles on a grid', () => {
    expect(html).toContain('data-slot="grid"')
  })

  it('never shows a number without its baseline in words', () => {
    for (const m of sample) {
      expect(html).toContain(m.value)
      expect(html).toContain(m.baseline)
      expect(html).toContain(`aria-label="${m.label}: ${m.value} ${m.baseline}"`)
    }
  })

  it('sets every value in the display role', () => {
    expect(html.match(/text-display/g)).toHaveLength(sample.length)
  })

  it('a trend ink never appears without a signed delta in words beside it', () => {
    // Colour is redundant to the sign (rule 7). Each trend-toned paragraph must open with
    // a signed delta; a metric without a delta must not be trend-toned at all.
    const toned = [
      ...html.matchAll(/<p class="[^"]*text-on-(?:success|error)-container[^"]*"[^>]*>([^<]*)</g),
    ]
    expect(toned).toHaveLength(sample.filter((m) => m.delta?.trend).length)
    for (const [, content] of toned) {
      expect(content).toMatch(/^[+−-]\d/)
    }
  })

  it('is a composition, not an adapter: Xforge components only, no styling of its own', () => {
    const source = readFileSync(COMPOSITION, 'utf8')
    // Read from disk, so this fails if the file is moved or emptied rather than passing
    // over its own text. The old version sliced THIS file and could not see the subject.
    expect(source.length).toBeGreaterThan(200)
    expect(source).toContain('export function MetricRow')

    // COMMENTS STRIPPED FIRST. The rule is "this composition writes no class of its
    // own", and a raw substring scan enforces "this composition never says the word" --
    // a different and sillier rule, which went red the moment the file's own header
    // explained that it has no className. A check whose subject includes the prose
    // about the check cannot distinguish a violation from a description of one.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    expect(code).not.toContain('className')

    const imports = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1] ?? '')
    expect(imports.length).toBeGreaterThan(3)
    for (const spec of imports) {
      // Nothing private to the design package, nothing from the studio, and every
      // import a public component entry point (ADR-033).
      expect(spec.startsWith('#')).toBe(false)
      expect(spec).not.toMatch(/studio/)
      expect(spec).toMatch(/^@xforge\/design\/components\/[a-z-]+$/)
    }
  })
})
