'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  useListDetail,
  useListItems,
  useUpdateList,
  useAddListItem,
  useUpdateListItem,
  useDeleteListItem,
  useSearchContent,
  useContentDetails
} from '@/lib/hooks/api'
import { useAuth } from '@/components/providers/auth-provider'
import { SaveButton } from '@/components/save-button'
import type { List, ListItem } from '@/types'

const SUGGESTED_ADDITIONS = [
  {
    id: 507086,
    title: 'Blade Runner 2049',
    media_type: 'movie' as const,
    image: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=200&h=300'
  },
  {
    id: 64690,
    title: 'Drive',
    media_type: 'movie' as const,
    image: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=200&h=300'
  },
  {
    id: 20526,
    title: 'Tron: Legacy',
    media_type: 'movie' as const,
    image: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=200&h=300'
  }
]

function FilmItemCard({
  item,
  onToggleWatched,
  onRemove,
  isOwner,
  isRemoving,
}: {
  item: ListItem
  onToggleWatched: (itemId: string, watched: boolean) => void
  onRemove: (itemId: string) => void
  isOwner: boolean
  isRemoving: boolean
}) {
  const { data: movie, isLoading } = useContentDetails(item.media_type, item.tmdb_id)

  if (isLoading) {
    return (
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-surface-container-low animate-pulse border border-outline-variant/30 flex items-center justify-center">
        <span className="material-symbols-outlined text-[24px] text-zinc-600 animate-spin">progress_activity</span>
      </div>
    )
  }

  if (!movie) return null

  const title = 'title' in movie ? movie.title : (movie as any).name
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w300${movie.poster_path}`
    : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=300&h=450'

  return (
    <div className="relative aspect-[2/3] rounded-xl overflow-hidden group bg-surface-container shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)] border border-outline-variant/30">
      {/* Checkmark Badge */}
      {item.watched && (
        <div className="absolute top-sm right-sm z-30 bg-secondary text-on-secondary rounded-full w-[24px] h-[24px] flex items-center justify-center shadow-lg border border-secondary-fixed">
          <span className="material-symbols-outlined text-[14px] font-bold">check</span>
        </div>
      )}
      <img
        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02] ${item.watched ? 'grayscale opacity-70' : ''}`}
        src={posterUrl}
        alt={title}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 p-sm w-full z-10 pointer-events-none">
        <h3 className={`font-body-sm text-body-sm truncate font-medium drop-shadow-md ${item.watched ? 'text-white/80' : 'text-white'}`}>
          {title}
        </h3>
      </div>

      {/* Removing Overlay */}
      {isRemoving && (
        <div className="absolute inset-0 bg-black/75 z-40 flex flex-col items-center justify-center gap-xs">
          <span className="material-symbols-outlined text-[24px] text-error animate-spin">progress_activity</span>
          <span className="text-[10px] text-zinc-400 font-mono">Removing...</span>
        </div>
      )}

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-sm z-20">
        <div className="flex justify-between items-start">
          {isOwner ? (
            <>
              <button className="text-white hover:text-primary cursor-grab active:cursor-grabbing transition-colors" title="Drag to reorder">
                <span className="material-symbols-outlined drop-shadow-md">drag_indicator</span>
              </button>
              <button
                onClick={() => onRemove(item.id)}
                className="text-white hover:text-error bg-black/40 rounded-full w-6 h-6 flex items-center justify-center backdrop-blur-sm transition-colors border border-white/10"
                title="Remove from list"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </>
          ) : (
            <div />
          )}
        </div>
        <div className="flex-grow flex flex-col gap-xs items-center justify-center">
          <Link
            href={`/movie/${item.tmdb_id}?type=${item.media_type}`}
            className="bg-surface/80 backdrop-blur-md text-on-surface hover:text-primary px-sm py-xs rounded-md font-body-sm text-body-sm flex items-center gap-xs border border-outline-variant transition-all hover:border-primary/50"
          >
            <span className="material-symbols-outlined text-[16px]">info</span>
            View details
          </Link>
          {isOwner && (
            <button
              onClick={() => onToggleWatched(item.id, !item.watched)}
              className="bg-surface/80 backdrop-blur-md text-on-surface hover:text-primary px-sm py-xs rounded-md font-body-sm text-body-sm flex items-center gap-xs border border-outline-variant transition-all hover:border-primary/50"
            >
              <span className="material-symbols-outlined text-[16px]">
                {item.watched ? 'visibility_off' : 'visibility'}
              </span>
              {item.watched ? 'Unmark' : 'Mark watched'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  const params = useParams()
  const id = params.id as string

  const { user } = useAuth()
  
  // Queries
  const { data: list, isLoading: listLoading } = useListDetail(id)
  const { data: rawItems, isLoading: itemsLoading } = useListItems(id)
  const items = rawItems ?? []

  const isOwner = user?.id === list?.user_id

  // Mutations
  const updateListMutation = useUpdateList(id)
  const addListItemMutation = useAddListItem(id)
  const updateListItemMutation = useUpdateListItem(id)
  const deleteListItemMutation = useDeleteListItem(id)

  // Local state for editing metadata
  const [listTitle, setListTitle] = useState('')
  const [listDescription, setListDescription] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const [descInput, setDescInput] = useState('')

  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

  // Sync title and desc input fields when list query resolves
  useEffect(() => {
    if (list) {
      setListTitle(list.title)
      setTitleInput(list.title)
      setListDescription(list.description || '')
      setDescInput(list.description || '')
    }
  }, [list])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch search results
  const { data: rawSearchResults } = useSearchContent(debouncedSearchQuery)
  const searchResults = rawSearchResults ?? []

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

  // Handle Metadata Updates
  const handleSaveTitle = () => {
    if (titleInput.trim() && titleInput.trim() !== listTitle) {
      updateListMutation.mutate(
        {
          title: titleInput.trim(),
          description: listDescription || null,
          is_public: list?.is_public ?? true
        },
        {
          onSuccess: (updated) => {
            setListTitle(updated.title)
            showToast('List title updated')
          },
          onError: (err: any) => {
            showToast(err.message || 'Failed to update title')
          }
        }
      )
    }
    setIsEditingTitle(false)
  }

  const handleSaveDesc = () => {
    if (descInput !== listDescription) {
      updateListMutation.mutate(
        {
          title: listTitle,
          description: descInput.trim() || null,
          is_public: list?.is_public ?? true
        },
        {
          onSuccess: (updated) => {
            setListDescription(updated.description || '')
            showToast('List description updated')
          },
          onError: (err: any) => {
            showToast(err.message || 'Failed to update description')
          }
        }
      )
    }
    setIsEditingDesc(false)
  }

  const handleTogglePrivacy = () => {
    if (!list) return
    const newIsPublic = !list.is_public
    updateListMutation.mutate(
      {
        title: listTitle,
        description: listDescription || null,
        is_public: newIsPublic
      },
      {
        onSuccess: (updated) => {
          showToast(`List is now ${updated.is_public ? 'public' : 'private'}`)
        },
        onError: (err: any) => {
          showToast(err.message || 'Failed to update privacy')
        }
      }
    )
  }

  // Toggle Watched status using React Query optimistic updates
  const toggleWatched = (itemId: string, watched: boolean) => {
    updateListItemMutation.mutate({
      itemId,
      body: { watched, watched_at: watched ? new Date().toISOString() : null }
    })
  }

  // Remove Item
  const removeFilm = (itemId: string) => {
    deleteListItemMutation.mutate(itemId, {
      onSuccess: () => {
        showToast('Film removed from list')
      },
      onError: (err: any) => {
        showToast(err.message || 'Failed to remove film')
      }
    })
  }

  // Add Film
  const handleAddFilm = (tmdbId: number, mediaType: 'movie' | 'tv', title: string) => {
    addListItemMutation.mutate(
      {
        tmdb_id: tmdbId,
        media_type: mediaType,
        watched: false,
      },
      {
        onSuccess: () => {
          showToast(`Added "${title}" to list`)
          setSearchQuery('')
        },
        onError: (err: any) => {
          showToast(err.message || 'Failed to add film')
        }
      }
    )
  }

  const handleShare = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      showToast('Link copied to clipboard!')
    }
  }

  if (listLoading) {
    return (
      <div className="bg-background text-on-background min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined text-[36px] text-primary animate-spin">progress_activity</span>
      </div>
    )
  }

  if (!list) {
    return (
      <div className="bg-background text-on-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-md">List Not Found</h1>
          <Link href="/lists" className="text-primary hover:underline">Back to Lists</Link>
        </div>
      </div>
    )
  }

  const watchedCount = items?.filter(f => f.watched).length ?? 0

  return (
    <div className="bg-background text-on-background min-h-screen overflow-x-hidden">
      <main className="flex-1 w-full pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto px-lg md:px-xl py-lg md:py-xl space-y-xl">
          {/* List Header */}
          <header className="space-y-md border-b border-outline-variant/30 pb-lg">
            {/* Title Editing */}
            {isEditingTitle ? (
              <div className="flex items-center gap-sm">
                <input 
                  type="text" 
                  value={titleInput} 
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="bg-surface border border-outline-variant text-on-surface font-display-md text-display-md font-bold px-sm py-xs rounded-md focus:outline-none focus:border-primary max-w-lg"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                />
                <button 
                  onClick={handleSaveTitle}
                  disabled={updateListMutation.isPending}
                  className="bg-primary text-background font-body-sm text-body-sm font-semibold px-md py-xs rounded-md hover:bg-primary-fixed transition-colors disabled:opacity-50 flex items-center gap-xs"
                >
                  {updateListMutation.isPending ? (
                    <>
                      <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
                <button 
                  onClick={() => { setTitleInput(listTitle); setIsEditingTitle(false) }}
                  disabled={updateListMutation.isPending}
                  className="text-on-surface-variant hover:text-on-surface font-body-sm text-body-sm px-sm py-xs rounded-md disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-md group">
                <h1 className="font-display-md text-display-md text-on-surface font-bold tracking-tight">
                  {listTitle}
                </h1>
                {isOwner && (
                  <button 
                    onClick={() => setIsEditingTitle(true)}
                    className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-primary transition-opacity"
                    title="Edit title"
                  >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                )}
              </div>
            )}

            {/* Description Editing */}
            <div className="space-y-xs">
              {isEditingDesc ? (
                <div className="flex flex-col gap-xs max-w-2xl">
                  <textarea 
                    value={descInput} 
                    onChange={(e) => setDescInput(e.target.value)}
                    className="bg-surface border border-outline-variant text-on-surface-variant font-body-sm text-body-sm px-sm py-xs rounded-md focus:outline-none focus:border-primary h-20 resize-y"
                    autoFocus
                  />
                  <div className="flex gap-sm">
                    <button 
                      onClick={handleSaveDesc}
                      disabled={updateListMutation.isPending}
                      className="bg-primary text-background font-body-sm text-body-sm font-semibold px-md py-xs rounded-md hover:bg-primary-fixed transition-colors disabled:opacity-50 flex items-center gap-xs"
                    >
                      {updateListMutation.isPending ? (
                        <>
                          <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                          Saving...
                        </>
                      ) : (
                        'Save'
                      )}
                    </button>
                    <button 
                      onClick={() => { setDescInput(listDescription); setIsEditingDesc(false) }}
                      disabled={updateListMutation.isPending}
                      className="text-on-surface-variant hover:text-on-surface font-body-sm text-body-sm px-sm py-xs rounded-md disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-md group max-w-2xl">
                  {listDescription ? (
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {listDescription}
                    </p>
                  ) : (
                    <p className="font-body-sm text-body-sm text-on-surface-variant/40 italic">
                      No description provided. {isOwner ? 'Click the edit icon to add one.' : ''}
                    </p>
                  )}
                  {isOwner && (
                    <button 
                      onClick={() => setIsEditingDesc(true)}
                      className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-primary transition-opacity shrink-0"
                      title="Edit description"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                  )}
                </div>
              )}

              {/* Status Stats Row */}
              <div className="flex items-center gap-md font-mono text-mono text-on-surface-variant text-[12px] pt-xs">
                <span>{items?.length} films</span>
                <span className="w-[3px] h-[3px] rounded-full bg-outline-variant" />
                <span className="text-secondary">{watchedCount} watched</span>
                <span className="w-[3px] h-[3px] rounded-full bg-outline-variant" />
                {isOwner ? (
                  <button
                    onClick={handleTogglePrivacy}
                    disabled={updateListMutation.isPending}
                    className="group flex items-center gap-xs text-[12px] font-mono transition-colors focus:outline-none"
                    title={`Click to make ${list.is_public ? 'private' : 'public'}`}
                  >
                    {list.is_public ? (
                      <span className="text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-sm flex items-center gap-1 cursor-pointer">
                        <span className="material-symbols-outlined text-[12px]">public</span>
                        Public
                        <span className="material-symbols-outlined text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">swap_horiz</span>
                      </span>
                    ) : (
                      <span className="text-zinc-400 bg-zinc-800/80 hover:bg-zinc-800 px-2 py-0.5 rounded-sm flex items-center gap-1 cursor-pointer border border-zinc-700/50">
                        <span className="material-symbols-outlined text-[12px]">lock</span>
                        Private
                        <span className="material-symbols-outlined text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">swap_horiz</span>
                      </span>
                    )}
                  </button>
                ) : (
                  list.is_public ? (
                    <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">public</span>
                      Public
                    </span>
                  ) : (
                    <span className="text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">lock</span>
                      Private
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-sm pt-md">
              <div className="flex items-center gap-sm">
                <button 
                  onClick={handleShare}
                  className="flex items-center gap-xs text-on-background hover:text-primary px-sm py-xs rounded transition-colors font-body-sm text-body-sm bg-transparent border border-outline-variant hover:border-primary/50"
                >
                  <span className="material-symbols-outlined text-[16px]">ios_share</span>
                  Share
                </button>
                {!isOwner && user && (
                  <SaveButton listId={list.id} listOwnerId={list.user_id} />
                )}
                {isOwner && (
                  <button 
                    onClick={handleTogglePrivacy}
                    disabled={updateListMutation.isPending}
                    className="flex items-center gap-xs text-on-background hover:text-primary px-sm py-xs rounded transition-colors font-body-sm text-body-sm bg-transparent border border-outline-variant hover:border-primary/50 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {list.is_public ? 'lock' : 'public'}
                    </span>
                    Make {list.is_public ? 'Private' : 'Public'}
                  </button>
                )}
              </div>
              {isOwner && (
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-primary text-background px-md py-sm rounded-md font-body-sm text-body-sm font-semibold flex items-center gap-xs hover:bg-primary-fixed transition-colors shadow-[0_0_15px_rgba(79,219,200,0.1)]"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Add film
                </button>
              )}
            </div>
          </header>

          {/* Grid Content */}
          {itemsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-gutter">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="relative aspect-[2/3] rounded-xl overflow-hidden bg-surface-container-low border border-outline-variant/30 animate-pulse" />
              ))}
            </div>
          ) : items?.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-outline-variant/30 rounded-2xl bg-surface-container/20">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant opacity-50 mb-md">
                movie_filter
              </span>
              <p className="text-on-surface-variant font-medium">This list has no films yet.</p>
              {isOwner && (
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="mt-sm text-primary hover:text-primary-fixed font-semibold text-body-sm inline-flex items-center gap-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span> Add your first film
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-gutter">
              {items?.map((item) => (
                <FilmItemCard
                  key={item.id}
                  item={item}
                  onToggleWatched={(itemId, watched) => toggleWatched(itemId, watched)}
                  onRemove={(itemId) => removeFilm(itemId)}
                  isOwner={isOwner}
                  isRemoving={deleteListItemMutation.isPending && deleteListItemMutation.variables === item.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Film Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-high border border-outline-variant rounded-2xl max-w-md w-full shadow-modal overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-lg border-b border-outline-variant/30 flex justify-between items-center">
              <h2 className="font-heading text-heading text-on-background">Add film to list</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-on-surface-variant hover:text-on-background transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-lg">
              <div className="relative mb-lg">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-md py-sm pl-xl pr-md text-on-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-body-sm"
                  autoFocus
                />
              </div>

              <div className="space-y-sm max-h-[300px] overflow-y-auto pr-xs">
                <h3 className="font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-xs">
                  {searchQuery ? 'Search Results' : 'Suggested Classics'}
                </h3>
                {searchQuery.trim() === '' ? (
                  SUGGESTED_ADDITIONS.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-sm rounded-lg hover:bg-surface-container transition-colors group"
                    >
                      <div className="flex items-center gap-md">
                        <span className="font-body-sm text-body-sm text-on-background font-medium">
                          {item.title}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleAddFilm(item.id, item.media_type, item.title)}
                        disabled={addListItemMutation.isPending}
                        className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-background px-sm py-xs rounded-md text-body-sm font-semibold transition-all flex items-center gap-xs disabled:opacity-50"
                      >
                        {addListItemMutation.isPending && addListItemMutation.variables?.tmdb_id === item.id ? (
                          <>
                            <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                            Adding...
                          </>
                        ) : (
                          'Add'
                        )}
                      </button>
                    </div>
                  ))
                ) : searchResults.length === 0 ? (
                  <p className="text-on-surface-variant/60 font-body-sm text-center py-md">No search results found.</p>
                ) : (
                  searchResults.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-sm rounded-lg hover:bg-surface-container transition-colors group"
                    >
                      <div className="flex items-center gap-md">
                        <div className="w-[40px] aspect-[2/3] rounded-md overflow-hidden bg-surface-dim relative border border-outline-variant/20 flex-shrink-0">
                          {item.poster_path ? (
                            <img src={`https://image.tmdb.org/t/p/w200${item.poster_path}`} alt={item.title} className="object-cover w-full h-full" />
                          ) : (
                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                              <span className="material-symbols-outlined text-zinc-600 text-[18px]">movie</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-body-sm text-body-sm text-on-background font-medium truncate">
                            {item.title}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {item.year || 'Unknown'} · {item.media_type === 'movie' ? 'Movie' : 'TV'}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAddFilm(item.id, item.media_type, item.title)}
                        disabled={addListItemMutation.isPending}
                        className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-background px-sm py-xs rounded-md text-body-sm font-semibold transition-all shrink-0 flex items-center gap-xs disabled:opacity-50"
                      >
                        {addListItemMutation.isPending && addListItemMutation.variables?.tmdb_id === item.id ? (
                          <>
                            <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                            Adding...
                          </>
                        ) : (
                          'Add'
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-lg right-lg bg-surface-container border border-outline-variant text-on-background px-md py-sm rounded-xl shadow-modal z-50 flex items-center gap-xs animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="material-symbols-outlined text-primary text-[20px]">info</span>
          <span className="font-body-sm text-body-sm">{toastMessage}</span>
        </div>
      )}

    </div>
  )
}
