'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, RotateCw, TriangleAlert } from 'lucide-react'
import { api } from '@/lib/api'

const VIDKING_ORIGIN = 'https://www.vidking.net'

// Known playback events Vidking broadcasts over postMessage. Any PLAYER_EVENT
// (including timeupdate) confirms the embed actually started playing, which is
// the strongest "this source works" signal for failover.
const KNOWN_EVENTS = new Set(['timeupdate', 'play', 'pause', 'ended', 'seeked'])

// Reelstack's "Amber Reel" brand color (tailwind.config.ts `primary`/`brand.DEFAULT`), used as
// the Vidking player's default accent so playback controls match the app's theme.
export const REELSTACK_BRAND_COLOR = 'eb9c3e'

// How long to wait for a source to respond (iframe onLoad / first playback
// event) before failing over to the next source in the chain.
const FAILOVER_TIMEOUT_MS = 15000

export interface VidkingPlayerEvent {
  event: 'timeupdate' | 'play' | 'pause' | 'ended' | 'seeked'
  currentTime: number
  duration: number
  progress: number
  id: string
  mediaType: 'movie' | 'tv'
  season?: number
  episode?: number
  timestamp: number
}

interface EmbedSource {
  id: string
  label: string
  url: string
  ttfbs_ms?: number
}

interface MultiSourcePlayerProps {
  tmdbId: number
  mediaType: 'movie' | 'tv'
  season?: number
  episode?: number
  color?: string
  autoPlay?: boolean
  nextEpisode?: boolean
  episodeSelector?: boolean
  progress?: number
  placeholder?: string | null
  onEvent?: (event: VidkingPlayerEvent) => void
}

function buildVidkingUrl(opts: {
  tmdbId: number
  mediaType: 'movie' | 'tv'
  season?: number
  episode?: number
  color?: string
  autoPlay?: boolean
  nextEpisode?: boolean
  episodeSelector?: boolean
  progress?: number
}): string {
  const { tmdbId, mediaType, season, episode, color, autoPlay, nextEpisode, episodeSelector, progress } = opts
  const path = mediaType === 'tv'
    ? `/embed/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`
    : `/embed/movie/${tmdbId}`

  const params = new URLSearchParams()
  if (color) params.set('color', color.replace('#', ''))
  if (autoPlay) params.set('autoPlay', 'true')
  if (mediaType === 'tv') {
    if (nextEpisode) params.set('nextEpisode', 'true')
    if (episodeSelector) params.set('episodeSelector', 'true')
  }
  if (progress && progress > 0) params.set('progress', String(Math.floor(progress)))

  const qs = params.toString()
  return `${VIDKING_ORIGIN}${path}${qs ? `?${qs}` : ''}`
}

// Mirrors the old single-source player's contract so watch pages keep working
// even if the embed-source API is unreachable or returns nothing.
function vidkingFallback(props: {
  tmdbId: number
  mediaType: 'movie' | 'tv'
  season?: number
  episode?: number
  color?: string
  autoPlay?: boolean
  nextEpisode?: boolean
  episodeSelector?: boolean
  progress?: number
}): EmbedSource {
  return { id: 'vidking', label: 'VidKing', url: buildVidkingUrl(props) }
}

export function MultiSourcePlayer({
  tmdbId,
  mediaType,
  season,
  episode,
  color = REELSTACK_BRAND_COLOR,
  autoPlay = false,
  nextEpisode = true,
  episodeSelector = false,
  progress,
  placeholder,
  onEvent,
}: MultiSourcePlayerProps) {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const [sources, setSources] = useState<EmbedSource[] | null>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [exhausted, setExhausted] = useState(false)

  const activeSource = sources && sources.length > 0 ? sources[Math.min(activeIdx, sources.length - 1)] : null
  const isLoaded = activeSource ? loadedId === activeSource.id : false
  const isSwitching = activeIdx > 0

  const activeSourceRef = useRef(activeSource)
  activeSourceRef.current = activeSource

  // Resolve the ordered source chain (fastest-alive first) from the API,
  // falling back to a built-in Vidking URL if it's unreachable.
  useEffect(() => {
    let cancelled = false

    async function loadSources() {
      let resolved: EmbedSource[] | null = null
      try {
        const params = new URLSearchParams({ type: mediaType, tmdbId: String(tmdbId) })
        if (mediaType === 'tv') {
          params.set('season', String(season ?? 1))
          params.set('episode', String(episode ?? 1))
        }
        const data = await api.get<{ sources: EmbedSource[] }>(`/api/v1/stream/embed?${params.toString()}`)
        if (Array.isArray(data?.sources) && data.sources.length > 0) {
          resolved = data.sources
        }
      } catch {
        resolved = null
      }

      if (cancelled) return
      if (resolved) {
        setSources(resolved)
      } else {
        setSources([vidkingFallback({ tmdbId, mediaType, season, episode, color, autoPlay, nextEpisode, episodeSelector, progress })])
      }
    }

    loadSources()
    return () => { cancelled = true }
  }, [tmdbId, mediaType, season, episode, color, autoPlay, nextEpisode, episodeSelector, progress])

  // Failover: if the active source hasn't responded (loaded or played) within
  // the timeout, advance to the next candidate.
  useEffect(() => {
    if (!activeSource || isLoaded || exhausted) return
    const timer = setTimeout(() => {
      setActiveIdx((prev) => {
        if (sources && prev + 1 < sources.length) return prev + 1
        setExhausted(true)
        return prev
      })
    }, FAILOVER_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [activeSource, isLoaded, exhausted, sources])

  // Preconnect to the active source origin (plus Vidking, the likely primary)
  // so DNS + TLS never sit on the playback critical path.
  useEffect(() => {
    const origins = new Set<string>([VIDKING_ORIGIN])
    if (activeSource) {
      try {
        origins.add(new URL(activeSource.url).origin)
      } catch {
        /* ignore malformed source url */
      }
    }

    const nodes: HTMLLinkElement[] = []
    for (const origin of origins) {
      const preconnect = document.createElement('link')
      preconnect.rel = 'preconnect'
      preconnect.href = origin
      preconnect.crossOrigin = 'anonymous'
      document.head.appendChild(preconnect)
      nodes.push(preconnect)

      const dns = document.createElement('link')
      dns.rel = 'dns-prefetch'
      dns.href = origin
      document.head.appendChild(dns)
      nodes.push(dns)
    }
    return () => nodes.forEach((n) => n.remove())
  }, [activeSource])

  // Forward playback events (Vidking only) and use them as a liveness signal.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== VIDKING_ORIGIN) return

      let payload: any
      try {
        payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      } catch {
        return
      }

      if (!payload || payload.type !== 'PLAYER_EVENT' || !payload.data) return
      const data = payload.data
      if (!KNOWN_EVENTS.has(data.event)) return
      if (String(data.id) !== String(tmdbId)) return

      if (activeSourceRef.current?.id === 'vidking') {
        setLoadedId(activeSourceRef.current.id)
      }
      onEventRef.current?.(data as VidkingPlayerEvent)
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [tmdbId])

  const handleIframeLoad = useCallback(() => {
    if (activeSourceRef.current) setLoadedId(activeSourceRef.current.id)
  }, [])

  const handleRetry = useCallback(() => {
    setExhausted(false)
    setLoadedId(null)
    setActiveIdx(0)
  }, [])

  const iframeSrc = useMemo(() => {
    if (!activeSource) return ''
    if (activeSource.id === 'vidking') {
      return buildVidkingUrl({ tmdbId, mediaType, season, episode, color, autoPlay, nextEpisode, episodeSelector, progress })
    }
    return activeSource.url
  }, [activeSource, tmdbId, mediaType, season, episode, color, autoPlay, nextEpisode, episodeSelector, progress])

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-surface-container border border-outline-variant">
      {/* Placeholder sits behind the iframe so playback paints over it as soon
          as the embed loads — no black box while the source responds. */}
      {!exhausted && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-container">
          {placeholder && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={placeholder}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
          )}
          <div className="relative flex flex-col items-center gap-2 text-on-surface-variant">
            <Loader2 size={28} className="animate-spin text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-[0.1em]">
              {isSwitching ? 'Switching source…' : 'Loading player…'}
            </span>
          </div>
        </div>
      )}

      {exhausted && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface-container px-6 text-center">
          <TriangleAlert size={24} className="text-on-surface-variant" />
          <p className="text-[13px] text-on-surface-variant max-w-sm leading-relaxed">
            The player couldn&apos;t reach any available source. This title may not currently be available.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 bg-primary text-on-primary text-[12px] font-medium px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity"
          >
            <RotateCw size={13} strokeWidth={2} />
            Try again
          </button>
        </div>
      )}

      {activeSource && (
        <iframe
          key={activeSource.url}
          className="absolute inset-0 w-full h-full z-[1]"
          src={iframeSrc}
          title="Reelplay video player"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          onLoad={handleIframeLoad}
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  )
}
