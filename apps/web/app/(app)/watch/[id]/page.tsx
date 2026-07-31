'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useContentDetails } from '@/lib/hooks/api'
import { getProgress, setProgress } from '@/lib/watch-progress'
import { VidkingPlayer, type VidkingPlayerEvent } from '@/components/vidking-player'
import { EpisodeSelector } from '@/components/episode-selector'
import { ArrowLeft, Info, Loader2, Star, TriangleAlert } from 'lucide-react'

const TIMEUPDATE_THROTTLE_MS = 5000

const STRIPE_STYLE = {
  background: 'repeating-linear-gradient(135deg, #31261a 0px, #31261a 10px, #241c15 10px, #241c15 20px)',
}

export default function WatchPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const id = params.id as string
  const tmdbId = parseInt(id)
  const mediaType = searchParams.get('type') === 'tv' ? 'tv' : 'movie'

  const seasonParam = parseInt(searchParams.get('season') ?? '')
  const episodeParam = parseInt(searchParams.get('episode') ?? '')
  const season = mediaType === 'tv' && Number.isFinite(seasonParam) && seasonParam > 0 ? seasonParam : 1
  const episode = mediaType === 'tv' && Number.isFinite(episodeParam) && episodeParam > 0 ? episodeParam : 1

  const { data: movie, isLoading: movieLoading } = useContentDetails(mediaType, tmdbId)

  const lastTimeupdateWriteRef = useRef(0)

  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(`/movie/${tmdbId}?type=${mediaType}`)
    }
  }, [router, tmdbId, mediaType])

  // Canonicalize TV URLs missing season/episode, without polluting history.
  useEffect(() => {
    if (mediaType !== 'tv') return
    const hasSeason = searchParams.get('season')
    const hasEpisode = searchParams.get('episode')
    if (!hasSeason || !hasEpisode) {
      router.replace(`/watch/${tmdbId}?type=tv&season=${season}&episode=${episode}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType, tmdbId])

  const initialProgress = useMemo(() => {
    if (!Number.isFinite(tmdbId)) return null
    return getProgress(tmdbId, mediaType, mediaType === 'tv' ? season : undefined, mediaType === 'tv' ? episode : undefined)
  }, [tmdbId, mediaType, season, episode])

  const handlePlayerEvent = useCallback((event: VidkingPlayerEvent) => {
    if (!Number.isFinite(tmdbId)) return
    const s = mediaType === 'tv' ? season : undefined
    const e = mediaType === 'tv' ? episode : undefined

    if (event.event === 'pause' || event.event === 'ended' || event.event === 'seeked') {
      setProgress(tmdbId, mediaType, s, e, event.currentTime, event.duration)
      return
    }

    if (event.event === 'timeupdate') {
      const now = Date.now()
      if (now - lastTimeupdateWriteRef.current < TIMEUPDATE_THROTTLE_MS) return
      lastTimeupdateWriteRef.current = now
      setProgress(tmdbId, mediaType, s, e, event.currentTime, event.duration)
    }
  }, [tmdbId, mediaType, season, episode])

  const handleEpisodeChange = useCallback((newSeason: number, newEpisode: number) => {
    router.replace(`/watch/${tmdbId}?type=tv&season=${newSeason}&episode=${newEpisode}`)
  }, [router, tmdbId])

  if (!Number.isFinite(tmdbId) || movieLoading) {
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
  const seasonCount = !isMovieType ? (movie as any).number_of_seasons : undefined
  const backdropUrl = movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : null
  const rating = movie.vote_average ?? 0

  return (
    <div className="text-on-surface min-h-screen font-sans bg-background selection:bg-primary/30 selection:text-primary pb-16">

      {/* Backdrop banner */}
      <div className="relative h-[160px] sm:h-[200px] md:h-[240px] w-full overflow-hidden" style={backdropUrl ? undefined : STRIPE_STYLE}>
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
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />

        <button
          onClick={handleBack}
          aria-label="Go back"
          className="absolute top-4 left-4 sm:top-5 sm:left-5 z-20 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-on-surface flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </button>

        <div className="absolute bottom-4 sm:bottom-5 left-4 right-4 sm:left-10 sm:right-10 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 bg-primary/15 border border-primary/30 rounded-full px-2.5 py-1 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-primary">Now Playing on Reelplay</span>
            </div>
            <h1 className="font-bold text-xl sm:text-2xl md:text-[32px] text-on-surface break-words" style={{ letterSpacing: '-0.02em' }}>
              {title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-on-surface-variant text-[13px] mt-1">
              <span>{releaseYear}</span>
              {mediaType === 'tv' && <><span>·</span><span>S{season} · E{episode}</span></>}
              {rating > 0 && (
                <span className="inline-flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-md">
                  <Star size={12} className="text-primary" fill="currentColor" />
                  <span className="font-mono text-[11px] text-on-surface">{rating.toFixed(1)}</span>
                </span>
              )}
            </div>
          </div>

          <Link
            href={`/movie/${tmdbId}?type=${mediaType}`}
            className="hidden sm:inline-flex items-center gap-1.5 flex-shrink-0 bg-surface/80 backdrop-blur-sm border border-outline-variant text-on-surface-variant hover:text-on-surface text-[12px] font-medium px-3 py-1.5 rounded-full transition-colors"
          >
            <Info size={13} strokeWidth={2} />
            Details
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[980px] mx-auto px-4 sm:px-6 md:px-10 py-7">
        <VidkingPlayer
          tmdbId={tmdbId}
          mediaType={mediaType}
          season={mediaType === 'tv' ? season : undefined}
          episode={mediaType === 'tv' ? episode : undefined}
          autoPlay={false}
          nextEpisode
          episodeSelector={false}
          progress={initialProgress ?? undefined}
          onEvent={handlePlayerEvent}
        />

        {mediaType === 'tv' && (
          <div className="mt-4">
            <EpisodeSelector
              currentSeason={season}
              currentEpisode={episode}
              seasonCount={seasonCount}
              onChange={handleEpisodeChange}
            />
          </div>
        )}

        <div className="mt-5 flex items-start gap-2.5 bg-surface border border-outline-variant rounded-xl px-4 py-3">
          <TriangleAlert size={15} className="text-on-surface-variant flex-shrink-0 mt-0.5" strokeWidth={1.75} />
          <p className="text-[12px] text-on-surface-variant leading-relaxed">
            Playback powered by <span className="text-on-surface font-medium">Reelplay</span>, a third-party embed. If the video doesn&apos;t load, this title may not currently be available.
          </p>
        </div>
      </div>
    </div>
  )
}
