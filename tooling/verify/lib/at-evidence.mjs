#!/usr/bin/env node
/**
 * Which gated contracts have current assistive-technology evidence, and which
 * do not.
 *
 * A SUBPROCESS, because `stages.mjs` builds its results synchronously and the
 * contract registry is TypeScript. Node 24 strips types on import, so this needs
 * no build step and no tsx -- but the import has to be dynamic, and a stage's
 * `run()` is not async.
 *
 * IT CALLS THE RULE, it does not restate it. `contractsOwingAtEvidence` is
 * ADR-025's derivation and lives with the registry; a copy here would agree with
 * it until somebody changed one, which is the defect this repository keeps
 * having. The same function is what the profile-mutation table interrogates.
 *
 * Prints JSON on stdout: `{ gated, missing }`. `gated` is who owes evidence at
 * all; `missing` is who owes it and has none current. A caller distinguishing
 * "nobody is gated" from "everybody is covered" needs both, because those are
 * different facts that a single number reports identically.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')

// BOTH conversions are load-bearing on Windows, and hand-rolling either is how
// this file first failed. A file: URL's pathname begins with a slash before the
// drive letter, and a dynamic import of a bare absolute path is rejected with
// ERR_UNSUPPORTED_ESM_URL_SCHEME because the loader reads the drive letter as a
// URL scheme.
const { contracts, contractsOwingAtEvidence } = await import(
  pathToFileURL(join(ROOT, 'packages/ui/src/contracts.ts')).href
)

const { sessions = {} } = JSON.parse(
  readFileSync(join(ROOT, '.architecture/a11y-evidence.json'), 'utf8'),
)

const gated = contractsOwingAtEvidence()

/**
 * Evidence below the contract's current revision is ABSENT, not partial.
 *
 * `interaction.revision` moves when keyboard, focus or ARIA behaviour changes,
 * which is exactly what invalidates a recorded session. Counting a stale one as
 * partial credit would report coverage the repository does not have.
 */
const missing = gated.filter((id) => {
  const recorded = sessions[id]?.interactionRevision
  return typeof recorded !== 'number' || recorded < contracts[id].interaction.revision
})

process.stdout.write(JSON.stringify({ gated, missing }))
