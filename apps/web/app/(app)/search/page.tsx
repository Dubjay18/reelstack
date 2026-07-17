'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchContent, useSearchPeople, useSearchCurators, useTrendingContent } from '@/lib/hooks/api'
import { ScoreBadge } from '@/components/score-badge'
import { Search, X, ChevronDown, ChevronRight, User, Users, ExternalLink, Film, Star, UserRound } from 'lucide-react'

interface FilmResult {
  id: string
  title: string
  year: string
  genre: string
  rating: string
  poster: string
  director: string
  media_type?: 'movie' | 'tv'
}

const TABS = ['All', 'Movie', 'TV Show', 'People', 'Curators']
const SORT_OPTIONS = ['Relevance', 'Rating (High)', 'Year (Newest)', 'Year (Oldest)']

export default function SearchPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('All')
  const [activeSort, setActiveSort] = useState('Relevance')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const isPeopleTab = activeTab === 'People'
  const isCuratorsTab = activeTab === 'Curators'

  const { data: apiResults, isLoading: apiLoading } = useSearchContent(debouncedQuery)
  const { data: peopleResults, isLoading: peopleLoading } = useSearchPeople(isPeopleTab ? debouncedQuery : '')
  const { data: curatorResults, isLoading: curatorLoading } = useSearchCurators(isCuratorsTab ? debouncedQuery : '')
  const { data: trendingResults, isLoading: trendingLoading } = useTrendingContent()

  const isSearching = (isPeopleTab ? peopleLoading : isCuratorsTab ? curatorLoading : apiLoading) && !!query.trim()

  // Focus the search input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Build the results list to display
  const results: FilmResult[] = (() => {
    if (!query.trim()) {
      // No search query — show trending
      const raw = trendingResults ?? []
      let mapped: FilmResult[] = raw.map(r => ({
        id: String(r.id),
        title: r.title,
        year: r.year || '',
        genre: r.media_type === 'tv' ? 'TV Show' : 'Movie',
        rating: r.vote_average ? String(r.vote_average.toFixed(1)) : '0.0',
        poster: r.poster_path
          ? `https://image.tmdb.org/t/p/w300${r.poster_path}`
          : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=300&h=450',
        director: '',
        media_type: r.media_type,
      }))
      if (activeTab === 'Movie') mapped = mapped.filter(f => f.genre === 'Movie')
      else if (activeTab === 'TV Show') mapped = mapped.filter(f => f.genre === 'TV Show')
      if (activeSort === 'Rating (High)') mapped = [...mapped].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
      else if (activeSort === 'Year (Newest)') mapped = [...mapped].sort((a, b) => parseInt(b.year) - parseInt(a.year))
      else if (activeSort === 'Year (Oldest)') mapped = [...mapped].sort((a, b) => parseInt(a.year) - parseInt(b.year))
      return mapped
    }

    if (isPeopleTab) return []

    // Query typed — show search results
    const raw = apiResults ?? []
    let mapped: FilmResult[] = raw.map(r => ({
      id: String(r.id),
      title: r.title,
      year: r.year || '',
      genre: r.media_type === 'tv' ? 'TV Show' : 'Movie',
      rating: r.vote_average ? String(r.vote_average.toFixed(1)) : '0.0',
      poster: r.poster_path
        ? `https://image.tmdb.org/t/p/w300${r.poster_path}`
        : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=300&h=450',
      director: '',
      media_type: r.media_type,
    }))
    if (activeTab === 'Movie') mapped = mapped.filter(f => f.genre === 'Movie')
    else if (activeTab === 'TV Show') mapped = mapped.filter(f => f.genre === 'TV Show')
    if (activeSort === 'Rating (High)') mapped = [...mapped].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
    else if (activeSort === 'Year (Newest)') mapped = [...mapped].sort((a, b) => parseInt(b.year) - parseInt(a.year))
    else if (activeSort === 'Year (Oldest)') mapped = [...mapped].sort((a, b) => parseInt(a.year) - parseInt(b.year))
    return mapped
  })()

  const isLoadingResults = query.trim() === '' ? trendingLoading : isSearching

  return (
    <div className="bg-background text-on-background min-h-screen">


      {/* Main */}
      <main className="flex-1 w-full pb-16 md:pb-0">
        <div className="max-w-5xl mx-auto px-lg md:px-xl py-lg md:py-xl">
          
          {/* Page Header */}
          <div className="mb-xl">
            <h1 className="font-display-md text-display-md text-on-surface mb-xs">Search</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Discover films, directors, and genres</p>
          </div>

          {/* Search Input */}
          <div className="relative mb-lg">
            <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isCuratorsTab
                  ? "Search curators by username..."
                  : isPeopleTab
                    ? "Search actors, directors..."
                    : "Search any film, director, or genre..."
              }
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-4 pl-12 pr-16 font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-14 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <X size={20} />
              </button>
            )}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 gap-1 hidden md:flex">
              <kbd className="font-mono text-[10px] bg-surface-variant text-on-surface-variant px-1.5 py-0.5 rounded border border-outline-variant/50">⌘</kbd>
              <kbd className="font-mono text-[10px] bg-surface-variant text-on-surface-variant px-1.5 py-0.5 rounded border border-outline-variant/50">K</kbd>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex items-center justify-between gap-md mb-lg flex-wrap">
            {/* Tab Pills */}
            <div className="flex gap-xs flex-wrap">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-sm py-1 rounded-full font-caption text-caption transition-all border ${
                    activeTab === tab
                      ? 'bg-primary text-on-primary border-primary shadow-[0_0_10px_rgba(79,219,200,0.2)]'
                      : 'bg-transparent text-on-surface-variant border-outline-variant hover:border-primary/50 hover:text-on-surface'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Sort Select — hidden when searching people or curators */}
            {!isPeopleTab && !isCuratorsTab && (
              <div className="relative">
                <select
                  value={activeSort}
                  onChange={(e) => setActiveSort(e.target.value)}
                  className="appearance-none bg-surface-container border border-outline-variant text-on-surface-variant font-caption text-caption rounded-lg px-sm py-1.5 pr-8 focus:outline-none focus:border-primary cursor-pointer"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
              </div>
            )}
          </div>

          {/* Section Label */}
          <div className="mb-sm flex items-center justify-between">
            <h2 className="font-caption text-caption text-on-surface-variant tracking-[0.1em] uppercase">
              {isLoadingResults
                ? 'Loading...'
                : isCuratorsTab && query.trim()
                  ? `${curatorResults?.length ?? 0} curator${(curatorResults?.length ?? 0) !== 1 ? 's' : ''} for "${query}"`
                  : isPeopleTab && query.trim()
                    ? `${peopleResults?.length ?? 0} person${(peopleResults?.length ?? 0) !== 1 ? 's' : ''} for "${query}"`
                    : query.trim() === ''
                      ? 'Trending'
                      : `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`}
            </h2>
          </div>

          {/* Loading skeletons */}
          {isLoadingResults ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-gutter">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-xl bg-surface-container border border-outline-variant/30 animate-pulse" />
              ))}
            </div>
          ) : isCuratorsTab && query.trim() ? (
            curatorResults && curatorResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-gutter">
                {curatorResults.map((curator) => (
                  <Link
                    key={curator.id}
                    href={`/${curator.username}`}
                    className="group flex items-center gap-md p-md rounded-xl bg-surface-container border border-outline-variant/30 shadow-card hover:border-primary/50 hover:shadow-elevated transition-all duration-300"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-variant flex-shrink-0">
                      {curator.avatar_url ? (
                        <img
                          src={curator.avatar_url}
                          alt={curator.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                          <User size={28} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-sm">
                        <h3 className="font-body-md text-body-md font-semibold text-on-surface group-hover:text-primary transition-colors truncate">
                          {curator.username}
                        </h3>
                        {curator.score !== undefined && curator.score !== null && (
                          <ScoreBadge score={curator.score} rank={curator.rank} size="sm" showLabel={false} />
                        )}
                      </div>
                      {curator.bio && (
                        <p className="font-body-sm text-body-sm text-on-surface-variant/70 line-clamp-2 mt-0.5">
                          {curator.bio}
                        </p>
                      )}
                      <p className="font-mono text-[11px] text-on-surface-variant/60 uppercase tracking-wide mt-1">
                        {curator.followers_count} follower{curator.followers_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <ChevronRight size={20} className="text-on-surface-variant/40 group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Users size={56} className="text-on-surface-variant/30 mx-auto mb-md" strokeWidth={1.25} />
                <h3 className="font-heading text-heading text-on-surface mb-xs">No curators found</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
                  Try a different username.
                </p>
              </div>
            )
          ) : isPeopleTab && query.trim() ? (
            peopleResults && peopleResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-gutter">
                {peopleResults.map((person) => (
                  <a
                    key={person.id}
                    href={`https://www.themoviedb.org/person/${person.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-md p-md rounded-xl bg-surface-container border border-outline-variant/30 shadow-card hover:border-primary/50 hover:shadow-elevated transition-all duration-300"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-variant flex-shrink-0">
                      {person.profile_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                          alt={person.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                          <User size={28} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-body-md text-body-md font-semibold text-on-surface group-hover:text-primary transition-colors truncate">
                        {person.name}
                      </h3>
                      <p className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wide">
                        {person.known_for_department}
                      </p>
                      {person.known_for.length > 0 && (
                        <p className="font-body-sm text-body-sm text-on-surface-variant/70 truncate mt-0.5">
                          Known for: {person.known_for.map(kf => kf.title).join(', ')}
                        </p>
                      )}
                    </div>
                    <ExternalLink size={20} className="text-on-surface-variant/40 group-hover:text-primary transition-colors" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <UserRound size={56} className="text-on-surface-variant/30 mx-auto mb-md" strokeWidth={1.25} />
                <h3 className="font-heading text-heading text-on-surface mb-xs">No people found</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
                  Try a different search term.
                </p>
              </div>
            )
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Film size={56} className="text-on-surface-variant/30 mx-auto mb-md" strokeWidth={1.25} />
              <h3 className="font-heading text-heading text-on-surface mb-xs">No films found</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
                Try a different search term or explore a different genre.
              </p>
              <button
                onClick={() => { setQuery(''); setActiveTab('All') }}
                className="mt-md text-primary font-semibold font-body-sm text-body-sm hover:text-primary-fixed transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-gutter">
              {results.map((film) => (
                <Link
                  key={film.id}
                  href={`/movie/${film.id}?type=${film.media_type ?? 'movie'}`}
                  className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-surface-container border border-outline-variant/30 shadow-card hover:border-outline-variant hover:shadow-elevated transition-all duration-300 cursor-pointer"
                >
                  <img
                    src={film.poster}
                    alt={film.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  {/* Rating badge */}
                  <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded-md">
                    <span className="font-mono text-[10px] text-primary flex items-center gap-0.5">
                      <Star size={10} className="text-primary" fill="currentColor" />
                      {film.rating}
                    </span>
                  </div>
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-sm z-10">
                    <h3 className="font-body-sm text-body-sm font-semibold text-white leading-tight line-clamp-2 mb-0.5 group-hover:text-primary transition-colors">
                      {film.title}
                    </h3>
                    <p className="font-mono text-[10px] text-white/60 uppercase tracking-wide">
                      {film.year} · {film.genre}
                    </p>
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>
              ))}
            </div>
          )}

        </div>
      </main>


    </div>
  )
}
