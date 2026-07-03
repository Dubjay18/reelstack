'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useContentDetails, useStreamingAvailability, useUserLists, useWatchlist, useAddToWatchlist } from '@/lib/hooks/api'
import { api } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { CommentSection } from '@/components/comments'

const SIMILAR_FILMS_FALLBACK = [
  {
    title: 'The Architect',
    rating: '8.1',
    year: '2022',
    genre: 'Sci-Fi',
    poster: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=200&h=300'
  },
  {
    title: 'Liquid Memory',
    rating: '7.9',
    year: '2023',
    genre: 'Thriller',
    poster: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=200&h=300'
  },
  {
    title: 'Star-Bound',
    rating: '8.5',
    year: '2024',
    genre: 'Epic',
    poster: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=200&h=300'
  }
]

export default function Page() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string
  const tmdbId = parseInt(id)
  const queryClient = useQueryClient()

  const mediaType = searchParams.get('type') === 'tv' ? 'tv' : 'movie'

  const [scrolled, setScrolled] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [showListSelector, setShowListSelector] = useState(false)
  const [addingToListId, setAddingToListId] = useState<string | null>(null)
  const [inWatchlist, setInWatchlist] = useState(false)

  // Query Details & Streaming
  const { data: movie, isLoading: movieLoading } = useContentDetails(mediaType, tmdbId)
  const { data: rawStreamingProviders, isLoading: streamingLoading } = useStreamingAvailability(mediaType, tmdbId)
  const streamingProviders = rawStreamingProviders ?? []
  const { data: rawLists } = useUserLists()
  const lists = rawLists ?? []
  const { data: watchlistData } = useWatchlist()
  const watchlistMutation = useAddToWatchlist()

  // Check if this movie is already in the watchlist
  useEffect(() => {
    if (watchlistData?.items) {
      setInWatchlist(watchlistData.items.some(i => i.tmdb_id === tmdbId && i.media_type === mediaType))
    }
  }, [watchlistData, tmdbId, mediaType])

  // Scroll listener for TopNavBar elevation
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Toast effect
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  const showToast = (msg: string) => {
    setToastMessage(msg)
  }

  const handleShare = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      showToast('Link copied to clipboard!')
    }
  }

  const handleAddToWatchlist = () => {
    watchlistMutation.mutate({ tmdb_id: tmdbId, media_type: mediaType }, {
      onSuccess: () => {
        setInWatchlist(true)
        showToast('Added to Watchlist')
      },
      onError: (err) => {
        showToast(err.message || 'Failed to add to watchlist')
      },
    })
  }

  const handleAddToList = (listId: string, listTitle: string) => {
    setAddingToListId(listId)
    api.post(`/api/v1/lists/${listId}/items`, {
      tmdb_id: tmdbId,
      media_type: mediaType,
      watched: false,
    }).then(() => {
      showToast(`Saved to "${listTitle}"`)
      setShowListSelector(false)
      queryClient.invalidateQueries({ queryKey: ['lists'] })
      queryClient.invalidateQueries({ queryKey: ['list-items', listId] })
    }).catch((err) => {
      showToast(err.message || 'Failed to add film to list')
    }).finally(() => {
      setAddingToListId(null)
    })
  }

  if (movieLoading) {
    return (
      <div className="text-on-surface min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined text-[36px] text-primary animate-spin">progress_activity</span>
      </div>
    )
  }

  if (!movie) {
    return (
      <div className="text-on-surface min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-md">Movie Not Found</h1>
          <Link href="/dashboard" className="text-primary hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  // Resolve metadata fields
  const isMovie = 'release_date' in movie
  const title = isMovie ? movie.title : (movie as any).name
  const releaseDate = isMovie ? movie.release_date : (movie as any).first_air_date
  const releaseYear = releaseDate ? releaseDate.substring(0, 4) : 'Unknown'
  const durationStr = isMovie && movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : 'N/A'
  
  const backdropUrl = movie.backdrop_path 
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` 
    : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=1280&h=720'

  const posterUrl = movie.poster_path 
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
    : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=500&h=750'

  return (
    <div className="text-zinc-100 min-h-screen font-sans selection:bg-primary/30 selection:text-primary overflow-x-hidden pb-16 lg:pb-0">
      <main className="min-h-screen relative">
        {/* Hero Section with Background Poster */}
        <div className="relative w-full min-h-[50dvh] lg:min-h-[80dvh]">
          {/* Hero Background (Poster) */}
          <div className="absolute inset-0 z-0">
            <div 
              className="w-full h-full bg-cover bg-center" 
              style={{ backgroundImage: `url('${backdropUrl}')` }}
            />
            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#131315] via-[#131315]/80 to-transparent lg:hidden" />
            <div className="absolute inset-0 hidden lg:block bg-gradient-to-r from-transparent via-[#131315]/90 to-[#131315] poster-gradient-desktop" />
          </div>

          {/* Content Overlay */}
          <div className="relative z-10 max-w-[1120px] mx-auto px-lg h-full flex flex-col justify-end pb-xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl items-end">
              {/* Left: Poster Card */}
              <div className="hidden lg:block lg:col-span-4 xl:col-span-3">
                <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-card border border-zinc-800 transform -rotate-1 hover:rotate-0 transition-transform duration-500">
                  <img className="w-full h-full object-cover" src={posterUrl} alt={title} />
                </div>
              </div>
              {/* Right: Metadata */}
              <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-sm">
                <div className="flex flex-wrap items-center gap-md mb-2">
                  <span className="font-meta-mono text-meta-mono px-2 py-1 bg-zinc-800 rounded text-primary uppercase text-xs font-mono">
                    Feature Film
                  </span>
                  <span className="font-meta-mono text-meta-mono text-zinc-400 font-mono text-xs">
                    {durationStr}
                  </span>
                </div>
                <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-zinc-50 mb-2 font-bold leading-tight">
                  {title}
                </h1>
                <div className="flex flex-wrap items-center gap-md font-body-md text-zinc-400 mb-6">
                  <span className="font-bold text-zinc-50">{releaseYear}</span>
                  <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                      star
                    </span>{' '}
                    {movie.vote_average ? movie.vote_average.toFixed(1) : '0.0'}/10
                  </span>
                </div>
                <div className="flex flex-wrap gap-md relative">
                  {/* Watchlist Button */}
                  <button
                    onClick={handleAddToWatchlist}
                    disabled={watchlistMutation.isPending || inWatchlist}
                    className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-[0.98] shadow-lg disabled:opacity-85 ${
                      inWatchlist
                        ? 'bg-emerald-600 text-white border border-emerald-500'
                        : 'bg-primary text-background hover:bg-primary-fixed'
                    }`}
                  >
                    {watchlistMutation.isPending ? (
                      <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined">{inWatchlist ? 'check' : 'bookmark_add'}</span>
                    )}
                    {watchlistMutation.isPending ? 'Adding...' : inWatchlist ? 'In Watchlist' : 'Watchlist'}
                  </button>
                  <button 
                    onClick={() => setShowListSelector(!showListSelector)}
                    disabled={addingToListId !== null}
                    className="px-8 py-3 rounded-xl font-bold bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-100 flex items-center gap-2 transition-all disabled:opacity-85"
                  >
                    {addingToListId !== null ? (
                      <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined">add</span>
                    )}
                    {addingToListId !== null ? 'Saving...' : 'Save to List'}
                  </button>
                  <button 
                    onClick={handleShare}
                    className="bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-100 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
                  >
                    <span className="material-symbols-outlined">share</span>
                    Share Film
                  </button>

                  {/* Dropdown List Selector */}
                  {showListSelector && (
                    <div className="absolute top-[52px] left-0 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl w-64 p-2 z-[9999] animate-in fade-in slide-in-from-top-2 duration-200">
                      <h4 className="font-mono text-[10px] text-zinc-500 uppercase px-3 py-1 tracking-wider border-b border-zinc-800/50 mb-1">
                        Select a list
                      </h4>
                      {lists.length === 0 ? (
                        <div className="px-3 py-2 text-zinc-500 text-xs italic">
                          No lists found. Please <Link href="/lists/new" className="text-primary hover:underline">create one</Link> first.
                        </div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto space-y-0.5">
                          {lists.map(list => (
                            <button
                              key={list.id}
                              onClick={() => handleAddToList(list.id, list.title)}
                              disabled={addingToListId !== null}
                              className="w-full text-left px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-primary rounded-lg text-sm transition-colors truncate flex items-center justify-between disabled:opacity-50 disabled:hover:bg-transparent"
                            >
                              <span>{list.title}</span>
                              {addingToListId === list.id && (
                                <span className="material-symbols-outlined text-[14px] animate-spin text-primary">progress_activity</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid Content */}
        <div className="max-w-[1120px] mx-auto px-lg py-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
            {/* Main Content */}
            <div className="lg:col-span-8 flex flex-col gap-xl">
              {/* Availability */}
              <section className="bg-zinc-900 p-lg rounded-xl border border-zinc-800 shadow-sm">
                <h3 className="font-section-title text-section-title mb-md flex items-center gap-2 text-zinc-100 font-semibold mb-sm">
                  <span className="material-symbols-outlined text-primary">play_circle</span>
                  Where to Watch
                </h3>
                {streamingLoading ? (
                  <p className="text-zinc-500 text-sm animate-pulse">Loading streaming options…</p>
                ) : streamingProviders.length === 0 ? (
                  <p className="text-zinc-500 text-sm">No streaming options available right now in your region.</p>
                ) : (
                  <div className="flex flex-wrap gap-sm">
                    {streamingProviders.map((provider) => (
                      <a 
                        key={provider.provider_id}
                        href={provider.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 hover:border-primary px-3 py-2 rounded-full transition-all"
                      >
                        <span className="text-body-md font-medium text-zinc-200">{provider.provider_name}</span>
                        <span className="text-[10px] bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded font-mono uppercase">{provider.type}</span>
                      </a>
                    ))}
                  </div>
                )}
              </section>

              {/* Plot & Cast */}
              <section>
                <h3 className="font-section-title text-section-title mb-md text-zinc-100 font-semibold mb-sm">The Premise</h3>
                <p className="text-body-md text-zinc-400 leading-relaxed text-sm">
                  {movie.overview || 'No overview available for this film.'}
                </p>
              </section>

              {/* Genres */}
              <section>
                <h3 className="font-section-title text-section-title mb-md text-zinc-100 font-semibold mb-sm">Genres</h3>
                <div className="flex flex-wrap gap-xs">
                  {movie.genres ? movie.genres.map((g, idx) => (
                    <span key={idx} className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-xs font-medium">
                      {g}
                    </span>
                  )) : (
                    <span className="text-zinc-500 text-sm italic">No genres registered.</span>
                  )}
                </div>
              </section>

              {/* Comments */}
              <CommentSection tmdbId={tmdbId} mediaType={mediaType} />
            </div>

            {/* Sidebar Metadata */}
            <aside className="lg:col-span-4 flex flex-col gap-lg">
              <div className="bg-zinc-900 p-lg rounded-xl border border-zinc-800 shadow-sm">
                <h4 className="font-meta-mono text-meta-mono text-zinc-500 mb-4 uppercase text-xs font-mono tracking-wider">
                  Vital Statistics
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2 text-sm">
                    <span className="text-zinc-400 font-medium">Release Date</span>
                    <span className="font-mono text-zinc-300">{releaseDate || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2 text-sm">
                    <span className="text-zinc-400 font-medium">Vote Average</span>
                    <span className="font-mono text-zinc-300">{movie.vote_average ? `${movie.vote_average.toFixed(1)} / 10` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 text-sm">
                    <span className="text-zinc-400 font-medium">Popularity Score</span>
                    <span className="font-mono text-zinc-300">{(movie as any).popularity ? (movie as any).popularity.toFixed(0) : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-lg right-lg bg-zinc-900 border border-zinc-800 text-zinc-100 px-md py-sm rounded-xl shadow-modal z-50 flex items-center gap-xs animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="material-symbols-outlined text-primary text-[20px]">info</span>
          <span className="font-body-sm text-body-sm">{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
