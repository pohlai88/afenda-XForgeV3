import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { NON_SOURCE_DIRS } from '../../source-universe.mjs'

export const ROOT = process.cwd()

/**
 * Stage outcomes.
 *
 * EMPTY, PENDING and BLOCKED are deliberately distinct from PASS: a stage that
 * passed because there was nothing to check has NOT verified anything, and
 * saying so is the difference between an honest gate and a decorative one.
 *
 * PENDING and BLOCKED look identical in a terminal and are entirely different
 * facts:
 *
 *   PENDING  the stage belongs to a phase that has not started. Nothing is
 *            wrong; there is genuinely nothing to check yet. PENDING EXPIRES:
 *            once the stage's phase starts, PENDING is a FAIL, because a stage
 *            declaring itself not-yet-applicable during its own phase is the
 *            quietest way for a mandatory check to never run.
 *   BLOCKED  the stage belongs to a phase that HAS started and should be
 *            running, but a prerequisite is missing -- no database, no browser.
 *            Locally that is an inconvenience. In CI it is a failure, because
 *            a check that did not run is not a check that passed.
 *
 * Collapsing the two is how "verify was green" comes to mean "the database
 * tests never ran".
 */
export const PASS = 'PASS'
export const FAIL = 'FAIL'
export const EMPTY = 'EMPTY'
export const PENDING = 'PENDING'
export const BLOCKED = 'BLOCKED'

/**
 * Build phases in order. A stage declares the phase it activates in; anything
 * at or before CURRENT_PHASE is expected to run.
 */
export const PHASES = [
  'spine',
  'tenancy',
  'design-system',
  'metadata',
  'hr',
  'payroll',
  'async',
  'ai',
  'integrations',
  'second-domain',
  'second-country',
]

/**
 * The furthest phase whose work is complete.
 *
 * THE REPOSITORY OWNS THIS, not the environment. If CI could run
 * `XFORGE_PHASE=spine pnpm verify --ci` against a Phase 4 codebase, every
 * mandatory Phase 1-4 check would quietly become a legitimate PENDING and the
 * gate would go green having verified almost nothing. Committing the phase
 * makes lowering it a reviewable diff rather than an environment variable.
 *
 * XFORGE_PHASE may RAISE the phase locally -- useful for qualifying the next
 * phase's stages before declaring it complete -- and may never lower it.
 * Under --ci the environment is ignored entirely.
 */
function readCommittedPhase() {
  const p = join(ROOT, '.architecture/state.json')
  if (!existsSync(p)) {
    throw new Error('.architecture/state.json is missing -- the canonical phase has no authority')
  }
  const { currentPhase } = JSON.parse(readFileSync(p, 'utf8'))
  if (!PHASES.includes(currentPhase)) {
    throw new Error(`.architecture/state.json declares unknown phase '${currentPhase}'`)
  }
  return currentPhase
}

export const COMMITTED_PHASE = readCommittedPhase()

/**
 * Resolve the effective phase.
 *
 * @param {{ci?: boolean}} opts
 */
export function resolvePhase({ ci = false } = {}) {
  const requested = process.env.XFORGE_PHASE
  if (!requested || ci) {
    return COMMITTED_PHASE
  }

  if (!PHASES.includes(requested)) {
    throw new Error(`XFORGE_PHASE='${requested}' is not a known phase. Known: ${PHASES.join(', ')}`)
  }
  // Monotonic: the environment may look further ahead, never further back.
  if (PHASES.indexOf(requested) < PHASES.indexOf(COMMITTED_PHASE)) {
    throw new Error(
      `XFORGE_PHASE='${requested}' is BEHIND the committed phase '${COMMITTED_PHASE}'. ` +
        'Lowering the phase would turn mandatory checks back into legitimate PENDING stages. ' +
        'Change .architecture/state.json in a reviewed commit instead.',
    )
  }
  return requested
}

export const CURRENT_PHASE = resolvePhase({
  ci: process.argv.includes('--ci') || process.env.CI === 'true',
})

export function phaseHasStarted(phase) {
  const at = PHASES.indexOf(CURRENT_PHASE)
  const of = PHASES.indexOf(phase)
  if (of === -1) {
    throw new Error(`unknown phase '${phase}'`)
  }
  return of <= at
}

/**
 * Directories the guards never walk.
 *
 * Derived from the single source universe rather than maintained here, so the
 * guards, Biome, tsc and Vitest cannot drift apart -- the drift that made the
 * lint stage order-dependent.
 */
const IGNORED_DIRS = new Set([...NON_SOURCE_DIRS, '.architecture'])

/** Recursively collect files under `dir` matching `exts`. */
export function walk(dir, exts = ['.ts', '.tsx', '.mts', '.js', '.mjs'], acc = []) {
  const abs = join(ROOT, dir)
  if (!existsSync(abs)) {
    return acc
  }
  for (const entry of readdirSync(abs)) {
    if (IGNORED_DIRS.has(entry)) {
      continue
    }
    const full = join(abs, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      walk(relative(ROOT, full), exts, acc)
    } else if (exts.some((e) => entry.endsWith(e))) {
      acc.push(relative(ROOT, full))
    }
  }
  return acc
}

/**
 * Source files across the workspace roots that guards police.
 *
 * `roots` KEEPS ITS DEFAULT. run-guards.mjs calls `sourceFiles()` with no
 * arguments, so removing it makes every source guard crash on
 * `undefined.flatMap`. An automatic lint fix has now done exactly that three
 * times, which is why the suppression is here rather than in a commit message.
 */
// biome-ignore lint/style/useDefaultParameterLast: run-guards.mjs calls this with no arguments
export function sourceFiles(roots = ['apps', 'modules', 'packages'], exts) {
  return roots.flatMap((r) => (exts ? walk(r, exts) : walk(r)))
}

/**
 * Every tracked textual file. An ENUMERATION, not a decision.
 *
 * `sourceFiles()` walked three roots and offered the guards 52 of 210 tracked
 * files. That made the offered set a second owner of "is this file subject to
 * guards", alongside each guard's own `applies()`. The two agreed for as long as
 * nobody compared them: 159 files were claimable and never offered, and six real
 * control characters sat in the guard runner's own source because `tooling/` was
 * not a root.
 *
 * The fix is not a longer exclusion list here -- that keeps both owners and makes
 * the second one longer. It is to enumerate, and let `applies()` be the only
 * thing that decides. An exclusion then lives on the guard whose property it is
 * an exclusion FROM, which is the only place the question can be answered: docs
 * are exempt from the delete guard and emphatically not from the
 * control-character one.
 *
 * BINARY IS THE ONLY EXCLUSION HERE, because "textual" is a property of the file
 * rather than of any guard's subject matter. Detected by content -- a NUL byte --
 * not by extension, so a new binary format needs no list entry.
 *
 * git is REQUIRED, and its absence throws rather than yielding an empty set. A
 * scan that silently offers nothing reports PASS, which is the failure mode this
 * whole change exists to remove.
 */
export function trackedFiles() {
  const r = spawnSync('git', ['ls-files', '-z'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
  })
  if (r.status !== 0) {
    throw new Error(`cannot enumerate the scan universe: git ls-files failed (${r.status})`)
  }
  const paths = (r.stdout ?? '').split(String.fromCharCode(0)).filter(Boolean)
  if (paths.length === 0) {
    throw new Error('cannot enumerate the scan universe: git ls-files returned nothing')
  }
  return paths.filter((f) => {
    let buf
    try {
      buf = readFileSync(join(ROOT, f))
    } catch {
      return false
    }
    return !buf.includes(0)
  })
}

export function read(file) {
  return readFileSync(join(ROOT, file), 'utf8')
}

/** Normalise a repo-relative path to forward slashes so guards are OS-independent. */
export function posix(p) {
  return p.split(sep).join('/')
}

/** Is a CLI tool resolvable? Used to distinguish PENDING from FAIL. */
export function hasBin(bin) {
  const probe = spawnSync(process.platform === 'win32' ? 'where' : 'which', [bin], {
    shell: process.platform === 'win32',
    stdio: 'ignore',
  })
  if (probe.status === 0) {
    return true
  }
  return existsSync(join(ROOT, 'node_modules', '.bin', bin))
}

export function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32' })
  return { code: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() }
}

/** Do any workspace packages exist yet? */
export function workspaceHasPackages() {
  return ['apps', 'modules', 'packages'].some((d) => {
    const abs = join(ROOT, d)
    return existsSync(abs) && readdirSync(abs).some((e) => existsSync(join(abs, e, 'package.json')))
  })
}

/**
 * The working tree as git sees it: modified tracked files AND untracked files
 * that nothing ignores.
 *
 * Used to assert that running the gate does not MUTATE the repository. Note
 * "does not mutate", not "is clean" -- comparing against a clean tree would
 * fail on any uncommitted work and make the gate unusable during development,
 * and an ignored gate is the same as no gate.
 */
export function treeState() {
  const r = run('git', ['status', '--porcelain'])
  return r.code === 0 ? r.out.trim() : null
}

/**
 * Apply the phase rules to a stage's raw result.
 *
 * PENDING EXPIRES. A stage may declare itself not-yet-applicable only BEFORE
 * its phase starts. Once the phase has started, PENDING would let a mandatory
 * check sit permanently unrun while the gate reported green -- and because CI
 * tolerates PENDING by design, nothing would ever say so.
 *
 * This is also what makes a local `XFORGE_PHASE=<next>` run real evidence:
 * raising the phase turns every not-yet-built check of that phase red
 * immediately, rather than at merge.
 */
export function settleStatus(stage, result) {
  if (result.status !== PENDING) {
    return result
  }
  if (!phaseHasStarted(stage.phase)) {
    return result
  }
  return {
    detail:
      `stage reported PENDING during its own '${stage.phase}' phase, which has started. ` +
      'Implement it, or report BLOCKED with the missing prerequisite.' +
      `${String.fromCharCode(10)}  it said: ${result.detail}`,
    status: FAIL,
  }
}
