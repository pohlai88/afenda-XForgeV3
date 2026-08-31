import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

/**
 * Builds the conformance harness into a single self-contained script.
 *
 * `vite` is already a devDependency, so this adds no infrastructure -- law 30
 * wants a named pain before new machinery, and the pain here is concrete: four
 * contracts owe behavioural evidence and nothing in the repository mounts one.
 *
 * IIFE with everything inlined, because the spec injects the result through
 * `page.setContent` and a module graph would need a server to fetch from. The
 * output is a build artefact, not generated state: it is derived from source
 * but nothing asserts it is byte-identical, because a bundler's output is not
 * a fact anybody should be reading.
 */
export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: r('./tests/harness/mount.tsx'),
      fileName: 'harness',
      formats: ['iife'],
      name: 'XforgeHarness',
    },
    outDir: r('./tests/harness/dist'),
    rollupOptions: { output: { inlineDynamicImports: true } },
    target: 'es2022',
  },
  define: { 'process.env.NODE_ENV': '"production"' },
  // The automatic runtime, stated here rather than inherited. The root tsconfig
  // targets Next, which does its own JSX transform, so vite fell back to the
  // classic runtime and the bundle referenced a global `React` that an inlined
  // script has no way to provide.
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: [
      { find: /^@xforge\/ui$/, replacement: r('./packages/ui/src/index.tsx') },
      { find: /^@xforge\/ui\/contracts$/, replacement: r('./packages/ui/src/contracts.ts') },
      { find: /^@xforge\/ui\/runtime$/, replacement: r('./packages/ui/src/runtime.ts') },
      { find: /^@xforge\/ui\/schema$/, replacement: r('./packages/ui/generated/schema.json') },
    ],
  },
})
