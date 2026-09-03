/**
 * Shell — the frame a screen sits in: a docked header, a docked rail, and the content
 * inset from the viewport edge.
 *
 * Red before shell.tsx existed (2026-09-04): every screen's content touched the viewport
 * edge, the gallery's toggles scrolled away, and its index was a grid you scrolled back to.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Shell, type ShellProps } from '../src/components/shell'

const render = (props: ShellProps, child = 'the screen') =>
  renderToStaticMarkup(createElement(Shell, props, child))

describe('Shell frames a screen', () => {
  it('content alone: a main region, inset by the container role, and no chrome', () => {
    const html = render({})
    expect(html).toContain('data-slot="shell"')
    expect(html).toMatch(/<main\b[^>]*data-slot="shell-content"/)
    expect(html).toMatch(/<main\b[^>]*class="[^"]*\bp-container\b/)
    expect(html).toContain('the screen')
    expect(html).not.toContain('data-slot="shell-header"')
    expect(html).not.toContain('data-slot="shell-nav"')
    expect(html).not.toMatch(/\bgrid-shell\b/)
  })

  it('a header renders as a header element, docked by the shell-header utility', () => {
    const html = render({ header: createElement('span', null, 'Gallery') })
    expect(html).toMatch(/<header\b[^>]*class="[^"]*\bshell-header\b/)
    expect(html).toContain('data-slot="shell-header"')
    expect(html).toContain('Gallery')
  })

  it('a rail renders as a nav element, docked by the shell-nav utility, beside the content', () => {
    const html = render({ nav: createElement('a', { href: '#a' }, 'Alert') })
    expect(html).toMatch(/<nav\b[^>]*class="[^"]*\bshell-nav\b/)
    expect(html).toContain('data-slot="shell-nav"')
    // The rail and the content share a two-track grid only when there is a rail.
    expect(html).toMatch(/\bgrid-shell\b/)
    expect(html.indexOf('data-slot="shell-nav"')).toBeLessThan(
      html.indexOf('data-slot="shell-content"'),
    )
  })

  it('forwards native attributes and admits no className', () => {
    expect(render({ id: 'app' })).toContain('id="app"')
    // @ts-expect-error -- className is not a prop of the Target (ADR-031 Decision 12)
    const illegal: ShellProps = { className: 'p-8' }
    expect(illegal).toBeTypeOf('object')
  })
})
