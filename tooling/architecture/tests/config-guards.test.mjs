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
import { describe, expect, it } from 'vitest'
import { GENERATED_DIRS, GENERATED_FILES, NON_SOURCE_DIRS } from '../../source-universe.mjs'
import {
  configGuards,
  FIXTURE_SECRET,
  SECRET_FIXTURE_ALLOWLIST,
  scanConfig,
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

describe('the real repository satisfies both guards', () => {
  it('scanConfig reports no violations', () => {
    expect(scanConfig().violations).toEqual([])
  })
})
