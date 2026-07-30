export type MediaType = 'movie' | 'tv'

interface WatchProgressEntry {
  currentTime: number
  duration: number
  updatedAt: number
}

const STORAGE_KEY = 'rs_watch_progress'
const MAX_ENTRIES = 200
const STALE_MS = 1000 * 60 * 60 * 24 * 60 // 60 days
const COMPLETE_THRESHOLD = 0.95

function keyFor(tmdbId: number, mediaType: MediaType, season?: number, episode?: number): string {
  return mediaType === 'tv' ? `tv:${tmdbId}:${season}:${episode}` : `movie:${tmdbId}`
}

function readStore(): Record<string, WatchProgressEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: Record<string, WatchProgressEntry>) {
  try {
    const entries = Object.entries(store)
    const trimmed = entries.length > MAX_ENTRIES
      ? entries.sort((a, b) => b[1].updatedAt - a[1].updatedAt).slice(0, MAX_ENTRIES)
      : entries
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(trimmed)))
  } catch {
    // localStorage unavailable (e.g. Safari private mode) — no-op
  }
}

export function getProgress(tmdbId: number, mediaType: MediaType, season?: number, episode?: number): number | null {
  const store = readStore()
  const entry = store[keyFor(tmdbId, mediaType, season, episode)]
  if (!entry) return null
  if (Date.now() - entry.updatedAt > STALE_MS) return null
  if (!Number.isFinite(entry.currentTime) || entry.currentTime <= 0) return null
  return Math.floor(entry.currentTime)
}

export function setProgress(
  tmdbId: number,
  mediaType: MediaType,
  season: number | undefined,
  episode: number | undefined,
  currentTime: number,
  duration: number
) {
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) return
  const key = keyFor(tmdbId, mediaType, season, episode)
  const store = readStore()

  if (currentTime / duration > COMPLETE_THRESHOLD) {
    delete store[key]
  } else {
    store[key] = { currentTime, duration, updatedAt: Date.now() }
  }
  writeStore(store)
}

export function clearProgress(tmdbId: number, mediaType: MediaType, season?: number, episode?: number) {
  const store = readStore()
  delete store[keyFor(tmdbId, mediaType, season, episode)]
  writeStore(store)
}
