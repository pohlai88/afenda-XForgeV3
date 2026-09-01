#!/usr/bin/env node
/**
 * pnpm verify -- the canonical definition of repository green.
 *
 *   pnpm verify            run every stage in order (local: BLOCKED tolerated)
 *   pnpm verify:ci         BLOCKED is a failure. CI must use this.
 *   pnpm verify:list       show the stage list
 *   pnpm verify:coverage   map CLAUDE.md laws to the stages that enforce them
 *
 * THREE OUTCOMES, and the middle one is the point:
 *
 *   FULL GREEN     every stage whose phase has started passed
 *   PARTIAL GREEN  nothing failed, but a stage that should have run could not
 *   RED            an enforcing stage failed, or CI hit a blocked stage
 *
 * A check that did not run is not a check that passed. Without the middle
 * category, "verify was green" eventually comes to mean "the database tests
 * never ran" -- which is how a verification spine quietly becomes decoration.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  BLOCKED,
  CURRENT_PHASE,
  EMPTY,
  FAIL,
  IS_CI,
  PASS,
  PENDING,
  ROOT,
  settleStatus,
} from './lib/util.mjs'
import { reviewOnly, stages } from './stages.mjs'

const ESC = String.fromCharCode(27)
const C = {
  blue: `${ESC}[36m`,
  bold: `${ESC}[1m`,
  dim: `${ESC}[2m`,
  green: `${ESC}[32m`,
  red: `${ESC}[31m`,
  reset: `${ESC}[0m`,
  yellow: `${ESC}[33m`,
}
const tty = process.stdout.isTTY
const paint = (c, s) => (tty ? c + s + C.reset : s)

/**
 * Wide enough for the longest stage title, DERIVED rather than guessed.
 *
 * It was 26, written when the longest title was shorter than that, and the
 * first stage added afterwards printed its title and its detail with no space
 * between them. A constant that has to be revisited every time the list grows
 * is a second place the stage list is described.
 */
const TITLE_WIDTH = Math.max(...stages.map((s) => s.title.length)) + 1

const COLOUR = {
  [PASS]: C.green,
  [FAIL]: C.red,
  [EMPTY]: C.dim,
  [PENDING]: C.blue,
  [BLOCKED]: C.yellow,
}

/** Parse the numbered laws out of CLAUDE.md so coverage is derived, not duplicated. */
function readLaws() {
  const src = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8')
  const laws = new Map()
  const re = /^(\d{1,2})\.\s+(.+?)(?=\n\d{1,2}\.\s|\n\nCanonical|\n*$)/gms
  let m
  while ((m = re.exec(src)) !== null) {
    laws.set(Number(m[1]), m[2].replace(/\s+/g, ' ').trim())
  }
  return laws
}

function list() {
  console.log(paint(C.bold, '\npnpm verify -- stage order\n'))
  stages.forEach((s, i) => {
    const laws = s.enforces.length ? `laws ${s.enforces.join(', ')}` : 'no law directly'
    console.log(
      `  ${String(i + 1).padStart(2)}. ${s.title.padEnd(TITLE_WIDTH)}${paint(C.dim, `${s.phase.padEnd(9)} ${laws}`)}`,
    )
  })
  console.log(
    paint(C.dim, '\n  Any rule not represented as a stage here is unenforced by construction.\n'),
  )
}

function coverage() {
  const laws = readLaws()
  const byLaw = new Map()
  for (const s of stages) {
    for (const l of s.enforces) {
      if (!byLaw.has(l)) {
        byLaw.set(l, [])
      }
      byLaw.get(l).push(s.id)
    }
  }

  console.log(paint(C.bold, '\nLaw coverage -- what enforces each CLAUDE.md law\n'))
  const unaccounted = []
  let staged = 0
  for (const [n, text] of [...laws.entries()].sort((a, b) => a[0] - b[0])) {
    const st = byLaw.get(n)
    let label
    if (st) {
      label = paint(C.green, st.join(', '))
      staged += 1
    } else if (reviewOnly[n]) {
      label = paint(C.blue, 'review / phase gate')
    } else {
      label = paint(C.yellow, 'UNACCOUNTED')
      unaccounted.push(n)
    }
    console.log(`  ${String(n).padStart(2)}. ${text.slice(0, 58).padEnd(60)}${label}`)
  }

  console.log(
    `\n  ${paint(C.green, `${staged} enforced by a stage`)}   ${paint(
      C.blue,
      `${Object.keys(reviewOnly).length} review or phase gate`,
    )}   ${paint(
      unaccounted.length ? C.yellow : C.green,
      `${unaccounted.length} unaccounted`,
    )}${paint(C.dim, `   of ${laws.size} laws`)}`,
  )

  if (unaccounted.length) {
    console.log(
      paint(C.yellow, `\n  UNACCOUNTED: laws ${unaccounted.join(', ')}`) +
        paint(
          C.dim,
          '\n  Neither enforced by a stage nor deliberately accepted. Add a stage, or add a\n' +
            '  reviewOnly entry with a reason -- an unlisted law is enforced by nothing.\n',
        ),
    )
    return
  }

  console.log(
    paint(C.dim, '\n  Every law is enforced by a stage or deliberately accepted, with a reason:\n'),
  )
  for (const [n, why] of Object.entries(reviewOnly)) {
    console.log(paint(C.dim, `    law ${String(n).padStart(2)}  ${why}`))
  }
  console.log('')
}

/**
 * The gate's verdict, as a pure function of the tallies.
 *
 * Extracted because it WAS statement ordering, and the ordering was wrong: the
 * zero-pass branch sat above the CI blocked-is-failure rule and exited 0
 * unconditionally, so a `--ci` run in which every stage was empty, pending or
 * blocked reported success. That is the sentence this module's own header
 * forbids -- "verify was green" coming to mean "the database tests never ran".
 *
 * The invariant is deliberately stronger than the bug that prompted it.
 * Reordering two branches would have fixed the blocked case and left this one:
 *
 *   0 pass · 0 blocked · 10 empty · 4 pending · --ci   ->  success
 *
 * so the rule is stated positively instead. **A CI verification with zero PASS
 * stages is never successful**, whatever the other tallies say. Locally the
 * same state is legitimate on an empty repository and keeps its message.
 *
 * `pending` and `empty` are not parameters. They do not decide anything here,
 * and taking them would invite a reader to believe they might.
 *
 * @param {{ blocked: number, ci: boolean, fail: number, pass: number }} tally
 * @returns {{ exit: number, kind: string }}
 */
/**
 * A stage duration, fixed width so the column cannot float.
 *
 * Deliberately not appended to `r.detail`, which is variable-length: the number
 * has to line up to be read down, and a number nobody reads is not a
 * measurement.
 */
export function formatDuration(ms) {
  return `${(ms / 1000).toFixed(2)}s`.padStart(7)
}

/**
 * The slowest three, and the two totals that differ.
 *
 * They differ because `stages.mjs` runs `treeState()` at module scope on
 * import, so wall time includes work no stage is charged for. Printing both
 * makes that gap visible rather than leaving it to be inferred from a
 * discrepancy nobody can name.
 *
 * A FAILING stage carries a duration like any other -- the time is taken before
 * the fail-fast branch, because a stage that fails after 40s is the most
 * interesting number in the run.
 */
export function summariseTimings(results) {
  const timed = results.filter((r) => typeof r.ms === 'number')
  return {
    slowest: [...timed].sort((a, b) => b.ms - a.ms).slice(0, 3),
    total: timed.reduce((n, r) => n + r.ms, 0),
  }
}

export function decideGateOutcome({ blocked, ci, fail, pass }) {
  if (fail > 0) {
    return { exit: 1, kind: 'failed' }
  }
  if (pass === 0) {
    return ci ? { exit: 1, kind: 'nothing-enforced-ci' } : { exit: 0, kind: 'nothing-enforced' }
  }
  if (blocked > 0) {
    return ci ? { exit: 1, kind: 'blocked-ci' } : { exit: 0, kind: 'blocked' }
  }
  return { exit: 0, kind: 'green' }
}

function main() {
  if (process.argv.includes('--list')) {
    return list()
  }
  if (process.argv.includes('--coverage')) {
    return coverage()
  }

  const ci = IS_CI
  const fast = process.argv.includes('--fast')
  if (fast && ci) {
    console.log(paint(C.red, 'refusing --fast --ci: the CI gate is not a subset'))
    process.exit(1)
  }
  const selected = fast ? stages.filter((s) => s.authorship) : stages
  const omitted = fast ? stages.filter((s) => !s.authorship) : []

  console.log(paint(C.bold, `\npnpm verify${fast ? ' --fast' : ''}${ci ? ' --ci' : ''}\n`))
  const results = []
  let failed = false

  for (const stage of selected) {
    let r
    const started = performance.now()
    try {
      r = stage.run()
    } catch (err) {
      // A thrown value is not necessarily an Error: a stage can reject with
      // anything, and `err.message` on a string would be undefined rather than
      // a failure anyone can read.
      const reason = err instanceof Error ? err.message : String(err)
      r = { detail: `stage threw: ${reason}`, status: FAIL }
    }

    // Before `settleStatus` and before the fail-fast branch, so every stage is
    // charged for its own time whatever verdict it reaches.
    const ms = performance.now() - started
    r = settleStatus(stage, r)

    results.push({ ms, stage, ...r })
    const c = COLOUR[r.status] || C.reset
    console.log(
      `  ${paint(c, r.status.padEnd(8))}${paint(C.dim, formatDuration(ms))}  ${stage.title.padEnd(TITLE_WIDTH)}${paint(C.dim, r.detail.split('\n')[0])}`,
    )
    if (r.status === FAIL) {
      failed = true
      const rest = r.detail.split('\n').slice(1)
      if (rest.length) {
        console.log(rest.map((l) => `           ${l}`).join('\n'))
      }
      break // fail fast: a red build is a stop, not a discussion
    }
  }

  const n = (st) => results.filter((r) => r.status === st).length
  const blocked = results.filter((r) => r.status === BLOCKED)

  console.log(
    `\n  ${paint(C.green, `${n(PASS)} pass`)}  ${paint(C.dim, `${n(EMPTY)} empty`)}  ${paint(
      C.blue,
      `${n(PENDING)} pending`,
    )}  ${paint(C.yellow, `${n(BLOCKED)} blocked`)}  ${paint(C.red, `${n(FAIL)} fail`)}${paint(
      C.dim,
      `   of ${stages.length} stages, phase: ${CURRENT_PHASE}`,
    )}`,
  )

  const timings = summariseTimings(results)
  if (timings.slowest.length > 0) {
    const slowest = timings.slowest
      .map((r) => `${r.stage.title} ${formatDuration(r.ms).trim()}`)
      .join(' · ')
    console.log(paint(C.dim, `  slowest: ${slowest}`))
    console.log(
      paint(
        C.dim,
        `  ${formatDuration(timings.total).trim()} in stages, ` +
          `${formatDuration(process.uptime() * 1000).trim()} wall`,
      ),
    )
  }

  const outcome = decideGateOutcome({
    blocked: blocked.length,
    ci,
    fail: failed ? 1 : 0,
    pass: n(PASS),
  })

  if (outcome.kind === 'failed') {
    console.log(paint(C.red, '\n  RED -- an enforcing stage failed\n'))
  } else if (outcome.kind === 'nothing-enforced' || outcome.kind === 'nothing-enforced-ci') {
    console.log(
      paint(C.yellow, '\n  Nothing is actually enforced yet.') +
        paint(
          C.dim,
          '\n  Every stage is empty, pending or blocked. Expected on an empty\n' +
            '  repository; a defect at any point after the spine phase.\n',
        ),
    )
    if (outcome.kind === 'nothing-enforced-ci') {
      console.log(
        paint(C.red, '  RED in CI: a run that enforced nothing is not a pass.') +
          paint(C.dim, '\n  Merge authority requires that something actually ran.\n'),
      )
    }
  } else if (outcome.kind === 'blocked' || outcome.kind === 'blocked-ci') {
    console.log(paint(C.yellow, `\n  PARTIAL GREEN -- ${blocked.length} stage(s) could not run:`))
    for (const b of blocked) {
      console.log(paint(C.yellow, `    ${b.stage.title} -- ${b.detail}`))
    }
    if (outcome.kind === 'blocked-ci') {
      console.log(
        paint(C.red, '\n  RED in CI: a blocked stage is a failure.') +
          paint(
            C.dim,
            '\n  "verify was green" must never come to mean "the database tests never ran".\n',
          ),
      )
    } else {
      console.log(
        paint(
          C.dim,
          '\n  Tolerated locally. `pnpm verify:ci` treats this as failure, and CI must use it.\n',
        ),
      )
    }
  } else {
    console.log(
      fast
        ? paint(C.green, '\n  AUTHORSHIP LOOP GREEN -- and this is not the gate.')
        : paint(C.green, '\n  FULL GREEN -- every stage whose phase has started passed\n'),
    )
  }

  if (omitted.length > 0) {
    console.log(
      paint(C.dim, `  ${omitted.length} stage(s) NOT run: `) +
        paint(C.yellow, omitted.map((s) => s.title).join(', ')),
    )
    console.log(paint(C.dim, '  Run `pnpm verify` before committing.\n'))
  }

  process.exit(outcome.exit)
}

// argv[1] is absent when this module is imported (node -e, a test), so the
// entry check must tolerate it rather than throwing on import.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
