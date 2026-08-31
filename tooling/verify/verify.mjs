#!/usr/bin/env node
/**
 * pnpm verify -- the canonical definition of repository green.
 *
 *   pnpm verify            run every stage in order
 *   pnpm verify:list       show the stage list
 *   pnpm verify:coverage   map CLAUDE.md laws to the stages that enforce them
 *
 * Exit code is 0 unless a stage FAILS. PENDING and EMPTY do not fail the build
 * -- they are reported loudly instead, because the whole point is that nobody
 * can mistake "not checked yet" for "checked and fine".
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { EMPTY, FAIL, PASS, PENDING, ROOT } from './lib/util.mjs'
import { reviewOnly, stages } from './stages.mjs'

const ESC = String.fromCharCode(27)
const C = {
  reset: `${ESC}[0m`,
  dim: `${ESC}[2m`,
  red: `${ESC}[31m`,
  green: `${ESC}[32m`,
  yellow: `${ESC}[33m`,
  blue: `${ESC}[36m`,
  bold: `${ESC}[1m`,
}
const tty = process.stdout.isTTY
const paint = (c, s) => (tty ? c + s + C.reset : s)

const COLOUR = { [PASS]: C.green, [FAIL]: C.red, [EMPTY]: C.dim, [PENDING]: C.yellow }

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
    console.log(`  ${String(i + 1).padStart(2)}. ${s.title.padEnd(26)}${paint(C.dim, laws)}`)
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
      if (!byLaw.has(l)) byLaw.set(l, [])
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
      staged++
    } else if (reviewOnly[n]) {
      label = paint(C.blue, 'review / phase gate')
    } else {
      label = paint(C.yellow, 'UNACCOUNTED')
      unaccounted.push(n)
    }
    console.log(`  ${String(n).padStart(2)}. ${text.slice(0, 58).padEnd(60)}${label}`)
  }

  console.log(
    '\n  ' +
      paint(C.green, `${staged} enforced by a stage`) +
      '   ' +
      paint(C.blue, `${Object.keys(reviewOnly).length} review or phase gate`) +
      '   ' +
      paint(unaccounted.length ? C.yellow : C.green, `${unaccounted.length} unaccounted`) +
      paint(C.dim, `   of ${laws.size} laws`),
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

function main() {
  if (process.argv.includes('--list')) return list()
  if (process.argv.includes('--coverage')) return coverage()

  console.log(paint(C.bold, '\npnpm verify\n'))
  const results = []
  let failed = false

  for (const stage of stages) {
    let r
    try {
      r = stage.run()
    } catch (err) {
      r = { status: FAIL, detail: `stage threw: ${err?.message}` }
    }
    results.push({ stage, ...r })
    const c = COLOUR[r.status] || C.reset
    console.log(
      '  ' +
        paint(c, r.status.padEnd(8)) +
        ' ' +
        stage.title.padEnd(26) +
        paint(C.dim, r.detail.split('\n')[0]),
    )
    if (r.status === FAIL) {
      failed = true
      const rest = r.detail.split('\n').slice(1)
      if (rest.length) console.log(rest.map((l) => `           ${l}`).join('\n'))
      break // fail fast: a red build is a stop, not a discussion
    }
  }

  const n = (s) => results.filter((r) => r.status === s).length
  const enforcing = n(PASS)
  console.log(
    '\n  ' +
      paint(C.green, `${n(PASS)} pass`) +
      '  ' +
      paint(C.dim, `${n(EMPTY)} empty`) +
      '  ' +
      paint(C.yellow, `${n(PENDING)} pending`) +
      '  ' +
      paint(C.red, `${n(FAIL)} fail`) +
      paint(C.dim, `   of ${stages.length} stages`),
  )

  if (failed) {
    console.log(paint(C.red, '\n  NOT GREEN\n'))
    process.exit(1)
  }

  if (enforcing === 0) {
    console.log(
      paint(C.yellow, '\n  GREEN, but nothing is actually enforced yet.') +
        paint(
          C.dim,
          '\n  Every stage is empty or pending. Expected on an empty repository;\n' +
            '  a defect at any point after the spine phase.\n',
        ),
    )
  } else {
    console.log(paint(C.green, '\n  GREEN\n'))
  }
  process.exit(0)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main()
