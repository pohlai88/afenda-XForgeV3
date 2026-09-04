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
import { ATTRIBUTES, buildPlan, CHECKS, probeBody } from '../proof/contract.mjs'

/**
 * The rows and the probe now live in `tooling/proof/contract.mjs`, because
 * `tooling/storybook/proof.mjs` asks the same 82 questions of a different surface. What
 * is shared is WHAT is asked; each driver still owns HOW it reaches the page and how it
 * switches modes. Retyping the rows into the second driver would have been the largest
 * second source in this repository.
 */
const PLAN = buildPlan(manifest, CHECKS)

const probe = async (tab) => tab.evaluate(probeBody, { attributes: ATTRIBUTES, plan: PLAN })

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
  for (const failure of r.mode.inkFailures) {
    bad.push({
      component: 'alert',
      expected: 'at least 4.5:1',
      rendered: failure,
      word: 'ink on tint',
    })
  }
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
