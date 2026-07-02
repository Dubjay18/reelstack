'use client'

import Link from 'next/link'
import { useSavedLists } from '@/lib/hooks/api'
import { useAuth } from '@/components/providers/auth-provider'
import { NotificationBell } from '@/components/notification-bell'

export default function SavedListsPage() {
  const { user } = useAuth()
  const { data: lists, isLoading } = useSavedLists()
  const savedLists = lists ?? []

  const totalFilms = savedLists.reduce((a, b) => a + b.item_count, 0)

  return (
    <div className="bg-background text-on-background min-h-screen">
      <header className="md:hidden fixed top-0 w-full z-40 bg-background/80 backdrop-blur-md flex justify-between items-center px-lg h-16">
        <h1 className="font-display-md text-display-md font-bold text-primary tracking-tight">Reelstack</h1>
        <div className="flex items-center gap-sm">
          {user && <NotificationBell />}
        </div>
      </header>

      <main className="flex-1 w-full md:ml-[--sidebar-width] pt-16 md:pt-0 pb-20 md:pb-0">
        <div className="max-w-3xl mx-auto px-lg md:px-xl py-lg md:py-xl">
          <div className="flex items-start justify-between mb-xl">
            <div>
              <h1 className="font-display-md text-display-md text-on-surface mb-xs">Saved Lists</h1>
              <div className="flex items-center gap-md font-mono text-mono text-on-surface-variant">
                <span>{savedLists.length} lists</span>
                {savedLists.length > 0 && (
                  <>
                    <span className="w-[3px] h-[3px] rounded-full bg-outline-variant" />
                    <span>{totalFilms} films</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-md">
              <div className="h-28 bg-surface-container-low border border-outline-variant/30 rounded-xl animate-pulse" />
              <div className="h-28 bg-surface-container-low border border-outline-variant/30 rounded-xl animate-pulse" />
            </div>
          ) : savedLists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-outline-variant/30 rounded-2xl bg-surface-container/20">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-md">bookmark</span>
              <h3 className="font-heading text-heading text-on-surface mb-xs">No saved lists</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-md max-w-xs">
                Save public lists from other curators to access them quickly here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-md">
              {savedLists.map((list) => (
                <Link
                  key={list.id}
                  href={`/${list.owner_username}/${list.slug}`}
                  className="group flex bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden hover:bg-surface-container transition-all duration-200 cursor-pointer shadow-card hover:shadow-elevated"
                >
                  <div className="flex flex-col justify-center flex-1 p-md gap-xs min-w-0">
                    <div className="flex items-start justify-between gap-sm">
                      <h3 className="font-heading text-heading text-on-surface group-hover:text-primary transition-colors line-clamp-1">
                        {list.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                      <span className="font-mono text-mono">{list.item_count} films</span>
                      <span className="w-[3px] h-[3px] rounded-full bg-outline-variant" />
                      <span className="text-xs text-primary">{list.save_count} saves</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {list.owner_avatar ? (
                        <img
                          src={list.owner_avatar}
                          alt={list.owner_username}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-surface-variant flex items-center justify-center">
                          <span className="material-symbols-outlined text-[12px] text-on-surface-variant">person</span>
                        </div>
                      )}
                      <span className="font-mono text-[11px] text-on-surface-variant/60">
                        by <span className="text-primary/80 hover:text-primary">@{list.owner_username}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center pr-md opacity-0 group-hover:opacity-100 transition-opacity text-primary">
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
