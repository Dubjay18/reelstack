"use client"

import { useState } from 'react'
import { motion, useInView, useReducedMotion, AnimatePresence } from 'framer-motion'
import { useRef } from 'react'
import * as Icons from '@phosphor-icons/react'

const Sparkle = Icons.Sparkle as any
const CheckCircle = Icons.CheckCircle as any
const ListChecks = Icons.ListChecks as any

type Step =
  | { kind: 'user'; text: string }
  | { kind: 'riley'; text: string }
  | { kind: 'approval'; text: string }
  | { kind: 'created'; text: string }

// Mirrors the real flow: Riley proposes a list from chat, but only creates
// it once the user explicitly approves — matching the MCP approval gate in
// apps/api/internal/riley/mcp_client.go.
const STEPS: Step[] = [
  { kind: 'user', text: "What's worth watching this week?" },
  { kind: 'riley', text: "Trending sci-fi right now: Dune: Part Two, The Bear, Severance, Foundation. Want me to save those as a list?" },
  { kind: 'user', text: 'yes, do it' },
  { kind: 'approval', text: "Create list “Sci-Fi Picks” with 4 titles?" },
  { kind: 'created', text: 'List created — find it under Lists.' },
]

const STEP_DELAY_MS = 1100

export function RileyChatDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-15%' })
  const prefersReducedMotion = useReducedMotion()
  const [visibleCount, setVisibleCount] = useState(prefersReducedMotion ? STEPS.length : 0)

  const hasStarted = useRef(false)
  if (isInView && !hasStarted.current && !prefersReducedMotion) {
    hasStarted.current = true
    STEPS.forEach((_, i) => {
      setTimeout(() => setVisibleCount((c) => Math.max(c, i + 1)), i * STEP_DELAY_MS)
    })
  }

  return (
    <div ref={ref} className="glass-card rounded-[2rem] p-6 md:p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)] w-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Sparkle weight="fill" className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="font-sans font-bold text-sm text-on-surface leading-none">Riley</h4>
            <span className="text-[10px] font-mono text-on-surface-variant">AI movie agent</span>
          </div>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant/70">Chat → list, with your OK</span>
      </div>

      <div className="flex flex-col gap-2.5 min-h-[210px]">
        <AnimatePresence>
          {STEPS.slice(0, visibleCount).map((step, i) => (
            <motion.div
              key={i}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
              className={
                step.kind === 'user'
                  ? 'self-end max-w-[80%] bg-primary/15 border border-primary/25 text-on-surface text-[13px] rounded-2xl rounded-br-sm px-3.5 py-2'
                  : step.kind === 'approval'
                  ? 'self-start max-w-[85%] bg-surface-container border border-outline-variant rounded-2xl px-3.5 py-3 flex items-center justify-between gap-3'
                  : step.kind === 'created'
                  ? 'self-start max-w-[85%] flex items-center gap-1.5 text-[12px] font-mono text-primary'
                  : 'self-start max-w-[85%] bg-surface-container/70 border border-outline-variant text-on-surface-variant text-[13px] rounded-2xl rounded-bl-sm px-3.5 py-2'
              }
            >
              {step.kind === 'approval' ? (
                <>
                  <span className="text-[13px] text-on-surface flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-primary shrink-0" />
                    {step.text}
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold bg-primary text-on-primary px-2.5 py-1 rounded-full">
                    Approve
                  </span>
                </>
              ) : step.kind === 'created' ? (
                <>
                  <CheckCircle weight="fill" className="w-4 h-4" />
                  {step.text}
                </>
              ) : (
                step.text
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
