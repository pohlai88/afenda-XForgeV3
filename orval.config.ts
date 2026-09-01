import { defineConfig } from 'orval'

/**
 * OpenAPI -> typed client + TanStack Query hooks + MSW mocks.
 *
 * The mocks are the point (ADR-002). They are what let a complete screen --
 * including empty, loading, error and permission-denied states -- be built and
 * reviewed before a handler or a database exists. A client generator without
 * mocks would not have unlocked that, which is why `hc` was rejected.
 *
 * Everything under src/generated is derived state: never hand-edited, and
 * `pnpm verify` asserts a clean diff after regeneration.
 */
export default defineConfig({
  xforge: {
    input: { target: './contracts/openapi.generated.json' },
    output: {
      baseUrl: '/api',
      client: 'react-query',
      httpClient: 'fetch',
      mock: { generators: [{ type: 'msw' }], useExamples: false },
      mode: 'split',
      override: {
        // Plain literal unions, not `typeof C[keyof typeof C]` over a const
        // object. The const form made two type checkers disagree about the same
        // fact: tsc read the literal union, Biome read `never` and called every
        // `case` unreachable. A union removes the disagreement rather than
        // annotating it, and nothing consumed the const objects as values.
        enumGenerationType: 'union',
        // Our fetcher throws ApiProblem on !ok and returns parsed JSON on
        // success, so the {data,status,headers} envelope would be a second
        // representation of the same fact. One shape, not two.
        fetch: { includeHttpResponseReturnType: false },
        mutator: {
          name: 'apiFetch',
          path: './packages/api-client/src/fetcher.ts',
        },
      },
      prettier: false,
      schemas: './packages/api-client/src/generated/model',
      target: './packages/api-client/src/generated/xforge.ts',
    },
  },
})
