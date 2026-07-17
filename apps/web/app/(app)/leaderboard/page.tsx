'use client'

import Link from 'next/link'
import { useLeaderboard } from '@/lib/hooks/api'
import { ScoreBadge } from '@/components/score-badge'
import { Trophy, Crown, Star, AlertCircle, ChevronRight } from 'lucide-react'

function getScoreBarWidth(score: number): string {
  return `${Math.min(100, (score / 1000) * 100)}%`
}

function getRankStyle(rank: number) {
  if (rank === 1) return 'bg-[#d4af37]/10 border-[#d4af37]/30 text-[#d4af37]'
  if (rank === 2) return 'bg-on-surface-variant/10 border-on-surface-variant/25 text-on-surface-variant'
  if (rank === 3) return 'bg-[#d9552b]/10 border-[#d9552b]/25 text-[#d9552b]'
  return 'bg-surface border-outline-variant text-on-surface-variant'
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown size={16} className="text-[#d4af37]" fill="currentColor" />
  if (rank === 2) return <Trophy size={16} className="text-on-surface-variant" strokeWidth={2} />
  if (rank === 3) return <Star size={16} className="text-[#d9552b]" fill="currentColor" />
  return <span className="font-mono text-[12px]">{rank}</span>
}

export default function LeaderboardPage() {
  const { data, isLoading, error } = useLeaderboard(50, 0)
  const curators = data?.curators ?? []
  const computedAt = data?.computed_at

  if (isLoading) {
    return (
      <div className="bg-background text-on-surface min-h-screen">
        <main className="max-w-3xl mx-auto px-lg py-xl">
          <div className="flex items-center gap-md mb-xl">
            <Trophy size={28} className="text-primary" strokeWidth={1.75} />
            <h1 className="font-display-md text-display-md text-on-surface">Leaderboard</h1>
          </div>
          <div className="space-y-md">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-surface-container animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-background text-on-surface min-h-screen">
        <main className="max-w-3xl mx-auto px-lg py-xl">
          <div className="flex items-center gap-md mb-xl">
            <Trophy size={28} className="text-primary" strokeWidth={1.75} />
            <h1 className="font-display-md text-display-md text-on-surface">Leaderboard</h1>
          </div>
          <div className="text-center py-xl border border-dashed border-outline-variant/30 rounded-2xl bg-surface-container/20">
            <AlertCircle size={48} className="text-on-surface-variant/30 mx-auto mb-md" strokeWidth={1.5} />
            <p className="font-body-sm text-body-sm text-on-surface-variant">Failed to load leaderboard. Please try again later.</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-background text-on-surface min-h-screen">
      <main className="max-w-3xl mx-auto px-lg py-xl">
        {/* Header */}
        <div className="flex flex-col gap-sm mb-xl">
          <div className="flex items-center gap-md">
            <Trophy size={28} className="text-primary" strokeWidth={1.75} />
            <h1 className="font-display-md text-display-md text-on-surface">Leaderboard</h1>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Top curators ranked by their reputation score. Scores are updated every 6 hours.
          </p>
          {computedAt && (
            <p className="font-mono text-[10px] text-on-surface-variant/60">
              Last updated: {new Date(computedAt).toLocaleString()}
            </p>
          )}
        </div>

        {/* Leaderboard */}
        {curators.length === 0 ? (
          <div className="text-center py-xl border border-dashed border-outline-variant/30 rounded-2xl bg-surface-container/20">
            <Trophy size={48} className="text-on-surface-variant/30 mx-auto mb-md" strokeWidth={1.25} />
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-sm">
              No curators on the leaderboard yet.
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant/60">
              Create public lists and gain followers to earn a score!
            </p>
          </div>
        ) : (
          <div className="space-y-sm">
            {curators.map((entry, index) => {
              const avatarUrl = entry.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.username}`
              const rankDisplay = entry.rank || index + 1
              const isTop3 = rankDisplay <= 3

              return (
                <Link
                  key={entry.user_id}
                  href={`/${entry.username}`}
                  className={`group flex items-center gap-md p-md rounded-xl border transition-all hover:scale-[1.005] ${getRankStyle(rankDisplay)}`}
                >
                  {/* Rank icon/number */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-black/20">
                    <RankIcon rank={rankDisplay} />
                  </div>

                  {/* Avatar */}
                  <img
                    className="w-10 h-10 rounded-full object-cover border border-outline-variant/30 flex-shrink-0"
                    src={avatarUrl}
                    alt={entry.username}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-sm">
                      <h3 className="font-heading text-heading text-on-surface group-hover:text-primary transition-colors truncate">
                        {entry.username}
                      </h3>
                      {isTop3 && (
                        <ScoreBadge score={entry.score} size="sm" showLabel={false} />
                      )}
                    </div>
                    <div className="flex items-center gap-sm font-mono text-[10px] text-on-surface-variant/70">
                      <span>{entry.followers_count} followers</span>
                      <span className="w-[3px] h-[3px] rounded-full bg-outline-variant/50" />
                      <span>{entry.list_count} lists</span>
                      <span className="w-[3px] h-[3px] rounded-full bg-outline-variant/50" />
                      <span>{entry.watched_count} watched</span>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div className="hidden sm:flex flex-col items-end gap-1 min-w-[100px]">
                    <span className="font-mono text-sm text-on-surface font-semibold">{entry.score}</span>
                    <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded-full transition-all duration-500"
                        style={{ width: getScoreBarWidth(entry.score) }}
                      />
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight size={18} className="text-on-surface-variant opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
