"use client"

import Link from 'next/link'
import { motion } from 'framer-motion'
import { FloatingNav, Magnetic } from '@/components/ui/floating-nav'
import { HeroGallery } from '@/components/ui/hero-gallery'
import { BentoShowcase } from '@/components/ui/bento-showcase'
import * as Icons from '@phosphor-icons/react'

const ArrowRight = Icons.ArrowRight as any
const Compass = Icons.Compass as any
const FilmStrip = Icons.FilmStrip as any

export default function LandingPage() {
  return (
    <div className="bg-[#09090b] text-zinc-100 min-h-[100dvh] flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300 relative overflow-x-hidden">
      {/* Floating Header */}
      <FloatingNav />

      {/* Hero Section */}
      <main className="flex-grow flex flex-col relative z-10">
        
        {/* Asymmetric Hero: Content and Assets */}
        <section className="w-full max-w-7xl mx-auto px-6 md:px-8 min-h-[100dvh] flex flex-col lg:flex-row items-center justify-between pt-28 lg:pt-0 gap-12 lg:gap-8">
          
          {/* Left Column: Typographic Lockup & Action CTAs */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.2 }}
            className="flex-1 flex flex-col justify-center text-left max-w-2xl lg:pr-8"
          >
            {/* Visual indicator tag */}
            <div className="inline-flex items-center gap-1.5 self-start mb-6 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1 text-xs text-zinc-400">
              <FilmStrip className="w-3.5 h-3.5 text-emerald-400" />
              <span>Version 2.0 live</span>
            </div>

            <h1 className="font-sans font-extrabold text-4xl sm:text-5xl md:text-7xl tracking-tighter leading-[0.95] text-zinc-50 mb-6">
              The watchlist <br />
              that <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 font-black">speaks for you.</span>
            </h1>

            <p className="font-sans text-base sm:text-lg text-zinc-400 leading-relaxed max-w-[55ch] mb-8">
              Reelstack turns what you watch into a public taste profile. Curate collections, discover critically acclaimed cinema, and construct your digital film gallery.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
              <Magnetic>
                <Link 
                  href="/register" 
                  className="inline-flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-8 py-3 rounded-full text-base shadow-[0_4px_25px_-4px_rgba(16,185,129,0.5)] transition-all duration-300 active:scale-[0.97]"
                >
                  <span>Get started free</span>
                  <ArrowRight weight="bold" className="w-4 h-4" />
                </Link>
              </Magnetic>

              <Link 
                href="/search" 
                className="inline-flex items-center justify-center gap-2 bg-transparent border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900/50 px-8 py-3 rounded-full text-base transition-all duration-300 active:scale-[0.97]"
              >
                <Compass className="w-5 h-5 opacity-75" />
                <span>Browse sample</span>
              </Link>
            </div>

            {/* Micro details */}
            <div className="mt-12 flex gap-8 border-t border-zinc-900 pt-6">
              <div>
                <span className="block font-mono text-xs text-zinc-600">FILM BASE</span>
                <span className="font-sans font-bold text-zinc-300 text-sm">48.2k titles</span>
              </div>
              <div className="w-px bg-zinc-900" />
              <div>
                <span className="block font-mono text-xs text-zinc-600">CURATORS</span>
                <span className="font-sans font-bold text-zinc-300 text-sm">12.5k active</span>
              </div>
              <div className="w-px bg-zinc-900" />
              <div>
                <span className="block font-mono text-xs text-zinc-600">INTEGRATION</span>
                <span className="font-sans font-bold text-emerald-400/90 text-sm">100% manual feed</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Parallax float visual gallery */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.3 }}
            className="flex-1 w-full relative min-h-[480px] lg:min-h-screen z-10"
          >
            <HeroGallery />
          </motion.div>

        </section>

        {/* Separator Line */}
        <div className="w-full max-w-7xl mx-auto px-6 md:px-8">
          <div className="w-full h-px bg-zinc-900" />
        </div>

        {/* Feature Bento Grid Section */}
        <section className="w-full py-20 bg-gradient-to-b from-[#09090b] to-[#0c0c0e]">
          <BentoShowcase />
        </section>

      </main>

      {/* Footer Strip */}
      <footer className="w-full py-8 px-6 md:px-8 border-t border-zinc-900 z-20 bg-[#0c0c0e]/95 backdrop-blur-md shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-sans font-extrabold text-lg tracking-tighter text-emerald-400">Reelstack</span>
            <span className="text-[10px] font-mono text-zinc-600 mt-0.5">© 2026</span>
          </div>
          <div className="font-mono text-zinc-500 tracking-wider uppercase text-[10px] opacity-70">
            No ads. No algorithms. Pure curation.
          </div>
          <div className="flex gap-6 text-xs text-zinc-500 font-sans">
            <Link href="/privacy" className="hover:text-zinc-300 transition-colors duration-200">Privacy</Link>
            <Link href="/terms" className="hover:text-zinc-300 transition-colors duration-200">Terms</Link>
            <Link href="https://github.com" className="hover:text-zinc-300 transition-colors duration-200">Open source</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
