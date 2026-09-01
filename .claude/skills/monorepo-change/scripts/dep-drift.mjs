#!/usr/bin/env node
/**
 * Report external dependencies whose version range disagrees between workspace
 * packages.
 *
 * The drift table in SKILL.md is a snapshot and rots the moment somebody adds a
 * dependency. This is the check itself, so the skill can say "re-run it" rather
 * than asking anyone to trust a number written down once.
 *
 * `workspace:` specifiers are skipped deliberately: those resolve to the
 * package in this repository and cannot drift. Only external ranges can.
 *
 * Exits 1 when anything drifts, so it can be wired to a stage later if the
 * problem ever earns one. It is NOT a stage today -- ADR-024's ratio is the
 * reason, and one script run by hand is not governance.
 *
 *   node .claude/skills/monorepo-change/scripts/dep-drift.mjs
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const WORKSPACE_ROOTS = ['apps', 'modules', 'packages']
const EXTRA = ['tests/fixtures']
const FIELDS = ['dependencies', 'devDependencies', 'peerDependencies']

function manifests() {
  const found = [['<root>', 'package.json']]
  for (const root of WORKSPACE_ROOTS) {
    if (!existsSync(root)) {
      continue
    }
    for (const entry of readdirSync(root)) {
      const path = join(root, entry, 'package.json')
      if (existsSync(path)) {
        found.push([`${root}/${entry}`, path])
      }
    }
  }
  // Label with the declared directory rather than stripping the path: join()
  // emits backslashes on Windows, and a separator-specific regex misses silently.
  for (const dir of EXTRA) {
    const path = join(dir, 'package.json')
    if (existsSync(path)) {
      found.push([dir, path])
    }
  }
  return found
}

const uses = new Map()
const found = manifests()

for (const [name, path] of found) {
  const manifest = JSON.parse(readFileSync(path, 'utf8'))
  for (const field of FIELDS) {
    for (const [dep, spec] of Object.entries(manifest[field] ?? {})) {
      // A workspace: specifier names a package in this repo -- it cannot drift.
      if (String(spec).startsWith('workspace:')) {
        continue
      }
      if (!uses.has(dep)) {
        uses.set(dep, [])
      }
      uses.get(dep).push({ package: name, spec })
    }
  }
}

const drifting = [...uses.entries()].filter(([, list]) => new Set(list.map((u) => u.spec)).size > 1)

for (const [dep, list] of drifting) {
  console.log(`DRIFT  ${dep}`)
  for (const { package: pkg, spec } of list) {
    console.log(`         ${spec.padEnd(12)} ${pkg}`)
  }
}

const catalogued = existsSync('pnpm-workspace.yaml')
  ? /(^|\n)catalog[s]?:/.test(readFileSync('pnpm-workspace.yaml', 'utf8'))
  : false

console.log(
  `\n${found.length} packages · ${uses.size} external deps · ${drifting.length} drifting · catalog: ${catalogued ? 'in use' : 'NOT in use'}`,
)

if (drifting.length > 0) {
  console.log(
    '\nA drifting dependency is two sources for one fact. Reconcile it in the\n' +
      'pnpm-workspace.yaml catalog, or state why the ranges differ on purpose.',
  )
  process.exit(1)
}
