"use client"

import React, { useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { useRileyTop } from '@/lib/hooks/api'
import type { RileyTopPick } from '@/types'

// Diagonal-stripe placeholder style matching the design doc
const stripeStyle = {
  background: 'repeating-linear-gradient(135deg, #31261a 0px, #31261a 10px, #241c15 10px, #241c15 20px)',
}

const collageDef: [number, string, string, number, number][] = [
  [-6,  '8%',  '2%',  190, 280],
  [ 3, '38%',  '0%',  170, 250],
  [-3, '62%', '18%',  190, 280],
  [ 8,  '0%', '48%',  160, 240],
  [-8, '30%', '52%',  170, 250],
  [ 4, '58%', '58%',  160, 240],
]

// Hand-picked posters used only as a fallback — before Riley's trending
// data has loaded (or on a fresh install before its first cron run), so
// the landing page never shows a broken or empty hero.
const fallbackPosters = [
  { title: 'Dune: Part Two', posterPath: '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg' },
  { title: 'Oppenheimer', posterPath: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg' },
  { title: 'The Bear', posterPath: '/eKfVzzEazSIjJMrw9ADa2x8ksLz.jpg' },
  { title: 'Severance', posterPath: '/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg' },
  { title: 'Everything Everywhere All at Once', posterPath: '/u68AjlvlutfEIcpmbYpKcdi09ut.jpg' },
  { title: 'Parasite', posterPath: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg' },
]

const COLLAGE_SIZE = 6

// Fisher-Yates shuffle — doesn't mutate the input.
function shuffle<T>(items: T[], seed: number): T[] {
  const out = [...items]
  let rand = seed
  for (let i = out.length - 1; i > 0; i--) {
    // Simple deterministic PRNG so the same seed always reshuffles the
    // same way within a render, but each mount gets a fresh seed.
    rand = (rand * 9301 + 49297) % 233280
    const j = Math.floor((rand / 233280) * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Picks up to COLLAGE_SIZE posters from trending movies + series, shuffled
// fresh on every mount so the hero looks different each time the page
// loads. Falls back to a curated static set when trending data isn't
// available yet (loading, error, or too few posters with images).
function usePosters(): { title: string; posterPath: string }[] {
  const { data } = useRileyTop()
  const [seed] = useState(() => Math.random() * 233280)

  return useMemo(() => {
    const pool: RileyTopPick[] = [...(data?.top_movies?.picks ?? []), ...(data?.top_series?.picks ?? [])]
    const withPosters = pool.filter((p): p is RileyTopPick & { poster_path: string } => !!p.poster_path)

    if (withPosters.length < COLLAGE_SIZE) {
      return fallbackPosters
    }
    return shuffle(withPosters, seed)
      .slice(0, COLLAGE_SIZE)
      .map((p) => ({ title: p.title, posterPath: p.poster_path }))
  }, [data, seed])
}

function CollageCard({
  rot, left, top, w, h, index, floatDelay, title, posterPath,
}: {
  rot: number; left: string; top: string; w: number; h: number; index: number; floatDelay: number
  title: string; posterPath: string
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const tiltX = useSpring(mx, { stiffness: 100, damping: 20 })
  const tiltY = useSpring(my, { stiffness: 100, damping: 20 })
  const rotateX = useTransform(tiltY, [-0.5, 0.5], [10, -10])
  const rotateY = useTransform(tiltX, [-0.5, 0.5], [-10, 10])

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    mx.set((e.clientX - rect.left) / rect.width - 0.5)
    my.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { mx.set(0); my.set(0) }}
      style={{
        position: 'absolute',
        left, top,
        width: w, height: h,
        rotateX, rotateY,
        transformStyle: 'preserve-3d',
      }}
      animate={{ y: [0, -10, 0], rotate: [rot, rot + 1, rot] }}
      transition={{
        y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: floatDelay },
        rotate: { duration: 8, repeat: Infinity, ease: 'easeInOut', delay: floatDelay },
      }}
      className="cursor-pointer select-none"
    >
      <div
        className="w-full h-full rounded-[14px] border border-outline-variant shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative overflow-hidden hover:border-primary/30 transition-colors"
        style={{ ...stripeStyle, transform: 'translateZ(16px)' }}
      >
        <Image
          src={`https://image.tmdb.org/t/p/w500${posterPath}`}
          alt={title}
          fill
          sizes="190px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
        <span className="absolute bottom-2 left-2.5 right-2.5 font-mono text-[10px] text-on-surface uppercase tracking-[0.08em] truncate">
          {title}
        </span>
      </div>
    </motion.div>
  )
}

export function HeroGallery() {
  const posters = usePosters()

  return (
    <div
      className="relative w-full min-h-[560px] [perspective:1000px]"
      style={{ height: 560 }}
    >
      {/* Ambient amber glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
        <div className="w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      {collageDef.map(([rot, left, top, w, h], i) => (
        <CollageCard
          key={`${i}-${posters[i]?.posterPath}`}
          rot={rot}
          left={left}
          top={top}
          w={w}
          h={h}
          index={i}
          floatDelay={i * 0.6}
          title={posters[i]?.title ?? ''}
          posterPath={posters[i]?.posterPath ?? ''}
        />
      ))}
    </div>
  )
}
