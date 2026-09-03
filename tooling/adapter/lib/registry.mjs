import { createHash } from 'node:crypto'

/**
 * ACQUIRE, mechanised (ADR-031 §Beta). The shadcn registry publishes every item as JSON at
 * a stable URL, file contents included, which is the same source `shadcn add` reads. This
 * fetches that JSON and nothing else: no install, no dependency resolution, no write into
 * the vendored tree. What is written -- the adaptee record -- is the CLI's decision.
 *
 * WHY NOT THE CLI. `shadcn add` runs `pnpm add <dep>@latest`, and `catalogMode: strict`
 * refuses that before a file is written; the maintenance run of 2026-09-03 had to run it in
 * a scratch project for that reason. The JSON needs no install to read.
 */

export const REGISTRY = 'https://ui.shadcn.com/r/styles'

export function itemUrl(style, name) {
  if (!(/^[a-z0-9-]+$/.test(style) && /^[a-z0-9-]+$/.test(name))) {
    throw new Error(`registry item names are lowercase words and hyphens: '${style}' / '${name}'`)
  }
  return `${REGISTRY}/${style}/${name}.json`
}

export async function fetchItem(style, name, { fetchImpl = globalThis.fetch } = {}) {
  const url = itemUrl(style, name)
  const response = await fetchImpl(url, { headers: { accept: 'application/json' } })
  if (!response.ok) {
    throw new Error(`registry returned ${response.status} for ${url}`)
  }
  const item = await response.json()
  if (!Array.isArray(item.files) || item.files.length === 0) {
    throw new Error(`registry item '${name}' carries no files -- nothing to adapt`)
  }
  return { item, url }
}

/**
 * The import rewrite `shadcn add` performs, reproduced so a fetched file can be compared
 * to the vendored one. The registry writes `@/registry/<style>/ui/button`; the tree has
 * `#components/ui/button`, per `components.json` aliases. Only these three forms are
 * rewritten; anything else is left alone, and the comparison says so.
 */
export function localizeImports(content, style, aliases) {
  const prefix = `@/registry/${style}/`
  return content
    .replaceAll(`${prefix}lib/utils`, aliases.utils)
    .replace(new RegExp(`${escapeRegExp(prefix)}ui/([a-z0-9-]+)`, 'g'), `${aliases.ui}/$1`)
    .replace(new RegExp(`${escapeRegExp(prefix)}hooks/([a-z0-9-]+)`, 'g'), `${aliases.hooks}/$1`)
    .replace(new RegExp(`${escapeRegExp(prefix)}lib/([a-z0-9-]+)`, 'g'), `${aliases.lib}/$1`)
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

export const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex')

/** `registry/base-nova/ui/switch.tsx` -> `switch.tsx`. */
export const fileName = (registryPath) => registryPath.slice(registryPath.lastIndexOf('/') + 1)

/**
 * The second transform `shadcn add` performs, reproduced for the same reason as the first.
 * The registry ships icons as `<IconPlaceholder lucide="XIcon" tabler="IconX" … />` with an
 * import from `@/app/(create)/components/icon-placeholder`; the CLI resolves each to the
 * configured library. Without this, a fetched Combobox digests to "no lucide-react" while
 * the vendored one imports it, and DEPENDENCIES reports a move upstream never made.
 *
 * Only `lucide` is supported, because that is what `components.json` says. Any other
 * library is refused rather than guessed.
 */
export function resolveIconPlaceholders(content, iconLibrary) {
  if (!content.includes('IconPlaceholder')) {
    return content
  }
  if (iconLibrary !== 'lucide') {
    throw new Error(
      `icon placeholders can be resolved for lucide only; components.json says '${iconLibrary}'`,
    )
  }
  const names = []
  const resolved = content.replace(/<IconPlaceholder\b([^>]*?)\/>/gs, (_element, attributes) => {
    const name = attributes.match(/\blucide="([A-Za-z0-9]+)"/)?.[1]
    if (!name) {
      throw new Error('an IconPlaceholder names no lucide icon')
    }
    names.push(name)
    const className = attributes.match(/\bclassName=("[^"]*"|\{[^}]*\})/)?.[1]
    return className ? `<${name} className=${className} />` : `<${name} />`
  })
  const unique = [...new Set(names)]
  return resolved.replace(
    /import \{ IconPlaceholder \} from "@\/app\/\(create\)\/components\/icon-placeholder"/,
    `import { ${unique.join(', ')} } from "lucide-react"`,
  )
}
