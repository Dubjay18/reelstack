import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { ServerWakeGate } from '@/components/providers/server-wake-gate'
import { RouteTransitionLoader } from '@/components/providers/route-transition-loader'
import { AppErrorBoundary } from '@/components/error-boundary/error-boundary'
import { ToastProvider } from '@/components/providers/toast-provider'
import { AmbientBackground } from '@/components/ui/ambient-background'

export const metadata: Metadata = {
  title: {
    default: 'Reelstack — Your film taste, publicly yours',
    template: '%s | Reelstack',
  },
  description:
    'Reelstack turns what you watch into a public taste profile. Share a link. Let your list do the talking.',
  openGraph: {
    siteName: 'Reelstack',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#17120e',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.fontshare.com" />
      </head>
      <body className="min-h-dvh bg-background text-on-surface antialiased overflow-x-hidden relative">
        <AmbientBackground />
        <RouteTransitionLoader />
        <ServerWakeGate>
          <AppErrorBoundary>
            <ToastProvider>
              <QueryProvider>
                <AuthProvider>
                  {children}
                </AuthProvider>
              </QueryProvider>
            </ToastProvider>
          </AppErrorBoundary>
        </ServerWakeGate>
      </body>
    </html>
  )
}
