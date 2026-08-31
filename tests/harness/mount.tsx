/**
 * The harness entry point.
 *
 * Bundled into ONE self-contained script that a Playwright spec injects with
 * `setContent`. Deliberately not a route: a route would ship the runtime
 * registry, the generated schema and a JSON Schema validator to production,
 * put them on somebody's critical path, and spend route budget nobody
 * allocated -- to serve a page that exists only for tests.
 *
 * The document is read from `window.__XFORGE_CONFIG__`, which the spec sets
 * before this runs, so one bundle serves every document.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { renderConfig } from './interpreter'

declare global {
  interface Window {
    __XFORGE_CONFIG__?: unknown
    __XFORGE_HARNESS_ERROR__?: string
  }
}

async function main() {
  const container = document.getElementById('root')
  if (!container) {
    throw new Error('no #root to mount into')
  }
  const tree = await renderConfig(window.__XFORGE_CONFIG__)
  createRoot(container).render(<StrictMode>{tree}</StrictMode>)
  document.documentElement.setAttribute('data-harness-ready', 'true')
}

main().catch((error: unknown) => {
  // Surfaced on the page rather than only in the console: a spec asserting a
  // REFUSAL needs to read the reason, and a harness that fails silently would
  // make an invalid document indistinguishable from an empty one.
  window.__XFORGE_HARNESS_ERROR__ = error instanceof Error ? error.message : String(error)
  document.documentElement.setAttribute('data-harness-error', 'true')
})
