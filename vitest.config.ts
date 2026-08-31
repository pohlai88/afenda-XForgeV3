import { defineConfig } from 'vitest/config'
import { aliases } from './vitest.aliases.ts'

export default defineConfig({
  resolve: { alias: aliases },
  test: {
    include: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx', '**/tests/**/*.test.mjs'],
    // The architecture qualification suite has its own config: it mutates
    // shared database state (T11 disables row-level security) and must run
    // serially. Running it here would let it race the ordinary suite and, worse,
    // race itself.
    exclude: ['**/node_modules/**', '**/.next/**', 'tests/architecture/**'],
    environment: 'node',
  },
})
