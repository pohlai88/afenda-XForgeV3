/**
 * The design system's vocabulary, proved against the real Tailwind compiler.
 *
 * THE FAILURE THIS EXISTS FOR IS SILENCE. Tailwind generates a utility only for
 * a theme variable that exists, and the bridge clears the default palette with
 * `--color-*: initial`. So a role that projects into no namespace, a name that
 * collides with another namespace, and an ordinary typo all produce the same
 * thing: NO CSS. Not an error, not a warning, not a fallback — an element that
 * renders with inherited styling and a page that looks nearly right.
 *
 * TWO QUESTIONS, DELIBERATELY SEPARATE.
 *
 *   is every role reachable?   derived from the bridge — runs before any
 *                              component exists, which is the point
 *   does every class written   scanned from source — empty today, and grows
 *   actually compile?          with the system
 *
 * The first is what makes it safe to build fast: the vocabulary is proved whole
 * BEFORE anything consumes it, so there is nothing left to discover once
 * components start. The second catches what happens afterwards.
 *
 * Nothing here reimplements Tailwind's namespace lookup, its variant handling or
 * its scanner. It asks the compiler and reports what it said.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(import.meta.dirname, '../..')
const PKG = join(ROOT, 'packages/design')
const ENTRY = join(PKG, 'src/design.css')
const BRIDGE = join(PKG, 'generated/tailwind-theme.css')

/**
 * Resolved from `apps/web`, which is where the Tailwind pipeline is declared.
 * `tailwindcss` and `@tailwindcss/postcss` are devDependencies of that app on
 * purpose — the app owns the build, and a design system package has none.
 */
const requireFromApp = createRequire(join(ROOT, 'apps/web/package.json'))

/**
 * One representative utility per namespace.
 *
 * A namespace usually drives several (`--color-*` makes `bg-`, `text-`,
 * `border-` and `ring-`); one is enough to prove the variable is reachable,
 * because they all resolve through the same lookup. Listing every prefix would
 * test Tailwind rather than the bridge.
 */
const UTILITY_FOR = new Map([
  ['color', 'bg-'],
  ['container', 'max-w-'],
  ['ease', 'ease-'],
  ['font-weight', 'font-'],
  ['font', 'font-'],
  ['leading', 'leading-'],
  ['radius', 'rounded-'],
  ['spacing', 'p-'],
  ['text', 'text-'],
])

/** Longest namespace first: `--font-weight-body` is font-weight, not font. */
const NAMESPACES = [...UTILITY_FOR.keys()].sort((a, b) => b.length - a.length)

/** Every role the bridge declares, as the class a component would write. */
const rolesFromBridge = (): { cls: string; variable: string }[] => {
  const bridge = readFileSync(BRIDGE, 'utf8')
  const out: { cls: string; variable: string }[] = []
  for (const match of bridge.matchAll(/^\s*(--[\w-]+):\s*var\(/gm)) {
    const variable = match[1] ?? ''
    const namespace = NAMESPACES.find((ns) => variable.startsWith(`--${ns}-`))
    if (namespace === undefined) {
      continue
    }
    out.push({
      cls: `${UTILITY_FOR.get(namespace)}${variable.slice(namespace.length + 3)}`,
      variable,
    })
  }
  return out
}

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return sourceFiles(join(dir, entry.name))
    }
    return /\.tsx?$/.test(entry.name) ? [join(dir, entry.name)] : []
  })

/**
 * Prefixes whose value comes from the theme, and therefore from a token.
 *
 * Deliberately not every Tailwind prefix. `flex` and `items-center` are
 * structural and have no theme lookup behind them, so a typo there produces no
 * rule AND no design value that was meant to be present. What is listed is the
 * set where a missing rule means a token silently did not reach the screen.
 */
const THEMED = [
  'bg-',
  'text-',
  'border-',
  'ring-',
  'outline-',
  'rounded-',
  'font-',
  'leading-',
  'ease-',
  'p-',
  'px-',
  'py-',
  'm-',
  'mx-',
  'my-',
  'gap-',
  'size-',
  'min-w-',
  'min-h-',
  'max-w-',
]

/** Names Tailwind resolves without a theme variable. */
const BUILT_IN = new Set(['transparent', 'current', 'inherit', 'screen', 'full', 'auto', 'none'])

const compile = async (candidates: string[]): Promise<string> => {
  const postcss = requireFromApp('postcss')
  const tailwind = requireFromApp('@tailwindcss/postcss')
  const css = `${readFileSync(ENTRY, 'utf8')}\n@source inline("${candidates.join(' ')}");\n`
  const out = await postcss([tailwind()]).process(css, { from: ENTRY })
  return out.css
}

/**
 * Escape a class name the way CSS escapes an identifier.
 *
 * Tailwind writes `.bg-primary\/80` and `.px-2\.5`, so a lookup for the raw
 * `.bg-primary/80` finds nothing and reports a working class as missing. That is
 * the CHECKER failing, and a checker with false positives is one that gets
 * switched off -- which costs more than it ever caught. It reported 25 on the
 * first component installed, every one of them fine.
 *
 * Everything outside `[a-zA-Z0-9_-]` is escaped, which is the CSS rule rather
 * than a list of the characters Tailwind happens to use today. Class names never
 * begin with a digit, so that case does not arise.
 */
const cssEscape = (cls: string): string => cls.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`)

const missingFrom = (css: string, candidates: string[]): string[] =>
  candidates.filter((c) => !css.includes(`.${cssEscape(c)}`))

describe('the design system vocabulary compiles', () => {
  const roles = rolesFromBridge()

  it('projects a substantial vocabulary, or this suite proves nothing', () => {
    // The empty-set failure: a bridge that emitted nothing would satisfy every
    // assertion below and report an absent design system as a clean one.
    expect(roles.length).toBeGreaterThan(50)
    expect(roles.map((r) => r.cls)).toContain('bg-card')
  })

  it('and every role it declares is reachable from a utility', async () => {
    const css = await compile(roles.map((r) => r.cls))
    const missing = missingFrom(
      css,
      roles.map((r) => r.cls),
    )
    expect(
      missing,
      'these roles exist as variables and no utility can apply them -- a namespace ' +
        'the bridge projects into that Tailwind does not drive, or a name another ' +
        'namespace has already claimed',
    ).toEqual([])
  }, 30_000)

  /**
   * The custom utilities, which the bridge cannot describe.
   *
   * Tailwind has no border-width or outline-width namespace, so these are
   * `@utility` blocks in `design.css` rather than theme variables — and an
   * at-rule Tailwind never processes is one the browser silently discards.
   */
  it('and the custom width utilities compile', async () => {
    const custom = ['border-stroke', 'focus-visible:focus-ring']
    const css = await compile(custom)
    expect(missingFrom(css, custom)).toEqual([])
  }, 30_000)

  /**
   * THE DETECTOR, SHOWN A VIOLATION.
   *
   * Without this the assertions above are checks that have never gone red, and a
   * `missingFrom` that silently matched everything would report the same green
   * as a vocabulary with nothing wrong in it. `bg-not-a-role` is the exact shape
   * of the failure this suite exists for: a plausible class name that resolves
   * to no theme variable, which Tailwind answers with no CSS rather than an
   * error.
   */
  it('and a class naming no role is reported missing', async () => {
    const css = await compile(['bg-card', 'bg-not-a-role'])
    expect(missingFrom(css, ['bg-card', 'bg-not-a-role'])).toEqual(['bg-not-a-role'])
  }, 30_000)
})

describe('every token-driven class the design system writes compiles', () => {
  const isThemed = (word: string): boolean => {
    const bare = word.slice(word.lastIndexOf(':') + 1)
    const prefix = THEMED.find((p) => bare.startsWith(p))
    return prefix === undefined ? false : !BUILT_IN.has(bare.slice(prefix.length))
  }

  const candidates = [
    ...new Set(
      sourceFiles(join(PKG, 'src')).flatMap((f) =>
        [...readFileSync(f, 'utf8').matchAll(/'([^'\n]*)'|"([^"\n]*)"/g)]
          .flatMap((m) => (m[1] ?? m[2] ?? '').split(/\s+/))
          .filter(Boolean)
          .filter(isThemed),
      ),
    ),
  ].sort()

  it('compiles every one of them', async () => {
    // Vacuously true until components land, and that is honest rather than a
    // hole: the suite above proves the vocabulary, and this one proves what is
    // written against it. A minimum here would fail the day the package is
    // scaffolded and pass for the wrong reason the day after.
    if (candidates.length === 0) {
      expect(candidates).toEqual([])
      return
    }
    const css = await compile(candidates)
    expect(
      missingFrom(css, candidates),
      'these classes are written in packages/design and generate no CSS',
    ).toEqual([])
  }, 30_000)

  /**
   * THE TWO HOLES CLEARING A NAMESPACE CANNOT REACH, and both were found by
   * looking at a screen rather than by any check here.
   *
   * The Tailwind bridge clears `--text-*`, `--leading-*`, `--font-weight-*` and
   * `--color-*`, which is what turned forty-six vendored `text-sm`s into
   * failures above: a utility driven by a theme variable stops existing when the
   * variable does. Two kinds of utility are not driven by one.
   *
   *   STATIC        `leading-none` is `line-height: 1` written into Tailwind
   *                 itself. Clearing the leading namespace does not touch it, so
   *                 it compiled, rendered a 14px label at a 1.0 ratio, and was
   *                 invisible to the assertion above.
   *   ARBITRARY     `text-[0.8rem]` is a design value typed by hand into a class
   *                 attribute -- exactly what `tokens-are-the-authority` refuses
   *                 in CSS, arriving through a channel no guard reads. It
   *                 compiles, because Tailwind will emit whatever is in the
   *                 brackets.
   *
   * Both are the same defect as `bg-red-500`: a design value with no role, no
   * mode rebinding and no measurement. Neither can be refused by construction,
   * so they are refused by name.
   */
  it('and no class carries a value the token file never chose', () => {
    // Static utilities that survive their namespace being cleared. Listed rather
    // than pattern-matched: the point is to name the ones that are real holes,
    // not to guess at a shape.
    const STATIC_HOLES =
      /^(leading-(none|tight|snug|normal|relaxed|loose)|tracking-(tighter|tight|normal|wide|wider|widest)|text-(left|center|right|justify|start|end))$/
    // Anything in square brackets, on a property this design system owns.
    const ARBITRARY =
      /^(text|leading|tracking|font|p|px|py|pt|pr|pb|pl|m|mx|my|gap|w|h|size|rounded|border|bg|shadow)(-[a-z]+)?-\[/

    const offenders = candidates
      .map((c) => ({ bare: c.slice(c.lastIndexOf(':') + 1), full: c }))
      .filter(({ bare }) => STATIC_HOLES.test(bare) || ARBITRARY.test(bare))
      // Alignment is not a design value -- `text-center` chooses no size, colour
      // or spacing, and there is no token that could own it.
      .filter(({ bare }) => !/^text-(left|center|right|justify|start|end)$/.test(bare))
      .map(({ full }) => full)

    expect(
      offenders,
      'these classes write a design value directly instead of naming a role',
    ).toEqual([])
  })
})
