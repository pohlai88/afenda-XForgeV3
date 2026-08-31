import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@xforge/api-client/mocks': r('./packages/api-client/src/mocks.ts'),
      '@xforge/api-client': r('./packages/api-client/src/index.ts'),
      '@xforge/api': r('./packages/api/src/index.ts'),
      '@xforge/db': r('./packages/db/src/index.ts'),
      '@xforge/policy': r('./packages/policy/src/index.ts'),
      '@xforge/hr': r('./modules/hr/index.ts'),
    },
  },
  test: {
    include: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx', '**/tests/**/*.test.mjs'],
    exclude: ['**/node_modules/**', '**/.next/**'],
    environment: 'node',
  },
})
