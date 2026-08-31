/**
 * Law 27 at authorship time: generated state is never hand-edited.
 *
 * The `generate` stage already asserts generated output is byte-identical after
 * regeneration, but it does so at GATE time, against a batch. This refuses the
 * write itself, so the violation is reported against the edit that caused it --
 * the same argument .claude/settings.json already makes for running the guards
 * on PostToolUse rather than only in `pnpm verify`.
 *
 * It restates nothing. `classify()` is the single authority on what counts as
 * generated; a second list here would be the divergence ADR-024 records.
 *
 * NOT a security boundary. It reads one field of a JSON payload and fails OPEN
 * on anything it does not understand, because a hook that blocks writes it
 * cannot parse would make the repository unusable the first time the payload
 * shape changes. The gate stays the real check.
 *
 * Protocol: exit 2 blocks the tool call and returns stderr to the agent.
 */
import { relative, resolve } from 'node:path'
import { classify } from '../source-universe.mjs'

const ROOT = resolve(import.meta.dirname, '../..')

/**
 * Not generated, and not covered by `classify` -- it is the phase authority.
 * `verify --ci` reads the phase from here precisely so a run cannot declare an
 * earlier one, and CLAUDE.md makes advancing it a phase-COMPLETION event. An
 * incidental edit moves the gate silently, which is the whole failure mode.
 */
const PHASE_AUTHORITY = '.architecture/state.json'

const read = async (stream) => {
  let s = ''
  for await (const chunk of stream) s += chunk
  return s
}

const main = async () => {
  let payload
  try {
    payload = JSON.parse(await read(process.stdin))
  } catch {
    return 0
  }

  const filePath = payload?.tool_input?.file_path
  if (typeof filePath !== 'string' || filePath === '') return 0

  // classify() speaks repo-relative POSIX paths; the hook is handed an absolute
  // one, and on Windows it arrives with backslashes.
  const rel = relative(ROOT, resolve(ROOT, filePath)).split('\\').join('/')

  // Outside the repository entirely -- not this hook's business.
  if (rel === '' || rel.startsWith('../')) return 0

  if (rel === PHASE_AUTHORITY) {
    process.stderr.write(
      `${rel} is the canonical phase, and the repository owns it.\n` +
        'Advancing currentPhase is a phase-COMPLETION event: it belongs in a ' +
        'reviewed commit of its own, once that phase\u2019s exit criteria pass. ' +
        'To raise the phase for a local run, export XFORGE_PHASE instead.\n',
    )
    return 2
  }

  const kind = classify(rel)

  if (kind === 'generated') {
    process.stderr.write(
      `Law 27: ${rel} is generated state and is never hand-edited.` +
        String.fromCharCode(10) +
        'Change the source the generator reads, then run `pnpm generate`. ' +
        'Editing the output makes the next `pnpm verify` fail the generate ' +
        'stage, which asserts it is byte-identical after regeneration.' +
        String.fromCharCode(10),
    )
    return 2
  }

  if (kind === 'output') {
    // Build output rather than derived source. There is no generator to re-run
    // and nothing to commit: the tool that produces it will overwrite the edit,
    // and next-env.d.ts proved the sharper version -- its content records which
    // command ran last, so an edit is not merely lost, it flips back and forth.
    process.stderr.write(
      `${rel} is build output. Whatever writes it will overwrite this edit.` +
        String.fromCharCode(10) +
        'If a value here needs to change, change what produces it.' +
        String.fromCharCode(10),
    )
    return 2
  }

  return 0
}

main().then(
  (code) => process.exit(code),
  // Fail open, loudly. See the header: this assists authorship, it does not
  // gate. A crash here must never be able to block work.
  (err) => {
    process.stderr.write(`no-hand-edit hook failed open: ${err?.message ?? err}\n`)
    process.exit(0)
  },
)
