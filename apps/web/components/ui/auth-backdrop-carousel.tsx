"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { usePosters } from './hero-gallery'

const SLIDE_MS = 1800

// Full-bleed poster carousel for the auth panel — crossfades with a slow
// Ken Burns zoom so the panel never looks static while the form is filled in.
export function AuthBackdropCarousel() {
  const posters = usePosters()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (posters.length < 2) return
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % posters.length)
    }, SLIDE_MS)
    return () => clearInterval(timer)
  }, [posters.length])

  const current = posters[index % posters.length]
  if (!current) return null

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#17120e]">
      <AnimatePresence mode="sync">
        <motion.div
          key={`${index}-${current.posterPath}`}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1, ease: 'easeInOut' } }}
        >
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 1 }}
            animate={{ scale: 1.12 }}
            transition={{ duration: SLIDE_MS / 1000 + 1, ease: 'linear' }}
          >
            <Image
              src={`https://image.tmdb.org/t/p/original${current.posterPath}`}
              alt={current.title}
              fill
              priority={index === 0}
              sizes="50vw"
              className="object-cover"
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Darken for text legibility */}
      <div className="absolute inset-0 bg-black/35 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#17120e] via-transparent to-[#17120e]/40 pointer-events-none" />
    </div>
  )
}
