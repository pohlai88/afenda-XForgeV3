/**
 * Status owns a live-region contract, and until this file nothing asserted it (ADR-031
 * Adapter schema: a contract without a test is prose).
 *
 * The three attributes are the component: `role="status"`, the redundant
 * `aria-live="polite"` MDN recommends, and `aria-busy`. They are also NOT props -- a
 * caller's `role="alert"` won through the spread when rendered to check, and would have
 * turned a polite wait into an interruption. The refusal is the Target's type.
 *
 * JSX-free: `createElement` + `renderToStaticMarkup`, node environment.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Status, type StatusProps } from '../src/components/status'

describe('Status announces politely and cannot be told otherwise', () => {
  it('renders the live-region contract', () => {
    const html = renderToStaticMarkup(createElement(Status, null, 'Loading'))
    expect(html).toMatch(/^<p /)
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('data-slot="status"')
    expect(html).toContain('>Loading</p>')
  })

  it('forwards what it does not own', () => {
    const html = renderToStaticMarkup(createElement(Status, { id: 'wait' }, 'x'))
    expect(html).toContain('id="wait"')
  })

  it('refuses the contract attributes as props at compile time', () => {
    // @ts-expect-error -- the live-region attributes are the contract, not the caller's
    const illegal: StatusProps = { 'aria-live': 'assertive', role: 'alert' }
    expect(illegal).toBeTypeOf('object')
  })
})
