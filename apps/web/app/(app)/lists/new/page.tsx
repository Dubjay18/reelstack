'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCreateList, useSearchContent, useTrendingContent } from '@/lib/hooks/api'
import { api } from '@/lib/api'
import type { SearchResult } from '@/types'
import { ArrowLeft, AlertCircle, Globe, Lock, CheckCircle2, Search, X, Film, Loader2, Plus } from 'lucide-react'

const PRIVACY_OPTIONS = [
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone can view this list',
    icon: 'public',
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can see this list',
    icon: 'lock',
  },
]

interface FilmOption {
  id: number
  title: string
  year: string
  poster: string | null
  media_type: 'movie' | 'tv'
}

function toFilmOption(r: SearchResult): FilmOption {
  return {
    id: r.id,
    title: r.title,
    year: r.year || '',
    poster: r.poster_path ? `https://image.tmdb.org/t/p/w300${r.poster_path}` : null,
    media_type: r.media_type,
  }
}

export default function NewListPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public')
  const [selectedFilms, setSelectedFilms] = useState<FilmOption[]>([])
  const [filmSearch, setFilmSearch] = useState('')
  const [debouncedFilmSearch, setDebouncedFilmSearch] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const createListMutation = useCreateList()

  // Debounce film search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilmSearch(filmSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [filmSearch])

  const { data: searchResults, isLoading: searchLoading } = useSearchContent(debouncedFilmSearch)
  const { data: trendingResults, isLoading: trendingLoading } = useTrendingContent()

  // Films to display: real search results or trending as suggestions
  const displayFilms: FilmOption[] = debouncedFilmSearch.trim()
    ? (searchResults ?? []).map(toFilmOption)
    : (trendingResults ?? []).slice(0, 12).map(toFilmOption)

  const isLoadingFilms = debouncedFilmSearch.trim() ? searchLoading : trendingLoading

  const isSelected = (id: number) => selectedFilms.some(f => f.id === id)

  const toggleFilm = (film: FilmOption) => {
    setSelectedFilms(prev =>
      prev.some(f => f.id === film.id)
        ? prev.filter(f => f.id !== film.id)
        : [...prev, film]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Please give your list a title.')
      return
    }
    setError('')
    setIsSubmitting(true)

    createListMutation.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        is_public: privacy === 'public',
      },
      {
        onSuccess: async (newList) => {
          try {
            if (selectedFilms.length > 0) {
              const promises = selectedFilms.map(film =>
                api.post(`/api/v1/lists/${newList.id}/items`, {
                  tmdb_id: film.id,
                  media_type: film.media_type,
                  watched: false,
                })
              )
              await Promise.all(promises)
            }
            router.push(`/lists/${newList.id}`)
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'List created, but failed to add some initial films.'
            setError(message)
            router.push(`/lists/${newList.id}`)
          } finally {
            setIsSubmitting(false)
          }
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to create list. Please try again.'
          setError(message)
          setIsSubmitting(false)
        }
      }
    )
  }

  return (
    <div className="bg-background text-on-background min-h-screen overflow-x-hidden">
      <main className="flex-1 w-full">
        <div className="max-w-2xl mx-auto px-lg md:px-xl py-lg md:py-xl">
          
          {/* Breadcrumb */}
          <Link href="/lists" className="inline-flex items-center gap-xs text-on-surface-variant hover:text-primary transition-colors font-body-sm text-body-sm mb-lg">
            <ArrowLeft size={18} strokeWidth={1.75} />
            Back to My Lists
          </Link>

          {/* Header */}
          <h1 className="font-display-md text-display-md text-on-surface mb-xl">Create a new list</h1>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-xl">

            {/* Title */}
            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-[0.1em] mb-sm">
                List Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setError('') }}
                placeholder="e.g. Late Night Arthouse"
                className={`w-full bg-surface-container-low border rounded-xl py-sm px-md font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary transition-all ${error ? 'border-error' : 'border-outline-variant focus:border-primary'}`}
                maxLength={80}
                autoFocus
              />
              {error && (
                <p className="mt-xs text-error font-body-sm text-body-sm flex items-center gap-xs">
                  <AlertCircle size={14} strokeWidth={1.75} />
                  {error}
                </p>
              )}
              <p className="mt-xs font-mono text-mono text-on-surface-variant/50 text-right">{title.length}/80</p>
            </div>

            {/* Description */}
            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-[0.1em] mb-sm">
                Description <span className="normal-case text-on-surface-variant/50">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this list about?"
                rows={3}
                maxLength={280}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-sm px-md font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none"
              />
              <p className="mt-xs font-mono text-mono text-on-surface-variant/50 text-right">{description.length}/280</p>
            </div>

            {/* Privacy */}
            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-[0.1em] mb-sm">
                Privacy
              </label>
              <div className="grid grid-cols-2 gap-sm">
                {PRIVACY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPrivacy(opt.value as 'public' | 'private')}
                    className={`flex items-center gap-sm p-md rounded-xl border transition-all ${
                      privacy === opt.value
                        ? 'border-primary bg-primary/5 text-primary shadow-[0_0_12px_rgba(79,219,200,0.1)]'
                        : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-outline-variant/80 hover:text-on-surface'
                    }`}
                  >
                    {opt.value === 'public' ? <Globe size={20} strokeWidth={1.75} /> : <Lock size={20} strokeWidth={1.75} />}
                    <div className="text-left">
                      <div className="font-body-sm text-body-sm font-semibold">{opt.label}</div>
                      <div className="font-mono text-[11px] opacity-70">{opt.description}</div>
                    </div>
                    {privacy === opt.value && (
                      <CheckCircle2 size={18} className="ml-auto" strokeWidth={2} fill="currentColor" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Films */}
            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-[0.1em] mb-sm">
                Add Films <span className="normal-case text-on-surface-variant/50">(optional, can add later)</span>
              </label>
              
              {/* Film search */}
              <div className="relative mb-sm">
                <Search size={18} className="absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  value={filmSearch}
                  onChange={(e) => setFilmSearch(e.target.value)}
                  placeholder="Search films..."
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-sm pl-xl pr-md font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
                {filmSearch && (
                  <button
                    type="button"
                    onClick={() => setFilmSearch('')}
                    className="absolute right-md top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    <X size={18} strokeWidth={1.75} />
                  </button>
                )}
              </div>

              {/* Section label */}
              <p className="font-caption text-[11px] text-on-surface-variant/60 mb-md uppercase tracking-wider">
                {debouncedFilmSearch.trim() ? 'Search results' : 'Trending now'}
              </p>

              {/* Film Grid */}
              {isLoadingFilms ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-sm">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-[2/3] rounded-lg bg-surface-container border border-outline-variant/30 animate-pulse" />
                  ))}
                </div>
              ) : displayFilms.length === 0 ? (
                <p className="text-on-surface-variant font-body-sm text-body-sm py-md text-center">
                  {debouncedFilmSearch.trim() ? 'No results found.' : 'No trending films available.'}
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-sm">
                  {displayFilms.map(film => {
                    const selected = isSelected(film.id)
                    return (
                      <button
                        key={film.id}
                        type="button"
                        onClick={() => toggleFilm(film)}
                        className={`group relative aspect-[2/3] rounded-lg overflow-hidden border transition-all ${
                          selected ? 'border-primary shadow-[0_0_10px_rgba(79,219,200,0.25)]' : 'border-outline-variant/30 hover:border-outline-variant'
                        }`}
                      >
                        {film.poster ? (
                          <img src={film.poster} alt={film.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-surface-variant">
                            <Film size={24} className="text-on-surface-variant" strokeWidth={1.75} />
                          </div>
                        )}
                        <div className={`absolute inset-0 transition-opacity ${selected ? 'bg-primary/20' : 'bg-black/0 group-hover:bg-black/20'}`} />
                        {selected && (
                          <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle2 size={12} className="text-on-primary" strokeWidth={2.5} />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-xs">
                          <p className="font-mono text-[9px] text-white/80 line-clamp-2 leading-tight">{film.title}</p>
                          {film.year && <p className="font-mono text-[8px] text-white/50">{film.year}</p>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {selectedFilms.length > 0 && (
                <p className="mt-sm font-mono text-mono text-primary">
                  {selectedFilms.length} film{selectedFilms.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Submit */}
            <div className="flex items-center gap-md pt-sm border-t border-outline-variant">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-on-primary px-lg py-sm rounded-md font-heading text-heading font-semibold flex items-center gap-sm hover:bg-primary-fixed transition-colors shadow-[0_0_15px_rgba(79,219,200,0.1)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={18} strokeWidth={2.5} />
                    Create list
                  </>
                )}
              </button>
              <Link
                href="/lists"
                className="text-on-surface-variant hover:text-on-surface font-body-sm text-body-sm transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>

    </div>
  )
}
