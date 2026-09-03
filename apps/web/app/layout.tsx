import { Page } from '@xforge/design'
// ONE STYLESHEET IMPORT, AND IT IS THE ENTRY. `globals.css` pulls in Tailwind,
// the token declarations and the theme bridge, in the order that decides which
// namespace wins. Importing `tokens.css` here as well put the entry in two
// places, and a screen that can reach a stylesheet directly is a screen that can
// be styled independently of the system.
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
