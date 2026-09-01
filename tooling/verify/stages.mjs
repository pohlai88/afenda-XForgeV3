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
import { checkBudgets, summarise } from '../perf/check-budgets.mjs'
import { GENERATED_PATHS } from '../source-universe.mjs'
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
    ? { detail: `${stage.phase} phase has started but ${needs} is missing`, status: BLOCKED }
    : { detail: `activates in the ${stage.phase} phase (needs ${needs})`, status: PENDING }

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
 * Everything produced by `pnpm generate` is imported from the source universe,
 * not restated here. It was restated here once, identically, which is how two
 * authorities for one question start -- and ADR-024 records that divergence as
 * the reason the source universe module exists at all.
 */

export const stages = [
  {
    enforces: [27],
    id: 'generate',
    phase: 'spine',
    run() {
      if (!existsSync(join(ROOT, 'contracts'))) {
        return {
          detail: 'spine phase has started but contracts/ or the generator is missing',
          status: BLOCKED,
        }
      }
      if (!hasGit()) {
        return unmet(this, 'a git repository to diff generated output')
      }
      const gen = run('pnpm', ['-s', 'generate'])
      if (gen.code !== 0) {
        return { detail: `pnpm generate failed\n${gen.out}`, status: FAIL }
      }
      // Scoped to GENERATED paths only. Diffing the whole tree would fail on
      // any uncommitted hand-written work, making the gate unusable during
      // development -- and an ignored gate is the same as no gate.
      const diff = run('git', ['diff', '--exit-code', '--stat', '--', ...GENERATED_PATHS])
      return diff.code === 0
        ? { detail: 'generated state is clean', status: PASS }
        : { detail: `generated state drifted:\n${diff.out}`, status: FAIL }
    },
    title: 'generate cleanliness',
  },

  {
    enforces: [3, 4, 5, 6, 12, 15, 16, 17, 19, 20, 21, 22, 23, 26, 29, 30, 34],
    id: 'guards',
    phase: 'spine',
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
        return { detail: `${violations.length} violation(s):\n${detail}`, status: FAIL }
      }
      const mut = mutationTest()
      const broken = mut.filter((r) => r.status === 'BROKEN')
      if (broken.length > 0) {
        return {
          detail: `guard(s) no longer reject their own violation fixture:\n${broken
            .map((b) => `  ${b.guard}: ${b.detail}`)
            .join('\n')}`,
          status: FAIL,
        }
      }
      const proven = mut.filter((r) => r.status === 'PROVEN').length
      const unproven = mut.filter((r) => r.status === 'UNPROVEN')
      if (unproven.length > 0) {
        return {
          detail:
            'guard(s) without a mutation fixture -- unproven guards are not trusted:' +
            '\n' +
            unproven.map((u) => `  ${u.guard}`).join('\n'),
          status: FAIL,
        }
      }
      if (files === 0) {
        return {
          detail: `no source files yet; ${proven} guards proven against fixtures`,
          status: EMPTY,
        }
      }
      const contractNote = contract.present
        ? `, ${contract.checked} operations`
        : ', no contract yet'
      const configNote = `, ${config.checked} config guards`
      return {
        detail: `${checked} file-checks${contractNote}${configNote}, ${proven} guards proven`,
        status: PASS,
      }
    },
    title: 'architecture guards',
  },

  {
    enforces: [9],
    id: 'typecheck',
    phase: 'spine',
    run() {
      if (!workspaceHasPackages()) {
        return { detail: 'no packages to typecheck', status: EMPTY }
      }
      if (!hasBin('tsc')) {
        return unmet(this, 'typescript')
      }
      const r = run('pnpm', ['-s', 'exec', 'tsc', '--noEmit'])
      return r.code === 0
        ? { detail: 'no type errors', status: PASS }
        : { detail: r.out, status: FAIL }
    },
    title: 'typecheck',
  },

  {
    enforces: [],
    id: 'lint',
    phase: 'spine',
    run() {
      if (!workspaceHasPackages()) {
        return { detail: 'no packages to lint', status: EMPTY }
      }
      if (!hasBin('biome')) {
        return unmet(this, '@biomejs/biome')
      }
      const r = run('pnpm', ['-s', 'exec', 'biome', 'ci', '.'])
      return r.code === 0 ? { detail: 'clean', status: PASS } : { detail: r.out, status: FAIL }
    },
    title: 'format / lint',
  },

  {
    enforces: [],
    id: 'unit',
    phase: 'spine',
    run() {
      if (!hasBin('vitest')) {
        return unmet(this, 'vitest')
      }
      // Integration files are excluded, not merely separately reported.
      //
      // This stage excluded only `*.contract.test.ts`, so it also ran every
      // `*.integration.test.ts` -- in parallel, against the real database, and
      // then the integration stage ran them again. A stage named "unit tests"
      // whose result depends on a database is mislabelled, and it survived only
      // while there was exactly one such file: the moment a second arrived they
      // raced on `seedTenancy`, which clears tenant_domain and tenant_membership
      // unscoped to give itself a known starting state.
      const r = run('pnpm', [
        '-s',
        'exec',
        'vitest',
        'run',
        '--reporter=dot',
        '--exclude',
        '**/*.contract.test.ts',
        '--exclude',
        '**/*.integration.test.ts',
      ])
      if (r.code !== 0) {
        return { detail: r.out, status: FAIL }
      }
      const m = r.out.match(/Tests\s+(\d+) passed/)
      return { detail: `${m ? m[1] : '?'} tests passed`, status: PASS }
    },
    title: 'unit tests',
  },

  {
    enforces: [18, 19],
    id: 'property',
    phase: 'payroll',
    run() {
      return unmet(this, 'fast-check and the money and ledger invariants')
    },
    title: 'property tests',
  },

  {
    enforces: [2, 3, 4],
    id: 'contract',
    phase: 'spine',
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
        return { detail: `spec declares openapi ${doc.openapi}, expected 3.1.0`, status: FAIL }
      }
      const verbs = ['get', 'post', 'put', 'patch', 'delete']
      const missing = []
      let ops = 0
      for (const [path, item] of Object.entries(doc.paths ?? {})) {
        for (const v of verbs) {
          if (!item[v]) {
            continue
          }
          ops += 1
          if (!item[v].operationId) {
            missing.push(`${v.toUpperCase()} ${path}`)
          }
        }
      }
      if (missing.length) {
        return { detail: `operations without operationId: ${missing.join(', ')}`, status: FAIL }
      }

      if (!hasBin('vitest')) {
        return unmet(this, 'vitest for boundary-hardening tests')
      }
      const r = run('pnpm', ['-s', 'exec', 'vitest', 'run', '--reporter=dot', 'contract.test'])
      if (r.code !== 0) {
        return { detail: r.out, status: FAIL }
      }
      const m = r.out.match(/Tests\s+(\d+) passed/)
      return {
        detail: `${ops} operations, ${m ? m[1] : '?'} contract tests passed`,
        status: PASS,
      }
    },
    title: 'contract tests',
  },

  {
    enforces: [11, 12, 13, 14],
    id: 'rls',
    phase: 'tenancy',
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
      if (!existsSync(spec)) {
        return unmet(this, 'the frozen attack matrix')
      }
      // id plus the availability column, so the report can separate 'not written'
      // from 'cannot be written yet'. One combined ratio means two things at once,
      // and a number meaning two things carries neither.
      const rows = [
        ...readFileSync(spec, 'utf8').matchAll(
          /^\|\s*([TP]\d\d)\s*\|[^|]*\|[^|]*\|\s*([^|]+?)\s*\|/gm,
        ),
      ]
        .map(([, id, availableFrom]) => ({ availableFrom, id }))
        // Deduplicated: the document discusses cases in prose tables as well as
        // declaring them, and a case mentioned twice was inflating the
        // denominator. "29/30, complete" is a contradiction that should never
        // have been printable.
        .filter((row, i, all) => all.findIndex((seen) => seen.id === row.id) === i)
      const specified = rows.map((row) => row.id)
      const reachable = rows.filter((row) => row.availableFrom === 'now').map((row) => row.id)

      // Both matrices: tenancy (T) and policy (P). One case can cover a range,
      // so 'P01-P05-...' registers all five.
      const implemented = new Set()
      for (const sub of ['tenancy', 'policy']) {
        const dir = join(ROOT, 'tests/architecture', sub)
        if (!existsSync(dir)) {
          continue
        }
        for (const f of readdirSync(dir)) {
          if (!/[.]test[.](ts|mjs)$/.test(f)) {
            continue
          }
          // A file may declare a RANGE -- 'P01-P05-authorisation.test.ts' covers
          // five cases. Reading only the endpoints would report the middle
          // three as unwritten while they are asserted a few lines away, and
          // the fix for a wrong number is never to rename files around it.
          for (const m of f.matchAll(/([TP])(\d\d)(?:-[TP]?(\d\d))?/g)) {
            const [, prefix, first, last] = m
            const from = Number(first)
            const to = last ? Number(last) : from
            for (let n = from; n <= to; n += 1) {
              implemented.add(`${prefix}${String(n).padStart(2, '0')}`)
            }
          }
        }
      }
      const missing = specified.filter((t) => !implemented.has(t))

      if (implemented.size === 0) {
        return unmet(this, 'any implemented attack case')
      }
      if (!hasBin('vitest')) {
        return unmet(this, 'vitest')
      }

      const r = run('pnpm', ['-s', 'test:architecture:tenancy'])
      if (r.code !== 0) {
        return { detail: r.out, status: FAIL }
      }
      // A suite that skipped because no database was reachable has proven
      // nothing, and must never read as a security proof that passed.
      const passed = Number(r.out.match(/Tests\s+(\d+) passed/)?.[1] ?? 0)
      if (passed === 0) {
        return unmet(this, 'a reachable database for the attack suite')
      }
      const reachableDone = reachable.filter((t) => implemented.has(t))
      const summary =
        `${passed} assertions, ${reachableDone.length}/${reachable.length} reachable, ` +
        `${implemented.size}/${specified.length} of the matrix`

      if (missing.length > 0) {
        const unwritten = missing.filter((t) => reachable.includes(t))
        const blocked = rows.filter(
          (row) => missing.includes(row.id) && row.availableFrom !== 'now',
        )
        const parts = []
        if (unwritten.length) {
          parts.push(`unwritten: ${unwritten.join(', ')}`)
        }
        for (const row of blocked) {
          parts.push(`${row.id} needs ${row.availableFrom}`)
        }
        return { detail: `${summary} -- ${parts.join('; ')}`, status: PENDING }
      }
      return { detail: `${summary}, complete`, status: PASS }
    },
    title: 'tenancy + policy proof',
  },

  {
    enforces: [11, 12],
    id: 'integration',
    phase: 'spine',
    run() {
      if (!hasBin('vitest')) {
        return unmet(this, 'vitest')
      }
      // Through the script, so there is ONE way to run these and one
      // behaviour. Integration files share a single database, and
      // `seedTenancy` clears `tenant_domain` and `tenant_membership` unscoped
      // to give itself a known starting state -- which two files running in
      // parallel do to each other, mid-run. The failure is a resolution that
      // cannot find a membership another file has just deleted, and it appears
      // only when both files exist and only sometimes.
      const r = run('pnpm', ['-s', 'test:integration'])
      if (r.code !== 0) {
        return { detail: r.out, status: FAIL }
      }
      // A suite that skips because the database is unreachable has proven
      // nothing, and must not be reported as a pass.
      if (/skipped/.test(r.out) && !/\d+ passed/.test(r.out)) {
        return unmet(this, 'a reachable database')
      }
      const m = r.out.match(/Tests\s+(\d+) passed/)
      return {
        detail: `${m ? m[1] : '?'} integration tests passed against real PostgreSQL`,
        status: PASS,
      }
    },
    title: 'integration tests',
  },

  {
    enforces: [28],
    id: 'migration',
    phase: 'spine',
    run() {
      const dir = join(ROOT, 'packages/db/migrations')
      if (!existsSync(dir)) {
        return unmet(this, 'migrations')
      }
      const files = readdirSync(dir)
        .filter((f) => f.endsWith('.sql'))
        .sort()
      if (files.length === 0) {
        return { detail: 'no migrations yet', status: EMPTY }
      }

      // What this proves: every migration applies cleanly, in order, to a
      // FRESH database. What it does not yet prove is AQS-018 -- the
      // expand/backfill/switch/contract rollout with the previous release's
      // queries green at each intermediate state. That needs a second schema
      // version and lands with the first real schema change; the detail says so
      // rather than letting a weaker check read as the full proof.
      const probe = run('node', [join(ROOT, 'tooling/verify/lib/migrate-check.mjs')])
      if (probe.code === 2) {
        return {
          detail: `${files.length} migrations, but no database is reachable to apply them`,
          status: BLOCKED,
        }
      }
      if (probe.code !== 0) {
        return { detail: probe.out, status: FAIL }
      }
      return {
        detail:
          files.length +
          ' migrations apply cleanly to a fresh database (AQS-018 rollout proof still pending)',
        status: PASS,
      }
    },
    title: 'migration compatibility',
  },

  {
    enforces: [],
    id: 'build',
    phase: 'spine',
    run() {
      if (!workspaceHasPackages()) {
        return { detail: 'nothing to build', status: EMPTY }
      }
      if (!hasBin('turbo')) {
        return unmet(this, 'turbo')
      }
      const r = run('pnpm', ['-s', 'exec', 'turbo', 'run', 'build'])
      return r.code === 0 ? { detail: 'built', status: PASS } : { detail: r.out, status: FAIL }
    },
    title: 'build',
  },

  {
    enforces: [],
    id: 'perf-budgets',
    phase: 'spine',
    /**
     * Section 22's per-route budgets, against the build the previous stage just
     * produced. Deliberately NOT deferred to the design-system phase: the
     * routes exist, the build exists, and the check runs today. `unmet()` is
     * for obligations that genuinely cannot be evaluated yet, not for ones it
     * would be more comfortable to postpone.
     */
    run() {
      if (!existsSync(join(ROOT, 'apps/web/.next/server/app'))) {
        return unmet(this, 'a production build of apps/web')
      }
      let result
      try {
        result = checkBudgets()
      } catch (err) {
        // A budget gate that cannot measure has not passed. Reporting FAIL
        // rather than swallowing this is the whole lesson of ADR-024.
        return { detail: `budgets could not be evaluated: ${err?.message}`, status: FAIL }
      }
      const { checked, problems } = result
      if (problems.length > 0) {
        return { detail: problems.join(_NL), status: FAIL }
      }
      return checked.length === 0
        ? { detail: 'no routes ship client JavaScript', status: EMPTY }
        : { detail: summarise(checked), status: PASS }
    },
    title: 'per-route performance budgets',
  },

  {
    enforces: [],
    id: 'e2e',
    phase: 'spine',
    run() {
      if (!hasBin('playwright')) {
        return unmet(this, 'Playwright')
      }

      // The port preflight runs HERE, before Playwright, because Playwright
      // probes its `webServer.url` before it ever runs `webServer.command` --
      // so a preflight wired into that command cannot fire in the case that
      // motivated it, which is a stale server answering the health URL. The
      // gate owns this ordering; Playwright's config does not.
      const port = run('pnpm', ['-s', 'e2e:port'])
      if (port.code !== 0) {
        return { detail: port.out, status: FAIL }
      }

      const r = run('pnpm', ['-s', 'e2e'])
      if (r.code !== 0) {
        return { detail: r.out, status: FAIL }
      }
      const m = r.out.match(/(\d+) passed/)
      return { detail: `${m ? m[1] : '?'} flagship E2E specs passed`, status: PASS }
    },
    title: 'selected E2E',
  },

  {
    enforces: [33],
    id: 'idempotence',
    phase: 'spine',
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
      if (!hasGit()) {
        return unmet(this, 'a git repository to compare tree state against')
      }
      if (TREE_AT_START === null) {
        return { detail: 'could not read the working tree before the run', status: BLOCKED }
      }
      const now = treeState()
      if (now === TREE_AT_START) {
        return { detail: 'the working tree is exactly as the run found it', status: PASS }
      }
      const before = new Set(TREE_AT_START.split(_NL).filter(Boolean))
      const touched = now
        .split(_NL)
        .filter(Boolean)
        .filter((line) => !before.has(line))
      return {
        detail:
          'the gate mutated the repository -- a green run must leave the checkout as it ' +
          `found it:${_NL}${touched.map((t) => `  ${t}`).join(_NL)}`,
        status: FAIL,
      }
    },
    title: 'gate leaves no trace',
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
