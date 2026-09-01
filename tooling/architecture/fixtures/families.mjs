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

  // A cycle is not a malformed contract -- a recursive schema is legal and
  // common. What is malformed is a guard that cannot resolve one and reports
  // "no version token" anyway, which is what the depth-limited resolver did.
  // The fixture asserts the finding says the rule was NOT EVALUATED.
  'version-token-on-updates-cyclic': {
    because: 'could not be resolved',
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
    because: 'could not be resolved',
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

/** A repository environment in which every config guard is satisfied. */
const cleanEnv = () => ({
  adrs: [],
  biome: {
    files: {
      includes: [
        ...NON_SOURCE_DIRS.map((d) => `!**/${d}/**`),
        ...GENERATED_DIRS.map((d) => `!**/${d}`),
        ...GENERATED_FILES.map((f) => `!**/${f}`),
        ...OUTPUT_FILES.map((f) => `!**/${f}`),
        '!contracts',
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
}
