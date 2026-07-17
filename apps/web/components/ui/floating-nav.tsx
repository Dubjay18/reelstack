"use client"

import { useState, useRef } from 'react'
import Link from 'next/link'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { Compass, Search, LogIn, ArrowRight } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { LogoMark } from '@/components/ui/logo'

export function Magnetic({ children, range = 35 }: { children: React.ReactNode; range?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 120, damping: 18 })
  const springY = useSpring(y, { stiffness: 120, damping: 18 })

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    const { clientX, clientY } = e
    const { left, top, width, height } = ref.current.getBoundingClientRect()
    x.set((clientX - left - width / 2) * 0.3)
    y.set((clientY - top - height / 2) * 0.3)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { x.set(0); y.set(0) }}
      style={{ x: springX, y: springY }}
      className="inline-block"
    >
      {children}
    </motion.div>
  )
}

export function FloatingNav() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const { user, isLoading } = useAuth()

  const navItems = [
    { name: 'Explore', href: '/search', Icon: Compass },
    { name: 'Leaderboard', href: '/leaderboard', Icon: Search },
  ]

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.1 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-6 px-8 pt-5 pb-5"
      style={{ background: 'linear-gradient(to bottom, #17120e 60%, transparent)' }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5">
        <LogoMark size={28} />
        <span className="font-bold text-[18px] text-on-surface" style={{ letterSpacing: '-0.02em' }}>Reelstack</span>
      </Link>

      {/* Nav links */}
      <nav className="hidden md:flex items-center gap-5">
        {navItems.map((item, idx) => (
          <Link
            key={item.name}
            href={item.href}
            className="relative text-[14px] text-on-surface-variant hover:text-on-surface transition-colors whitespace-nowrap"
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {item.name}
          </Link>
        ))}

        {!isLoading && !user && (
          <Link href="/login" className="text-[14px] text-on-surface-variant hover:text-on-surface transition-colors whitespace-nowrap">
            Log in
          </Link>
        )}

        {isLoading ? (
          <div className="w-24 h-9 bg-surface-container animate-pulse rounded-full" />
        ) : user ? (
          <Magnetic>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 bg-primary text-on-primary font-semibold px-5 py-2.5 rounded-full text-[14px] transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Dashboard <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </Magnetic>
        ) : (
          <Magnetic>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 bg-primary text-on-primary font-semibold px-5 py-2.5 rounded-full text-[14px] transition-all hover:opacity-90 active:scale-[0.98] shadow-[0_4px_20px_-4px_rgba(235,156,62,0.4)]"
            >
              Get started
            </Link>
          </Magnetic>
        )}
      </nav>
    </motion.header>
  )
}
