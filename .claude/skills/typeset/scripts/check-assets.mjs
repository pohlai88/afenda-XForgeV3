#!/usr/bin/env node
/**
 * Check that the files in `assets/` still agree with each other.
 *
 * They are meant to be independent — import any subset, in any order — and that
 * promise is exactly what makes them able to disagree. Six files now share
 * facts: `--radius` is declared by one and consumed by another, the grid and the
 * spacing scale both state where the tablet tier starts, and the token JSONs
 * restate values the stylesheets also carry.
 *
 * This exists because that promise had already been broken once and was found by
 * hand: `--radius` was declared as 0.5rem by the theme and 0.25rem by the spacing
 * scale, while the typography stylesheet read it for code blocks. Whichever file
 * loaded last won, so the corner radius of a code block was decided by import
 * order. Nothing failed. The page looked fine.
 *
 *   node .claude/skills/typeset/scripts/check-assets.mjs
 *
 * Exits non-zero on any finding. Run it after editing anything in `assets/`.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ASSETS = join(dirname(dirname(fileURLToPath(import.meta.url))), 'assets')

/**
 * Custom properties a HOST PROJECT is expected to provide, or that carry a
 * fallback and are therefore optional by construction. Anything consumed and not
 * defined must be on this list with a reason, or it is a dangling reference.
 */
const EXTERNAL = {
  '--font-heading': 'the host app font stack; typography falls back to inherit',
  '--font-mono': 'the host app mono stack; typography falls back to a system stack',
  '--layout-min': 'per-instance card-grid knob, carries a 16rem fallback',
}

const css = readdirSync(ASSETS)
  .filter((f) => f.endsWith('.css'))
  .sort()
const json = readdirSync(ASSETS)
  .filter((f) => f.endsWith('.tokens.json'))
  .sort()

if (css.length === 0 || json.length === 0) {
  console.error(`inspected nothing: ${css.length} css and ${json.length} token files in ${ASSETS}`)
  console.error('  A check that found no subjects has not passed.')
  process.exit(2)
}

const findings = []
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ')
const defined = new Map() // name -> [file, ...]
const consumed = new Map() // name -> Set(file)

for (const file of css) {
  const src = strip(readFileSync(join(ASSETS, file), 'utf8'))
  for (const m of src.matchAll(/(^|[;{])\s*(--[a-z0-9-]+)\s*:\s*([^;{}]*)/g)) {
    if (!defined.has(m[2])) {
      defined.set(m[2], [])
    }
    defined.get(m[2]).push({ file, value: m[3].trim() })
  }
  // A var() with a fallback is optional by construction; only bare ones must resolve.
  for (const m of src.matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/g)) {
    if (!consumed.has(m[1])) {
      consumed.set(m[1], new Set())
    }
    consumed.get(m[1]).add(file)
  }
}

/* -- A. one fact, one owner --------------------------------------------------- */
for (const [name, sites] of defined) {
  const files = [...new Set(sites.map((s) => s.file))]
  if (files.length < 2) {
    continue
  }
  const values = [...new Set(sites.map((s) => s.value))]
  findings.push(
    `${name} is declared by ${files.length} files` +
      (values.length > 1 ? ' WITH DIFFERENT VALUES' : ' (same value, still two owners)') +
      `\n      ${sites.map((s) => `${s.file}: ${s.value}`).join('\n      ')}` +
      '\n      Import order decides the winner. Give the fact one owner.',
  )
}

/* -- B. every bare var() resolves --------------------------------------------- */
for (const [name, files] of consumed) {
  if (defined.has(name) || name in EXTERNAL) {
    continue
  }
  findings.push(
    `${name} is read by ${[...files].join(', ')} and declared by nothing.\n` +
      '      CSS drops an undefined custom property silently, so the page renders\n' +
      '      nearly right. Declare it, give it a fallback, or list it in EXTERNAL.',
  )
}

/* -- C. the tablet tier is one number ------------------------------------------ */
const px = (v) => (v.endsWith('rem') ? Number.parseFloat(v) * 16 : Number.parseFloat(v))
const tiers = []
for (const file of css) {
  const src = strip(readFileSync(join(ASSETS, file), 'utf8'))
  for (const m of src.matchAll(/@media\s*\(\s*width\s*>=\s*([\d.]+(?:px|rem))\s*\)/g)) {
    tiers.push({ file, px: px(m[1]), raw: m[1] })
  }
}
const byPx = new Map()
for (const t of tiers) {
  byPx.set(t.px, [...(byPx.get(t.px) ?? []), t])
}
const tabletish = tiers.filter((t) => t.px >= 700 && t.px < 900)
if (new Set(tabletish.map((t) => t.px)).size > 1) {
  findings.push(
    `the tablet breakpoint disagrees across files:\n      ${tabletish
      .map((t) => `${t.file}: ${t.raw} (${t.px}px)`)
      .join('\n      ')}`,
  )
}

/* -- D. token files are clean and parse ---------------------------------------- */
let tokenCount = 0
for (const file of json) {
  let parsed
  const raw = readFileSync(join(ASSETS, file), 'utf8')
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    findings.push(`${file} is not valid JSON: ${error.message}`)
    continue
  }
  if (/"[^"]*figma[^"]*"\s*:/.test(raw)) {
    findings.push(`${file} still carries a com.figma.* key`)
  }
  const walk = (o) => {
    for (const [k, v] of Object.entries(o)) {
      if (k.startsWith('$')) {
        continue
      }
      if (v && typeof v === 'object' && '$value' in v) {
        tokenCount += 1
      } else if (v && typeof v === 'object') {
        walk(v)
      }
    }
  }
  walk(parsed)
}

/* -- report -------------------------------------------------------------------- */
console.log(
  `inspected ${css.length} stylesheet(s) and ${json.length} token file(s): ` +
    `${defined.size} custom properties declared, ${consumed.size} read, ${tokenCount} tokens\n`,
)

if (findings.length === 0) {
  console.log('assets agree.')
  process.exit(0)
}

for (const f of findings) {
  console.error(`  ${f}\n`)
}
console.error(`${findings.length} finding(s).`)
process.exit(1)
