/**
 * THE STYLE CONTRACT'S CHECK ROWS, AND THE PROBE THAT READS THEM. One copy, two drivers.
 *
 * `tooling/gallery/proof.mjs` drives the gallery page; `tooling/storybook/proof.mjs`
 * drives Storybook's story iframes. They ask the same question of different surfaces, and
 * the thing that must NOT be duplicated is what is asked -- 82 rows naming a component, a
 * word, a selector, a CSS property and the STYLE symbol the value must come from. Retyping
 * that into a second driver would be the largest second source in the repository.
 *
 * Nothing here knows which surface it runs against. `probeBody` is passed to
 * `page.evaluate`, so it closes over nothing but its own arguments -- that is what lets one
 * function serialise into two different documents.
 *
 * The expectation is never restated: `resolve()` builds a throwaway element, sets the
 * property to `var(--the-token)`, and reads back what the browser computes. A wrong token
 * and a wrong render both fail, and neither is compared against a number written here.
 */

export const CHECKS = [
  ['page', 'ground', '[data-slot=page]', 'backgroundColor', 'surface.default.background'],
  ['page', 'ink', '[data-slot=page]', 'color', 'ink.onSurface.text'],
  ['page', 'body size', '[data-slot=page]', 'fontSize', 'typography.body'],
  ['page', 'body leading', '[data-slot=page]', 'lineHeight', 'typography.body'],
  ['page', 'family', '[data-slot=page]', 'fontFamily', 'family.sans'],
  [
    'heading',
    'level 1 size',
    '[aria-labelledby="gallery-heading"] h1',
    'fontSize',
    'typography.title',
  ],
  [
    'heading',
    'level 1 weight',
    '[aria-labelledby="gallery-heading"] h1',
    'fontWeight',
    'typography.title',
  ],
  [
    'heading',
    'level 1 leading',
    '[aria-labelledby="gallery-heading"] h1',
    'lineHeight',
    'typography.title',
  ],
  [
    'heading',
    'level 2 size',
    '[aria-labelledby="gallery-heading"] h2',
    'fontSize',
    'typography.heading',
  ],
  [
    'heading',
    'level 3 size',
    '[aria-labelledby="gallery-heading"] h3',
    'fontSize',
    'typography.subheading',
  ],
  [
    'heading',
    'level 3 weight',
    '[aria-labelledby="gallery-heading"] h3',
    'fontWeight',
    'typography.subheading',
  ],
  ['text', 'tone muted', 'text:muted', 'color', 'ink.onSurfaceVariant.text'],
  ['text', 'tone success', 'text:success', 'color', 'status.success.foreground'],
  ['text', 'tone danger', 'text:danger', 'color', 'error.container.foreground'],
  ['text', 'variant label size', 'text:label', 'fontSize', 'typography.label'],
  ['text', 'variant label weight', 'text:label', 'fontWeight', 'typography.label'],
  ['text', 'variant emphasis weight', 'text:emphasis', 'fontWeight', 'typography.emphasis'],
  ['text', 'variant display size', 'text:display', 'fontSize', 'typography.display'],
  ['text', 'variant display leading', 'text:display', 'lineHeight', 'typography.display'],
  [
    'alert',
    'info tint',
    '[data-slot=alert][data-tone=info]',
    'backgroundColor',
    'status.info.background',
  ],
  ['alert', 'info ink', '[data-slot=alert][data-tone=info]', 'color', 'status.info.foreground'],
  [
    'alert',
    'success tint',
    '[data-slot=alert][data-tone=success]',
    'backgroundColor',
    'status.success.background',
  ],
  [
    'alert',
    'warning tint',
    '[data-slot=alert][data-tone=warning]',
    'backgroundColor',
    'status.warning.background',
  ],
  [
    'alert',
    'danger tint',
    '[data-slot=alert][data-tone=danger]',
    'backgroundColor',
    'error.container.background',
  ],
  [
    'alert',
    'danger ink',
    '[data-slot=alert][data-tone=danger]',
    'color',
    'error.container.foreground',
  ],
  ['alert', 'shape', '[data-slot=alert][data-tone=info]', 'borderRadius', 'shape.control'],
  [
    'alert',
    'padding y',
    '[data-slot=alert][data-tone=info]',
    'paddingTop',
    'space.controlY.paddingY',
  ],
  ['alert', 'padding x', '[data-slot=alert][data-tone=info]', 'paddingLeft', 'space.rowX.paddingX'],
  ['alert', 'icon size', '[data-slot=alert][data-tone=info] svg', 'width', 'size.icon'],
  ['alert', 'stroke', '[data-slot=alert][data-tone=info]', 'borderColor', 'outline.variant.border'],
  [
    'button',
    'primary fill',
    '[data-slot=button][data-variant=primary]:not(:disabled)',
    'backgroundColor',
    'accent.primary.background',
  ],
  [
    'button',
    'primary ink',
    '[data-slot=button][data-variant=primary]:not(:disabled)',
    'color',
    'accent.primary.foreground',
  ],
  [
    'button',
    'control floor',
    '[data-slot=button][data-variant=primary]:not(:disabled)',
    'minBlockSize',
    'size.control',
  ],
  [
    'button',
    'shape',
    '[data-slot=button][data-variant=primary]:not(:disabled)',
    'borderRadius',
    'shape.control',
  ],
  [
    'button',
    'padding x',
    '[data-slot=button][data-variant=primary]:not(:disabled)',
    'paddingLeft',
    'space.controlX.paddingX',
  ],
  [
    'button',
    'label size',
    '[data-slot=button][data-variant=primary]:not(:disabled)',
    'fontSize',
    'typography.label',
  ],
  [
    'button',
    'outline fill',
    '[data-slot=button][data-variant=outline]:not(:disabled)',
    'backgroundColor',
    'surface.default.background',
  ],
  [
    'button',
    'outline ink',
    '[data-slot=button][data-variant=outline]:not(:disabled)',
    'color',
    'ink.onSurface.text',
  ],
  [
    'button',
    'outline stroke colour',
    '[data-slot=button][data-variant=outline]:not(:disabled)',
    'borderColor',
    'outline.variant.border',
  ],
  [
    'button',
    'outline stroke width',
    '[data-slot=button][data-variant=outline]:not(:disabled)',
    'borderWidth',
    'stroke.width',
  ],
  [
    'button',
    'disabled fill',
    '[data-slot=button][data-variant=primary]:disabled',
    'backgroundColor',
    'state.disabled.background',
  ],
  [
    'button',
    'disabled ink',
    '[data-slot=button][data-variant=primary]:disabled',
    'color',
    'state.disabled.foreground',
  ],
  [
    'card',
    'surface',
    '[aria-labelledby="gallery-card"] [data-slot=card]',
    'backgroundColor',
    'surface.lowest.background',
  ],
  [
    'card',
    'ink',
    '[aria-labelledby="gallery-card"] [data-slot=card]',
    'color',
    'ink.onSurface.text',
  ],
  [
    'card',
    'shape',
    '[aria-labelledby="gallery-card"] [data-slot=card]',
    'borderRadius',
    'shape.container',
  ],
  [
    'card',
    'stroke colour',
    '[aria-labelledby="gallery-card"] [data-slot=card]',
    'borderColor',
    'outline.variant.border',
  ],
  [
    'card',
    'stroke width',
    '[aria-labelledby="gallery-card"] [data-slot=card]',
    'borderWidth',
    'stroke.width',
  ],
  [
    'card',
    'padding',
    '[aria-labelledby="gallery-card"] [data-slot=card]',
    'paddingTop',
    'space.normal.padding',
  ],
  ['card', 'gap', '[aria-labelledby="gallery-card"] [data-slot=card]', 'gap', 'space.tight.gap'],
  ['code', 'family', '[data-slot=code]', 'fontFamily', 'family.mono'],
  ['code', 'size', '[data-slot=code]', 'fontSize', 'typography.bodyCompact'],
  ['code', 'fill', '[data-slot=code]', 'backgroundColor', 'surface.container.background'],
  ['code', 'shape', '[data-slot=code]', 'borderRadius', 'shape.precise'],
  ['code', 'padding x', '[data-slot=code]', 'paddingLeft', 'space.related.paddingX'],
  ['stack', 'gap tight', 'parentOfText:tight', 'gap', 'space.tight.gap'],
  ['stack', 'gap normal', 'parentOfText:normal', 'gap', 'space.normal.gap'],
  ['stack', 'gap loose', 'parentOfText:loose', 'gap', 'space.loose.gap'],
  [
    'switch',
    'track width',
    '[aria-labelledby="gallery-switch"] [data-slot=switch]',
    'width',
    'component.switch.trackWidth',
  ],
  [
    'switch',
    'track height',
    '[aria-labelledby="gallery-switch"] [data-slot=switch]',
    'height',
    'component.switch.trackHeight',
  ],
  [
    'switch',
    'thumb',
    '[aria-labelledby="gallery-switch"] [data-slot=switch-thumb]',
    'width',
    'component.switch.thumb',
  ],
  [
    'switch',
    'off fill',
    '[aria-labelledby="gallery-switch"] [data-slot=switch]:not([data-checked]):not([data-disabled])',
    'backgroundColor',
    'interaction.unchecked.background',
  ],
  [
    'switch',
    'on fill',
    '[aria-labelledby="gallery-switch"] [data-slot=switch][data-checked]:not([data-disabled])',
    'backgroundColor',
    'interaction.checked.background',
  ],
  [
    'switch',
    'disabled fill',
    '[aria-labelledby="gallery-switch"] [data-slot=switch][data-disabled]:not([data-checked])',
    'backgroundColor',
    'interaction.disabled.background',
  ],
  [
    'combobox',
    'control floor',
    '[aria-labelledby="gallery-combobox"] [data-slot=combobox]',
    'minBlockSize',
    'size.control',
  ],
  [
    'combobox',
    'field fill',
    '[aria-labelledby="gallery-combobox"] [data-slot=combobox]',
    'backgroundColor',
    'surface.lowest.background',
  ],
  [
    'combobox',
    'field stroke',
    '[aria-labelledby="gallery-combobox"] [data-slot=combobox]',
    'borderColor',
    'outline.default.border',
  ],
  [
    'combobox',
    'shape',
    '[aria-labelledby="gallery-combobox"] [data-slot=combobox]',
    'borderRadius',
    'shape.control',
  ],
  [
    'combobox',
    'padding x',
    '[aria-labelledby="gallery-combobox"] [data-slot=combobox]',
    'paddingLeft',
    'space.controlX.paddingX',
  ],
  [
    'combobox',
    'body size',
    '[aria-labelledby="gallery-combobox"] [data-slot=combobox]',
    'fontSize',
    'typography.body',
  ],
  [
    'combobox',
    'disabled fill',
    '[aria-labelledby="gallery-combobox"] [data-slot=combobox]:disabled',
    'backgroundColor',
    'state.disabled.background',
  ],
  [
    'combobox',
    'disabled ink',
    '[aria-labelledby="gallery-combobox"] [data-slot=combobox]:disabled',
    'color',
    'state.disabled.foreground',
  ],
  ['empty-state', 'gap', '[data-slot=empty-state]', 'gap', 'space.tight.gap'],
  ['empty-state', 'padding y', '[data-slot=empty-state]', 'paddingTop', 'space.section.paddingY'],
  ['empty-state', 'shape', '[data-slot=empty-state]', 'borderRadius', 'shape.control'],
  [
    'empty-state',
    'description ink',
    '[aria-labelledby="gallery-empty-state"] [data-slot=empty-state] p:last-child',
    'color',
    'ink.onSurfaceVariant.text',
  ],
  ['list', 'gap', '[data-slot=list]', 'gap', 'space.tight.gap'],
  ['list', 'no indent', '[data-slot=list]', 'paddingLeft', 'space.none.padding'],
  ['list-item', 'surface', '[data-slot=list-item]', 'backgroundColor', 'surface.lowest.background'],
  ['list-item', 'shape', '[data-slot=list-item]', 'borderRadius', 'shape.control'],
  ['list-item', 'padding y', '[data-slot=list-item]', 'paddingTop', 'space.rowY.paddingY'],
  ['status', 'ink', '[data-slot=status]', 'color', 'ink.onSurfaceVariant.text'],
  ['status', 'no margin', '[data-slot=status]', 'marginTop', 'space.none.margin'],
]

export const ATTRIBUTES = [
  ['alert', 'info announces as', '[data-slot=alert][data-tone=info]', 'role', 'status'],
  ['alert', 'success announces as', '[data-slot=alert][data-tone=success]', 'role', 'status'],
  ['alert', 'warning announces as', '[data-slot=alert][data-tone=warning]', 'role', 'alert'],
  ['alert', 'danger announces as', '[data-slot=alert][data-tone=danger]', 'role', 'alert'],
  ['status', 'live region', '[data-slot=status]', 'aria-live', 'polite'],
  ['status', 'busy', '[data-slot=status]', 'aria-busy', 'true'],
  ['heading', 'level 1 element', '[aria-labelledby="gallery-heading"] h1', 'tagName', 'H1'],
]

export const varOf = (tokenPath) => `--${tokenPath.replace(/\./g, '-')}`
export const tokenFor = (manifest, symbol, prop) => {
  const entry = manifest[symbol]
  if (!entry) {
    throw new Error(`no STYLE symbol '${symbol}' in the manifest`)
  }
  const t = entry.tokens
  if (t.length === 1) {
    return t[0]
  }
  // A typography symbol carries one token per property; the property says which.
  const FIELD_OF = { fontSize: '.type.', fontWeight: '.weight.', lineHeight: '.leading.' }
  const want = FIELD_OF[prop]
  const hit = want ? t.find((x) => x.includes(want)) : undefined
  if (!hit) {
    throw new Error(`symbol '${symbol}' has ${t.length} tokens; none fits ${prop}`)
  }
  return hit
}

export const buildPlan = (manifest, rows = CHECKS) =>
  rows.map(([component, word, selector, prop, symbol]) => ({
    cls: manifest[symbol].class,
    component,
    cssVar: varOf(tokenFor(manifest, symbol, prop)),
    prop,
    selector,
    symbol,
    token: tokenFor(manifest, symbol, prop),
    word,
  }))

export const probeBody = ({ plan, attributes }) => {
  const pick = (sel) => {
    if (sel.startsWith('text:') || sel.startsWith('parentOfText:')) {
      const prefix = sel.slice(sel.indexOf(':') + 1)
      const card = document.querySelector(
        '[aria-labelledby="gallery-text"], [aria-labelledby="gallery-stack"]',
      )
      const scope = sel.startsWith('parentOfText:')
        ? document.querySelector('[aria-labelledby="gallery-stack"]')
        : document.querySelector('[aria-labelledby="gallery-text"]')
      const el = [...(scope ?? card).querySelectorAll('[data-slot=text]')].find((t) =>
        (t.textContent ?? '').startsWith(prefix),
      )
      if (!el) {
        return null
      }
      return sel.startsWith('parentOfText:') ? el.parentElement : el
    }
    return document.querySelector(sel)
  }
  const root = getComputedStyle(document.documentElement)
  const resolve = (cssVar, prop, ref) => {
    const el = document.createElement('div')
    el.style.position = 'absolute'
    el.style.display = 'inline-block'
    el.style.borderStyle = 'solid'
    if (prop === 'lineHeight' && ref) {
      el.style.fontSize = getComputedStyle(ref).fontSize
    }
    el.style[prop] = `var(${cssVar})`
    document.body.appendChild(el)
    const v = getComputedStyle(el)[prop]
    el.remove()
    return v
  }
  const rows = plan.map((c) => {
    const el = pick(c.selector)
    if (!el) {
      return { ...c, declared: '', expected: '', ok: false, rendered: 'ELEMENT NOT FOUND' }
    }
    const rendered = getComputedStyle(el)[c.prop]
    const expected = resolve(c.cssVar, c.prop, el)
    const declared = root.getPropertyValue(c.cssVar).trim()
    return { ...c, declared, expected, ok: rendered === expected && declared !== '', rendered }
  })
  const attrs = attributes.map(([component, word, selector, attr, expected]) => {
    const el = document.querySelector(selector)
    let rendered = 'ELEMENT NOT FOUND'
    if (el) {
      rendered = attr === 'tagName' ? el.tagName : el.getAttribute(attr)
    }
    return {
      component,
      expected,
      ok: rendered === expected,
      prop: attr,
      rendered,
      selector,
      word,
    }
  })
  // Ink on a tint: every Text inside an Alert must clear the AA floor against the fill it
  // sits on. The muted ink on the danger tint was 4.31:1 until 2026-09-04, and only axe
  // saw it; now the proof does, in every mode.
  const luminance = (css) => {
    const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(css)
    if (!m) {
      return null
    }
    const [r, g, b] = [m[1], m[2], m[3]].map((c) => {
      const s = Number(c) / 255
      return s <= 0.039_28 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const inkFailures = []
  for (const alert of document.querySelectorAll('[data-slot=alert]')) {
    const fill = luminance(getComputedStyle(alert).backgroundColor)
    for (const text of alert.querySelectorAll('[data-slot=text]')) {
      const ink = luminance(getComputedStyle(text).color)
      if (fill === null || ink === null) {
        continue
      }
      const ratio = (Math.max(fill, ink) + 0.05) / (Math.min(fill, ink) + 0.05)
      if (ratio < 4.5) {
        inkFailures.push(
          `${alert.dataset.tone}: "${(text.textContent ?? '').slice(0, 40)}" ${ratio.toFixed(2)}:1`,
        )
      }
    }
  }
  // The index: every in-page link must land on an element that exists.
  const anchors = [...document.querySelectorAll('a[href^="#"]')].map(
    (el) => el.getAttribute('href') ?? '',
  )
  const missingAnchors = anchors.filter((href) => !document.getElementById(href.slice(1)))
  const mode = {
    anchors: anchors.length,
    background: root.getPropertyValue('--semantic-color-surface').trim(),
    controlMinSize: root.getPropertyValue('--semantic-control-min-size').trim(),
    density: document.documentElement.dataset.density ?? '(none)',
    inkFailures,
    missingAnchors,
    spaceNormal: root.getPropertyValue('--semantic-space-normal').trim(),
    theme: document.documentElement.dataset.theme ?? '(none)',
    typeBody: root.getPropertyValue('--semantic-type-body').trim(),
  }
  return { attrs, mode, rows }
}
