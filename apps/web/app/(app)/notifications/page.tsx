"use client"
import { NotificationBell } from '@/components/notification-bell'
import { useAuth } from '@/components/providers/auth-provider'
import { useMarkNotificationRead, useNotifications } from '@/lib/hooks/api'
import Link from 'next/link'
import React from 'react'

function NotificationsPage() {
    const {user} = useAuth()
      const { data: notifications = [] } = useNotifications(!!user)
        const markRead = useMarkNotificationRead()
         const handleNotificationClick = (id: string) => {
    markRead.mutate(id)
   
  }
  return (
    <div className="overflow-x-hidden">
            {/* TopAppBar (Mobile) */}
      <header className="md:hidden fixed top-0 w-full z-40 bg-background/80 backdrop-blur-md flex justify-between items-center px-lg h-16">
        <h1 className="font-display-md text-display-md font-bold text-primary tracking-tight">Reelstack</h1>
        <div className="flex items-center gap-sm">
          {user ? (
            <NotificationBell />
          ) : (
            <>
              <Link href="/login" className="text-on-surface-variant font-body-sm text-body-sm flex items-center">Log in</Link>
              <Link href="/register" className="text-primary font-body-sm text-body-sm font-semibold flex items-center">Sign up</Link>
            </>
          )}
        </div>
      </header>
         <main className="flex-1 overflow-x-hidden w-full md:ml-[--sidebar-width] pt-16 md:pt-0 pb-20 md:pb-0">
        <div className="max-w-3xl mx-auto px-lg md:px-xl py-lg md:py-xl">
     <h1 className="font-display-md text-display-md text-on-surface mb-xs">Notifications</h1>
        <div className="max-h-72 overflow-y-auto divide-y divide-outline-variant/20">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-on-surface-variant/50 font-body-sm italic">
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.is_read
                let text = ''
                let href = ''

                if (n.type === 'new_follower') {
                  text = `@${n.actor_username} started following you`
                  href = `/${n.actor_username}`
                } else if (n.type === 'list_created') {
                  text = `@${n.actor_username} created a list: ${n.entity_title}`
                  href = `/lists/${n.entity_id}`
                }

                const avatarUrl = n.actor_avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${n.actor_username}`

                return (
                  <Link
                    key={n.id}
                    href={href}
                    onClick={() => handleNotificationClick(n.id)}
                    className={`block px-4 py-3.5 text-body-sm transition-colors hover:bg-surface-container-high mb-4 ${
                      isUnread ? 'bg-primary/5 text-on-surface font-semibold' : 'text-on-surface-variant'
                    }`}
                  >
                    <div className="flex items-start gap-sm">
                      <img
                        src={avatarUrl}
                        alt={n.actor_username || 'avatar'}
                        className="h-8 w-8 rounded-full object-cover shrink-0 border border-primary/20 bg-zinc-900"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="leading-snug break-words text-lg">{text}</p>
                        <p className="text-[10px] font-mono text-zinc-500">
                          {new Date(n.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
            </div>
        </main>
        </div>
  )
}

export default NotificationsPage