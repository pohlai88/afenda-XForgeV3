#!/usr/bin/env node
/**
 * Run this repository's guards against a candidate typeset stylesheet or screen,
 * WITHOUT writing anything into the repository.
 *
 * The table in `references/xforge.md` states which guards refuse which parts of
 * the vendor typeset recipe. A table is a claim; this is the check. Run it
 * whenever you are about to rely on that table, and especially before recording
 * any of it as evidence — a guard changes and the prose does not.
 *
 *   node .claude/skills/typeset/scripts/probe-guards.mjs
 *       the built-in candidate: the vendor recipe, unmodified
 *
 *   node .claude/skills/typeset/scripts/probe-guards.mjs --expect
 *       same, but exits non-zero unless every known violation still fires.
 *       This is the mutation test: it proves the guards can still go red.
 *
 *   node .claude/skills/typeset/scripts/probe-guards.mjs path/to/typeset.css [more...]
 *       real files, checked as if they sat at that path in the repository
 *
 *   node .claude/skills/typeset/scripts/probe-guards.mjs --clean packages/design/src/x.css
 *       exits non-zero unless every governing guard applied AND none fired.
 *       This is how an ADAPTED stylesheet proves itself, and it fails on an
 *       ungoverned path rather than certifying a file nothing inspected.
 *
 * The guards take (file, source) and decide from the PATH whether they apply, so
 * a candidate is checked at the path it would really live at. Passing a file
 * from outside `packages/design/src/` will correctly report nothing, which is
 * the finding in `references/xforge.md` about unguarded placement.
 */

import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SKILL_DIR = dirname(dirname(fileURLToPath(import.meta.url)))
const REPO_ROOT = resolve(SKILL_DIR, '../../..')

/* -------------------------------------------------------------- candidate -- */

/**
 * The vendor recipe as published, at the two paths it would occupy here. Every
 * line is something the shadcn/typeset documentation actually tells you to
 * write; none of it is a strawman.
 */
const CANDIDATE = [
  [
    'packages/design/src/typeset.css',
    `@layer components {
  .typeset {
    --typeset-size: 15px;
    --typeset-leading: 1.75;
    --typeset-flow: 1.25em;
    font-size: var(--typeset-size);
    line-height: var(--typeset-leading);
    color: #0a0a0c;
  }
  .typeset :where(h2) {
    margin-block-start: calc(var(--typeset-flow) * 1.6);
    font-weight: 600;
    line-height: 1.3;
  }
  .typeset :where(p) {
    margin-block-start: var(--typeset-flow);
  }
}
.dark .typeset {
  --typeset-leading: 1.9;
}`,
  ],
  [
    'apps/web/app/docs/page.tsx',
    `export default function DocsPage() {
  return (
    <div className="typeset typeset-docs">
      <Rendered />
    </div>
  )
}`,
  ],
]

/**
 * What `references/xforge.md` claims. `--expect` fails if any of these stops
 * firing, because that is the moment the reference becomes wrong.
 */
const EXPECTED = [
  'no-bespoke-styling',
  'stylesheet-names-roles-not-primitives',
  'tokens-are-the-authority',
]

/* ------------------------------------------------------------------- run -- */

const args = process.argv.slice(2)
const expectMode = args.includes('--expect')
const cleanMode = args.includes('--clean')
const paths = args.filter((a) => !a.startsWith('--'))

if (expectMode && cleanMode) {
  console.error('--expect and --clean assert opposite things; pass one')
  process.exit(2)
}

/*
 * A plain loop rather than `paths.map`, because the read can fail and the
 * failure exits: a callback with a non-returning path is exactly what
 * `useIterableCallbackReturn` refuses, and it is right to.
 */
const subjects = []
if (paths.length === 0) {
  subjects.push(...CANDIDATE)
} else {
  for (const p of paths) {
    const abs = resolve(process.cwd(), p)
    let source
    try {
      source = readFileSync(abs, 'utf8')
    } catch (error) {
      console.error(`cannot read ${p}: ${error.message}`)
      process.exit(2)
    }
    subjects.push([relative(REPO_ROOT, abs).replaceAll('\\', '/'), source])
  }
}

const guardsModule = pathToFileURL(resolve(REPO_ROOT, 'tooling/architecture/guards/index.mjs')).href

let guards
try {
  ;({ guards } = await import(guardsModule))
} catch (error) {
  console.error(
    `could not load the guards from ${guardsModule}\n` +
      `  ${error.message}\n` +
      '  This probe is only meaningful inside the Xforge repository.',
  )
  process.exit(2)
}

if (!Array.isArray(guards) || guards.length === 0) {
  console.error('the guard module exported no guards -- nothing was inspected, so nothing passed')
  process.exit(2)
}

const findings = []
/** Which guards were even ELIGIBLE per subject. Coverage, reported separately
 *  from findings — "nothing fired" and "nothing looked" print identically
 *  otherwise, and they are opposite results. */
const coverage = new Map(subjects.map(([file]) => [file, []]))

for (const guard of guards) {
  for (const [file, source] of subjects) {
    if (!guard.applies?.(file)) {
      continue
    }
    coverage.get(file).push(guard.id)
    let reported
    try {
      reported = guard.check(file, source) ?? []
    } catch (error) {
      console.error(`  !! ${guard.id} threw on ${file}: ${error.message}`)
      continue
    }
    for (const violation of reported) {
      findings.push({ file, guard: guard.id, law: guard.law, ...violation })
    }
  }
}

/* --------------------------------------------------------------- report -- */

/*
 * COVERAGE FIRST, and this is the whole reason the probe exists in this shape.
 *
 * The three CSS guards scope to `packages/design/src/**.css` and the styling
 * guard to the screen paths. A candidate anywhere else is inspected by neither,
 * and reporting that as "no guard fired" is the ADR-024 failure verbatim:
 * installed, configured, green, and blind. So every subject prints what
 * actually looked at it, and a subject that no GOVERNING guard reached is
 * called out as ungoverned rather than clean.
 */
const GOVERNING = new Set([...EXPECTED, 'tokens-referenced-are-tokens-that-exist'])

console.log(`inspected ${subjects.length} subject(s)\n`)

let ungoverned = 0
for (const [file, ids] of coverage) {
  const governing = ids.filter((id) => GOVERNING.has(id))
  console.log(`  ${file}`)
  console.log(`    ${ids.length} guard(s) applied, ${governing.length} of them governing`)
  if (governing.length === 0) {
    ungoverned += 1
    console.log(
      '    UNGOVERNED -- no design-system guard reaches this path. Whatever this\n' +
        '    file contains, it was not checked. Unguarded is worse than refused.',
    )
  }
  console.log()
}

if (findings.length === 0) {
  console.log(
    ungoverned > 0 ? 'no guard fired -- but see the coverage note above.' : 'no guard fired.',
  )
} else {
  const width = Math.max(...findings.map((f) => f.guard.length))
  for (const f of findings) {
    console.log(`${f.guard.padEnd(width)}  law ${f.law}  ${f.file}:${f.line}`)
    console.log(`${' '.repeat(width)}  ${f.message}\n`)
  }
}

/* ---------------------------------------------------------- assertions -- */

/*
 * `--clean` asserts the OPPOSITE of `--expect`, and both can go red. A probe
 * with only one assertion direction can confirm a violation but never confirm a
 * fix, which is half a tool.
 */
if (cleanMode) {
  if (ungoverned > 0) {
    console.error(
      '\nCLEAN NOT PROVEN: a subject is ungoverned.\n' +
        '  A file no guard reaches cannot be certified clean by guards. Move it under\n' +
        '  packages/design/src/ and run again.',
    )
    process.exit(1)
  }
  if (findings.length > 0) {
    console.error(`\nNOT CLEAN: ${findings.length} violation(s) above.`)
    process.exit(1)
  }
  console.log('\nclean -- every governing guard applied, and none fired.')
  process.exit(0)
}

if (!expectMode) {
  process.exit(0)
}

const fired = new Set(findings.map((f) => f.guard))
const missing = EXPECTED.filter((id) => !fired.has(id))

if (missing.length > 0) {
  console.error(
    `\nEXPECTED GUARDS DID NOT FIRE: ${missing.join(', ')}\n` +
      '  references/xforge.md claims these refuse the vendor recipe. Either the\n' +
      '  guard was weakened and the reference is now stale, or the subject is not\n' +
      '  the vendor recipe -- `--expect` describes the built-in candidate. To assert\n' +
      '  that an ADAPTED stylesheet is clean, use `--clean` instead.',
  )
  process.exit(1)
}

console.log(`\nall ${EXPECTED.length} expected guards fired -- references/xforge.md still holds.`)
