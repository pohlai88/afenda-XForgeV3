import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/react-vite'

/**
 * A SECOND READER OF THE COMPONENTS, INDEPENDENT OF THE GALLERY.
 *
 * `tooling/gallery/proof.mjs` probes `http://localhost:3000/gallery` and nothing else, so
 * its whole view of the design system is mediated by `apps/web/app/gallery/specimens.tsx`.
 * A state that file omits is a state the proof cannot report on -- it probes what is
 * there. That is not a fault in the proof; it is what makes it not independent.
 *
 * Storybook reads `packages/design` directly. Neither surface is downstream of the other,
 * and both derive their states from the same authority: the component's own axis table
 * (ADR-031). A divergence between them is therefore signal rather than drift.
 *
 * `@storybook/react-vite` and NOT `nextjs-vite`: nothing under `packages/design/src` imports
 * `next/*` -- only the gallery page does, for `notFound`. The Next framework would add the
 * Next plugin and `normalizePostCssConfig`, which REWRITES the PostCSS config file on disk
 * when it finds Next's array format. Ours is already object format so it would be a no-op,
 * but a tool in the loop that can edit a tracked source file is not worth adopting for
 * nothing (law 33).
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const config: StorybookConfig = {
  framework: '@storybook/react-vite',

  /**
   * OUTSIDE `src/`, DELIBERATELY. `apps/web/app/globals.css` declares
   * `@source "../../../packages/design/src/"`, so any class literal written inside that
   * directory is compiled into the application's stylesheet. A story is not product
   * source and must not be able to contribute to what a screen receives. `stories/` sits
   * beside `tests/`, which is outside `src/` for the same reason.
   */
  stories: [
    '../packages/design/stories/**/*.stories.tsx',
    // App SCREENS, outside `apps/web/app/` for the same reason. `globals.css`
    // sets `source("../")`, so Tailwind scans the whole of apps/web; it now
    // carries `@source not "../stories/"` so this directory cannot contribute
    // a class to the application's stylesheet.
    '../apps/web/stories/**/*.stories.tsx',
  ],

  async viteFinal(viteConfig) {
    const { mergeConfig } = await import('vite')
    return mergeConfig(viteConfig, {
      /**
       * THE APPLICATION'S PIPELINE, NOT A SECOND ONE. Vite discovers a PostCSS config by
       * searching from this directory, so pointing it at `apps/web` loads
       * `postcss.config.mjs` and runs `@tailwindcss/postcss` -- the same plugin `next dev`
       * runs and the same one `tests/unit/design-system-classes.test.ts` compiles with.
       *
       * The scan base is no longer a variable: `globals.css` pins it with
       * `@import "tailwindcss" source("../")`. Before that line, compiling from the
       * repository root emitted 295 classes against next dev's 214 -- 81 phantoms
       * scavenged from tests and notes, including `z-[999]` and `mt-[13px]`, values the
       * closed scales exist to refuse. Storybook would have rendered them perfectly.
       */
      css: { postcss: join(ROOT, 'apps/web') },

      /**
       * THE AUTOMATIC JSX RUNTIME, WHICH `tsconfig.base.json` LEAVES TO THE BUNDLER.
       *
       * The base config sets `"jsx": "preserve"`, so TypeScript emits JSX untouched and
       * whoever bundles decides how to transform it. Next's SWC chooses the automatic
       * runtime, which is why no component under `packages/design/src` imports React and
       * every screen works. esbuild reads the same field and falls back to the CLASSIC
       * runtime, emitting `React.createElement` into a module where React is not in
       * scope -- `React is not defined`, at render, in the browser only.
       *
       * Set HERE rather than by changing `jsx` in `tsconfig.base.json`: that field is
       * read by Next, `tsc --noEmit` and Vitest, all of which are correct today. A second
       * surface does not get to change the setting the first one depends on.
       */
      esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
    })
  },
}

export default config
