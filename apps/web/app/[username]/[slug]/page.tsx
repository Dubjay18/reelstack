'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { useEmbedList, useContentDetails } from '@/lib/hooks/api'
import { SaveButton } from '@/components/save-button'
import { CheckCircle2, Loader2, Share2, Info, Film } from 'lucide-react'
import type { ListItem } from '@/types'

const STRIPE_STYLE = {
  background: 'repeating-linear-gradient(135deg, #31261a 0px, #31261a 9px, #241c15 9px, #241c15 18px)',
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100)
  return (
    <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
      <div
        className="h-full bg-secondary rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function PublicFilmCard({ item }: { item: ListItem }) {
  const { data: movie, isLoading } = useContentDetails(item.media_type, item.tmdb_id)

  if (isLoading) {
    return (
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-surface-container-low animate-pulse border border-outline-variant/30" />
    )
  }

  if (!movie) return null

  const title = 'title' in movie ? movie.title : (movie as any).name
  const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : null

  return (
    <Link
      href={`/movie/${item.tmdb_id}?type=${item.media_type}`}
      className="group relative aspect-[2/3] rounded-xl overflow-hidden border border-outline-variant/30 hover:border-primary/50 transition-all"
      style={posterUrl ? undefined : STRIPE_STYLE}
    >
      {item.watched && (
        <div className="absolute top-2 right-2 z-30 bg-secondary text-on-secondary rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
          <CheckCircle2 size={13} strokeWidth={2.5} />
        </div>
      )}
      {posterUrl && (
        <img
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02] ${item.watched ? 'grayscale opacity-70' : ''}`}
          src={posterUrl}
          alt={title}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 p-3 w-full z-10 pointer-events-none">
        <h3 className="text-xs truncate font-medium drop-shadow-md text-white">{title}</h3>
      </div>
    </Link>
  )
}

export default function PublicListPage() {
  const { user } = useAuth()
  const params = useParams()
  const username = params.username as string
  const slug = params.slug as string

  const { data, isLoading } = useEmbedList(username, slug)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleShare = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      showToast('List link copied to clipboard!')
    }
  }

  if (isLoading) {
    return (
      <div className="bg-background text-on-surface min-h-screen flex items-center justify-center">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    )
  }

  if (!data || !data.list) {
    return (
      <div className="bg-background text-on-surface min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">List Not Found</h1>
          <p className="text-on-surface-variant mb-6">The list you are looking for does not exist or is private.</p>
          <Link href="/" className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 transition-opacity">
            Back to Reelstack
          </Link>
        </div>
      </div>
    )
  }

  const list = data.list
  const items = data.items ?? []
  const watchedCount = items.filter((f) => f.watched).length

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col font-sans selection:bg-primary/30 selection:text-primary pt-16">

      {/* Top bar */}
      <header className="bg-background/85 backdrop-blur-md fixed top-0 left-0 w-full z-[45] border-b border-outline-variant flex justify-between items-center px-6 h-16">
        <Link href="/" className="font-bold text-[20px] text-primary" style={{ letterSpacing: '-0.02em' }}>
          Reelstack
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <Link href="/dashboard" className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/register" className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">
                Sign up
              </Link>
              <Link href="/login" className="px-4 py-1.5 border border-outline-variant rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors">
                Log in
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1120px] mx-auto px-6 py-12 w-full flex-grow space-y-8">
        {/* List header */}
        <header className="space-y-4 border-b border-outline-variant pb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-2" style={{ letterSpacing: '-0.02em' }}>
                {list.title}
              </h1>
              <p className="text-xs text-on-surface-variant">
                Curated by{' '}
                <Link href={`/${username}`} className="text-primary hover:underline font-semibold">
                  @{username}
                </Link>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <SaveButton listId={list.id} listOwnerId={list.user_id} />
              <button
                onClick={handleShare}
                className="flex items-center gap-2 text-on-surface-variant hover:text-primary px-4 py-2 rounded-xl transition-all font-bold text-sm bg-transparent border border-outline-variant hover:border-primary/50"
              >
                <Share2 size={16} strokeWidth={1.75} />
                Share List
              </button>
            </div>
          </div>

          <div className="max-w-2xl">
            {list.description ? (
              <p className="text-on-surface-variant text-sm leading-relaxed">{list.description}</p>
            ) : (
              <p className="text-on-surface-variant/40 text-sm italic">No description provided.</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
            <div className="w-full sm:w-64">
              <ProgressBar value={watchedCount} total={items.length} />
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-on-surface-variant/60">
              <span>{items.length} films</span>
              <span className="w-1 h-1 rounded-full bg-outline-variant" />
              <span className="text-secondary">{watchedCount} watched</span>
            </div>
          </div>
        </header>

        {/* Film grid */}
        {items.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-outline-variant/30 rounded-2xl bg-surface-container/20">
            <Film size={48} className="text-on-surface-variant/30 mx-auto mb-4" strokeWidth={1.25} />
            <p className="text-on-surface-variant">This list has no films yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {items.map((item) => (
              <PublicFilmCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-6 max-w-[1120px] mx-auto border-t border-outline-variant/30 flex justify-between items-center shrink-0">
        <Link href="/" className="font-bold text-[18px] text-primary" style={{ letterSpacing: '-0.02em' }}>
          Reelstack
        </Link>
        <div className="font-mono text-[10px] text-on-surface-variant/50 tracking-wide uppercase">
          No ads. No algorithms.
        </div>
      </footer>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-surface-container border border-outline-variant text-on-surface px-4 py-2.5 rounded-xl shadow-modal z-50 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Info size={18} className="text-primary flex-shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
