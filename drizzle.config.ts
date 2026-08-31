import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://postgres:xforge@127.0.0.1:55432/xforge',
  },
  dialect: 'postgresql',
  out: './packages/db/migrations',
  schema: './packages/db/src/schema/index.ts',
  strict: true,
  verbose: true,
})
