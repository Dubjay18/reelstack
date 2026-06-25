'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEmbedList, useContentDetails } from '@/lib/hooks/api'
import type { ListItem } from '@/types'

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100)
  return (
    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
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
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900/50 animate-pulse border border-zinc-800/30" />
    )
  }

  if (!movie) return null

  const title = 'title' in movie ? movie.title : (movie as any).name
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
    : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=200&h=300'

  return (
    <Link
      href={`/movie/${item.tmdb_id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800/50 shadow-md hover:border-primary/50 transition-all"
    >
      {item.watched && (
        <div className="absolute top-1 right-1 z-30 bg-secondary text-on-secondary rounded-full w-4.5 h-4.5 flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[10px] font-bold">check</span>
        </div>
      )}
      <img
        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02] ${item.watched ? 'grayscale opacity-75' : ''}`}
        src={posterUrl}
        alt={title}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 p-1.5 w-full z-10 pointer-events-none">
        <h3 className="text-[9px] truncate font-medium drop-shadow-sm text-white">
          {title}
        </h3>
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
      <div className="bg-[#131315] text-zinc-100 min-h-screen flex items-center justify-center p-4">
        <span className="material-symbols-outlined text-[24px] text-primary animate-spin">progress_activity</span>
      </div>
    )
  }

  if (!data || !data.list) {
    return (
      <div className="bg-[#131315] text-zinc-100 min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-sm font-bold text-zinc-400 mb-1">List Not Found</h2>
          <p className="text-xs text-zinc-600">This list does not exist or is private.</p>
        </div>
      </div>
    )
  }

  const list = data.list
  const items = data.items ?? []
  const watchedCount = items.filter((f) => f.watched).length

  return (
    <div className="bg-[#131315] text-zinc-100 min-h-screen p-4 flex flex-col font-sans selection:bg-primary/30 selection:text-primary">
      {/* Widget Header */}
      <header className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-3 mb-4">
        <div className="min-w-0">
          <h1 className="text-base font-extrabold tracking-tight text-white truncate">
            {list.title}
          </h1>
          <p className="text-[10px] text-zinc-500 truncate">
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
          <span className="material-symbols-outlined text-[10px]">open_in_new</span>
        </Link>
      </header>

      {/* Progress and Stats */}
      <div className="flex items-center gap-3 mb-4 text-[10px] font-mono text-zinc-500">
        <div className="flex-grow max-w-[120px]">
          <ProgressBar value={watchedCount} total={items.length} />
        </div>
        <span>
          {watchedCount}/{items.length} watched
        </span>
      </div>

      {/* Grid of Films */}
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-lg py-8 text-center bg-zinc-900/10">
          <span className="material-symbols-outlined text-[32px] text-zinc-700 mb-2">movie</span>
          <p className="text-[11px] text-zinc-500">No films on this list yet.</p>
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
