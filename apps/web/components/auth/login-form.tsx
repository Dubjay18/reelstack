'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLogin } from '@/lib/hooks/api'
import { GoogleButton } from '@/components/auth/google-button'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const loginMutation = useLogin()

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    loginMutation.mutate(
      { email, password },
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
      {/* Logo */}
      <div className="text-center mb-xl">
        <h1 className="font-display-md text-display-md text-primary tracking-tight">Reelstack</h1>
      </div>

      {/* Card */}
      <div className="bg-surface-container-low rounded-xl border border-outline-variant p-lg md:p-xl shadow-card">
        <div className="text-center mb-xl">
          <h2 className="font-heading text-heading text-on-surface mb-base">Welcome back</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Log in to curate your gallery.</p>
        </div>

        {/* Google OAuth */}
        <div className="mb-lg">
          <GoogleButton />
        </div>

        {/* Divider */}
        <div className="relative flex items-center mb-lg">
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
              htmlFor="login-email"
              className="block font-caption text-caption text-on-surface-variant mb-base"
            >
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-md px-sm py-sm text-on-surface font-body-sm text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors placeholder:text-on-surface-variant/50"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-base">
              <label
                htmlFor="login-password"
                className="block font-caption text-caption text-on-surface-variant"
              >
                Password
              </label>
              <a
                href="#"
                className="font-caption text-caption text-primary hover:text-primary-fixed transition-colors hover:underline underline-offset-4"
              >
                Forgot password?
              </a>
            </div>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-md px-sm py-sm text-on-surface font-body-sm text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors placeholder:text-on-surface-variant/50"
            />
          </div>

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full bg-primary hover:bg-primary-container text-on-primary-fixed font-heading text-heading font-semibold rounded-md py-sm px-md transition-colors mt-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-xs"
          >
            {loginMutation.isPending ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-on-primary-fixed/30 border-t-on-primary-fixed rounded-full animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="text-center mt-lg">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-primary hover:text-primary-fixed transition-colors hover:underline underline-offset-4"
          >
            Join free
          </Link>
        </p>
      </div>
    </div>
  )
}
