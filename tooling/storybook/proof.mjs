// THE STYLE CONTRACT, PROVED AGAINST STORYBOOK. The gallery's proof, on the other surface.
//
//   pnpm storybook                       in one shell
//   pnpm storybook:proof [out-dir]       in another
//
// Same 82 rows as `tooling/gallery/proof.mjs`, from the same module, asked of story
// iframes instead of one page. Nothing here restates an expected value: each row names a
// STYLE symbol, and the expectation is resolved inside the document from that symbol's own
// custom property, so a wrong token and a wrong render both fail.
//
// WHY A SECOND DRIVER AND NOT A SECOND COPY. The rows, the plan builder and the probe live
// in `tooling/proof/contract.mjs`. What differs between the two surfaces is only how a
// component is reached and how the modes are switched, and that is all either driver owns.
//
// WHY PER STORY. The gallery puts every component on one page, so one probe sees them all.
// Storybook shows one story at a time, so a row is satisfied if ANY story of its component
// satisfies it -- `data-tone=success` exists only in Alert's EveryTone, and that is the
// story that answers for it. A row no story can satisfy is a row whose element is never
// found, which is a failure and reads as one.
//
// MODES ARE SET, NOT CLICKED. The gallery drives its own toggles because a person would;
// here there is no toggle to drive, so the attributes `tokens.css` keys off are set
// directly on the document element. It is the same document-level switch either way.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { ATTRIBUTES, buildPlan, CHECKS, probeBody } from '../proof/contract.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const OUT = process.argv[2] ?? join(tmpdir(), 'xforge-storybook-proof')
mkdirSync(OUT, { recursive: true })
const STORYBOOK = process.env.STORYBOOK_ORIGIN ?? 'http://localhost:6006'

const manifest = JSON.parse(
  readFileSync(join(ROOT, 'packages/design/generated/style-manifest.json'), 'utf8'),
).symbols

/**
 * Rows the gallery owns and Storybook cannot answer.
 *
 * `text:` and `parentOfText:` find a Text by the words it starts with inside a named
 * gallery card; `[aria-labelledby="gallery-…"]` scopes to a gallery section. Both name the
 * gallery's own structure rather than a component's, so they do not survive the move and
 * are not silently dropped -- they are counted and reported, so the number that did not
 * transfer is visible rather than assumed to be zero.
 */
const isGalleryOnly = ([, , selector]) =>
  selector.startsWith('text:') || selector.startsWith('parentOfText:')

/**
 * A gallery SCOPE is not a gallery-only row.
 *
 * `[aria-labelledby="gallery-card"] [data-slot=card]` names a real check on a real
 * component; the prefix only exists because the gallery puts every component on one page
 * and the row has to say which section it means. A story iframe holds one component, so
 * the scope is not merely unnecessary there -- it matches nothing, and dropping the whole
 * row would have silently lost 33 of the 82. The first run of this driver did exactly
 * that and reported "44 portable" as though the rest were gallery furniture.
 */
/**
 * …but a story iframe still needs A scope, and it is `#storybook-root`.
 *
 * The preview document is not just the story: Storybook ships hidden chrome in the same
 * frame, including an `sb-nopreview` H1 reading "No Preview" at 14px. A bare `h1` selector
 * matches THAT one, so `heading / level 1 size` reported 14px against an expected 24px in
 * all three modes while the story's own H1 was correct beside it. Scoping to the story
 * root is not tidiness; without it the probe measures Storybook's furniture.
 */
const rescope = (selector) =>
  `#storybook-root ${selector.replace(/\[aria-labelledby="gallery-[a-z-]+"\]\s*/g, '')}`

const portable = CHECKS.filter((row) => !isGalleryOnly(row)).map(
  ([component, word, selector, prop, symbol]) => [component, word, rescope(selector), prop, symbol],
)
const skipped = CHECKS.filter(isGalleryOnly)
const portableAttrs = ATTRIBUTES.filter((row) => !isGalleryOnly(row)).map(
  ([component, word, selector, attr, expected]) => [
    component,
    word,
    rescope(selector),
    attr,
    expected,
  ],
)

const PLAN = buildPlan(manifest, portable)

const index = await (await fetch(`${STORYBOOK}/index.json`)).json()
const stories = Object.values(index.entries ?? {})
if (stories.length === 0) {
  throw new Error(`Storybook returned no stories at ${STORYBOOK} -- is it running?`)
}

/** `Design/EmptyState` -> `emptystate`, matched against a row's component with dashes out. */
const slugOf = (title) => title.split('/').pop().toLowerCase()
const storiesFor = (component) =>
  stories.filter((s) => slugOf(s.title) === component.replace(/-/g, ''))

/**
 * `page` has rows and no story, deliberately — a viewport-tall empty ground is not a
 * specimen, which is why `stories.test.ts` lists it in NOT_STORIED. Its rows still apply
 * to every story, because `.storybook/preview.ts` wraps each one in `Page` exactly as the
 * root layout does. So they are probed against whichever story comes first rather than
 * counted as unreachable: the ground, the ink, the family and the body size are what that
 * decorator exists to provide, and this is what proves it provides them.
 */
const PAGE_ROWS = PLAN.filter((r) => r.component === 'page')
const components = [...new Set(PLAN.map((r) => r.component))]
  .filter((c) => c !== 'page')
  .sort((a, b) => a.localeCompare(b))
const unreachable = components.filter((c) => storiesFor(c).length === 0)

const MODES = [
  { density: null, label: 'light', theme: null },
  { density: null, label: 'dark', theme: 'dark' },
  { density: 'compact', label: 'compact', theme: null },
]

/**
 * WHICH STORY'S ANSWER TO KEEP, and why "the first one that passed" is not enough.
 *
 * A row is asked of every story of its component. The first version kept a story's answer
 * only if it PASSED, so a row that failed everywhere kept whichever story was probed
 * first — and `combobox / disabled fill` was therefore reported as ELEMENT NOT FOUND
 * against Playground, which has no disabled control, while the Disabled story had found
 * the element and disagreed about its colour. The report named the wrong reason, which is
 * worse than reporting nothing.
 *
 * Passed beats found; found beats missing. A row that no story can locate still reads as
 * ELEMENT NOT FOUND, and one that every story locates and none matches reports the
 * mismatch it actually has.
 */
const rank = (row) => {
  if (row.ok) {
    return 2
  }
  return row.rendered === 'ELEMENT NOT FOUND' ? 0 : 1
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { height: 900, width: 1280 } })

const results = {}

for (const mode of MODES) {
  /** A row is satisfied by the first story that both finds its element and matches. */
  const best = new Map()
  const attrBest = new Map()

  for (const component of components) {
    // The page rows ride along with the first component: `Page` wraps every story, so any
    // one of them can answer for the document-level roles.
    const rows = PLAN.filter((r) => r.component === component).concat(
      component === components[0] ? PAGE_ROWS : [],
    )
    const attrs = portableAttrs.filter(([c]) => c === component)
    for (const story of storiesFor(component)) {
      await page.goto(`${STORYBOOK}/iframe.html?id=${story.id}&viewMode=story`, {
        waitUntil: 'networkidle',
      })
      await page.evaluate(
        ({ density, theme }) => {
          const el = document.documentElement
          if (theme) {
            el.dataset.theme = theme
          } else {
            delete el.dataset.theme
          }
          if (density) {
            el.dataset.density = density
          } else {
            delete el.dataset.density
          }
        },
        { density: mode.density, theme: mode.theme },
      )
      // The mode change re-resolves custom properties; give the frame one paint.
      await page.waitForTimeout(120)

      const seen = await page.evaluate(probeBody, { attributes: attrs, plan: rows })
      for (const row of seen.rows) {
        const key = `${row.component}|${row.word}`
        if (!best.has(key) || rank(row) > rank(best.get(key))) {
          best.set(key, { ...row, story: story.id })
        }
      }
      for (const row of seen.attrs) {
        const key = `${row.component}|${row.word}`
        if (!attrBest.has(key) || rank(row) > rank(attrBest.get(key))) {
          attrBest.set(key, { ...row, story: story.id })
        }
      }
    }
  }

  results[mode.label] = { attrs: [...attrBest.values()], rows: [...best.values()] }
}

await browser.close()

const lines = [
  `Storybook style-contract proof — ${new Date().toISOString()} at ${STORYBOOK}, 1280px.`,
  `${portable.length} of ${CHECKS.length} rows are portable; ${skipped.length} name the gallery's own structure and stay there:`,
  ...skipped.map(([component, word, selector]) => `    ${component} / ${word} — ${selector}`),
  '',
]

if (unreachable.length > 0) {
  lines.push(`COMPONENTS WITH ROWS BUT NO STORY: ${unreachable.join(', ')}`, '')
}

let failed = 0
for (const [label, { attrs, rows }] of Object.entries(results)) {
  const bad = [...rows, ...attrs].filter((r) => !r.ok)
  failed += bad.length
  lines.push(`${label}: ${bad.length} mismatches over ${rows.length + attrs.length} checks`)
  for (const r of bad) {
    lines.push(
      `    ${r.component} / ${r.word} [${r.prop}] — rendered ${r.rendered}, expected ${r.expected ?? '(attribute)'}${r.symbol ? ` via ${r.symbol}` : ''} (${r.story ?? 'no story'})`,
    )
  }
}

const report = lines.join('\n')
writeFileSync(join(OUT, 'storybook-proof.txt'), `${report}\n`, 'utf8')
console.log(report)
console.log(`\nreport: ${join(OUT, 'storybook-proof.txt')}`)

if (failed > 0 || unreachable.length > 0) {
  process.exitCode = 1
}
