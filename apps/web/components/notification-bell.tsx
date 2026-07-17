'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/lib/hooks/api'
import { useAuth } from '@/components/providers/auth-provider'

export function NotificationBell() {
  const { user } = useAuth()
  
  // Only query notifications if user is logged in
  const { data: notifications = [] } = useNotifications(!!user)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications?.filter((n) => !n.is_read).length

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) return null

  const handleNotificationClick = (id: string) => {
    markRead.mutate(id)
    setIsOpen(false)
  }

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    markAllRead.mutate()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors focus:outline-none"
        aria-label="View notifications"
      >
        <Bell size={22} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-[16px] min-w-[16px] px-1 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-background animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 rounded-xl bg-surface-container border border-outline-variant shadow-2xl z-50 overflow-hidden animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-outline-variant/60 px-4 py-3 bg-surface-container-high">
            <h3 className="font-heading text-body-md font-bold text-on-surface">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-mono font-semibold text-primary hover:underline hover:text-primary/80 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

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
                    className={`block px-4 py-3.5 text-body-sm transition-colors hover:bg-surface-container-high ${
                      isUnread ? 'bg-primary/5 text-on-surface font-semibold' : 'text-on-surface-variant'
                    }`}
                  >
                    <div className="flex items-start gap-sm">
                      <img
                        src={avatarUrl}
                        alt={n.actor_username || 'avatar'}
                        className="h-8 w-8 rounded-full object-cover shrink-0 border border-primary/20 bg-surface-container-high"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="leading-snug break-words">{text}</p>
                        <p className="text-[10px] font-mono text-on-surface-variant">
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
      )}
    </div>
  )
}
