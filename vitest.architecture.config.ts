import { defineConfig } from 'vitest/config'
import { aliases } from './vitest.aliases.ts'

/**
 * The Architecture Qualification Suite.
 *
 * Separate from the ordinary tests on purpose. These are not unit tests of a
 * feature; they are executable claims about the security architecture, and
 * somebody should be able to run them alone and obtain a proof package:
 *
 *   pnpm test:architecture:tenancy
 *
 * fileParallelism is OFF. These cases share one database, and T11 deliberately
 * disables row-level security for a few statements -- run in parallel it would
 * disable the boundary underneath every other case and they would fail for a
 * reason that has nothing to do with what they assert.
 */
export default defineConfig({
  resolve: { alias: aliases },
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**'],
    fileParallelism: false,
    include: ['tests/architecture/**/*.test.ts', 'tests/architecture/**/*.test.mjs'],
  },
})
