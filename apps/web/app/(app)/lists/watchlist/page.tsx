'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useWatchlist, useListItems } from '@/lib/hooks/api'
import { useAuth } from '@/components/providers/auth-provider'
import { NotificationBell } from '@/components/notification-bell'

export default function WatchlistPage() {
  const { user } = useAuth()
  const { data: watchlistData, isLoading: watchlistLoading } = useWatchlist()
  const watchlist = watchlistData
  const { data: items, isLoading: itemsLoading } = useListItems(watchlist?.id ?? '')
  const isLoading = watchlistLoading || itemsLoading
  const watchlistItems = items ?? []

  return (
    <div className="bg-background text-on-background min-h-screen">
      <header className="md:hidden fixed top-0 w-full z-40 bg-background/80 backdrop-blur-md flex justify-between items-center px-lg h-16">
        <h1 className="font-display-md text-display-md font-bold text-primary tracking-tight">Reelstack</h1>
        <div className="flex items-center gap-sm">
          {user ? <NotificationBell /> : (
            <>
              <Link href="/login" className="text-on-surface-variant font-body-sm text-body-sm flex items-center">Log in</Link>
              <Link href="/register" className="text-primary font-body-sm text-body-sm font-semibold flex items-center">Sign up</Link>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 w-full md:ml-[--sidebar-width] pt-16 md:pt-0 pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-lg md:px-xl py-lg md:py-xl">
          <div className="flex items-start justify-between mb-xl">
            <div>
              <h1 className="font-display-md text-display-md text-on-surface mb-xs">Watchlist</h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {watchlistItems.length} {watchlistItems.length === 1 ? 'film' : 'films'} saved
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-gutter">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-xl bg-surface-container border border-outline-variant/30 animate-pulse" />
              ))}
            </div>
          ) : watchlistItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-outline-variant/30 rounded-2xl bg-surface-container/20">
              <span className="material-symbols-outlined text-[56px] text-on-surface-variant/30 mb-md">bookmark</span>
              <h3 className="font-heading text-heading text-on-surface mb-xs">Your watchlist is empty</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs mb-md">
                Add movies and shows to keep track of what you want to watch.
              </p>
              <Link
                href="/search"
                className="bg-primary text-on-primary px-md py-sm rounded-md font-body-sm text-body-sm font-semibold flex items-center gap-xs hover:bg-primary-fixed transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">search</span>
                Browse films
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-gutter">
              {watchlistItems.map((item) => (
                <div key={item.id} className="group relative">
                  <Link
                    href={`/movie/${item.tmdb_id}?type=${item.media_type}`}
                    className="relative aspect-[2/3] rounded-xl overflow-hidden bg-surface-container border border-outline-variant/30 shadow-card hover:border-outline-variant hover:shadow-elevated transition-all duration-300 cursor-pointer block"
                  >
                    {item.content?.poster_path ? (
                      <Image
                        className="w-full h-full object-cover"
                        alt={(item.content as any)?.title || 'Poster'}
                        src={`https://image.tmdb.org/t/p/w300${item.content.poster_path}`}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-surface-variant">
                        <span className="material-symbols-outlined text-on-surface-variant text-[32px]">movie</span>
                      </div>
                    )}
                    {item.watched && (
                      <div className="absolute top-2 left-2 bg-emerald-600/90 px-1.5 py-0.5 rounded-md">
                        <span className="font-mono text-[10px] text-white flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[10px]">check</span>
                          Watched
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-sm z-10">
                      <h3 className="font-body-sm text-body-sm font-semibold text-white leading-tight line-clamp-2">
                        {(item.content as any)?.title || (item.content as any)?.name || `TMDB #${item.tmdb_id}`}
                      </h3>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
