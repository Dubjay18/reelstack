'use client'

import { useState, useEffect, useRef, type FormEvent } from 'react'
import { CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api, APIError } from '@/lib/api'
import { useRegister } from '@/lib/hooks/api'
import { GoogleButton } from '@/components/auth/google-button'
import { LogoMark } from '@/components/ui/logo'

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

function UsernameHint({ status }: { status: UsernameStatus }) {
  if (status === 'idle') return null
  if (status === 'checking') {
    return (
      <p className="mt-base flex items-center gap-xs font-caption text-caption text-on-surface-variant">
        <span className="inline-block w-3 h-3 border-2 border-on-surface-variant/30 border-t-on-surface-variant rounded-full animate-spin" />
        Checking availability…
      </p>
    )
  }
  if (status === 'available') {
    return (
      <p className="mt-base flex items-center gap-xs font-caption text-caption text-primary">
        <CheckCircle2 size={14} strokeWidth={2.5} />
        Available
      </p>
    )
  }
  if (status === 'taken') {
    return (
      <p className="mt-base flex items-center gap-xs font-caption text-caption text-error">
        <XCircle size={14} strokeWidth={2.5} />
        Already taken
      </p>
    )
  }
  if (status === 'invalid') {
    return (
      <p className="mt-base font-caption text-caption text-on-surface-variant/70">
        3–20 characters, letters/numbers/underscores only
      </p>
    )
  }
  return null
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

export function RegisterForm() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const registerMutation = useRegister()

  // Debounced username availability check
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!username) {
      setUsernameStatus('idle')
      return
    }

    if (!USERNAME_RE.test(username)) {
      setUsernameStatus('invalid')
      return
    }

    setUsernameStatus('checking')

    debounceRef.current = setTimeout(async () => {
      try {
        await api.get(`/api/v1/users/${encodeURIComponent(username)}`)
        // 200 → user exists → taken
        setUsernameStatus('taken')
      } catch (err) {
        if (err instanceof APIError && err.status === 404) {
          setUsernameStatus('available')
        } else {
          // Network / server error — don't block the form, fall back to idle
          setUsernameStatus('idle')
        }
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [username])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (usernameStatus === 'taken') {
      setError('That username is already taken. Please choose another.')
      return
    }
    if (usernameStatus === 'invalid') {
      setError('Username must be 3–20 characters: letters, numbers, and underscores only.')
      return
    }

    registerMutation.mutate(
      { email, username, password },
      {
        onSuccess: () => {
          router.push('/dashboard')
        },
        onError: (err: any) => {
          setError(err.message || 'Something went wrong. Please try again.')
        },
      }
    )
  }

  return (
    <div className="w-full max-w-[420px] mx-auto">
      {/* Logo mark */}
      <div className="flex items-center gap-2.5 mb-10">
        <LogoMark size={28} />
        <span className="font-bold text-[18px] text-on-surface" style={{ letterSpacing: '-0.02em' }}>Reelstack</span>
      </div>

      {/* Card */}
      <div className="bg-surface-container-low rounded-xl border border-outline-variant p-lg md:p-xl shadow-card">
        <div className="text-center mb-xl">
          <h2 className="font-heading text-heading text-on-surface mb-xs">Create your taste profile</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Join the gallery for cinephiles.</p>
        </div>

        {/* Google OAuth */}
        <div className="mb-lg">
          <GoogleButton />
        </div>

        {/* Divider */}
        <div className="relative flex items-center py-md mb-lg">
          <div className="flex-grow border-t border-outline-variant" />
          <span className="flex-shrink-0 mx-sm font-caption text-caption text-on-surface-variant uppercase tracking-wider">
            or
          </span>
          <div className="flex-grow border-t border-outline-variant" />
        </div>

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="mb-md rounded-md bg-error-container/20 border border-error/30 px-sm py-xs"
          >
            <p className="font-body-sm text-body-sm text-error">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-md" noValidate>
          {/* Email */}
          <div>
            <label
              htmlFor="register-email"
              className="block font-caption text-caption text-on-surface-variant mb-base"
            >
              Email
            </label>
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-md px-sm py-sm text-on-surface font-body-sm text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors placeholder:text-on-surface-variant/50"
            />
          </div>

          {/* Username */}
          <div>
            <label
              htmlFor="register-username"
              className="block font-caption text-caption text-on-surface-variant mb-base"
            >
              Username
            </label>
            <div
              className={`flex rounded-md border transition-colors bg-surface overflow-hidden ${
                usernameStatus === 'taken' || usernameStatus === 'invalid'
                  ? 'border-error focus-within:border-error focus-within:ring-1 focus-within:ring-error'
                  : usernameStatus === 'available'
                    ? 'border-secondary focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary'
                    : 'border-outline-variant focus-within:border-primary focus-within:ring-1 focus-within:ring-primary'
              }`}
            >
              <span className="inline-flex items-center px-sm text-on-surface-variant font-mono text-mono bg-surface-container-high border-r border-outline-variant select-none whitespace-nowrap">
                reelstack.app/
              </span>
              <input
                id="register-username"
                name="username"
                type="text"
                autoComplete="username"
                required
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="flex-1 block w-full min-w-0 px-sm py-sm bg-transparent text-on-surface font-body-sm text-body-sm border-none focus:ring-0 placeholder:text-on-surface-variant/50 outline-none"
              />
            </div>
            <UsernameHint status={usernameStatus} />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="register-password"
              className="block font-caption text-caption text-on-surface-variant mb-base"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="register-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-md px-sm py-sm pr-10 text-on-surface font-body-sm text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors placeholder:text-on-surface-variant/50"
              />
              <button
                id="register-password-toggle"
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 pr-sm flex items-center text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            id="register-submit"
            type="submit"
            disabled={registerMutation.isPending || usernameStatus === 'taken' || usernameStatus === 'checking'}
            className="w-full bg-primary hover:bg-primary-container text-on-primary-fixed font-heading text-heading font-semibold rounded-md py-sm px-md transition-colors mt-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-xs"
          >
            {registerMutation.isPending ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-on-primary-fixed/30 border-t-on-primary-fixed rounded-full animate-spin" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="text-center mt-xl">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-primary hover:text-primary-fixed transition-colors hover:underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
