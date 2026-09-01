/**
 * A REMINDER, not a rule. Fires when an edit lands on something whose job is to
 * detect a problem, and points at the skill that covers designing one.
 *
 * WHY A HOOK AND NOT A LONGER SKILL DESCRIPTION. Skills are consulted when the
 * model judges them relevant, and the edits that most need this one are exactly
 * the edits that do not look like they need it: adding a stage beside an
 * existing stage, extending a rule list, widening a regex. The hook knows
 * something the description cannot -- which file was just written.
 *
 * WHY IT CARRIES NO RULES OF ITS OWN. Everything it could say is already either
 * a guard (mechanical, in `pnpm guards`, already enforced by the PostToolUse
 * hook beside this one) or judgement (in the skill). A third copy here would be
 * the defect this repository keeps having, installed as infrastructure.
 *
 * It exits 0 ALWAYS. Blocking on a judgement call would be wrong twice over:
 * the model may have already applied the skill, and a hook that blocks work it
 * cannot evaluate is one people route around. The guards hook beside this one
 * is where blocking belongs, because a guard can actually decide.
 */
import { basename } from 'node:path'

/**
 * Paths whose contents are checks. Deliberately narrow: firing on every edit
 * would make this noise, and a reminder that is always present is not read.
 */
const IS_A_CHECK =
  /(^|[/\\])(tests?|e2e)[/\\]|[.](test|spec)[.][cm]?[jt]sx?$|(^|[/\\])tooling[/\\](architecture|verify|hooks)[/\\]|(^|[/\\])[^/\\]*(guard|check|assert|validat|lint)[^/\\]*[.][cm]?[jt]s$/i

const read = async (stream) => {
  let s = ''
  for await (const chunk of stream) {
    s += chunk
  }
  return s
}

const main = async () => {
  let payload
  try {
    payload = JSON.parse(await read(process.stdin))
  } catch {
    return
  }
  const filePath = payload?.tool_input?.file_path
  if (typeof filePath !== 'string' || !IS_A_CHECK.test(filePath)) {
    return
  }
  process.stdout.write(
    `${basename(filePath)} is a check. Two questions before moving on:\n` +
      '  1. Have you seen it go RED? Break what it checks, confirm it fails, undo.\n' +
      '     A check that has only ever been green has not been observed to work.\n' +
      '  2. Does its subject exist? A rule over an empty file set, a suite that\n' +
      '     skipped every case, and a clean repository all report the same green.\n' +
      'The `checks-that-can-fail` skill covers both, and the shapes that hide them.\n',
  )
}

// Fails open on anything unexpected: this assists authorship, it does not gate.
main().then(
  () => process.exit(0),
  () => process.exit(0),
)
