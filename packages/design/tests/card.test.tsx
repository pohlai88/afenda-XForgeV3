/**
 * Card's Target: the native div attributes, forwarded to the adaptee's root
 * (ADR-031 Adapter schema, Tier 1, no recipe, no contract).
 *
 * MUTATION WATCHED GO RED, 2026-09-03: with the `{...props}` spread removed from
 * the adapter, the `aria-labelledby` case failed — the one attribute the only
 * screen that uses Card depends on.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Card } from '../src/components/card'

describe('Card forwards its Target to the primitive root', () => {
  it('renders children inside the adaptee', () => {
    const html = renderToStaticMarkup(createElement(Card, null, 'body'))
    expect(html).toMatch(/^<div\b/)
    expect(html).toContain('data-slot="card"')
    expect(html).toContain('body')
  })

  it('forwards the labelling attribute the screen relies on', () => {
    const html = renderToStaticMarkup(createElement(Card, { 'aria-labelledby': 'h' }, 'x'))
    expect(html).toContain('aria-labelledby="h"')
  })
})
