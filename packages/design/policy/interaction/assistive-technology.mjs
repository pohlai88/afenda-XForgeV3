/**
 * INTERACTION — assistive technology. What a recorded screen-reader session must
 * CONTAIN, who owes one, and what is wrong with the ledger.
 *
 * ── WHERE THIS CAME FROM ───────────────────────────────────────────────────
 *
 * `tooling/verify/lib/at-session.mjs` and `at-evidence.mjs`, migrated here and
 * DELETED in the same commit (ADR-024: the guard a replacement supersedes goes
 * with it, or the repository briefly has two authorities for one rule and no
 * check that notices).
 *
 * The move is not tidying. Those two files answered a question about a DESIGN
 * SYSTEM CONTRACT -- which profile owes evidence, and what evidence is -- from
 * inside the verify runner, one directory away from the `interaction.profile`
 * declarations that decide it. `packages/design/src/contracts.ts` states the
 * profile; `keyboard.mjs` states what that profile owes a keyboard; this states
 * what it owes a screen reader. Those are three parts of one fact and they now
 * sit together.
 *
 * ── THE GATE USED TO READ ONE INTEGER ──────────────────────────────────────
 *
 * `at-evidence.mjs` decided the whole A11y-3 question with
 * `recorded < contracts[id].interaction.revision`, so this --
 *
 *     "sessions": { "Dialog": { "interactionRevision": 1 } }
 *
 * -- turned it green. No screen reader named, no version, no browser, no date,
 * no tester, and nothing anybody said. Meanwhile the ledger's own header
 * promised the opposite in prose ("A session records the tool and its version
 * because 'tested with a screen reader' is not evidence") and ADR-025 required
 * more still ("Evidence records what was ANNOUNCED, verbatim, per scenario").
 *
 * Three sources for one fact, two of them prose, agreeing right up until anyone
 * tried to satisfy the third. That is the defect CLAUDE.md names, and it was
 * sitting inside the file whose header paragraph is about honesty.
 *
 * SO THE PROSE MOVES INTO THE CHECK. Everything asserted above is a field this
 * module refuses to accept without, and `tests/unit/at-session.test.ts` shows it
 * each malformed shape and proves it rejects -- because a validator that has
 * never refused anything is the thing ADR-024 is about.
 *
 * ── WHAT THIS DELIBERATELY DOES NOT DO ─────────────────────────────────────
 *
 * It cannot tell whether a transcript is TRUE. Nothing can; that is what a
 * reviewer is for. It can tell that a transcript exists, which pairing produced
 * it, when, and by whom -- which is the difference between an attestation
 * somebody can check and one only its author can.
 *
 * ── AND IT IS ALSO THE SUBPROCESS ──────────────────────────────────────────
 *
 * Run directly, it prints the ledger verdict as JSON for `stages.mjs`. That
 * runner builds its results synchronously and the contract registry is
 * TypeScript, so the registry has to be reached by dynamic import from a
 * separate process. The constraint is unchanged by the move; what changed is
 * that the rules and the runner are one file instead of two, so a rule cannot be
 * edited in one and read from the other.
 *
 * The CLI block is at the BOTTOM and guarded, so importing this module reads no
 * file and imports no TypeScript. A library that reads a ledger merely by being
 * imported cannot be unit-tested against anything but the real one.
 */

import { pathToFileURL } from 'node:url'
import { definePolicy } from '../foundations/contract.mjs'
import { deepFreeze } from '../vocabulary.mjs'

/**
 * The screen readers a result may be recorded against, and the reason the list
 * is short.
 *
 * WebAIM Screen Reader User Survey #10 (fielded Dec 2023 - Jan 2024, 1,539
 * valid responses): JAWS 40.5% primary, NVDA 37.7%, VoiceOver 9.7%. The GDS
 * Service Manual mandates JAWS, NVDA and VoiceOver for UK Service Standard
 * assessment, and axe-core's own support policy admits a combination only above
 * 1% of users, extrapolated from the same survey. Three independent sources
 * converge, which is why this is an enum and not a free string: "tested with a
 * screen reader" is exactly the sentence the ledger says is not evidence.
 */
export const SUPPORTED_AT = deepFreeze(['JAWS', 'NVDA', 'VoiceOver'])

/** Paired with the reader, because the pair is what decides what a result means. */
export const SUPPORTED_BROWSERS = deepFreeze(['Chrome', 'Edge', 'Firefox', 'Safari'])

/**
 * TWO PAIRINGS, REQUIRED, AND THE THIRD IS A RECORDED RESIDUAL RISK.
 *
 * One reader is not a result. JAWS and NVDA disagree often enough that a single
 * reading cannot separate a component defect from a reader quirk, and the two
 * together are 62% of primary users and the top two pairings in the survey.
 *
 * VoiceOver + Safari is NOT required, and that is a decision rather than an
 * oversight. It is the pairing where macOS focus behaviour most diverges, so it
 * is the one a `modal` most wants -- and it needs macOS hardware, which this
 * project does not have. A gate nobody can satisfy is not a stricter standard;
 * it is a gate that gets waived, which is the failure ADR-025 was written to
 * avoid and which it would have re-created here. The exposure is recorded in
 * ADR-030 with a date rather than absorbed silently.
 */
export const REQUIRED_PAIRINGS = deepFreeze([
  { at: 'NVDA', browser: 'Chrome' },
  { at: 'JAWS', browser: 'Chrome' },
])

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const isFilledString = (v) => typeof v === 'string' && v.trim().length > 0

/* ------------------------------------------------------------ assertions -- */

/**
 * The pairing table's own rules, and every one of them was reachable.
 *
 * TAKES ITS SUBJECT AS AN ARGUMENT, like every other validator in this tree. A
 * function that can only read the frozen constant beside it cannot be shown a
 * violation, so its passing means "today's data happens to be clean" --
 * indistinguishable from being broken.
 *
 * ONE PAIRING IS REFUSED, and that clause carries the whole reason the table
 * exists. The paragraph above says a single reading cannot separate a component
 * defect from a reader quirk; a table that permitted one entry would let a later
 * edit contradict its own justification without anything going red.
 */
export function assertAtPairings(
  pairings = REQUIRED_PAIRINGS,
  readers = SUPPORTED_AT,
  browsers = SUPPORTED_BROWSERS,
) {
  if (!Array.isArray(pairings) || pairings.length < 2) {
    throw new Error(
      'REQUIRED_PAIRINGS holds fewer than two pairings -- one reader cannot distinguish a ' +
        'component defect from a reader quirk, which is the only reason this table exists',
    )
  }

  const seen = new Set()

  for (const pairing of pairings) {
    if (!readers.includes(pairing?.at)) {
      throw new Error(
        `required pairing names screen reader '${pairing?.at}', which is not one of ` +
          `${readers.join(', ')} -- a gate can only be satisfied by a reader it accepts`,
      )
    }
    if (!browsers.includes(pairing?.browser)) {
      throw new Error(
        `required pairing names browser '${pairing?.browser}', which is not one of ` +
          browsers.join(', '),
      )
    }

    const key = `${pairing.at} + ${pairing.browser}`
    if (seen.has(key)) {
      throw new Error(
        `${key} is required twice -- a duplicated pairing raises the count without raising the ` +
          'coverage, which is precisely the appearance of rigour this file refuses',
      )
    }
    seen.add(key)
  }

  return pairings
}

/* ------------------------------------------------------------ evaluation -- */

/** `{ name, version }`, both present, with the name drawn from a known set. */
function toolFailures(where, tool, allowed) {
  if (tool === null || typeof tool !== 'object' || Array.isArray(tool)) {
    return [`${where} is not an object with a name and a version`]
  }
  const out = []
  if (!allowed.includes(tool.name)) {
    out.push(`${where}.name is ${JSON.stringify(tool.name)}, not one of ${allowed.join(', ')}`)
  }
  // A VERSION, because this is the axis the ledger tracks least well: a
  // component revision invalidates a session and an NVDA release does not,
  // although the W3C's ARIA-AT re-runs on exactly that trigger. Recording the
  // version is what makes that judgement possible later; it is not made here.
  if (!isFilledString(tool.version)) {
    out.push(`${where}.version is missing -- a reader without its version cannot be re-run`)
  }
  return out
}

/** One sitting: a pairing, when, who, and what it actually said. */
function runFailures(where, run) {
  if (run === null || typeof run !== 'object' || Array.isArray(run)) {
    return [`${where} is not an object`]
  }
  const out = [
    ...toolFailures(`${where}.at`, run.at, SUPPORTED_AT),
    ...toolFailures(`${where}.browser`, run.browser, SUPPORTED_BROWSERS),
  ]
  if (!isFilledString(run.os)) {
    out.push(`${where}.os is missing`)
  }
  if (!(isFilledString(run.date) && ISO_DATE.test(run.date))) {
    out.push(`${where}.date is not an ISO yyyy-mm-dd date`)
  }
  if (!isFilledString(run.tester)) {
    out.push(`${where}.tester is missing -- an unattributed result cannot be asked about`)
  }

  if (!Array.isArray(run.scenarios) || run.scenarios.length === 0) {
    out.push(`${where}.scenarios is empty -- a session that exercised nothing proves nothing`)
    return out
  }
  run.scenarios.forEach((scenario, i) => {
    const at = `${where}.scenarios[${i}]`
    if (scenario === null || typeof scenario !== 'object') {
      out.push(`${at} is not an object`)
      return
    }
    if (!isFilledString(scenario.name)) {
      out.push(`${at}.name is missing`)
    }
    // THE LOAD-BEARING FIELD. ADR-025: "A `result: pass` with a scenario list is
    // an attestation only its author can check. A transcript is reviewable by
    // someone who was not in the room, and a later regression is diffable
    // against it." Without this the whole record is a tick.
    if (!isFilledString(scenario.announced)) {
      out.push(`${at}.announced is missing -- record what the reader SAID, verbatim`)
    }
  })
  return out
}

/**
 * Everything wrong with one contract's recorded evidence, as sentences.
 *
 * ABSENCE IS NOT MALFORMATION, and the caller needs them apart. A contract with
 * no entry at all is *missing* evidence -- an honest, expected state that the
 * phase gate reports as PENDING or BLOCKED. A contract with an entry that is not
 * a session is a claim of coverage that is not one, and that is a failure today,
 * in the same way an orphaned session is. So this returns `[]` for an absent
 * entry and leaves staleness to the caller.
 */
export function sessionFailures(id, session, requiredRevision) {
  if (session === undefined) {
    return []
  }
  if (session === null || typeof session !== 'object' || Array.isArray(session)) {
    return [`${id}: evidence is not an object`]
  }

  const out = []
  if (!Number.isInteger(session.interactionRevision)) {
    out.push(`${id}: interactionRevision is not an integer`)
  } else if (session.interactionRevision > requiredRevision) {
    // Evidence BELOW the contract's revision is stale, which the caller treats
    // as absent. Evidence ABOVE it describes a component that does not exist --
    // a typo, or a revision that was reverted, and either way not a fact.
    out.push(
      `${id}: interactionRevision ${session.interactionRevision} is above the contract's ` +
        `${requiredRevision} -- that session described a component this repository does not have`,
    )
  }

  if (!Array.isArray(session.runs) || session.runs.length === 0) {
    out.push(`${id}: runs is empty -- an interactionRevision on its own is a number, not evidence`)
    return out
  }
  session.runs.forEach((run, i) => {
    out.push(...runFailures(`${id}.runs[${i}]`, run))
  })

  for (const pairing of REQUIRED_PAIRINGS) {
    const covered = session.runs.some(
      (run) => run?.at?.name === pairing.at && run?.browser?.name === pairing.browser,
    )
    if (!covered) {
      out.push(
        `${id}: no session on ${pairing.at} + ${pairing.browser} -- one reader cannot ` +
          'distinguish a component defect from a reader quirk',
      )
    }
  }
  return out
}

/**
 * The WHOLE verdict on a ledger, in one place.
 *
 * WHY THIS IS NOT TWO CALLERS' WORK. `orphans` used to be computed in
 * `stages.mjs` and `malformed`/`missing` in `at-evidence.mjs`. One question --
 * "what is wrong with the evidence ledger" -- answered in two files, so the
 * ordering that makes the answer honest was written as a comment in one of them
 * and was unenforceable from the other.
 *
 * THE FOUR CATEGORIES ARE NOT INTERCHANGEABLE, and a caller that collapses them
 * reports the reassuring answer:
 *
 *   gated      who owes evidence at all, DERIVED from `interaction.profile`
 *   orphans    evidence recorded against something that owes none -- proves
 *              nothing, and reads exactly like proof
 *   malformed  an entry that is not a session -- a CLAIM of coverage
 *   missing    owed, and absent or stale -- the honest state
 *
 * `gated` and `missing` are both returned because a caller distinguishing
 * "nobody is gated" from "everybody is covered" needs both: those are different
 * facts that a single number reports identically.
 */
export function ledgerFailures({ contracts, gated, sessions }) {
  const owing = new Set(gated)

  return {
    gated: [...gated],

    malformed: gated.flatMap((id) =>
      sessionFailures(id, sessions[id], contracts[id].interaction.revision),
    ),

    /**
     * Evidence below the contract's current revision is ABSENT, not partial.
     *
     * `interaction.revision` moves when keyboard, focus or ARIA behaviour
     * changes, which is exactly what invalidates a recorded session. Counting a
     * stale one as partial credit would report coverage the repository does not
     * have.
     */
    missing: gated.filter((id) => {
      const recorded = sessions[id]?.interactionRevision
      return typeof recorded !== 'number' || recorded < contracts[id].interaction.revision
    }),

    orphans: Object.keys(sessions).filter((id) => !owing.has(id)),
  }
}

/* --------------------------------------------------------------- policy -- */

export const assistiveTechnologyPolicy = definePolicy({
  assert: assertAtPairings,
  id: 'interaction.assistive-technology',
  kind: 'interaction',
})

/* ------------------------------------------------------------------ cli -- */

/**
 * `node packages/design/interaction/assistive-technology.mjs` prints the ledger
 * verdict as JSON. Nothing below runs on import.
 *
 * BOTH URL CONVERSIONS ARE LOAD-BEARING ON WINDOWS, and hand-rolling either is
 * how the file this replaces first failed. A `file:` URL's pathname begins with
 * a slash before the drive letter, and a dynamic import of a bare absolute path
 * is rejected with ERR_UNSUPPORTED_ESM_URL_SCHEME because the loader reads the
 * drive letter as a URL scheme.
 *
 * IT CALLS THE RULE, it does not restate it. `contractsOwingAtEvidence` is
 * ADR-025's derivation and lives with the registry; a copy here would agree with
 * it until somebody changed one, which is the defect this repository keeps
 * having. The same function is what the profile-mutation table interrogates.
 */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { readFileSync } = await import('node:fs')
  const { dirname, join } = await import('node:path')
  const { fileURLToPath } = await import('node:url')

  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')

  const { contracts, contractsOwingAtEvidence } = await import(
    pathToFileURL(join(ROOT, 'packages/design/src/contracts.ts')).href
  )
  const { sessions = {} } = JSON.parse(
    readFileSync(join(ROOT, '.architecture/a11y-evidence.json'), 'utf8'),
  )

  process.stdout.write(
    JSON.stringify(ledgerFailures({ contracts, gated: contractsOwingAtEvidence(), sessions })),
  )
}
