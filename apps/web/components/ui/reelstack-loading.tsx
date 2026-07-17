'use client'

import { useRef, useState } from 'react'
import { useAnimationFrame } from 'framer-motion'
import { petalAngle, petalPath } from '@/components/ui/logo'
import { cn } from '@/lib/utils'

const ACCENT = '#eb9c3e'
const FLASH = '#f7ecdf'
const ACCENT2 = '#d9552b'

const PETALS = 9
const OUTER_R = 46
const INNER_R = 10
const SPREAD = (13 * Math.PI) / 180
const DUR = 5000 // ms — full loop

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v))

const Easing = {
  easeOutQuad: (p: number) => 1 - (1 - p) * (1 - p),
  easeInQuad: (p: number) => p * p,
  easeOutBack: (p: number) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2)
  },
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function mixColor(hexA: string, hexB: string, t: number) {
  const a = hexToRgb(hexA)
  const b = hexToRgb(hexB)
  const r = Math.round(a[0] + (b[0] - a[0]) * t)
  const g = Math.round(a[1] + (b[1] - a[1]) * t)
  const bl = Math.round(a[2] + (b[2] - a[2]) * t)
  return `rgb(${r},${g},${bl})`
}

/**
 * 5s seamless loop: burst open -> idle breathing -> shutter snap -> idle -> collapse.
 * Timeline fractions ported directly from the design handoff's ReelstackLoading().
 */
function computeFrame(elapsedMs: number) {
  const t = elapsedMs % DUR
  const dur = DUR

  const entryDur = dur * 0.13
  const staggerSpan = dur * 0.05
  const snapStart = dur * 0.5
  const snapEnd = dur * 0.64
  const exitStart = dur * 0.86
  const exitDur = dur * 0.14

  const rotation = (t / dur) * 360

  let flash = 0
  if (t > snapStart && t < snapEnd) {
    const p = (t - snapStart) / (snapEnd - snapStart)
    flash = p < 0.5 ? Easing.easeOutQuad(p / 0.5) : 1 - Easing.easeInQuad((p - 0.5) / 0.5)
  }

  const breathe = 1 + Math.sin((t / dur) * Math.PI * 2 * 3) * 0.035

  let snapScale = 1
  if (t > snapStart && t < snapEnd) {
    const p = (t - snapStart) / (snapEnd - snapStart)
    snapScale =
      p < 0.4
        ? 1 - 0.85 * Easing.easeInQuad(p / 0.4)
        : 0.15 + 0.85 * Easing.easeOutBack(clamp((p - 0.4) / 0.6))
  }

  const wordOpacity =
    clamp((t - dur * 0.2) / (dur * 0.08)) - clamp((t - exitStart + dur * 0.04) / (dur * 0.06))

  const petals = Array.from({ length: PETALS }, (_, i) => {
    const angle = petalAngle(i, PETALS)
    const staggerOffset = (i / PETALS) * staggerSpan

    let entryScale = 1
    if (t < entryDur + staggerOffset) {
      const p = clamp((t - staggerOffset) / entryDur)
      entryScale = Easing.easeOutBack(p)
    }

    let exitScale = 1
    const revStagger = ((PETALS - i) / PETALS) * (exitDur * 0.4)
    if (t > exitStart + revStagger) {
      const p = clamp((t - exitStart - revStagger) / (exitDur - revStagger))
      exitScale = 1 - Easing.easeInQuad(p)
    }

    const scale = Math.max(0, entryScale * exitScale * breathe * snapScale)
    const color = flash > 0.05 ? mixColor(ACCENT, i % 2 ? FLASH : ACCENT2, flash) : ACCENT
    const d = petalPath(50, 50, angle, OUTER_R, INNER_R, SPREAD)
    return { key: i, d, color, scale }
  })

  return {
    rotation,
    petals,
    glowOpacity: 0.25 + flash * 0.5,
    glowScale: 1 + flash * 0.6,
    wordOpacity: clamp(wordOpacity),
  }
}

interface ReelstackLoadingProps {
  size?: number
  showWordmark?: boolean
  className?: string
}

/**
 * The Reelstack logo's loading animation — a continuous 5s loop safe to show
 * for an unpredictable duration (app splash, route transitions).
 */
export function ReelstackLoading({ size = 160, showWordmark = true, className }: ReelstackLoadingProps) {
  const startRef = useRef<number | null>(null)
  const [frame, setFrame] = useState(() => computeFrame(0))

  useAnimationFrame((time) => {
    if (startRef.current === null) startRef.current = time
    setFrame(computeFrame(time - startRef.current))
  })

  return (
    <div className={cn('relative flex flex-col items-center justify-center', className)}>
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size * 1.9,
          height: size * 1.9,
          background: `radial-gradient(circle, ${ACCENT} 0%, transparent 70%)`,
          opacity: frame.glowOpacity,
          transform: `scale(${frame.glowScale})`,
          filter: 'blur(6px)',
        }}
      />
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ transform: `rotate(${frame.rotation}deg)`, position: 'relative' }}
      >
        {frame.petals.map((p) => (
          <path
            key={p.key}
            d={p.d}
            fill={p.color}
            style={{ transformOrigin: '50px 50px', transform: `scale(${p.scale})` }}
          />
        ))}
      </svg>
      {showWordmark && (
        <div
          className="mt-6 font-bold text-on-surface"
          style={{
            fontSize: Math.round(size * 0.14),
            letterSpacing: '-0.02em',
            opacity: frame.wordOpacity,
            transform: `translateY(${(1 - frame.wordOpacity) * 10}px)`,
          }}
        >
          Reelstack
        </div>
      )}
    </div>
  )
}
