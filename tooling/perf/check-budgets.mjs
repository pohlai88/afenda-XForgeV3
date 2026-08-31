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
import { measureRoutes } from './route-bundle-size.mjs'

const ROOT = join(import.meta.dirname, '../..')
const BUDGETS = join(ROOT, '.architecture/performance-budgets.json')

const METRIC = 'initialClientJsGzipBytes'
const STATUSES = ['inherited', 'explicit', 'exempt']

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
export function evaluateBudgets(config, measured) {
  const fallback = config.defaults?.[METRIC]
  if (typeof fallback !== 'number') {
    throw new Error(`budget config has no numeric defaults.${METRIC}`)
  }

  const budgeted = config.routes ?? {}
  const problems = []
  const checked = []

  for (const route of Object.keys(budgeted).sort()) {
    if (!measured.some((m) => m.route === route)) {
      problems.push(
        `${route}: budgeted but not built -- a stale entry silently stops gating anything`,
      )
    }
  }

  for (const { route, [METRIC]: actual } of measured) {
    const entry = budgeted[route]

    if (!entry) {
      problems.push(
        `${route}: built but has no budget entry (measured ${actual} B) -- ` +
          'section 22 requires every route to carry a numeric threshold',
      )
      continue
    }

    const { status } = entry
    if (!STATUSES.includes(status)) {
      problems.push(
        `${route}: status ${JSON.stringify(status)} is not one of ${STATUSES.join(', ')}`,
      )
      continue
    }

    const threshold = entry[METRIC]
    if (typeof threshold !== 'number') {
      problems.push(`${route}: no numeric ${METRIC} -- section 22 requires one on every route`)
      continue
    }

    if (status !== 'inherited' && !entry.reason?.trim()) {
      problems.push(`${route}: status ${status} requires a recorded reason`)
      continue
    }

    if (status === 'inherited' && threshold !== fallback) {
      problems.push(
        `${route}: labelled inherited but its threshold is ${threshold}, not the default ` +
          `${fallback} -- an exception must say that it is one, so mark it explicit with a reason`,
      )
      continue
    }

    if (status === 'exempt') {
      checked.push({ actual, route, status, threshold: null })
      continue
    }

    if (actual > threshold) {
      problems.push(
        `${route}: ${actual} B exceeds its ${threshold} B budget by ${actual - threshold} B`,
      )
    }
    checked.push({ actual, route, status, threshold })
  }

  return { checked, problems }
}

/** Read the budget file and measure the current build. */
export function checkBudgets() {
  if (!existsSync(BUDGETS)) {
    throw new Error(`no budget file at ${BUDGETS}`)
  }
  return evaluateBudgets(JSON.parse(readFileSync(BUDGETS, 'utf8')), measureRoutes())
}

/** A one-line summary of headroom, which is the number worth watching. */
export function summarise(checked) {
  const gated = checked.filter((c) => c.threshold !== null)
  if (gated.length === 0) {
    return 'no gated routes'
  }
  const tightest = gated.reduce((a, b) =>
    a.threshold - a.actual <= b.threshold - b.actual ? a : b,
  )
  const headroom = tightest.threshold - tightest.actual
  return `${gated.length} routes within budget, tightest ${tightest.route} with ${headroom} B spare`
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
