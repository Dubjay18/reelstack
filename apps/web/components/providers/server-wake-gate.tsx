'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Icons from '@phosphor-icons/react'
import { ReelstackLoading } from '@/components/ui/reelstack-loading'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
const POLL_INTERVAL = 2500
const MAX_RETRIES_BEFORE_HINT = 10

const MESSAGES = [
  'Spinning up the projector\u2026',
  'Loading the reel\u2026',
  'Starting the feature\u2026',
  'Adjusting the lens\u2026',
  'Rolling the credits\u2026',
]

const FilmStrip = Icons.FilmStrip as unknown as React.FC<{ className?: string; weight?: string }>

async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(5000) })
    return res.ok
  } catch {
    return false
  }
}

export function ServerWakeGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'idle' | 'sleeping'>('idle')
  const [retryCount, setRetryCount] = useState(0)
  const [msgIndex, setMsgIndex] = useState(0)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wakeFnRef = useRef<(() => void) | null>(null)

  const startPolling = useCallback(() => {
    setStatus('sleeping')
    setRetryCount(0)

    const poll = async () => {
      const ok = await checkHealth()
      if (ok) {
        setStatus('idle')
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      } else {
        setRetryCount((c) => c + 1)
      }
    }

    poll()
    pollingRef.current = setInterval(poll, POLL_INTERVAL)
  }, [])

  useEffect(() => {
    wakeFnRef.current = startPolling
    window.__wakeGate = startPolling
    return () => {
      window.__wakeGate = undefined
    }
  }, [startPolling])

  useEffect(() => {
    if (status !== 'sleeping') return
    const t = setInterval(() => setMsgIndex((i) => (i + 1) % MESSAGES.length), 4000)
    return () => clearInterval(t)
  }, [status])

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  return (
    <>
      {children}

      <AnimatePresence>
        {status === 'sleeping' && (
          <motion.div
            key="wake-gate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
          >
            {/* Spotlight glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#eb9c3e]/5 rounded-full blur-[140px] pointer-events-none" />

            {/* Filmstrip decorative border top */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 opacity-20">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-3 rounded-sm bg-primary"
                  style={{ opacity: 0.2 + (i % 3) * 0.3 }}
                />
              ))}
            </div>

            {/* Reelstack mark — looping burst/breathe/shutter-snap animation */}
            <ReelstackLoading size={140} showWordmark={false} className="mb-4" />

            {/* Rotating message */}
            <motion.p
              key={msgIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="text-on-surface text-lg font-sans font-medium mb-2"
            >
              {MESSAGES[msgIndex]}
            </motion.p>

            <p className="text-on-surface-variant text-sm font-mono">
              This may take 30\u201360 seconds on first visit
            </p>

            {/* Retry count indicator */}
            <div className="mt-8 flex items-center gap-1.5">
              <FilmStrip weight="fill" className="w-3 h-3 text-primary/60" />
              <span className="text-on-surface-variant text-xs font-mono">
                {retryCount > 0 ? `Attempt ${Math.min(retryCount, MAX_RETRIES_BEFORE_HINT)}` : 'Connecting\u2026'}
              </span>
            </div>

            {/* Hint after many retries */}
            {retryCount >= MAX_RETRIES_BEFORE_HINT && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex flex-col items-center gap-3"
              >
                <p className="text-on-surface-variant text-sm font-sans text-center max-w-xs">
                  Taking longer than expected? The server may be cold-starting.
                </p>
                <button
                  onClick={() => {
                    setRetryCount(0)
                    startPolling()
                  }}
                  className="px-6 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-colors active:scale-95"
                >
                  Retry
                </button>
              </motion.div>
            )}

            {/* Filmstrip decorative border bottom */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 opacity-20">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-3 rounded-sm bg-primary"
                  style={{ opacity: 0.2 + (i % 3) * 0.3 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
