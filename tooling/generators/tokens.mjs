#!/usr/bin/env node
/**
 * Design tokens -> CSS custom properties.
 *
 * `packages/tokens/tokens.json` is the authority; the CSS is DERIVED. Writing
 * both by hand would give one design value two homes, which is the defect this
 * repository keeps having -- and the cheapest place to prevent it is where the
 * second home does not exist yet.
 *
 * The output is generated state (law 27): never hand-edited, and the `generate`
 * stage asserts it is byte-identical after regeneration.
 *
 * The input follows the W3C Design Tokens Format Module (v2025.10): every token
 * is an object with `$value`, groups may carry `$type`, and a value of the form
 * `{group.name}` is an ALIAS to another token.
 *
 * -------------------------------------------------------------------------
 * ALIASES ARE PRESERVED AS `var()` REFERENCES, NOT RESOLVED TO LITERALS.
 *
 * This is the change that makes a theme possible at all. Resolving to literals
 * emitted `--semantic-surface-raised: #ffffff` and, for anything aliasing it,
 * `#ffffff` again -- so rebinding the role under `[data-theme='dark']` changed
 * the role and NOTHING that referenced it. The three-tier hierarchy was real in
 * the source file and flattened away in the output, which is the worst place
 * for a structure to exist: visible to a reader, absent from the artefact.
 *
 * Emitting `var(--semantic-surface-raised)` instead means one rebinding of a
 * role updates every token and every rule downstream of it, which is the entire
 * argument for having a semantic layer. `resolve()` survives as the VALIDATOR
 * -- cycles and dangling references still have to be caught, and now so do
 * illegal tier edges -- but its output is no longer what gets written.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = join(import.meta.dirname, '../..')
const INPUT = join(ROOT, 'packages/tokens/tokens.json')
const OUTPUT = join(ROOT, 'packages/tokens/generated/tokens.css')

/**
 * Growth in the component tier is a thing a human should look at, not a thing
 * an architecture should score. This is a tripwire, not a design metric: it
 * does not claim 12 tokens are correct and 13 are wrong. Raising it is its own
 * commit, carrying the measured count and the reason -- the same discipline as
 * a performance budget.
 */
const COMPONENT_TOKEN_CEILING = 12

/** Top-level group -> tier. Anything unlisted is a primitive. */
const TIER_OF_GROUP = { component: 'component', semantic: 'semantic' }

/**
 * Which tier may alias which. `component -> primitive` is the edge that matters:
 * allowing it makes the semantic layer optional decoration, because the quickest
 * way to style anything becomes reaching straight past it.
 */
const ALLOWED_EDGES = {
  component: ['component', 'semantic'],
  primitive: [],
  semantic: ['semantic', 'primitive'],
}

const tierOf = (name) => TIER_OF_GROUP[name.split('.')[0]] ?? 'primitive'

const isAlias = (value) => typeof value === 'string' && value.startsWith('{') && value.endsWith('}')

const aliasTarget = (value) => value.slice(1, -1)

const cssName = (path) => `--${path.replace(/\./g, '-')}`

/**
 * Every token as a flat path -> { value, type }, keeping `$`-prefixed metadata
 * out of the result but inheriting `$type` down from the group that declared it.
 * The type is what axis ownership is checked against, so it has to travel with
 * the token rather than being re-derived from the name.
 */
function flatten(root) {
  // The recursion is an inner walk so the exported signature carries NO default
  // parameters. With `flatten(node, path = [], inheritedType, out = new Map())`
  // two lint rules fought over it -- one stripped the `= undefined` that the
  // other then demanded back -- which is the cycle that removed `sourceFiles()`'s
  // default three times. A signature with nothing to reorder ends the argument.
  const out = new Map()

  const walk = (node, path, inheritedType) => {
    const type = node.$type ?? inheritedType
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('$')) {
        continue
      }
      if (value && typeof value === 'object' && '$value' in value) {
        out.set([...path, key].join('.'), { type: value.$type ?? type, value: value.$value })
      } else if (value && typeof value === 'object') {
        walk(value, [...path, key], type)
      }
    }
  }

  walk(root, [], undefined)
  return out
}

/**
 * Validate the alias graph: no dangling reference, no cycle, no illegal tier
 * edge. Returns fully resolved literals, which nothing is emitted from any more
 * but which prove every chain terminates.
 */
function resolve(tokens) {
  const resolved = new Map()
  for (const [name, token] of tokens) {
    let { value } = token
    // The SOURCE of the edge currently being checked, which moves along the
    // chain. Holding it fixed at `name` checks the wrong edge: a legal
    // `component -> semantic -> primitive` chain would be rejected on its second
    // hop as though the component had reached the primitive directly.
    let from = name
    for (let depth = 0; isAlias(value); depth += 1) {
      if (depth > 10) {
        throw new Error(`token alias cycle at '${name}'`)
      }
      const target = aliasTarget(value)
      if (!tokens.has(target)) {
        throw new Error(`token '${from}' aliases '${target}', which does not exist`)
      }
      const fromTier = tierOf(from)
      const toTier = tierOf(target)
      if (!ALLOWED_EDGES[fromTier].includes(toTier)) {
        throw new Error(
          `token '${from}' (${fromTier}) aliases '${target}' (${toTier}), which the tier ` +
            'direction forbids -- primitive -> semantic -> component is one way',
        )
      }
      ;({ value } = tokens.get(target))
      from = target
    }
    resolved.set(name, value)
  }
  return resolved
}

/**
 * The one thing tokens CAN guarantee about target size: the floor value itself.
 *
 * Tokens cannot guarantee the rendered result -- a 20px control is still
 * constructible from compliant values -- so this is the static half, and a
 * browser test owes the other.
 */
function assertTargetFloor(resolved, label) {
  const MIN_PX = 24
  const ROOT_PX = 16
  const raw = resolved.get('semantic.target.minimum')
  if (raw === undefined) {
    throw new Error(`semantic.target.minimum is missing in ${label}`)
  }
  const px = raw.endsWith('rem') ? Number.parseFloat(raw) * ROOT_PX : Number.parseFloat(raw)
  if (!(px >= MIN_PX)) {
    throw new Error(
      `semantic.target.minimum is ${raw} (${px}px) in ${label}, below the ${MIN_PX}px ` +
        'floor -- WCAG 2.5.8 permits documented exceptions, but not a silent one',
    )
  }
}

/** `--name: value;` lines for a set of tokens, aliases kept as references. */
function declarations(entries) {
  return entries.map(([name, token]) => {
    const value = isAlias(token.value) ? `var(${cssName(aliasTarget(token.value))})` : token.value
    return `  ${cssName(name)}: ${value};`
  })
}

/**
 * Source -> CSS, with every refusal along the way.
 *
 * Separated from reading and writing files so the refusals can be tested against
 * synthetic sources. A generator only ever run on the single input it was written
 * for is not known to reject anything -- ADR-024's rule, applied to the tool that
 * owns every design value in the product.
 */
export function generate(source) {
  const tokens = flatten(source)
  const base = resolve(tokens)

  const componentTokens = [...tokens.keys()].filter((n) => tierOf(n) === 'component')
  if (componentTokens.length > COMPONENT_TOKEN_CEILING) {
    throw new Error(
      `${componentTokens.length} component tokens exceeds the ceiling of ` +
        `${COMPONENT_TOKEN_CEILING}. This is a tripwire, not a verdict: if every one of ` +
        'them earns its place, raise the ceiling in its own commit with the count and the reason',
    )
  }

  assertTargetFloor(base, 'the base')

  const lines = [
    '/*',
    ' * GENERATED FROM packages/tokens/tokens.json -- DO NOT EDIT.',
    ' *',
    ' * Law 27: generated state is never hand-edited. Change the token file and',
    ' * run `pnpm generate`; editing this output makes the generate stage fail,',
    ' * which asserts it is byte-identical after regeneration.',
    ' *',
    ' * Aliases are emitted as var() references rather than resolved values, so',
    ' * rebinding a semantic role below updates everything that references it.',
    ' */',
    ':root {',
    ...declarations([...tokens.entries()]),
    '}',
  ]

  lines.push('')

  return { componentTokens, css: lines.join('\n'), tokens }
}

function main() {
  const source = JSON.parse(readFileSync(INPUT, 'utf8'))
  const { componentTokens, css, tokens } = generate(source)

  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, css, 'utf8')

  process.stdout.write(
    `tokens: ${tokens.size} custom properties, ${componentTokens.length}/${COMPONENT_TOKEN_CEILING} ` +
      'component tier\n',
  )
}

/* The CLI runs only when invoked directly: the tests import `generate`. */
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
