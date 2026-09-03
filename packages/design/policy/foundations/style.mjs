import { deepFreeze, NONE } from '../vocabulary.mjs'
import { COLOR_ROLE_CONTRACTS, colorChannelsOf } from './color.mjs'
import { ELEVATION_LAYERS } from './elevation.mjs'
import { MOTION_ROLES } from './motion.mjs'
import { RADIUS_ROLES } from './radius.mjs'
import { SPACING_ROLES } from './spacing.mjs'
import { LAYER_ROLES } from './stacking.mjs'
import { TYPE_ROLES } from './typography.mjs'

/**
 * THE STYLE CONTRACT: the vocabulary a component selects from (ADR-034 Decision 4; the
 * consuming side is ADR-031 Decision 12). `generated/style.ts` and
 * `generated/style-manifest.json` are projected from the tree this module builds, and
 * nothing else decides what a component may say about its appearance.
 *
 * SEMANTIC NAMES, NOT ROLE NAMES. A recipe writes `STYLE.action.danger.background`, and
 * the class it resolves to is `bg-destructive`: the symbol is Xforge's word, the class is
 * the role's, and the table below is the one place the two meet. That is the
 * Anti-Corruption-Layer move ADR-031 makes for props, made for style -- upstream's
 * `destructive` and Xforge's `danger` are the same colour and different words, and a
 * screen only ever sees the second.
 *
 * EVERY COLOUR ROOT IS NAMED OR OMITTED WITH A REASON. The table is closed against
 * `COLOR_ROLE_CONTRACTS`: a root nobody named is a defect, refused below, so a new role
 * cannot arrive in the dictionary without a word for it. The other groups are projected
 * from their role tables mechanically -- a type role, a radius role, a spacing role IS its
 * word already -- and need no naming table.
 *
 * WHAT IS OMITTED, AND WHY IT IS A LIST AND NOT A GAP. `scrim` declares no CSS channel
 * today (compositing kind), so it has no class to name; the first overlay Adapter declares
 * one in NORMALIZE. The shadow inks are consumed by the elevation tokens through var().
 * `layer.transient`, `motion.none` and `motion.pulse` have no utility: the first is unused,
 * the second is the reduced-motion answer, the third drives a keyframe. Each is recorded in
 * the manifest's `omitted` list with its reason, so a reader of the manifest cannot mistake
 * an absence for a hole.
 */

/**
 * Colour root -> the path in the STYLE tree. `omit` is a designed absence with its reason.
 * Two roots share a group and get distinct words; no word appears twice (asserted).
 */
export const STYLE_NAMES = deepFreeze({
  accent: ['action', 'accent'],
  background: ['surface', 'page'],
  border: ['stroke', 'border'],
  card: ['surface', 'card'],
  destructive: ['action', 'danger'],
  disabled: ['state', 'disabled'],
  error: ['status', 'danger'],
  field: ['surface', 'field'],
  foreground: ['ink', 'default'],
  info: ['status', 'info'],
  input: ['stroke', 'field'],
  muted: ['surface', 'muted'],
  popover: ['surface', 'popover'],
  primary: ['action', 'primary'],
  ring: ['stroke', 'focus'],
  scrim: { omit: 'compositing: declares no CSS channel until an overlay Adapter needs one' },
  secondary: ['action', 'secondary'],
  'shadow-ambient': { omit: 'consumed by the elevation tokens through var(), never a class' },
  'shadow-key': { omit: 'consumed by the elevation tokens through var(), never a class' },
  sidebar: ['surface', 'rail'],
  'sidebar-accent': ['surface', 'railAccent'],
  'sidebar-border': ['stroke', 'rail'],
  'sidebar-ring': ['stroke', 'railFocus'],
  statutory: ['status', 'statutory'],
  success: ['status', 'success'],
  warning: ['status', 'warning'],
})

/** A channel's key inside a colour symbol: the thing a component means by it. */
const CHANNEL_KEY = deepFreeze({
  bg: 'background',
  border: 'border',
  fill: 'fill',
  outline: 'outline',
  ring: 'ring',
  stroke: 'stroke',
  text: 'text',
})

/**
 * The interaction a companion expresses, as the Tailwind variant that selects it. Held
 * here, once, so "pressed is `:active`" is a fact of the language and not of each recipe.
 */
const COMPANION_VARIANT = deepFreeze({ hover: 'hover', pressed: 'active' })

const roleOf = (path) => path.slice(path.lastIndexOf('.') + 1)

export function assertStyleNames(names = STYLE_NAMES, contracts = COLOR_ROLE_CONTRACTS) {
  const roots = Object.keys(contracts)
  for (const root of roots) {
    if (!Object.hasOwn(names, root)) {
      throw new Error(
        `colour root '${root}' has no word in STYLE_NAMES -- name it, or omit it with a reason`,
      )
    }
  }
  const seen = new Map()
  for (const [root, entry] of Object.entries(names)) {
    if (!roots.includes(root)) {
      throw new Error(`STYLE_NAMES names '${root}', which is not a colour root`)
    }
    if (Array.isArray(entry)) {
      if (entry.length !== 2 || !entry.every((s) => /^[a-z][a-zA-Z0-9]*$/.test(s))) {
        throw new Error(`STYLE_NAMES.${root} must be [group, word], both identifiers`)
      }
      const word = entry.join('.')
      if (seen.has(word)) {
        throw new Error(`STYLE_NAMES gives '${word}' to both '${seen.get(word)}' and '${root}'`)
      }
      seen.set(word, root)
    } else if (typeof entry?.omit !== 'string' || entry.omit.trim() === '') {
      throw new Error(`STYLE_NAMES.${root} must be [group, word] or { omit: reason }`)
    }
  }
}

const set = (tree, path, value) => {
  let node = tree
  for (const key of path.slice(0, -1)) {
    node[key] ??= {}
    node = node[key]
  }
  node[path.at(-1)] = value
}

/** A symbol: the class a component writes, and the tokens it resolves through. */
const symbol = (cls, tokens) => ({ class: cls, tokens })

function colourSymbols(tree, omitted) {
  for (const [root, contract] of Object.entries(COLOR_ROLE_CONTRACTS)) {
    const entry = STYLE_NAMES[root]
    if (!Array.isArray(entry)) {
      omitted.push({ reason: entry.omit, role: `semantic.color.${root}` })
      continue
    }
    const node = {}
    const { channels } = colorChannelsOf(`color.${root}`)
    for (const channel of channels) {
      node[CHANNEL_KEY[channel]] = symbol(`${channel}-${root}`, [contract.base])
    }
    if (contract.foreground !== NONE) {
      node.foreground = symbol(`text-${roleOf(contract.foreground)}`, [contract.foreground])
    }
    for (const companion of ['hover', 'pressed']) {
      const token = contract[companion]
      if (token !== NONE) {
        node[companion] = symbol(`${COMPANION_VARIANT[companion]}:bg-${roleOf(token)}`, [token])
      }
    }
    if (Object.keys(node).length === 0) {
      omitted.push({ reason: 'declares no CSS channel', role: contract.base })
      continue
    }
    set(tree, entry, node)
  }
}

function typographySymbols(tree) {
  for (const [role, policy] of Object.entries(TYPE_ROLES)) {
    const classes = [`font-${roleOf(policy.weight)}`, `text-${roleOf(policy.size)}`]
    const tokens = [policy.weight, policy.size, policy.leading]
    if (policy.tracking !== NONE) {
      classes.push(`tracking-${roleOf(policy.tracking)}`)
      tokens.push(policy.tracking)
    }
    set(tree, ['typography', camel(role)], symbol(classes.join(' '), tokens))
  }
}

const camel = (kebab) => kebab.replace(/-([a-z])/g, (_, c) => c.toUpperCase())

function geometrySymbols(tree, omitted) {
  for (const [role, policy] of Object.entries(RADIUS_ROLES)) {
    set(tree, ['shape', camel(role)], symbol(`rounded-${role}`, [policy.token]))
  }
  for (const [role, policy] of Object.entries(SPACING_ROLES)) {
    set(tree, ['space', camel(role)], {
      gap: symbol(`gap-${role}`, [policy.token]),
      padding: symbol(`p-${role}`, [policy.token]),
      paddingX: symbol(`px-${role}`, [policy.token]),
      paddingY: symbol(`py-${role}`, [policy.token]),
    })
  }
  for (const [layer, policy] of Object.entries(ELEVATION_LAYERS)) {
    set(
      tree,
      ['elevation', layer],
      symbol(`shadow-${roleOf(policy.elevation)}`, [policy.elevation]),
    )
  }
  for (const [role, policy] of Object.entries(LAYER_ROLES)) {
    if (role === 'transient') {
      omitted.push({
        reason: 'no utility emits it; nothing stacks at this level yet',
        role: policy.token,
      })
      continue
    }
    set(tree, ['layer', role], symbol(`layer-${role}`, [policy.token]))
  }
  for (const [path, policy] of Object.entries(MOTION_ROLES)) {
    const name = roleOf(path)
    if (policy.loops) {
      omitted.push({ reason: 'a looping duration drives a keyframe, not a transition', role: path })
      continue
    }
    if (name === 'none') {
      omitted.push({ reason: 'the reduced-motion answer, applied by the stylesheet', role: path })
      continue
    }
    set(tree, ['motion', name], symbol(`duration-${name}`, [path]))
  }
  set(tree, ['easing', 'standard'], symbol('ease-standard', ['semantic.ease.standard']))
  set(tree, ['easing', 'entrance'], symbol('ease-entrance', ['semantic.ease.entrance']))
  set(tree, ['easing', 'exit'], symbol('ease-exit', ['semantic.ease.exit']))
  set(tree, ['size', 'control'], symbol('h-control', ['semantic.control.min-size']))
  set(tree, ['size', 'icon'], symbol('size-icon', ['semantic.icon.size']))
  set(tree, ['stroke', 'width'], symbol('border-stroke', ['semantic.size.stroke']))
  set(
    tree,
    ['focus', 'ring'],
    symbol('focus-visible:focus-ring', ['semantic.size.ring', 'semantic.color.ring']),
  )
}

/**
 * The tree, built fresh and sorted: `symbols` is the nested STYLE object of `{ class,
 * tokens }` leaves; `omitted` lists every role that has no symbol and why.
 */
export function styleTree() {
  assertStyleNames()
  const tree = {}
  const omitted = []
  colourSymbols(tree, omitted)
  typographySymbols(tree)
  geometrySymbols(tree, omitted)
  return { omitted: sortBy(omitted, (o) => o.role), symbols: sortKeys(tree) }
}

const sortBy = (list, key) => [...list].sort((a, b) => key(a).localeCompare(key(b)))

const isLeaf = (node) => typeof node.class === 'string' && Array.isArray(node.tokens)

function sortKeys(node) {
  if (isLeaf(node)) {
    return node
  }
  return Object.fromEntries(
    Object.keys(node)
      .sort((a, b) => a.localeCompare(b))
      .map((k) => [k, sortKeys(node[k])]),
  )
}

/** Every leaf, as `[dotted path, leaf]`, for the manifest and for tests. */
export function styleLeaves(symbols, prefix = []) {
  if (isLeaf(symbols)) {
    return [[prefix.join('.'), symbols]]
  }
  return Object.entries(symbols).flatMap(([k, v]) => styleLeaves(v, [...prefix, k]))
}
