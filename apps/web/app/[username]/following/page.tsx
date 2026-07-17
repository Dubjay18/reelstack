'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { usePublicProfile, useFollowing } from '@/lib/hooks/api'
import { FollowButton } from '@/components/follow-button'
import { ArrowLeft, CloudOff, RefreshCw, User, Users } from 'lucide-react'

export default function FollowingPage() {
  const params = useParams()
  const username = params.username as string

  const { data: profile, isLoading: profileLoading } = usePublicProfile(username)
  const { data: following, isLoading, isError, refetch } = useFollowing(profile?.id ?? '')
  const list = following ?? []

  if (profileLoading) {
    return (
      <div className="bg-background text-on-background min-h-screen pt-16">
        <main className="max-w-3xl mx-auto px-lg py-xl">
          <div className="h-8 w-48 bg-surface-container-low rounded animate-pulse mb-md" />
          <div className="flex flex-col gap-md">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-surface-container-low border border-outline-variant/30 rounded-xl animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="bg-background text-on-background min-h-screen pt-16 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display-md text-display-md text-primary mb-sm">User Not Found</h1>
          <Link href="/" className="text-primary hover:underline">Return Home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background text-on-background min-h-screen pt-16">
      <main className="max-w-3xl mx-auto px-lg py-xl">
        <div className="flex items-center gap-sm mb-xl">
          <Link
            href={`/${username}`}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft size={20} strokeWidth={1.75} />
          </Link>
          <h1 className="font-display-md text-display-md text-on-surface font-bold tracking-tight">
            Following
          </h1>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-md">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-surface-container-low border border-outline-variant/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-outline-variant/30 rounded-2xl bg-surface-container/20">
            <CloudOff size={48} className="text-error/60 mx-auto mb-md" strokeWidth={1.5} />
            <h3 className="font-heading text-heading text-on-surface mb-xs">Couldn&apos;t load following</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-md max-w-xs">
              Something went wrong fetching the following list.
            </p>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-sm px-lg py-sm bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-full font-heading text-heading transition-colors"
            >
              <RefreshCw size={16} strokeWidth={1.75} />
              Retry
            </button>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-outline-variant/30 rounded-2xl bg-surface-container/20">
            <Users size={48} className="text-on-surface-variant/30 mx-auto mb-md" strokeWidth={1.25} />
            <h3 className="font-heading text-heading text-on-surface mb-xs">Not following anyone yet</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-md max-w-xs">
              When @{username} follows other curators, they&apos;ll show up here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-md">
            <div className="font-mono text-mono text-on-surface-variant mb-sm">
              Following {list.length}
            </div>
            {list.map((user) => (
              <Link
                key={user.id}
                href={`/${user.username}`}
                className="group flex items-center gap-md bg-surface-container-low border border-outline-variant/30 rounded-xl p-md hover:bg-surface-container transition-all duration-200"
              >
                <div className="shrink-0">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center">
                      <User size={20} className="text-on-surface-variant" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-body text-body text-on-surface font-semibold group-hover:text-primary transition-colors truncate">
                    @{user.username}
                  </h3>
                  {user.bio && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant truncate mt-0.5">
                      {user.bio}
                    </p>
                  )}
                  {/* <p className="font-mono text-mono text-on-surface-variant/60 mt-0.5">
                    {user.followers_count} followers
                  </p> */}
                </div>
                <div className="shrink-0" onClick={(e) => e.preventDefault()}>
                  <FollowButton targetUserId={user.id} targetUsername={user.username} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
