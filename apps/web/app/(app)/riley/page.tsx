'use client'

import { Sparkles } from 'lucide-react'
import { useRileyDigest, useRileyTop } from '@/lib/hooks/api'
import { MovieCard } from '@/components/movie-card'
import { DigestCard, DigestCardSkeleton } from '@/components/riley/digest-card'
import { TopTen } from '@/components/riley/top-ten'
import { ChatPanel } from '@/components/riley/chat-panel'
import type { RileyTopList } from '@/types'

function Rail({ title, list, loading }: { title: string; list: RileyTopList | null | undefined; loading: boolean }) {
  return (
    <section>
      <h2 className="font-mono text-[12px] uppercase tracking-[0.1em] text-on-surface-variant mb-4">{title}</h2>
      <div className="flex gap-3.5 overflow-x-auto hide-scrollbar pb-2">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[140px] h-[210px] flex-shrink-0 rounded-xl bg-surface-container border border-outline-variant animate-pulse" />
          ))
        ) : list && list.picks.length > 0 ? (
          list.picks.map((pick) => (
            <MovieCard
              key={`${pick.media_type}-${pick.tmdb_id}`}
              id={pick.tmdb_id}
              title={pick.title}
              posterPath={pick.poster_path}
              rating={pick.vote_average}
              type={pick.media_type}
            />
          ))
        ) : (
          <p className="text-on-surface-variant text-[14px] py-4">Nothing here yet.</p>
        )}
      </div>
    </section>
  )
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diffMs / (60 * 60 * 1000))
  if (hours < 1) return 'just now'
  if (hours === 1) return '1 hour ago'
  if (hours < 24) return `${hours} hours ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

export default function Page() {
  const { data: digest, isLoading: digestLoading, error: digestError } = useRileyDigest()
  const { data: top, isLoading: topLoading } = useRileyTop()

  const digestMissing = !digestLoading && (digestError != null || !digest)
  const nothingGenerated =
    digestMissing && !topLoading && !top?.top_movies && !top?.top_series && !top?.top_ten

  return (
    <div className="bg-background text-on-surface min-h-screen selection:bg-primary/30 selection:text-primary">
      <main className="w-full pt-16 md:pt-0 pb-16 md:pb-0 min-h-screen">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-10 pb-20">

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <Sparkles size={19} className="text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-[30px] text-on-surface leading-tight" style={{ letterSpacing: '-0.02em' }}>
                Riley
              </h1>
              <p className="text-on-surface-variant text-[13px]">
                Your film-obsessed friend, reporting what&apos;s big right now
                {digest?.generated_at ? ` · updated ${relativeTime(digest.generated_at)}` : ''}
              </p>
            </div>
          </div>

          {nothingGenerated ? (
            <div className="mt-16 flex flex-col items-center gap-3 text-center">
              <Sparkles size={28} className="text-primary/50" />
              <p className="font-semibold text-[17px] text-on-surface">Riley hasn&apos;t filed a report yet</p>
              <p className="text-on-surface-variant text-[14px]">Check back soon — the first digest is on its way.</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_360px] gap-8 mt-8 items-start">
              {/* Left column: digest + rails + top 10 */}
              <div className="space-y-10 min-w-0">
                <section>
                  <h2 className="font-mono text-[12px] uppercase tracking-[0.1em] text-on-surface-variant mb-4">
                    The Big Stories
                  </h2>
                  {digestLoading ? (
                    <div className="grid md:grid-cols-2 gap-3.5">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <DigestCardSkeleton key={i} />
                      ))}
                    </div>
                  ) : digest && digest.stories.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-3.5">
                      {digest.stories.map((story) => (
                        <DigestCard key={story.url} story={story} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-on-surface-variant text-[14px]">No news digest yet.</p>
                  )}
                </section>

                <Rail title="Top Movies Right Now" list={top?.top_movies} loading={topLoading} />
                <Rail title="Top Series Right Now" list={top?.top_series} loading={topLoading} />

                <section>
                  <h2 className="font-mono text-[12px] uppercase tracking-[0.1em] text-on-surface-variant mb-4">
                    Riley&apos;s Top 10
                  </h2>
                  {topLoading ? (
                    <div className="space-y-2.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-[92px] rounded-2xl bg-surface-container border border-outline-variant animate-pulse" />
                      ))}
                    </div>
                  ) : top?.top_ten && top.top_ten.picks.length > 0 ? (
                    <TopTen list={top.top_ten} />
                  ) : (
                    <p className="text-on-surface-variant text-[14px]">No top 10 yet.</p>
                  )}
                </section>
              </div>

              {/* Right column: chat (sticky on desktop) */}
              <div className="lg:sticky lg:top-10">
                <ChatPanel />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
