import { ListCard } from '../../components/list-card'
import { ShareButton } from '../../components/share-button'
import { FollowButton } from '../../components/follow-button'
import { ScoreBadge } from '../../components/score-badge'
import { Film, Search } from 'lucide-react'
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
  followers_count?: number
  following_count?: number
  score?: number
  rank?: number | null
}

async function getProfile(username: string): Promise<PublicProfile | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
  try {
    const res = await fetch(`${apiUrl}/api/v1/users/${username}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
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
      <div className="bg-background text-on-surface min-h-screen flex flex-col font-sans selection:bg-primary/30 selection:text-primary items-center justify-center p-md">
        <div className="absolute w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="text-center max-w-md relative z-10">
          <h1 className="font-display-md text-display-md text-primary mb-sm">User Not Found</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-lg">
            We couldn&apos;t find a public profile for <span className="font-mono text-primary font-bold">@{username}</span>.
          </p>
          <Link href="/" className="px-md py-sm bg-primary text-on-primary rounded-md text-body-sm font-semibold hover:opacity-90 transition-opacity">
            Return Home
          </Link>
        </div>
      </div>
    )
  }

  const publicLists = profile.public_links || []
  const listCount = publicLists.length

  let totalWatched = 0
  publicLists.forEach((l) => { totalWatched += l.watched_count || 0 })

  const avatarUrl = profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col font-sans selection:bg-primary/30 selection:text-primary pt-16">

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 w-full z-40 bg-background/80 backdrop-blur-md flex justify-between items-center px-lg h-16">
        <Link href="/dashboard" className="font-bold text-[17px] text-primary" style={{ letterSpacing: '-0.02em' }}>Reelstack</Link>
        <div className="flex items-center gap-sm">
          <Link href="/search" className="text-on-surface-variant hover:text-on-surface transition-colors">
            <Search size={20} strokeWidth={1.75} />
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-lg py-xl w-full flex-grow">

        {/* Profile header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-lg mb-xl">
          <div className="shrink-0">
            <img
              className="w-[72px] h-[72px] rounded-full object-cover border-2 border-primary/20"
              src={avatarUrl}
              alt={profile.username}
            />
          </div>

          <div className="flex-1 text-center md:text-left flex flex-col gap-sm">
            <div className="flex items-center gap-sm flex-wrap justify-center md:justify-start">
              <h1 className="font-display-md text-display-md text-on-surface">@{profile.username}</h1>
              {profile.score !== undefined && profile.score !== null && (
                <ScoreBadge score={profile.score} rank={profile.rank} size="sm" />
              )}
            </div>
            {profile.bio ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-2xl">{profile.bio}</p>
            ) : (
              <p className="font-body-sm text-body-sm text-on-surface-variant/50 max-w-2xl italic">No bio provided.</p>
            )}
            <div className="font-mono text-mono text-on-surface-variant/80 flex flex-wrap items-center justify-center md:justify-start gap-x-sm gap-y-1 mt-xs">
              <span>{listCount} {listCount === 1 ? 'list' : 'lists'}</span>
              <span className="w-[3px] h-[3px] rounded-full bg-outline-variant shrink-0" />
              <span>{totalWatched} {totalWatched === 1 ? 'film watched' : 'films watched'}</span>
              <span className="w-[3px] h-[3px] rounded-full bg-outline-variant shrink-0" />
              <Link href={`/${profile.username}/followers`} className="hover:text-primary transition-colors">
                {profile.followers_count ?? 0} followers
              </Link>
              <span className="w-[3px] h-[3px] rounded-full bg-outline-variant shrink-0" />
              <Link href={`/${profile.username}/following`} className="hover:text-primary transition-colors">
                {profile.following_count ?? 0} following
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-md mt-md md:mt-0">
            <FollowButton targetUserId={profile.id} targetUsername={profile.username} />
            <ShareButton />
          </div>
        </div>

        <div className="w-full h-px bg-outline-variant/30 mb-xl" />

        {/* Public lists */}
        <section>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.1em] text-on-surface-variant mb-lg">Public Lists</h2>

          {listCount > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
              {publicLists.map((list) => (
                <ListCard key={list.id} list={list} username={profile.username} />
              ))}
            </div>
          ) : (
            <div className="bg-surface-container-low rounded-xl border border-outline-variant/30 p-xl text-center">
              <Film size={48} className="text-on-surface-variant/30 mx-auto mb-md" strokeWidth={1.25} />
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                @{profile.username} hasn&apos;t created any public lists yet.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-md px-lg lg:px-[10%] flex justify-between items-center border-t border-outline-variant/30 bg-background/90 backdrop-blur-md shrink-0">
        <Link href="/" className="font-bold text-[17px] text-primary" style={{ letterSpacing: '-0.02em' }}>
          Reelstack
        </Link>
        <div className="font-mono text-mono text-on-surface-variant tracking-wide uppercase text-[11px] opacity-70">
          No ads. No algorithms.
        </div>
      </footer>
    </div>
  )
}
