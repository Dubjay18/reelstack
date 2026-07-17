import Link from 'next/link'
import Image from 'next/image'
import { Star } from 'lucide-react'

interface MovieCardProps {
  id: string | number
  title: string
  posterPath?: string | null
  rating?: number | null
  type?: string
}

// Diagonal-stripe placeholder for missing posters — matches design doc pattern
const stripeStyle = {
  background: 'repeating-linear-gradient(135deg, #31261a 0px, #31261a 9px, #241c15 9px, #241c15 18px)',
}

export function MovieCard({ id, title, posterPath, rating, type = 'movie' }: MovieCardProps) {
  return (
    <Link href={`/movie/${id}?type=${type}`} className="w-[140px] flex-shrink-0 group cursor-pointer">
      <div
        className="w-[140px] h-[210px] rounded-xl relative overflow-hidden border border-outline-variant group-hover:border-primary/40 transition-colors"
        style={posterPath ? undefined : stripeStyle}
      >
        {posterPath && (
          <Image
            src={`https://image.tmdb.org/t/p/w300${posterPath}`}
            alt={title}
            fill
            sizes="140px"
            className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        )}

        {!posterPath && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-[9px] text-on-surface-variant uppercase tracking-[0.1em]">POSTER</span>
          </div>
        )}

        {/* Rating chip */}
        {rating != null && rating > 0 && (
          <div className="absolute top-2 right-2 bg-black/60 rounded-md px-1.5 py-0.5 flex items-center gap-0.5">
            <Star size={10} className="text-primary" fill="currentColor" />
            <span className="font-mono text-[10px] text-on-surface">{rating.toFixed(1)}</span>
          </div>
        )}

        {/* Bottom gradient for poster legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      <div className="mt-2 font-semibold text-[13px] text-on-surface line-clamp-2 group-hover:text-primary transition-colors leading-snug">
        {title}
      </div>
    </Link>
  )
}
