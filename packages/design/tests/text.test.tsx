/**
 * Text's vocabulary, asserted against the classes it renders (ADR-031, Verification 7).
 *
 * Two words were missing and recorded rather than invented: a display-size role for a
 * headline figure, and a trend tone for a delta. Both were admitted on 2026-09-03 with
 * their first consumer, the MetricRow composition in `apps/web/tests`. The kernel side is
 * proved by the generator (a `display` role that failed the hierarchy or the grid, or an
 * ink that stopped clearing the page, refuses the token file); this file proves the
 * component reaches the projected names.
 *
 * MUTATION WATCHED GO RED, 2026-09-03: written before `text.tsx` knew either word. Four
 * of ten failed on the unchanged component -- display, success, danger, and the
 * display+danger case; cva renders nothing for an axis value it does not know, so the
 * expected class was simply absent -- while the six other cases passed. Then the recipe
 * gained the words, and all ten passed.
 *
 * JSX-free in the test: `createElement` + `renderToStaticMarkup`, node environment.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Text } from '../src/components/text'

type Props = Parameters<typeof Text>[0]

const render = (props: Props) => renderToStaticMarkup(createElement(Text, props, 'x'))

describe('Text renders the role and tone it is asked for', () => {
  it('is a paragraph with the slot name and the base class', () => {
    const html = render({})
    expect(html).toMatch(/^<p /)
    expect(html).toContain('data-slot="text"')
    expect(html).toContain('m-none')
  })

  it.each([
    ['body', 'font-body text-body'],
    ['emphasis', 'font-emphasis text-emphasis'],
    ['label', 'font-label text-label'],
    // The headline figure: heading weight, one size above title.
    ['display', 'font-heading text-display'],
  ] as const)('variant %s sets its role classes', (variant, classes) => {
    const html = render({ variant })
    for (const cls of classes.split(' ')) {
      expect(html).toContain(cls)
    }
  })

  it.each([
    ['default', 'text-foreground'],
    ['muted', 'text-muted-foreground'],
    // Trend tones name MEANING, not direction: fewer overtime hours is `success`.
    ['success', 'text-success-foreground'],
    ['danger', 'text-error-foreground'],
  ] as const)('tone %s sets its ink', (tone, cls) => {
    expect(render({ tone })).toContain(cls)
  })

  it('a tone never replaces the role: display keeps its size under a trend ink', () => {
    const html = render({ tone: 'danger', variant: 'display' })
    expect(html).toContain('text-display')
    expect(html).toContain('text-error-foreground')
  })
})
