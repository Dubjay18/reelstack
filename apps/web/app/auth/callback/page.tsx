'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { Loader2 } from 'lucide-react'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      login(token)
      router.replace('/dashboard')
    } else {
      router.replace('/login')
    }
  }, [searchParams, router, login])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-on-surface">
      <Loader2 size={36} className="text-primary animate-spin mb-md" />
      <p className="font-body-sm text-body-sm text-on-surface-variant">Completing sign in…</p>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-on-surface">
        <Loader2 size={36} className="text-primary animate-spin mb-md" />
        <p className="font-body-sm text-body-sm text-on-surface-variant">Loading…</p>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
