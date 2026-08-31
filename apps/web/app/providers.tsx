'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // A 403 is an answer, not a transient failure -- retrying it is noise.
            retry: (count, error) => {
              const status = (error as { status?: number } | undefined)?.status
              if (status === 403 || status === 404 || status === 409) {
                return false
              }
              return count < 2
            },
          },
        },
      }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
