'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import Sidebar from "@/components/sidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isPublicListRoute =
    pathname.startsWith('/lists/') &&
    pathname !== '/lists/new' &&
    pathname !== '/lists/watchlist'

  useEffect(() => {
    if (!isLoading && !user && !isPublicListRoute) {
      router.push('/login')
    }
  }, [user, isLoading, router, isPublicListRoute])

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="material-symbols-outlined text-[36px] text-primary animate-spin">
          progress_activity
        </span>
      </div>
    )
  }

  if (!user && !isPublicListRoute) {
    return null
  }

  const showSidebar = !!user

  return (
    <div className="flex min-h-dvh">
      {showSidebar && <Sidebar />}
      <main className={showSidebar ? "flex-1 md:ml-[--sidebar-width]" : "flex-1 w-full"}>
        {children}
      </main>
    </div>
  )
}
