/**
 * Mutation fixtures for the contract and config guard families.
 *
 * Five guards ran in `pnpm verify` having never been observed to reject
 * anything -- four contract guards and, at the time the audit was written,
 * `adr-has-evidence`. That is ADR-024's depcruise failure: installed,
 * configured, green and blind. `version-token-on-updates` is the one whose
 * PREDECESSOR SHIPPED BROKEN, passing its fixture and then false-positiving on
 * the first real route, which is the argument against trusting a guard that has
 * only ever been read.
 *
 * These live beside the source fixtures rather than inside them because the
 * shapes are genuinely different -- a document and an environment, not a path
 * and a text -- and one table indexed by three shapes would be the mega-harness
 * the proof protocol was split to avoid.
 *
 * `because` is the reason the fixture exists, asserted against the finding. A
 * fixture meant to violate `operation-id-required` that is rejected because the
 * document is malformed proves nothing, and proves it in the same shape as a
 * pass.
 */

import {
  GENERATED_DIRS,
  GENERATED_FILES,
  NON_SOURCE_DIRS,
  OUTPUT_FILES,
} from '../../source-universe.mjs'
import { FIXTURE_SECRET, SECRET_FIXTURE_ALLOWLIST, stillGrandfathered } from '../config-guards.mjs'

const NL = String.fromCharCode(10)

// --------------------------------------------------------------- contract

/** The smallest document that is well-formed but says nothing. */
const emptyDoc = { openapi: '3.1.0', paths: {} }

const withBody = (properties, required) => ({
  requestBody: { content: { 'application/json': { schema: { properties, required } } } },
  responses: { 200: { description: 'ok' }, 409: { description: 'conflict' } },
})

export const contractFixtures = {
  'commands-not-status-patches': {
    because: 'status field',
    clean: {
      ...emptyDoc,
      paths: { '/a': { patch: { operationId: 'p', ...withBody({ phone: {} }, []) } } },
    },
    violating: {
      ...emptyDoc,
      paths: { '/a': { patch: { operationId: 'p', ...withBody({ status: {} }, []) } } },
    },
  },

  'conflict-response-declared': {
    because: '409',
    clean: {
      ...emptyDoc,
      paths: {
        '/a': {
          patch: {
            operationId: 'p',
            requestBody: {
              content: { 'application/json': { schema: { properties: { version: {} } } } },
            },
            responses: { 200: { description: 'ok' }, 409: { description: 'conflict' } },
          },
        },
      },
    },
    violating: {
      ...emptyDoc,
      paths: {
        '/a': {
          patch: {
            operationId: 'p',
            requestBody: {
              content: { 'application/json': { schema: { properties: { version: {} } } } },
            },
            responses: { 200: { description: 'ok' } },
          },
        },
      },
    },
  },
  'operation-id-required': {
    because: 'operationId',
    clean: { ...emptyDoc, paths: { '/a': { get: { operationId: 'getA', responses: {} } } } },
    violating: { ...emptyDoc, paths: { '/a': { get: { responses: {} } } } },
  },

  'version-token-on-updates': {
    because: 'version token',
    clean: {
      ...emptyDoc,
      paths: { '/a': { patch: { operationId: 'p', ...withBody({ version: {} }, ['version']) } } },
    },
    violating: {
      ...emptyDoc,
      paths: { '/a': { patch: { operationId: 'p', ...withBody({ phone: {} }, []) } } },
    },
  },

  // The two ways the body was read as EMPTY rather than as unread, and the pair
  // is what made them invisible: `commands-not-status-patches` went silently
  // green on a PATCH plainly carrying `status`, while `version-token-on-updates`
  // reported "no version token" for the same operation, with the token present
  // and required. A red whose stated reason is false is not a finding; it is a
  // second bug wearing the first one's clothes.
  //
  // `allOf` is what this repository's own generator emits for a registered
  // schema extended with `.extend({ version })`, so it is the live half.
  'version-token-on-updates-composed': {
    because: 'composed with allOf',
    clean: {
      ...emptyDoc,
      paths: { '/a': { patch: { operationId: 'p', ...withBody({ version: {} }, ['version']) } } },
    },
    guardId: 'version-token-on-updates',
    violating: {
      ...emptyDoc,
      paths: {
        '/a': {
          patch: {
            operationId: 'p',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { properties: { status: {} } },
                      { properties: { version: {} }, required: ['version'] },
                    ],
                  },
                },
              },
            },
            responses: { 200: { description: 'ok' }, 409: { description: 'conflict' } },
          },
        },
      },
    },
  },

  // A cycle is not a malformed contract -- a recursive schema is legal and
  // common. What is malformed is a guard that cannot resolve one and reports
  // "no version token" anyway, which is what the depth-limited resolver did.
  // The fixture asserts the finding says the rule was NOT EVALUATED.
  'version-token-on-updates-cyclic': {
    because: 'cycles through',
    clean: {
      ...emptyDoc,
      paths: { '/a': { patch: { operationId: 'p', ...withBody({ version: {} }, ['version']) } } },
    },
    guardId: 'version-token-on-updates',
    violating: {
      ...emptyDoc,
      components: { schemas: { Loop: { $ref: '#/components/schemas/Loop' } } },
      paths: {
        '/a': {
          patch: {
            operationId: 'p',
            requestBody: {
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/Loop' } },
              },
            },
            responses: { 200: { description: 'ok' }, 409: { description: 'conflict' } },
          },
        },
      },
    },
  },

  'version-token-on-updates-not-json': {
    because: 'not application/json',
    clean: {
      ...emptyDoc,
      paths: { '/a': { patch: { operationId: 'p', ...withBody({ version: {} }, ['version']) } } },
    },
    guardId: 'version-token-on-updates',
    violating: {
      ...emptyDoc,
      paths: {
        '/a': {
          patch: {
            operationId: 'p',
            requestBody: {
              content: { 'multipart/form-data': { schema: { properties: { status: {} } } } },
            },
            responses: { 200: { description: 'ok' }, 409: { description: 'conflict' } },
          },
        },
      },
    },
  },

  // The second half of the same rule, and the one a single fixture would miss:
  // a version token that is PRESENT but optional disables the staleness check
  // exactly as thoroughly as one that is absent.
  'version-token-on-updates-optional': {
    because: 'optional',
    clean: {
      ...emptyDoc,
      paths: { '/a': { patch: { operationId: 'p', ...withBody({ version: {} }, ['version']) } } },
    },
    guardId: 'version-token-on-updates',
    violating: {
      ...emptyDoc,
      paths: { '/a': { patch: { operationId: 'p', ...withBody({ version: {} }, []) } } },
    },
  },

  // The other way resolution fails. Same rule: say so, do not invent a verdict.
  'version-token-on-updates-unresolvable': {
    because: 'does not resolve',
    clean: {
      ...emptyDoc,
      paths: { '/a': { patch: { operationId: 'p', ...withBody({ version: {} }, ['version']) } } },
    },
    guardId: 'version-token-on-updates',
    violating: {
      ...emptyDoc,
      paths: {
        '/a': {
          patch: {
            operationId: 'p',
            requestBody: {
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/Absent' } },
              },
            },
            responses: { 200: { description: 'ok' }, 409: { description: 'conflict' } },
          },
        },
      },
    },
  },
}

// ----------------------------------------------------------------- config

/**
 * A repository environment in which every config guard is satisfied.
 *
 * FORCE-IGNORES, spelled the way biome.jsonc spells them. The exclusions used
 * a plain `!` here while the real config uses `!!` -- so the clean fixture
 * described a configuration the repository deliberately does not have, and the
 * one property biome.jsonc records as load-bearing was the one no fixture
 * exercised.
 *
 * Exported because `tests/config-guards.test.mjs` built a second copy of this
 * object, character for character. Two clean environments that must agree is
 * the defect the config guards exist to catch, one level up.
 */
export const cleanEnv = () => ({
  adrs: [],
  biome: {
    files: {
      includes: [
        ...NON_SOURCE_DIRS.map((d) => `!!**/${d}`),
        ...GENERATED_DIRS.map((d) => `!!**/${d}`),
        ...GENERATED_FILES.map((f) => `!!**/${f}`),
        ...OUTPUT_FILES.map((f) => `!!**/${f}`),
        '!!contracts',
      ],
    },
  },
  files: [],
  gitignore: NON_SOURCE_DIRS.map((d) => `${d}/`).join(NL),
  trackedFiles: [],
  tsconfig: { exclude: ['node_modules', '**/node_modules', '**/.next', '**/dist'] },
})

const envWith = (over) => ({ ...cleanEnv(), ...over })

const image = (local, ci) => [
  { path: 'compose.yaml', source: `services:${NL}  postgres:${NL}    image: ${local}${NL}` },
  {
    path: '.github/workflows/verify.yml',
    source: `    services:${NL}      postgres:${NL}        image: ${ci}${NL}`,
  },
]

const requiredEnvDeclaration = [
  'export const REQUIRED_DATABASE_ENV = {',
  "  DATABASE_URL: 'the owner connection',",
  "  APP_DATABASE_URL: 'the application connection',",
  '} as const',
].join(NL)

const workflowEnv = (body) => [
  { path: 'tests/fixtures/local-database.ts', source: requiredEnvDeclaration },
  { path: '.github/workflows/verify.yml', source: body },
]

const manifest = (path, json) => ({ path, source: JSON.stringify(json) })

/**
 * An ADR name the grandfathering rule does not excuse.
 *
 * Taken from the rule rather than guessed: `stillGrandfathered` decides, so a
 * fixture that happened to pick an excused name would report PROVEN while
 * proving nothing.
 */
const UNGRANDFATHERED = ['ADR-999-fixture.md', 'ADR-900-fixture.md', 'ADR-500-fixture.md'].find(
  (name) => !stillGrandfathered(name),
)

const frozenAdr = (body) => `# Test ADR${NL}${NL}Status: FROZEN${NL}${NL}${body}`

const goodPriorArt = [
  '## Prior art',
  '',
  '| source | retrieved | supports |',
  '| --- | --- | --- |',
  '| Something | 2026-01-01 | the claim |',
  '',
  'What it does NOT prove: that our implementation is correct.',
].join(NL)

export const configFixtures = {
  'adr-has-evidence': {
    because: 'Prior art',
    clean: envWith({ adrs: [{ name: UNGRANDFATHERED, source: frozenAdr(goodPriorArt) }] }),
    violating: envWith({
      adrs: [{ name: UNGRANDFATHERED, source: frozenAdr('No evidence section at all.') }],
    }),
  },

  'ci-provides-fixture-env': {
    because: 'APP_DATABASE_URL',
    clean: envWith({
      files: workflowEnv(
        [
          '    env:',
          '      DATABASE_URL: postgres://postgres:x@localhost:5432/xforge',
          '      APP_DATABASE_URL: postgres://app_user:x@localhost:5432/xforge',
        ].join(NL),
      ),
    }),
    violating: envWith({
      files: workflowEnv(
        `    env:${NL}      DATABASE_URL: postgres://postgres:x@localhost:5432/xforge`,
      ),
    }),
  },

  'database-image-matches-ci': {
    because: 'cannot reproduce',
    clean: envWith({ files: image('postgres:17-alpine', 'postgres:17-alpine') }),
    violating: envWith({ files: image('postgres:17-alpine', 'postgres:16') }),
  },

  'deterministic-source-set': {
    because: 'generated state',
    clean: cleanEnv(),
    violating: (() => {
      const env = cleanEnv()
      env.biome.files.includes = env.biome.files.includes.filter(
        (p) => !p.includes('next-env.d.ts'),
      )
      return env
    })(),
  },

  // The half biome.jsonc calls load-bearing and no fixture exercised: every
  // exclusion is still PRESENT, and every one is overridable. The preset's `**`
  // merges after a plain `!`, which is how apps/web/.next came back the first
  // time. Measured before this landed: the guard reported zero violations
  // against exactly this environment, so its green light meant "the names are
  // listed" rather than "the names are excluded".
  'deterministic-source-set-plain-negation': {
    because: 'force-ignored',
    clean: cleanEnv(),
    guardId: 'deterministic-source-set',
    violating: (() => {
      const env = cleanEnv()
      env.biome.files.includes = env.biome.files.includes.map((p) => p.replace(/^!!/, '!'))
      return env
    })(),
  },

  'fixtures-are-not-production-dependencies': {
    because: '@xforge/fixtures',
    clean: envWith({
      files: [
        manifest('tests/fixtures/package.json', { name: '@xforge/fixtures' }),
        manifest('packages/db/package.json', {
          devDependencies: { '@xforge/fixtures': 'workspace:*' },
          name: '@xforge/db',
        }),
      ],
    }),
    violating: envWith({
      files: [
        manifest('tests/fixtures/package.json', { name: '@xforge/fixtures' }),
        manifest('packages/db/package.json', {
          dependencies: { '@xforge/fixtures': 'workspace:*' },
          name: '@xforge/db',
        }),
      ],
    }),
  },

  /**
   * The state the repository was actually in: a drizzle-generated `0000_init`
   * journalled, and a hand-written migration beside it that drizzle never saw.
   *
   * ADR-021 requires forward-reviewed SQL, so hand-written migrations are the
   * NORMAL case here rather than an aberration -- which is exactly why the
   * journal fell behind and why nothing noticed. The violating fixture is
   * therefore the ordinary way of working, one step before anyone checks.
   *
   * The clean side journals BOTH, rather than dropping to a single migration.
   * A one-migration clean side would pass a guard that merely counted, and this
   * guard is about two collections agreeing.
   */
  'migration-set-has-one-authority': {
    because: 'absent from meta/_journal.json',
    clean: envWith({
      files: [
        { path: 'packages/db/migrations/0000_init.sql', source: 'CREATE TABLE "a" ();' },
        {
          path: 'packages/db/migrations/0001_force_rls.sql',
          source: 'ALTER TABLE "a" FORCE ROW LEVEL SECURITY;',
        },
        {
          path: 'packages/db/migrations/meta/_journal.json',
          source: JSON.stringify({
            entries: [{ tag: '0000_init' }, { tag: '0001_force_rls' }],
          }),
        },
      ],
    }),
    violating: envWith({
      files: [
        { path: 'packages/db/migrations/0000_init.sql', source: 'CREATE TABLE "a" ();' },
        {
          path: 'packages/db/migrations/0001_force_rls.sql',
          source: 'ALTER TABLE "a" FORCE ROW LEVEL SECURITY;',
        },
        {
          path: 'packages/db/migrations/meta/_journal.json',
          source: JSON.stringify({ entries: [{ tag: '0000_init' }] }),
        },
      ],
    }),
  },

  'no-committed-build-output': {
    because: 'build output',
    clean: envWith({ trackedFiles: ['packages/api/src/app.ts', 'CLAUDE.md'] }),
    violating: envWith({ trackedFiles: ['test-results/.last-run.json'] }),
  },

  'no-shared-dev-secret': {
    because: 'managed secret storage',
    clean: envWith({
      files: SECRET_FIXTURE_ALLOWLIST.map((path) => ({ path, source: FIXTURE_SECRET })),
    }),
    violating: envWith({
      files: [{ path: 'packages/api/src/app.ts', source: `const pw = '${FIXTURE_SECRET}'` }],
    }),
  },

  /**
   * The state the repository was actually in when this guard was written.
   *
   * `hono` in three manifests, inline, while `@hono/zod-openapi` -- the library
   * that extends it -- was already catalogued. The pair is the fixture because
   * it is the case that shows the rule is not pedantry: one contract library
   * with one source, sitting on another with three.
   *
   * The clean side keeps BOTH declarations rather than deleting one, so the
   * fixture proves the guard accepts a shared dependency that is catalogued --
   * not merely that it accepts a dependency nobody shares twice.
   */
  'shared-dependency-uses-catalog': {
    because: 'single source',
    clean: envWith({
      files: [
        manifest('packages/api/package.json', {
          dependencies: { '@hono/zod-openapi': 'catalog:', hono: 'catalog:' },
          name: '@xforge/api',
        }),
        manifest('modules/hr/package.json', {
          dependencies: { hono: 'catalog:' },
          name: '@xforge/hr',
        }),
      ],
    }),
    violating: envWith({
      files: [
        manifest('packages/api/package.json', {
          dependencies: { '@hono/zod-openapi': 'catalog:', hono: '^4.9.0' },
          name: '@xforge/api',
        }),
        manifest('modules/hr/package.json', {
          dependencies: { hono: '^4.9.0' },
          name: '@xforge/hr',
        }),
      ],
    }),
  },

  /**
   * The state `next.config.mjs` was actually in: a workspace package listed by
   * hand, beside a manifest that already declares it with `workspace:`.
   *
   * THE CLEAN SIDE KEEPS A NON-EMPTY `transpilePackages`, listing a published
   * package instead of deleting the field. The rule is not "no
   * transpilePackages" -- that field is exactly right for an npm package that
   * ships untranspiled source. A clean side with the field removed would pass a
   * guard that merely rejected its existence, and prove nothing about what the
   * rule means.
   *
   * Both sides declare the same two dependencies, so the ONLY difference is
   * which one the config names.
   */
  'workspace-packages-are-not-hand-transpiled': {
    because: 'workspace: protocol',
    clean: envWith({
      files: [
        {
          path: 'apps/web/next.config.mjs',
          source: "export default { transpilePackages: ['some-published-esm-pkg'] }",
        },
        manifest('apps/web/package.json', {
          dependencies: { '@xforge/design': 'workspace:*', 'some-published-esm-pkg': '^1.0.0' },
          name: '@xforge/web',
        }),
      ],
    }),
    violating: envWith({
      files: [
        {
          path: 'apps/web/next.config.mjs',
          source: "export default { transpilePackages: ['@xforge/design'] }",
        },
        manifest('apps/web/package.json', {
          dependencies: { '@xforge/design': 'workspace:*', 'some-published-esm-pkg': '^1.0.0' },
          name: '@xforge/web',
        }),
      ],
    }),
  },

  /**
   * The state `tsconfig.json` was actually in when this guard was written: an
   * alias for `@xforge/db` beside a manifest that also declares
   * `@xforge/db/schema`, which the alias table had never carried.
   *
   * THE CLEAN SIDE KEEPS A `paths` MAP rather than deleting it, because the
   * rule is not "no paths". A repository may alias whatever it likes as long as
   * it does not shadow a package the workspace already resolves -- so the clean
   * fixture aliases `#internal/*`, which no manifest declares, and proves the
   * guard accepts it. A clean side with no paths at all would pass a guard that
   * merely rejected the key's existence, and prove nothing about what it means.
   *
   * The violating side uses a BARE NAME rather than a wildcard so the exact
   * matching branch is the one exercised here; `config-guards.test.mjs` covers
   * the pattern branch, where a set intersection would silently pass.
   */
  'workspace-packages-resolve-as-packages': {
    because: 'shadows',
    clean: envWith({
      files: [
        manifest('packages/db/package.json', {
          exports: { '.': './src/index.ts', './schema': './src/schema/index.ts' },
          name: '@xforge/db',
        }),
        manifest('tsconfig.json', {
          compilerOptions: { paths: { '#internal/*': ['./src/*'] } },
        }),
      ],
    }),
    violating: envWith({
      files: [
        manifest('packages/db/package.json', {
          exports: { '.': './src/index.ts', './schema': './src/schema/index.ts' },
          name: '@xforge/db',
        }),
        manifest('tsconfig.json', {
          compilerOptions: { paths: { '@xforge/db': ['./packages/db/src/index.ts'] } },
        }),
      ],
    }),
  },
}
