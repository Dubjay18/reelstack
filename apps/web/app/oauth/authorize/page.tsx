'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { useOAuthClient, useOAuthConsent } from '@/lib/hooks/api'
import { LogoMark } from '@/components/ui/logo'
import { Loader2, ShieldCheck, TriangleAlert } from 'lucide-react'

// Restricted to https:// (a verifiable host) or loopback http:// (native
// apps, per RFC 8252) — mirrors apps/api/internal/oauth.validateRedirectURI.
// The backend is the actual enforcement point (registration is rejected
// server-side for anything else); this is defense in depth so the browser
// never even attempts window.location.href on something like a javascript:
// URI, which would run in this page's own origin with access to rs_token.
function isSafeRedirectURI(raw: string): boolean {
  try {
    const u = new URL(raw)
    if (u.protocol === 'https:') return true
    if (u.protocol === 'http:') {
      return u.hostname === '127.0.0.1' || u.hostname === '::1' || u.hostname === 'localhost'
    }
    return false
  } catch {
    return false
  }
}

// OAuth 2.1 consent screen — the `authorization_endpoint` an MCP client
// (e.g. Claude Desktop's "Add custom connector" flow) navigates the user's
// browser to. Lives on the web app's own origin because that's the only
// place the `rs_token` JWT (localStorage — Reelstack has no server-side
// session cookie) can be read to identify the logged-in user; the actual
// code issuance and token exchange happen against the API, see
// apps/api/internal/oauth.
function AuthorizeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const consent = useOAuthConsent()
  const [denying, setDenying] = useState(false)

  const clientId = searchParams.get('client_id') ?? ''
  const redirectUri = searchParams.get('redirect_uri') ?? ''
  const state = searchParams.get('state') ?? ''
  const codeChallenge = searchParams.get('code_challenge') ?? ''
  const codeChallengeMethod = searchParams.get('code_challenge_method') ?? ''

  const missingParams = !clientId || !redirectUri || !codeChallenge || codeChallengeMethod !== 'S256'
  const unsafeRedirect = !missingParams && !isSafeRedirectURI(redirectUri)

  const clientQuery = useOAuthClient(!missingParams && !unsafeRedirect ? clientId : '')

  useEffect(() => {
    if (missingParams || unsafeRedirect) return
    if (getCurrentUser()) return
    const redirectTarget = `/oauth/authorize?${searchParams.toString()}`
    router.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
  }, [missingParams, unsafeRedirect, router, searchParams])

  if (missingParams) {
    return (
      <AuthorizeShell>
        <p className="text-error font-body-sm text-body-sm text-center">
          This connection request is missing required parameters. Go back to the app you were
          connecting and try again.
        </p>
      </AuthorizeShell>
    )
  }

  if (unsafeRedirect) {
    return (
      <AuthorizeShell>
        <p className="text-error font-body-sm text-body-sm text-center">
          This connection request has an unsafe redirect destination and can&apos;t be approved.
          Go back to the app you were connecting and try again.
        </p>
      </AuthorizeShell>
    )
  }

  const user = getCurrentUser()
  if (!user || clientQuery.isLoading) {
    return (
      <AuthorizeShell>
        <div className="flex justify-center py-lg">
          <Loader2 size={20} className="animate-spin text-on-surface-variant" />
        </div>
      </AuthorizeShell>
    )
  }

  if (clientQuery.isError) {
    return (
      <AuthorizeShell>
        <p className="text-error font-body-sm text-body-sm text-center">
          This app isn&apos;t recognized. Go back to the app you were connecting and try again.
        </p>
      </AuthorizeShell>
    )
  }

  const clientName = clientQuery.data?.client_name || 'An unnamed app'
  const redirectHost = new URL(redirectUri).host

  const handleApprove = () => {
    consent.mutate(
      {
        client_id: clientId,
        redirect_uri: redirectUri,
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod,
        state: state || undefined,
      },
      {
        onSuccess: (res) => {
          if (!isSafeRedirectURI(res.redirect_to)) return
          window.location.href = res.redirect_to
        },
      }
    )
  }

  const handleDeny = () => {
    setDenying(true)
    const params = new URLSearchParams({ error: 'access_denied' })
    if (state) params.set('state', state)
    window.location.href = `${redirectUri}?${params.toString()}`
  }

  return (
    <AuthorizeShell>
      <p className="font-body-sm text-body-sm text-on-surface-variant text-center mb-lg">
        <span className="text-on-surface font-semibold">{clientName}</span> wants to connect to your
        Reelstack account, signed in as{' '}
        <span className="text-on-surface font-semibold">{user.username}</span>.
      </p>

      <div className="flex items-start gap-xs bg-surface-container-low border border-outline-variant rounded-xl p-md mb-lg">
        <TriangleAlert size={16} className="text-on-surface-variant mt-[2px] flex-shrink-0" strokeWidth={1.75} />
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          You&apos;ll be redirected to <span className="font-mono text-mono text-on-surface">{redirectHost}</span>{' '}
          after approving. Only continue if you started this connection yourself.
        </p>
      </div>

      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-md mb-lg">
        <p className="font-body-sm text-body-sm text-on-surface mb-xs">This will let it:</p>
        <ul className="font-body-sm text-body-sm text-on-surface-variant list-disc list-inside space-y-xs">
          <li>Create and manage watchlists on your behalf</li>
          <li>Add titles to your existing lists</li>
        </ul>
      </div>

      {consent.isError && (
        <p className="text-error font-body-sm text-body-sm text-center mb-md">
          {consent.error instanceof Error ? consent.error.message : 'Something went wrong. Please try again.'}
        </p>
      )}

      <div className="flex gap-sm">
        <button
          type="button"
          onClick={handleDeny}
          disabled={consent.isPending || denying}
          className="flex-1 bg-surface-container border border-outline-variant text-on-surface font-heading text-heading font-semibold rounded-md py-sm px-md transition-colors hover:bg-surface-container-high disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Deny
        </button>
        <button
          type="button"
          onClick={handleApprove}
          disabled={consent.isPending || denying}
          className="flex-1 bg-primary hover:bg-primary-container text-on-primary-fixed font-heading text-heading font-semibold rounded-md py-sm px-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-xs"
        >
          {consent.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Approve'}
        </button>
      </div>
    </AuthorizeShell>
  )
}

function AuthorizeShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-md">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center justify-center gap-2.5 mb-lg">
          <LogoMark size={28} />
          <span className="font-bold text-[18px] text-on-surface" style={{ letterSpacing: '-0.02em' }}>
            Reelstack
          </span>
        </div>
        <div className="bg-surface-container-low rounded-xl border border-outline-variant p-lg md:p-xl shadow-card">
          <div className="flex items-center justify-center gap-xs mb-lg">
            <ShieldCheck size={18} className="text-primary" strokeWidth={1.75} />
            <h2 className="font-heading text-heading text-on-surface">Authorize access</h2>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

export default function AuthorizePage() {
  return (
    <Suspense>
      <AuthorizeContent />
    </Suspense>
  )
}
