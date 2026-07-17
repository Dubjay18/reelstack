import Link from 'next/link'
import { Plus } from 'lucide-react'
import { List } from '../types'

interface ListCardProps {
  list: List
  username: string
}

// Diagonal-stripe placeholder matching the design doc's surfaceHi/surface pattern
const posterStripe = {
  background: 'repeating-linear-gradient(135deg, #31261a 0px, #31261a 7px, #241c15 7px, #241c15 14px)',
}

export function ListCard({ list, username }: ListCardProps) {
  return (
    <Link href={`/${username}/${list.slug}`}>
      <div className="bg-surface border border-outline-variant rounded-2xl p-md flex gap-md hover:border-primary/30 transition-colors cursor-pointer group h-full items-center">
        {/* Fanned poster stack */}
        <div className="flex flex-shrink-0">
          <div className="w-[52px] h-[76px] rounded-md border border-outline-variant z-[3] group-hover:-translate-y-1 transition-transform" style={posterStripe} />
          <div className="w-[52px] h-[76px] rounded-md border border-outline-variant -ml-[26px] opacity-85 z-[2] group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform delay-75" style={posterStripe} />
          <div className="w-[52px] h-[76px] rounded-md border border-outline-variant -ml-[26px] opacity-65 z-[1] group-hover:-translate-y-1 group-hover:translate-x-2 transition-transform delay-150" style={posterStripe} />
          <div className="w-[52px] h-[76px] bg-surface-container border border-outline-variant/30 rounded-md -ml-[26px] flex items-center justify-center group-hover:-translate-y-1 group-hover:translate-x-3 transition-transform delay-200 z-0">
            <Plus size={16} className="text-on-surface-variant" strokeWidth={1.5} />
          </div>
        </div>

        <div className="flex flex-col justify-center min-w-0">
          <h3 className="font-semibold text-[15px] text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
            {list.title}
          </h3>
          <div
            className="font-mono text-[11px] text-primary mt-1.5 inline-block px-2 py-0.5 rounded-[5px]"
            style={{ background: 'color-mix(in srgb, #eb9c3e 14%, transparent)' }}
          >
            {list.item_count} items
          </div>
        </div>
      </div>
    </Link>
  )
}
