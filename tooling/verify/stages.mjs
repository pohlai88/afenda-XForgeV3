/**
 * THE CANONICAL DEFINITION OF GREEN.
 *
 * architecture-final.md 24.1 composes `pnpm verify` from these stages, in this
 * order, and states the property that makes this file the important one:
 *
 *   "Any rule not represented as a stage here is unenforced by construction."
 *
 * Therefore:
 *   - Adding an architectural rule means adding or extending a stage here.
 *   - A stage that cannot run yet is PENDING and MUST name the phase that
 *     activates it. It is never silently omitted, because an omitted check is
 *     indistinguishable from a passing one -- the exact defect ADR-014 records.
 *   - A stage that ran but had nothing to check reports EMPTY, not PASS. A gate
 *     that passed because the repository is empty has verified nothing, and
 *     saying so is the difference between an honest gate and a decorative one.
 *
 * `enforces` lists the CLAUDE.md law numbers a stage covers. `pnpm
 * verify:coverage` reads the laws from CLAUDE.md and reports any law no stage
 * claims -- which turns the quoted property above from an assertion into a
 * check.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { scanContract } from '../architecture/contract-guards.mjs'
import { mutationTest, scanWorkspace } from '../architecture/run-guards.mjs'
import { EMPTY, FAIL, hasBin, PASS, PENDING, ROOT, run, workspaceHasPackages } from './lib/util.mjs'

/** A stage whose tooling has not arrived yet. */
const pending = (phase, needs) => () => ({
  status: PENDING,
  detail: `activates in the ${phase} phase (needs ${needs})`,
})

const hasGit = () => existsSync(join(ROOT, '.git'))

const _NL = String.fromCharCode(10)

/**
 * Everything produced by `pnpm generate`. Derived state: never hand-edited,
 * and asserted byte-identical after regeneration.
 */
const GENERATED_PATHS = ['contracts/', 'packages/api-client/src/generated/']

export const stages = [
  {
    id: 'generate',
    title: 'generate cleanliness',
    enforces: [27],
    run() {
      if (!existsSync(join(ROOT, 'contracts'))) {
        return {
          status: PENDING,
          detail: 'activates in the spine phase (needs contracts/ and a generator)',
        }
      }
      if (!hasGit())
        return { status: PENDING, detail: 'needs a git repository to diff generated output' }
      const gen = run('pnpm', ['-s', 'generate'])
      if (gen.code !== 0) return { status: FAIL, detail: `pnpm generate failed\n${gen.out}` }
      // Scoped to GENERATED paths only. Diffing the whole tree would fail on
      // any uncommitted hand-written work, making the gate unusable during
      // development -- and an ignored gate is the same as no gate.
      const diff = run('git', ['diff', '--exit-code', '--stat', '--', ...GENERATED_PATHS])
      return diff.code === 0
        ? { status: PASS, detail: 'generated state is clean' }
        : { status: FAIL, detail: `generated state drifted:\n${diff.out}` }
    },
  },

  {
    id: 'guards',
    title: 'architecture guards',
    enforces: [3, 4, 5, 6, 12, 15, 16, 17, 19, 20, 21, 22, 23, 26, 29, 30],
    run() {
      const { files, checked, violations: sourceViolations } = scanWorkspace()

      // Contract rules are checked against the generated OpenAPI document,
      // where $refs are resolved -- not against source text, which cannot see
      // through a named schema reference.
      const contract = scanContract()
      const violations = [
        ...sourceViolations,
        ...contract.violations.map((v) => ({
          ...v,
          file: 'contracts/openapi.generated.json',
          line: 0,
        })),
      ]

      if (violations.length > 0) {
        const detail = violations
          .map((v) => `  ${v.guard} (law ${v.law})  ${v.file}:${v.line}  ${v.message}`)
          .join('\n')
        return { status: FAIL, detail: `${violations.length} violation(s):\n${detail}` }
      }
      const mut = mutationTest()
      const broken = mut.filter((r) => r.status === 'BROKEN')
      if (broken.length > 0) {
        return {
          status: FAIL,
          detail: `guard(s) no longer reject their own violation fixture:\n${broken
            .map((b) => `  ${b.guard}: ${b.detail}`)
            .join('\n')}`,
        }
      }
      const proven = mut.filter((r) => r.status === 'PROVEN').length
      const unproven = mut.filter((r) => r.status === 'UNPROVEN')
      if (unproven.length > 0) {
        return {
          status: FAIL,
          detail:
            'guard(s) without a mutation fixture -- unproven guards are not trusted:' +
            '\n' +
            unproven.map((u) => `  ${u.guard}`).join('\n'),
        }
      }
      if (files === 0) {
        return {
          status: EMPTY,
          detail: `no source files yet; ${proven} guards proven against fixtures`,
        }
      }
      const contractNote = contract.present
        ? `, ${contract.checked} operations`
        : ', no contract yet'
      return {
        status: PASS,
        detail: `${checked} file-checks${contractNote}, ${proven} guards proven`,
      }
    },
  },

  {
    id: 'typecheck',
    title: 'typecheck',
    enforces: [9],
    run() {
      if (!workspaceHasPackages()) return { status: EMPTY, detail: 'no packages to typecheck' }
      if (!hasBin('tsc'))
        return { status: PENDING, detail: 'activates in the spine phase (needs typescript)' }
      const r = run('pnpm', ['-s', 'exec', 'tsc', '--noEmit'])
      return r.code === 0
        ? { status: PASS, detail: 'no type errors' }
        : { status: FAIL, detail: r.out }
    },
  },

  {
    id: 'lint',
    title: 'format / lint',
    enforces: [],
    run() {
      if (!workspaceHasPackages()) return { status: EMPTY, detail: 'no packages to lint' }
      if (!hasBin('biome'))
        return { status: PENDING, detail: 'activates in the spine phase (needs @biomejs/biome)' }
      const r = run('pnpm', ['-s', 'exec', 'biome', 'ci', '.'])
      return r.code === 0 ? { status: PASS, detail: 'clean' } : { status: FAIL, detail: r.out }
    },
  },

  {
    id: 'unit',
    title: 'unit tests',
    enforces: [],
    run() {
      if (!hasBin('vitest'))
        return { status: PENDING, detail: 'activates in the spine phase (needs vitest)' }
      const r = run('pnpm', [
        '-s',
        'exec',
        'vitest',
        'run',
        '--reporter=dot',
        '--exclude',
        '**/*.contract.test.ts',
      ])
      if (r.code !== 0) return { status: FAIL, detail: r.out }
      const m = r.out.match(/Tests\s+(\d+) passed/)
      return { status: PASS, detail: `${m ? m[1] : '?'} tests passed` }
    },
  },

  {
    id: 'property',
    title: 'property tests',
    enforces: [18, 19],
    run: pending('payroll', 'fast-check + the money and ledger invariants'),
  },

  {
    id: 'contract',
    title: 'contract tests',
    enforces: [2, 3, 4],
    run() {
      const spec = join(ROOT, 'contracts/openapi.generated.json')
      if (!existsSync(spec)) {
        return {
          status: PENDING,
          detail: 'activates in the spine phase (needs an OpenAPI document)',
        }
      }

      // The published contract must be a valid OpenAPI 3.1 document with a
      // stable operationId per operation -- the identity the client, the mocks
      // and every partner SDK are keyed to.
      const doc = JSON.parse(readFileSync(spec, 'utf8'))
      if (doc.openapi !== '3.1.0') {
        return { status: FAIL, detail: `spec declares openapi ${doc.openapi}, expected 3.1.0` }
      }
      const verbs = ['get', 'post', 'put', 'patch', 'delete']
      const missing = []
      let ops = 0
      for (const [path, item] of Object.entries(doc.paths ?? {})) {
        for (const v of verbs) {
          if (!item[v]) continue
          ops++
          if (!item[v].operationId) missing.push(`${v.toUpperCase()} ${path}`)
        }
      }
      if (missing.length) {
        return { status: FAIL, detail: `operations without operationId: ${missing.join(', ')}` }
      }

      if (!hasBin('vitest'))
        return { status: PENDING, detail: 'needs vitest for boundary-hardening tests' }
      const r = run('pnpm', ['-s', 'exec', 'vitest', 'run', '--reporter=dot', 'contract.test'])
      if (r.code !== 0) return { status: FAIL, detail: r.out }
      const m = r.out.match(/Tests\s+(\d+) passed/)
      return {
        status: PASS,
        detail: `${ops} operations, ${m ? m[1] : '?'} contract tests passed`,
      }
    },
  },

  {
    id: 'rls',
    title: 'RLS / security proof',
    enforces: [11, 12, 13, 14],
    run() {
      // AQS-005/006/007/022 already run in the integration stage against a real
      // PostgreSQL, as an early down-payment. The GATE is still incomplete, so
      // this reports PENDING rather than PASS -- a stage that reports green on
      // a partial proof is the reassuring-but-useless failure mode.
      return {
        status: PENDING,
        detail:
          'AQS-005/006/007/022 proven in integration; gate completes in the tenancy ' +
          'phase with host/session mismatch (AQS-008) and the withPlatformAccess audit',
      }
    },
  },

  {
    id: 'integration',
    title: 'integration tests',
    enforces: [11, 12],
    run() {
      if (!hasBin('vitest')) return { status: PENDING, detail: 'needs vitest' }
      const r = run('pnpm', ['-s', 'exec', 'vitest', 'run', '--reporter=dot', 'integration.test'])
      if (r.code !== 0) return { status: FAIL, detail: r.out }
      // A suite that skips because the database is unreachable has proven
      // nothing, and must not be reported as a pass.
      if (/skipped/.test(r.out) && !/\d+ passed/.test(r.out)) {
        return { status: PENDING, detail: 'no database reachable -- integration tests skipped' }
      }
      const m = r.out.match(/Tests\s+(\d+) passed/)
      return {
        status: PASS,
        detail: `${m ? m[1] : '?'} integration tests passed against real PostgreSQL`,
      }
    },
  },

  {
    id: 'migration',
    title: 'migration compatibility',
    enforces: [28],
    run() {
      const dir = join(ROOT, 'packages/db/migrations')
      if (!existsSync(dir)) {
        return { status: PENDING, detail: 'activates in the spine phase (needs migrations)' }
      }
      const files = readdirSync(dir)
        .filter((f) => f.endsWith('.sql'))
        .sort()
      if (files.length === 0) return { status: EMPTY, detail: 'no migrations yet' }

      // What this proves: every migration applies cleanly, in order, to a
      // FRESH database. What it does not yet prove is AQS-018 -- the
      // expand/backfill/switch/contract rollout with the previous release's
      // queries green at each intermediate state. That needs a second schema
      // version and lands with the first real schema change; the detail says so
      // rather than letting a weaker check read as the full proof.
      const probe = run('node', [join(ROOT, 'tooling/verify/lib/migrate-check.mjs')])
      if (probe.code === 2) {
        return {
          status: PENDING,
          detail: `${files.length} migrations; no database reachable to apply them`,
        }
      }
      if (probe.code !== 0) return { status: FAIL, detail: probe.out }
      return {
        status: PASS,
        detail:
          files.length +
          ' migrations apply cleanly to a fresh database (AQS-018 rollout proof still pending)',
      }
    },
  },

  {
    id: 'build',
    title: 'build',
    enforces: [],
    run() {
      if (!workspaceHasPackages()) return { status: EMPTY, detail: 'nothing to build' }
      if (!hasBin('turbo'))
        return { status: PENDING, detail: 'activates in the spine phase (needs turbo)' }
      const r = run('pnpm', ['-s', 'exec', 'turbo', 'run', 'build'])
      return r.code === 0 ? { status: PASS, detail: 'built' } : { status: FAIL, detail: r.out }
    },
  },

  {
    id: 'e2e',
    title: 'selected E2E',
    enforces: [],
    run() {
      if (!hasBin('playwright')) {
        return { status: PENDING, detail: 'activates in the spine phase (needs Playwright)' }
      }
      const r = run('pnpm', ['-s', 'exec', 'playwright', 'test'])
      if (r.code !== 0) return { status: FAIL, detail: r.out }
      const m = r.out.match(/(\d+) passed/)
      return { status: PASS, detail: `${m ? m[1] : '?'} flagship E2E specs passed` }
    },
  },
]

/**
 * Laws that no stage can mechanically enforce, with the reason and what carries
 * them instead. This list exists so `verify:coverage` can distinguish
 *
 *     "not enforced yet"        -- a gap, and a deadline
 *     "cannot be enforced"      -- a judgement, accepted deliberately
 *
 * Collapsing those two is how a coverage report becomes reassuring rather than
 * useful. Anything here is carried by review or by a phase gate, never by hope.
 */
export const reviewOnly = {
  1: 'design judgement; the boundary half is enforced by guards, the "until measured evidence" half by ADR',
  7: 'design principle -- no mechanical test for "one authoritative source per fact"',
  8: 'AQS-009 enforces the five plane invariants; activates in the metadata phase',
  10: 'design judgement -- the 80/20 rule is reviewed, not computed',
  24: 'AQS-013 plus the compliance-adapter separation; activates in the compliance phase',
  25: 'AQS-017 adversarial suite; activates in the AI phase',
  31: 'AQS-020 second-domain gate -- a phase gate, not a per-commit check',
  32: 'self-referential: this file is the definition it refers to',
}
