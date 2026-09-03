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
 *               alone (constitution rule 7), and the test reads that back.
 *           Studio's CardHeader/CardContent anatomy is not adopted: Card is a root and
 *           Stack does the layout. Icons, badges and the period dropdown are dropped —
 *           nothing on a payroll screen has asked for them.
 * ADAPT     none. This is a COMPOSITION, not an Adapter: it consumes
 *           `@xforge/design/components/*` and nothing else, and it lives in the app.
 *           It is defined inside this test because no screen has asked for it yet; the
 *           day one does, it moves beside that screen unchanged.
 * PROVE     below. The composition's own source is read back to assert the reduction:
 *           no `className`, no `#components/ui`, no studio import.
 */

import { readFileSync } from 'node:fs'
import { Card } from '@xforge/design/components/card'
import { Heading } from '@xforge/design/components/heading'
import { Stack } from '@xforge/design/components/stack'
import { Text } from '@xforge/design/components/text'
import { createElement as h, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

interface Metric {
  /** The comparison, in words: "than last month", "of 42 submitted". */
  readonly baseline: string
  /** Signed and worded, never colour alone: "+4%", "−2 days". */
  readonly delta?: string
  readonly label: string
  /** What the delta MEANS for this metric. The screen decides; the sign does not. */
  readonly trend?: 'danger' | 'success'
  readonly value: string
}

/** The composition. Equal tiles, one number each, each with its baseline. */
function MetricRow({ heading, metrics }: { heading: string; metrics: readonly Metric[] }) {
  return h(
    Stack,
    { 'aria-labelledby': 'metric-row-heading', gap: 'normal', role: 'region' },
    h(Heading, { id: 'metric-row-heading', level: 2 }, heading),
    h(
      Stack,
      { direction: 'row', gap: 'normal' },
      ...metrics.map(
        (m): ReactElement =>
          h(
            Card,
            { 'aria-label': `${m.label}: ${m.value} ${m.baseline}`, key: m.label },
            h(
              Stack,
              { gap: 'tight' },
              h(Text, { variant: 'label' }, m.label),
              h(Text, { variant: 'display' }, m.value),
              h(
                Text,
                { tone: m.delta && m.trend ? m.trend : 'muted' },
                m.delta ? `${m.delta} ${m.baseline}` : m.baseline,
              ),
            ),
          ),
      ),
    ),
  )
}

// -- end of the composition; everything below is the test that reads it back --

const sample: readonly Metric[] = [
  { baseline: 'than last month', delta: '+3', label: 'Headcount', trend: 'success', value: '128' },
  { baseline: 'of 42 submitted', label: 'Timesheets pending', value: '7' },
  // A falling number that is GOOD: the trend is the screen's judgement, not the sign's.
  {
    baseline: 'than last month',
    delta: '−2%',
    label: 'Overtime hours',
    trend: 'success',
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
      ...html.matchAll(/<p class="[^"]*text-(?:success|error)-foreground[^"]*"[^>]*>([^<]*)</g),
    ]
    expect(toned).toHaveLength(sample.filter((m) => m.delta && m.trend).length)
    for (const [, content] of toned) {
      expect(content).toMatch(/^[+−-]\d/)
    }
  })

  it('is a composition, not an adapter: Xforge components only, no styling of its own', () => {
    const source = readFileSync(new URL(import.meta.url), 'utf8')
    // Sliced between the function and the sentinel comment above `sample`. The first
    // pass sliced to `'const metrics'`, a declaration that no longer existed; it worked
    // by matching its own literal, which is the kind of accident a check should not
    // rest on. The sentinel's first occurrence is the comment, before this test's text.
    const end = source.indexOf('// -- end of the composition')
    expect(end).toBeGreaterThan(0)
    const composition = source.slice(source.indexOf('function MetricRow'), end)
    expect(composition.length).toBeGreaterThan(200)
    expect(composition).not.toContain('className')
    // Judged on the import specifiers, not on the file's text: this very assertion
    // would otherwise be the match. Nothing private to the design package, nothing
    // from the studio, and every Xforge import a public component entry.
    const imports = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1] ?? '')
    expect(imports.length).toBeGreaterThan(4)
    for (const spec of imports) {
      expect(spec.startsWith('#')).toBe(false)
      expect(spec).not.toMatch(/studio/)
      if (spec.startsWith('@xforge/')) {
        expect(spec).toMatch(/^@xforge\/design\/components\/[a-z-]+$/)
      }
    }
  })
})
