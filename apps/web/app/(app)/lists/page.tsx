'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useUserLists } from '@/lib/hooks/api'
import { useAuth } from '@/components/providers/auth-provider'
import type { List } from '@/types'
import { NotificationBell } from '@/components/notification-bell'

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100)
  return (
    <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
      <div
        className="h-full bg-secondary rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function ListCard({ list }: { list: List }) {
  const dateStr = list.created_at ? new Date(list.created_at).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  }) : ''

  return (
    <Link
      href={`/lists/${list.id}`}
      className="group flex bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden hover:bg-surface-container hover:border-outline-variant/80 transition-all duration-200 cursor-pointer shadow-card hover:shadow-elevated"
    >
      {/* Thumbnail Strip */}
      <div className="flex -space-x-[20%] w-[112px] flex-shrink-0 self-stretch items-center pl-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="relative w-[60px] aspect-[2/3] rounded-md overflow-hidden border shadow-md flex items-center justify-center flex-shrink-0 bg-surface-variant border-surface-container-low"
            style={{ zIndex: 30 - i * 10, opacity: 1 - i * 0.3, transform: `scale(${1 - i * 0.05})` }}
          >
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">movie</span>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-col justify-center flex-1 p-md gap-xs min-w-0">
        <div className="flex items-start justify-between gap-sm">
          <h3 className="font-heading text-heading text-on-surface group-hover:text-primary transition-colors line-clamp-1">
            {list.title}
          </h3>
          {list.is_public ? (
            <span className="flex-shrink-0 font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
              Public
            </span>
          ) : (
            <span className="flex-shrink-0 font-mono text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-wider">
              Private
            </span>
          )}
        </div>
        <div className="flex items-center gap-sm">
          <span className="font-mono text-mono text-on-surface-variant bg-surface-variant/50 px-2 py-0.5 rounded-sm">
            {list.item_count} films
          </span>
        </div>
        <ProgressBar value={list.watched_count} total={list.item_count} />
        <p className="font-mono text-[10px] text-on-surface-variant/60">
          {list.watched_count}/{list.item_count} watched · {dateStr}
        </p>
      </div>

      {/* Arrow */}
      <div className="flex items-center pr-md opacity-0 group-hover:opacity-100 transition-opacity text-primary">
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </div>
    </Link>
  )
}

export default function ListsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'all' | 'public' | 'private'>('all')
  const { data: rawLists, isLoading } = useUserLists()
  const lists = rawLists ?? []

  const filtered = lists?.filter(l => {
    if (activeTab === 'public') return l.is_public
    if (activeTab === 'private') return !l.is_public
    return true
  }) || []

  const sorted = [...filtered].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const totalFilms = lists?.reduce((a, b) => a + b.item_count, 0) ?? 0
  const totalWatched = lists?.reduce((a, b) => a + b.watched_count, 0) ?? 0

  return (
    <div className="bg-background text-on-background min-h-screen">

  <header className="md:hidden fixed top-0 w-full z-40 bg-background/80 backdrop-blur-md flex justify-between items-center px-lg h-16">
        <h1 className="font-display-md text-display-md font-bold text-primary tracking-tight">Reelstack</h1>
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
      <main className="flex-1 w-full pt-16 md:pt-0 pb-20 md:pb-0">
        <div className="max-w-3xl mx-auto px-lg md:px-xl py-lg md:py-xl">

          {/* Page Header */}
          <div className="flex items-start justify-between mb-xl">
            <div>
              <h1 className="font-display-md text-display-md text-on-surface mb-xs">My Lists</h1>
              <div className="flex items-center gap-md font-mono text-mono text-on-surface-variant">
                <span>{lists?.length ?? 0} lists</span>
                <span className="w-[3px] h-[3px] rounded-full bg-outline-variant" />
                <span>{totalFilms} films</span>
                <span className="w-[3px] h-[3px] rounded-full bg-outline-variant" />
                <span className="text-secondary">{totalWatched} watched</span>
              </div>
            </div>
            <Link
              href="/lists/new"
              className="bg-primary text-on-primary px-md py-sm rounded-md font-body-sm text-body-sm font-semibold flex items-center gap-xs hover:bg-primary-fixed transition-colors shadow-[0_0_15px_rgba(79,219,200,0.1)] flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New list
            </Link>
          </div>

          {/* Tab Filter */}
          <div className="flex gap-xs border-b border-outline-variant mb-xl">
            {(['all', 'public', 'private'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-md py-sm font-body-sm text-body-sm capitalize border-b-2 -mb-px transition-all ${
                  activeTab === tab
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab === 'all' ? 'All Lists' : tab === 'public' ? 'Public' : 'Private'}
              </button>
            ))}
          </div>

          {/* List Cards */}
          {isLoading ? (
            <div className="flex flex-col gap-md">
              <div className="h-28 bg-surface-container-low border border-outline-variant/30 rounded-xl animate-pulse" />
              <div className="h-28 bg-surface-container-low border border-outline-variant/30 rounded-xl animate-pulse" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-outline-variant/30 rounded-2xl bg-surface-container/20">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-md">playlist_add</span>
              <h3 className="font-heading text-heading text-on-surface mb-xs">No lists here</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-md max-w-xs">
                {activeTab === 'private' ? "You don't have any private lists." : "Create your first list to get started."}
              </p>
              <Link
                href="/lists/new"
                className="text-primary font-semibold font-body-sm text-body-sm hover:text-primary-fixed transition-colors inline-flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Create a list
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-md">
              {sorted.map(list => (
                <ListCard key={list.id} list={list} />
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
