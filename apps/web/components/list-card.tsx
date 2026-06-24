import Link from 'next/link'
import { List } from '../types'

interface ListCardProps {
  list: List
  username: string
}

export function ListCard({ list, username }: ListCardProps) {
  // Generate consistent premium gradients based on list ID / title
  const getGradientClass = (index: number) => {
    const hash = (list.id.charCodeAt(0) + list.title.charCodeAt(index % list.title.length)) % 5
    const gradients = [
      'from-teal-900/60 to-zinc-900 border-teal-500/20',
      'from-rose-950/60 to-zinc-900 border-rose-500/20',
      'from-amber-950/60 to-zinc-900 border-amber-500/20',
      'from-violet-950/60 to-zinc-900 border-violet-500/20',
      'from-emerald-950/60 to-zinc-900 border-emerald-500/20',
    ]
    return gradients[hash] || gradients[0]
  }

  return (
    <Link href={`/${username}/${list.slug}`}>
      <div className="bg-surface-container-low rounded-xl border border-outline-variant/50 p-md flex flex-col hover:border-primary-container/30 transition-colors cursor-pointer group h-full justify-between">
        <div>
          <div className="flex h-[120px] mb-md relative">
            {/* Poster Stack 1 (Foreground) */}
            <div className={`w-[80px] h-full rounded-md shadow-lg z-30 transform group-hover:-translate-y-1 transition-transform border bg-gradient-to-t ${getGradientClass(1)} flex items-center justify-center p-2 text-center`}>
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest leading-tight line-clamp-3">
                {list.title.split(' ')[0] || 'REEL'}
              </span>
            </div>

            {/* Poster Stack 2 (Midground) */}
            <div className={`w-[80px] h-full rounded-md shadow-lg z-20 -ml-[40px] opacity-90 transform group-hover:-translate-y-1 group-hover:translate-x-2 transition-transform delay-75 border bg-gradient-to-t ${getGradientClass(2)} flex items-center justify-center p-2 text-center`}>
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest leading-tight">
                •••
              </span>
            </div>

            {/* Poster Stack 3 (Background) */}
            <div className={`w-[80px] h-full rounded-md shadow-lg z-10 -ml-[40px] opacity-80 transform group-hover:-translate-y-1 group-hover:translate-x-4 transition-transform delay-150 border bg-gradient-to-t ${getGradientClass(3)} flex items-center justify-center p-2 text-center`}>
              <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest leading-tight">
                ★
              </span>
            </div>
            
            {/* Action add icon indicator overlay */}
            <div className="w-[80px] h-full bg-surface-container border border-outline-variant/30 rounded-md shadow-lg z-0 -ml-[40px] flex items-center justify-center transform group-hover:-translate-y-1 group-hover:translate-x-6 transition-transform delay-200">
              <span className="material-symbols-outlined text-on-surface-variant font-light">add</span>
            </div>
          </div>

          <h3 className="font-heading text-heading text-on-surface line-clamp-1 mb-xs group-hover:text-primary-container transition-colors">
            {list.title}
          </h3>
        </div>
        <p className="font-mono text-mono text-on-surface-variant/70 mt-2">
          {list.item_count} films · Curated by @{username}
        </p>
      </div>
    </Link>
  )
}
