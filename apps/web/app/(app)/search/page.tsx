'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSearchContent } from '@/lib/hooks/api'

interface FilmResult {
  id: string
  title: string
  year: string
  genre: string
  rating: string
  poster: string
  director: string
  media_type?: 'movie' | 'tv'
  watched?: boolean
}

const TRENDING_FILMS: FilmResult[] = [
  {
    id: '1',
    title: 'Neon Horizon',
    year: '2024',
    genre: 'Sci-Fi',
    rating: '8.4',
    director: 'Elena Vane',
    poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDif1DCjZcJq5kmZFhB27vqkSyrtwD-mmjcnkDG6dP6o1JW4ITaMJZ0Bltkgv9ewmCHfvVTKeZnHAtCP5QjIHB0LoV0q5_1rha5seYTJtx9F2Pkrt6EDFs7lxcCsVjp59kiltc5OHRwMVbQCawhCOz0svcElBWSORMgPpGIOw23lpwvFvOlrdJ-aax_Q2aQ8_6Gwv0PR3N9toXx6UIh2XHEvOww46qo_j1R5LGJt1SduH2fb1kVJ3ZcOw7JOMHAQ57Kq1wY3Ny86ZoN',
  },
  {
    id: '2',
    title: 'The Architect',
    year: '2022',
    genre: 'Thriller',
    rating: '8.1',
    director: 'M. Russo',
    poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC0zvaBuqCwCZuidfXXn2KpkgpMFgk6nDOs0kXPK3Up7HqxRIFgU3xn8hKLg6vcvup50VZ_tsrvwomcrFD1a0KUgIegwEHRRlUw5lV4EDkDT-i2RY-3wLUQi4GYvo7QViLDc7j0edB7IvlKkRqwR-tMGePmX8b_TFEGjGGzerhIvYr5QlreXpHKkkoFXvZsV4sXVZVXnETp1xx7WkRyuOI5qL7NCSqcn8wo3DSpkvqoebvZkw3Ky8SQcjpnZTbTQ2XGUQJhIj13N8TU',
  },
  {
    id: '3',
    title: 'Liquid Memory',
    year: '2023',
    genre: 'Drama',
    rating: '7.9',
    director: 'K. Park',
    poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDKgewQSRpcPLrCyQPiqYS9nwue_oHvtpCBEr5K9oNxLG5YFgB4vYs2mzYMT29TR_PWqIWZFoZ03rdDBcC_l73rcQiqkdU9VFGGk_M8zvfPRuYNV_X7ZHTQwnYQX3c6iCMmLRAShvwpZhzEsLgzx6UISPnjyQAageF3F8Mb0DcZbLIIFlGP_FggFdLk-UC4-LFLvGeT9I_SSlIScIeGAMBholB_BtvWD4x_4wpaD_nDEtFTBFLxVfKU8VYAbqIqfRYNB-n1Jyj-z1GV',
  },
  {
    id: '4',
    title: 'Blade Runner 2049',
    year: '2017',
    genre: 'Sci-Fi',
    rating: '8.0',
    director: 'Denis Villeneuve',
    poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDl4w_6z1PlLALYsaJ-p6MQpaAZISyhtetzJ19DKLP09D5JJQcYSI8EM8xvkTVUhXv9JBa2jOFwxdHsbpqIi3t-OolMrerxsC0Oc45aV1su6a4u31JTpQu3H_l5fateUCSn_bKDluiL_lLR-4CKLo_PRs3ktcHRLNf356pdYdTg1X9YelBjGS45j5wGT19X5UNrDVWxH1CMkaFJGq0DqHOwsI_EfKuTCPHC67f1g0bF89qQwuhU5gCQKdYxi3FVpCESAV6Iid6Vvvmv',
  },
  {
    id: '5',
    title: 'Drive',
    year: '2011',
    genre: 'Neo-Noir',
    rating: '7.8',
    director: 'Nicolas Winding Refn',
    poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDaUTplMpjOQYdQ8G4I8og5zNlh78SM8yfFC5nj3y5a85afABM8MMyRqDMhybbHqawSQGx_1Z_jhmoGiLOW-0WO43uAceQoWXEG1c931OHH9NkJBOcdyjApUUgXyMaoMLZ44qk14ieu4WCE10fMlN_29D3ECCGA_Z2zzkOhVNP9eXs9cNN9BIDA9zCjxZPZQLGfGDRpwRhgsm3GfY6DiCvheUudxDvrcqkYzKf7heydQQHmulez-ppuZP6y4tVkp_nHkPP2dhCgF6kI',
  },
  {
    id: '6',
    title: 'Tron: Legacy',
    year: '2010',
    genre: 'Sci-Fi',
    rating: '6.8',
    director: 'Joseph Kosinski',
    poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1XwhkPUr2pnXQuqN_NdZu4uxFyriV-sKLQNwZFTLZJypv-WBzUu2TRvjmHkCATLLTPFg-YjNFe_WBKL1hKGh_QMOKnDrNdJZBSil4hUySv-3ck2_1qJBimSYrl_BGjk7GSq9__GXYakQrcm3lKoPgs1j6pV-gvfs4qGou_at72My27L4AXMPRCitZU1Iy9bGZkIq7bKTMoLJ9jP-w6jhpePfMqufXdAGlZaNEBLhLYRfMP1FfZrG2qtTkO0smArdhwv2MxsKY_AoL',
  },
  {
    id: '7',
    title: 'Nightcrawler',
    year: '2014',
    genre: 'Thriller',
    rating: '7.9',
    director: 'Dan Gilroy',
    poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBAyCH5sRVi_sDvMpfQvG1T1qcyXgXXzST09axiLK9ra8X87CjK6Kewyr4YKxKOZk2AgaegmlqvTjFpIssDFguZGG_LL8GfEZcxo-OoCQUiTxSu8XHgFqTLHV09ckCt_0Ci63FyHcDtfxFdjapkN3K5l-ZGaLelUMYEf0Iq4HH1ZBC_2vqtr5zU1QUyByGENr8ogbQ3gITktFzvbjAprAmZ5fJlz4HUTIFoId7Rbw_uktBSWMNFC6h5cpN57KCAl7Dwpa6c8jvuq8vX',
  },
  {
    id: '8',
    title: 'Ex Machina',
    year: '2014',
    genre: 'Sci-Fi',
    rating: '7.7',
    director: 'Alex Garland',
    poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCyQoL1x1fmc39ZSVDziGFiPudKyJgNX8KgIed3hTEPPMPnTlQGa3QnfXhkOnnF7j6EcO9qhBHEkHDePvig_ZemhmtrONBJ99CsQeAfgpS300g4q4mMGVjT6j8ppYcvgNSXne77PZV8Vl32R31T7JYfVv8A-4IkgCUvZd4R-FaMPQCSsA-KczewGW3HMNPEhj_eHZ7Eao3xy-fMlMY-5ooIYVdMQdwRj1E4n9GU2BShHaBNHF_79OHv21WpoItBCcokB0KowfMEiKDP',
  },
  {
    id: '9',
    title: 'Star-Bound',
    year: '2024',
    genre: 'Epic',
    rating: '8.5',
    director: 'A. Karev',
    poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBya6HfPXyh9OMpIgurGYeMtBg1CnoUFFu4ddiDhUfuoZowGAvatHkJmPcWxZPpKS9ROeusN5GFN6Tug9p2JBVyWUNT1LDZsWHko1YNROeqk44VLKSFlkiwZXLb-rHxfH0ksIg54omqiOKtrSu0D2-HIS8NtCBnY9x2r7VMRzVOOV1NeFqZdjvy6ltJCTahuXSryriOISBLr3AovGI_LiiU38oGHvxuIJdEsa_RzhtYUi75V8eYgJ1AVOhgNBTIdLsSuTON5u15YEIV',
  },
  {
    id: '10',
    title: 'Transit Zero',
    year: '2023',
    genre: 'Noir',
    rating: '8.0',
    director: 'S. Okafor',
    poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTbM06JkewC13iQt5MkUmntZTu81KLmuX5V1m6g7lm5b0-omY0QndN2Huk9QiEQrwhEXG8GYyFjYhvpvtbyUv2io_-pXHcl0ocv2HjXcn-Hj2jqZ7sjBg3Zcdv1l9Pq-g8_A7W5btXnUAWQ3qz5ujbG4g4nrdkgqAlCGSJDrM_Ba9_-_wlNOVh5C_DsCNs7m-g60DqvpqMvaBu59SNtaIf8ZWZsXeN6seFbwNyNbhjQAF2DLgox39qenujLOMiu31F15JCxNX2IzNy',
  },
  {
    id: '11',
    title: 'Internal Logic',
    year: '2021',
    genre: 'Drama',
    rating: '7.6',
    director: 'P. Holt',
    poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJN6DqMgRU2pTZOlCcmReRAwj0Ogot16JKBbgqO7EkdSbPRnnCAAFbXzugBmuehzY4WfC9utfbewffXJxvolUJ-i-YOCf7ovz2Sj859QGvVBc3mq9Qej4O8SCRQeQAgnJIcpRaEiedHaZ6Yey4TWorsvEZCP_c44MC9TfBAHQqN8sZVNfwYlMddNw_WtHz24uGKmAEP1Mdboi2vbQAtRJiLjQWYMjHf9xCg2g5EIYdrmJvvij0VppCriyGwIePI8pAEenzLUmNNlTY',
  },
  {
    id: '12',
    title: 'Preserved State',
    year: '2022',
    genre: 'Art',
    rating: '7.4',
    director: 'L. Mora',
    poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA5xS-nEpH5rjvcVwh3K43frSMYlmQlRLEyVVIcRz413M20u4zmi_4wPQ',
  },
]

const GENRES = ['All', 'Sci-Fi', 'Thriller', 'Drama', 'Neo-Noir', 'Art', 'Epic', 'Noir']
const SORT_OPTIONS = ['Relevance', 'Rating (High)', 'Year (Newest)', 'Year (Oldest)']

export default function SearchPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [activeGenre, setActiveGenre] = useState('All')
  const [activeSort, setActiveSort] = useState('Relevance')
  const [results, setResults] = useState<FilmResult[]>(TRENDING_FILMS)
  
  const [debouncedQuery, setDebouncedQuery] = useState('')
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data: apiResults, isLoading: apiLoading } = useSearchContent(debouncedQuery)
  const isSearching = apiLoading && !!query.trim()

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

  // Search + filter
  useEffect(() => {
    if (!query.trim()) {
      let filtered = TRENDING_FILMS
      if (activeGenre !== 'All') {
        filtered = filtered.filter(f => f.genre === activeGenre)
      }
      if (activeSort === 'Rating (High)') {
        filtered = [...filtered].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
      } else if (activeSort === 'Year (Newest)') {
        filtered = [...filtered].sort((a, b) => parseInt(b.year) - parseInt(a.year))
      } else if (activeSort === 'Year (Oldest)') {
        filtered = [...filtered].sort((a, b) => parseInt(a.year) - parseInt(b.year))
      }
      setResults(filtered)
    } else if (apiResults) {
      let mapped: FilmResult[] = apiResults.map(r => ({
        id: String(r.id),
        title: r.title,
        year: r.year || '',
        genre: r.media_type === 'movie' ? 'Movie' : 'TV Show',
        rating: r.vote_average ? String(r.vote_average.toFixed(1)) : '0.0',
        poster: r.poster_path ? `https://image.tmdb.org/t/p/w300${r.poster_path}` : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=300&h=450',
        director: '',
        media_type: r.media_type,
      }))
      
      if (activeGenre !== 'All') {
        mapped = mapped.filter(f => f.genre === activeGenre)
      }
      if (activeSort === 'Rating (High)') {
        mapped = [...mapped].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
      } else if (activeSort === 'Year (Newest)') {
        mapped = [...mapped].sort((a, b) => parseInt(b.year) - parseInt(a.year))
      } else if (activeSort === 'Year (Oldest)') {
        mapped = [...mapped].sort((a, b) => parseInt(a.year) - parseInt(b.year))
      }
      setResults(mapped)
    }
  }, [query, apiResults, activeGenre, activeSort])

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
            className="flex items-center gap-sm bg-surface-container-high text-primary border-l-[3px] border-primary px-md py-sm rounded-r-lg opacity-80 font-heading text-heading"
            href="/search"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>search</span>
            Search
          </Link>
          <Link
            className="flex items-center gap-sm text-on-surface-variant hover:text-on-surface px-md py-sm hover:bg-surface-container transition-colors rounded-r-lg border-l-[3px] border-transparent font-heading text-heading"
            href="/lists"
          >
            <span className="material-symbols-outlined">format_list_bulleted</span>
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
          <Link href="/settings" className="w-full text-left flex items-center gap-sm text-on-surface-variant hover:text-on-surface px-md py-sm hover:bg-surface-container transition-colors rounded-lg font-heading text-heading">
            <span className="material-symbols-outlined">settings</span>
            Settings
          </Link>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 w-full md:ml-[240px] pb-16 md:pb-0">
        <div className="max-w-5xl mx-auto px-lg md:px-xl py-lg md:py-xl">
          
          {/* Page Header */}
          <div className="mb-xl">
            <h1 className="font-display-md text-display-md text-on-surface mb-xs">Search</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Discover films, directors, and genres</p>
          </div>

          {/* Search Input */}
          <div className="relative mb-lg">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[22px]">search</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any film, director, or genre..."
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-4 pl-12 pr-16 font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-14 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 gap-1 hidden md:flex">
              <kbd className="font-mono text-[10px] bg-surface-variant text-on-surface-variant px-1.5 py-0.5 rounded border border-outline-variant/50">⌘</kbd>
              <kbd className="font-mono text-[10px] bg-surface-variant text-on-surface-variant px-1.5 py-0.5 rounded border border-outline-variant/50">K</kbd>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex items-center justify-between gap-md mb-lg flex-wrap">
            {/* Genre Pills */}
            <div className="flex gap-xs flex-wrap">
              {GENRES.map(genre => (
                <button
                  key={genre}
                  onClick={() => setActiveGenre(genre)}
                  className={`px-sm py-1 rounded-full font-caption text-caption transition-all border ${
                    activeGenre === genre
                      ? 'bg-primary text-on-primary border-primary shadow-[0_0_10px_rgba(79,219,200,0.2)]'
                      : 'bg-transparent text-on-surface-variant border-outline-variant hover:border-primary/50 hover:text-on-surface'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>

            {/* Sort Select */}
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
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant pointer-events-none">expand_more</span>
            </div>
          </div>

          {/* Results Section */}
          {query.trim() === '' ? (
            <div className="mb-sm">
              <h2 className="font-caption text-caption text-on-surface-variant tracking-[0.1em] uppercase mb-md">
                {isSearching ? 'Searching...' : 'Trending'}
              </h2>
            </div>
          ) : (
            <div className="mb-sm flex items-center justify-between">
              <h2 className="font-caption text-caption text-on-surface-variant tracking-[0.1em] uppercase">
                {isSearching ? 'Searching...' : `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`}
              </h2>
            </div>
          )}

          {/* Results Grid */}
          {results.length === 0 && !isSearching ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="material-symbols-outlined text-[56px] text-on-surface-variant/30 mb-md">movie_filter</span>
              <h3 className="font-heading text-heading text-on-surface mb-xs">No films found</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
                Try a different search term or explore a different genre.
              </p>
              <button
                onClick={() => { setQuery(''); setActiveGenre('All') }}
                className="mt-md text-primary font-semibold font-body-sm text-body-sm hover:text-primary-fixed transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-gutter transition-opacity duration-200 ${isSearching ? 'opacity-50' : 'opacity-100'}`}>
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
                      <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
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

      {/* BottomNavBar (Mobile) */}
      <nav className="md:hidden fixed bottom-0 w-full h-16 z-50 bg-surface-container-low/95 backdrop-blur-lg flex justify-around items-center px-sm pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.4)]">
        <Link className="flex flex-col items-center justify-center text-on-surface-variant hover:text-on-surface transition-all duration-200 ease-in-out active:scale-95 w-16 h-full" href="/dashboard">
          <span className="material-symbols-outlined mb-1">home</span>
          <span className="font-caption text-[10px]">Home</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-primary transition-all duration-200 ease-in-out active:scale-95 w-16 h-full" href="/search">
          <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>search</span>
          <span className="font-caption text-[10px] font-semibold">Search</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-on-surface-variant hover:text-on-surface transition-all duration-200 ease-in-out active:scale-95 w-16 h-full" href="/lists">
          <span className="material-symbols-outlined mb-1">list</span>
          <span className="font-caption text-[10px]">Lists</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-on-surface-variant hover:text-on-surface transition-all duration-200 ease-in-out active:scale-95 w-16 h-full" href="/profile">
          <span className="material-symbols-outlined mb-1">person</span>
          <span className="font-caption text-[10px]">Profile</span>
        </Link>
      </nav>
    </div>
  )
}
