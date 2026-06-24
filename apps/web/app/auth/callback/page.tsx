'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { storeToken } from '@/lib/auth'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      storeToken(token)
      router.replace('/dashboard')
    } else {
      router.replace('/login')
    }
  }, [searchParams, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#131315] text-zinc-100">
      <span className="material-symbols-outlined text-[36px] text-primary animate-spin mb-md">
        progress_activity
      </span>
      <p className="font-body-sm text-body-sm text-zinc-400">Completing sign in…</p>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#131315] text-zinc-100">
        <span className="material-symbols-outlined text-[36px] text-primary animate-spin mb-md">
          progress_activity
        </span>
        <p className="font-body-sm text-body-sm text-zinc-400">Loading…</p>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
