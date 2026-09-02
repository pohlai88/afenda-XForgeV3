/**
 * What a recorded assistive-technology session must CONTAIN, checked.
 *
 * THE GATE USED TO READ ONE INTEGER. `at-evidence.mjs` decided the whole
 * question with `recorded < contracts[id].interaction.revision`, so this --
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
 * SO THE PROSE MOVES INTO THE CHECK. Everything asserted above is now a field
 * this module refuses to accept without, and `tests/unit/at-session.test.ts`
 * shows it each malformed shape and proves it rejects -- because a validator
 * that has never refused anything is the thing ADR-024 is about.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It cannot tell whether a transcript is
 * TRUE. Nothing can; that is what a reviewer is for. It can tell that a
 * transcript exists, which pairing produced it, when, and by whom -- which is
 * the difference between an attestation somebody can check and one only its
 * author can.
 */

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
export const SUPPORTED_AT = Object.freeze(['JAWS', 'NVDA', 'VoiceOver'])

/** Paired with the reader, because the pair is what decides what a result means. */
export const SUPPORTED_BROWSERS = Object.freeze(['Chrome', 'Edge', 'Firefox', 'Safari'])

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
export const REQUIRED_PAIRINGS = Object.freeze([
  Object.freeze({ at: 'NVDA', browser: 'Chrome' }),
  Object.freeze({ at: 'JAWS', browser: 'Chrome' }),
])

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const isFilledString = (v) => typeof v === 'string' && v.trim().length > 0

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
