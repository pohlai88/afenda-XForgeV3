/**
 * Switch: behaviour survives the Adapter (ADR-031 beta, Primitive with behaviour).
 *
 * PROVE asks six questions of every adapter; the ones a server render can answer for a
 * switch are: it renders the platform role; controlled and uncontrolled state reach
 * the DOM as `aria-checked` AND as Base UI's `data-checked`/`data-unchecked` (the
 * state vocabulary a stylesheet reads); `disabled` reaches `aria-disabled` and
 * `data-disabled` and takes it out of the tab order; and nothing the Target does not
 * name is exposed. The toggle itself is Base UI's (ownership table) and is exercised
 * by the browser suite, not here.
 *
 * MUTATION WATCHED GO RED, 2026-09-03: with `{...props}` no longer spread onto the
 * primitive, four of the five cases went red; only the axis case, which asserts what is
 * NOT forwarded, stayed green.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Switch } from '../src/components/switch'

const render = (props: Parameters<typeof Switch>[0]) =>
  renderToStaticMarkup(createElement(Switch, props))

describe('Switch keeps the primitive behaviour and exposes only Xforge words', () => {
  it('renders the platform role, unchecked by default', () => {
    const html = render({ 'aria-label': 'Notify' })
    expect(html).toContain('role="switch"')
    expect(html).toContain('aria-checked="false"')
    expect(html).toContain('data-unchecked')
    expect(html).toContain('aria-label="Notify"')
  })

  it('controlled checked reaches both the ARIA state and the data vocabulary', () => {
    const html = render({ checked: true, onCheckedChange: () => {} })
    expect(html).toContain('aria-checked="true"')
    // Attribute form, not substring: the class list legitimately contains
    // `data-unchecked:bg-input` as a Tailwind variant, which is not the state.
    expect(html).toContain('data-checked=""')
    expect(html).not.toContain('data-unchecked=""')
  })

  it('uncontrolled defaultChecked renders on', () => {
    expect(render({ defaultChecked: true })).toContain('aria-checked="true"')
  })

  it('disabled leaves the tab order and says so twice', () => {
    const html = render({ disabled: true })
    expect(html).toContain('aria-disabled="true"')
    expect(html).toContain('data-disabled')
    expect(html).toContain('tabindex="-1"')
  })

  it('does not expose the adaptee size axis', () => {
    // A compile-time fact made visible: the Target has no `size`.
    const props: Parameters<typeof Switch>[0] = {}
    expect('size' in props).toBe(false)
    expect(render({})).toContain('data-size="default"')
  })
})
