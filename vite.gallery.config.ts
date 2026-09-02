import { fileURLToPath } from 'node:url'
import tailwind from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { GALLERY_PORT } from './tooling/e2e/config.ts'
import { aliases } from './workspace.aliases.ts'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

/**
 * The design system gallery — every block, rendered, before it reaches a page.
 *
 * WHY IT EXISTS. Nothing in this repository renders a component for a person to
 * look at. The conformance harness builds an IIFE for Playwright to inject; the
 * app has one route. So a block could be built, typechecked, class-compiled and
 * committed without anyone having seen it — and the checks that pass are all
 * structural. None of them can say a thing looks wrong.
 *
 * IT IS ALSO THE GUARDRAIL. A block previews here before it is wired into a live
 * page, and both halves of that are the point: the gallery is where a mistake is
 * cheap, and a page is where it is not.
 *
 * NO NEW INFRASTRUCTURE. `vite` is already a devDependency (law 30 wants a named
 * pain before machinery, and this is the same reasoning `vite.harness.config.ts`
 * records). Dev-server only: there is no build target, because a gallery nobody
 * ships does not need one.
 */
export default defineConfig({
  // The automatic JSX runtime, stated rather than inherited -- the same reason
  // `vite.harness.config.ts` states it. The root tsconfig targets Next, which
  // does its own transform, so vite would otherwise fall back to the classic
  // runtime and reference a global `React` that nothing provides.
  //
  // No `@vitejs/plugin-react`: it wants a Vite internal this version does not
  // export, and it buys only Fast Refresh. A gallery reloads fine.
  esbuild: { jsx: 'automatic' },
  plugins: [tailwind()],
  resolve: {
    alias: {
      ...aliases,
      // The design system's own intra-package alias, the same mapping the root
      // tsconfig declares. Vite does not read `paths`, so it is stated once here
      // rather than left to fail at the first component import.
      '@': r('./packages/design/src'),
    },
  },
  root: r('./packages/design/gallery'),
  /*
   * The port is owned by `tooling/e2e/config.ts` now that Playwright boots this
   * server too -- one fact, one definition, per the post-mortem in that file.
   *
   * AND THE HOST IS STATED, because the same post-mortem's hazard bit here in
   * mirror image. Vite's default bound ONLY to `[::1]`, while the origin that
   * file declares is `http://127.0.0.1:4300`. Playwright probed the address the
   * config named, got nothing, concluded no server was running, and tried to
   * start a second one -- which then failed on `strictPort` against the server
   * that was already there. Two correct-looking facts about one address, and
   * the error named a port conflict rather than either of them.
   */
  server: { host: '127.0.0.1', port: GALLERY_PORT, strictPort: true },
})
