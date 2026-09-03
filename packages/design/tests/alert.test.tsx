/**
 * Alert's announcement contract, asserted against the DOM it renders (ADR-031,
 * Verification 1).
 *
 * The tone -> role rule had two owners that disagreed: `alert.tsx` rendered
 * `role="status"` for every tone, "deliberately", while five end-to-end specs
 * asserted `role="alert"` on danger and warning. Neither read the other. Now the
 * table beside the component is the one owner, this file asserts the DOM agrees
 * with it, and the e2e specs assert the DOM from the other side.
 *
 * MUTATION WATCHED GO RED, 2026-09-03: the table declared `alert` for danger and
 * warning while the component still hard-coded `status` -- two cases failed, the
 * other two passed. Then the component read the table, and all four passed.
 *
 * `aria-live` is asymmetric on purpose (MDN, retrieved 2026-09-03): `role="alert"`
 * already implies `aria-live="assertive"` and an explicit duplicate double-speaks in
 * VoiceOver on iOS, so alert-role tones carry none; `role="status"` tones MAY carry
 * the redundant `aria-live="polite"` MDN recommends, and are not required to.
 *
 * JSX-free in the TEST -- `createElement` + `renderToStaticMarkup`, node
 * environment, no dependency added. The component under test is JSX, and the first
 * run proved the tsconfig's `jsx: "preserve"` does reach it: esbuild emitted the
 * classic runtime and every case failed with "React is not defined", which is a red
 * for the wrong reason. `vitest.config.ts` now sets the automatic runtime.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ALERT_TONE, Alert } from '../src/components/alert'

const tones = Object.keys(ALERT_TONE) as (keyof typeof ALERT_TONE)[]

const render = (tone: keyof typeof ALERT_TONE) =>
  renderToStaticMarkup(createElement(Alert, { tone }, 'x'))

describe('Alert announces what its contract table says', () => {
  it('has a contract to assert', () => {
    expect(tones.length).toBeGreaterThanOrEqual(4)
    expect(tones).toContain('danger')
    expect(tones).toContain('info')
  })

  it.each(tones)('%s renders the role its row declares', (tone) => {
    const html = render(tone)
    expect(html).toContain(`role="${ALERT_TONE[tone].role}"`)
  })

  it.each(tones)('%s carries no explicit aria-live when its role is alert', (tone) => {
    if (ALERT_TONE[tone].role !== 'alert') {
      return
    }
    expect(render(tone)).not.toContain('aria-live')
  })

  it('every row names a role the platform announces', () => {
    for (const tone of tones) {
      expect(['alert', 'status']).toContain(ALERT_TONE[tone].role)
    }
  })

  it('binds colour to a redundant cue in every row', () => {
    // Constitution rule 7: colour never carries meaning alone. The icon is the cue.
    for (const tone of tones) {
      expect(ALERT_TONE[tone].Icon).toBeTypeOf('object')
    }
  })
})
