/**
 * Switch: behaviour survives the Adapter, in a real browser (ADR-031, PROVE question 2).
 *
 * `switch.test.tsx` proves what a server render can: role, state attributes, forwarded
 * words. This proves the part it cannot: a click toggles, Space toggles, `onCheckedChange`
 * receives the new value, `disabled` and `readOnly` refuse both, and the adopted form
 * words `name`, `value` and `required` reach the hidden checkbox a real form reads. The
 * toggle is Base UI's (ownership table); what is on trial is that the Adapter forwards
 * enough for it to work.
 *
 * MUTATIONS WATCHED GO RED, 2026-09-03: with the Adapter no longer forwarding
 * `onCheckedChange`, three cases failed -- click, Space and controlled -- while the DOM
 * still toggled, which is exactly the leak a server render cannot see. With the Adapter
 * no longer spreading its props, all six failed: no label reaches the DOM, so nothing
 * can even be found, form participation included.
 *
 * Mounted with `react-dom/client` straight into `document.body`; no render helper, no
 * framework package, and a fresh root per test.
 */

import { createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { Switch, type SwitchProps } from '../src/components/switch'

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

const render = (props: SwitchProps) => mount(createElement(Switch, props))

describe('Switch behaviour in Chromium', () => {
  it('a click toggles the state and reports the new value', async () => {
    const onCheckedChange = vi.fn()
    render({ 'aria-label': 'Notify', onCheckedChange })
    const control = page.getByRole('switch', { name: 'Notify' })
    await expect.element(control).toHaveAttribute('aria-checked', 'false')

    await userEvent.click(control)
    await expect.element(control).toHaveAttribute('aria-checked', 'true')
    expect(onCheckedChange).toHaveBeenCalledTimes(1)
    expect(onCheckedChange).toHaveBeenLastCalledWith(true)

    await userEvent.click(control)
    await expect.element(control).toHaveAttribute('aria-checked', 'false')
    expect(onCheckedChange).toHaveBeenLastCalledWith(false)
  })

  it('Space toggles from the keyboard', async () => {
    const onCheckedChange = vi.fn()
    render({ 'aria-label': 'Overtime', onCheckedChange })
    const control = page.getByRole('switch', { name: 'Overtime' })
    // `element()` does not wait; React's first commit after `createRoot().render` is
    // asynchronous, so a retrying assertion goes first and the focus call follows it.
    await expect.element(control).toHaveAttribute('aria-checked', 'false')
    control.element().focus()
    await userEvent.keyboard(' ')
    await expect.element(control).toHaveAttribute('aria-checked', 'true')
    expect(onCheckedChange).toHaveBeenLastCalledWith(true)
  })

  it('a controlled switch follows its prop, not the click', async () => {
    const onCheckedChange = vi.fn()
    render({ 'aria-label': 'Locked on', checked: true, onCheckedChange })
    const control = page.getByRole('switch', { name: 'Locked on' })
    await userEvent.click(control)
    // The parent was told, and did not change the prop, so the DOM stays on.
    expect(onCheckedChange).toHaveBeenLastCalledWith(false)
    await expect.element(control).toHaveAttribute('aria-checked', 'true')
  })

  it('participates in a form through the adopted words name, value and required', async () => {
    // The adopted form words were forwarded but never exercised -- the third evidence
    // pass said so. Base UI renders a visually hidden checkbox for the form; what is on
    // trial is that Xforge's `name`, `value` and `required` reach it.
    const form = document.createElement('form')
    document.body.appendChild(form)
    root = createRoot(form)
    root.render(
      createElement(Switch, {
        'aria-label': 'Notify',
        name: 'notify',
        required: true,
        value: 'yes',
      }),
    )
    const control = page.getByRole('switch', { name: 'Notify' })
    await expect.element(control).toHaveAttribute('aria-required', 'true')
    expect(form.checkValidity()).toBe(false)
    expect([...new FormData(form).entries()]).toEqual([])

    await userEvent.click(control)
    await expect.element(control).toHaveAttribute('aria-checked', 'true')
    expect(form.checkValidity()).toBe(true)
    expect([...new FormData(form).entries()]).toEqual([['notify', 'yes']])
  })

  it('readOnly shows the state and refuses to change it', async () => {
    const onCheckedChange = vi.fn()
    render({ 'aria-label': 'Fixed', onCheckedChange, readOnly: true })
    const control = page.getByRole('switch', { name: 'Fixed' })
    await expect.element(control).toHaveAttribute('aria-readonly', 'true')
    await userEvent.click(control)
    await userEvent.keyboard(' ')
    await expect.element(control).toHaveAttribute('aria-checked', 'false')
    expect(onCheckedChange).not.toHaveBeenCalled()
  })

  it('disabled refuses the click and the key', async () => {
    const onCheckedChange = vi.fn()
    render({ 'aria-label': 'Frozen', disabled: true, onCheckedChange })
    const control = page.getByRole('switch', { name: 'Frozen' })
    await userEvent.click(control, { force: true })
    await userEvent.keyboard(' ')
    await expect.element(control).toHaveAttribute('aria-checked', 'false')
    expect(onCheckedChange).not.toHaveBeenCalled()
  })
})
