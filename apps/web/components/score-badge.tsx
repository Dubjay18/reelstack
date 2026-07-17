'use client'

import { cn } from '@/lib/utils'
import { Crown, Trophy, Star, TrendingUp, User } from 'lucide-react'

interface ScoreBadgeProps {
  score: number
  rank?: number | null
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Tier colors aligned with the design doc's leaderboard tier mapping
function getScoreTier(score: number) {
  if (score >= 800) return {
    label: 'Master Curator',
    color: 'bg-[#d4af37]/15 text-[#d4af37] border-[#d4af37]/30',
    Icon: Crown,
  }
  if (score >= 600) return {
    label: 'Expert Curator',
    color: 'bg-[#d9552b]/15 text-[#d9552b] border-[#d9552b]/30',
    Icon: Trophy,
  }
  if (score >= 400) return {
    label: 'Curator',
    color: 'bg-primary/15 text-primary border-primary/30',
    Icon: Star,
  }
  if (score >= 200) return {
    label: 'Rising Curator',
    color: 'bg-[#6b8cae]/15 text-[#6b8cae] border-[#6b8cae]/30',
    Icon: TrendingUp,
  }
  return {
    label: 'Newcomer',
    color: 'bg-on-surface-variant/10 text-on-surface-variant border-on-surface-variant/20',
    Icon: User,
  }
}

export function ScoreBadge({ score, rank, showLabel = true, size = 'sm', className }: ScoreBadgeProps) {
  if (!score && score !== 0) return null

  const tier = getScoreTier(score)
  const { Icon } = tier
  const isCompact = size === 'sm'
  const isLarge = size === 'lg'
  const iconSize = isCompact ? 12 : isLarge ? 18 : 14

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-mono',
        tier.color,
        isCompact ? 'px-xs py-[2px] text-[10px]' : isLarge ? 'px-md py-xs text-sm' : 'px-sm py-[3px] text-xs',
        className
      )}
    >
      <Icon size={iconSize} strokeWidth={2} />
      <span className="font-semibold">{score}</span>
      {showLabel && !isCompact && <span className="opacity-70">{tier.label}</span>}
      {rank && rank <= 10 && (
        <span className={cn(
          'ml-0.5 rounded-full px-1 py-[1px] text-[9px] font-bold',
          rank === 1 ? 'bg-[#d4af37]/30 text-[#d4af37]' :
          rank <= 3 ? 'bg-[#d9552b]/20 text-[#d9552b]' :
          'bg-on-surface-variant/10 text-on-surface-variant'
        )}>
          #{rank}
        </span>
      )}
    </div>
  )
}
