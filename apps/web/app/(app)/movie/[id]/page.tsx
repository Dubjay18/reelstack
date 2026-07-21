'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useContentDetails, useStreamingAvailability, useUserLists } from '@/lib/hooks/api'
import { api } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { CommentSection } from '@/components/comments'
import { StreamingBadge } from '@/components/streaming-badge'
import { Share2, Plus, Star, Play, Loader2, ChevronDown, ArrowLeft } from 'lucide-react'

const STRIPE_STYLE = {
  background: 'repeating-linear-gradient(135deg, #31261a 0px, #31261a 10px, #241c15 10px, #241c15 20px)',
}

export default function Page() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = params.id as string
  const tmdbId = parseInt(id)
  const queryClient = useQueryClient()
  const mediaType = searchParams.get('type') === 'tv' ? 'tv' : 'movie'

  const handleBack = () => {
    // Fall back to dashboard when there's no in-app history (e.g. direct link, new tab).
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/dashboard')
    }
  }

  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [showListSelector, setShowListSelector] = useState(false)
  const [addingToListId, setAddingToListId] = useState<string | null>(null)
  const [showTrailer, setShowTrailer] = useState(false)

  const { data: movie, isLoading: movieLoading } = useContentDetails(mediaType, tmdbId)
  const { data: rawStreamingProviders, isLoading: streamingLoading } = useStreamingAvailability(mediaType, tmdbId)
  const streamingProviders = rawStreamingProviders ?? []
  const { data: rawLists } = useUserLists()
  const lists = rawLists ?? []

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  const showToast = (msg: string) => setToastMessage(msg)

  const handleShare = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      showToast('Link copied to clipboard!')
    }
  }

  const handleAddToList = (listId: string, listTitle: string) => {
    setAddingToListId(listId)
    api.post(`/api/v1/lists/${listId}/items`, {
      tmdb_id: tmdbId,
      media_type: mediaType,
      watched: false,
    }).then(() => {
      showToast(`Saved to "${listTitle}"`)
      setShowListSelector(false)
      queryClient.invalidateQueries({ queryKey: ['lists'] })
      queryClient.invalidateQueries({ queryKey: ['list-items', listId] })
    }).catch((err) => {
      showToast(err.message || 'Failed to add film to list')
    }).finally(() => {
      setAddingToListId(null)
    })
  }

  if (movieLoading) {
    return (
      <div className="text-on-surface min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    )
  }

  if (!movie) {
    return (
      <div className="text-on-surface min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Title Not Found</h1>
          <Link href="/dashboard" className="text-primary hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  const isMovieType = 'release_date' in movie
  const title = isMovieType ? movie.title : (movie as any).name
  const releaseDate = isMovieType ? movie.release_date : (movie as any).first_air_date
  const releaseYear = releaseDate ? releaseDate.substring(0, 4) : 'Unknown'
  const durationStr = isMovieType && movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : null
  const backdropUrl = movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : null
  const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null
  const rating = movie.vote_average ?? 0

  return (
    <div className="text-on-surface min-h-screen font-sans bg-background selection:bg-primary/30 selection:text-primary pb-16 lg:pb-0">

      {/* Backdrop banner */}
      <div className="relative h-[220px] sm:h-[280px] md:h-[340px] w-full overflow-hidden" style={backdropUrl ? undefined : STRIPE_STYLE}>
        {backdropUrl && (
          <Image
            src={backdropUrl}
            alt={title}
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
        )}
        {/* Bottom gradient fade to page bg */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

        {/* Back button */}
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="absolute top-4 left-4 sm:top-5 sm:left-5 z-20 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-on-surface flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </button>

        {/* Title / meta overlay at bottom */}
        <div className="absolute bottom-5 sm:bottom-7 left-4 right-4 sm:left-10 sm:right-10">
          <h1 className="font-bold text-2xl sm:text-3xl md:text-[44px] text-on-surface mb-2 break-words" style={{ letterSpacing: '-0.02em' }}>{title}</h1>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-on-surface-variant text-[13px] sm:text-[14px]">
            <span>{releaseYear}</span>
            {durationStr && <><span>·</span><span>{durationStr}</span></>}
            {movie.genres && movie.genres.length > 0 && (
              <><span>·</span><span>{movie.genres.slice(0, 3).join(', ')}</span></>
            )}
            {rating > 0 && (
              <span className="inline-flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-md sm:ml-2">
                <Star size={13} className="text-primary" fill="currentColor" />
                <span className="font-mono text-[12px] text-on-surface">{rating.toFixed(1)}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content below banner */}
      <div className="max-w-[980px] mx-auto px-4 sm:px-6 md:px-10 py-9 pb-20 flex flex-col md:flex-row gap-6 md:gap-9">

        {/* Left column: poster + actions + streaming */}
        <div className="w-full md:w-[220px] flex-shrink-0">
          {/* Poster overlapping the banner (desktop only) */}
          <div
            className="w-[140px] h-[210px] md:w-[220px] md:h-[330px] mx-auto md:mx-0 rounded-[14px] -mt-[70px] md:-mt-[110px] relative z-10 border border-outline-variant shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden"
            style={posterUrl ? undefined : STRIPE_STYLE}
          >
            {posterUrl && (
              <Image src={posterUrl} alt={title} fill className="object-cover" sizes="220px" />
            )}
          </div>

          {/* Save + Share buttons */}
          <div className="flex gap-2.5 mt-4">
            <button
              onClick={() => setShowListSelector(!showListSelector)}
              disabled={addingToListId !== null}
              className="flex-1 bg-primary text-on-primary font-semibold py-2.5 px-3 rounded-[10px] text-[13px] flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {addingToListId !== null ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={2.5} />}
              Save
            </button>
            <button
              onClick={handleShare}
              className="bg-surface border border-outline-variant text-on-surface p-2.5 rounded-[10px] hover:bg-surface-container transition-colors"
            >
              <Share2 size={16} strokeWidth={1.75} />
            </button>
          </div>

          {/* List selector dropdown */}
          {showListSelector && (
            <div className="mt-2 bg-surface-container border border-outline-variant rounded-xl shadow-xl p-1.5 z-50">
              <div className="font-mono text-[10px] text-on-surface-variant uppercase px-2.5 py-1 tracking-wider border-b border-outline-variant/40 mb-1">
                Select a list
              </div>
              {lists.length === 0 ? (
                <div className="px-2.5 py-2 text-on-surface-variant text-xs italic">
                  <Link href="/lists/new" className="text-primary hover:underline">Create a list</Link> first
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto">
                  {lists.map(list => (
                    <button
                      key={list.id}
                      onClick={() => handleAddToList(list.id, list.title)}
                      disabled={addingToListId !== null}
                      className="w-full text-left px-2.5 py-2 text-on-surface-variant hover:bg-surface-container-high hover:text-primary rounded-lg text-[13px] transition-colors truncate disabled:opacity-50"
                    >
                      {list.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Streaming on */}
          {(streamingLoading || streamingProviders.length > 0) && (
            <div className="mt-5">
              <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-on-surface-variant mb-2.5">Streaming on</div>
              {streamingLoading ? (
                <div className="h-6 bg-surface-container rounded animate-pulse" />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {streamingProviders.map((p) => (
                    <StreamingBadge key={p.provider_id} name={p.provider_name} link={p.link} type={p.type} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: synopsis + trailer + genres + cast + comments */}
        <div className="flex-1 min-w-0">

          {/* Synopsis */}
          {movie.overview && (
            <p className="text-[15px] leading-[1.7] text-on-surface-variant mb-8">
              {movie.overview}
            </p>
          )}

          {/* Genres */}
          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-8">
              {movie.genres.map((g, i) => (
                <span key={i} className="bg-surface border border-outline-variant rounded-md px-3 py-1 text-[12px] text-on-surface-variant">
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Trailer */}
          {movie.trailer_key && (
            <section className="mb-8">
              <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-on-surface-variant mb-3">Trailer</div>
              {showTrailer ? (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-surface-container border border-outline-variant">
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube-nocookie.com/embed/${movie.trailer_key}?autoplay=1&rel=0`}
                    title="Trailer"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <button
                  onClick={() => setShowTrailer(true)}
                  className="relative w-full aspect-video rounded-xl overflow-hidden bg-surface-container border border-outline-variant group cursor-pointer"
                >
                  <img
                    className="absolute inset-0 w-full h-full object-cover"
                    src={`https://img.youtube.com/vi/${movie.trailer_key}/hqdefault.jpg`}
                    alt="Play trailer"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/50 transition-colors">
                    <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play size={22} className="text-on-primary ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                </button>
              )}
            </section>
          )}

          {/* Cast grid */}
          {(movie as any).credits?.cast && (movie as any).credits.cast.length > 0 && (
            <section className="mb-8">
              <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-on-surface-variant mb-3.5">Cast</div>
              <div className="grid grid-cols-3 gap-4">
                {(movie as any).credits.cast.slice(0, 6).map((person: any) => (
                  <div key={person.id} className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high flex-shrink-0 overflow-hidden border border-outline-variant">
                      {person.profile_path && (
                        <Image
                          src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                          alt={person.name}
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                        />
                      )}
                    </div>
                    <div>
                      <div className="text-[13px] text-on-surface font-semibold leading-tight">{person.name}</div>
                      <div className="text-[12px] text-on-surface-variant leading-tight">{person.character}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Stats sidebar (compact) */}
          <div className="bg-surface border border-outline-variant rounded-2xl p-5 mb-8">
            <div className="space-y-3">
              {[
                { label: 'Release Date', value: releaseDate || 'N/A' },
                { label: 'Rating', value: rating > 0 ? `${rating.toFixed(1)} / 10` : 'N/A' },
                { label: 'Popularity', value: (movie as any).popularity ? Math.round((movie as any).popularity).toLocaleString() : 'N/A' },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center border-b border-outline-variant/40 pb-3 last:border-0 last:pb-0 text-[13px]">
                  <span className="text-on-surface-variant">{row.label}</span>
                  <span className="font-mono text-on-surface">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Comments */}
          <CommentSection tmdbId={tmdbId} mediaType={mediaType} />
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-surface-container-high border border-outline-variant text-on-surface px-4 py-3 rounded-xl shadow-modal z-50 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="font-body-sm text-body-sm">{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
