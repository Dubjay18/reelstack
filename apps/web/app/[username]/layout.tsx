'use client'

import { useAuth } from '@/components/providers/auth-provider'
import Sidebar from '@/components/sidebar'

export default function PublicProfileLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const isLoggedIn = !!user

  return (
    <div className="flex min-h-dvh">
      {isLoggedIn && <Sidebar />}
      <main className={isLoggedIn ? 'flex-1 w-full md:ml-[--sidebar-width]' : 'w-full'}>{children}</main>
    </div>
  )
}
