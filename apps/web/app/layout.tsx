import { Page } from '@xforge/design'
// The token stylesheet first, then the components that consume it. Both are
// imported ONCE, here: a screen importing CSS is a screen that can be styled
// independently of the system, which is the thing the design system exists to
// prevent.
import '@xforge/design/tokens.css'
// `ui.css` is NOT imported here any more. It defines `@utility` blocks, which
// only exist if Tailwind processes them, so `globals.css` imports it and this
// file must not import it a second time.
//
// `globals.css` pulls in Tailwind, the token bridge and the design system's
// own stylesheet, in that order. Import position here does NOT decide which
// wins -- Tailwind's utilities live in `@layer utilities` and unlayered CSS
// beats any layer -- so the ordering that matters is inside globals.css, and
// the note about it is there rather than restated here.
import './globals.css'
import type { ReactNode } from 'react'
import { Providers } from './providers'

export const metadata = { title: 'Xforge' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Page>{children}</Page>
        </Providers>
      </body>
    </html>
  )
}
