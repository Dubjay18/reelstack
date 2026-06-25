import { ListCard } from '../../components/list-card'
import { ShareButton } from '../../components/share-button'
import Link from 'next/link'

interface PageProps {
  params: {
    username: string
  }
}

interface PublicProfile {
  id: string
  username: string
  avatar_url?: string | null
  bio?: string | null
  public_links?: any[]
  item_count?: number
}

async function getProfile(username: string): Promise<PublicProfile | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
  try {
    const res = await fetch(`${apiUrl}/api/v1/users/${username}`, {
      cache: 'no-store',
    })
    if (!res.ok) {
      return null
    }
    return res.json()
  } catch (err) {
    console.error('Failed to fetch profile:', err)
    return null
  }
}

export default async function Page({ params }: PageProps) {
  const username = params.username
  const profile = await getProfile(username)

  if (!profile) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col font-sans selection:bg-primary/30 selection:text-primary items-center justify-center p-md">
        <div className="absolute w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="text-center max-w-md relative z-10">
          <h1 className="font-display-md text-display-md text-primary mb-sm">User Not Found</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-lg">
            We couldn&apos;t find a public profile for <span className="font-mono text-primary font-bold">@{username}</span>.
          </p>
          <Link href="/" className="px-md py-sm bg-primary-container text-background rounded-md text-body-sm font-semibold hover:opacity-90 transition-opacity">
            Return Home
          </Link>
        </div>
      </div>
    )
  }

  const publicLists = profile.public_links || []
  const listCount = publicLists.length
  
  let totalWatched = 0
  publicLists.forEach((l) => {
    totalWatched += l.watched_count || 0
  })

  // Fallback avatar URL if not defined
  const avatarUrl = profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-sans selection:bg-primary/30 selection:text-primary pt-16">
      {/* TopAppBar */}
      <header className="bg-background/80 backdrop-blur-md text-primary font-heading text-heading fixed top-0 left-0 w-full z-40 border-b border-outline-variant/30 flex justify-between items-center px-lg h-16">
        <Link href="/" className="font-display-md text-display-md font-bold text-primary hover:opacity-90 transition-opacity">
          Reelstack
        </Link>
        <div className="flex items-center gap-md">
          <Link href="/register" className="px-md py-sm bg-primary-container text-background rounded-md text-body-sm font-semibold hover:opacity-90 transition-opacity">
            Sign up
          </Link>
          <Link href="/login" className="px-md py-sm border border-outline-variant rounded-md text-body-sm font-semibold text-on-surface hover:bg-surface-container transition-colors">
            Log in
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-lg py-xl w-full flex-grow">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-lg mb-xl">
          <div className="shrink-0 relative">
            <img 
              className="w-[72px] h-[72px] rounded-full object-cover border-2 border-primary-container/20" 
              src={avatarUrl} 
              alt={profile.username}
            />
          </div>
          <div className="flex-1 text-center md:text-left flex flex-col gap-sm">
            <h1 className="font-display-md text-display-md text-on-surface">@{profile.username}</h1>
            {profile.bio ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-2xl">
                {profile.bio}
              </p>
            ) : (
              <p className="font-body-sm text-body-sm text-on-surface-variant/50 max-w-2xl italic">
                No bio provided.
              </p>
            )}
            <div className="font-mono text-mono text-on-surface-variant/80 flex items-center justify-center md:justify-start gap-sm mt-xs">
              <span>{listCount} {listCount === 1 ? 'list' : 'lists'}</span>
              <span className="w-[3px] h-[3px] rounded-full bg-outline-variant"></span>
              <span>{totalWatched} {totalWatched === 1 ? 'film watched' : 'films watched'}</span>
              <span className="w-[3px] h-[3px] rounded-full bg-outline-variant"></span>
              <span>0 followers</span>
            </div>
          </div>
          <div className="flex items-center gap-md mt-md md:mt-0">
            <button className="px-md py-xs bg-transparent text-primary-container font-body-sm text-body-sm hover:underline transition-all active:scale-95 duration-150">
              Follow
            </button>
            <ShareButton />
          </div>
        </div>
        
        <div className="w-full h-px bg-outline-variant/30 mb-xl"></div>

        {/* Section: PUBLIC LISTS */}
        <section>
          <h2 className="font-heading text-heading text-on-surface mb-lg tracking-wider">PUBLIC LISTS</h2>
          
          {listCount > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
              {publicLists.map((list) => (
                <ListCard key={list.id} list={list} username={profile.username} />
              ))}
            </div>
          ) : (
            <div className="bg-surface-container-low rounded-xl border border-outline-variant/30 p-xl text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-md">
                movie
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                @{profile.username} hasn&apos;t created any public lists yet.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Footer Strip */}
      <footer className="w-full py-md px-lg lg:px-[10%] flex justify-between items-center border-t border-outline-variant/30 bg-background/90 backdrop-blur-md shrink-0">
        <Link href="/" className="font-display-md text-display-md font-bold text-primary tracking-tight">
          Reelstack
        </Link>
        <div className="font-mono text-mono text-on-surface-variant tracking-wide uppercase text-[11px] opacity-70">
          No ads. No algorithms.
        </div>
      </footer>
    </div>
  )
}
