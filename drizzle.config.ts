import { defineConfig } from 'drizzle-kit'
import { LOCAL_OWNER_URL } from './tests/fixtures/local-database.ts'

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL ?? LOCAL_OWNER_URL,
  },
  dialect: 'postgresql',
  out: './packages/db/migrations',
  schema: './packages/db/src/schema/index.ts',
  strict: true,
  verbose: true,
})
