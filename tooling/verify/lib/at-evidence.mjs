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
 * Prints JSON on stdout: `{ gated, malformed, missing }`. `gated` is who owes
 * evidence at all; `missing` is who owes it and has none current. A caller
 * distinguishing "nobody is gated" from "everybody is covered" needs both,
 * because those are different facts that a single number reports identically.
 *
 * `malformed` is the third, and it was absent while the ledger's own header
 * described it: sentences naming every recorded entry that is not a session.
 * Missing evidence is an honest state; malformed evidence is a claim, and only
 * the second is a failure today.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { sessionFailures } from './at-session.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')

// BOTH conversions are load-bearing on Windows, and hand-rolling either is how
// this file first failed. A file: URL's pathname begins with a slash before the
// drive letter, and a dynamic import of a bare absolute path is rejected with
// ERR_UNSUPPORTED_ESM_URL_SCHEME because the loader reads the drive letter as a
// URL scheme.
const { contracts, contractsOwingAtEvidence } = await import(
  pathToFileURL(join(ROOT, 'packages/design/src/contracts.ts')).href
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

/**
 * AND WHETHER WHAT IS RECORDED IS A SESSION AT ALL, which used to go unasked.
 *
 * `missing` above answers "is there a number, and is it current". That is the
 * whole of what this gate checked, so `{ "Dialog": { "interactionRevision": 1 } }`
 * satisfied it -- while the ledger's header promised a tool and a version and
 * ADR-025 required a verbatim transcript per scenario. The two prose sources
 * agreed with each other and neither agreed with the code.
 *
 * MALFORMED IS NOT MISSING. Absent evidence is honest and the phase gate treats
 * it as a precondition; evidence that is not evidence is a claim of coverage
 * that is not one, and fails today -- the same reasoning that puts the orphan
 * check ahead of the empty check in the stage.
 */
const malformed = gated.flatMap((id) =>
  sessionFailures(id, sessions[id], contracts[id].interaction.revision),
)

process.stdout.write(JSON.stringify({ gated, malformed, missing }))
