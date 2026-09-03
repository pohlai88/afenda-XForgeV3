/**
 * Combobox: six adaptee parts become one Xforge concept (ADR-031 beta, Compound).
 *
 * What a server render can prove: the assembled input carries the platform role and
 * its closed state; the Target's words reach the DOM (`placeholder`, `disabled`, the
 * label); the option list is not in the document while closed; and the Target does
 * not leak the adaptee's part vocabulary. Opening and selecting are Base UI's, proved
 * in a browser, not here.
 *
 * MUTATIONS WATCHED, 2026-09-03: with `placeholder` no longer passed to the input, the
 * first case went red. With `disabled` removed from the INPUT the third case stayed
 * green — Base UI propagates the root's `disabled` to the input itself — so the
 * adapter's duplicate was deleted as a second source, and the mutation that does turn
 * the case red is removing `disabled` from the ROOT.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Combobox, type ComboboxOption } from '../src/components/combobox'

const options: readonly ComboboxOption[] = [
  { label: 'Alice Ng', value: 'emp-1' },
  { label: 'Bola Adeyemi', value: 'emp-2' },
]

const render = (props: Partial<Parameters<typeof Combobox>[0]> = {}) =>
  renderToStaticMarkup(createElement(Combobox, { options, ...props }))

describe('Combobox assembles the primitive once, in Xforge words', () => {
  it('renders one combobox input, closed, with the placeholder', () => {
    const html = render({ 'aria-label': 'Manager', placeholder: 'Search people' })
    // Exactly one INPUT carries the role. Base UI also marks its trigger button, so
    // a bare substring count would report two; the input is the one a reader types in.
    expect(html.match(/<input[^>]*role="combobox"/g)).toHaveLength(1)
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('placeholder="Search people"')
    expect(html).toContain('aria-label="Manager"')
    expect(html).toContain('data-slot="combobox"')
  })

  it('keeps the option list out of the document while closed', () => {
    const html = render()
    expect(html).not.toContain('Alice Ng')
    expect(html).not.toContain('role="option"')
  })

  it('forwards disabled to the input', () => {
    expect(render({ disabled: true })).toMatch(/<input[^>]*disabled=""/)
  })

  it('resolves a string id to the selected option label in the input', () => {
    const html = render({ onValueChange: () => {}, value: 'emp-2' })
    expect(html).toContain('value="Bola Adeyemi"')
  })
})
