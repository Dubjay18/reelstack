'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ReelstackLoading } from '@/components/ui/reelstack-loading'

// Next 14's App Router has no navigation-start event, so we infer it from
// internal <a> clicks and show the mark as a deliberate branded transition —
// MIN_VISIBLE keeps it on screen even when the route swap is instant.
const MIN_VISIBLE = 550

function isInternalNavigation(anchor: HTMLAnchorElement) {
  if (anchor.target === '_blank' || anchor.hasAttribute('download')) return false
  const href = anchor.getAttribute('href')
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false
  try {
    const url = new URL(href, window.location.href)
    return url.origin === window.location.origin
  } catch {
    return false
  }
}

export function RouteTransitionLoader() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const shownAtRef = useRef<number | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevPathRef = useRef(pathname)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      // Note: don't check e.defaultPrevented — next/link's own onClick handler
      // (bound directly on the anchor) always calls preventDefault() to do its
      // client-side routing, and that runs before this bubbled document
      // listener sees the event. That preventDefault() IS the navigation we're
      // trying to detect, not a reason to ignore it.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as HTMLElement)?.closest('a')
      if (!anchor || !isInternalNavigation(anchor)) return
      const url = new URL(anchor.getAttribute('href')!, window.location.href)
      if (url.pathname === window.location.pathname) return

      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      shownAtRef.current = Date.now()
      setVisible(true)
    }

    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (pathname === prevPathRef.current) return
    prevPathRef.current = pathname
    if (!shownAtRef.current) return

    const elapsed = Date.now() - shownAtRef.current
    const remaining = Math.max(0, MIN_VISIBLE - elapsed)
    hideTimerRef.current = setTimeout(() => {
      setVisible(false)
      shownAtRef.current = null
    }, remaining)
    return () => clearTimeout(hideTimerRef.current!)
  }, [pathname])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="route-transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-background"
        >
          <ReelstackLoading size={140} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
