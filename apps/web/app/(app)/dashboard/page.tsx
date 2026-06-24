'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useUserLists } from '@/lib/hooks/api'
import { useAuth } from '@/components/providers/auth-provider'

export default function Page() {
  const { user, logout } = useAuth()
  const { data: lists, isLoading } = useUserLists()
  return (
    <div className="bg-background text-on-background flex h-screen overflow-hidden selection:bg-primary/30 selection:text-primary">
      {/* SideNavBar (Desktop) */}
      <nav className="hidden md:flex flex-col bg-surface-dim border-r border-outline-variant w-[240px] h-full fixed left-0 top-0 py-lg z-50">
        <div className="px-md mb-xl">
          <h1 className="font-display-md text-display-md font-bold text-primary tracking-tight">Reelstack</h1>
          <p className="font-caption text-caption text-on-surface-variant mt-1">Cinephile Gallery</p>
        </div>
        
        <div className="flex-1 flex flex-col gap-xs px-sm">
          <Link 
            className="flex items-center gap-sm bg-surface-container-high text-primary border-l-[3px] border-primary px-md py-sm rounded-r-lg opacity-80 font-heading text-heading" 
            href="/dashboard"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
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
          <div className="px-md pt-sm border-t border-outline-variant">
            <button 
              onClick={() => {
                if (user) {
                  navigator.clipboard.writeText(`${window.location.origin}/${user.username}`)
                  alert('Profile link copied to clipboard!')
                }
              }}
              className="w-full py-2 px-4 bg-primary text-background font-body-sm text-body-sm font-semibold rounded-md shadow-[0_0_15px_rgba(79,219,200,0.15)] hover:bg-primary-fixed transition-colors"
            >
              Share my profile
            </button>
          </div>
        </div>
      </nav>

      {/* TopAppBar (Mobile) */}
      <header className="md:hidden fixed top-0 w-full z-40 bg-background/80 backdrop-blur-md flex justify-between items-center px-lg h-16">
        <h1 className="font-display-md text-display-md font-bold text-primary tracking-tight">Reelstack</h1>
        <div className="flex gap-sm">
          <Link href="/login" className="text-on-surface-variant font-body-sm text-body-sm flex items-center">Log in</Link>
          <Link href="/register" className="text-primary font-body-sm text-body-sm font-semibold flex items-center">Sign up</Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full md:ml-[240px] pt-16 md:pt-0 pb-16 md:pb-0 h-screen overflow-y-auto">
        <div className="max-w-5xl mx-auto px-lg md:px-xl py-lg md:py-xl space-y-xl md:space-y-[48px]">
          
          {/* RECENTLY ADDED Section */}
          <section>
            <h2 className="font-caption text-caption text-on-surface-variant tracking-[0.1em] mb-md uppercase">RECENTLY ADDED</h2>
            <div className="relative group">
              <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none"></div>
              <div className="flex gap-md overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-sm">
                
                {/* Poster 1 */}
                <Link href="/movie/1" className="relative w-[120px] md:w-[160px] aspect-[2/3] flex-shrink-0 snap-start rounded-xl overflow-hidden bg-surface-container border border-outline-variant/30 group/poster cursor-pointer hover:border-outline-variant transition-colors">
                  <Image 
                    className="w-full h-full object-cover" 
                    alt="Neon Genesis movie poster" 
                    src="/neon_genesis.png"
                    fill
                    sizes="(max-width: 768px) 120px, 160px"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent"></div>
                  <div className="absolute bottom-3 left-3 right-3 text-on-surface font-body-sm text-body-sm font-semibold leading-tight line-clamp-2">Neon Genesis</div>
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(74,225,118,0.6)]"></div>
                </Link>

                {/* Poster 2 */}
                <Link href="/movie/3" className="relative w-[120px] md:w-[160px] aspect-[2/3] flex-shrink-0 snap-start rounded-xl overflow-hidden bg-surface-container border border-outline-variant/30 group/poster cursor-pointer hover:border-outline-variant transition-colors">
                  <Image 
                    className="w-full h-full object-cover" 
                    alt="Echoes in Rain movie poster" 
                    src="/echoes_rain.png"
                    fill
                    sizes="(max-width: 768px) 120px, 160px"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent"></div>
                  <div className="absolute bottom-3 left-3 right-3 text-on-surface font-body-sm text-body-sm font-semibold leading-tight line-clamp-2">Echoes in Rain</div>
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(79,219,200,0.6)]"></div>
                </Link>

                {/* Poster 3 */}
                <Link href="/movie/2" className="relative w-[120px] md:w-[160px] aspect-[2/3] flex-shrink-0 snap-start rounded-xl overflow-hidden bg-surface-container border border-outline-variant/30 group/poster cursor-pointer hover:border-outline-variant transition-colors">
                  <Image 
                    className="w-full h-full object-cover" 
                    alt="The Brutalist movie poster" 
                    src="/brutalist_sun.png"
                    fill
                    sizes="(max-width: 768px) 120px, 160px"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent"></div>
                  <div className="absolute bottom-3 left-3 right-3 text-on-surface font-body-sm text-body-sm font-semibold leading-tight line-clamp-2">The Brutalist</div>
                </Link>

                {/* Poster 4 */}
                <Link href="/movie/7" className="relative w-[120px] md:w-[160px] aspect-[2/3] flex-shrink-0 snap-start rounded-xl overflow-hidden bg-surface-container border border-outline-variant/30 group/poster cursor-pointer hover:border-outline-variant transition-colors">
                  <Image 
                    className="w-full h-full object-cover" 
                    alt="Parallax View movie poster" 
                    src="/thriller_poster.png"
                    fill
                    sizes="(max-width: 768px) 120px, 160px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent"></div>
                  <div className="absolute bottom-3 left-3 right-3 text-on-surface font-body-sm text-body-sm font-semibold leading-tight line-clamp-2">Parallax View</div>
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(74,225,118,0.6)]"></div>
                </Link>

                {/* Poster 5 */}
                <Link href="/movie/5" className="relative w-[120px] md:w-[160px] aspect-[2/3] flex-shrink-0 snap-start rounded-xl overflow-hidden bg-surface-container border border-outline-variant/30 group/poster cursor-pointer hover:border-outline-variant transition-colors">
                  <Image 
                    className="w-full h-full object-cover" 
                    alt="Nowhere Fast movie poster" 
                    src="/desert_dusk.png"
                    fill
                    sizes="(max-width: 768px) 120px, 160px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent"></div>
                  <div className="absolute bottom-3 left-3 right-3 text-on-surface font-body-sm text-body-sm font-semibold leading-tight line-clamp-2">Nowhere Fast</div>
                </Link>

              </div>
            </div>
          </section>

          {/* Your Lists Section */}
          <section>
            <div className="flex justify-between items-end mb-md">
              <h2 className="font-heading text-heading text-on-surface">Your lists</h2>
              <Link className="font-body-sm text-body-sm text-primary hover:text-primary-fixed transition-colors" href="/lists">See all</Link>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div className="h-28 bg-surface-container-low border border-outline-variant/30 rounded-xl animate-pulse" />
                <div className="h-28 bg-surface-container-low border border-outline-variant/30 rounded-xl animate-pulse" />
              </div>
            ) : !lists || lists.length === 0 ? (
              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-lg text-center space-y-md">
                <p className="text-on-surface-variant font-body-sm">You haven't created any lists yet.</p>
                <Link href="/lists/new" className="inline-block py-2 px-4 bg-primary text-background font-body-sm font-semibold rounded-md shadow-md hover:bg-primary-fixed transition-colors">
                  Create my first list
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                {lists.slice(0, 4).map((list) => (
                  <Link key={list.id} href={`/lists/${list.id}`} className="group flex bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden p-3 gap-md hover:bg-surface-container transition-colors cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.4),_0_1px_2px_rgba(0,0,0,0.3)]">
                    <div className="flex -space-x-[20%] w-[100px] flex-shrink-0">
                      <div className="relative z-30 w-[60px] aspect-[2/3] rounded-md overflow-hidden border border-surface-container-low shadow-md bg-surface-variant flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">movie</span>
                      </div>
                      <div className="relative z-20 w-[60px] aspect-[2/3] rounded-md overflow-hidden border border-surface-container-low shadow-md opacity-80 scale-95 origin-left bg-surface-variant flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">movie</span>
                      </div>
                      <div className="relative z-10 w-[60px] aspect-[2/3] rounded-md overflow-hidden border border-surface-container-low shadow-md opacity-60 scale-90 origin-left bg-surface-variant flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">movie</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col justify-center flex-1 py-1">
                      <h3 className="font-heading text-heading text-on-surface group-hover:text-primary transition-colors line-clamp-1">{list.title}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-mono text-mono text-primary bg-primary/10 px-2 py-0.5 rounded-sm">
                          {list.item_count} items
                        </span>
                        {list.is_public ? (
                          <span className="text-[10px] text-zinc-400 font-mono">Public</span>
                        ) : (
                          <span className="text-[10px] text-zinc-500 font-mono">Private</span>
                        )}
                      </div>
                      <p className="font-mono text-[11px] text-on-surface-variant mt-2 tracking-wide uppercase">
                        {list.watched_count} Watched
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Search Section */}
          <section className="pb-xl md:pb-0">
            <Link href="/search" className="block relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-hover:text-primary transition-colors">search</span>
              <div 
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-4 pl-12 pr-4 font-body-lg text-body-lg text-on-surface-variant/60 cursor-text group-hover:border-primary group-hover:shadow-[0_0_10px_rgba(79,219,200,0.1)] transition-all shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
              >
                Search any film or show...
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 gap-1 hidden md:flex">
                <kbd className="font-mono text-[10px] bg-surface-variant text-on-surface-variant px-1.5 py-0.5 rounded border border-outline-variant/50">⌘</kbd>
                <kbd className="font-mono text-[10px] bg-surface-variant text-on-surface-variant px-1.5 py-0.5 rounded border border-outline-variant/50">K</kbd>
              </div>
            </Link>
          </section>

        </div>
      </main>

      {/* BottomNavBar (Mobile) */}
      <nav className="md:hidden fixed bottom-0 w-full h-16 z-50 bg-surface-container-low/95 backdrop-blur-lg flex justify-around items-center px-sm pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.4)]">
        <Link className="flex flex-col items-center justify-center text-primary transition-all duration-200 ease-in-out active:scale-95 w-16 h-full" href="/dashboard">
          <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
          <span className="font-caption text-[10px] font-semibold">Home</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-on-surface-variant hover:text-on-surface transition-all duration-200 ease-in-out active:scale-95 w-16 h-full" href="/search">
          <span className="material-symbols-outlined mb-1">search</span>
          <span className="font-caption text-[10px]">Search</span>
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
