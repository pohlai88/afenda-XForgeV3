#!/usr/bin/env node
/**
 * Measure the authored stylesheets, so their growth is visible.
 *
 * WHY THIS EXISTS. `route-bundle-size.mjs` measures `initialClientJsGzipBytes`
 * and nothing else, so CSS growth was unbudgeted BY CONSTRUCTION -- not
 * overlooked, but outside the only metric the gate had. The token wave that
 * added typography, disabled and motion roles is the first to grow these files
 * materially, which is the measured pain law 30 asks for before infrastructure.
 *
 * WHAT IS MEASURED, AND WHAT IS NOT. This is a growth tripwire on the AUTHORED
 * artefacts. It is not shipped transfer size, and it must not be read as one:
 * nothing in this repository measures shipped CSS today, and saying so plainly
 * is worth more than a number that implies coverage it does not have.
 *
 * COMMENTS ARE STRIPPED BEFORE MEASURING, and this is the load-bearing decision
 * rather than a tidying step. Comments are 44% of `ui.css` raw: it gzips to
 * 4770 B whole and 1570 B as declarations. Gating the file would have spent two
 * thirds of the budget on prose -- in a repository whose every convention asks
 * for long explanatory comments, and whose CLAUDE.md warns specifically about a
 * rule followed past the reason for it. A budget that taxes documentation is one
 * people would rightly route around. Minification strips them from what ships in
 * any case, so measuring declarations is also the closer proxy.
 *
 * KNOWN LIMIT: comments are removed by pattern, so a `/*` inside a string
 * literal would confuse it. There is none in either file today, and a CSS
 * tokenizer for a tripwire would be infrastructure without a named pain.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const ROOT = join(import.meta.dirname, '../..')

/**
 * Gzipped bytes of a stylesheet's declarations, comments removed.
 *
 * Pure and exported so the measurement can be tested directly. Level 9 matches
 * the route metric, for the same reason: a stable proxy beats a moving one.
 */
export function declarationGzipBytes(css) {
  const declarations = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
  return gzipSync(Buffer.from(declarations, 'utf8'), { level: 9 }).length
}

/** Measure every stylesheet named in the budget file's `assets` section. */
export function measureAssets(assetPaths) {
  return assetPaths.map((asset) => ({
    asset,
    cssDeclarationsGzipBytes: declarationGzipBytes(readFileSync(join(ROOT, asset), 'utf8')),
  }))
}
