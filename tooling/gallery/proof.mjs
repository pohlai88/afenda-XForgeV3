// THE GALLERY'S OWN CHECK, and not part of the fast loop: it needs the dev server up.
//
//   pnpm --filter @xforge/web dev        in one shell
//   pnpm gallery:proof [out-dir]         in another
//
// For every word a component says on /gallery, the rendered value is compared with the
// token the style contract (style-manifest.json) says that word resolves through. Nothing
// here restates a value: the expectation is resolved inside the page from the token's own
// custom property, so a wrong token and a wrong render are both caught. Light, dark and
// compact are each captured full-page and probed. It found the outline Button drawing its
// stroke transparent on 2026-09-04, which no structural check could see.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const OUT = process.argv[2] ?? join(tmpdir(), 'xforge-gallery-proof')
mkdirSync(OUT, { recursive: true })
const PAGE = 'http://localhost:3000/gallery'

const manifest = JSON.parse(
  readFileSync(join(ROOT, 'packages/design/generated/style-manifest.json'), 'utf8'),
).symbols

// component | word | selector | css property | STYLE symbol
// selector forms: a CSS selector; `text:<prefix>` = the Text in the text card starting with
// <prefix>; `parentOfText:<prefix>` = that Text's parent (the Stack that owns the gap).
const CHECKS = [
  ['page', 'ground', '[data-slot=page]', 'backgroundColor', 'surface.page.background'],
  ['page', 'ink', '[data-slot=page]', 'color', 'ink.default.text'],
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
  ['text', 'tone muted', 'text:muted', 'color', 'surface.muted.foreground'],
  ['text', 'tone success', 'text:success', 'color', 'status.success.foreground'],
  ['text', 'tone danger', 'text:danger', 'color', 'status.danger.foreground'],
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
    'status.danger.background',
  ],
  [
    'alert',
    'danger ink',
    '[data-slot=alert][data-tone=danger]',
    'color',
    'status.danger.foreground',
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
  ['alert', 'stroke', '[data-slot=alert][data-tone=info]', 'borderColor', 'stroke.border.border'],
  [
    'button',
    'primary fill',
    '[data-slot=button][data-variant=primary]:not(:disabled)',
    'backgroundColor',
    'action.primary.background',
  ],
  [
    'button',
    'primary ink',
    '[data-slot=button][data-variant=primary]:not(:disabled)',
    'color',
    'action.primary.foreground',
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
    'surface.page.background',
  ],
  [
    'button',
    'outline ink',
    '[data-slot=button][data-variant=outline]:not(:disabled)',
    'color',
    'ink.default.text',
  ],
  [
    'button',
    'outline stroke colour',
    '[data-slot=button][data-variant=outline]:not(:disabled)',
    'borderColor',
    'stroke.border.border',
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
    'surface.card.background',
  ],
  [
    'card',
    'ink',
    '[aria-labelledby="gallery-card"] [data-slot=card]',
    'color',
    'surface.card.foreground',
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
    'stroke.border.border',
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
  ['code', 'fill', '[data-slot=code]', 'backgroundColor', 'surface.muted.background'],
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
    'surface.field.background',
  ],
  [
    'combobox',
    'field stroke',
    '[aria-labelledby="gallery-combobox"] [data-slot=combobox]',
    'borderColor',
    'stroke.field.border',
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
    '[data-slot=empty-state] p:last-child',
    'color',
    'surface.muted.foreground',
  ],
  ['list', 'gap', '[data-slot=list]', 'gap', 'space.tight.gap'],
  ['list', 'no indent', '[data-slot=list]', 'paddingLeft', 'space.none.padding'],
  ['list-item', 'surface', '[data-slot=list-item]', 'backgroundColor', 'surface.card.background'],
  ['list-item', 'shape', '[data-slot=list-item]', 'borderRadius', 'shape.control'],
  ['list-item', 'padding y', '[data-slot=list-item]', 'paddingTop', 'space.controlY.paddingY'],
  ['status', 'ink', '[data-slot=status]', 'color', 'surface.muted.foreground'],
  ['status', 'no margin', '[data-slot=status]', 'marginTop', 'space.none.margin'],
]

// Contract rows that are attributes, not tokens: read back, compared with the component's
// exported table (ALERT_TONE in alert.tsx; Status in status.tsx).
const ATTRIBUTES = [
  ['alert', 'info announces as', '[data-slot=alert][data-tone=info]', 'role', 'status'],
  ['alert', 'success announces as', '[data-slot=alert][data-tone=success]', 'role', 'status'],
  ['alert', 'warning announces as', '[data-slot=alert][data-tone=warning]', 'role', 'alert'],
  ['alert', 'danger announces as', '[data-slot=alert][data-tone=danger]', 'role', 'alert'],
  ['status', 'live region', '[data-slot=status]', 'aria-live', 'polite'],
  ['status', 'busy', '[data-slot=status]', 'aria-busy', 'true'],
  ['heading', 'level 1 element', '[aria-labelledby="gallery-heading"] h1', 'tagName', 'H1'],
]

const varOf = (tokenPath) => `--${tokenPath.replace(/\./g, '-')}`
const tokenFor = (symbol, prop) => {
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

const PLAN = CHECKS.map(([component, word, selector, prop, symbol]) => ({
  cls: manifest[symbol].class,
  component,
  cssVar: varOf(tokenFor(symbol, prop)),
  prop,
  selector,
  symbol,
  token: tokenFor(symbol, prop),
  word,
}))

const probe = async (tab) =>
  tab.evaluate(
    ({ plan, attributes }) => {
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
      // The index: every in-page link must land on an element that exists.
      const anchors = [...document.querySelectorAll('a[href^="#"]')].map(
        (el) => el.getAttribute('href') ?? '',
      )
      const missingAnchors = anchors.filter((href) => !document.getElementById(href.slice(1)))
      const mode = {
        anchors: anchors.length,
        background: root.getPropertyValue('--semantic-color-background').trim(),
        controlMinSize: root.getPropertyValue('--semantic-control-min-size').trim(),
        density: document.documentElement.dataset.density ?? '(none)',
        missingAnchors,
        spaceNormal: root.getPropertyValue('--semantic-space-normal').trim(),
        theme: document.documentElement.dataset.theme ?? '(none)',
        typeBody: root.getPropertyValue('--semantic-type-body').trim(),
      }
      return { attrs, mode, rows }
    },
    { attributes: ATTRIBUTES, plan: PLAN },
  )

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { height: 900, width: 1280 } })
await page.goto(PAGE, { waitUntil: 'networkidle' })
await page.waitForSelector('[aria-labelledby="gallery-text"]')

const results = {}
await page.screenshot({ fullPage: true, path: join(OUT, 'gallery-light.png') })
results.light = await probe(page)

await page.click('[aria-labelledby="gallery-mode-theme"]')
await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
await page.waitForTimeout(300)
await page.screenshot({ fullPage: true, path: join(OUT, 'gallery-dark.png') })
results.dark = await probe(page)

// back to light, then compact density through the combobox as a person would
await page.click('[aria-labelledby="gallery-mode-theme"]')
await page.waitForFunction(() => document.documentElement.dataset.theme === undefined)
let densityNote = ''
try {
  await page.click('[aria-labelledby="gallery-mode-density"]')
  await page.click('[role=option]:has-text("Compact")', { timeout: 5000 })
  await page.waitForFunction(() => document.documentElement.dataset.density === 'compact', null, {
    timeout: 5000,
  })
  await page.waitForTimeout(300)
  await page.screenshot({ fullPage: true, path: join(OUT, 'gallery-compact.png') })
  results.compact = await probe(page)
} catch (e) {
  densityNote = `compact density could not be selected through the combobox: ${e.message.split('\n')[0]}`
}
await browser.close()

// ---- report
const fmt = (s) => String(s).replace(/\|/g, '\\|')
const lines = []
lines.push('# Gallery proof — rendered value against the style contract', '')
lines.push(
  `Captured ${new Date().toISOString()} from ${PAGE} at 1280px. Every row resolves the token the`,
)
lines.push(
  'manifest names for that STYLE symbol inside the page and compares it with what the element',
)
lines.push(
  'actually computes. "declared" is the custom property as tokens.css declares it in that mode.',
  '',
)
lines.push(
  'Screenshots: gallery-light.png, gallery-dark.png' +
    (results.compact ? ', gallery-compact.png' : ''),
  '',
)
if (densityNote) {
  lines.push(`> ${densityNote}`, '')
}
for (const [mode, r] of Object.entries(results)) {
  const okCount = r.rows.filter((x) => x.ok).length + r.attrs.filter((x) => x.ok).length
  const total = r.rows.length + r.attrs.length
  lines.push(`## ${mode} — ${okCount} of ${total} rows match`, '')
  lines.push(
    `root: data-theme=${r.mode.theme}, data-density=${r.mode.density}; index ${r.mode.anchors} links, ${r.mode.missingAnchors.length} dangling; control floor ${r.mode.controlMinSize}, space.normal ${r.mode.spaceNormal}, type.body ${r.mode.typeBody}, background ${r.mode.background}`,
    '',
  )
  lines.push(
    '| component | word | STYLE symbol → class | token (declared) | expected | rendered | ok |',
  )
  lines.push('|---|---|---|---|---|---|---|')
  for (const x of r.rows) {
    lines.push(
      `| ${x.component} | ${x.word} | ${x.symbol} → \`${fmt(x.cls)}\` | ${x.token} (${fmt(x.declared)}) | ${fmt(x.expected)} | ${fmt(x.rendered)} | ${x.ok ? 'yes' : '**NO**'} |`,
    )
  }
  for (const x of r.attrs) {
    lines.push(
      `| ${x.component} | ${x.word} | contract (${x.prop}) | — | ${x.expected} | ${x.rendered} | ${x.ok ? 'yes' : '**NO**'} |`,
    )
  }
  lines.push('')
}
writeFileSync(join(OUT, 'gallery-proof.md'), lines.join('\n'))
writeFileSync(join(OUT, 'gallery-proof.json'), JSON.stringify(results, null, 2))
const summary = Object.entries(results).map(([m, r]) => {
  const bad = [...r.rows, ...r.attrs].filter((x) => !x.ok)
  for (const href of r.mode.missingAnchors) {
    bad.push({
      component: 'index',
      expected: 'an element with that id',
      rendered: `${href} -> nothing`,
      word: 'link target',
    })
  }
  const detail = bad
    .map((b) => `${b.component}/${b.word} [${b.rendered} vs ${b.expected}]`)
    .join('; ')
  return `${m}: ${bad.length} mismatch${bad.length === 1 ? '' : 'es'}${bad.length ? ` -> ${detail}` : ''}`
})
console.log(summary.join('\n'))
if (densityNote) {
  console.log(densityNote)
}
