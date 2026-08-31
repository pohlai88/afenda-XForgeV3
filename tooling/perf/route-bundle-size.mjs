#!/usr/bin/env node
/**
 * Route -> initial client JavaScript, in gzipped bytes.
 *
 * Stage 0 of the design-system plan: measure BEFORE any budget exists. A budget
 * invented ahead of a measurement is a number someone made up, and the first
 * reader to grep it will treat it as evidence.
 *
 * WHAT IS COUNTED. The union of every JavaScript file the browser must have
 * before the route is interactive:
 *
 *   root main files    the App Router shell and framework
 *   entry JS files     the route entry itself
 *   client modules     every chunk backing a client component in the route's
 *                      tree, EXCLUDING ones marked async -- those are the
 *                      dynamic imports, which are deliberately not initial
 *
 * Deduplicated by path ON DISK. The two manifests disagree about how to spell a
 * chunk -- `entryJSFiles` omits the `/_next/` prefix and `clientModules`
 * includes it -- so deduplicating the strings counts shared chunks twice. That
 * inflated the employee route by 16 kB.
 *
 * WHAT IS DELIBERATELY EXCLUDED. Next emits a legacy polyfill bundle and loads
 * it with `noModule`, so a browser that understands ES modules -- every browser
 * this product targets -- never requests it. It is 39 kB gzipped. Counting it
 * put this repository's only real route over the section 22 default on the very
 * first measurement, which would have bought that route a recorded exemption
 * for bytes no user downloads. It is measured and REPORTED separately, so that
 * excluding it stays a visible decision rather than a silent omission.
 *
 * WHAT THE NUMBER IS NOT. Each file is gzipped independently at a PINNED level,
 * which is what a static host serving separate files does -- but a real CDN may
 * choose another level, or Brotli, and will land lower. So this is a stable
 * PROXY for transfer size, not a prediction of it. Stability is the property
 * that matters: the same build must yield the same number on every machine, or
 * the budget gate is a coin toss and gets disabled within a month.
 *
 * Checked against the running production server: this tool predicted 180358 B
 * for /_not-found and the server transferred 180803 B, a 0.25% difference
 * attributable to its gzip level.
 *
 * Next 16 with Turbopack prints no per-route sizes, so this reads the build
 * manifests directly. That is a dependency on Next's output layout: if a future
 * version moves these files the tool must FAIL, never silently report zero.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

const ROOT = join(import.meta.dirname, '../..')
const NEXT = join(ROOT, 'apps/web/.next')
const APP = join(NEXT, 'server/app')

/** Pinned so the number is reproducible. See the header. */
const GZIP_LEVEL = 9

/**
 * Sorted only so the reported file list is stable between runs. The gzip total
 * is a sum and does not care about order, but a JSON report that reshuffles
 * itself invites someone to diff two identical measurements and see a change.
 */
const byPath = (a, b) => (a < b ? -1 : Number(a > b))

/** `/_next/static/chunks/a.js` and `static/chunks/a.js` name the same file. */
const toDiskPath = (webPath) => join(NEXT, webPath.replace(/^\/_next\//, '').replace(/^\//, ''))

/** Every `page_client-reference-manifest.js` under the app directory. */
function findPageManifests(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      findPageManifests(full, out)
    } else if (entry.name === 'page_client-reference-manifest.js') {
      out.push(full)
    }
  }
  return out
}

/**
 * The RSC manifests are CommonJS that assign to `globalThis.__RSC_MANIFEST`,
 * keyed by route. Requiring them all accumulates every route into one object.
 */
function loadRscManifests(files) {
  const require_ = createRequire(import.meta.url)
  globalThis.self ??= globalThis
  for (const file of files) {
    require_(file)
  }
  return globalThis.__RSC_MANIFEST ?? {}
}

/**
 * The JS a browser must load before this route is interactive, plus the legacy
 * polyfill bundle it will not load, reported separately.
 *
 * `async: true` marks a chunk reached through a dynamic import. Counting those
 * as initial would erase the entire benefit of code splitting -- and Stage 6
 * dynamically imports the command palette specifically so it does not land
 * here.
 */
function initialChunks(routeKey, rscManifest) {
  /** Keyed by resolved disk path, so the two manifest spellings collapse. */
  const chunks = new Map()
  const add = (webPath) => chunks.set(toDiskPath(webPath), webPath)

  const routeDir = join(APP, routeKey.replace(/\/page$/, ''))
  const buildManifestPath = join(routeDir, 'page/build-manifest.json')

  if (!existsSync(buildManifestPath)) {
    throw new Error(
      `no build-manifest for ${routeKey} at ${relative(ROOT, buildManifestPath)} -- ` +
        'the Next build output layout has changed and this tool is measuring nothing',
    )
  }

  const build = JSON.parse(readFileSync(buildManifestPath, 'utf8'))
  for (const file of build.rootMainFiles ?? []) {
    add(file)
  }

  const rsc = rscManifest[routeKey]
  if (!rsc) {
    throw new Error(`no RSC manifest entry for ${routeKey}`)
  }

  for (const files of Object.values(rsc.entryJSFiles ?? {})) {
    for (const file of files) {
      add(file)
    }
  }

  for (const mod of Object.values(rsc.clientModules ?? {})) {
    if (mod.async) {
      continue
    }
    for (const file of mod.chunks ?? []) {
      add(file)
    }
  }

  const isJs = (f) => f.endsWith('.js')
  return {
    initial: [...chunks.keys()].filter(isJs).sort(byPath),
    legacyPolyfills: (build.polyfillFiles ?? []).map(toDiskPath).filter(isJs).sort(byPath),
  }
}

/** Sum the gzipped size of files already resolved to paths on disk. */
function gzipTotal(files) {
  let total = 0
  for (const disk of files) {
    if (!existsSync(disk)) {
      throw new Error(`a manifest names ${relative(ROOT, disk)}, which does not exist`)
    }
    total += gzipSync(readFileSync(disk), { level: GZIP_LEVEL }).length
  }
  return total
}

/** Measure every app route that ships client JavaScript. */
export function measureRoutes() {
  if (!existsSync(APP)) {
    throw new Error(`no build output at ${relative(ROOT, APP)} -- run next build first`)
  }

  const rscManifest = loadRscManifests(findPageManifests(APP))
  const routes = []

  for (const routeKey of Object.keys(rscManifest).sort()) {
    if (!routeKey.endsWith('/page')) {
      continue
    }
    const { initial, legacyPolyfills } = initialChunks(routeKey, rscManifest)
    routes.push({
      chunks: initial.length,
      initialClientJsGzipBytes: gzipTotal(initial),
      /** Reported, never counted. See the header. */
      legacyPolyfillGzipBytes: gzipTotal(legacyPolyfills),
      rawBytes: initial.reduce((n, f) => n + statSync(f).size, 0),
      route: routeKey.replace(/\/page$/, '') || '/',
    })
  }

  if (routes.length === 0) {
    throw new Error('measured zero routes -- a check that found nothing is not a check that passed')
  }
  return routes
}

function report() {
  const measured = measureRoutes()

  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(measured, null, 2)}\n`)
    return
  }

  const width = Math.max(...measured.map((r) => r.route.length))
  process.stdout.write(`route initial client JS, gzip level ${GZIP_LEVEL}\n\n`)
  for (const r of measured) {
    const kb = (r.initialClientJsGzipBytes / 1024).toFixed(1)
    process.stdout.write(
      `  ${r.route.padEnd(width)}  ${String(r.initialClientJsGzipBytes).padStart(7)} B  ` +
        `${kb.padStart(6)} kB  ${r.chunks} chunks` +
        `   (+${r.legacyPolyfillGzipBytes} B noModule polyfill, not counted)\n`,
    )
  }
  process.stdout.write('\n')
}

/* The CLI runs only when invoked directly: the budget checker imports this. */
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  report()
}
