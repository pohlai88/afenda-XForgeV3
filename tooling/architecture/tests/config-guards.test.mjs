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
import { GENERATED_DIRS, GENERATED_FILES, NON_SOURCE_DIRS } from '../../source-universe.mjs'
import { ROOT } from '../../verify/lib/util.mjs'
import {
  configGuards,
  FIXTURE_SECRET,
  SECRET_FIXTURE_ALLOWLIST,
  scanConfig,
  stillGrandfathered,
} from '../config-guards.mjs'

const byId = (id) => {
  const g = configGuards.find((x) => x.id === id)
  if (!g) throw new Error(`no config guard '${id}'`)
  return g
}

const goodEnv = () => ({
  biome: {
    files: {
      includes: [
        ...NON_SOURCE_DIRS.map((d) => `!**/${d}/**`),
        ...GENERATED_DIRS.map((d) => `!**/${d}`),
        ...GENERATED_FILES.map((f) => `!**/${f}`),
        '!contracts',
      ],
    },
  },
  tsconfig: { exclude: ['node_modules', '**/node_modules', '**/.next', '**/dist'] },
  gitignore: NON_SOURCE_DIRS.map((d) => `${d}/`).join('\n'),
  files: [],
})

describe('deterministic-source-set', () => {
  const guard = byId('deterministic-source-set')

  it('accepts a config that excludes every non-source directory', () => {
    expect(guard.check(goodEnv())).toHaveLength(0)
  })

  it('REJECTS a Biome config that would FORMAT generated state', () => {
    // The concrete case: Biome rewrote next-env.d.ts, Next's build wrote it
    // back, and lint passed or failed depending on which ran last.
    const env = goodEnv()
    env.biome.files.includes = env.biome.files.includes.filter((p) => !p.includes('next-env.d.ts'))
    const found = guard.check(env)
    expect(found.length).toBeGreaterThan(0)
    expect(found[0].message).toContain('generated state')
  })

  it('REJECTS a Biome config that would format the published contract', () => {
    const env = goodEnv()
    env.biome.files.includes = env.biome.files.includes.filter((p) => p !== '!contracts')
    expect(guard.check(env).length).toBeGreaterThan(0)
  })

  it('REJECTS a Biome config that would lint build output', () => {
    const env = goodEnv()
    env.biome.files.includes = env.biome.files.includes.filter((p) => !p.includes('.turbo'))
    const found = guard.check(env)
    expect(found.length).toBeGreaterThan(0)
    expect(found[0]?.message).toMatch(/whether a build ran first/)
  })

  it('REJECTS a tsconfig that would typecheck build output', () => {
    const env = goodEnv()
    env.tsconfig.exclude = []
    expect(guard.check(env).some((v) => v.where.includes('tsconfig'))).toBe(true)
  })

  it('REJECTS a .gitignore that would let build output be committed', () => {
    const env = goodEnv()
    env.gitignore = ''
    expect(guard.check(env).some((v) => v.where === '.gitignore')).toBe(true)
  })

  it('catches EVERY non-source directory, not just the ones we happened to hit', () => {
    // The original bug was discovered one directory at a time. This asserts the
    // guard covers the whole declared universe, so the next tool that writes
    // into the workspace is caught by construction rather than by incident.
    for (const d of NON_SOURCE_DIRS.filter((x) => x !== '.git')) {
      const env = goodEnv()
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
    const gaps = []
    for (const a of adrs) {
      if (stillGrandfathered(a.name, 'tenancy')) continue
      if (!/FROZEN/.test(a.source)) continue
      if (!/^##\s+Prior art/m.test(a.source)) gaps.push(`${a.name}: no Prior art section`)
      if (!/\|\s*20\d\d-\d\d-\d\d\s*\|/.test(a.source) && !/no-direct-match/.test(a.source)) {
        gaps.push(`${a.name}: no dated source`)
      }
      if (!/does NOT prove/i.test(a.source)) gaps.push(`${a.name}: no "does NOT prove" section`)
    }
    expect(gaps).toEqual([])
  })
})
