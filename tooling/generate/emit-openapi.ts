/**
 * Emit contracts/openapi.generated.json from the authored route contracts.
 *
 * The authored contract is the code authority; this document is its published,
 * language-neutral projection (ADR-002). It is generated state: never
 * hand-edited, and `pnpm verify` asserts a clean diff after regeneration.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createApp } from '@xforge/api'
import { hrModuleRoutes } from '@xforge/hr'

// ANCHORED ON THIS FILE, not on the working directory. `mkdirSync('contracts')`
// wrote wherever the shell happened to be, so the generator that produces the
// asserted-clean artefact was the one script in `tooling/generate` that did not
// know where the repository is -- and running it from a subdirectory creates a
// second `contracts/` while the generate stage diffs the first and reports
// clean. Both siblings already derive their output path this way.
const ROOT = join(import.meta.dirname, '../..')
const OUTPUT = join(ROOT, 'contracts/openapi.generated.json')

const app = createApp(hrModuleRoutes)

const doc = app.getOpenAPI31Document({
  info: {
    description:
      'Multi-tenant HRMS and payroll platform. Every operation declares a policy; ' +
      'see .architecture/adr/ADR-014-policy-declaration.md.',
    title: 'Xforge API',
    version: '0.1.0',
  },
  openapi: '3.1.0',
  servers: [{ description: 'production', url: 'https://api.xforge.app' }],
})

mkdirSync(dirname(OUTPUT), { recursive: true })
writeFileSync(OUTPUT, `${JSON.stringify(doc, null, 2)}\n`)

const ops = Object.values(doc.paths ?? {}).flatMap((p) =>
  Object.entries(p as Record<string, { operationId?: string }>)
    .filter(([verb]) => ['get', 'post', 'put', 'patch', 'delete'].includes(verb))
    .map(([, op]) => op.operationId),
)

console.log(`contracts/openapi.generated.json  ${ops.length} operations`)
for (const id of ops) {
  console.log(`  ${id}`)
}
