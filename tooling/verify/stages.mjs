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
import { scanConfig } from '../architecture/config-guards.mjs'
import { scanContract } from '../architecture/contract-guards.mjs'
import { mutationTest, scanWorkspace } from '../architecture/run-guards.mjs'
import {
  BLOCKED,
  EMPTY,
  FAIL,
  hasBin,
  PASS,
  PENDING,
  phaseHasStarted,
  ROOT,
  run,
  treeState,
  workspaceHasPackages,
} from './lib/util.mjs'

/**
 * A prerequisite is missing.
 *
 * Which status that deserves depends entirely on whether the stage's phase has
 * started. Before its phase: PENDING, and nothing is wrong. On or after its
 * phase: BLOCKED, because the check should be running and is not -- a fact CI
 * must treat as failure.
 */
const unmet = (stage, needs) =>
  phaseHasStarted(stage.phase)
    ? { status: BLOCKED, detail: `${stage.phase} phase has started but ${needs} is missing` }
    : { status: PENDING, detail: `activates in the ${stage.phase} phase (needs ${needs})` }

const hasGit = () => existsSync(join(ROOT, '.git'))

/**
 * The working tree as it stood BEFORE any stage ran -- this module is imported
 * before the first `run()`. The idempotence stage compares against this, so an
 * uncommitted feature in progress is not mistaken for the gate mutating the
 * repository.
 */
const TREE_AT_START = treeState()

const _NL = String.fromCharCode(10)

/**
 * Everything produced by `pnpm generate`. Derived state: never hand-edited,
 * and asserted byte-identical after regeneration.
 */
const GENERATED_PATHS = ['contracts/', 'packages/api-client/src/generated/']

export const stages = [
  {
    id: 'generate',
    phase: 'spine',
    title: 'generate cleanliness',
    enforces: [27],
    run() {
      if (!existsSync(join(ROOT, 'contracts'))) {
        return {
          status: BLOCKED,
          detail: 'spine phase has started but contracts/ or the generator is missing',
        }
      }
      if (!hasGit()) return unmet(this, 'a git repository to diff generated output')
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
    phase: 'spine',
    title: 'architecture guards',
    enforces: [3, 4, 5, 6, 12, 15, 16, 17, 19, 20, 21, 22, 23, 26, 29, 30],
    run() {
      const { files, checked, violations: sourceViolations } = scanWorkspace()

      // Contract rules are checked against the generated OpenAPI document,
      // where $refs are resolved -- not against source text, which cannot see
      // through a named schema reference.
      const contract = scanContract()

      // Config guards police what the TOOLING is pointed at. Without them the
      // gate itself can become order-dependent, which no amount of source
      // checking would catch.
      const config = scanConfig()

      const violations = [
        ...sourceViolations,
        ...contract.violations.map((v) => ({
          ...v,
          file: 'contracts/openapi.generated.json',
          line: 0,
        })),
        ...config.violations.map((v) => ({ ...v, file: v.where, line: 0 })),
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
      const configNote = `, ${config.checked} config guards`
      return {
        status: PASS,
        detail: `${checked} file-checks${contractNote}${configNote}, ${proven} guards proven`,
      }
    },
  },

  {
    id: 'typecheck',
    phase: 'spine',
    title: 'typecheck',
    enforces: [9],
    run() {
      if (!workspaceHasPackages()) return { status: EMPTY, detail: 'no packages to typecheck' }
      if (!hasBin('tsc')) return unmet(this, 'typescript')
      const r = run('pnpm', ['-s', 'exec', 'tsc', '--noEmit'])
      return r.code === 0
        ? { status: PASS, detail: 'no type errors' }
        : { status: FAIL, detail: r.out }
    },
  },

  {
    id: 'lint',
    phase: 'spine',
    title: 'format / lint',
    enforces: [],
    run() {
      if (!workspaceHasPackages()) return { status: EMPTY, detail: 'no packages to lint' }
      if (!hasBin('biome')) return unmet(this, '@biomejs/biome')
      const r = run('pnpm', ['-s', 'exec', 'biome', 'ci', '.'])
      return r.code === 0 ? { status: PASS, detail: 'clean' } : { status: FAIL, detail: r.out }
    },
  },

  {
    id: 'unit',
    phase: 'spine',
    title: 'unit tests',
    enforces: [],
    run() {
      if (!hasBin('vitest')) return unmet(this, 'vitest')
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
    phase: 'payroll',
    title: 'property tests',
    enforces: [18, 19],
    run() {
      return unmet(this, 'fast-check and the money and ledger invariants')
    },
  },

  {
    id: 'contract',
    phase: 'spine',
    title: 'contract tests',
    enforces: [2, 3, 4],
    run() {
      const spec = join(ROOT, 'contracts/openapi.generated.json')
      if (!existsSync(spec)) {
        return unmet(this, 'an OpenAPI document')
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

      if (!hasBin('vitest')) return unmet(this, 'vitest for boundary-hardening tests')
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
    phase: 'tenancy',
    title: 'RLS / security proof',
    enforces: [11, 12, 13, 14],
    /**
     * The tenancy gate, measured against a specification that was frozen BEFORE
     * the implementation: .architecture/phase-1-attack-matrix.md.
     *
     * Two things are reported, and conflating them is how a security gate goes
     * green on a third of a proof:
     *
     *   do the implemented cases pass?      -- FAIL if not, at any phase
     *   are all specified cases implemented? -- PENDING until they are
     *
     * PENDING expires when the tenancy phase starts, so the day the phase is
     * declared, an incomplete matrix is a failure rather than a progress note.
     */
    run() {
      const spec = join(ROOT, '.architecture/phase-1-attack-matrix.md')
      if (!existsSync(spec)) return unmet(this, 'the frozen attack matrix')
      const specified = [...readFileSync(spec, 'utf8').matchAll(/^\|\s*(T\d\d)\s*\|/gm)].map(
        (m) => m[1],
      )

      const dir = join(ROOT, 'tests/architecture/tenancy')
      const implemented = existsSync(dir)
        ? [
            ...new Set(
              readdirSync(dir)
                .filter((f) => /^T\d\d.*\.test\.ts$/.test(f))
                .map((f) => f.slice(0, 3)),
            ),
          ]
        : []
      const missing = specified.filter((t) => !implemented.includes(t))

      if (implemented.length === 0) return unmet(this, 'any implemented attack case')
      if (!hasBin('vitest')) return unmet(this, 'vitest')

      const r = run('pnpm', ['-s', 'test:architecture:tenancy'])
      if (r.code !== 0) return { status: FAIL, detail: r.out }
      // A suite that skipped because no database was reachable has proven
      // nothing, and must never read as a security proof that passed.
      const passed = Number(r.out.match(/Tests\s+(\d+) passed/)?.[1] ?? 0)
      if (passed === 0) return unmet(this, 'a reachable database for the attack suite')
      const summary = `${passed} assertions, ${implemented.length}/${specified.length} cases`

      if (missing.length > 0) {
        return {
          status: PENDING,
          detail: `${summary} -- still unimplemented: ${missing.join(', ')}`,
        }
      }
      return { status: PASS, detail: `${summary} of the frozen attack matrix` }
    },
  },

  {
    id: 'integration',
    phase: 'spine',
    title: 'integration tests',
    enforces: [11, 12],
    run() {
      if (!hasBin('vitest')) return unmet(this, 'vitest')
      const r = run('pnpm', ['-s', 'exec', 'vitest', 'run', '--reporter=dot', 'integration.test'])
      if (r.code !== 0) return { status: FAIL, detail: r.out }
      // A suite that skips because the database is unreachable has proven
      // nothing, and must not be reported as a pass.
      if (/skipped/.test(r.out) && !/\d+ passed/.test(r.out)) {
        return unmet(this, 'a reachable database')
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
    phase: 'spine',
    title: 'migration compatibility',
    enforces: [28],
    run() {
      const dir = join(ROOT, 'packages/db/migrations')
      if (!existsSync(dir)) {
        return unmet(this, 'migrations')
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
          status: BLOCKED,
          detail: `${files.length} migrations, but no database is reachable to apply them`,
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
    phase: 'spine',
    title: 'build',
    enforces: [],
    run() {
      if (!workspaceHasPackages()) return { status: EMPTY, detail: 'nothing to build' }
      if (!hasBin('turbo')) return unmet(this, 'turbo')
      const r = run('pnpm', ['-s', 'exec', 'turbo', 'run', 'build'])
      return r.code === 0 ? { status: PASS, detail: 'built' } : { status: FAIL, detail: r.out }
    },
  },

  {
    id: 'e2e',
    phase: 'spine',
    title: 'selected E2E',
    enforces: [],
    run() {
      if (!hasBin('playwright')) {
        return unmet(this, 'Playwright')
      }
      const r = run('pnpm', ['-s', 'exec', 'playwright', 'test'])
      if (r.code !== 0) return { status: FAIL, detail: r.out }
      const m = r.out.match(/(\d+) passed/)
      return { status: PASS, detail: `${m ? m[1] : '?'} flagship E2E specs passed` }
    },
  },

  {
    id: 'idempotence',
    phase: 'spine',
    title: 'gate leaves no trace',
    enforces: [33],
    /**
     * LAST, and the only check here that does not depend on the source
     * universe's vocabulary being complete.
     *
     * Every ordering defect this repository has hit -- .turbo and .next written
     * by the build, then next-env.d.ts rewritten by the formatter -- had the
     * same signature: every tool agreed, every tool was wrong, and a red build
     * found it. Both were CLASSIFICATION failures, and a classification system
     * can only catch the categories it already models. Directories were
     * modelled; a single generated file was not.
     *
     * This stage asks a BEHAVIOURAL question instead: did running the gate
     * change the repository? That catches the whole class regardless of which
     * category classify() failed to model -- including the next one, which by
     * definition is not enumerable in advance.
     */
    run() {
      if (!hasGit()) return unmet(this, 'a git repository to compare tree state against')
      if (TREE_AT_START === null) {
        return { status: BLOCKED, detail: 'could not read the working tree before the run' }
      }
      const now = treeState()
      if (now === TREE_AT_START) {
        return { status: PASS, detail: 'the working tree is exactly as the run found it' }
      }
      const before = new Set(TREE_AT_START.split(_NL).filter(Boolean))
      const touched = now
        .split(_NL)
        .filter(Boolean)
        .filter((line) => !before.has(line))
      return {
        status: FAIL,
        detail:
          'the gate mutated the repository -- a green run must leave the checkout as it ' +
          `found it:${_NL}${touched.map((t) => `  ${t}`).join(_NL)}`,
      }
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
