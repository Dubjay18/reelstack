'use client'

import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import type { ReactNode } from 'react'

function DefaultFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-md bg-zinc-950 px-md text-center">
      <span className="material-symbols-outlined text-[48px] text-red-400">error_outline</span>
      <h2 className="font-heading-sm text-zinc-50">Something went wrong</h2>
      <p className="font-body-sm text-zinc-400 max-w-sm">
        {(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.')}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="mt-sm rounded-xl bg-zinc-800 px-lg py-sm font-body-sm text-zinc-50 transition-colors hover:bg-zinc-700"
      >
        Try again
      </button>
    </div>
  )
}

interface AppErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

export function AppErrorBoundary({ children, fallback }: AppErrorBoundaryProps) {
  return (
    <ErrorBoundary
      FallbackComponent={fallback ? () => <>{fallback}</> : DefaultFallback}
      onError={(error) => {
        console.error('Unhandled error:', error)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
