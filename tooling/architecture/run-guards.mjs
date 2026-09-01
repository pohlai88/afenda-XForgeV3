#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { posix, read, trackedFiles } from '../verify/lib/util.mjs'
import { fixtures } from './fixtures/index.mjs'
/**
 * Architecture guard runner.
 *
 *   node tooling/architecture/run-guards.mjs                 scan the workspace
 *   node tooling/architecture/run-guards.mjs --mutation-test prove guards reject violations
 *
 * The mutation test is not optional decoration. Phase 0 does not exit until at
 * least five guards have been observed to fail on a deliberate violation, and
 * a guard with no fixture is reported as UNPROVEN rather than counted as
 * working.
 */
import { guards } from './guards/index.mjs'

// Built from a char code, never written literally. A literal ESC is an
// invisible byte in source -- precisely what `no-control-characters-in-source`
// refuses -- and this file was carrying six of them, unseen because the
// workspace scan offers that guard no file under `tooling/`.
const ESC = String.fromCharCode(27)
const C = {
  bold: `${ESC}[1m`,
  dim: `${ESC}[2m`,
  green: `${ESC}[32m`,
  red: `${ESC}[31m`,
  reset: `${ESC}[0m`,
  yellow: `${ESC}[33m`,
}
const paint = (c, s) => (process.stdout.isTTY ? c + s + C.reset : s)

export function scanWorkspace() {
  const { binary, files: offered, tracked } = trackedFiles()
  const files = offered.map(posix)

  // Conservation. Every tracked file is either offered to the guards or withheld
  // by a DECLARED binary path -- there is no third outcome, and no file may leave
  // the universe by any other means.
  //
  // This is the guard law applied one level up, to the scan rather than to the
  // guards it feeds. The previous content filter dropped a file silently and the
  // only trace was a printed count falling from 211 to 210, which was printed
  // twice and read past both times. A number is evidence; only an assertion is a
  // check.
  if (files.length + binary.length !== tracked) {
    throw new Error(
      `scan universe does not conserve: ${files.length} offered + ${binary.length} declared binary != ${tracked} tracked`,
    )
  }
  const violations = []
  const exemptions = []
  const blind = []
  const dormant = []
  let checked = 0
  for (const g of guards) {
    const claimed = files.filter((f) => g.applies(f))
    const excused = new Set((g.exempt ?? []).map((e) => e.path))
    for (const e of g.exempt ?? []) {
      exemptions.push({ guard: g.id, ...e })
    }
    const applicable = claimed.filter((f) => !excused.has(f))
    checked += applicable.length
    // A guard that governs nothing is the depcruise failure: configured, green,
    // and blind. Dormancy is the honest version of the same zero -- a subject
    // that does not exist YET -- and the difference is that somebody wrote it
    // down. Undeclared, it is red; declared, it is reported every run so it
    // cannot quietly stay dormant after its subject arrives.
    if (claimed.length === 0) {
      ;(g.dormant ? dormant : blind).push({ id: g.id, why: g.dormant })
    }
    for (const f of applicable) {
      for (const v of g.check(f, read(f))) {
        violations.push({ guard: g.id, law: g.law, ...v })
      }
    }
  }
  return {
    binary: binary.length,
    blind,
    checked,
    dormant,
    exemptions,
    files: files.length,
    tracked,
    violations,
  }
}

/**
 * A rejection nobody can act on is barely better than no rejection.
 *
 * The harness proved a guard can FAIL. It said nothing about whether the failure
 * explains itself, and one guard was reported PROVEN while its message read
 * `NaN` -- found by eye, which is exactly the coverage this file exists to
 * replace. Asserting the property of all of them at once costs a few lines and
 * removes the need to have noticed.
 *
 * `NaN` and `undefined` in a message are interpolation failures, not prose: no
 * guard says either word on purpose, and a guard that needs to may say it
 * differently.
 *
 * Compared token-wise rather than with a word-boundary escape, so "nullable"
 * and "undefined behaviour" do not read as failures -- and so this file needs
 * no backslash at all. The first draft of this constant was written with one
 * and arrived on disk without it: the escape-mangling defect, seventh
 * appearance, inside the check written to close the sixth.
 */
const INTERPOLATION_FAILURE = ['NaN', 'null', 'undefined']

const words = (message) => message.split(/[^A-Za-z]+/)

function unusableFinding(findings) {
  for (const f of findings) {
    if (typeof f.message !== 'string' || f.message.trim() === '') {
      return 'rejected, but a finding carries no message'
    }
    const failed = words(f.message).find((w) => INTERPOLATION_FAILURE.includes(w))
    if (failed) {
      return `rejected, but a message interpolated ${failed}: "${f.message}"`
    }
    if (!(Number.isInteger(f.line) && f.line >= 1)) {
      return `rejected, but a finding points at line ${f.line}`
    }
  }
  return null
}

export function mutationTest() {
  const results = []
  for (const g of guards) {
    const fx = fixtures[g.id]
    const extra = Object.entries(fixtures).filter(([k]) => k.startsWith(`${g.id}-`))
    if (!fx) {
      results.push({ detail: 'no mutation fixture', guard: g.id, status: 'UNPROVEN' })
      continue
    }
    const findings = g.check(fx.violating.path, fx.violating.source)
    const rejects = findings.length > 0
    const appliesToViolating = g.applies(fx.violating.path)
    const cleanPasses =
      !g.applies(fx.clean.path) || g.check(fx.clean.path, fx.clean.source).length === 0

    if (!appliesToViolating) {
      results.push({
        detail: 'guard does not apply to its own fixture path',
        guard: g.id,
        status: 'BROKEN',
      })
    } else if (!rejects) {
      results.push({
        detail: 'did NOT reject a deliberate violation',
        guard: g.id,
        status: 'BROKEN',
      })
    } else if (cleanPasses) {
      // Extra fixtures for the same guard: each must also be rejected/accepted.
      let extraOk = true
      const everyFinding = [...findings]
      for (const [, x] of extra) {
        const extraFindings = g.check(x.violating.path, x.violating.source)
        everyFinding.push(...extraFindings)
        if (extraFindings.length === 0) {
          extraOk = false
        }
        if (g.applies(x.clean.path) && g.check(x.clean.path, x.clean.source).length > 0) {
          extraOk = false
        }
      }
      const unusable = extraOk ? unusableFinding(everyFinding) : null
      if (extraOk && unusable) {
        results.push({ detail: unusable, guard: g.id, status: 'BROKEN' })
      } else if (extraOk) {
        results.push({
          detail: `rejects violation, accepts clean${extra.length ? ` (+${extra.length} case)` : ''}`,
          guard: g.id,
          status: 'PROVEN',
        })
      } else {
        results.push({ detail: 'failed an additional fixture', guard: g.id, status: 'BROKEN' })
      }
    } else {
      results.push({ detail: 'false positive on the clean fixture', guard: g.id, status: 'BROKEN' })
    }
  }
  return results
}

function main() {
  const mutation = process.argv.includes('--mutation-test')

  if (mutation) {
    const results = mutationTest()
    const proven = results.filter((r) => r.status === 'PROVEN')
    const broken = results.filter((r) => r.status === 'BROKEN')
    const unproven = results.filter((r) => r.status === 'UNPROVEN')

    console.log(paint(C.bold, '\nGuard mutation test\n'))
    for (const r of results) {
      const STATUS_COLOUR = { BROKEN: C.red, PROVEN: C.green, UNPROVEN: C.yellow }
      const c = STATUS_COLOUR[r.status] ?? C.red
      console.log(
        `  ${paint(c, r.status.padEnd(9))} ${r.guard.padEnd(34)} ${paint(C.dim, r.detail)}`,
      )
    }
    console.log(
      `\n  ${proven.length} proven, ${broken.length} broken, ${unproven.length} unproven` +
        `  ${paint(C.dim, '(Phase 0 exit requires >= 5 proven)')}\n`,
    )
    if (broken.length > 0) {
      process.exit(1)
    }
    process.exit(0)
  }

  const { binary, blind, dormant, files, checked, exemptions, tracked, violations } =
    scanWorkspace()

  // The number that accumulated in silence. 159 files were claimable by a guard
  // and never offered to one, for as long as nothing printed a count.
  for (const e of exemptions) {
    console.log(`  ${paint(C.yellow, 'EXEMPT')} ${e.guard} does not check ${e.path}`)
    console.log(`           ${paint(C.dim, e.why)}`)
    console.log(`           ${paint(C.dim, `checked instead by: ${e.checkedBy}`)}`)
  }
  for (const d of dormant) {
    console.log(`  ${paint(C.yellow, 'DORMANT')} ${d.id} governs no file yet`)
    console.log(`           ${paint(C.dim, d.why)}`)
  }
  if (blind.length > 0) {
    for (const b of blind) {
      console.log(paint(C.red, `  ${b.id} governs no file at all, and does not say why.`))
      console.log(paint(C.dim, '  Either its subject is gone, or a narrowing went too far.'))
      console.log(paint(C.dim, '  Declare `dormant` if the subject has not arrived yet.'))
    }
    process.exit(1)
  }
  if (violations.length === 0) {
    const note =
      files === 0
        ? paint(C.yellow, 'no source files yet — guards ran against an empty workspace')
        : paint(
            C.dim,
            `${checked} file-checks across ${files} files (${tracked} tracked, ${binary} declared binary), ${exemptions.length} exempt`,
          )
    console.log(`  ${paint(C.green, 'PASS')} architecture guards  ${note}`)
    process.exit(0)
  }
  console.log(paint(C.red, `\n  ${violations.length} architecture violation(s):\n`))
  for (const v of violations) {
    console.log(`  ${paint(C.red, v.guard)} ${paint(C.dim, `(law ${v.law})`)}`)
    console.log(`    ${v.file}:${v.line}  ${v.message}\n`)
  }
  process.exit(1)
}

// argv[1] is absent when this module is imported (node -e, a test), so the
// entry check must tolerate it rather than throwing on import.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
