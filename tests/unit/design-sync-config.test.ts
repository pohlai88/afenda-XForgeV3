/**
 * `.design-sync/config.json` holds a second copy of the authored component list, and its
 * own NOTES.md says nothing checks it: "adding a component means adding a line to
 * `.ds-sync/pkg/index.ts` AND an entry to `componentSrcMap`; a missing line silently drops
 * the component from the sync." This is the check, for the half that is tracked.
 *
 * Derived from disk, not from a list: every `packages/design/src/components/*.tsx` (the
 * vendored `ui/` tree excluded) is an authored component, and the config must map exactly
 * those, each to its real file, with one preview file per component. The `.ds-sync/` entry
 * package is gitignored and may not exist on another machine, so it is not held here; the
 * sync session's NOTES.md remains the only record of that half.
 *
 * MUTATION WATCHED GO RED, 2026-09-03: with `Switch` removed from `componentSrcMap`, the
 * mapping case failed naming the missing component; restored, green.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(import.meta.dirname, '../..')
const SYNC = join(ROOT, '.design-sync')
const COMPONENTS = join(ROOT, 'packages/design/src/components')
// The config's relative paths resolve from the sync ENTRY package, `.ds-sync/pkg/`, the
// directory the converter runs from (NOTES.md: `cssEntry: "./utilities.css"` is
// `.ds-sync/pkg/utilities.css`). Gitignored, so its existence is not assumed; resolution
// needs only the path.
const ENTRY = join(ROOT, '.ds-sync/pkg')

const pascal = (kebab: string) =>
  kebab
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

/** The authored components, by the PascalCase name the sync uses, from the directory. */
const authored = Object.fromEntries(
  readdirSync(COMPONENTS, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.tsx'))
    .map((e) => [pascal(e.name.replace(/\.tsx$/, '')), join(COMPONENTS, e.name)] as const),
)

interface SyncConfig {
  readonly componentSrcMap: Record<string, string>
  readonly srcDir: string
}

const config = JSON.parse(readFileSync(join(SYNC, 'config.json'), 'utf8')) as SyncConfig

describe('the design-sync config describes the components directory', () => {
  it('has components to hold it to', () => {
    expect(Object.keys(authored).length).toBeGreaterThan(10)
  })

  it('maps exactly the authored components, no more and no fewer', () => {
    expect(Object.keys(config.componentSrcMap).sort()).toEqual(Object.keys(authored).sort())
  })

  it('maps each component to its real source file', () => {
    for (const [name, rel] of Object.entries(config.componentSrcMap)) {
      expect(resolve(ENTRY, rel), `${name} points at a file that is not its source`).toBe(
        authored[name],
      )
    }
    expect(resolve(ENTRY, config.srcDir)).toBe(COMPONENTS)
  })

  it('has one preview file per component', () => {
    const previews = readdirSync(join(SYNC, 'previews'))
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => f.replace(/\.tsx$/, ''))
      .sort()
    expect(previews).toEqual(Object.keys(authored).sort())
    for (const name of previews) {
      expect(existsSync(join(SYNC, 'previews', `${name}.tsx`))).toBe(true)
    }
  })
})
