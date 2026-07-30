'use client'

import { ChevronDown } from 'lucide-react'

interface EpisodeSelectorProps {
  currentSeason: number
  currentEpisode: number
  seasonCount?: number
  onChange: (season: number, episode: number) => void
}

const EPISODE_OPTIONS = Array.from({ length: 30 }, (_, i) => i + 1)

export function EpisodeSelector({ currentSeason, currentEpisode, seasonCount, onChange }: EpisodeSelectorProps) {
  const seasonOptions = Array.from({ length: Math.max(seasonCount ?? currentSeason, currentSeason) }, (_, i) => i + 1)

  return (
    <div className="bg-surface border border-outline-variant rounded-xl p-4 flex flex-wrap items-center gap-4">
      <label className="flex items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-on-surface-variant">Season</span>
        <div className="relative">
          <select
            value={currentSeason}
            onChange={(e) => onChange(parseInt(e.target.value), currentEpisode)}
            className="appearance-none bg-surface-container border border-outline-variant rounded-lg pl-3 pr-8 py-1.5 text-[13px] text-on-surface"
          >
            {seasonOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
        </div>
      </label>

      <label className="flex items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-on-surface-variant">Episode</span>
        <div className="relative">
          <select
            value={currentEpisode}
            onChange={(e) => onChange(currentSeason, parseInt(e.target.value))}
            className="appearance-none bg-surface-container border border-outline-variant rounded-lg pl-3 pr-8 py-1.5 text-[13px] text-on-surface"
          >
            {EPISODE_OPTIONS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
        </div>
      </label>
    </div>
  )
}
