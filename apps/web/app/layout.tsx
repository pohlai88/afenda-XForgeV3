import { Page } from '@xforge/ui'
// The token stylesheet first, then the components that consume it. Both are
// imported ONCE, here: a screen importing CSS is a screen that can be styled
// independently of the system, which is the thing the design system exists to
// prevent.
import '@xforge/tokens/tokens.css'
import '@xforge/ui/ui.css'
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
