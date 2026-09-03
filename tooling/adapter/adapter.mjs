#!/usr/bin/env node
/**
 * The Adaptation Protocol's tooling (ADR-031 §Beta, tooling wave 1).
 *
 *   pnpm adapter ingest <item>     ACQUIRE + DIGEST: fetch the registry item, inventory it,
 *                                  write packages/design/adaptees/<item>.json
 *   pnpm adapter digest <item>     DIGEST the VENDORED file and compare it to the record
 *   pnpm adapter preview <item>    PREVIEW + ASSESS: fetch again, diff against the record
 *                                  on the seven dimensions, name the Adapters above it.
 *                                  Exit 1 if anything moved -- a check that can fail.
 *
 * The record is the memory of what was adopted, so a later PREVIEW has something to diff
 * against; it is not a component spec, it says nothing about the Xforge Target, and no
 * runtime reads it (ADR-031 Decision 2 stands). `fetchedAt` is bookkeeping and is never
 * compared.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DIMENSIONS, diffDigest, digest } from './lib/digest.mjs'
import {
  fetchItem,
  fileName,
  localizeImports,
  resolveIconPlaceholders,
  sha256,
} from './lib/registry.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const DESIGN = join(ROOT, 'packages/design')
const RECORDS = join(DESIGN, 'adaptees')
const VENDORED = join(DESIGN, 'src/components/ui')
const AUTHORED = join(DESIGN, 'src/components')

const config = JSON.parse(readFileSync(join(DESIGN, 'components.json'), 'utf8'))
const STYLE = config.style
const ALIASES = config.aliases

const recordPath = (name) => join(RECORDS, `${name}.json`)

function readRecord(name) {
  const path = recordPath(name)
  if (!existsSync(path)) {
    throw new Error(`no adaptee record for '${name}' -- run \`pnpm adapter ingest ${name}\` first`)
  }
  return JSON.parse(readFileSync(path, 'utf8'))
}

/** The fetched item, localised the way the tree holds it, with hashes of both forms. */
function inventory(item, url) {
  const files = item.files.map((f) => {
    const localized = resolveIconPlaceholders(
      localizeImports(f.content, STYLE, ALIASES),
      config.iconLibrary,
    )
    return {
      content: localized,
      localizedSha256: sha256(localized),
      name: fileName(f.path),
      path: f.path,
      registrySha256: sha256(f.content),
      type: f.type,
    }
  })
  return {
    dependencies: item.dependencies ?? [],
    digest: digest(files.map(({ name, content }) => ({ content, name }))),
    files: files.map(({ content: _content, ...rest }) => rest),
    item: item.name,
    localized: Object.fromEntries(files.map((f) => [f.name, f.content])),
    meta: item.meta ?? {},
    registryDependencies: item.registryDependencies ?? [],
    source: 'shadcn',
    style: STYLE,
    url,
  }
}

const vendoredText = (name) => {
  const path = join(VENDORED, `${name}.tsx`)
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

/** Authored Adapters that import this vendored primitive. */
function adaptersAbove(name) {
  return readdirSync(AUTHORED, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.tsx'))
    .map((e) => e.name)
    .filter((file) => readFileSync(join(AUTHORED, file), 'utf8').includes(`${ALIASES.ui}/${name}'`))
    .sort()
}

async function ingest(name) {
  const { item, url } = await fetchItem(STYLE, name)
  const { localized: _localized, ...record } = inventory(item, url)
  mkdirSync(RECORDS, { recursive: true })
  writeFileSync(
    recordPath(name),
    `${JSON.stringify({ ...record, fetchedAt: new Date().toISOString() }, null, 2)}\n`,
    'utf8',
  )
  const vendored = vendoredText(name)
  console.log(`ingested ${name}: ${record.files.length} file(s) from ${url}`)
  console.log(
    `  parts ${record.digest.anatomy.parts.join(', ')}; slots ${record.digest.anatomy.slots.length}; axes ${Object.keys(record.digest.axes).join(', ') || 'none'}`,
  )
  console.log(`  vendored bytes ${bytesVerdict(vendored, record.files[0]?.localizedSha256)}`)
}

/**
 * Byte identity is reported and not relied on: the CLI transforms more than aliases and
 * icons (it strips `cn-*` classes, for one), so two of four adaptees differ in bytes while
 * matching on every dimension. The digest is the comparison; this line is context.
 */
function bytesVerdict(vendored, localizedSha256) {
  if (vendored === null) {
    return 'ABSENT'
  }
  if (sha256(vendored) === localizedSha256) {
    return 'identical after the alias and icon rewrites'
  }
  return 'differ after the rewrites (the CLI transforms more; compare digests, not bytes)'
}

function digestLocal(name) {
  const text = vendoredText(name)
  if (text === null) {
    throw new Error(`no vendored file src/components/ui/${name}.tsx`)
  }
  const local = digest([{ content: text, name: `${name}.tsx` }])
  console.log(JSON.stringify(local, null, 2))
  if (existsSync(recordPath(name))) {
    const { changed, details } = diffDigest(readRecord(name).digest, local)
    if (changed.length === 0) {
      console.log(
        `\nvendored ${name}.tsx matches the record on all ${DIMENSIONS.length} dimensions`,
      )
    } else {
      console.log(`\nvendored ${name}.tsx DIFFERS from the record on: ${changed.join(', ')}`)
      console.log(JSON.stringify(details, null, 2))
      process.exitCode = 1
    }
  }
}

async function preview(name) {
  const record = readRecord(name)
  const { item, url } = await fetchItem(STYLE, name)
  const fresh = inventory(item, url)
  const { changed, details } = diffDigest(record.digest, fresh.digest)
  const byteChanges = fresh.files.filter((f) => {
    const before = record.files.find((r) => r.path === f.path)
    return before === undefined || before.registrySha256 !== f.registrySha256
  })
  const gone = record.files.filter((r) => !fresh.files.some((f) => f.path === r.path))
  const above = adaptersAbove(name)

  console.log(`preview ${name} (${url})`)
  console.log(`  recorded ${record.fetchedAt}`)
  console.log(`  bytes: ${byteChanges.length} file(s) changed, ${gone.length} removed`)
  console.log(`  dimensions changed: ${changed.length === 0 ? 'none' : changed.join(', ')}`)
  for (const d of changed) {
    console.log(`    ${d}: +${details[d].added.length} -${details[d].removed.length}`)
    for (const a of details[d].added) {
      console.log(`      + ${a}`)
    }
    for (const r of details[d].removed) {
      console.log(`      - ${r}`)
    }
  }
  console.log(`  adapters above: ${above.length === 0 ? 'none' : above.join(', ')}`)
  if (byteChanges.length > 0 || gone.length > 0 || changed.length > 0) {
    console.log('\nASSESS before REFRESH: something upstream moved. Nothing was written.')
    process.exitCode = 1
  } else {
    console.log('\nnothing moved; the record is current')
  }
}

const COMMANDS = { digest: digestLocal, ingest, preview }

async function main() {
  const [command, name] = process.argv.slice(2)
  if (!(command in COMMANDS && name)) {
    console.error('usage: pnpm adapter <ingest|digest|preview> <item>')
    process.exit(2)
  }
  await COMMANDS[command](name)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
