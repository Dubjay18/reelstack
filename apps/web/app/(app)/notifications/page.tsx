'use client'

import { NotificationBell } from '@/components/notification-bell'
import { useAuth } from '@/components/providers/auth-provider'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/hooks/api'
import { getNotificationCopy, groupByRecency, timeAgo } from '@/lib/notifications'
import { AlertCircle, Bell as BellIcon, CheckCheck } from 'lucide-react'
import Link from 'next/link'

function NotificationsPage() {
  const { user } = useAuth()
  const { data: notifications = [], isLoading, isError } = useNotifications(!!user)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const groups = groupByRecency(notifications)

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

      <main className="flex-1 overflow-x-hidden w-full pt-16 md:pt-0 pb-20 md:pb-0">
        <div className="max-w-3xl mx-auto px-lg md:px-xl py-lg md:py-xl">
          <div className="flex items-center justify-between mb-lg">
            <div className="flex items-center gap-md">
              <BellIcon size={26} className="text-primary" strokeWidth={1.75} />
              <h1 className="font-display-md text-display-md text-on-surface">Notifications</h1>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1.5 text-body-sm font-body-sm font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                <CheckCheck size={16} />
                Mark all read
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-sm">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-surface-container animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-xl border border-dashed border-outline-variant/30 rounded-2xl bg-surface-container/20">
              <AlertCircle size={48} className="text-on-surface-variant/30 mx-auto mb-md" strokeWidth={1.5} />
              <p className="font-body-sm text-body-sm text-on-surface-variant">Failed to load notifications. Please try again later.</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-xl border border-dashed border-outline-variant/30 rounded-2xl bg-surface-container/20">
              <BellIcon size={48} className="text-on-surface-variant/30 mx-auto mb-md" strokeWidth={1.25} />
              <p className="font-body-sm text-body-sm text-on-surface-variant">No notifications yet.</p>
            </div>
          ) : (
            <div className="space-y-lg">
              {groups.map((group) => (
                <div key={group.label}>
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.1em] text-on-surface-variant/60 mb-sm px-1">
                    {group.label}
                  </h2>
                  <div className="rounded-2xl border border-outline-variant/20 divide-y divide-outline-variant/20 overflow-hidden bg-surface-container/10">
                    {group.items.map((n) => {
                      const isUnread = !n.is_read
                      const { text, href, Icon } = getNotificationCopy(n)
                      const avatarUrl =
                        n.actor_avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${n.actor_username}`

                      return (
                        <Link
                          key={n.id}
                          href={href}
                          onClick={() => markRead.mutate(n.id)}
                          className={`block px-4 py-3.5 text-body-sm transition-colors hover:bg-surface-container-high ${
                            isUnread ? 'bg-primary/5 text-on-surface font-semibold' : 'text-on-surface-variant'
                          }`}
                        >
                          <div className="flex items-start gap-sm">
                            <div className="relative shrink-0">
                              <img
                                src={avatarUrl}
                                alt={n.actor_username || 'avatar'}
                                className="h-10 w-10 rounded-full object-cover border border-primary/20 bg-surface-container"
                              />
                              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-surface-container border border-outline-variant/40">
                                <Icon size={11} className="text-primary" strokeWidth={2.5} />
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="leading-snug break-words">{text}</p>
                              <p className="text-[10px] font-mono text-on-surface-variant/60">
                                {timeAgo(n.created_at)}
                              </p>
                            </div>
                            {isUnread && (
                              <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" aria-label="unread" />
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default NotificationsPage
