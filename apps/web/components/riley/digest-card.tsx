import { ExternalLink } from 'lucide-react'
import type { RileyStory } from '@/types'

export function DigestCard({ story }: { story: RileyStory }) {
  return (
    <a
      href={story.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-surface border border-outline-variant rounded-2xl p-5 hover:border-primary/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-semibold text-[15px] text-on-surface leading-snug group-hover:text-primary transition-colors">
          {story.headline}
        </h3>
        <ExternalLink size={14} className="text-on-surface-variant flex-shrink-0 mt-1 group-hover:text-primary transition-colors" />
      </div>
      <p className="text-[13px] text-on-surface-variant leading-relaxed line-clamp-2 mb-3">
        {story.summary}
      </p>
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-primary/80 bg-primary/10 rounded-md px-2 py-1">
        {story.source}
      </span>
    </a>
  )
}

export function DigestCardSkeleton() {
  return (
    <div className="bg-surface border border-outline-variant rounded-2xl p-5 animate-pulse">
      <div className="h-4 bg-surface-container rounded w-3/4 mb-3" />
      <div className="h-3 bg-surface-container rounded w-full mb-2" />
      <div className="h-3 bg-surface-container rounded w-2/3 mb-4" />
      <div className="h-5 bg-surface-container rounded w-16" />
    </div>
  )
}
