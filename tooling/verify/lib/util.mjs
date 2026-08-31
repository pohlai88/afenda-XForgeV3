import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

export const ROOT = process.cwd()

/** Stage outcomes. EMPTY and PENDING are deliberately distinct from PASS:
 *  a stage that passed because there was nothing to check has NOT verified anything,
 *  and saying so is the difference between an honest gate and a decorative one. */
export const PASS = 'PASS'
export const FAIL = 'FAIL'
export const EMPTY = 'EMPTY'
export const PENDING = 'PENDING'

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.next',
  '.turbo',
  'coverage',
  '.architecture',
])

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
export function sourceFiles(roots = ['apps', 'modules', 'packages']) {
  return roots.flatMap((r) => walk(r))
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
