import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-provider'
import { QueryProvider } from '@/components/providers/query-provider'

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-50 antialiased">
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
