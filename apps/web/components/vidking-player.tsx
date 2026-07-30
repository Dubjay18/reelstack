'use client'

import { useEffect, useMemo, useRef } from 'react'

const VIDKING_ORIGIN = 'https://www.vidking.net'
const KNOWN_EVENTS = new Set(['timeupdate', 'play', 'pause', 'ended', 'seeked'])

// Reelstack's "Amber Reel" brand color (tailwind.config.ts `primary`/`brand.DEFAULT`), used as
// the Vidking player's default accent so playback controls match the app's theme.
export const REELSTACK_BRAND_COLOR = 'eb9c3e'

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

interface VidkingPlayerProps {
  tmdbId: number
  mediaType: 'movie' | 'tv'
  season?: number
  episode?: number
  color?: string
  autoPlay?: boolean
  nextEpisode?: boolean
  episodeSelector?: boolean
  progress?: number
  onEvent?: (event: VidkingPlayerEvent) => void
}

export function VidkingPlayer({
  tmdbId,
  mediaType,
  season,
  episode,
  color = REELSTACK_BRAND_COLOR,
  autoPlay = false,
  nextEpisode = true,
  episodeSelector = false,
  progress,
  onEvent,
}: VidkingPlayerProps) {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const embedUrl = useMemo(() => {
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
  }, [tmdbId, mediaType, season, episode, color, autoPlay, nextEpisode, episodeSelector, progress])

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

      onEventRef.current?.(data as VidkingPlayerEvent)
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [tmdbId])

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-surface-container border border-outline-variant">
      <iframe
        className="absolute inset-0 w-full h-full"
        src={embedUrl}
        title="Reelplay video player"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  )
}
