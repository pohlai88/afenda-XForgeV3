import { defineConfig } from 'vitest/config'
import { aliases } from './workspace.aliases.ts'

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
    // A LINKED WORKTREE IS NOT THIS CHECKOUT. `.claude/worktrees` holds a
    // complete second copy of the repository, and glob collection walked into it
    // and ran that copy's entire suite against its own code -- 22 duplicate
    // files, and a failure reported against a file this index does not contain.
    //
    // This is the THIRD file universe in the repository with its own exclusion
    // opinion: the source guards enumerate `git ls-files`, the config guards now
    // do too, and vitest globs. They agreed until the disk grew a second
    // repository. One owner would be better and is not this change.
    exclude: ['**/node_modules/**', '**/.claude/**'],
    fileParallelism: false,
    include: ['tests/architecture/**/*.test.ts', 'tests/architecture/**/*.test.mjs'],
  },
})
