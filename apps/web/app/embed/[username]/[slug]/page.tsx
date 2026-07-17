'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEmbedList, useContentDetails } from '@/lib/hooks/api'
import { CheckCircle2, Loader2, ExternalLink, Film } from 'lucide-react'
import type { ListItem } from '@/types'

const STRIPE_STYLE = {
  background: 'repeating-linear-gradient(135deg, #31261a 0px, #31261a 7px, #241c15 7px, #241c15 14px)',
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100)
  return (
    <div className="w-full h-1 bg-surface-container-high rounded-full overflow-hidden">
      <div
        className="h-full bg-secondary rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function EmbedFilmCard({ item }: { item: ListItem }) {
  const { data: movie, isLoading } = useContentDetails(item.media_type, item.tmdb_id)

  if (isLoading) {
    return (
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-surface-container animate-pulse border border-outline-variant/30" />
    )
  }

  if (!movie) return null

  const title = 'title' in movie ? movie.title : (movie as any).name
  const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : null

  return (
    <Link
      href={`/movie/${item.tmdb_id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative aspect-[2/3] rounded-lg overflow-hidden border border-outline-variant/30 hover:border-primary/50 transition-all"
      style={posterUrl ? undefined : STRIPE_STYLE}
    >
      {item.watched && (
        <div className="absolute top-1 right-1 z-30 bg-secondary text-on-secondary rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
          <CheckCircle2 size={10} strokeWidth={2.5} />
        </div>
      )}
      {posterUrl && (
        <img
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02] ${item.watched ? 'grayscale opacity-75' : ''}`}
          src={posterUrl}
          alt={title}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 p-1.5 w-full z-10 pointer-events-none">
        <h3 className="text-[9px] truncate font-medium drop-shadow-sm text-white">{title}</h3>
      </div>
    </Link>
  )
}

export default function EmbedPage() {
  const params = useParams()
  const username = params.username as string
  const slug = params.slug as string

  const { data, isLoading } = useEmbedList(username, slug)

  if (isLoading) {
    return (
      <div className="bg-background text-on-surface min-h-screen flex items-center justify-center p-4">
        <Loader2 size={24} className="text-primary animate-spin" />
      </div>
    )
  }

  if (!data || !data.list) {
    return (
      <div className="bg-background text-on-surface min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-sm font-bold text-on-surface-variant mb-1">List Not Found</h2>
          <p className="text-xs text-on-surface-variant/60">This list does not exist or is private.</p>
        </div>
      </div>
    )
  }

  const list = data.list
  const items = data.items ?? []
  const watchedCount = items.filter((f) => f.watched).length

  return (
    <div className="bg-background text-on-surface min-h-screen p-4 flex flex-col font-sans selection:bg-primary/30 selection:text-primary overflow-x-hidden max-w-full">

      {/* Widget header */}
      <header className="flex items-center justify-between gap-4 border-b border-outline-variant pb-3 mb-4">
        <div className="min-w-0">
          <h1 className="text-base font-extrabold tracking-tight text-on-surface truncate" style={{ letterSpacing: '-0.02em' }}>
            {list.title}
          </h1>
          <p className="text-[10px] text-on-surface-variant/60 truncate">
            by{' '}
            <Link href={`/${username}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">
              @{username}
            </Link>
          </p>
        </div>
        <Link
          href={`/${username}/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 text-[10px] text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded transition-colors font-mono tracking-wider uppercase font-semibold"
        >
          Reelstack
          <ExternalLink size={10} />
        </Link>
      </header>

      {/* Progress and stats */}
      <div className="flex items-center gap-3 mb-4 text-[10px] font-mono text-on-surface-variant/60">
        <div className="flex-grow max-w-[120px]">
          <ProgressBar value={watchedCount} total={items.length} />
        </div>
        <span>{watchedCount}/{items.length} watched</span>
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-outline-variant/30 rounded-lg py-8 text-center bg-surface-container/20">
          <Film size={32} className="text-on-surface-variant/30 mx-auto mb-2" strokeWidth={1.25} />
          <p className="text-[11px] text-on-surface-variant">No films on this list yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {items.map((item) => (
            <EmbedFilmCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
