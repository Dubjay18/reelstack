'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMcpTokens, useCreateMcpToken, useRevokeMcpToken } from '@/lib/hooks/api'
import { ArrowLeft, Plug, Plus, Copy, Check, Trash2, Loader2, AlertCircle } from 'lucide-react'

const MCP_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080') + '/mcp'

function relativeTime(iso: string | null): string {
  if (!iso) return 'never'
  const diffMs = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diffMs / (60 * 60 * 1000))
  if (hours < 1) return 'just now'
  if (hours === 1) return '1 hour ago'
  if (hours < 24) return `${hours} hours ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

export default function McpSettingsPage() {
  const { data, isLoading } = useMcpTokens()
  const createToken = useCreateMcpToken()
  const revokeToken = useRevokeMcpToken()

  const [name, setName] = useState('')
  const [revealedToken, setRevealedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Give this token a name so you can recognize it later.')
      return
    }
    setError('')
    createToken.mutate(name.trim(), {
      onSuccess: (res) => {
        setRevealedToken(res.token)
        setName('')
      },
      onError: (err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to create token.')
      },
    })
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore — clipboard access can fail silently in some browsers
    }
  }

  const handleRevoke = (id: string, tokenName: string) => {
    if (!confirm(`Revoke "${tokenName}"? Any MCP client using it will lose access immediately.`)) return
    revokeToken.mutate(id)
  }

  const tokens = data?.tokens ?? []

  return (
    <div className="bg-background text-on-background min-h-screen overflow-x-hidden">
      <main className="flex-1 w-full">
        <div className="max-w-2xl mx-auto px-lg md:px-xl py-lg md:py-xl">
          <Link href="/dashboard" className="inline-flex items-center gap-xs text-on-surface-variant hover:text-primary transition-colors font-body-sm text-body-sm mb-lg">
            <ArrowLeft size={18} strokeWidth={1.75} />
            Back
          </Link>

          <div className="flex items-center gap-sm mb-xs">
            <Plug size={22} className="text-primary" strokeWidth={1.75} />
            <h1 className="font-display-md text-display-md text-on-surface">MCP Access</h1>
          </div>
          <p className="text-on-surface-variant font-body-sm text-body-sm mb-xl">
            Connect Claude Desktop, Claude Code, or any other MCP client to your Reelstack account so it can create
            and manage lists for you. Riley uses this same server internally, always with your approval first.
          </p>

          {/* Connection info */}
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-md mb-xl">
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-[0.1em] mb-xs">Server URL</p>
            <div className="flex items-center gap-sm">
              <code className="flex-1 font-mono text-mono text-on-surface bg-surface-container rounded-md px-sm py-xs overflow-x-auto">
                {MCP_URL}
              </code>
              <button
                type="button"
                onClick={() => handleCopy(MCP_URL)}
                className="p-xs bg-surface-container border border-outline-variant rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors flex-shrink-0"
                aria-label="Copy server URL"
              >
                <Copy size={14} strokeWidth={1.75} />
              </button>
            </div>
            <p className="mt-sm font-body-sm text-body-sm text-on-surface-variant">
              Add this as a remote MCP server in your client, authenticating with a token generated below.
            </p>
          </div>

          {/* Generate token */}
          <form onSubmit={handleCreate} className="flex flex-col gap-sm mb-xl">
            <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-[0.1em]">
              Generate a new token
            </label>
            <div className="flex gap-sm">
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError('') }}
                placeholder="e.g. Claude Desktop"
                maxLength={100}
                className={`flex-1 bg-surface-container-low border rounded-xl py-sm px-md font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary transition-all ${error ? 'border-error' : 'border-outline-variant focus:border-primary'}`}
              />
              <button
                type="submit"
                disabled={createToken.isPending}
                className="bg-primary text-on-primary px-md py-sm rounded-md font-heading text-heading font-semibold flex items-center gap-xs hover:bg-primary-fixed transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0"
              >
                {createToken.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} strokeWidth={2.5} />}
                Generate
              </button>
            </div>
            {error && (
              <p className="text-error font-body-sm text-body-sm flex items-center gap-xs">
                <AlertCircle size={14} strokeWidth={1.75} />
                {error}
              </p>
            )}
          </form>

          {/* One-time token reveal */}
          {revealedToken && (
            <div className="bg-primary/5 border border-primary/40 rounded-xl p-md mb-xl">
              <p className="font-body-sm text-body-sm font-semibold text-on-surface mb-xs">
                Copy this token now — it won&apos;t be shown again.
              </p>
              <div className="flex items-center gap-sm">
                <code className="flex-1 font-mono text-mono text-on-surface bg-surface-container rounded-md px-sm py-xs overflow-x-auto">
                  {revealedToken}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(revealedToken)}
                  className="p-xs bg-surface-container border border-outline-variant rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors flex-shrink-0"
                  aria-label="Copy token"
                >
                  {copied ? <Check size={14} className="text-primary" strokeWidth={2} /> : <Copy size={14} strokeWidth={1.75} />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setRevealedToken(null)}
                className="mt-sm text-on-surface-variant hover:text-on-surface font-body-sm text-body-sm transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Existing tokens */}
          <div>
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-[0.1em] mb-sm">Active tokens</p>
            {isLoading ? (
              <div className="space-y-sm">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-[60px] rounded-xl bg-surface-container border border-outline-variant animate-pulse" />
                ))}
              </div>
            ) : tokens.length === 0 ? (
              <p className="text-on-surface-variant font-body-sm text-body-sm py-md text-center">
                No tokens yet — generate one above to connect an MCP client.
              </p>
            ) : (
              <ul className="space-y-sm">
                {tokens.map((token) => (
                  <li
                    key={token.id}
                    className="flex items-center justify-between gap-sm bg-surface-container-low border border-outline-variant rounded-xl p-md"
                  >
                    <div className="min-w-0">
                      <p className="font-body-sm text-body-sm font-semibold text-on-surface truncate">{token.name}</p>
                      <p className="font-mono text-[11px] text-on-surface-variant">
                        Created {relativeTime(token.created_at)} · Last used {relativeTime(token.last_used_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevoke(token.id, token.name)}
                      disabled={revokeToken.isPending}
                      className="p-xs text-on-surface-variant hover:text-error transition-colors flex-shrink-0"
                      aria-label={`Revoke ${token.name}`}
                    >
                      <Trash2 size={16} strokeWidth={1.75} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
