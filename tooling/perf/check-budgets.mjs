#!/usr/bin/env node
/**
 * Enforce `.architecture/performance-budgets.json` against a real build.
 *
 * Section 22 requires that EVERY route in the budget file carries a numeric
 * threshold. The interesting half of that obligation is the half about routes
 * that are not in the file at all: a budget which only checks the routes
 * someone remembered to list is a budget a new route escapes by existing. So
 * the gate asserts SET EQUALITY between what was built and what is budgeted,
 * in both directions, and an unbudgeted route is a failure rather than a
 * silently unmeasured one.
 *
 * `status` records provenance and is checked for honesty, not decoration:
 *
 *   inherited   must equal the default exactly. Raising a route's ceiling while
 *               leaving it labelled `inherited` is how an exception hides, so
 *               the mismatch is itself a failure -- change the status too.
 *   explicit    ratified its own ceiling. `reason` is mandatory.
 *   exempt      not gated at all. `reason` is mandatory, and this is the only
 *               status that skips the comparison.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { measureAssets } from './css-asset-size.mjs'
import { measureRoutes } from './route-bundle-size.mjs'

const ROOT = join(import.meta.dirname, '../..')
const BUDGETS = join(ROOT, '.architecture/performance-budgets.json')

const STATUSES = ['inherited', 'explicit', 'exempt']

/**
 * WHAT IS BEING BUDGETED, as data rather than as a second copy of the gate.
 *
 * Law 31 permits generalising a platform abstraction once a SECOND real use
 * case proves it, and stylesheet bytes are that second case. Everything the
 * gate actually decides -- set equality in both directions, a numeric
 * threshold, honest provenance, a reason where one is owed -- is identical for
 * a route and for a stylesheet. Only the nouns differ, so only the nouns are
 * parameterised. Forking a second evaluator would have duplicated the policy
 * and left two authorities on what a budget entry must look like.
 *
 * The route wording is reproduced EXACTLY, because those messages are asserted
 * by the tests that prove this gate rejects things.
 */
export const ROUTE_BUDGETS = {
  absent: 'not built',
  collection: 'routes',
  key: 'route',
  metric: 'initialClientJsGzipBytes',
  present: 'built',
  thresholdless: 'section 22 requires one on every route',
  unbudgeted: 'section 22 requires every route to carry a numeric threshold',
}

export const ASSET_BUDGETS = {
  absent: 'not present',
  collection: 'assets',
  key: 'asset',
  metric: 'cssDeclarationsGzipBytes',
  present: 'present',
  thresholdless: 'a budget entry carrying no number gates nothing',
  unbudgeted: 'a stylesheet nobody budgeted is growth nothing is watching',
}

/**
 * Compare a set of measurements against a budget configuration.
 *
 * Pure, and separate from reading either off disk, so the gate can be tested
 * against a violation it is supposed to catch. A governance tool that has never
 * rejected anything is not known to work -- ADR-024 records the tool this
 * repository adopted, ran, and only later discovered had inspected nothing.
 *
 * Returns every problem found rather than the first, because a contributor who
 * has to rebuild once per violation stops reading the output.
 */
export function evaluateBudgets(config, measured, kind = ROUTE_BUDGETS) {
  const { collection, key, metric } = kind
  const fallback = config.defaults?.[metric]
  if (typeof fallback !== 'number') {
    throw new Error(`budget config has no numeric defaults.${metric}`)
  }

  const budgeted = config[collection] ?? {}
  const problems = []
  const checked = []

  for (const subject of Object.keys(budgeted).sort()) {
    if (!measured.some((m) => m[key] === subject)) {
      problems.push(
        `${subject}: budgeted but ${kind.absent} -- a stale entry silently stops gating anything`,
      )
    }
  }

  for (const measurement of measured) {
    const subject = measurement[key]
    const actual = measurement[metric]
    const entry = budgeted[subject]

    if (!entry) {
      problems.push(
        `${subject}: ${kind.present} but has no budget entry (measured ${actual} B) -- ` +
          kind.unbudgeted,
      )
      continue
    }

    const { status } = entry
    if (!STATUSES.includes(status)) {
      problems.push(
        `${subject}: status ${JSON.stringify(status)} is not one of ${STATUSES.join(', ')}`,
      )
      continue
    }

    const threshold = entry[metric]
    if (typeof threshold !== 'number') {
      problems.push(`${subject}: no numeric ${metric} -- ${kind.thresholdless}`)
      continue
    }

    if (status !== 'inherited' && !entry.reason?.trim()) {
      problems.push(`${subject}: status ${status} requires a recorded reason`)
      continue
    }

    if (status === 'inherited' && threshold !== fallback) {
      problems.push(
        `${subject}: labelled inherited but its threshold is ${threshold}, not the default ` +
          `${fallback} -- an exception must say that it is one, so mark it explicit with a reason`,
      )
      continue
    }

    if (status === 'exempt') {
      checked.push({ actual, [key]: subject, status, threshold: null })
      continue
    }

    if (actual > threshold) {
      problems.push(
        `${subject}: ${actual} B exceeds its ${threshold} B budget by ${actual - threshold} B`,
      )
    }
    checked.push({ actual, [key]: subject, status, threshold })
  }

  return { checked, problems }
}

function readConfig() {
  if (!existsSync(BUDGETS)) {
    throw new Error(`no budget file at ${BUDGETS}`)
  }
  return JSON.parse(readFileSync(BUDGETS, 'utf8'))
}

/** Read the budget file and measure the current build. */
export function checkBudgets() {
  return evaluateBudgets(readConfig(), measureRoutes())
}

/**
 * The same gate over the authored stylesheets, which need no build.
 *
 * That is why this is a separate entry point rather than another metric on the
 * route pass: the subjects are readable from the checkout, so the stage can be
 * an AUTHORSHIP one and catch growth in the twenty-second loop instead of
 * behind a production build. The measured pain was that P2 grew the stylesheet
 * with nothing watching.
 *
 * The asset list comes from the config, so a stylesheet is gated by being
 * budgeted -- and `evaluateBudgets` refuses in both directions, so a file that
 * is budgeted but gone, or measured but unbudgeted, is a failure either way.
 */
export function checkAssetBudgets() {
  const config = readConfig()
  const paths = Object.keys(config[ASSET_BUDGETS.collection] ?? {})
  return evaluateBudgets(config, measureAssets(paths), ASSET_BUDGETS)
}

/** A one-line summary of headroom, which is the number worth watching. */
export function summarise(checked, kind = ROUTE_BUDGETS) {
  const gated = checked.filter((c) => c.threshold !== null)
  if (gated.length === 0) {
    return `no gated ${kind.collection}`
  }
  const tightest = gated.reduce((a, b) =>
    a.threshold - a.actual <= b.threshold - b.actual ? a : b,
  )
  const headroom = tightest.threshold - tightest.actual
  return (
    `${gated.length} ${kind.collection} within budget, tightest ` +
    `${tightest[kind.key]} with ${headroom} B spare`
  )
}

function report() {
  const { checked, problems } = checkBudgets()
  const width = Math.max(...checked.map((c) => c.route.length))

  for (const c of checked) {
    const limit = c.threshold === null ? 'exempt' : `${c.threshold} B`
    const spare = c.threshold === null ? '' : `  ${c.threshold - c.actual} B spare`
    process.stdout.write(
      `  ${c.route.padEnd(width)}  ${String(c.actual).padStart(7)} B / ${limit}${spare}\n`,
    )
  }

  if (problems.length > 0) {
    process.stdout.write(`\n${problems.length} problem(s):\n`)
    for (const p of problems) {
      process.stdout.write(`  - ${p}\n`)
    }
    process.exitCode = 1
    return
  }
  process.stdout.write(`\n${summarise(checked)}\n`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  report()
}
