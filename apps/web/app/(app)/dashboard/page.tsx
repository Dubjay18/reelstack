'use client'

import Link from 'next/link'
import { useUserLists, useTrendingContent, usePublicProfile } from '@/lib/hooks/api'
import { useAuth } from '@/components/providers/auth-provider'
import { NotificationBell } from '@/components/notification-bell'
import { ListCard } from '@/components/list-card'
import { MovieCard } from '@/components/movie-card'
import { ScoreBadge } from '@/components/score-badge'
import { Trophy, Search, Film } from 'lucide-react'
import type { User } from '@/types'

export default function Page() {
  const { user: authUser } = useAuth()
  const user = authUser as (User | null)
  const { data: rawLists, isLoading } = useUserLists()
  const lists = rawLists ?? []
  const { data: rawTrendingMovies, isLoading: trendingLoading } = useTrendingContent()
  const trendingMovies = rawTrendingMovies ?? []
  const { data: profile } = usePublicProfile(user?.username ?? '')

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="bg-background text-on-surface flex h-screen overflow-hidden selection:bg-primary/30 selection:text-primary">

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 w-full z-40 bg-background/80 backdrop-blur-md flex justify-between items-center px-lg h-16">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[6px] bg-primary flex items-center justify-center">
            <span className="text-on-primary font-bold text-[13px] leading-none">R</span>
          </div>
          <h1 className="font-bold text-[16px] text-on-surface" style={{ letterSpacing: '-0.02em' }}>Reelstack</h1>
        </div>
        <div className="flex items-center gap-sm">
          {user ? (
            <NotificationBell />
          ) : (
            <>
              <Link href="/login" className="text-on-surface-variant font-body-sm text-body-sm flex items-center">Log in</Link>
              <Link href="/register" className="text-primary font-body-sm text-body-sm font-semibold flex items-center">Sign up</Link>
            </>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 w-full pt-16 md:pt-0 pb-16 md:pb-0 h-screen overflow-y-auto">
        <div className="max-w-[980px] mx-auto px-10 py-10 pb-20 space-y-10">

          {/* Header row */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="font-bold text-[30px] text-on-surface mb-1" style={{ letterSpacing: '-0.02em' }}>
                {greeting}{user?.username ? `, ${user.username}` : ''}
              </h1>
              <p className="text-on-surface-variant text-[14px]">Here&apos;s what&apos;s moving in your stack.</p>
            </div>
            <Link
              href="/profile"
              className="flex items-center gap-2 bg-surface border border-outline-variant rounded-full px-3.5 py-2 hover:bg-surface-container transition-colors"
            >
              <Trophy size={16} className="text-primary" strokeWidth={2} />
              {profile?.score != null && (
                <span className="font-mono text-[12px] text-on-surface font-semibold">{profile.score}</span>
              )}
            </Link>
          </div>

          {/* Stat row */}
          {user && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              {[
                { value: profile?.item_count ?? '—', label: 'Films logged' },
                { value: lists.length || '—', label: 'Lists curated' },
                { value: profile?.score ?? '—', label: 'Curator score' },
                { value: profile?.rank ? `#${profile.rank}` : '—', label: 'Global rank' },
              ].map((s) => (
                <div key={s.label} className="bg-surface border border-outline-variant rounded-2xl px-[18px] py-5">
                  <div className="font-bold text-[32px] text-primary" style={{ letterSpacing: '-0.02em' }}>{s.value}</div>
                  <div className="text-[12px] text-on-surface-variant mt-1.5">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Trending rail */}
          <section>
            <h2 className="font-mono text-[12px] uppercase tracking-[0.1em] text-on-surface-variant mb-4">Trending</h2>
            <div className="flex gap-3.5 overflow-x-auto hide-scrollbar pb-2">
              {trendingLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="w-[140px] h-[210px] flex-shrink-0 rounded-xl bg-surface-container border border-outline-variant animate-pulse" />
                ))
              ) : trendingMovies.length > 0 ? (
                trendingMovies.slice(0, 10).map((movie) => (
                  <MovieCard
                    key={movie.id}
                    id={movie.id}
                    title={movie.title}
                    posterPath={movie.poster_path}
                    rating={movie.vote_average}
                    type="movie"
                  />
                ))
              ) : (
                <p className="text-on-surface-variant text-[14px] py-4">No trending movies right now.</p>
              )}
            </div>
          </section>

          {/* Your lists grid */}
          <section>
            <div className="flex justify-between items-baseline mb-4">
              <h2 className="font-semibold text-[18px] text-on-surface" style={{ letterSpacing: '-0.01em' }}>Your lists</h2>
              <Link className="text-[13px] text-primary hover:opacity-80 transition-opacity" href="/lists">See all</Link>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-[104px] bg-surface-container border border-outline-variant rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : lists.length === 0 ? (
              <div className="bg-surface border border-outline-variant rounded-2xl p-6 text-center space-y-4">
                <Film size={32} className="text-on-surface-variant mx-auto" strokeWidth={1.5} />
                <p className="text-on-surface-variant text-[14px]">You haven&apos;t created any lists yet.</p>
                <Link
                  href="/lists/new"
                  className="inline-block py-2 px-5 bg-primary text-on-primary text-[14px] font-semibold rounded-full hover:opacity-90 transition-opacity"
                >
                  Create my first list
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {lists.slice(0, 4).map((list) => (
                  <ListCard key={list.id} list={list} username={user?.username ?? ''} />
                ))}
              </div>
            )}
          </section>

          {/* Search bar shortcut */}
          <section className="pb-6 md:pb-0">
            <Link href="/search" className="block relative group">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-hover:text-primary transition-colors" strokeWidth={1.75} />
              <div className="w-full bg-surface border border-outline-variant rounded-xl py-4 pl-11 pr-4 text-[15px] text-on-surface-variant/60 cursor-text group-hover:border-primary group-hover:shadow-[0_0_10px_rgba(235,156,62,0.1)] transition-all">
                Search any film or show…
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 gap-1 hidden md:flex">
                <kbd className="font-mono text-[10px] bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded border border-outline-variant/50">⌘</kbd>
                <kbd className="font-mono text-[10px] bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded border border-outline-variant/50">K</kbd>
              </div>
            </Link>
          </section>

        </div>
      </main>
    </div>
  )
}
