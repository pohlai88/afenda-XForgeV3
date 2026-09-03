/**
 * Specimen — the frame one rendered state sits in, with its caption and its footnote.
 *
 * Red before specimen.tsx existed (2026-09-04): the gallery labelled each state with a bare
 * Text above it and nothing around it, so a Switch and a full-width Combobox sat on the
 * same card with nothing to say where one state ended and the next began.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Specimen, type SpecimenProps } from '../src/components/specimen'

const render = (props: SpecimenProps, child = 'the state') =>
  renderToStaticMarkup(createElement(Specimen, props, child))

describe('Specimen frames one state', () => {
  it('is a figure whose caption is the label, so the label names the thing it frames', () => {
    const html = render({ label: 'Disabled' })
    expect(html).toMatch(/^<figure\b/)
    expect(html).toContain('data-slot="specimen"')
    expect(html).toMatch(/<figcaption\b[^>]*>Disabled<\/figcaption>/)
    expect(html).toContain('the state')
  })

  it('puts the state on a stage with the frame words: ground, stroke, shape, padding', () => {
    const html = render({ label: 'x' })
    // React writes attributes in prop order, so the stage's class sits right before its slot.
    const classes = /class="([^"]*)" data-slot="specimen-stage"/.exec(html)?.[1] ?? ''
    expect(classes).not.toBe('')
    for (const word of [
      'bg-surface',
      'border-stroke',
      'border-outline-variant',
      'rounded-control',
      'p-normal',
    ]) {
      expect(classes, word).toContain(word)
    }
  })

  it('can stage a state on the card surface instead of the page ground', () => {
    // The muted ink is measured against the page AND the card; a state judged only on the
    // ground is judged on half its surfaces. Red before the surface axis existed.
    const onCard =
      /class="([^"]*)" data-slot="specimen-stage"/.exec(
        render({ label: 'x', surface: 'card' }),
      )?.[1] ?? ''
    expect(onCard).toContain('bg-surface-lowest')
    expect(onCard).toContain('text-on-surface')
    expect(onCard).not.toMatch(/\bbg-surface(?![\w-])/)
    const onPage =
      /class="([^"]*)" data-slot="specimen-stage"/.exec(render({ label: 'x' }))?.[1] ?? ''
    expect(onPage).toMatch(/\bbg-surface(?![\w-])/)
    expect(onPage).not.toContain('bg-surface-lowest')
  })

  it('renders the footer only when given one', () => {
    expect(render({ label: 'x' })).not.toContain('data-slot="specimen-footer"')
    const html = renderToStaticMarkup(
      createElement(
        Specimen,
        { footer: createElement('span', null, 'bg-surface-lowest'), label: 'x' },
        'y',
      ),
    )
    expect(html).toContain('data-slot="specimen-footer"')
    expect(html).toContain('bg-surface-lowest')
  })

  it('forwards native attributes and admits no className', () => {
    expect(render({ id: 'sp-1', label: 'x' })).toContain('id="sp-1"')
    // @ts-expect-error -- className is not a prop of the Target (ADR-031 Decision 12)
    const illegal: SpecimenProps = { className: 'p-4', label: 'x' }
    expect(illegal).toBeTypeOf('object')
  })
})
