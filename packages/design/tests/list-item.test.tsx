/**
 * ListItem — one row of a list: its content at the start, its action at the end.
 *
 * Red before the row landed (2026-09-04): the item was a column, so the employee screen's
 * Save button stretched to the full width under the contact's name, and the gallery showed
 * the same bar in every list row. The row is the component's decision, made once, so no
 * screen wraps the pair itself.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ListItem } from '../src/components/list-item'

const render = (props: Record<string, unknown> = {}, ...children: string[]) =>
  renderToStaticMarkup(createElement(ListItem, props, ...children))

describe('ListItem is a row', () => {
  it('renders a real list item, stamped as a slot', () => {
    const html = render({}, 'Priya Raman')
    expect(html).toMatch(/^<li\b/)
    expect(html).toContain('data-slot="list-item"')
    expect(html).toContain('Priya Raman')
  })

  it('lays its children across, centred, content at the start and the action at the end', () => {
    const html = render({}, 'name', 'action')
    const classes = /class="([^"]*)"/.exec(html)?.[1] ?? ''
    expect(classes).toContain('flex')
    expect(classes).toContain('items-center')
    expect(classes).toContain('justify-between')
    expect(classes).not.toContain('flex-col')
  })

  it('keeps the row surface and stroke from the language', () => {
    const classes = /class="([^"]*)"/.exec(render({}, 'x'))?.[1] ?? ''
    for (const word of ['bg-card', 'border-stroke', 'border-border', 'rounded-control']) {
      expect(classes, word).toContain(word)
    }
  })

  it('forwards native attributes', () => {
    expect(render({ 'aria-current': 'true', id: 'row-1' }, 'x')).toContain('id="row-1"')
  })
})
