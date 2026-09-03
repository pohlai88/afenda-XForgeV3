/**
 * ResourceBoundary's failed state, mounted in Chromium so the boundary actually catches.
 *
 * `renderToStaticMarkup` cannot show this state: an error boundary does not catch during a
 * server render, the throw propagates. So the state is mounted with createRoot and read
 * back from the DOM.
 *
 * THE INK RULE. The failed state is a danger Alert, and the muted ink is measured against
 * the page and the card, never against a status tint: on the danger tint it is 4.31:1,
 * under the AA floor, which axe reported on 2026-09-04 through the Storybook scan. Every
 * Text inside the alert wears the default ink (9.89:1 on the tint). Red before the muted
 * tone came off the second line.
 */

import { createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ResourceBoundary } from '../src/components/resource-boundary'

let root: Root | undefined

function mount(element: ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  root.render(element)
}

afterEach(() => {
  root?.unmount()
  root = undefined
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

const Boom = (): never => {
  throw new Error('the page is out of date with the server')
}

const failedState = async () => {
  // The boundary reports what it caught; the test is not about the report.
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  mount(createElement(ResourceBoundary, null, createElement(Boom)))
  await vi.waitFor(() => {
    if (!document.querySelector('[data-slot="alert"]')) {
      throw new Error('the boundary has not rendered its failed state yet')
    }
  })
  return document.querySelector('[data-slot="alert"]') as HTMLElement
}

describe('ResourceBoundary, failed, in Chromium', () => {
  it('renders a danger alert with a way to recover', async () => {
    const alert = await failedState()
    expect(alert.dataset.tone).toBe('danger')
    expect(alert.getAttribute('role')).toBe('alert')
    expect(alert.querySelector('[data-slot="button"]')?.textContent).toContain('Reload')
  })

  it('writes every line in the default ink: the muted ink fails AA on the danger tint', async () => {
    const alert = await failedState()
    const texts = [...alert.querySelectorAll('[data-slot="text"]')]
    expect(texts.length).toBeGreaterThan(1)
    for (const text of texts) {
      expect([...text.classList], text.textContent ?? '').not.toContain('text-muted-foreground')
    }
  })
})
