/**
 * Every workspace import goes through a declared entry point, and every
 * declared entry point names a file that exists (ADR-033, Verification 1).
 *
 * DERIVED END TO END. This file holds no list of packages, exports or
 * specifiers. It reads the workspace globs pnpm reads, the manifests Node
 * reads, and the tracked source git reads, and compares them. A table here
 * would be the second module graph ADR-033 deleted from `workspace.aliases.ts`.
 *
 * Two directions, because they fail separately:
 *
 *   manifest -> disk     an `exports` or `imports` target that names nothing.
 *                        `packages/design` exported "." to a deleted barrel
 *                        for five commits and `pnpm install` never noticed.
 *   source -> manifest   a specifier no manifest declares. `@xforge/design/state`
 *                        was imported by three files after its export was
 *                        removed; only tsc reported it, as TS2307, and only
 *                        because the compiler happened to be run.
 *
 * Both were observed RED against the tree of 2026-09-03 before either was fixed.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error -- untyped .mjs helper; `tooling/` is the root package, so this
// relative path crosses no workspace boundary (ADR-033 rule 5).
import { trackedFiles } from '../../tooling/verify/lib/util.mjs'

const ROOT = join(import.meta.dirname, '../..')
const posix = (p: string) => p.split(sep).join('/')

interface Manifest {
  dir: string
  exports: Record<string, unknown>
  imports: Record<string, unknown>
  name: string
}

/** pnpm owns which directories are workspace packages. This only reads it. */
function workspaceGlobs(): string[] {
  const yaml = readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8')
  const block = /^packages:\n((?:[^\S\n]+(?:#[^\n]*|-[^\n]*)\n)+)/m.exec(yaml)?.[1]
  if (!block) {
    throw new Error('pnpm-workspace.yaml: no `packages:` block -- nothing to derive from')
  }
  const globs = [...block.matchAll(/^\s*-\s*'([^']+)'/gm)]
    .map((m) => m[1])
    .filter((g): g is string => g !== undefined)
  if (globs.length === 0) {
    throw new Error('pnpm-workspace.yaml: `packages:` listed nothing parseable')
  }
  return globs
}

function manifests(): Manifest[] {
  const dirs: string[] = []
  for (const glob of workspaceGlobs()) {
    if (glob.endsWith('/*')) {
      const parent = join(ROOT, glob.slice(0, -2))
      if (!existsSync(parent)) {
        continue
      }
      for (const entry of readdirSync(parent, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          dirs.push(join(parent, entry.name))
        }
      }
    } else {
      dirs.push(join(ROOT, glob))
    }
  }
  return dirs
    .filter((d) => existsSync(join(d, 'package.json')))
    .map((dir) => {
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
        exports?: Record<string, unknown>
        imports?: Record<string, unknown>
        name?: string
      }
      if (!pkg.name) {
        throw new Error(`${posix(relative(ROOT, dir))}/package.json has no name`)
      }
      return { dir, exports: pkg.exports ?? {}, imports: pkg.imports ?? {}, name: pkg.name }
    })
}

/**
 * Every string a target can resolve to. A conditions object contributes each
 * of its string values; `null` is Node's "this subpath is blocked" and
 * contributes nothing; anything else THROWS, because a target this cannot
 * read is a target it would otherwise silently pass.
 */
function targetsOf(owner: string, key: string, target: unknown): string[] {
  if (target === null) {
    return []
  }
  if (typeof target === 'string') {
    return [target]
  }
  if (target && typeof target === 'object') {
    const values = Object.values(target as Record<string, unknown>)
    if (values.every((v) => typeof v === 'string')) {
      return values as string[]
    }
  }
  throw new Error(`${owner} declares "${key}" in a shape this test does not understand`)
}

/**
 * Does a target exist on disk? A literal target is a file. A pattern target
 * (`./src/components/*.tsx`) exists when its directory exists AND at least one
 * file matches -- a pattern over an empty directory is a promise with nothing
 * behind it, and would otherwise read as satisfied.
 */
function targetExists(dir: string, target: string): boolean {
  if (!target.includes('*')) {
    return existsSync(join(dir, target))
  }
  const [before = '', after = ''] = target.split('*')
  const base = join(dir, dirname(before))
  if (!(existsSync(base) && statSync(base).isDirectory())) {
    return false
  }
  const prefix = posix(relative(dir, join(dir, before)))
  return readdirSync(base, { recursive: true, withFileTypes: true }).some((entry) => {
    if (!entry.isFile()) {
      return false
    }
    const rel = posix(relative(dir, join(entry.parentPath, entry.name)))
    return rel.startsWith(prefix) && rel.endsWith(after)
  })
}

/** Node's rule: `*` in a key matches any non-empty substring, `/` included. */
function keyMatches(key: string, subpath: string): boolean {
  if (!key.includes('*')) {
    return key === subpath
  }
  const [before = '', after = ''] = key.split('*')
  return (
    subpath.length > before.length + after.length &&
    subpath.startsWith(before) &&
    subpath.endsWith(after)
  )
}

/**
 * Is a subpath exported? Node picks the MOST SPECIFIC matching key (longest
 * literal prefix), and a `null` target there blocks the subpath even when a
 * broader pattern would have matched. `"./components/ui/*": null` beside
 * `"./components/*"` is exactly that shape.
 */
function isExported(exports: Record<string, unknown>, subpath: string): boolean {
  const literalPrefix = (key: string) => (key.split('*')[0] ?? '').length
  const [best] = Object.keys(exports)
    .filter((key) => keyMatches(key, subpath))
    .sort((a, b) => literalPrefix(b) - literalPrefix(a))
  return best !== undefined && exports[best] !== null
}

/**
 * Every workspace specifier in tracked source, with the file that wrote it.
 * Import statements only -- `from '...'`, `import('...')`, side-effect
 * `import '...'`, CSS `@import "..."` -- so a specifier quoted in a comment is
 * not counted as an import.
 */
const SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(?\s*|@import\s*(?:url\()?\s*)['"]((?:@xforge\/|#)[^'"]+)['"]/g

function importsInSource(): { file: string; specifier: string }[] {
  const { files } = trackedFiles()
  const out: { file: string; specifier: string }[] = []
  for (const file of files) {
    if (!/\.(?:ts|tsx|mjs|js|css)$/.test(file) || file.startsWith('.agents/')) {
      continue
    }
    const source = readFileSync(join(ROOT, file), 'utf8')
    for (const [, specifier] of source.matchAll(SPECIFIER)) {
      if (specifier !== undefined) {
        out.push({ file, specifier })
      }
    }
  }
  return out
}

/** The nearest manifest above a file decides what `#…` may mean there. */
function nearestManifest(file: string, all: Manifest[]): Manifest | undefined {
  const abs = join(ROOT, file)
  return all
    .filter((m) => abs.startsWith(m.dir + sep))
    .sort((a, b) => b.dir.length - a.dir.length)[0]
}

describe('workspace entry points (ADR-033)', () => {
  const all = manifests()
  const byName = new Map(all.map((m) => [m.name, m]))
  const imported = importsInSource()

  it('finds a population to check', () => {
    expect(all.length).toBeGreaterThan(5)
    expect(all.flatMap((m) => Object.keys(m.exports)).length).toBeGreaterThan(15)
    expect(imported.length).toBeGreaterThan(50)
  })

  it.each(all.flatMap((m) => Object.entries(m.exports).map(([key, t]) => [m.name, key, m, t])))(
    '%s exports "%s" to a file that exists',
    (_name, key, m, target) => {
      const manifest = m as Manifest
      for (const t of targetsOf(manifest.name, key as string, target)) {
        expect(targetExists(manifest.dir, t), `${manifest.name} "${key}" -> ${t}`).toBe(true)
      }
    },
  )

  it.each(all.flatMap((m) => Object.entries(m.imports).map(([key, t]) => [m.name, key, m, t])))(
    '%s maps "%s" to a file that exists',
    (_name, key, m, target) => {
      const manifest = m as Manifest
      expect(key).toMatch(/^#/)
      for (const t of targetsOf(manifest.name, key as string, target)) {
        expect(targetExists(manifest.dir, t), `${manifest.name} "${key}" -> ${t}`).toBe(true)
      }
    },
  )

  it('every @xforge/… import names a declared export of a workspace package', () => {
    const undeclared: string[] = []
    for (const { file, specifier } of imported) {
      if (!specifier.startsWith('@xforge/')) {
        continue
      }
      const [scope, pkg, ...rest] = specifier.split('/')
      const manifest = byName.get(`${scope}/${pkg}`)
      if (!manifest) {
        undeclared.push(`${file}: '${specifier}' names no workspace package`)
        continue
      }
      const subpath = rest.length === 0 ? '.' : `./${rest.join('/')}`
      if (!isExported(manifest.exports, subpath)) {
        undeclared.push(`${file}: '${specifier}' is not a declared export of ${manifest.name}`)
      }
    }
    expect(undeclared).toEqual([])
  })

  /**
   * The vendored shadcn tree is not a surface. Derived from disk, not from a
   * list: every file that exists under `components/ui` must be unreachable
   * through the design manifest, so a broadened pattern or a dropped `null`
   * goes red here on the day it happens. (ADR-031 rule 7, ADR-033 rule 2.)
   */
  it('the vendored shadcn tree is unreachable through @xforge/design', () => {
    const design = byName.get('@xforge/design')
    if (!design) {
      throw new Error('no @xforge/design manifest -- nothing to check')
    }
    const vendored = readdirSync(join(design.dir, 'src/components/ui')).filter((f) =>
      f.endsWith('.tsx'),
    )
    expect(vendored.length).toBeGreaterThan(40)
    const reachable = vendored.filter((f) =>
      isExported(design.exports, `./components/ui/${f.replace(/\.tsx$/, '')}`),
    )
    expect(reachable).toEqual([])
  })

  it('every #… import is declared by the nearest manifest, and only used inside it', () => {
    const undeclared: string[] = []
    for (const { file, specifier } of imported) {
      if (!specifier.startsWith('#')) {
        continue
      }
      const manifest = nearestManifest(file, all)
      if (!manifest) {
        undeclared.push(`${file}: '${specifier}' is outside every workspace package`)
        continue
      }
      if (!Object.keys(manifest.imports).some((key) => keyMatches(key, specifier))) {
        undeclared.push(`${file}: '${specifier}' is not declared in ${manifest.name} "imports"`)
      }
    }
    expect(undeclared).toEqual([])
  })
})
