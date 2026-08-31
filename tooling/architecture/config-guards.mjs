/**
 * Config guards -- invariants over configuration rather than source.
 *
 * Source guards police what code does. These police what the TOOLING IS
 * POINTED AT, which turns out to matter just as much: a gate whose result
 * depends on which stage ran first is worse than a slow gate, because it
 * teaches people to re-run until it passes.
 *
 * Each guard takes its inputs as an argument rather than reading the filesystem
 * itself, so it can be run against a deliberately-broken config in a test. A
 * config guard never observed to reject a bad config is exactly as
 * untrustworthy as a source guard never observed to reject bad source.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  classify,
  GENERATED_DIRS,
  GENERATED_FILES,
  GENERATED_PATHS,
  NON_SOURCE_DIRS,
  UNCOMMITTABLE,
} from '../source-universe.mjs'
import { posix, ROOT, read, run, sourceFiles } from '../verify/lib/util.mjs'

/**
 * Read JSON, tolerating comments only when genuinely needed.
 *
 * Stripping comments unconditionally CORRUPTS valid JSON: a glob containing the
 * two-character sequences that open and close a block comment makes a naive
 * stripper swallow everything up to the next pattern. That produced a false
 * positive against this file's own config. Parse strictly first; fall back only
 * for configs that really are JSONC.
 */
function readJsonc(rel) {
  const p = join(ROOT, rel)
  if (!existsSync(p)) return null
  const raw = readFileSync(p, 'utf8')
  try {
    return JSON.parse(raw)
  } catch {
    return JSON.parse(raw.replace(/(^|[^:"])\/\/.*$/gm, '$1'))
  }
}

/** The local fixture credential, assembled so this file does not contain the literal. */
export const FIXTURE_SECRET = ['app', 'user', 'dev', 'only'].join('_')

/** Where that credential may appear. Everywhere else reads a managed secret. */
export const SECRET_FIXTURE_ALLOWLIST = [
  // ONE fixture module owns the local URLs; everything that needs them imports
  // it. The list shrinks as things move there rather than growing an entry per
  // discovery -- a long allowlist is how a guard becomes a formality.
  'tests/fixtures/local-database.ts',
  // Provisioning artifacts, which cannot import TypeScript.
  'packages/db/bootstrap.sql',
  'tooling/verify/lib/migrate-check.mjs',
]

export const configGuards = [
  {
    id: 'deterministic-source-set',
    law: 29,
    title: 'Build and cache output can never enter source discovery',
    check(env) {
      const out = []

      if (env.biome) {
        const includes = (env.biome.files?.includes ?? []).join(' ')
        for (const d of NON_SOURCE_DIRS) {
          if (d === '.git') continue // biome never walks it
          if (!includes.includes(`!**/${d}`) && !includes.includes(`!${d}`)) {
            out.push({
              where: 'biome.json files.includes',
              message: `'${d}' is not excluded -- lint would depend on whether a build ran first`,
            })
          }
        }
      }

      if (env.biome) {
        // Generated state is type-checked and compiled, never formatted. A
        // formatter that rewrites it fights whatever regenerates it, and the
        // lint result then depends on which ran last. This is law 27 violated
        // by a tool rather than by a hand, and it is why the generated FILE
        // list exists beside the generated directory list.
        const includes = (env.biome.files?.includes ?? []).join(' ')
        const required = [
          ...GENERATED_DIRS.map((d) => ({ what: `generated directory '${d}'`, token: d })),
          ...GENERATED_FILES.map((f) => ({ what: `generated file '${f}'`, token: f })),
          ...GENERATED_PATHS.filter(
            (g) => !GENERATED_DIRS.some((d) => g.split('/').includes(d)),
          ).map((g) => ({ what: `generated path '${g}'`, token: g.split('/')[0] })),
        ]
        for (const { what, token } of required) {
          if (!includes.includes(`!**/${token}`) && !includes.includes(`!${token}`)) {
            out.push({
              where: 'biome.json files.includes',
              message: `${what} is not excluded -- the formatter would rewrite generated state`,
            })
          }
        }
      }

      if (env.tsconfig) {
        const exclude = (env.tsconfig.exclude ?? []).join(' ')
        for (const d of ['node_modules', '.next', 'dist']) {
          if (!exclude.includes(d)) {
            out.push({
              where: 'tsconfig.json exclude',
              message: `'${d}' is not excluded -- typecheck would read build output`,
            })
          }
        }
      }

      for (const d of NON_SOURCE_DIRS) {
        if (d === '.git') continue
        const re = new RegExp(`(^|\\n)/?${d.replace('.', '\\.')}/?\\s*($|\\n)`)
        if (!re.test(env.gitignore ?? '')) {
          out.push({
            where: '.gitignore',
            message: `'${d}' is not ignored -- build output could be committed`,
          })
        }
      }

      return out
    },
  },

  {
    id: 'no-committed-build-output',
    law: 29,
    title: 'No git-tracked file is classified as build or cache output',
    check(env) {
      // The decisive invariant, and the one that would have caught the
      // Playwright test-results incident from the same classification system
      // rather than from someone noticing it in a diff.
      return (env.trackedFiles ?? [])
        .filter((f) => UNCOMMITTABLE.includes(classify(f)))
        .map((f) => ({
          where: f,
          message: `tracked in git but classified as '${classify(f)}' -- build output must never be committed`,
        }))
    },
  },

  {
    id: 'no-shared-dev-secret',
    law: 29,
    title: 'The local fixture credential never escapes approved fixture locations',
    check(env) {
      // The danger is not the string. It is the string quietly becoming the
      // application's real credential because nobody remembered the warning.
      return (env.files ?? [])
        .filter((f) => !SECRET_FIXTURE_ALLOWLIST.includes(f.path))
        .filter((f) => f.source.includes(FIXTURE_SECRET))
        .map((f) => ({
          where: f.path,
          message:
            'contains the local fixture credential outside an approved location -- ' +
            'everywhere else must read it from managed secret storage',
        }))
    },
  },
]

/** Load the real configuration and run every config guard against it. */
export function scanConfig() {
  const gitignorePath = join(ROOT, '.gitignore')
  const exts = ['.ts', '.tsx', '.mts', '.js', '.mjs', '.sql', '.json', '.yaml', '.yml']
  const tracked = run('git', ['ls-files'])
  const env = {
    // Empty when git is unavailable; the guard then simply has nothing to check
    // rather than silently passing on a wrong assumption.
    trackedFiles:
      tracked.code === 0 ? tracked.out.split(String.fromCharCode(10)).filter(Boolean) : [],
    biome: readJsonc('biome.json'),
    tsconfig: readJsonc('tsconfig.json'),
    gitignore: existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf8') : '',
    // THE WHOLE REPOSITORY, not a list of roots someone must remember to
    // extend. A credential guard that cannot see a directory is a credential
    // guard that approves it, and the directory it cannot see is always the one
    // added last -- root-level config files, in this case. Source guards keep
    // their narrower roots: test code legitimately calls withTenant directly.
    files: sourceFiles(['.'], exts)
      .map(posix)
      .map((path) => ({ path, source: read(path) })),
  }

  const violations = []
  for (const g of configGuards) {
    for (const v of g.check(env)) violations.push({ guard: g.id, law: g.law, ...v })
  }
  return { violations, checked: configGuards.length }
}
