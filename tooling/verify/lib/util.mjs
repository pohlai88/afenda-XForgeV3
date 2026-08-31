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
 *            wrong; there is genuinely nothing to check yet.
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
 * The furthest phase whose work is complete. Raising this is a deliberate act:
 * it converts every BLOCKED stage in that phase from a local inconvenience into
 * a CI failure, which is exactly what completing a phase should mean.
 */
export const CURRENT_PHASE = process.env.XFORGE_PHASE ?? 'spine'

export function phaseHasStarted(phase) {
  const at = PHASES.indexOf(CURRENT_PHASE)
  const of = PHASES.indexOf(phase)
  if (of === -1) throw new Error(`unknown phase '${phase}'`)
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
  if (!existsSync(abs)) return acc
  for (const entry of readdirSync(abs)) {
    if (IGNORED_DIRS.has(entry)) continue
    const full = join(abs, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(relative(ROOT, full), exts, acc)
    else if (exts.some((e) => entry.endsWith(e))) acc.push(relative(ROOT, full))
  }
  return acc
}

/** Source files across the workspace roots that guards police. */
export function sourceFiles(roots = ['apps', 'modules', 'packages'], exts) {
  return roots.flatMap((r) => (exts ? walk(r, exts) : walk(r)))
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
    stdio: 'ignore',
    shell: process.platform === 'win32',
  })
  if (probe.status === 0) return true
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
