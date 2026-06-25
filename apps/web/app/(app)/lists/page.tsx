'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useUserLists } from '@/lib/hooks/api'
import { useAuth } from '@/components/providers/auth-provider'
import type { List } from '@/types'

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
      className="group flex bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden hover:bg-surface-container transition-all duration-200 cursor-pointer shadow-card hover:shadow-elevated hover:border-outline-variant/80"
    >
      {/* Thumbnail Strip */}
      <div className="flex -space-x-[20%] w-[112px] flex-shrink-0 self-stretch items-center pl-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="relative w-[60px] aspect-[2/3] rounded-md overflow-hidden border border-surface-container-low shadow-md bg-surface-variant flex items-center justify-center flex-shrink-0"
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
  const { logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'all' | 'public' | 'private'>('all')
  const { data: rawLists, isLoading } = useUserLists()
  const lists = rawLists ?? []

  const filtered = lists?.filter(l => {
    if (activeTab === 'public') return l.is_public
    if (activeTab === 'private') return !l.is_public
    return true
  }) || []

  const totalFilms = lists?.reduce((a, b) => a + b.item_count, 0) ?? 0
  const totalWatched = lists?.reduce((a, b) => a + b.watched_count, 0) ?? 0

  return (
    <div className="bg-background text-on-background min-h-screen flex antialiased">
      {/* SideNavBar (Desktop) */}
      <nav className="hidden md:flex flex-col bg-surface-dim border-r border-outline-variant w-[240px] h-full fixed left-0 top-0 py-lg z-50">
        <div className="px-md mb-xl">
          <Link href="/dashboard">
            <h1 className="font-display-md text-display-md font-bold text-primary tracking-tight">Reelstack</h1>
            <p className="font-caption text-caption text-on-surface-variant mt-1">Cinephile Gallery</p>
          </Link>
        </div>
        <div className="flex-1 flex flex-col gap-xs px-sm">
          <Link
            className="flex items-center gap-sm text-on-surface-variant hover:text-on-surface px-md py-sm hover:bg-surface-container transition-colors rounded-r-lg border-l-[3px] border-transparent font-heading text-heading"
            href="/dashboard"
          >
            <span className="material-symbols-outlined">home</span>
            Home
          </Link>
          <Link
            className="flex items-center gap-sm text-on-surface-variant hover:text-on-surface px-md py-sm hover:bg-surface-container transition-colors rounded-r-lg border-l-[3px] border-transparent font-heading text-heading"
            href="/search"
          >
            <span className="material-symbols-outlined">search</span>
            Search
          </Link>
          <Link
            className="flex items-center gap-sm bg-surface-container-high text-primary border-l-[3px] border-primary px-md py-sm rounded-r-lg opacity-80 font-heading text-heading"
            href="/lists"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>format_list_bulleted</span>
            My Lists
          </Link>
          <Link
            className="flex items-center gap-sm text-on-surface-variant hover:text-on-surface px-md py-sm hover:bg-surface-container transition-colors rounded-r-lg border-l-[3px] border-transparent font-heading text-heading"
            href="/profile"
          >
            <span className="material-symbols-outlined">person</span>
            Profile
          </Link>
        </div>
        <div className="mt-auto px-sm flex flex-col gap-sm">
          <button className="w-full text-left flex items-center gap-sm text-on-surface-variant hover:text-on-surface px-md py-sm hover:bg-surface-container transition-colors rounded-lg font-heading text-heading">
            <span className="material-symbols-outlined">settings</span>
            Settings
          </button>
          <button 
            onClick={logout}
            className="w-full text-left flex items-center gap-sm text-on-surface-variant hover:text-error-container hover:bg-error-container/10 px-md py-sm transition-colors rounded-lg font-heading text-heading"
          >
            <span className="material-symbols-outlined">logout</span>
            Log out
          </button>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 w-full md:ml-[240px] pb-20 md:pb-0">
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
              {filtered.map(list => (
                <ListCard key={list.id} list={list} />
              ))}
            </div>
          )}

        </div>
      </main>

      {/* BottomNavBar (Mobile) */}
      <nav className="md:hidden fixed bottom-0 w-full h-16 z-50 bg-surface-container-low/95 backdrop-blur-lg flex justify-around items-center px-sm pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.4)]">
        <Link className="flex flex-col items-center justify-center text-on-surface-variant hover:text-on-surface transition-all duration-200 ease-in-out active:scale-95 w-16 h-full" href="/dashboard">
          <span className="material-symbols-outlined mb-1">home</span>
          <span className="font-caption text-[10px]">Home</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-on-surface-variant hover:text-on-surface transition-all duration-200 ease-in-out active:scale-95 w-16 h-full" href="/search">
          <span className="material-symbols-outlined mb-1">search</span>
          <span className="font-caption text-[10px]">Search</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-primary transition-all duration-200 ease-in-out active:scale-95 w-16 h-full" href="/lists">
          <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>list</span>
          <span className="font-caption text-[10px] font-semibold">Lists</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-on-surface-variant hover:text-on-surface transition-all duration-200 ease-in-out active:scale-95 w-16 h-full" href="/profile">
          <span className="material-symbols-outlined mb-1">person</span>
          <span className="font-caption text-[10px]">Profile</span>
        </Link>
      </nav>
    </div>
  )
}
