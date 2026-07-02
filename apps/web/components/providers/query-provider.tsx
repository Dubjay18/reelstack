'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, type ReactNode } from 'react'
import { useToast } from '@/components/providers/toast-provider'

function QueryErrorHandler({ children }: { children: ReactNode }) {
  const { showToast } = useToast()

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000,
          },
          mutations: {
            onError: (error: unknown) => {
              const message =
                error instanceof Error ? error.message : 'Something went wrong'
              showToast(message, 'error')
            },
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryErrorHandler>{children}</QueryErrorHandler>
}
