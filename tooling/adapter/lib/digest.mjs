/**
 * DIGEST, mechanised (ADR-031 §Beta stage 2): the adaptee inventoried on the seven
 * dimensions the protocol names -- ANATOMY, BEHAVIOUR, STATE, AXES, STYLE, ACCESSIBILITY,
 * DEPENDENCIES -- from the source text of its files.
 *
 * LEXICAL, AND SAID SO. TypeScript 7 ships no JavaScript compiler API (`createSourceFile`
 * is undefined), and no other parser is installed, so this reads the text with regular
 * expressions the way `design-system-classes.test.ts` and `adapter-schema.test.ts` already
 * do. It cannot see a class name built at runtime or a prop reached through a spread. What
 * it CAN see is what upstream changes between two versions of the same file, which is the
 * question PREVIEW asks; it is not a type-checker and is not offered as one.
 *
 * DETERMINISTIC: every list is sorted and de-duplicated, and the object's key order is
 * fixed, so two digests of the same text serialise to the same bytes and a diff of two
 * digests is a diff of the adaptee.
 */

const DIMENSIONS = Object.freeze([
  'anatomy',
  'behaviour',
  'state',
  'axes',
  'style',
  'accessibility',
  'dependencies',
])

const sorted = (values) => [...new Set(values)].sort((a, b) => a.localeCompare(b))

/** Every string literal in the source, single- or double-quoted, template segments too. */
function stringLiterals(text) {
  const out = []
  for (const m of text.matchAll(
    /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g,
  )) {
    out.push(m[1] ?? m[2] ?? m[3] ?? '')
  }
  return out
}

const classWords = (text) =>
  stringLiterals(text)
    .flatMap((s) => s.split(/\s+/))
    .filter((w) => w.length > 0 && !w.includes('${'))

function anatomy(text) {
  const parts = []
  for (const m of text.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of (m[1] ?? '').split(',')) {
      const name = part
        .trim()
        .split(/\s+as\s+/)
        .pop()
      if (name) {
        parts.push(name)
      }
    }
  }
  for (const m of text.matchAll(/^export\s+(?:default\s+)?function\s+(\w+)/gm)) {
    parts.push(m[1])
  }
  return {
    parts: sorted(parts),
    slots: sorted([...text.matchAll(/data-slot="([^"]+)"/g)].map((m) => m[1])),
  }
}

function imports(text) {
  return [...text.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1])
}

function behaviour(text) {
  const specifiers = imports(text)
  return {
    clientBoundary: /^\s*["']use client["']/m.test(text),
    // The libraries that own keyboard, focus and DOM mechanics behind the adaptee.
    primitives: sorted(
      specifiers.filter((s) =>
        /^(@base-ui\/|@radix-ui\/|cmdk|react-day-picker|recharts|@tanstack\/)/.test(s),
      ),
    ),
  }
}

/**
 * The state vocabulary a stylesheet or a screen reads: `data-checked:` variants,
 * `data-[size=sm]` selectors, `data-size={…}` attributes, `aria-invalid:` variants.
 * `data-slot` is anatomy, not state, and is excluded here.
 */
function state(text) {
  const names = []
  for (const m of text.matchAll(/data-\[([a-z][a-z-]*)(?:=[^\]]*)?\]/g)) {
    names.push(`data-${m[1]}`)
  }
  for (const m of text.matchAll(/(?<![\w-])data-([a-z][a-z-]*)(?=[:=\s"])/g)) {
    names.push(`data-${m[1]}`)
  }
  for (const m of text.matchAll(/(?<![\w-])(aria-[a-z]+)(?=:)/g)) {
    names.push(m[1])
  }
  return sorted(names.filter((n) => n !== 'data-slot' && n !== 'data-'))
}

/**
 * cva `variants: { axis: { value: … } }` blocks and prop unions such as
 * `size?: "sm" | "default"`, read as axis -> values.
 */
function axes(text) {
  const found = new Map()
  const add = (axis, value) => {
    if (!found.has(axis)) {
      found.set(axis, new Set())
    }
    found.get(axis).add(value)
  }

  let at = text.indexOf('variants:')
  while (at !== -1) {
    const open = text.indexOf('{', at)
    const block = balanced(text, open)
    if (block !== null) {
      for (const axis of topLevelKeys(block)) {
        const axisOpen = block.indexOf('{', block.indexOf(axis.raw) + axis.raw.length)
        const inner = balanced(block, axisOpen)
        if (inner !== null) {
          for (const value of topLevelKeys(inner)) {
            add(axis.name, value.name)
          }
        }
      }
    }
    at = text.indexOf('variants:', at + 9)
  }

  for (const m of text.matchAll(/(\w+)\??:\s*((?:"[^"]+"\s*\|\s*)+"[^"]+")/g)) {
    const values = [...m[2].matchAll(/"([^"]+)"/g)].map((v) => v[1])
    for (const value of values) {
      add(m[1], value)
    }
  }

  const out = {}
  for (const axis of [...found.keys()].sort((a, b) => a.localeCompare(b))) {
    out[axis] = sorted([...found.get(axis)])
  }
  return out
}

/** The text of the balanced `{…}` block whose opening brace is at `open`, braces excluded. */
function balanced(text, open) {
  if (open === -1 || text[open] !== '{') {
    return null
  }
  let depth = 0
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '{') {
      depth += 1
    } else if (text[i] === '}') {
      depth -= 1
      if (depth === 0) {
        return text.slice(open + 1, i)
      }
    }
  }
  return null
}

/** `key:` names at depth 0 of an object-literal body. */
function topLevelKeys(body) {
  const keys = []
  let depth = 0
  let lineStart = 0
  for (let i = 0; i <= body.length; i += 1) {
    const ch = body[i]
    if (ch === '{' || ch === '(' || ch === '[') {
      depth += 1
    } else if (ch === '}' || ch === ')' || ch === ']') {
      depth -= 1
    } else if ((ch === ',' || ch === undefined) && depth === 0) {
      const entry = body.slice(lineStart, i)
      const m = entry.match(/^\s*(?:"([^"]+)"|'([^']+)'|([\w-]+))\s*:/)
      if (m) {
        const name = m[1] ?? m[2] ?? m[3]
        keys.push({ name, raw: m[0].trimStart() })
      }
      lineStart = i + 1
    }
  }
  return keys
}

/**
 * Raw design values: the numbers and lengths a closed language refuses (ADR-034). Numeric
 * spacing and sizing utilities, arbitrary `[…]` design values, and opacity modifiers.
 * Colour roles are not listed: `bg-primary` names a role and is the language, not a leak.
 */
function style(text) {
  const words = classWords(text)
  const numeric =
    /^-?(m|p|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y|inset|inset-x|inset-y|top|left|right|bottom|size|w|h|min-w|min-h|max-w|max-h|translate-x|translate-y|rounded|text|leading|tracking|shadow|ring|border)-\d+(\.\d+)?$/
  const bare = (w) => w.slice(w.lastIndexOf(':') + 1)
  return {
    arbitraryValues: sorted(
      words.flatMap((w) =>
        [
          ...w.matchAll(
            /\[((?:-?[\d.]+(?:px|rem|em|s|ms|%|vh|vw|ch)|#[0-9a-fA-F]{3,8}|calc\([^\]]*\)))\]/g,
          ),
        ].map((m) => m[0]),
      ),
    ),
    numericUtilities: sorted(words.map(bare).filter((w) => numeric.test(w))),
    opacityModifiers: sorted(words.map(bare).filter((w) => /^[a-z]+-[a-z-]+\/\d{1,3}$/.test(w))),
  }
}

function accessibility(text) {
  return {
    aria: sorted([...text.matchAll(/(?<![\w-])(aria-[a-z]+)=/g)].map((m) => m[1])),
    roles: sorted([...text.matchAll(/\brole="([^"]+)"/g)].map((m) => m[1])),
  }
}

function dependencies(text) {
  const specifiers = imports(text)
  return {
    // Bare package specifiers: `react`, `lucide-react`, `@base-ui/react/switch`.
    packages: sorted(
      specifiers.filter((s) => !(s.startsWith('#') || s.startsWith('.') || s.startsWith('@/'))),
    ),
    // Other vendored primitives this one composes, in either the registry or the tree form.
    registry: sorted(
      specifiers
        .filter((s) => /^(#components\/ui\/|@\/registry\/[a-z0-9-]+\/ui\/)/.test(s))
        .map((s) => s.slice(s.lastIndexOf('/') + 1)),
    ),
  }
}

/**
 * @param files  [{ name, content }] -- the item's files, already alias-localised or not;
 *               the digest reads the registry and the tree form of an import alike.
 */
export function digest(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error(
      'digest needs at least one file -- an empty inventory would read as a clean one',
    )
  }
  const text = files.map((f) => f.content).join('\n')
  const out = {
    accessibility: accessibility(text),
    anatomy: anatomy(text),
    axes: axes(text),
    behaviour: behaviour(text),
    dependencies: dependencies(text),
    state: state(text),
    style: style(text),
  }
  // Key order is the dimension order, always, so serialisation is stable.
  return Object.fromEntries(DIMENSIONS.map((d) => [d, out[d]]))
}

/** Flatten a dimension to comparable lines, so a diff is a list of strings. */
function lines(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.map((v) => `${prefix}${v}`)
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => lines(v, `${prefix}${k}.`))
  }
  return [`${prefix}${String(value)}`]
}

/**
 * What changed between two digests, per dimension. `changed` is the list PREVIEW reports
 * and ASSESS reads; an empty list is "nothing upstream moved on any dimension".
 */
export function diffDigest(before, after) {
  const details = {}
  for (const d of DIMENSIONS) {
    const a = new Set(lines(before[d]))
    const b = new Set(lines(after[d]))
    const removed = [...a].filter((x) => !b.has(x)).sort((x, y) => x.localeCompare(y))
    const added = [...b].filter((x) => !a.has(x)).sort((x, y) => x.localeCompare(y))
    if (removed.length > 0 || added.length > 0) {
      details[d] = { added, removed }
    }
  }
  return { changed: Object.keys(details), details }
}

export { DIMENSIONS }
