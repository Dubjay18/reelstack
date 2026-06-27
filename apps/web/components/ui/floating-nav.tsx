"use client"

import { useState, useRef } from 'react'
import Link from 'next/link'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import * as Icons from '@phosphor-icons/react'
import { useAuth } from '@/components/providers/auth-provider'

const FilmStrip = Icons.FilmStrip as any
const Compass = Icons.Compass as any
const MagnifyingGlass = Icons.MagnifyingGlass as any
const SignIn = Icons.SignIn as any
const ArrowRight = Icons.ArrowRight as any

// Magnetic Wrapper for Premium Micro-interactions
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
    const centerX = left + width / 2
    const centerY = top + height / 2
    
    const distanceX = clientX - centerX
    const distanceY = clientY - centerY
    
    // Pull factor
    x.set(distanceX * 0.3)
    y.set(distanceY * 0.3)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
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
    { name: 'Discover', href: '/search', icon: Compass },
    { name: 'Search Film', href: '/search', icon: MagnifyingGlass },
  ]

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
      className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4"
    >
      <div className="w-full max-w-5xl glass-panel h-16 rounded-full flex items-center justify-between px-6 md:px-8 relative">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors duration-300">
            <FilmStrip weight="duotone" className="w-4.5 h-4.5 text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <span className="font-sans font-bold text-lg tracking-tighter text-zinc-100 group-hover:text-emerald-400 transition-colors duration-300">
            Reelstack
          </span>
        </Link>

        {/* Desktop Nav Items with staggered hover pill */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item, idx) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className="relative px-4 py-2 rounded-full text-sm text-zinc-400 hover:text-zinc-100 transition-colors duration-300 flex items-center gap-2"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {hoveredIndex === idx && (
                  <motion.div
                    layoutId="nav-hover-bg"
                    className="absolute inset-0 bg-zinc-800/40 rounded-full -z-10 border border-zinc-700/20"
                    transition={{ type: "spring", stiffness: 150, damping: 20 }}
                  />
                )}
                <Icon weight="regular" className="w-4 h-4 opacity-75" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="w-24 h-9 bg-zinc-800/40 animate-pulse rounded-full border border-zinc-700/20" />
          ) : user ? (
            <Magnetic>
              <Link
                href="/dashboard"
                className="relative overflow-hidden inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium px-5 py-2 rounded-full text-sm shadow-[0_4px_20px_-4px_rgba(16,185,129,0.4)] transition-all duration-300 active:scale-[0.98] group"
              >
                <span>Dashboard</span>
                <ArrowRight weight="bold" className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
            </Magnetic>
          ) : (
            <>
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors duration-200 active:scale-95"
              >
                <SignIn className="w-4 h-4" />
                <span>Sign In</span>
              </Link>

              <Magnetic>
                <Link
                  href="/register"
                  className="relative overflow-hidden inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium px-5 py-2 rounded-full text-sm shadow-[0_4px_20px_-4px_rgba(16,185,129,0.4)] transition-all duration-300 active:scale-[0.98] group"
                >
                  <span>Get Started</span>
                  <ArrowRight weight="bold" className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
                </Link>
              </Magnetic>
            </>
          )}
        </div>
      </div>
    </motion.header>
  )
}
