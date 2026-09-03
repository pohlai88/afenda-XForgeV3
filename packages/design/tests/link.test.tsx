/**
 * Link — an anchor in the language: the ink, always underlined, the focus ring, and a
 * current marking that is a weight, not a colour.
 *
 * Red before link.tsx existed (2026-09-04): nothing in the language could be clicked to go
 * somewhere, so the gallery had no index and the employee page no way back.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Link, type LinkProps } from '../src/components/link'

const render = (props: LinkProps, child = 'Employees') =>
  renderToStaticMarkup(createElement(Link, props, child))

describe('Link is an anchor, distinguishable without colour', () => {
  it('renders a real anchor with its href, stamped as a slot', () => {
    const html = render({ href: '/employees' })
    expect(html).toMatch(/^<a\b/)
    expect(html).toContain('href="/employees"')
    expect(html).toContain('data-slot="link"')
    expect(html).toContain('>Employees</a>')
  })

  it('is underlined at rest, so the affordance never rests on colour alone', () => {
    expect(render({ href: '#a' })).toMatch(/class="[^"]*\bunderline\b/)
  })

  it('carries the one focus ring and the default ink from the STYLE tree', () => {
    const html = render({ href: '#a' })
    expect(html).toMatch(/class="[^"]*\bfocus-visible:focus-ring\b/)
    expect(html).toMatch(/class="[^"]*\btext-on-surface\b/)
  })

  it('current marks the anchor for assistive technology and by weight, not by colour', () => {
    const html = render({ current: true, href: '#here' })
    expect(html).toContain('aria-current="page"')
    expect(html).toMatch(/class="[^"]*\bfont-emphasis\b/)
    const rest = render({ href: '#there' })
    expect(rest).not.toContain('aria-current')
    expect(rest).not.toMatch(/class="[^"]*\bfont-emphasis\b/)
  })

  it('requires an href and admits no className', () => {
    // @ts-expect-error -- an anchor without a destination is a button in disguise
    const noHref: LinkProps = {}
    expect(noHref).toBeTypeOf('object')
    // @ts-expect-error -- className is not a prop of the Target (ADR-031 Decision 12)
    const illegal: LinkProps = { className: 'text-blue-500', href: '#a' }
    expect(illegal).toBeTypeOf('object')
  })
})
