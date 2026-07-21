import Link from 'next/link'
import Image from 'next/image'
import { Star } from 'lucide-react'
import type { RileyTopList } from '@/types'

const stripeStyle = {
  background: 'repeating-linear-gradient(135deg, #31261a 0px, #31261a 9px, #241c15 9px, #241c15 18px)',
}

export function TopTen({ list }: { list: RileyTopList }) {
  return (
    <ol className="space-y-2.5">
      {list.picks.map((pick, i) => (
        <li key={`${pick.media_type}-${pick.tmdb_id}`}>
          <Link
            href={`/movie/${pick.tmdb_id}?type=${pick.media_type}`}
            className="group flex items-center gap-4 bg-surface border border-outline-variant rounded-2xl p-3.5 hover:border-primary/40 transition-colors"
          >
            <span
              className={`font-bold text-[26px] w-9 text-center flex-shrink-0 ${i < 3 ? 'text-primary' : 'text-on-surface-variant/60'}`}
              style={{ letterSpacing: '-0.02em' }}
            >
              {i + 1}
            </span>

            <div
              className="w-[44px] h-[66px] rounded-lg relative overflow-hidden border border-outline-variant flex-shrink-0"
              style={pick.poster_path ? undefined : stripeStyle}
            >
              {pick.poster_path && (
                <Image
                  src={`https://image.tmdb.org/t/p/w92${pick.poster_path}`}
                  alt={pick.title}
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[14px] text-on-surface truncate group-hover:text-primary transition-colors">
                  {pick.title}
                </span>
                <span className="font-mono text-[11px] text-on-surface-variant flex-shrink-0">{pick.year}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-on-surface-variant bg-surface-container rounded px-1.5 py-0.5 flex-shrink-0">
                  {pick.media_type === 'tv' ? 'Series' : 'Film'}
                </span>
              </div>
              {pick.blurb && (
                <p className="text-[12.5px] text-primary/90 italic truncate mt-1">&ldquo;{pick.blurb}&rdquo;</p>
              )}
            </div>

            {pick.vote_average > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Star size={12} className="text-primary" fill="currentColor" />
                <span className="font-mono text-[12px] text-on-surface">{pick.vote_average.toFixed(1)}</span>
              </div>
            )}
          </Link>
        </li>
      ))}
    </ol>
  )
}
