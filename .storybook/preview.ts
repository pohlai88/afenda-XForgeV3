import type { Preview } from '@storybook/react-vite'
import { Page } from '@xforge/design/components/page'
import { createElement } from 'react'

/**
 * THE APPLICATION'S STYLESHEET, AND ONLY IT.
 *
 * Every `@source`, `@utility`, `@custom-variant` and the reduced-motion block arrive with
 * this one import, because `globals.css` is the single entry the application itself uses
 * (`apps/web/app/layout.tsx` imports this file and nothing else). Storybook writes no CSS
 * of its own: a font, a colour or a shadow introduced here would be a variable sitting
 * between the specimen and the product, and the whole reason to render components in a
 * second place is to prove there is no such variable.
 */
import '@xforge/web/globals.css'

/**
 * The two axes a component can silently get wrong, set on the element `tokens.css`
 * rebinds. These are the same attributes the gallery's own toggles set and the same ones
 * `proof.mjs` drives -- `data-theme` and `data-density` on the document root. Copied
 * values are a second source, so the story-level check asserts them against `tokens.css`
 * the way `apps/web/tests/gallery.test.tsx` does for the gallery.
 */
const preview: Preview = {
  decorators: [
    (Story, context) => {
      const root = document.documentElement
      const { density, theme } = context.globals
      // `default` and `light` are the ABSENCE of the attribute -- the tokens as declared
      // on `:root`. Setting `data-theme="light"` would select a block that does not exist.
      if (theme === 'dark') {
        root.dataset.theme = 'dark'
      } else {
        delete root.dataset.theme
      }
      if (density && density !== 'default') {
        root.dataset.density = density
      } else {
        delete root.dataset.density
      }

      /**
       * EVERY STORY RENDERS INSIDE `Page`, EXACTLY AS `apps/web/app/layout.tsx` DOES.
       *
       * `Page` is where the document-level roles are selected once -- `family.sans`,
       * `surface.page.background`, `typography.body`, `ink.default.text` -- and no other
       * component selects a family for itself except `Code`. Without this wrapper a story
       * renders on a bare canvas: every Text, Heading, Button and Alert in the browser's
       * DEFAULT SERIF, on no ground, at no body size. The 36 stories written before this
       * decorator existed all looked plausible and none of them was showing the product's
       * typography.
       *
       * It is a wrapper rather than styles copied into the preview, because copying the
       * four roles here would be a second declaration of what a page is, and the first one
       * is a component this repository already owns.
       *
       * `createElement` rather than JSX so this file stays `.ts`, matching the sibling
       * suites' preference for no framework helper where none is needed.
       */
      return createElement(Page, null, Story())
    },
  ],
  globalTypes: {
    density: {
      description: 'data-density on the document root',
      toolbar: {
        icon: 'component',
        items: [
          { title: 'Default', value: 'default' },
          { title: 'Comfortable', value: 'comfortable' },
          { title: 'Compact', value: 'compact' },
        ],
      },
    },
    theme: {
      description: 'data-theme on the document root',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { title: 'Light', value: 'light' },
          { title: 'Dark', value: 'dark' },
        ],
      },
    },
  },

  initialGlobals: { density: 'default', theme: 'light' },

  parameters: {
    controls: { matchers: { color: /(background|color)$/i } },
    layout: 'centered',
  },
}

export default preview
