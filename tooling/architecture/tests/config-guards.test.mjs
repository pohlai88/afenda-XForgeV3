/**
 * Mutation tests for the config guards.
 *
 * These guards exist because the lint stage was ORDER-DEPENDENT: it passed on a
 * clean checkout, the build stage wrote .turbo and .next artifacts, and it then
 * failed on the same commit. Whether verify was green depended on whether build
 * had run first.
 *
 * Each guard is exercised against a deliberately-broken config. A config guard
 * never observed to reject a bad config is exactly as untrustworthy as a source
 * guard never observed to reject bad source.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { NON_SOURCE_DIRS } from '../../source-universe.mjs'
import { ROOT } from '../../verify/lib/util.mjs'
import {
  configGuards,
  FIXTURE_SECRET,
  SECRET_FIXTURE_ALLOWLIST,
  scanConfig,
  stillGrandfathered,
} from '../config-guards.mjs'
// The clean environment is the mutation harness's, not a second copy. This file
// rebuilt it character for character, so a change to what "satisfied" means
// reached one and not the other.
import { cleanEnv } from '../fixtures/families.mjs'

const byId = (id) => {
  const g = configGuards.find((x) => x.id === id)
  if (!g) {
    throw new Error(`no config guard '${id}'`)
  }
  return g
}

describe('deterministic-source-set', () => {
  const guard = byId('deterministic-source-set')

  it('accepts a config that excludes every non-source directory', () => {
    expect(guard.check(cleanEnv())).toHaveLength(0)
  })

  it('REJECTS a Biome config that would FORMAT a build-output file', () => {
    // The concrete case: Biome rewrote next-env.d.ts, Next's build wrote it
    // back, and lint passed or failed depending on which ran last.
    const env = cleanEnv()
    env.biome.files.includes = env.biome.files.includes.filter((p) => !p.includes('next-env.d.ts'))
    const found = guard.check(env)
    expect(found.length).toBeGreaterThan(0)
    expect(found[0].message).toContain('generated state')
  })

  it('REJECTS a Biome config that would format the published contract', () => {
    const env = cleanEnv()
    env.biome.files.includes = env.biome.files.includes.filter((p) => p !== '!!contracts')
    expect(guard.check(env).length).toBeGreaterThan(0)
  })

  it('REJECTS a Biome config that would lint build output', () => {
    const env = cleanEnv()
    env.biome.files.includes = env.biome.files.includes.filter((p) => !p.includes('.turbo'))
    const found = guard.check(env)
    expect(found.length).toBeGreaterThan(0)
    expect(found[0]?.message).toMatch(/whether a build ran first/)
  })

  it('REJECTS an exclusion that is present but OVERRIDABLE', () => {
    // Every name is still listed. `!` is merged past by the preset's `**`,
    // which is how apps/web/.next came back once already -- so listing the name
    // and excluding it are different claims, and the guard used to accept the
    // first as proof of the second.
    const env = cleanEnv()
    env.biome.files.includes = env.biome.files.includes.map((p) => p.replace(/^!!/, '!'))
    const found = guard.check(env)
    expect(found.length).toBeGreaterThan(0)
    expect(found.every((v) => v.message.includes('force-ignored'))).toBe(true)
  })

  it('does not let a longer name answer for a shorter one', () => {
    // Substring-matched against the joined list, `!!**/distribution` contained
    // `!!**/dist` and satisfied the requirement for `dist`.
    const env = cleanEnv()
    env.biome.files.includes = env.biome.files.includes.map((p) =>
      p === '!!**/dist' ? '!!**/distribution' : p,
    )
    expect(guard.check(env).some((v) => v.message.includes("'dist'"))).toBe(true)
  })

  it('REJECTS a tsconfig that would typecheck build output', () => {
    const env = cleanEnv()
    env.tsconfig.exclude = []
    expect(guard.check(env).some((v) => v.where.includes('tsconfig'))).toBe(true)
  })

  it('REJECTS a .gitignore that would let build output be committed', () => {
    const env = cleanEnv()
    env.gitignore = ''
    expect(guard.check(env).some((v) => v.where === '.gitignore')).toBe(true)
  })

  it('catches EVERY non-source directory, not just the ones we happened to hit', () => {
    // The original bug was discovered one directory at a time. This asserts the
    // guard covers the whole declared universe, so the next tool that writes
    // into the workspace is caught by construction rather than by incident.
    for (const d of NON_SOURCE_DIRS.filter((x) => x !== '.git')) {
      const env = cleanEnv()
      env.biome.files.includes = env.biome.files.includes.filter((p) => !p.includes(d))
      env.gitignore = env.gitignore
        .split('\n')
        .filter((l) => l !== `${d}/`)
        .join('\n')
      expect(guard.check(env).length, `'${d}' slipped through`).toBeGreaterThan(0)
    }
  })
})

describe('no-shared-dev-secret', () => {
  const guard = byId('no-shared-dev-secret')

  it('permits the credential in an approved fixture location', () => {
    const env = {
      files: SECRET_FIXTURE_ALLOWLIST.map((path) => ({ path, source: FIXTURE_SECRET })),
    }
    expect(guard.check(env)).toHaveLength(0)
  })

  it('REJECTS the credential anywhere else', () => {
    const env = {
      files: [{ path: 'packages/api/src/app.ts', source: `const pw = '${FIXTURE_SECRET}'` }],
    }
    const found = guard.check(env)
    expect(found).toHaveLength(1)
    expect(found[0]?.message).toMatch(/managed secret storage/)
  })

  it('ignores files that do not contain it', () => {
    const env = { files: [{ path: 'packages/api/src/app.ts', source: 'const pw = env.PASSWORD' }] }
    expect(guard.check(env)).toHaveLength(0)
  })
})

describe('database-image-matches-ci', () => {
  const guard = byId('database-image-matches-ci')

  const envWith = (localImage, ciImage) => ({
    files: [
      { path: 'compose.yaml', source: `services:\n  postgres:\n    image: ${localImage}\n` },
      {
        path: '.github/workflows/verify.yml',
        source: `    services:\n      postgres:\n        image: ${ciImage}\n`,
      },
    ],
  })

  it('permits the two agreeing', () => {
    expect(guard.check(envWith('postgres:17-alpine', 'postgres:17-alpine'))).toHaveLength(0)
  })

  it('REJECTS a major-version split -- the divergence this was written for', () => {
    const found = guard.check(envWith('postgres:17-alpine', 'postgres:16'))
    expect(found).toHaveLength(1)
    expect(found[0]?.message).toMatch(/cannot reproduce/)
  })

  it('REJECTS a variant split, which changes the engine just as quietly', () => {
    expect(guard.check(envWith('postgres:17-alpine', 'postgres:17'))).toHaveLength(1)
  })

  it('does not trip on prose that merely mentions another version', () => {
    const env = envWith('postgres:17-alpine', 'postgres:17-alpine')
    env.files[0].source = `# this said postgres:16 once, and diverged\n${env.files[0].source}`
    expect(guard.check(env)).toHaveLength(0)
  })

  it('stays silent when a file is absent -- that is a different problem', () => {
    expect(guard.check({ files: [] })).toHaveLength(0)
    const onlyLocal = envWith('postgres:17-alpine', 'postgres:16')
    onlyLocal.files.pop()
    expect(guard.check(onlyLocal)).toHaveLength(0)
  })

  it('holds against the real repository', () => {
    const found = scanConfig().violations.filter((v) => v.guard === 'database-image-matches-ci')
    expect(found).toHaveLength(0)
  })
})

describe('the real repository satisfies both guards', () => {
  it('scanConfig reports no violations', () => {
    expect(scanConfig().violations).toEqual([])
  })
})

describe('evidence backfill is lazy, and triggered by dependency', () => {
  it('grandfathers a pre-law decision while nothing depends on it', () => {
    expect(stillGrandfathered('ADR-003-rls-tenancy.md', 'spine')).toBe(true)
    expect(stillGrandfathered('ADR-006-money.md', 'tenancy')).toBe(true)
  })

  it('STOPS grandfathering once the phase that rests on it is certified', () => {
    // The point: committing `currentPhase: tenancy` demands evidence for the
    // decisions the tenancy proof actually rests on -- and only those.
    expect(stillGrandfathered('ADR-003-rls-tenancy.md', 'tenancy')).toBe(false)
    expect(stillGrandfathered('ADR-015-bound-tenant.md', 'tenancy')).toBe(false)
    expect(stillGrandfathered('ADR-006-money.md', 'payroll')).toBe(false)
  })

  it('never grandfathers a decision written after the law', () => {
    expect(stillGrandfathered('ADR-024-structural-guards-stay-custom.md', 'spine')).toBe(false)
  })
})

describe('the tenancy phase can be certified without tripping law 34', () => {
  const adrs = readdirSync(join(ROOT, '.architecture/adr'))
    .filter((f) => /^ADR-[0-9]{3}.*[.]md$/.test(f))
    .map((name) => ({
      name,
      source: readFileSync(join(ROOT, '.architecture/adr', name), 'utf8'),
    }))

  it('names the decisions the tenancy proof rests on', () => {
    const due = adrs.filter((a) => !stillGrandfathered(a.name, 'tenancy')).map((a) => a.name)
    expect(due.length).toBeGreaterThan(0)
    for (const n of ['ADR-003', 'ADR-010', 'ADR-015', 'ADR-018', 'ADR-019']) {
      expect(
        due.some((d) => d.startsWith(n)),
        `${n} should be due at tenancy`,
      ).toBe(true)
    }
  })

  it('and every one of them already carries its evidence', () => {
    // Checked BEFORE the phase advances. Discovering the gate cannot be
    // satisfied at the moment of certification would mean either backfilling
    // under pressure or waiving the law -- and a law waived once is a law.
    //
    // THIS ASKS THE GUARD. It used to re-derive the guard's three regexes
    // character-for-character and test its own copy, so changing the rule left
    // the test green: a fact with two homes, checked by neither. The rejection
    // half now lives in the mutation fixture, and this is the acceptance half --
    // the real ADR set, through the real rule.
    expect(byId('adr-has-evidence').check({ adrs })).toEqual([])
  })
})

describe('shared-dependency-uses-catalog', () => {
  const guard = byId('shared-dependency-uses-catalog')
  const manifest = (path, pkg) => ({ path, source: JSON.stringify(pkg) })

  /**
   * The six violations this guard was written against, recorded BEFORE they
   * were fixed.
   *
   * Not decoration. `pnpm up --latest` rewrites exactly these to `catalog:`
   * automatically -- so the live corpus could disappear into somebody's version
   * bump, and a guard whose only evidence was "the repository is green" would
   * have proven nothing. Frozen here, the rejection stays reproducible after
   * the tree is clean.
   */
  const THE_SIX = [
    ['hono', ['apps/web', 'modules/hr', 'packages/api'], '^4.9.0'],
    ['react', ['apps/web', 'packages/design', '.'], '^19.0.0'],
    ['react-dom', ['apps/web', '.'], '^19.0.0'],
    ['zod', ['modules/hr', 'packages/api'], '^4.0.0'],
    ['@tanstack/react-query', ['apps/web', 'packages/api-client'], '^5.60.0'],
    ['msw', ['.', 'packages/api-client'], '^2.15.0'],
  ]

  const asFound = () =>
    [...new Set(THE_SIX.flatMap(([, dirs]) => dirs))].map((dir) => {
      const deps = {}
      for (const [name, dirs, spec] of THE_SIX) {
        if (dirs.includes(dir)) {
          deps[name] = spec
        }
      }
      return manifest(dir === '.' ? 'package.json' : `${dir}/package.json`, {
        dependencies: deps,
        name: dir,
      })
    })

  it('REJECTS every inline declaration of the six, one violation per site', () => {
    const v = guard.check({ files: asFound() })
    // 3 + 3 + 2 + 2 + 2 + 2 -- the site is the unit, because the fix is
    // per-manifest and a count of six would not say which.
    expect(v).toHaveLength(14)
    for (const [name] of THE_SIX) {
      expect(
        v.some((x) => x.message.includes(`'${name}'`)),
        name,
      ).toBe(true)
    }
  })

  it('accepts the same six once every declaration reads catalog:', () => {
    const fixed = asFound().map((m) => {
      const pkg = JSON.parse(m.source)
      for (const k of Object.keys(pkg.dependencies)) {
        pkg.dependencies[k] = 'catalog:'
      }
      return manifest(m.path, pkg)
    })
    expect(guard.check({ files: fixed })).toEqual([])
  })

  it('ignores a dependency only one package declares', () => {
    const files = [
      manifest('packages/db/package.json', { dependencies: { drizzle: '^0.1.0' }, name: 'db' }),
      manifest('packages/api/package.json', { dependencies: { hono: 'catalog:' }, name: 'api' }),
    ]
    expect(guard.check({ files })).toEqual([])
  })

  it('ignores specifiers a catalog entry cannot hold', () => {
    // pnpm rejects workspace:, file: and link: AS catalog values, so these are
    // outside the rule by construction rather than by exemption.
    const files = [
      manifest('apps/web/package.json', {
        dependencies: { '@xforge/design': 'workspace:*' },
        name: 'w',
      }),
      manifest('modules/hr/package.json', {
        dependencies: { '@xforge/design': 'workspace:*' },
        name: 'h',
      }),
    ]
    expect(guard.check({ files })).toEqual([])
  })

  it('REJECTS a mix -- one catalog reference does not excuse the other site', () => {
    const files = [
      manifest('packages/api/package.json', { dependencies: { zod: 'catalog:' }, name: 'api' }),
      manifest('modules/hr/package.json', { dependencies: { zod: '^4.0.0' }, name: 'hr' }),
    ]
    const v = guard.check({ files })
    expect(v).toHaveLength(1)
    expect(v[0].where).toBe('modules/hr/package.json')
  })

  it('REJECTS a peerDependencies declaration, because the rule for peers is undecided', () => {
    const files = [
      manifest('packages/design/package.json', {
        name: 'ui',
        peerDependencies: { react: '^18 || ^19' },
      }),
    ]
    const v = guard.check({ files })
    expect(v).toHaveLength(1)
    expect(v[0].message).toMatch(/peerDependencies/)
  })

  it('and the real workspace has none, which is what lets the rule stay simple', () => {
    // The acceptance half, through the real rule against the real tree. If a
    // peer declaration ever lands, this goes red before the question is
    // answered by accident.
    expect(
      scanConfig().violations.filter((v) => v.guard === 'shared-dependency-uses-catalog'),
    ).toEqual([])
  })
})
