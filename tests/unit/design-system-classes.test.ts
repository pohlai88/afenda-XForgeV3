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
const ENTRY = join(ROOT, 'apps/web/app/globals.css')
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
  // Per-channel colour utilities (ADR-034 Decision 3) are declared, not projected: a
  // role that left `--color-*` appears here as `@utility bg-error-container { … }`, and is a class
  // the design system writes exactly like a namespaced one.
  for (const match of bridge.matchAll(/^@utility ([\w-]+) \{/gm)) {
    out.push({ cls: match[1] ?? '', variable: `@utility ${match[1]}` })
  }
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

/**
 * Authored source only. `components/ui/` is the vendored shadcn tree: written by
 * `shadcn add`, never edited here, unexported, and excluded from every check
 * (ADR-031 rule 7, ADR-033). Its classes are upstream's business until a
 * component policy projects them; the classes THIS repository writes are what
 * these two questions are about.
 */
const VENDORED = /[\\/]components[\\/]ui$/

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      const sub = join(dir, entry.name)
      return VENDORED.test(sub) ? [] : sourceFiles(sub)
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
  'tracking-',
  'shadow-',
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
// `dashed` is a border STYLE keyword (`border-dashed`), not a colour or a width.
const BUILT_IN = new Set([
  'transparent',
  'current',
  'inherit',
  'screen',
  'full',
  'auto',
  'none',
  'dashed',
])

/**
 * Compile the application's stylesheet with extra candidates injected. This answers "CAN
 * this class compile" -- is the role reachable, is the namespace closed -- and nothing
 * about whether the application's own build ever sees the class. `compileEntry` answers
 * that.
 */
const compile = async (candidates: string[]): Promise<string> => {
  const postcss = requireFromApp('postcss')
  const tailwind = requireFromApp('@tailwindcss/postcss')
  const css = `${readFileSync(ENTRY, 'utf8')}\n@source inline("${candidates.join(' ')}");\n`
  const out = await postcss([tailwind()]).process(css, { from: ENTRY })
  return out.css
}

/**
 * Compile the application's stylesheet EXACTLY as the application does: its own `@source`
 * directives, no injected candidates. What this returns is what a screen receives.
 *
 * The distinction is the defect the employee page showed on 2026-09-03. Every STYLE class
 * compiled through `compile()`, because the test handed the compiler the manifest; the
 * page rendered with no background, black ink, a 16px title and a button with no padding,
 * because the application's `@source` scanned `packages/design/src/` and the class
 * literals had moved into `generated/style.ts` when the components started selecting
 * symbols. A green test over a shape production does not use.
 */
const compileEntry = async (): Promise<string> => {
  const postcss = requireFromApp('postcss')
  const tailwind = requireFromApp('@tailwindcss/postcss')
  // `base` is where Tailwind's automatic detection starts, and it defaults to the process
  // cwd. Run from the repository root that is the whole repository -- manifest included --
  // and every class is found by accident. `next dev` runs from apps/web; so does this.
  const out = await postcss([tailwind({ base: join(ROOT, 'apps/web') })]).process(
    readFileSync(ENTRY, 'utf8'),
    { from: ENTRY },
  )
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

// A selector match ends at a non-name character: `.bg-surface-lowest` must not be satisfied by
// `.bg-on-surface`. The substring form was, which hid a missing role behind its
// companion's rule and reported `text-error-container` as compiled because `.text-on-error-container` was.
const missingFrom = (css: string, candidates: string[]): string[] =>
  candidates.filter((c) => {
    const selector = `.${cssEscape(c)}`
    let at = css.indexOf(selector)
    while (at !== -1) {
      if (!/[\w-]/.test(css.charAt(at + selector.length))) {
        return false
      }
      at = css.indexOf(selector, at + 1)
    }
    return true
  })

describe('the design system vocabulary compiles', () => {
  const roles = rolesFromBridge()

  it('projects a substantial vocabulary, or this suite proves nothing', () => {
    // The empty-set failure: a bridge that emitted nothing would satisfy every
    // assertion below and report an absent design system as a clean one.
    expect(roles.length).toBeGreaterThan(50)
    expect(roles.map((r) => r.cls)).toContain('bg-surface-lowest')
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
   * `@utility` blocks in the app stylesheet rather than theme variables — and an
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
  /**
   * ADR-031 Decision 12 lists "every STYLE symbol resolves to an emitted class" as owed.
   * This is it: every class the style manifest names is present in the stylesheet the
   * application actually builds -- its own `@source` directives, nothing injected. A symbol
   * whose class the application's build does not emit is a word a component says that
   * renders nothing, and that is invisible everywhere except on a screen.
   */
  it('every STYLE symbol resolves to a class the application build emits', async () => {
    const manifest = JSON.parse(
      readFileSync(join(PKG, 'generated/style-manifest.json'), 'utf8'),
    ) as { symbols: Record<string, { class: string }> }
    const classes = [...new Set(Object.values(manifest.symbols).flatMap((s) => s.class.split(' ')))]
    expect(classes.length).toBeGreaterThan(60)
    const css = await compileEntry()
    expect(
      missingFrom(css, classes),
      'STYLE classes the application stylesheet does not emit',
    ).toEqual([])
  }, 30_000)

  /**
   * The closure that ADR-034 Decision 3 is for, asserted in both directions: a role that
   * left the namespace compiles through the channels its kind declares and through no
   * other. `text-error-container` would paint prose in a status tint; `bg-on-error-container` would
   * paint a surface in an ink. Neither exists now.
   */
  it('a narrowed role compiles only through its declared channels', async () => {
    const declared = ['bg-error-container', 'text-on-error-container']
    const refused = [
      'text-error-container',
      'bg-on-error-container',
      'border-scrim',
      'bg-shadow-key',
    ]
    const css = await compile([...declared, ...refused])
    expect(missingFrom(css, declared)).toEqual([])
    expect(missingFrom(css, refused)).toEqual(refused)
  }, 30_000)

  /**
   * ADR-034 step 9: the numeric spacing scale does not exist. `--spacing` is Tailwind's
   * multiplier, not a namespace -- `p-13` is `calc(var(--spacing) * 13)` -- so clearing it
   * takes every numeric spacing utility with it, the zero resets included. The zero is a
   * word now (`space.none`), and both directions are asserted: the numbers compile to
   * nothing, the roles still compile.
   */
  it('the numeric spacing scale compiles to nothing; the roles still compile', async () => {
    const numeric = ['p-13', 'p-4', 'gap-2', 'm-0', 'p-0', 'min-w-0']
    const roleClasses = ['p-none', 'm-none', 'p-tight', 'gap-normal', 'px-row-x']
    const css = await compile([...numeric, ...roleClasses])
    expect(missingFrom(css, numeric)).toEqual(numeric)
    expect(missingFrom(css, roleClasses)).toEqual([])
  }, 30_000)

  /**
   * DISABLED DOMINATES. A disabled, unchecked Switch carries both `data-unchecked` and
   * `data-disabled`; with one attribute selector each, the stylesheet's order decided
   * which fill won, and it was the field fill. The gallery proof measured it on
   * 2026-09-04: rgb(255,255,255) where the disabled token was meant. The contract now says
   * it: every interaction state at rest excludes disabled, so a disabled control shows no
   * other interaction state whatever the order the rules come out in. Red before
   * INTERACTION_STATES emitted the exclusion.
   */
  it('every interaction state at rest excludes disabled, so disabled needs no luck to win', async () => {
    const manifest = JSON.parse(
      readFileSync(join(PKG, 'generated/style-manifest.json'), 'utf8'),
    ) as { symbols: Record<string, { class: string }> }
    const atRest = Object.entries(manifest.symbols).filter(
      ([symbol]) =>
        symbol.startsWith('interaction.') && !symbol.startsWith('interaction.disabled.'),
    )
    expect(atRest.length).toBeGreaterThan(3)
    const css = await compile(atRest.map(([, s]) => s.class))
    for (const [symbol, { class: cls }] of atRest) {
      expect(cls, symbol).toContain('not-data-disabled:')
      // The rule the browser applies carries the exclusion, not only the class name.
      const at = css.indexOf(`.${cssEscape(cls)}`)
      expect(at, `${symbol} compiles`).toBeGreaterThan(-1)
      expect(css.slice(at, at + 400), symbol).toContain(':not([data-disabled])')
    }
  }, 30_000)

  it('and a class naming no role is reported missing', async () => {
    const css = await compile(['bg-surface-lowest', 'bg-not-a-role'])
    expect(missingFrom(css, ['bg-surface-lowest', 'bg-not-a-role'])).toEqual(['bg-not-a-role'])
  }, 30_000)
})

/**
 * ADR-031 Decision 12 / ADR-034 step 7: the authored layer SELECTS style, it does not write
 * it. Every design-bearing class a component renders arrives through a `STYLE` symbol,
 * whose class the manifest test above proves compiles; so the string literals in authored
 * source may carry structural words (`flex`, `items-start`, `shrink-0`), zero resets
 * (`m-0`, `p-0`) and nothing that names a token. This replaces the check that compiled
 * every literal the layer wrote: once nothing is written, "does it compile" is answered by
 * the symbol, and the question left is "was anything written at all".
 *
 * Observed RED on 2026-09-03 before the recipes moved: 46 design-bearing literals across
 * twelve files, `bg-error-container` to `text-body-compact`. Green once every one became a symbol.
 */
describe('the authored layer selects style; it does not write it', () => {
  // Alignment keywords carry no token: `text-center` chooses no size, colour or spacing.
  // Zero resets are NOT exempt any more: since ADR-034 step 9 `m-0` compiles to nothing,
  // and the zero is a word, `space.none`.
  const ALIGNMENT = /^text-(left|center|right|justify|start|end)$/
  const isThemed = (word: string): boolean => {
    const bare = word.slice(word.lastIndexOf(':') + 1)
    const prefix = THEMED.find((p) => bare.startsWith(p))
    if (prefix === undefined || ALIGNMENT.test(bare)) {
      return false
    }
    return !BUILT_IN.has(bare.slice(prefix.length))
  }

  /**
   * ADR-034 step 10: an arbitrary design value -- a length, a colour, a calc() typed inside
   * square brackets -- is refused on ANY prefix, not only the themed ones: `w-[32px]` and
   * `translate-x-[calc(100%-2px)]` name no token whichever property they set. Attribute
   * selectors (`data-[size=sm]:`) and arbitrary variants (`[&_svg]:`) are not values and
   * are left alone. Cost today: zero, and the predicate is proved on upstream's own words.
   */
  const ARBITRARY = /-\[(-?\d*\.?\d+(px|rem|em|s|ms|%|vh|vw|ch|deg)|#[0-9a-fA-F]{3,8}|calc\()/
  const isArbitrary = (word: string): boolean =>
    ARBITRARY.test(word.slice(word.lastIndexOf(':') + 1))

  // Comments are not literals: cn.ts explains a merge with `"p-normal p-loose"` in prose.
  const stripComments = (text: string) =>
    text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const literals = sourceFiles(join(PKG, 'src')).flatMap((f) =>
    [...stripComments(readFileSync(f, 'utf8')).matchAll(/'([^'\n]*)'|"([^"\n]*)"/g)]
      .flatMap((m) => (m[1] ?? m[2] ?? '').split(/\s+/))
      .filter(Boolean)
      .map((word) => ({ file: f.slice(PKG.length + 1), word })),
  )

  it('has authored source to hold to it', () => {
    expect(literals.length).toBeGreaterThan(20)
  })

  it('refuses an arbitrary design value on any prefix, and only a value', () => {
    for (const word of [
      'h-[18.4px]',
      'w-[32px]',
      'translate-x-[calc(100%-2px)]',
      'text-[0.8rem]',
      'bg-[#fff]',
    ]) {
      expect(isArbitrary(word), word).toBe(true)
    }
    for (const word of ['data-[size=sm]:h-4', '[&_svg]:size-4', 'w-(--anchor-width)', 'p-tight']) {
      expect(isArbitrary(word), word).toBe(false)
    }
    const offenders = literals
      .filter(({ word }) => isArbitrary(word))
      .map(({ file, word }) => `${file}: ${word}`)
    expect(offenders, 'hand-typed design values in authored source').toEqual([])
  })

  it('writes no design-bearing class literal', () => {
    const offenders = literals
      .filter(({ word }) => isThemed(word))
      .map(({ file, word }) => `${file}: ${word}`)
    expect(offenders, 'design-bearing classes written instead of selected').toEqual([])
  })
})
