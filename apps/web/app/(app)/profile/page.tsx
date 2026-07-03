'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUserLists, usePublicProfile, useListItems, useContentDetails, useUpdateProfile, useCheckUsernameAvailability } from '@/lib/hooks/api'
import { useAuth } from '@/components/providers/auth-provider'
import type { ListItem } from '@/types'

function FilmItemCardProfile({ item }: { item: ListItem }) {
  const { data: movie, isLoading } = useContentDetails(item.media_type, item.tmdb_id)

  if (isLoading) {
    return (
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-surface-container-low animate-pulse border border-outline-variant/30" />
    )
  }

  if (!movie) return null

  const title = 'title' in movie ? movie.title : (movie as any).name
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w300${movie.poster_path}`
    : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=300&h=450'

  return (
    <Link
      href={`/movie/${item.tmdb_id}`}
      className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-surface-container border border-outline-variant/30 shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)] hover:border-primary/50 transition-all"
    >
      {item.watched && (
        <div className="absolute top-1.5 right-1.5 z-30 bg-secondary text-on-secondary rounded-full w-[18px] h-[18px] flex items-center justify-center shadow-md">
          <span className="material-symbols-outlined text-[10px] font-bold">check</span>
        </div>
      )}
      <img
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        src={posterUrl}
        alt={title}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 p-xs w-full z-10 pointer-events-none">
        <h3 className="font-mono text-[9px] text-white truncate font-medium drop-shadow-md">
          {title}
        </h3>
      </div>
    </Link>
  )
}

function ListFilmsRow({ listId, listTitle }: { listId: string; listTitle: string }) {
  const { data: rawItems, isLoading } = useListItems(listId)
  const items = rawItems ?? []

  if (isLoading) {
    return (
      <div className="mb-lg">
        <h3 className="font-caption text-caption text-on-surface-variant uppercase tracking-[0.1em] mb-sm">{listTitle}</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-sm">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="aspect-[2/3] rounded-xl bg-surface-container-low animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) return null

  return (
    <div className="mb-lg">
      <div className="flex items-center justify-between mb-sm">
        <h3 className="font-caption text-caption text-on-surface-variant uppercase tracking-[0.1em]">{listTitle}</h3>
        <span className="font-mono text-[10px] text-on-surface-variant/60">{items.length} films</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-sm">
        {items.slice(0, 6).map((item) => (
          <FilmItemCardProfile key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user: authUser, isLoading: authLoading, logout } = useAuth()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState<'films' | 'lists'>('films')
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [bioText, setBioText] = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const updateProfileMutation = useUpdateProfile()

  // Debounce username
  const [debouncedUsername, setDebouncedUsername] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(usernameInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [usernameInput])

  const username = authUser?.username || ''

  const isCheckingUsername = debouncedUsername !== '' && debouncedUsername !== username && debouncedUsername.trim().length >= 3
  const { data: availabilityData, isLoading: isAvailabilityLoading } = useCheckUsernameAvailability(
    isCheckingUsername ? debouncedUsername : ''
  )

  const isUsernameFormatValid = /^[a-zA-Z0-9_]{3,50}$/.test(usernameInput)
  const isUsernameChanged = usernameInput !== username
  const isUsernameAvailable = !isUsernameChanged || (isUsernameFormatValid && availabilityData?.available === true)

  const isSaveDisabled = updateProfileMutation.isPending ||
    (isUsernameChanged && (!isUsernameFormatValid || isAvailabilityLoading || availabilityData?.available === false))

  let statusText = ''
  let statusColor = 'text-zinc-500 font-mono text-[10px] mt-1'
  if (isUsernameChanged) {
    if (!isUsernameFormatValid) {
      statusText = 'Invalid format (3-50 chars, alphanumeric & underscores only)'
      statusColor = 'text-error font-mono text-[10px] mt-1'
    } else if (isAvailabilityLoading) {
      statusText = 'Checking availability...'
      statusColor = 'text-primary font-mono text-[10px] mt-1 animate-pulse'
    } else if (availabilityData?.available === false) {
      statusText = 'Username is already taken'
      statusColor = 'text-error font-mono text-[10px] mt-1'
    } else if (availabilityData?.available === true) {
      statusText = 'Username is available'
      statusColor = 'text-secondary font-mono text-[10px] mt-1'
    }
  }

  const handleSaveBio = () => {
    updateProfileMutation.mutate(
      {
        bio: bioText,
        username: usernameInput !== username ? usernameInput : undefined
      },
      {
        onSuccess: () => {
          setIsEditingBio(false)
          showToast('Profile updated successfully!')
        },
        onError: (err: any) => {
          showToast(err.message || 'Failed to update profile')
        },
      }
    )
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push('/login')
    }
  }, [authUser, authLoading, router])

  const { data: profile, isLoading: profileLoading } = usePublicProfile(username)
  const { data: rawLists, isLoading: listsLoading } = useUserLists()
  const lists = rawLists ?? []

  // Sync profile bio and username
  useEffect(() => {
    if (profile?.bio) {
      setBioText(profile.bio)
    }
    if (profile?.username) {
      setUsernameInput(profile.username)
    }
  }, [profile])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && username) {
      navigator.clipboard.writeText(`${window.location.origin}/${username}`)
      showToast('Public profile link copied!')
    }
  }

  if (authLoading || profileLoading || listsLoading) {
    return (
      <div className="bg-background text-on-background min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined text-[36px] text-primary animate-spin">progress_activity</span>
      </div>
    )
  }

  if (!authUser) return null

  // Calculate statistics
  const totalLists = lists.length
  const totalFilms = lists.reduce((sum, list) => sum + list.item_count, 0)
  const totalWatched = lists.reduce((sum, list) => sum + list.watched_count, 0)

  const avatarUrl = profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`

  return (
    <div className="bg-background text-on-background min-h-screen">


      {/* Main */}
      <main className="flex-1 w-full pb-20 md:pb-0">
        {/* Profile Header */}
        <div className="relative overflow-hidden">
          {/* Ambient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative max-w-3xl mx-auto px-lg md:px-xl pt-lg md:pt-xl pb-xl">
            {/* Profile Card */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-lg">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/30 shadow-[0_0_20px_rgba(79,219,200,0.15)]">
                  <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                </div>
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-secondary rounded-full border-2 border-background flex items-center justify-center">
                  <span className="material-symbols-outlined text-[12px] text-on-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left min-w-0">
                <h1 className="font-display-md text-display-md text-on-surface capitalize">{username}</h1>
                <p className="font-mono text-mono text-primary mb-xs">@{username}</p>
                
                {/* Bio / Profile Edit Form */}
                {isEditingBio ? (
                  <div className="flex flex-col gap-md mt-sm bg-surface-container/30 border border-outline-variant/30 rounded-xl p-md w-full max-w-md">
                    <div className="flex flex-col gap-xs">
                      <label className="font-caption text-caption text-on-surface-variant uppercase tracking-wider text-[10px]">Username</label>
                      <div className="flex items-center bg-surface-container border border-outline-variant focus-within:border-primary rounded-lg px-sm">
                        <span className="text-on-surface-variant font-mono text-[14px]">@</span>
                        <input
                          type="text"
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value)}
                          maxLength={50}
                          className="bg-transparent border-0 font-mono text-mono text-on-surface focus:outline-none w-full py-xs px-xs"
                        />
                      </div>
                      {statusText !== '' && (
                        <p className={statusColor}>{statusText}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-xs">
                      <label className="font-caption text-caption text-on-surface-variant uppercase tracking-wider text-[10px]">Bio</label>
                      <textarea
                        value={bioText}
                        onChange={(e) => setBioText(e.target.value)}
                        rows={2}
                        maxLength={160}
                        className="bg-surface-container border border-outline-variant focus:border-primary rounded-lg p-xs font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary resize-none w-full"
                      />
                    </div>

                    <div className="flex gap-xs">
                      <button
                        onClick={handleSaveBio}
                        disabled={isSaveDisabled}
                        className="bg-primary text-on-primary px-sm py-1 rounded text-body-sm font-semibold hover:bg-primary-fixed transition-colors text-xs disabled:opacity-50"
                      >
                        {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingBio(false)
                          if (profile) {
                            setUsernameInput(profile.username)
                            setBioText(profile.bio || '')
                          }
                        }}
                        className="text-on-surface-variant px-sm py-1 rounded text-body-sm hover:text-on-surface transition-colors text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingBio(true)}
                    className="group text-left mt-xs"
                  >
                    <p className="font-body-sm text-body-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                      {bioText || <span className="italic opacity-50">Add a bio...</span>}
                      <span className="material-symbols-outlined text-[14px] ml-1 opacity-0 group-hover:opacity-60 transition-opacity align-middle">edit</span>
                    </p>
                  </button>
                )}

                {/* Stats */}
                <div className="flex items-center justify-center sm:justify-start gap-lg mt-md flex-wrap">
                  {[
                    { value: totalLists, label: 'Lists' },
                    { value: totalFilms, label: 'Films' },
                    { value: totalWatched, label: 'Watched' },
                    { value: profile?.followers_count || 0, label: 'Followers' },
                    { value: profile?.following_count || 0, label: 'Following' },
                  ].map(stat => (
                    <div key={stat.label} className="text-center">
                      <div className="font-heading text-heading text-on-surface">{stat.value}</div>
                      <div className="font-mono text-[10px] text-on-surface-variant uppercase">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex sm:flex-col gap-sm flex-shrink-0">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-xs border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container px-sm py-xs rounded-lg font-body-sm text-body-sm transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">ios_share</span>
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-outline-variant">
          <div className="max-w-3xl mx-auto px-lg md:px-xl flex">
            {(['films', 'lists'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-md py-sm font-body-sm text-body-sm capitalize border-b-2 -mb-px transition-all ${
                  activeTab === tab
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab === 'films' ? `Films (${totalFilms})` : `Lists (${totalLists})`}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-3xl mx-auto px-lg md:px-xl py-xl">
          
          {activeTab === 'films' ? (
            <div>
              <div className="flex items-center justify-between mb-md">
                <h2 className="font-caption text-caption text-on-surface-variant uppercase tracking-[0.1em]">My Films</h2>
                <Link href="/search" className="font-body-sm text-body-sm text-primary hover:text-primary-fixed transition-colors">
                  Browse & Add films →
                </Link>
              </div>
              
              {lists.length === 0 || totalFilms === 0 ? (
                <div className="text-center py-12 border border-dashed border-outline-variant/30 rounded-2xl bg-surface-container/20">
                  <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-md">movie</span>
                  <p className="font-body-sm text-zinc-500">You don&apos;t have any films in your lists yet.</p>
                </div>
              ) : (
                <div className="space-y-lg">
                  {lists.map(list => (
                    <ListFilmsRow key={list.id} listId={list.id} listTitle={list.title} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-md">
                <h2 className="font-caption text-caption text-on-surface-variant uppercase tracking-[0.1em]">My Lists</h2>
                <Link href="/lists/new" className="font-body-sm text-body-sm text-primary hover:text-primary-fixed transition-colors flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[16px]">add</span>New list
                </Link>
              </div>
              
              {lists.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-outline-variant/30 rounded-2xl bg-surface-container/20">
                  <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-md">playlist_add</span>
                  <p className="font-body-sm text-zinc-500">You haven&apos;t created any lists yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-sm">
                  {lists.map(list => (
                    <Link
                      key={list.id}
                      href={`/lists/${list.id}`}
                      className="group flex items-center justify-between bg-surface-container-low border border-outline-variant rounded-xl px-md py-sm hover:bg-surface-container hover:border-outline-variant/80 transition-all"
                    >
                      <div className="flex items-center gap-md">
                        <span className="material-symbols-outlined text-on-surface-variant">format_list_bulleted</span>
                        <div>
                          <h3 className="font-heading text-heading text-on-surface group-hover:text-primary transition-colors">{list.title}</h3>
                          <p className="font-mono text-mono text-on-surface-variant">{list.item_count} films · {list.is_public ? 'Public' : 'Private'}</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant text-[18px] opacity-0 group-hover:opacity-100 transition-opacity text-primary">arrow_forward</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>


      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-lg right-lg bg-surface-container border border-outline-variant text-on-background px-md py-sm rounded-xl shadow-modal z-50 flex items-center gap-xs animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="material-symbols-outlined text-primary text-[20px]">info</span>
          <span className="font-body-sm text-body-sm">{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
