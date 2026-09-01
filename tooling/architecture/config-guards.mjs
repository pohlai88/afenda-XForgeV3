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
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  classify,
  GENERATED_DIRS,
  GENERATED_FILES,
  GENERATED_PATHS,
  NON_SOURCE_DIRS,
  OUTPUT_FILES,
  UNCOMMITTABLE,
} from '../source-universe.mjs'
import { COMMITTED_PHASE, PHASES, posix, ROOT, read, trackedFiles } from '../verify/lib/util.mjs'

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
  if (!existsSync(p)) {
    return null
  }
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

/**
 * ADRs written BEFORE law 34 existed.
 *
 * Grandfathered from immediate backfill -- re-citing twenty-two working
 * decisions is the standing audit this law is specifically not meant to become.
 * But NOT exempt forever: a decision that a phase materially depends on must be
 * evidence-backed before that phase is CERTIFIED.
 *
 * So the backfill is lazy and triggered by actual dependency. Committing
 * `currentPhase: tenancy` will demand evidence for the five decisions the
 * tenancy proof rests on, and not for the payroll ones, which nothing yet
 * relies on.
 */
const EVIDENCE_REQUIRED_BY_PHASE = {
  '003': 'tenancy', // shared-schema RLS, two chokepoints
  '006': 'payroll', // money representation
  '007': 'async', // transactional outbox
  '010': 'tenancy', // all authorisation in packages/policy
  '011': 'ai', // bounded AI tool generation
  '013': 'hr', // optimistic concurrency
  '015': 'tenancy', // one bound tenant per request
  '016': 'payroll', // time model
  '017': 'payroll', // period lock and retro adjustment
  '018': 'tenancy', // machine principals, revocation
  '019': 'tenancy', // permission lifecycle, fail-closed compilation
}

/** True while the phase that depends on this decision has not been certified. */
export function stillGrandfathered(name, committedPhase = COMMITTED_PHASE) {
  const [, n] = name.match(/^ADR-(\d{3})/) ?? []
  if (!n) {
    return false
  }
  const required = EVIDENCE_REQUIRED_BY_PHASE[n]
  if (!required) {
    return Number(n) <= 22 // pre-law, nothing depends on it yet
  }
  return PHASES.indexOf(committedPhase) < PHASES.indexOf(required)
}

export const configGuards = [
  {
    check(env) {
      const out = []

      if (env.biome) {
        const includes = (env.biome.files?.includes ?? []).join(' ')
        for (const d of NON_SOURCE_DIRS) {
          if (d === '.git') {
            continue // biome never walks it
          }
          if (!(includes.includes(`!**/${d}`) || includes.includes(`!${d}`))) {
            out.push({
              message: `'${d}' is not excluded -- lint would depend on whether a build ran first`,
              where: 'biome.jsonc files.includes',
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
          ...GENERATED_DIRS.map((d) => ({ token: d, what: `generated directory '${d}'` })),
          ...GENERATED_FILES.map((f) => ({ token: f, what: `generated file '${f}'` })),
          // Output FILES too. next-env.d.ts moved from generated to output when
          // it turned out its content records which command last ran -- and the
          // exclusion requirement moved with it, or the formatter would start
          // rewriting it again, which is the original ordering bug.
          ...OUTPUT_FILES.map((f) => ({ token: f, what: `build-output file '${f}'` })),
          ...GENERATED_PATHS.filter(
            (g) => !GENERATED_DIRS.some((d) => g.split('/').includes(d)),
          ).map((g) => ({ token: g.split('/')[0], what: `generated path '${g}'` })),
        ]
        for (const { what, token } of required) {
          if (!(includes.includes(`!**/${token}`) || includes.includes(`!${token}`))) {
            out.push({
              message: `${what} is not excluded -- the formatter would rewrite generated state`,
              where: 'biome.jsonc files.includes',
            })
          }
        }
      }

      if (env.tsconfig) {
        const exclude = (env.tsconfig.exclude ?? []).join(' ')
        for (const d of ['node_modules', '.next', 'dist']) {
          if (!exclude.includes(d)) {
            out.push({
              message: `'${d}' is not excluded -- typecheck would read build output`,
              where: 'tsconfig.json exclude',
            })
          }
        }
      }

      for (const d of NON_SOURCE_DIRS) {
        if (d === '.git') {
          continue
        }
        const re = new RegExp(`(^|\\n)/?${d.replace('.', '\\.')}/?\\s*($|\\n)`)
        if (!re.test(env.gitignore ?? '')) {
          out.push({
            message: `'${d}' is not ignored -- build output could be committed`,
            where: '.gitignore',
          })
        }
      }

      return out
    },
    id: 'deterministic-source-set',
    law: 29,
    title: 'Build and cache output can never enter source discovery',
  },

  {
    check(env) {
      // The decisive invariant, and the one that would have caught the
      // Playwright test-results incident from the same classification system
      // rather than from someone noticing it in a diff.
      return (env.trackedFiles ?? [])
        .filter((f) => UNCOMMITTABLE.includes(classify(f)))
        .map((f) => ({
          message: `tracked in git but classified as '${classify(f)}' -- build output must never be committed`,
          where: f,
        }))
    },
    id: 'no-committed-build-output',
    law: 29,
    title: 'No git-tracked file is classified as build or cache output',
  },

  {
    check(env) {
      // The danger is not the string. It is the string quietly becoming the
      // application's real credential because nobody remembered the warning.
      return (env.files ?? [])
        .filter((f) => !SECRET_FIXTURE_ALLOWLIST.includes(f.path))
        .filter((f) => f.source.includes(FIXTURE_SECRET))
        .map((f) => ({
          message:
            'contains the local fixture credential outside an approved location -- ' +
            'everywhere else must read it from managed secret storage',
          where: f.path,
        }))
    },
    id: 'no-shared-dev-secret',
    law: 29,
    title: 'The local fixture credential never escapes approved fixture locations',
  },
  {
    /**
     * `pnpm verify` cannot be the canonical definition of green while it means
     * two different things in two places. This diverged silently -- compose on
     * 17, the workflow on 16 -- and row-level security is precisely where major
     * versions differ, so the qualification suite would have been proving a
     * property of an engine the gate never runs.
     *
     * Matched on `image:` lines only: prose about a past mismatch is not a
     * mismatch, and a guard that cannot tell the two apart gets disabled.
     */
    check(env) {
      const imagesIn = (path) => {
        const f = (env.files ?? []).find((x) => x.path === path)
        if (!f) {
          return null
        }
        return [...f.source.matchAll(/^\s*image:\s*['"]?(postgres:[A-Za-z0-9._-]+)/gm)].map(
          (m) => m[1],
        )
      }
      const local = imagesIn('compose.yaml')
      const ci = imagesIn('.github/workflows/verify.yml')
      // Either side absent is a different problem than the two disagreeing.
      if (local === null || ci === null) {
        return []
      }
      if (local.length === 0 || ci.length === 0) {
        return []
      }

      const distinct = [...new Set([...local, ...ci])]
      return distinct.length === 1
        ? []
        : [
            {
              message:
                `the local fixture and .github/workflows/verify.yml disagree on the database image (${distinct.join(' vs ')}) -- ` +
                'a local green the gate cannot reproduce is not a green',
              where: 'compose.yaml',
            },
          ]
    },
    id: 'database-image-matches-ci',
    law: 32,
    title: 'The local fixture and the gate run the same database image',
  },
  {
    /**
     * NAMED FOR WHAT IT DOES. It checks that fields are PRESENT. It cannot tell
     * whether a source is good, whether it supports the claim, or whether
     * anyone read it -- that is review. `prior-art-verified` would have been a
     * guard whose green light meant more than it can deliver, and an
     * overclaiming name is worse than no guard at all.
     *
     * It catches the failure that actually happened: a decision frozen with no
     * evidence recorded anywhere.
     */
    check(env) {
      const out = []
      for (const { name, source } of env.adrs ?? []) {
        if (stillGrandfathered(name)) {
          continue
        }
        if (!/FROZEN/.test(source)) {
          continue
        }

        if (!/^##\s+Prior art/m.test(source)) {
          out.push({
            message: 'FROZEN with no Prior art section',
            where: `.architecture/adr/${name}`,
          })
          continue
        }
        const hasDated = /\|\s*20\d\d-\d\d-\d\d\s*\|/.test(source)
        const noMatch = /no-direct-match/.test(source)
        if (!(hasDated || noMatch)) {
          out.push({
            message: 'Prior art records no dated source and no explicit no-direct-match finding',
            where: `.architecture/adr/${name}`,
          })
        }
        if (!/does NOT prove/i.test(source)) {
          out.push({
            message:
              'no "what prior art does NOT prove" section -- precedent qualifies the ' +
              'pattern, never this implementation',
            where: `.architecture/adr/${name}`,
          })
        }
      }
      return out
    },
    id: 'adr-has-evidence',
    law: 34,
    title: 'A FROZEN decision records the prior art it was checked against',
  },
  {
    /**
     * The sixth appearance of one defect: a fact with two homes and no check
     * that they agree.
     *
     * The suite needs DATABASE_URL and APP_DATABASE_URL. That requirement lived
     * only inside `process.env.X ?? fallback` expressions, so the workflow
     * restated it by hand -- and got it wrong. APP_DATABASE_URL was missing, the
     * fallback pointed at a developer port, and every stage that connects as
     * app_user would have reported BLOCKED. `--ci` turns that into a failure,
     * so the gate was right; it just could not say why.
     *
     * `REQUIRED_DATABASE_ENV` in tests/fixtures/local-database.ts is now the one
     * declaration, and this asserts the workflow provides all of it. Reading the
     * declaration rather than restating the names is the whole point: a guard
     * with its own copy of the list is the defect it is meant to catch.
     */
    check(env) {
      const fixture = (env.files ?? []).find((f) => f.path === 'tests/fixtures/local-database.ts')
      const workflow = (env.files ?? []).find((f) => f.path === '.github/workflows/verify.yml')
      if (!(fixture && workflow)) {
        return []
      }

      const block = fixture.source.match(/REQUIRED_DATABASE_ENV\s*=\s*\{([\s\S]*?)\}\s*as const/)
      if (!block) {
        return [
          {
            message:
              'REQUIRED_DATABASE_ENV is missing -- the environment contract must be ' +
              'declared in one place or CI has to guess it',
            where: 'tests/fixtures/local-database.ts',
          },
        ]
      }

      const required = [...block[1].matchAll(/^\s*([A-Z][A-Z0-9_]*)\s*:/gm)].map((m) => m[1])
      // The workflow's own `env:` block, not the whole file: a variable named
      // only in a comment is not a variable that is set.
      const provided = new Set(
        [...workflow.source.matchAll(/^\s{4,}([A-Z][A-Z0-9_]*)\s*:\s*\S/gm)].map((m) => m[1]),
      )

      return required
        .filter((name) => !provided.has(name))
        .map((name) => ({
          message:
            `does not set ${name}, which the qualification suite requires. Without ` +
            'it the suite falls back to a developer URL and reports an unreachable ' +
            'database instead of a missing variable',
          where: '.github/workflows/verify.yml',
        }))
    },
    id: 'ci-provides-fixture-env',
    law: 32,
    title: 'CI supplies every environment variable the qualification suite declares',
  },

  {
    /**
     * Test scaffolding never enters a production dependency closure.
     *
     * `@xforge/fixtures` sat in `dependencies` of packages/db and modules/hr,
     * imported by nothing but their tests. Nothing in the repository could say
     * so. Biome's `noUndeclaredDependencies` answers the opposite question --
     * imported but not declared -- and is silent about declared in the wrong
     * section, so a test-only package rode in the shipped closure of two
     * production packages while every gate stayed green.
     *
     * WHICH PACKAGES ARE FIXTURES IS DERIVED, never listed. `classify()` already
     * decides whether a path is test material, and a manifest under tests/ makes
     * its package test material. A fixture package added tomorrow is covered
     * without anyone remembering to extend a pattern.
     *
     * NARROW ON PURPOSE, and this is the interesting part. The general rule --
     * every production dependency must be imported by some production file --
     * was measured against this repository before being rejected: it flags
     * react-dom, @xforge/tokens (consumed as CSS, never imported), and several
     * type-only imports. Seven legitimate declarations, which would have had to
     * be silenced with exemptions until the guard's name meant nothing. A guard
     * that must be muzzled to stay green is the depcruise failure with extra
     * steps.
     *
     * So this asks the question that has a decidable answer. It would have
     * caught the real defect and it has no false positive to excuse.
     */
    check(env) {
      const manifests = (env.files ?? []).filter((f) => f.path.endsWith('package.json'))
      const parse = (source) => {
        try {
          return JSON.parse(source)
        } catch {
          return null
        }
      }

      const fixtures = new Set()
      for (const m of manifests) {
        if (classify(m.path) !== 'test') {
          continue
        }
        const name = parse(m.source)?.name
        if (name) {
          fixtures.add(name)
        }
      }

      const out = []
      for (const m of manifests) {
        for (const dep of Object.keys(parse(m.source)?.dependencies ?? {})) {
          if (fixtures.has(dep)) {
            out.push({
              message:
                `'${dep}' is test material and is declared under dependencies -- ` +
                'test scaffolding must not sit in a production closure; move it to devDependencies',
              where: m.path,
            })
          }
        }
      }
      return out
    },
    id: 'fixtures-are-not-production-dependencies',
    law: 29,
    title: 'Test fixtures never enter a production dependency closure',
  },
  {
    /**
     * `pnpm-workspace.yaml` states the rule -- "ONE VERSION PER DEPENDENCY,
     * declared here and referenced as `catalog:`" -- and nothing enforced it.
     *
     * `catalogMode: strict` looks like the enforcement and is not. Measured on
     * pnpm 11.20.0: `pnpm install` and `pnpm up` leave inline versions alone;
     * `pnpm up --latest` REWRITES every repeated inline dependency to
     * `catalog:` and adds the entry itself. So the setting is not inert, it is
     * DEFERRED -- and when it fires it catalogues everything at once, inside a
     * commit whose stated purpose is a version bump.
     *
     * Six dependencies were in that state when this guard was written: hono in
     * three manifests, react in three, and react-dom, zod,
     * @tanstack/react-query and msw in two each. Every one resolved to a single
     * version, which is the hazard rather than a mitigation of it -- agreement
     * is indistinguishable from correctness right up to the moment it ends.
     * @hono/zod-openapi was catalogued precisely because two sources for one
     * contract library mattered; `hono` itself, underneath it, was not.
     *
     * NOT CHECKED HERE: whether a `catalog:` reference has a catalog entry.
     * pnpm already fails that with CATALOG_ENTRY_NOT_FOUND_FOR_SPEC, and a
     * second copy of that rule is the defect this guard exists to prevent.
     */
    check(env) {
      // peerDependencies are deliberately WIDER than dependency ranges -- a
      // peer range is a compatibility claim, not a statement about what this
      // workspace installs -- so collapsing them into one version would be
      // wrong. No manifest declares any today, which is why the rule below can
      // stay simple. If one appears, that assumption has expired and the
      // decision must be made explicitly rather than inherited from silence.
      const SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies']
      // Specifiers that name a location rather than a version. A catalog entry
      // cannot hold them (pnpm rejects workspace:, file: and link: as catalog
      // values), so they are outside this rule by construction.
      const LOCAL = ['workspace:', 'file:', 'link:', 'catalog:']

      const parse = (source) => {
        try {
          return JSON.parse(source)
        } catch {
          return null
        }
      }

      const out = []
      const occurrences = new Map()
      for (const m of (env.files ?? []).filter((f) => f.path.endsWith('package.json'))) {
        const pkg = parse(m.source)
        if (!pkg) {
          continue
        }
        if (Object.keys(pkg.peerDependencies ?? {}).length > 0) {
          out.push({
            message:
              'declares peerDependencies -- this guard covers ' +
              `${SECTIONS.join('/')} only, because a peer range is a compatibility ` +
              'claim rather than an installed version. Decide explicitly whether ' +
              'peers join the catalog, and widen this guard with that decision',
            where: m.path,
          })
        }
        for (const section of SECTIONS) {
          for (const [name, spec] of Object.entries(pkg[section] ?? {})) {
            if (typeof spec !== 'string') {
              continue
            }
            occurrences.set(name, [...(occurrences.get(name) ?? []), { path: m.path, spec }])
          }
        }
      }

      for (const [name, rows] of occurrences) {
        if (rows.length < 2) {
          continue
        }
        for (const row of rows) {
          if (LOCAL.some((p) => row.spec.startsWith(p))) {
            continue
          }
          out.push({
            message:
              `'${name}' is declared in ${rows.length} workspace manifests and this one ` +
              `pins '${row.spec}' inline -- a dependency with more than one declaration ` +
              "must read 'catalog:' so the version has a single source",
            where: row.path,
          })
        }
      }
      return out
    },
    id: 'shared-dependency-uses-catalog',
    law: 7,
    title: 'A dependency declared by more than one package reads its version from the catalog',
  },
  {
    /**
     * `workspace.aliases.ts` derives module resolution from the `exports` maps
     * the manifests already declare, and says why: "A package's `exports` map is
     * what Node and pnpm already obey; a table that restates it is a fact with
     * two sources, and the day they disagree the suites resolve a different
     * module graph than the application does."
     *
     * That derivation reached the two Vitest configs and the harness build. It
     * never reached `tsconfig.json`, which kept a hand-written `paths` map --
     * the fifth consumer, and the only one still holding a list.
     *
     * It had gone lossy exactly as predicted. At the commit this guard was
     * written against, 22 TS-resolvable specifiers were declared across the
     * manifests and `paths` carried 16. Missing: @xforge/db/schema,
     * @xforge/ui/schema, @xforge/hr/contract, @xforge/hr/manifest,
     * @xforge/fixtures/employee and @xforge/fixtures/hr. So sixteen specifiers
     * resolved by relative-path alias and six by package lookup, inside one
     * program, and nothing could report it.
     *
     * TypeScript's own module-resolution reference states the rule this
     * enforces, under the heading "paths should not point to monorepo packages
     * or node_modules packages": a matched alias resolves as a RELATIVE PATH
     * rather than a package lookup, which bypasses `exports` and overrides
     * `main`/`types`/`exports`. The recommendation is to let the workspace
     * manager's symlinks carry it so every consumer performs the same lookup.
     *
     * MEASURED BEFORE DELETING, because "the docs say so" is not evidence about
     * this repository: with `paths` removed, `tsc --noEmit` and `next build`
     * both exit 0, `--listFiles` reports a byte-identical program (1898 files,
     * 98 outside node_modules), and `--traceResolution` shows '@xforge/ui'
     * resolving to packages/ui/src/index.tsx -- source, not a built .d.ts. No
     * workspace package has a dist/, so there is nothing for it to resolve to.
     *
     * DERIVED, NOT PREFIXED. The first draft rejected keys matching `@xforge/*`.
     * That is a new implicit fact -- "@xforge/ means workspace package" -- of
     * exactly the kind this guard exists to remove, and it would miss a package
     * scoped differently tomorrow. The manifests decide.
     *
     * PATTERN-AWARE, NOT A SET INTERSECTION. A `paths` key is itself a pattern:
     * a key of '@xforge/' followed by a star shadows every workspace specifier
     * while intersecting none of them as a string. Matching follows
     * TypeScript's own rule -- at most one star, matching any substring,
     * otherwise exact.
     */
    check(env) {
      // Every consumer of this rule reads the manifests. So does the rule.
      const specifiers = []
      for (const m of (env.files ?? []).filter(
        (f) => f.path.endsWith('package.json') && f.path !== 'package.json',
      )) {
        let pkg
        try {
          pkg = JSON.parse(m.source)
        } catch {
          continue
        }
        if (!pkg?.name) {
          continue
        }
        specifiers.push(pkg.name)
        for (const sub of Object.keys(pkg.exports ?? {})) {
          if (sub !== '.') {
            specifiers.push(`${pkg.name}/${sub.replace(/^\.\//, '')}`)
          }
        }
      }

      // A guard handed nothing reports PASS. Say so instead.
      if (specifiers.length === 0) {
        return [
          {
            message:
              'no workspace package manifests were offered, so this guard cannot ' +
              'know what a workspace specifier is -- it would approve every ' +
              'paths entry by having nothing to compare them against',
            where: 'package manifests',
          },
        ]
      }

      /** TypeScript's `paths` matching: at most one `*`, matching any substring. */
      const shadows = (pattern, specifier) => {
        const star = pattern.indexOf('*')
        if (star === -1) {
          return pattern === specifier
        }
        const prefix = pattern.slice(0, star)
        const suffix = pattern.slice(star + 1)
        return (
          specifier.length >= prefix.length + suffix.length &&
          specifier.startsWith(prefix) &&
          specifier.endsWith(suffix)
        )
      }

      const out = []
      for (const m of (env.files ?? []).filter((f) => /(^|\/)tsconfig[^/]*\.json$/.test(f.path))) {
        let cfg
        try {
          cfg = JSON.parse(m.source)
        } catch {
          // A tsconfig this guard cannot parse is not a tsconfig it may ignore.
          out.push({
            message: 'is not parseable JSON, so its paths map cannot be checked',
            where: m.path,
          })
          continue
        }
        for (const key of Object.keys(cfg?.compilerOptions?.paths ?? {})) {
          const shadowed = specifiers.filter((s) => shadows(key, s))
          if (shadowed.length === 0) {
            continue
          }
          out.push({
            message:
              `compilerOptions.paths["${key}"] shadows ${shadowed.length} workspace ` +
              `specifier(s) -- ${shadowed.slice(0, 3).join(', ')}` +
              `${shadowed.length > 3 ? ', ...' : ''}. A matched alias resolves as a ` +
              'relative path rather than a package lookup, which bypasses the ' +
              "package's exports map. pnpm already symlinks the workspace; delete " +
              'the entry and let the package resolve as a package',
            where: m.path,
          })
        }
      }
      return out
    },
    id: 'workspace-packages-resolve-as-packages',
    law: 7,
    title: 'A tsconfig paths alias never shadows a workspace package or its declared exports',
  },
  {
    /**
     * TWO RUNNERS, ONE MIGRATION SET, AND THEY DISAGREED.
     *
     * `migrate-check.mjs` globs `packages/db/migrations/*.sql` and sorts. Drizzle
     * reads `meta/_journal.json` and applies only what it lists. The journal
     * listed `0000_init` alone while four migrations existed on disk, because
     * ADR-021 requires forward-reviewed SQL and 0001-0003 were therefore
     * hand-written -- and drizzle-kit only journals what drizzle-kit generates.
     *
     * Both were GREEN. The migration stage reported "4 migrations apply cleanly
     * to a fresh database", which was true and was measured against its own
     * glob. `drizzle-kit migrate` against the same repository produced ONE
     * table. A developer provisioning a database the drizzle way got a schema
     * with no `tenant`, no `tenant_domain`, no `tenant_membership` and none of
     * the FORCE ROW LEVEL SECURITY that law 11 requires -- and nothing said so,
     * because neither runner can see the other.
     *
     * This is the defect CLAUDE.md names: a fact acquires a second source, the
     * two agree until they do not, and nothing complains in between. Here they
     * never even agreed -- they simply never met.
     *
     * The rule is deliberately SYMMETRIC. A .sql with no entry is skipped by
     * drizzle; an entry with no .sql makes drizzle fail outright. Checking one
     * direction would leave the other free to drift, which is how this arrived.
     *
     * NOT CHECKED HERE, and worth stating because a guard whose name overclaims
     * is worse than none: this proves the two runners see the SAME SET. It
     * proves nothing about whether the SQL is correct, and nothing about
     * `drizzle-kit generate`, which still diffs against `meta/*_snapshot.json`
     * that hand-written migrations never produce. Measured: `generate` today
     * emits a file whose name collides with 0001, re-creates three existing
     * tables and carries no FORCE ROW LEVEL SECURITY at all. Reviewing
     * generated SQL is permitted by ADR-021; applying it unread is exactly what
     * that ADR rejects, and this guard is not what would catch it.
     */
    check(env) {
      const MIG = 'packages/db/migrations/'
      const files = env.files ?? []

      const sql = files
        .filter((f) => f.path.startsWith(MIG) && f.path.endsWith('.sql'))
        .map((f) => f.path.slice(MIG.length).replace(/\.sql$/, ''))

      const journalFile = files.find((f) => f.path === `${MIG}meta/_journal.json`)
      if (sql.length === 0) {
        // No migrations yet is a legitimate state; a journal without them is not.
        return journalFile
          ? [
              {
                message:
                  'a drizzle journal exists but no .sql migrations do -- drizzle would ' +
                  'fail on every entry it lists',
                where: `${MIG}meta/_journal.json`,
              },
            ]
          : []
      }
      if (!journalFile) {
        return [
          {
            message:
              `${sql.length} migration(s) exist with no meta/_journal.json -- ` +
              '`drizzle-kit migrate` would apply NOTHING while the migration stage ' +
              'applies all of them, and both would report success',
            where: MIG,
          },
        ]
      }

      let journal
      try {
        journal = JSON.parse(journalFile.source)
      } catch {
        return [
          {
            message: 'is not parseable JSON, so the migration set has no second half to compare',
            where: journalFile.path,
          },
        ]
      }

      const tags = (journal.entries ?? []).map((e) => e.tag)
      const out = []
      for (const tag of sql) {
        if (!tags.includes(tag)) {
          out.push({
            message:
              `${tag}.sql is on disk but absent from meta/_journal.json -- the ` +
              'migration stage applies it and `drizzle-kit migrate` skips it, so the ' +
              'two runners build different schemas and both report success',
            where: journalFile.path,
          })
        }
      }
      for (const tag of tags) {
        if (!sql.includes(tag)) {
          out.push({
            message:
              `meta/_journal.json lists '${tag}' with no matching ${tag}.sql on disk -- ` +
              '`drizzle-kit migrate` fails outright on a missing file',
            where: journalFile.path,
          })
        }
      }
      return out
    },
    id: 'migration-set-has-one-authority',
    law: 28,
    title: 'Every migration on disk is journalled, and every journal entry has a migration',
  },
  {
    /**
     * THE THIRD RESTATEMENT OF WORKSPACE MEMBERSHIP, and the third to go lossy.
     *
     * `next.config.mjs` listed seven workspace packages by hand. Eight are
     * declared. `@xforge/tenancy` was the missing one -- and it is IMPORTED, at
     * apps/web/app/api/[[...route]]/route.ts, for `resolveRequestTenant`. The
     * build stayed green only because that import is server-only, so the list
     * and the truth agreed by coincidence and would have parted on the first
     * client-side import.
     *
     * Same shape as the `tsconfig.json` paths map and the vite alias table
     * before it: a hand-written copy of something the manifests already declare.
     *
     * DELETED RATHER THAN DERIVED, which is why this guard forbids the entry
     * instead of checking the list is complete. Turbopack transpiles workspace
     * packages in a pnpm monorepo automatically, and Next 16 uses Turbopack for
     * `dev` and `build`. Measured before removing it: with the whole array gone,
     * `next build` succeeds, `pnpm verify` is FULL GREEN including 49 E2E specs
     * that exercise the route importing @xforge/tenancy, and the per-route
     * budget is BYTE-IDENTICAL at 32,502 B spare. The list changed nothing; it
     * only had to be kept correct.
     *
     * THE DISCRIMINATOR IS THE `workspace:` PROTOCOL, not an `@xforge/` prefix.
     * A prefix rule would mint a new implicit fact -- "@xforge/ means workspace
     * package" -- of exactly the kind this guard family removes, and would miss
     * a package scoped differently tomorrow. The app's own manifest already
     * declares which dependencies are workspace ones, and it is the source that
     * would have caught the omission: it lists all eight, including tenancy.
     *
     * NOT A BAN ON THE FIELD. `transpilePackages` remains legitimate for a
     * published npm package shipping untranspiled source, which is what it is
     * for. Only workspace packages are forbidden, because only those does the
     * bundler already own.
     */
    check(env) {
      const files = env.files ?? []
      const out = []

      for (const cfg of files.filter((f) => /(^|\/)next\.config\.[mc]?[jt]s$/.test(f.path))) {
        const array = /transpilePackages\s*:\s*\[([\s\S]*?)\]/.exec(cfg.source)
        if (!array) {
          continue
        }
        const listed = [...array[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1])
        if (listed.length === 0) {
          continue
        }

        // The manifest beside the config decides what a workspace package is.
        const dir = cfg.path.slice(0, cfg.path.lastIndexOf('/'))
        const manifest = files.find((f) => f.path === `${dir}/package.json`)
        if (!manifest) {
          out.push({
            message:
              'declares transpilePackages but has no sibling package.json, so this guard ' +
              'cannot tell a workspace package from a published one -- it would approve ' +
              'every entry by having nothing to compare them against',
            where: cfg.path,
          })
          continue
        }
        let pkg
        try {
          pkg = JSON.parse(manifest.source)
        } catch {
          out.push({ message: 'is not parseable JSON', where: manifest.path })
          continue
        }
        const workspaceDeps = new Set(
          Object.entries({
            ...(pkg.dependencies ?? {}),
            ...(pkg.devDependencies ?? {}),
          })
            .filter(([, spec]) => typeof spec === 'string' && spec.startsWith('workspace:'))
            .map(([name]) => name),
        )

        for (const name of listed) {
          if (workspaceDeps.has(name)) {
            out.push({
              message:
                `transpilePackages lists '${name}', which ${manifest.path} declares with the ` +
                'workspace: protocol. Turbopack transpiles workspace packages automatically, ' +
                'so the entry restates a fact the bundler already owns -- and a hand-kept ' +
                'copy of workspace membership has gone lossy here twice before. Remove it',
              where: cfg.path,
            })
          }
        }
      }
      return out
    },
    id: 'workspace-packages-are-not-hand-transpiled',
    law: 7,
    title: 'next.config never restates workspace membership that the bundler already owns',
  },
]

/** Load the real configuration and run every config guard against it. */
export function scanConfig() {
  const gitignorePath = join(ROOT, '.gitignore')
  const exts = ['.ts', '.tsx', '.mts', '.js', '.mjs', '.sql', '.json', '.yaml', '.yml']
  // ONE ENUMERATION, shared with the source guards.
  //
  // This was a filesystem walk from '.', excluding NON_SOURCE_DIRS. The
  // reasoning above it is right -- a credential guard that cannot see a
  // directory is a credential guard that approves it -- but "the whole
  // repository" was implemented as "whatever is on disk", and the disk grew a
  // second repository: a linked git worktree under .claude/worktrees holds a
  // complete copy, and the walk scanned it and reported the fixture credential
  // twice, in a checkout this index does not contain.
  //
  // `trackedFiles()` IS the whole repository, by definition, and a linked
  // worktree is excluded by construction rather than by an exclusion list
  // somebody has to extend. The two universes were five lines apart in this one
  // function -- `env.trackedFiles` below already used git.
  const { files: tracked } = trackedFiles()
  const env = {
    adrs: existsSync(join(ROOT, '.architecture/adr'))
      ? readdirSync(join(ROOT, '.architecture/adr'))
          .filter((f) => /^ADR-\d{3}.*\.md$/.test(f))
          .map((name) => ({
            name,
            source: readFileSync(join(ROOT, '.architecture/adr', name), 'utf8'),
          }))
      : [],
    biome: readJsonc('biome.jsonc'),
    // THE WHOLE REPOSITORY, not a list of roots someone must remember to
    // extend. A credential guard that cannot see a directory is a credential
    // guard that approves it, and the directory it cannot see is always the one
    // added last -- root-level config files, in this case. Source guards keep
    // their narrower roots: test code legitimately calls withTenant directly.
    files: tracked
      .filter((f) => exts.some((e) => f.endsWith(e)))
      .map(posix)
      .map((path) => ({ path, source: read(path) })),
    gitignore: existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf8') : '',
    // The same enumeration, unfiltered. `trackedFiles()` throws when git is
    // unavailable rather than yielding an empty set, because a guard handed
    // nothing reports PASS.
    trackedFiles: tracked,
    tsconfig: readJsonc('tsconfig.json'),
  }

  const violations = []
  for (const g of configGuards) {
    for (const v of g.check(env)) {
      violations.push({ guard: g.id, law: g.law, ...v })
    }
  }
  return { checked: configGuards.length, violations }
}
