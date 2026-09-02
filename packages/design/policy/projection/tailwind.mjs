/**
 * PROJECTION — Tailwind v4.
 *
 * Maps governed semantic/component tokens into Tailwind theme namespaces.
 *
 * Rules:
 *   - primitive tokens never become utilities
 *   - semantic/component tokens are projected or explicitly excluded
 *   - runtime-safe namespaces use @theme inline + var(canonical-token)
 *   - breakpoint/container namespaces use generated LITERAL values because CSS
 *     variables cannot be used in @media/@container query conditions
 *   - default Tailwind namespaces we govern are reset before our vocabulary lands
 */

import { definePolicy } from '../foundations/contract.mjs'
import { deepFreeze, tierOf } from '../foundations/shared.mjs'
import { cssReferenceOf } from './identity.mjs'

export const TAILWIND_NAMESPACES = deepFreeze([
  'breakpoint',
  'color',
  'container',
  'ease',
  'font',
  'font-weight',
  'leading',
  'radius',
  'shadow',
  'spacing',
  'text',
  'tracking',
])

/**
 * These namespaces participate in build-time query generation and therefore
 * cannot point at runtime CSS variables.
 */
export const LITERAL_NAMESPACES = deepFreeze(['breakpoint', 'container'])

/**
 * Reset only namespaces this design system intentionally owns.
 * `--spacing` itself is NOT reset here because Tailwind v4's numeric spacing
 * engine may still be used during migration; raw spacing usage is a guard concern.
 */
export const RESET_NAMESPACES = deepFreeze([
  'breakpoint',
  'color',
  'container',
  'ease',
  'font',
  'font-weight',
  'leading',
  'radius',
  'shadow',
  'text',
  'tracking',
])

/**
 * Normal semantic group → Tailwind namespace.
 *
 * keepGroup=false:
 *   semantic.color.primary → --color-primary
 *
 * keepGroup=true:
 *   semantic.icon.standard → --spacing-icon-standard
 *
 * suffix is used where two namespaces would otherwise generate the same class:
 *   semantic.font.body → --font-body-face → font-body-face
 */
export const GROUP_PROJECTION = deepFreeze({
  breakpoint: { keepGroup: false, namespace: 'breakpoint' },
  color: { keepGroup: false, namespace: 'color' },
  container: { keepGroup: false, namespace: 'container' },
  control: { keepGroup: true, namespace: 'spacing' },
  ease: { keepGroup: false, namespace: 'ease' },
  font: { keepGroup: false, namespace: 'font', suffix: 'face' },
  icon: { keepGroup: true, namespace: 'spacing' },
  leading: { keepGroup: false, namespace: 'leading' },
  radius: { keepGroup: false, namespace: 'radius' },
  row: { keepGroup: true, namespace: 'spacing' },
  shadow: { keepGroup: false, namespace: 'shadow' },
  shell: { keepGroup: true, namespace: 'spacing' },
  size: { keepGroup: false, namespace: 'spacing' },
  space: { keepGroup: false, namespace: 'spacing' },
  stroke: { keepGroup: true, namespace: 'spacing' },
  target: { keepGroup: true, namespace: 'spacing' },
  tracking: { keepGroup: false, namespace: 'tracking' },
  type: { keepGroup: false, namespace: 'text' },
  weight: { keepGroup: false, namespace: 'font-weight' },
})

/**
 * Nested semantic families that cannot be decided by the second path segment.
 */
export const PREFIX_PROJECTION = deepFreeze({
  'semantic.motion.easing.': { namespace: 'ease', strip: 'semantic.motion.easing.' },
})

/**
 * Exact tokens deliberately hidden from the utility surface.
 */
export const UNPROJECTED = deepFreeze({
  'semantic.color.shadow-ambient':
    'alpha shadow ink is consumed by semantic shadow tokens, not by color utilities',
  'semantic.color.shadow-key':
    'alpha shadow ink is consumed by semantic shadow tokens, not by color utilities',
})

/**
 * Whole semantic families that intentionally have no Tailwind theme namespace.
 * They may be exposed later through explicit @utility definitions.
 */
export const UNPROJECTED_PREFIXES = deepFreeze({
  'semantic.border.': 'border-width policy has no dedicated Tailwind v4 theme namespace',
  'semantic.compositing.': 'compositing is implementation policy, not a general utility vocabulary',
  'semantic.elevation.':
    'elevation is semantic depth and must not be confused with box-shadow utilities',
  'semantic.grid.': 'grid structure is layout policy, not a theme-variable utility family',
  'semantic.layer.':
    'z-index has no governed Tailwind theme namespace; use semantic layer utilities',
  'semantic.motion.duration.':
    'bare durations have no Tailwind theme namespace; use governed duration utilities',
})

const withoutTier = (path) => path.split('.').slice(1).join('-')

const excludedReason = (path) => {
  if (Object.hasOwn(UNPROJECTED, path)) {
    return UNPROJECTED[path]
  }

  for (const [prefix, reason] of Object.entries(UNPROJECTED_PREFIXES)) {
    if (path.startsWith(prefix)) {
      return reason
    }
  }

  return null
}

const prefixRuleFor = (path) => {
  for (const [prefix, rule] of Object.entries(PREFIX_PROJECTION)) {
    if (path.startsWith(prefix)) {
      return { prefix, rule }
    }
  }
  return null
}

export function tailwindNameOf(path) {
  if (excludedReason(path) !== null) {
    return null
  }

  const nested = prefixRuleFor(path)
  if (nested) {
    const local = path.slice(nested.rule.strip.length).replaceAll('.', '-')
    if (!local) {
      throw new Error(`Tailwind prefix projection '${nested.prefix}' produced no local name`)
    }
    return `--${nested.rule.namespace}-${local}`
  }

  const tier = tierOf(path)

  if (tier === 'primitive') {
    throw new Error(
      `'${path}' is primitive tier -- exposing it as a Tailwind utility bypasses semantic policy`,
    )
  }

  if (tier === 'component') {
    return `--spacing-${withoutTier(path)}`
  }

  if (tier !== 'semantic') {
    throw new Error(`token '${path}' resolves to unsupported tier '${tier}'`)
  }

  const [, group] = path.split('.')
  const rule = GROUP_PROJECTION[group]

  if (!rule) {
    throw new Error(
      `no Tailwind projection for semantic group '${group}' ('${path}') -- ` +
        'map it or explicitly exclude it; omission is not a policy',
    )
  }

  const local = rule.keepGroup ? withoutTier(path) : path.split('.').slice(2).join('-')

  if (!local) {
    throw new Error(`Tailwind projection for '${path}' produced an empty local name`)
  }

  const suffix = rule.suffix ? `-${rule.suffix}` : ''
  return `--${rule.namespace}-${local}${suffix}`
}

export function namespaceOfTailwindName(name, namespaces = TAILWIND_NAMESPACES) {
  return [...namespaces]
    .sort((a, b) => b.length - a.length)
    .find((namespace) => name.startsWith(`--${namespace}-`))
}

export function assertTailwindTables(
  groups = GROUP_PROJECTION,
  prefixes = PREFIX_PROJECTION,
  namespaces = TAILWIND_NAMESPACES,
) {
  for (const [group, rule] of Object.entries(groups)) {
    if (!namespaces.includes(rule.namespace)) {
      throw new Error(`Tailwind group '${group}' projects to unknown namespace '${rule.namespace}'`)
    }

    if (typeof rule.keepGroup !== 'boolean') {
      throw new Error(`Tailwind group '${group}' does not state keepGroup`)
    }

    if (rule.suffix !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rule.suffix)) {
      throw new Error(`Tailwind group '${group}' has invalid suffix '${rule.suffix}'`)
    }
  }

  for (const [prefix, rule] of Object.entries(prefixes)) {
    if (!prefix.endsWith('.')) {
      throw new Error(`Tailwind prefix projection '${prefix}' must end with '.'`)
    }
    if (!namespaces.includes(rule.namespace)) {
      throw new Error(
        `Tailwind prefix '${prefix}' projects to unknown namespace '${rule.namespace}'`,
      )
    }
    if (rule.strip !== prefix) {
      throw new Error(
        `Tailwind prefix '${prefix}' strip '${rule.strip}' must equal the matched prefix`,
      )
    }
  }

  for (const namespace of LITERAL_NAMESPACES) {
    if (!namespaces.includes(namespace)) {
      throw new Error(`literal Tailwind namespace '${namespace}' is not declared`)
    }
  }

  return groups
}

export function assertTailwindProjection(paths) {
  const governed = [...paths].filter((path) => tierOf(path) !== 'primitive')

  if (governed.length === 0) {
    throw new Error('Tailwind projection was checked over zero semantic/component tokens')
  }

  const owners = new Map()

  for (const path of governed) {
    const name = tailwindNameOf(path)
    if (name === null) {
      continue
    }

    const namespace = namespaceOfTailwindName(name)
    if (!namespace) {
      throw new Error(`'${path}' projects to '${name}', which is in no known Tailwind namespace`)
    }

    const previous = owners.get(name)
    if (previous) {
      throw new Error(
        `'${previous}' and '${path}' both project to '${name}' -- one utility token has two owners`,
      )
    }

    owners.set(name, path)
  }

  return owners
}

/**
 * Different Tailwind namespaces can still bid for the same CLASS name.
 *
 * font/body-face vs font-weight/body are separated by the `-face` suffix.
 * color/foo vs text/foo both generate `text-foo`.
 * container/foo vs spacing/foo can both generate `max-w-foo`.
 */
export const CONTESTED_UTILITY_FAMILIES = deepFreeze([
  { namespaces: ['font', 'font-weight'], prefix: 'font-' },
  { namespaces: ['color', 'text'], prefix: 'text-' },
  { namespaces: ['container', 'spacing'], prefix: 'max-w-' },
])

export function assertNoUtilityShadowing(paths, families = CONTESTED_UTILITY_FAMILIES) {
  const claims = new Map()

  for (const path of [...paths].filter((token) => tierOf(token) !== 'primitive')) {
    const name = tailwindNameOf(path)
    if (name === null) {
      continue
    }

    const namespace = namespaceOfTailwindName(name)
    if (!namespace) {
      continue
    }

    for (const family of families) {
      if (!family.namespaces.includes(namespace)) {
        continue
      }

      const local = name.slice(`--${namespace}-`.length)
      const utility = `${family.prefix}${local}`
      const previous = claims.get(utility)

      if (previous) {
        throw new Error(
          `'${previous.path}' and '${path}' both generate '${utility}' from ` +
            `'${previous.name}' and '${name}' -- one role becomes unreachable`,
        )
      }

      claims.set(utility, { name, path })
    }
  }

  return claims
}

/**
 * Emit namespace resets separately from the bridge.
 */
export function emitTailwindResetBlock(namespaces = RESET_NAMESPACES) {
  const lines = namespaces.map((namespace) => `  --${namespace}-*: initial;`).join('\n')

  return `@theme {\n${lines}\n}`
}

/**
 * entries: iterable of [tokenPath, serializedLiteralValue]
 *
 * Runtime-safe namespaces are emitted as references in @theme inline.
 * Breakpoint/container values are emitted literally in @theme so Tailwind can
 * compile media/container conditions.
 *
 * Both outputs are GENERATED from the same token source, so literal duplication
 * here is projection, not a second authority.
 */
export function emitTailwindBridge(entries) {
  const literal = []
  const inline = []

  for (const [path, serializedValue] of [...entries].sort(([a], [b]) => a.localeCompare(b))) {
    if (tierOf(path) === 'primitive') {
      continue
    }

    const name = tailwindNameOf(path)
    if (name === null) {
      continue
    }

    const namespace = namespaceOfTailwindName(name)
    if (!namespace) {
      throw new Error(`cannot emit '${path}': '${name}' is in no Tailwind namespace`)
    }

    if (LITERAL_NAMESPACES.includes(namespace)) {
      if (
        typeof serializedValue !== 'string' ||
        serializedValue.trim() === '' ||
        /[;{}\r\n]/.test(serializedValue)
      ) {
        throw new Error(
          `Tailwind ${namespace} token '${path}' needs one safe serialized literal value`,
        )
      }
      literal.push(`  ${name}: ${serializedValue};`)
    } else {
      inline.push(`  ${name}: ${cssReferenceOf(path)};`)
    }
  }

  if (literal.length === 0 && inline.length === 0) {
    throw new Error('Tailwind bridge emitted zero tokens')
  }

  const blocks = []

  if (literal.length > 0) {
    blocks.push(`@theme {\n${literal.join('\n')}\n}`)
  }

  if (inline.length > 0) {
    blocks.push(`@theme inline {\n${inline.join('\n')}\n}`)
  }

  return blocks.join('\n\n')
}

export function assertTailwindPolicy() {
  assertTailwindTables()

  const standard = tailwindNameOf('semantic.color.primary')
  if (standard !== '--color-primary') {
    throw new Error(`semantic.color.primary projected to '${standard}'`)
  }

  const font = tailwindNameOf('semantic.font.body')
  if (font !== '--font-body-face') {
    throw new Error(`semantic.font.body projected to '${font}'`)
  }

  const motion = tailwindNameOf('semantic.motion.easing.standard')
  if (motion !== '--ease-standard') {
    throw new Error(`semantic.motion.easing.standard projected to '${motion}'`)
  }

  return GROUP_PROJECTION
}

export const tailwindPolicy = definePolicy({
  assert: assertTailwindPolicy,
  id: 'projection.tailwind',
  kind: 'projection',
})
