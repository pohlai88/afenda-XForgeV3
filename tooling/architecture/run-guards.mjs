#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { posix, read, sourceFiles } from '../verify/lib/util.mjs'
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

const C = {
  bold: '[1m',
  dim: '[2m',
  green: '[32m',
  red: '[31m',
  reset: '[0m',
  yellow: '[33m',
}
const paint = (c, s) => (process.stdout.isTTY ? c + s + C.reset : s)

export function scanWorkspace() {
  const files = sourceFiles().map(posix)
  const violations = []
  let checked = 0
  for (const g of guards) {
    const applicable = files.filter((f) => g.applies(f))
    checked += applicable.length
    for (const f of applicable) {
      for (const v of g.check(f, read(f))) {
        violations.push({ guard: g.id, law: g.law, ...v })
      }
    }
  }
  return { checked, files: files.length, violations }
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
    const rejects = g.check(fx.violating.path, fx.violating.source).length > 0
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
      for (const [, x] of extra) {
        if (g.check(x.violating.path, x.violating.source).length === 0) {
          extraOk = false
        }
        if (g.applies(x.clean.path) && g.check(x.clean.path, x.clean.source).length > 0) {
          extraOk = false
        }
      }
      if (extraOk) {
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

  const { files, checked, violations } = scanWorkspace()
  if (violations.length === 0) {
    const note =
      files === 0
        ? paint(C.yellow, 'no source files yet — guards ran against an empty workspace')
        : paint(C.dim, `${checked} file-checks across ${files} files`)
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
