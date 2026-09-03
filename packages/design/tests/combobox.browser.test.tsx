/**
 * Combobox: the compound behaves as one control, in a real browser (ADR-031, PROVE
 * question 2).
 *
 * `combobox.test.tsx` proves the closed state a server can render. This proves the rest:
 * typing opens the list and filters it, choosing an option reports the Xforge string id
 * (not Base UI's item object), the input then shows the label, and Escape closes. The
 * mechanics are Base UI's; what is on trial is that six parts assembled once still
 * compose, and that the id mapping holds in both directions under real events.
 *
 * MUTATION WATCHED GO RED, 2026-09-03: with the Adapter reporting the option OBJECT
 * instead of its `value`, the selection case failed on `toHaveBeenLastCalledWith('emp-2')`.
 *
 * Mounted with `react-dom/client` into `document.body`; a fresh root per test.
 */

import { createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { Combobox, type ComboboxOption, type ComboboxProps } from '../src/components/combobox'

const options: readonly ComboboxOption[] = [
  { label: 'Alice Ng', value: 'emp-1' },
  { label: 'Bola Adeyemi', value: 'emp-2' },
  { label: 'Chen Wei', value: 'emp-3' },
]

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
})

const render = (props: Partial<ComboboxProps> = {}) =>
  mount(createElement(Combobox, { 'aria-label': 'Manager', options, ...props }))

const input = () => page.getByRole('combobox', { name: 'Manager' })

describe('Combobox behaviour in Chromium', () => {
  it('typing opens the list and narrows it to the matching option', async () => {
    render()
    await userEvent.click(input())
    await userEvent.keyboard('Bo')
    await expect.element(input()).toHaveAttribute('aria-expanded', 'true')
    await expect.element(page.getByRole('option', { name: 'Bola Adeyemi' })).toBeVisible()
    await expect.element(page.getByRole('option', { name: 'Alice Ng' })).not.toBeInTheDocument()
  })

  it('choosing an option reports the Xforge id and shows the label', async () => {
    const onValueChange = vi.fn()
    render({ onValueChange })
    await userEvent.click(input())
    await userEvent.keyboard('Bo')
    await userEvent.click(page.getByRole('option', { name: 'Bola Adeyemi' }))
    expect(onValueChange).toHaveBeenLastCalledWith('emp-2')
    await expect.element(input()).toHaveValue('Bola Adeyemi')
    await expect.element(input()).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows the empty message when nothing matches', async () => {
    render({ emptyMessage: 'Nobody by that name' })
    await userEvent.click(input())
    await userEvent.keyboard('zzz')
    await expect.element(page.getByText('Nobody by that name')).toBeVisible()
  })

  it('Escape closes the list', async () => {
    render()
    await userEvent.click(input())
    await userEvent.keyboard('A')
    await expect.element(input()).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard('{Escape}')
    await expect.element(input()).toHaveAttribute('aria-expanded', 'false')
  })
})
