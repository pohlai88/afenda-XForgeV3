import { defineConfig } from 'vitest/config'
import { aliases } from './workspace.aliases.ts'

export default defineConfig({
  resolve: { alias: aliases },
  test: {
    environment: 'node',
    // The architecture qualification suite has its own config: it mutates
    // shared database state (T11 disables row-level security) and must run
    // serially. Running it here would let it race the ordinary suite and, worse,
    // race itself.
    // A LINKED WORKTREE IS NOT THIS CHECKOUT. `.claude/worktrees` holds a
    // complete second copy of the repository, and glob collection walked into it
    // and ran that copy's entire suite against its own code -- 22 duplicate
    // files, and a failure reported against a file this index does not contain.
    //
    // This is the THIRD file universe in the repository with its own exclusion
    // opinion: the source guards enumerate `git ls-files`, the config guards now
    // do too, and vitest globs. They agreed until the disk grew a second
    // repository. One owner would be better and is not this change.
    exclude: ['**/node_modules/**', '**/.claude/**', '**/.next/**', 'tests/architecture/**'],
    include: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx', '**/tests/**/*.test.mjs'],
  },
})
