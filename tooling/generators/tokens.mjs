#!/usr/bin/env node
/**
 * Design tokens -> CSS custom properties.
 *
 * `packages/tokens/tokens.json` is the authority; the CSS is DERIVED. Writing
 * both by hand would give one design value two homes, which is the defect this
 * repository has now had seven times -- and the one place it is cheapest to
 * prevent is where the second home does not exist yet.
 *
 * The output is generated state (law 27): never hand-edited, and the `generate`
 * stage asserts it is byte-identical after regeneration.
 *
 * The input follows the W3C Design Tokens Format Module (v2025.10): every token
 * is an object with `$value`, groups may carry `$type`, and a value of the form
 * `{group.name}` is an ALIAS to another token. Aliases are what make the
 * semantic layer real -- `semantic.accent.default` points at `color.blue.600`
 * rather than repeating it.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const ROOT = join(import.meta.dirname, '../..')
const INPUT = join(ROOT, 'packages/tokens/tokens.json')
const OUTPUT = join(ROOT, 'packages/tokens/generated/tokens.css')

/** Every token as a flat path -> raw value, keeping `$`-prefixed metadata out. */
function flatten(node, path = [], out = new Map()) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) continue
    if (value && typeof value === 'object' && '$value' in value) {
      out.set([...path, key].join('.'), value.$value)
    } else if (value && typeof value === 'object') {
      flatten(value, [...path, key], out)
    }
  }
  return out
}

/**
 * Resolve `{group.name}` aliases.
 *
 * Depth-limited rather than trusting the graph to be acyclic: a token pointing
 * at itself would otherwise hang the generator, and a build that hangs is
 * harder to diagnose than one that says why it stopped.
 */
function resolve(tokens) {
  const resolved = new Map()
  for (const [name, raw] of tokens) {
    let value = raw
    for (let depth = 0; typeof value === 'string' && value.startsWith('{'); depth++) {
      if (depth > 10) throw new Error(`token alias cycle at '${name}'`)
      const target = value.slice(1, -1)
      if (!tokens.has(target)) {
        throw new Error(`token '${name}' aliases '${target}', which does not exist`)
      }
      value = tokens.get(target)
    }
    resolved.set(name, value)
  }
  return resolved
}

const cssName = (path) => `--${path.replace(/\./g, '-')}`

function main() {
  const source = JSON.parse(readFileSync(INPUT, 'utf8'))
  const tokens = resolve(flatten(source))

  const lines = [
    '/*',
    ' * GENERATED FROM packages/tokens/tokens.json -- DO NOT EDIT.',
    ' *',
    ' * Law 27: generated state is never hand-edited. Change the token file and',
    ' * run `pnpm generate`; editing this output makes the generate stage fail,',
    ' * which asserts it is byte-identical after regeneration.',
    ' */',
    ':root {',
  ]
  for (const [name, value] of tokens) {
    lines.push(`  ${cssName(name)}: ${value};`)
  }
  lines.push('}', '')

  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, lines.join('\n'), 'utf8')
  process.stdout.write(`tokens: ${tokens.size} custom properties\n`)
}

main()
