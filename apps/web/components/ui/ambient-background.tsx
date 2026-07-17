'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export function AmbientBackground() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* 1. Grain Texture Overlay (fixed z-50 to texturize entire screen contents) */}
      <div 
        className="fixed inset-0 pointer-events-none z-50 opacity-[0.05] noise-grain-texture"
        style={{ mixBlendMode: 'overlay' }}
      />

      {/* 2. Soft Cinematic Bokeh Glows */}
      {/* Glow 1: Amber (Brand Accent) - Bottom Left */}
      <motion.div
        className="absolute -bottom-20 -left-20 w-[45vw] h-[45vw] min-w-[350px] min-h-[350px] bg-[#eb9c3e]/5 rounded-full blur-[100px]"
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Glow 2: Terracotta - Upper Right */}
      <motion.div
        className="absolute -top-40 -right-40 w-[50vw] h-[50vw] min-w-[400px] min-h-[400px] bg-[#d9552b]/4 rounded-full blur-[120px]"
        animate={{
          x: [0, -30, 40, 0],
          y: [0, 50, -30, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Glow 3: Warm Brown - Middle Left */}
      <motion.div
        className="absolute top-[30vh] left-[15vw] w-[35vw] h-[35vw] min-w-[300px] min-h-[300px] bg-[#31261a]/20 rounded-full blur-[90px]"
        animate={{
          x: [0, 50, -30, 0],
          y: [0, 30, -50, 0],
          scale: [0.9, 1.05, 0.95, 0.9],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* 3. Floating Cinema SVG Primitives (hidden on mobile to keep layouts airy) */}
      <div className="hidden md:block absolute inset-0 w-full h-full">
        {/* Floating Asset 1: Film Sprocket Segment */}
        <motion.div
          className="absolute top-[15%] left-[8%] opacity-[0.06] text-[#6b5847]"
          animate={{
            y: [0, -15, 15, 0],
            x: [0, 10, -10, 0],
            rotate: [0, 8, -4, 0],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <svg width="40" height="120" viewBox="0 0 40 120" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="2" y="2" width="36" height="116" rx="4" />
            <line x1="2" y1="40" x2="38" y2="40" />
            <line x1="2" y1="80" x2="38" y2="80" />
            <rect x="5" y="10" width="4" height="6" rx="1" />
            <rect x="5" y="50" width="4" height="6" rx="1" />
            <rect x="5" y="90" width="4" height="6" rx="1" />
            <rect x="31" y="10" width="4" height="6" rx="1" />
            <rect x="31" y="50" width="4" height="6" rx="1" />
            <rect x="31" y="90" width="4" height="6" rx="1" />
          </svg>
        </motion.div>

        {/* Floating Asset 2: Camera Viewfinder Focus Target */}
        <motion.div
          className="absolute top-[45%] right-[10%] opacity-[0.08] text-[#b9a58e]"
          animate={{
            y: [0, 20, -15, 0],
            x: [0, -15, 10, 0],
            rotate: [0, -5, 5, 0],
          }}
          transition={{
            duration: 26,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <svg width="50" height="50" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M 10,2 H 2 V 10" />
            <path d="M 40,2 H 48 V 10" />
            <path d="M 10,48 H 2 V 40" />
            <path d="M 40,48 H 48 V 40" />
            <circle cx="25" cy="25" r="1.5" fill="currentColor" className="opacity-40" />
          </svg>
        </motion.div>

        {/* Floating Asset 3: Camera Lens Aperture Ring */}
        <motion.div
          className="absolute bottom-[20%] left-[25%] opacity-[0.05] text-[#6b5847]"
          animate={{
            y: [0, -25, 20, 0],
            x: [0, 20, -15, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 40,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="50" cy="50" r="45" strokeDasharray="4 6" />
            <circle cx="50" cy="50" r="40" className="opacity-30" />
            <circle cx="50" cy="50" r="30" strokeDasharray="30 10" />
            <line x1="50" y1="0" x2="50" y2="5" />
            <line x1="50" y1="95" x2="50" y2="100" />
            <line x1="0" y1="50" x2="5" y2="50" />
            <line x1="95" y1="50" x2="100" y2="50" />
          </svg>
        </motion.div>
      </div>
    </div>
  )
}
