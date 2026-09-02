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
  ASSET_BUDGETS,
  checkAssetBudgets,
  checkBudgets,
  summarise,
} from '../perf/check-budgets.mjs'
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

const NL = String.fromCharCode(10)

/**
 * How many tests a runner reported passing -- or `null`, which is never a pass.
 *
 * FIVE STAGES PARSE THIS, and four of them treated a miss as cosmetic:
 * `${m ? m[1] : '?'} tests passed`, with `status: PASS` regardless. A suite
 * that skipped every case EXITS 0 and prints no `passed` token at all, so the
 * gate reported green having executed nothing, with a question mark standing
 * where the evidence should be.
 *
 * It is not hypothetical for `contract`: its cases skip at module scope on
 * `ownerUrl()`/`appUrl()`, while the stage's precondition probe connects using
 * `DATABASE_URL` in a separate process. When those two disagree the probe
 * succeeds, every case vanishes, and the stage printed
 * "3 operations, ? contract tests passed" and went green.
 *
 * A count that cannot be read is not a count of zero, and neither is a pass.
 * Both return null here; the caller decides whether a refusal is a FAIL or a
 * named missing prerequisite, because that answer differs per stage.
 *
 * The pattern is a parameter because Playwright's epilogue is not vitest's --
 * and it is ANCHORED, which the e2e stage's bare `(\d+) passed` was not. That
 * one matched the first `passed` anywhere in stdout, so a spec logging
 * `checks: 42 passed` made the stage report 42 against a real summary of 2.
 */
const passedCount = (out, re = /Tests\s+(\d+) passed/) => {
  const m = out.match(re)
  const n = m ? Number(m[1]) : 0
  return n > 0 ? n : null
}

/**
 * Everything produced by `pnpm generate` is imported from the source universe,
 * not restated here. It was restated here once, identically, which is how two
 * authorities for one question start -- and ADR-024 records that divergence as
 * the reason the source universe module exists at all.
 */

/**
 * `authorship: true` -- this stage belongs to the AUTHORSHIP LOOP.
 *
 * It is declared per stage rather than listed in the runner, because "which
 * checks are cheap" is a property of the check and belongs with it. A list in
 * `verify.mjs` would be a second source that agrees until a stage grows a
 * database.
 *
 * The criterion is mechanical, not a judgement about importance: an authorship
 * stage needs NO external service, NO build artefact and NO browser. Everything
 * else -- contract, rls, integration, migration, build, perf-budgets, e2e,
 * idempotence, generate -- runs only in the full gate. `generate` is excluded
 * despite being fast-ish because it shells four generators; the PreToolUse hook
 * already refuses writes to generated state, which is the hazard it covers.
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
      //
      // AGAINST THE INDEX, deliberately. The question is "did regeneration
      // produce anything you have not already accepted", so a developer who
      // regenerated and staged the result stays green while a hand-edit that
      // `pnpm generate` overwrites goes red. Diffing HEAD instead would make
      // this stage red for every contract change until it was committed -- red
      // exactly when CLAUDE.md says it is meant to run.
      const diff = run('git', ['diff', '--exit-code', '--stat', '--', ...GENERATED_PATHS])
      if (diff.code !== 0) {
        return { detail: `generated state drifted:${NL}${diff.out}`, status: FAIL }
      }
      // `git diff` cannot see a file git does not track, so a NEW generator
      // output that nobody added read as "clean" -- and commit b29e68d added
      // four such files at once, so new ones genuinely appear. Only a file that
      // predates the run is invisible; one created during it is caught by the
      // idempotence stage. This closes the other half.
      const untracked = run('git', [
        'ls-files',
        '--others',
        '--exclude-standard',
        '--',
        ...GENERATED_PATHS,
      ])
      if (untracked.code === 0 && untracked.out !== '') {
        return {
          detail:
            `generated state is untracked, so nothing diffs it:${NL}${untracked.out}${NL}` +
            '  Generated state is committed and asserted byte-identical. Add it.',
          status: FAIL,
        }
      }
      return { detail: 'generated state is clean', status: PASS }
    },
    title: 'generate cleanliness',
  },

  {
    authorship: true,
    enforces: [3, 4, 5, 6, 12, 15, 16, 17, 19, 20, 21, 22, 23, 26, 29, 30, 34],
    id: 'guards',
    phase: 'spine',
    run() {
      const {
        approximate,
        blind,
        dormant,
        files,
        checked,
        violations: sourceViolations,
      } = scanWorkspace()

      // A GUARD THAT GOVERNS NO FILE IS THE ADR-024 FAILURE ITSELF: configured,
      // green and blind. `run-guards.mjs` has always exited 1 on this and the
      // gate discarded the field, so `pnpm guards` was strictly stronger than
      // `pnpm verify` -- and the weaker of the two is the one merge authority
      // rests on. Dormancy is the declared version of the same zero and is
      // reported, not failed.
      if (blind.length > 0) {
        return {
          detail:
            'guard(s) govern no file at all, and do not say why:\n' +
            `${blind.map((b) => `  ${b.id}`).join('\n')}\n` +
            '  Either the subject is gone, or a narrowing went too far. Declare\n' +
            '  `dormant` with a reason if the subject has not arrived yet.',
          status: FAIL,
        }
      }

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
      // Dormancy and text-precision are LIMITS OF THIS RESULT, and both were
      // printed only by `run-guards.mjs` -- the command almost nobody runs. A
      // limitation visible only in the tool nobody invokes is not recorded, and
      // the argument for tracking either is that it stays in sight.
      const limits = `${dormant.length} dormant, ${approximate} text-precision`
      return {
        detail: `${checked} file-checks${contractNote}${configNote}, ${proven} guards proven (${limits})`,
        status: PASS,
      }
    },
    title: 'architecture guards',
  },

  {
    authorship: true,
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
    authorship: true,
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
    authorship: true,
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
      // raced on the fixture reset. (That reset is `resetEmergencyContacts`,
      // and it is unscoped because the owner role bypasses RLS anyway --
      // `seedTenancy`, which this comment used to name, has scoped its own
      // deletes since. A comment naming the wrong function is worse than none,
      // because it sends the next reader to a file that looks correct.)
      //
      // The exclusion used to be stated HERE, as two `--exclude` flag pairs --
      // a copy of a fact `vitest.config.ts` also held, which is why it could be
      // wrong here while being right there. The stage now names a project and
      // owns no opinion about which files are units.
      const r = run('pnpm', ['-s', 'exec', 'vitest', 'run', '--project', 'unit', '--reporter=dot'])
      if (r.code !== 0) {
        return { detail: r.out, status: FAIL }
      }
      // FAIL, not `unmet`: this stage has no external prerequisite to name, so
      // a run that asserted nothing is a defect rather than a missing service.
      const passed = passedCount(r.out)
      if (passed === null) {
        return {
          detail: `vitest exited 0 without reporting a passing test:${NL}${r.out}`,
          status: FAIL,
        }
      }
      return { detail: `${passed} tests passed`, status: PASS }
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
      // A DATABASE IS A PREREQUISITE OF THIS STAGE, so its absence is BLOCKED
      // rather than FAIL.
      //
      // These cases mount the real app: the tenant-resolution middleware runs
      // before any assertion, so with no driver configured every case returns
      // 500 and the boundary-hardening tests report "expected 500 to be less
      // than 500". That is a database outage wearing the costume of a
      // contract violation, and it cost a real diagnosis -- the honest reading
      // of twelve failed cases was "Docker is not running".
      //
      // The integration and tenancy stages already refuse to call an unrun
      // suite a pass; this stage was the one that called it a FAILURE instead.
      // BLOCKED is still a failure under --ci, so nothing is weakened: what
      // changes is that the report names the missing prerequisite rather than
      // an assertion nobody broke.
      if (run('node', [join(ROOT, 'tooling/db/probe.mjs')]).code !== 0) {
        return unmet(this, 'a reachable database for the boundary-hardening cases')
      }
      // `--project contract`, not the positional filter `contract.test`. The
      // filter was a substring match against file paths -- a fourth encoding of
      // the partition, and one that would silently widen the moment a file
      // unrelated to contracts happened to contain that substring.
      const r = run('pnpm', [
        '-s',
        'exec',
        'vitest',
        'run',
        '--project',
        'contract',
        '--reporter=dot',
      ])
      if (r.code !== 0) {
        return { detail: r.out, status: FAIL }
      }
      // The probe above proves a database answers `DATABASE_URL`. It does NOT
      // prove the suite reached one -- the cases resolve their own URLs through
      // `ownerUrl()`/`appUrl()`, and when those disagree with the probe's every
      // case skips. BLOCKED names that; it is still a failure under --ci.
      const passed = passedCount(r.out)
      if (passed === null) {
        return unmet(this, `a database the contract suite itself reaches${NL}${r.out}`)
      }
      return {
        detail: `${ops} operations, ${passed} contract tests passed`,
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

      // THE PARSE IS ASSERTED, because `missing` is derived only from
      // `specified` -- so anything that shrinks the parse shrinks the
      // OBLIGATION, and the stage reports "complete" against a matrix it could
      // no longer read. `implemented.size === 0` below guards the other side of
      // that comparison; it detects missing TESTS and can never detect a
      // missing SPEC.
      //
      // Measured against the real document: dropping the Expected column leaves
      // 15 of 30 rows matching (the availability capture runs past the row's
      // trailing pipe into the next line, because `[^|]+?` crosses newlines),
      // and renumbering T01 to T001 leaves 9. Both print "complete". So an
      // emptiness check alone is the cheap tripwire, not the check -- the
      // load-bearing one is that the matrix cannot claim fewer cases than are
      // implemented against it.
      if (rows.length === 0) {
        return {
          detail:
            'the attack matrix parsed to zero rows -- its table format changed under the row pattern',
          status: FAIL,
        }
      }
      // 'now' or the name of a slice. A row whose availability captured a
      // newline is a row the pattern mis-read, and it collapses `reachable` to
      // a number that reads as satisfied.
      const unreadable = rows.filter((row) => !/^[\w -]+$/.test(row.availableFrom))
      if (unreadable.length > 0) {
        return {
          detail:
            'the attack matrix availability column did not parse: ' +
            `${unreadable.map((row) => row.id).join(', ')}`,
          status: FAIL,
        }
      }

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
      // The ratio this stage prints is `implemented.size / specified.length`,
      // and more implemented cases than specified ones is not a good result --
      // it is arithmetic that only a half-read matrix can produce. "30/15 of
      // the matrix, complete" was printable.
      if (implemented.size > specified.length) {
        return {
          detail:
            `${implemented.size} attack cases are implemented against a matrix that parsed to ` +
            `${specified.length} -- the specification was read incompletely, so the ` +
            'completeness half of this stage is measuring nothing',
          status: FAIL,
        }
      }
      if (!hasBin('vitest')) {
        return unmet(this, 'vitest')
      }
      // MEASURED, 2026-09-01: with DATABASE_URL pointed at a dead port this
      // stage reported PASS -- "21 assertions, 29/29 reachable, 30/30 of the
      // matrix, complete". Sixty-seven assertions run against a live database.
      //
      // So the security gate declared the matrix COMPLETE on a third of its
      // proof. The `passed === 0` check below is what was supposed to prevent
      // this, and it only catches a TOTAL outage: the cases guard themselves
      // with `skipIf(!reachable)`, so an unreachable database silently removes
      // every case that needs one and leaves the rest to report success.
      //
      // "A suite that skipped because no database was reachable has proven
      // nothing" is this stage's own comment. It was right about the principle
      // and wrong about the threshold. Reachability is now a precondition, so
      // the stage cannot report on a partial matrix at all.
      if (run('node', [join(ROOT, 'tooling/db/probe.mjs')]).code !== 0) {
        return unmet(this, 'a reachable database for the attack suite')
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
      // A DATABASE IS A PREREQUISITE, checked BEFORE the suite rather than
      // inferred from its output afterwards -- the same ordering the contract,
      // tenancy and e2e stages use. This stage was the last one still
      // diagnosing an outage from stdout.
      if (run('node', [join(ROOT, 'tooling/db/probe.mjs')]).code !== 0) {
        return unmet(this, 'a reachable database')
      }
      // Through the script, so there is ONE way to run these and one
      // behaviour. The serial requirement, and the shared-database hazard it
      // exists for, are declared on the `integration` project in
      // `vitest.config.ts` -- beside the collection they govern, rather than as
      // a `--no-file-parallelism` flag this script could be run without.
      // Restating the hazard here would make it a fact with two sources again,
      // which is what this stage's own history is a post-mortem of.
      const r = run('pnpm', ['-s', 'test:integration'])
      if (r.code !== 0) {
        return { detail: r.out, status: FAIL }
      }
      // COUNTED, NOT PATTERN-MATCHED. The rule was
      // `/skipped/.test(out) && !/\d+ passed/.test(out)`, and `0 passed` matches
      // `\d+ passed` -- so a run that skipped every case reported
      // PASS "0 integration tests passed against real PostgreSQL". The cases
      // guard themselves with skipIf, so that is precisely the shape an
      // unreachable database produces, and it is the same defect the tenancy
      // stage fixed one stage earlier with the same `=== 0` rule.
      const passed = Number(r.out.match(/Tests\s+(\d+) passed/)?.[1] ?? 0)
      if (passed === 0) {
        return unmet(this, 'a reachable database')
      }
      return {
        detail: `${passed} integration tests passed against real PostgreSQL`,
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
        return { detail: problems.join(NL), status: FAIL }
      }
      return checked.length === 0
        ? { detail: 'no routes ship client JavaScript', status: EMPTY }
        : { detail: summarise(checked), status: PASS }
    },
    title: 'per-route performance budgets',
  },

  {
    authorship: true,
    enforces: [],
    id: 'css-budgets',
    phase: 'spine',
    /**
     * The stylesheets' own growth, which nothing measured until now.
     *
     * AN AUTHORSHIP STAGE ON PURPOSE. The route budget beside it needs a
     * production build, so CSS growth would have been visible only behind three
     * minutes of building -- and the whole point is to see it while the edit
     * that caused it is still on screen. These subjects are readable straight
     * from the checkout, which is the criterion `stages.mjs` uses, so it
     * declares `authorship` and joins the twenty-second loop.
     *
     * NOT DEFERRED to the design-system phase. The files exist, the numbers are
     * real, and the check runs today; `unmet()` is for obligations that cannot
     * be evaluated yet, never for ones it would be tidier to postpone.
     */
    run() {
      let result
      try {
        result = checkAssetBudgets()
      } catch (err) {
        // Same lesson as the route gate: a budget that could not measure has
        // not passed. ADR-024's whole subject is a tool reporting green having
        // inspected nothing.
        return { detail: `css budgets could not be evaluated: ${err?.message}`, status: FAIL }
      }
      const { checked, problems } = result
      if (problems.length > 0) {
        return { detail: problems.join(NL), status: FAIL }
      }
      return checked.length === 0
        ? { detail: 'no stylesheets are budgeted', status: EMPTY }
        : { detail: summarise(checked, ASSET_BUDGETS), status: PASS }
    },
    title: 'stylesheet growth budgets',
  },

  {
    authorship: true,
    enforces: [],
    id: 'a11y-evidence',
    phase: 'design-system',
    /**
     * ADR-025's obligation, made mechanical.
     *
     * WHO OWES IS DERIVED, never listed: the gated set comes from
     * `PROFILES_REQUIRING_AT_EVIDENCE`, so a Combobox declaring `composite`
     * joins the day it lands and nobody edits a list to make that happen.
     *
     * STALE EVIDENCE IS ABSENT EVIDENCE. A session recorded at a lower
     * `interaction.revision` described a component that has since changed its
     * keyboard, focus or ARIA behaviour -- which is precisely what invalidates a
     * screen-reader result. Partial credit here would be a gate reporting
     * coverage it does not have.
     *
     * ORPHANED EVIDENCE FAILS rather than being ignored. A session naming a
     * contract that does not exist, or one that owes nothing, proves nothing and
     * reads exactly like proof -- the same conservation the guard fixtures apply.
     *
     * PENDING BEFORE THE PHASE, BLOCKED AFTER, via `unmet`. Red on day one by
     * construction is how a stage becomes something people learn to scroll past;
     * a precondition that activates with its phase is not.
     */
    run() {
      const evidencePath = join(ROOT, '.architecture/a11y-evidence.json')
      if (!existsSync(evidencePath)) {
        return { detail: '.architecture/a11y-evidence.json is missing', status: FAIL }
      }
      // THE VERDICT IS COMPUTED IN ONE PLACE, and this stage no longer holds a
      // second opinion about any part of it. `orphans` used to be derived here,
      // from a copy of the ledger this function read itself, while `malformed`
      // and `missing` came from the subprocess -- one question answered in two
      // files, so the ordering that makes the answer honest was a comment in one
      // of them and unenforceable from the other. `ledgerFailures` returns all
      // four categories; this reads them.
      const r = run('node', [
        join(ROOT, 'packages/design/policy/interaction/assistive-technology.mjs'),
      ])
      if (r.code !== 0) {
        return { detail: r.out, status: FAIL }
      }
      const owing = JSON.parse(r.out)

      // ORPHANS FIRST, and the order matters. If nothing is gated then every
      // recorded session is an orphan, so checking EMPTY first would report "no
      // contract requires evidence" over a file full of sessions proving
      // nothing -- the reassuring answer, and the wrong one.
      if (owing.orphans.length > 0) {
        return {
          detail: `evidence recorded for ${owing.orphans.join(', ')}, which owes none`,
          status: FAIL,
        }
      }

      // MALFORMED EVIDENCE FAILS, and it is checked before absence for the same
      // reason orphans are: a session that is not a session reads as coverage.
      // Absence is honest and becomes PENDING or BLOCKED below; a recorded
      // `interactionRevision` with nothing behind it is a claim, and this stage
      // could not previously tell the two apart at all.
      if (owing.malformed.length > 0) {
        return { detail: owing.malformed.join('\n'), status: FAIL }
      }

      // A gate over nothing is not a gate. EMPTY says so rather than passing.
      if (owing.gated.length === 0) {
        return { detail: 'no contract requires assistive-technology evidence', status: EMPTY }
      }

      if (owing.missing.length > 0) {
        return unmet(this, `a recorded screen-reader session for ${owing.missing.join(', ')}`)
      }
      return {
        detail: `${owing.gated.length} gated contract(s) have current evidence`,
        status: PASS,
      }
    },
    title: 'assistive-technology evidence',
  },

  {
    enforces: [],
    id: 'e2e',
    phase: 'spine',
    run() {
      if (!hasBin('playwright')) {
        return unmet(this, 'Playwright')
      }
      // The app under test talks to a database, so this stage needs one as
      // surely as the integration stage does. Without it Playwright reports
      // `connect ECONNREFUSED` as a FAILED spec -- a missing prerequisite
      // wearing the costume of a broken flow, which is the same confusion the
      // contract stage was making one stage earlier.
      if (run('node', [join(ROOT, 'tooling/db/probe.mjs')]).code !== 0) {
        return unmet(this, 'a reachable database for the application under test')
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
      // Anchored to Playwright's own summary line. See `passedCount`: the bare
      // pattern matched the first `passed` anywhere in stdout, including text a
      // spec printed itself.
      const passed = passedCount(r.out, /^\s*(\d+) passed/m)
      if (passed === null) {
        return unmet(this, `an E2E run that executed a spec${NL}${r.out}`)
      }
      return { detail: `${passed} flagship E2E specs passed`, status: PASS }
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
      // BOTH DIRECTIONS. This listed only lines the run ADDED, so a gate that
      // removed one -- deleting an untracked artefact that was already there,
      // or restoring a file somebody had edited -- failed with an empty list
      // under the sentence "the gate mutated the repository", naming nothing.
      // The last stage of a three-minute run is the worst possible place for a
      // verdict with no evidence attached.
      const before = new Set(TREE_AT_START.split(NL).filter(Boolean))
      const after = new Set(now.split(NL).filter(Boolean))
      const changes = [
        ...[...after].filter((l) => !before.has(l)).map((l) => `+ ${l}`),
        ...[...before].filter((l) => !after.has(l)).map((l) => `- ${l}`),
      ]
      return {
        detail:
          'the gate mutated the repository -- a green run must leave the checkout as it ' +
          `found it:${NL}${changes.map((c) => `  ${c}`).join(NL)}`,
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
