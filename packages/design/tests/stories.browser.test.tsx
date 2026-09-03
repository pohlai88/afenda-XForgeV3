/// <reference types="vite/client" />
import { createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

/**
 * EVERY STORY MOUNTS IN A REAL BROWSER.
 *
 * Storybook renders 36 stories and asserts nothing about any of them: a green build means
 * the bundler finished, not that a component came up. That gap is not hypothetical -- on
 * 2026-09-04 every story was indexed, the iframe returned 200, `tsc` was clean and the
 * page threw `React is not defined` on render, because `tsconfig.base.json` sets
 * `"jsx": "preserve"` and esbuild falls back to the classic runtime where Next's SWC
 * picks the automatic one. Nothing in the repository could have reported that. This can.
 *
 * The stories are read with `import.meta.glob` rather than listed, so a story added to
 * `stories/` is covered here without an edit, and a story that stops existing cannot
 * leave a passing case behind.
 *
 * NO STORYBOOK RUNTIME. `composeStories` would mean `@storybook/react` as a direct
 * dependency and a second render path; the sibling suites mount with `react-dom/client`
 * straight into `document.body` and this does the same. What is on trial is that the
 * component comes up, which needs no framework to ask.
 *
 * NOT THE STYLESHEET, deliberately -- `browser.setup.ts` refuses the tokens for the
 * reason written there. A story that mounts unstyled still proves the thing this suite is
 * for. Appearance is `tooling/gallery/proof.mjs`'s question, against the built app.
 */

/** The story file's default export: Storybook's meta, of which only these two matter here. */
interface StoryMeta {
  readonly args?: Record<string, unknown>
  readonly component?: unknown
}

interface StoryModule {
  readonly default?: StoryMeta
  readonly [name: string]: unknown
}

interface Story {
  readonly args?: Record<string, unknown>
  readonly render?: (args: Record<string, unknown>) => ReactElement
}

const modules = import.meta.glob<StoryModule>('../stories/*.stories.tsx', { eager: true })

/** `default` is the meta; every other export is a story. */
const cases = Object.entries(modules).flatMap(([path, mod]) => {
  const file = path.split('/').pop() ?? path
  const meta = mod.default
  return Object.entries(mod)
    .filter(([name]) => name !== 'default')
    .map(([name, value]) => ({ file, meta, name, story: value as Story }))
})

let root: Root | undefined
let host: HTMLElement | undefined

afterEach(() => {
  root?.unmount()
  host?.remove()
  root = undefined
  host = undefined
})

const mount = (element: ReactElement) => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  root.render(element)
  return host
}

describe('every story mounts', () => {
  /**
   * The empty-set failure, and the one this file is most exposed to: `import.meta.glob`
   * over a moved or renamed directory returns `{}`, `cases` is empty, `it.each` registers
   * nothing, and the suite reports green having rendered nothing at all.
   */
  it('has a population', () => {
    expect(Object.keys(modules).length).toBeGreaterThan(15)
    expect(cases.length).toBeGreaterThan(25)
  })

  it.each(cases)('$file — $name', async ({ meta, story }) => {
    // Storybook merges meta-level args under story-level ones; a story whose required
    // props live on the meta (Combobox's `options`) renders with nothing otherwise.
    const args = { ...meta?.args, ...story.args }

    const element = story.render
      ? story.render(args)
      : createElement(meta?.component as never, args as never)

    const container = mount(element)

    // POLLED, BECAUSE `createRoot().render()` IS ASYNCHRONOUS. React 19 schedules the
    // commit; reading `childElementCount` on the next line finds an empty host every
    // time, which is how the first run of this suite reported all 36 stories broken when
    // none of them were. The sibling suites do not hit it because `vitest/browser`
    // locators retry on their behalf.
    //
    // It still goes red for the real reason: a story that throws never commits, so the
    // host stays empty and this times out rather than passing.
    await expect.poll(() => container.childElementCount, { timeout: 2000 }).toBeGreaterThan(0)
  })
})

/**
 * EVERY AXIS VALUE IS FRAMED BY SOME STORY.
 *
 * `stories.test.ts` holds the story set equal to the component set, which catches a
 * component nobody framed and misses a VARIANT nobody framed. `apps/web/tests/gallery.test.tsx`
 * closes that for the gallery by importing each axis table and requiring every key to
 * appear as a `data-*` attribute on the page.
 *
 * This does the same for the stories, with one difference: WHICH TABLES TO CHECK is
 * derived rather than imported. The gallery names ALERT_TONE, BUTTON_VARIANT,
 * GRID_COLUMNS, TEXT_TONE and TEXT_VARIANT explicitly, so a table exported tomorrow is
 * covered there only when somebody remembers to add the import. Here the component
 * modules are globbed and every SCREAMING_CASE object export is treated as an axis, so
 * the sixth table is covered the day it is written.
 *
 * The axis attribute follows the table's name -- `ALERT_TONE` stamps `data-tone`,
 * `GRID_COLUMNS` stamps `data-columns` -- which is a convention rather than a rule
 * anything enforces. So a table whose values reach no matching attribute fails LOUDLY
 * here rather than being skipped: if the convention is ever broken, this suite is where
 * that surfaces, and the failure names the table.
 */
const componentModules = import.meta.glob<Record<string, unknown>>('../src/components/*.tsx', {
  eager: true,
})

interface Axis {
  readonly attribute: string
  readonly component: string
  readonly table: string
  readonly values: readonly string[]
}

const isPlainTable = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Tables whose attribute is NOT their name, each with the reason.
 *
 * The convention held for five of six tables and this suite found the sixth on its first
 * run: `SWATCH_ROLES` stamps `data-colour`, because the axis is which COLOUR ROLE a swatch
 * paints and `roles` names the table rather than the prop. Recorded rather than
 * generalised away -- a heuristic widened until nothing can fail it is not a check, and
 * the next table that breaks the convention should land here loudly too.
 */
const ATTRIBUTE_OF: Readonly<Record<string, string>> = {
  SWATCH_ROLES: 'data-colour',
}

const axes: Axis[] = Object.entries(componentModules).flatMap(([path, mod]) => {
  const component = (path.split('/').pop() ?? path).replace(/\.tsx$/, '')
  return Object.entries(mod)
    .filter(([name, value]) => /^[A-Z][A-Z_]+$/.test(name) && isPlainTable(value))
    .map(([table, value]) => ({
      // `ALERT_TONE` -> `tone`; `GRID_COLUMNS` -> `columns`. The component's own name is
      // the prefix, so what remains is the axis -- unless the table declares otherwise.
      attribute: ATTRIBUTE_OF[table] ?? `data-${table.split('_').slice(1).join('-').toLowerCase()}`,
      component,
      table,
      values: Object.keys(value as Record<string, unknown>),
    }))
})

describe('every axis value is framed', () => {
  /** A glob that matched nothing would make every case below vacuous. */
  it('found axis tables to check', () => {
    expect(axes.length, 'no SCREAMING_CASE axis tables found').toBeGreaterThan(3)
    expect(axes.map((a) => a.table)).toContain('ALERT_TONE')
  })

  /** A stale override outlives the table it names, and would then silently do nothing. */
  it('every declared attribute override names a table that exists', () => {
    for (const table of Object.keys(ATTRIBUTE_OF)) {
      expect(
        axes.map((a) => a.table),
        `${table} has an attribute override but is no longer an exported table`,
      ).toContain(table)
    }
  })

  it.each(axes)('$table', async ({ attribute, component, table, values }) => {
    expect(values.length, `${table} is empty`).toBeGreaterThan(0)

    const file = `../stories/${component}.stories.tsx`
    const mod = modules[file]
    expect(mod, `${component} has no story file`).toBeDefined()

    // Every story for this component, rendered into one host: a value framed by any of
    // them counts, which is what "framed by some story" means.
    const axisHost = document.createElement('div')
    document.body.append(axisHost)

    // One root per story, all of them kept so every one is unmounted at the end. The
    // first version made a root on the host, rendered into per-story roots underneath it,
    // then unmounted only the one that had never rendered anything -- so each case leaked
    // as many mounted trees as the component has stories.
    const roots: Root[] = []

    for (const [exportName, exported] of Object.entries(mod as StoryModule)) {
      if (exportName === 'default') {
        continue
      }
      const story = exported as Story
      const args = { ...(mod as StoryModule).default?.args, ...story.args }
      const element = story.render
        ? story.render(args)
        : createElement((mod as StoryModule).default?.component as never, args as never)
      const slot = document.createElement('div')
      axisHost.append(slot)
      const slotRoot = createRoot(slot)
      slotRoot.render(element)
      roots.push(slotRoot)
    }

    await expect.poll(() => axisHost.textContent?.length ?? 0, { timeout: 3000 }).toBeGreaterThan(0)

    for (const axisValue of values) {
      expect(
        axisHost.querySelector(`[${attribute}="${axisValue}"]`),
        `${table}.${axisValue} is declared but no ${component} story frames it (${attribute}="${axisValue}")`,
      ).not.toBeNull()
    }

    for (const mounted of roots) {
      mounted.unmount()
    }
    axisHost.remove()
  })
})
