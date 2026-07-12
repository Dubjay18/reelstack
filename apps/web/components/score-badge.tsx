'use client'

import { cn } from '@/lib/utils'

interface ScoreBadgeProps {
  score: number
  rank?: number | null
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function getScoreTier(score: number) {
  if (score >= 800) return { label: 'Master Curator', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: 'workspace_premium' }
  if (score >= 600) return { label: 'Expert Curator', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: 'emoji_events' }
  if (score >= 400) return { label: 'Curator', color: 'bg-primary/20 text-primary border-primary/30', icon: 'star' }
  if (score >= 200) return { label: 'Rising Curator', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30', icon: 'trending_up' }
  return { label: 'Newcomer', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', icon: 'person' }
}

export function ScoreBadge({ score, rank, showLabel = true, size = 'sm', className }: ScoreBadgeProps) {
  if (!score && score !== 0) return null

  const tier = getScoreTier(score)
  const isCompact = size === 'sm'
  const isLarge = size === 'lg'

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-mono',
        tier.color,
        isCompact ? 'px-xs py-[2px] text-[10px]' : isLarge ? 'px-md py-xs text-sm' : 'px-sm py-[3px] text-xs',
        className
      )}
    >
      <span className="material-symbols-outlined" style={{ fontSize: isCompact ? '12px' : isLarge ? '18px' : '14px' }}>
        {tier.icon}
      </span>
      <span className="font-semibold">{score}</span>
      {showLabel && !isCompact && <span className="opacity-70">{tier.label}</span>}
      {rank && rank <= 10 && (
        <span className={cn(
          'ml-0.5 rounded-full px-1 py-[1px] text-[9px] font-bold',
          rank === 1 ? 'bg-amber-500/30 text-amber-300' :
          rank <= 3 ? 'bg-zinc-400/20 text-zinc-300' :
          'bg-zinc-500/10 text-zinc-400'
        )}>
          #{rank}
        </span>
      )}
    </div>
  )
}
