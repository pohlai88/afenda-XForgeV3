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
    exclude: ['**/node_modules/**', '**/.next/**', 'tests/architecture/**'],
    include: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx', '**/tests/**/*.test.mjs'],
  },
})
