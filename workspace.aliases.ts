import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Alias } from 'vite'

/**
 * Workspace aliases, DERIVED from the package manifests that already declare
 * them. One owner, consumed by every config that resolves workspace modules:
 * the two Vitest configs and the conformance harness build.
 *
 * EXACT-MATCH regexes, not prefix strings.
 *
 * This was a hand-written list keyed by module specifier, and the ordering
 * mattered: '@xforge/db' is a prefix of '@xforge/db/postgres', so the general
 * entry had to come second or it swallowed the specific one. A comment said so.
 * Then a linter sorted the keys alphabetically, put the general entry first, and
 * every suite that imports the Postgres driver stopped resolving. The comment
 * was correct and unenforceable -- a sorter does not read prose. Anchoring each
 * pattern removes the ordering constraint altogether, which is better than
 * restoring an order something else can rearrange.
 *
 * WHY DERIVED, AND NOT MERELY SHARED. The hand-written list was itself a second
 * source: every entry restated an `exports` key from a package.json, and the
 * copy had already gone lossy -- seven declared exports (@xforge/db/schema,
 * @xforge/design/design.css, @xforge/hr/contract, @xforge/hr/manifest,
 * @xforge/design/tokens.css, @xforge/design/tokens.json) existed in the workspace
 * and in no alias table. `vite.harness.config.ts` then hand-copied four entries
 * out of THIS file and diverged in both directions, which is how it was found.
 *
 * Sharing the list would have fixed the harness and left the deeper copy in
 * place. A package's `exports` map is what Node and pnpm already obey; a table
 * that restates it is a fact with two sources, and the day they disagree the
 * suites resolve a different module graph than the application does.
 *
 * The topology is read too, from pnpm-workspace.yaml, for the same reason: a
 * package added tomorrow is covered without anyone remembering to extend a list.
 */
const ROOT = fileURLToPath(new URL('.', import.meta.url))

/**
 * Escape everything that is not a word character or `@`, rather than
 * enumerating which characters are "significant" -- that enumeration is a claim
 * about the specifier alphabet, and a wrong one silently produces a pattern
 * that matches more than the specifier it was built from.
 *
 * `RegExp.escape` would be the right answer and Node 24 has it, but the
 * repository compiles against `lib: ES2023`. Raising the lib for one call would
 * change which APIs every other file may reach for, which is a decision worth
 * more than this line.
 */
const exact = (specifier: string, absolute: string): Alias => ({
  find: new RegExp(`^${specifier.replace(/[^\w@]/g, (c) => `\\${c}`)}$`),
  replacement: absolute,
})

/** pnpm owns which directories are workspace packages. This only reads it. */
function workspaceGlobs(): string[] {
  const yaml = readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8')
  const block = /^packages:\n((?:[^\S\n]+(?:#[^\n]*|-[^\n]*)\n)+)/m.exec(yaml)
  const listed = block?.[1]
  if (!listed) {
    throw new Error('pnpm-workspace.yaml: no `packages:` block -- alias derivation has no source')
  }
  const globs = [...listed.matchAll(/^\s*-\s*'([^']+)'/gm)]
    .map((m) => m[1])
    .filter((g): g is string => g !== undefined)
  if (globs.length === 0) {
    throw new Error('pnpm-workspace.yaml: `packages:` listed nothing parseable')
  }
  return globs
}

function packageDirs(): string[] {
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
  return dirs.filter((d) => existsSync(join(d, 'package.json')))
}

/**
 * An `exports` target may be a string or a conditions object. Anything this
 * does not understand THROWS rather than being skipped: a silently dropped
 * alias is a suite resolving a different module, which is the failure this
 * whole file exists to prevent.
 */
function targetOf(name: string, sub: string, target: unknown): string {
  if (typeof target === 'string') {
    return target
  }
  if (target && typeof target === 'object') {
    const conditions = target as Record<string, unknown>
    for (const key of ['import', 'default', 'require']) {
      const value = conditions[key]
      if (typeof value === 'string') {
        return value
      }
    }
  }
  throw new Error(`${name} exports "${sub}" in a shape alias derivation does not understand`)
}

export const aliases: Alias[] = packageDirs()
  .flatMap((dir) => {
    const { name, exports } = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
      name?: string
      exports?: Record<string, unknown>
    }
    // An app (apps/web) declares no exports and contributes no alias.
    if (!(name && exports)) {
      return []
    }
    return Object.entries(exports).map(([sub, target]) => ({
      alias: exact(
        sub === '.' ? name : `${name}/${sub.replace(/^\.\//, '')}`,
        join(dir, targetOf(name, sub, target)),
      ),
      specifier: sub === '.' ? name : `${name}/${sub.replace(/^\.\//, '')}`,
    }))
  })
  .sort((a, b) => a.specifier.localeCompare(b.specifier))
  .map(({ alias }) => alias)
