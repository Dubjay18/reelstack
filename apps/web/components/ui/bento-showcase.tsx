"use client"

import React, { useState, useEffect, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Icons from '@phosphor-icons/react'

const ArrowsDownUp = Icons.ArrowsDownUp as any
const Terminal = Icons.Terminal as any
const Circle = Icons.Circle as any
const FilmStrip = Icons.FilmStrip as any
const Sliders = Icons.Sliders as any
const ArrowUpRight = Icons.ArrowUpRight as any
const Eye = Icons.Eye as any
const BookmarkSimple = Icons.BookmarkSimple as any
const ShareNetwork = Icons.ShareNetwork as any

// Spring physics config (from taste-skill)
const springConfig = { type: "spring" as const, stiffness: 100, damping: 20 }

// --- 1. INTELLIGENT LIST (Auto-sorting List) ---
const INITIAL_FILMS = [
  { id: '1', title: 'La Haine', director: 'M. Kassovitz', score: '9.4', rank: 1, color: 'from-zinc-800 to-zinc-900' },
  { id: '2', title: 'Stalker', director: 'A. Tarkovsky', score: '9.2', rank: 2, color: 'from-zinc-800/80 to-zinc-900/80' },
  { id: '3', title: 'Persona', director: 'I. Bergman', score: '9.1', rank: 3, color: 'from-zinc-800/60 to-zinc-900/60' },
]

export const IntelligentList = memo(function IntelligentList() {
  const [films, setFilms] = useState(INITIAL_FILMS)

  useEffect(() => {
    const interval = setInterval(() => {
      setFilms(prev => {
        // Swap rank 1 and 2, or shuffle
        const shuffled = [...prev]
        const temp = shuffled[0]
        shuffled[0] = shuffled[1]
        shuffled[1] = temp
        return shuffled.map((film, index) => ({ ...film, rank: index + 1 }))
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col gap-3 w-full h-full min-h-[220px]">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
          <ArrowsDownUp className="w-3.5 h-3.5 text-emerald-400" />
          Smart Ranking Stream
        </span>
        <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          Auto-Sort Active
        </span>
      </div>
      <div className="flex flex-col gap-2 relative">
        <AnimatePresence mode="popLayout">
          {films.map((film) => (
            <motion.div
              key={film.id}
              layout
              transition={springConfig}
              className={`p-3.5 rounded-xl border border-zinc-800 bg-gradient-to-r ${film.color} flex justify-between items-center shadow-sm`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-zinc-500">0{film.rank}</span>
                <div>
                  <h4 className="font-sans font-semibold text-zinc-100 text-sm">{film.title}</h4>
                  <p className="font-sans text-xs text-zinc-400">{film.director}</p>
                </div>
              </div>
              <span className="font-mono text-xs font-semibold text-emerald-400">{film.score}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
})

// --- 2. COMMAND INPUT (AI Typewriter bar) ---
const PROMPTS = [
  '/create-collection "70s Brutalism"',
  '/add-film "Stalker"',
  '/publish-taste-profile',
  '/filter mubi-selection --rating=5'
]

export const CommandInput = memo(function CommandInput() {
  const [currentPromptIdx, setCurrentPromptIdx] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isShimmering, setIsShimmering] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout
    const activePrompt = PROMPTS[currentPromptIdx]
    
    if (isShimmering) {
      timer = setTimeout(() => {
        setIsShimmering(false)
        setCurrentPromptIdx((prev) => (prev + 1) % PROMPTS.length)
      }, 1500)
      return () => clearTimeout(timer)
    }

    if (!isDeleting && displayText === activePrompt) {
      // Wait at the end of prompt before deleting
      timer = setTimeout(() => setIsDeleting(true), 2500)
    } else if (isDeleting && displayText === '') {
      setIsDeleting(false)
      setIsShimmering(true)
    } else {
      const delta = isDeleting ? 30 : 60
      timer = setTimeout(() => {
        setDisplayText(
          isDeleting
            ? activePrompt.substring(0, displayText.length - 1)
            : activePrompt.substring(0, displayText.length + 1)
        )
      }, delta)
    }
    return () => clearTimeout(timer)
  }, [displayText, isDeleting, currentPromptIdx, isShimmering])

  return (
    <div className="flex flex-col justify-between w-full h-full min-h-[220px]">
      <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-zinc-500">
        <Terminal className="w-3.5 h-3.5 text-emerald-400" />
        Developer Control
      </div>
      
      <div className="my-auto relative">
        {isShimmering ? (
          <div className="w-full h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center px-4 overflow-hidden">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent animate-shimmer absolute inset-0 -translate-x-full" style={{ animation: 'shimmer 1.5s infinite' }} />
            <span className="text-zinc-500 font-mono text-xs relative z-10">Executing query...</span>
          </div>
        ) : (
          <div className="w-full h-11 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center px-4 justify-between">
            <div className="flex items-center gap-2 font-mono text-xs text-zinc-300">
              <span className="text-emerald-500 select-none">&gt;</span>
              <span>{displayText}</span>
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="w-1.5 h-4 bg-emerald-400 inline-block align-middle"
              />
            </div>
            <span className="text-[10px] font-mono text-zinc-600">CMD</span>
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed font-sans mt-2">
        Instantly automate list curation, import watch history, or build custom collections directly using developers shortcuts.
      </p>
    </div>
  )
})

// --- 3. LIVE STATUS (Breathing status indicators) ---
export const LiveStatus = memo(function LiveStatus() {
  return (
    <div className="flex flex-col justify-between w-full h-full min-h-[220px]">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-mono text-xs font-bold text-emerald-400">
            KF
          </div>
          <div>
            <h4 className="font-sans font-bold text-sm text-zinc-200 leading-none">@kristof</h4>
            <span className="text-[10px] font-mono text-zinc-500">Cinephile curator</span>
          </div>
        </div>
        
        {/* Breathing live status indicator */}
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[9px] font-mono font-bold uppercase text-emerald-400 tracking-wider">Live</span>
        </div>
      </div>

      <div className="my-4 p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl relative overflow-hidden">
        <p className="text-xs font-sans text-zinc-400">
          Currently watching: <strong className="text-zinc-200">Paris, Texas (1984)</strong>
        </p>
        <div className="mt-2 w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: "0%" }}
            animate={{ width: "65%" }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="bg-emerald-500 h-full rounded-full"
          />
        </div>
        <div className="flex justify-between text-[9px] font-mono text-zinc-600 mt-1">
          <span>01:34:12</span>
          <span>02:27:00</span>
        </div>
      </div>

      <div className="flex gap-2">
        <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full">142 reviews</span>
        <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full">24 collections</span>
      </div>
    </div>
  )
})

// --- 4. WIDE DATA STREAM (Infinite Loop Marquee) ---
const MARQUEE_FILMS = [
  { title: "Chungking Express", year: "1994", color: "from-zinc-900 to-emerald-950/20" },
  { title: "Metropolis", year: "1927", color: "from-zinc-900 to-zinc-950" },
  { title: "8 1/2", year: "1963", color: "from-zinc-900 to-emerald-950/30" },
  { title: "In the Mood for Love", year: "2000", color: "from-zinc-900 to-zinc-950" },
  { title: "Yi Yi", year: "2000", color: "from-zinc-900 to-emerald-950/20" },
  { title: "Persona", year: "1966", color: "from-zinc-900 to-zinc-950" }
]

export const WideDataStream = memo(function WideDataStream() {
  return (
    <div className="flex flex-col justify-between w-full h-full min-h-[200px] overflow-hidden">
      <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-zinc-500 px-4">
        <FilmStrip className="w-3.5 h-3.5 text-emerald-400" />
        Curated Catalogue Stream
      </div>

      <div className="relative w-full flex items-center overflow-hidden py-4 my-auto select-none">
        {/* Left and Right Fade Gradients */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#09090b] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#09090b] to-transparent z-10 pointer-events-none" />

        {/* Marquee Inner Track */}
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: 18,
          }}
          className="flex gap-4 w-max"
        >
          {/* Double list for seamless wrapping */}
          {[...MARQUEE_FILMS, ...MARQUEE_FILMS].map((film, index) => (
            <div
              key={index}
              className={`w-[190px] h-[100px] bg-gradient-to-br ${film.color} border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-md shrink-0`}
            >
              <div className="w-6 h-6 rounded-lg bg-zinc-800/40 flex items-center justify-center border border-zinc-700/30">
                <Circle weight="fill" className="w-2.5 h-2.5 text-emerald-500" />
              </div>
              <div>
                <h5 className="font-sans font-bold text-zinc-200 text-sm leading-tight truncate">{film.title}</h5>
                <span className="font-mono text-[10px] text-zinc-500">{film.year}</span>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="px-4">
        <p className="text-xs text-zinc-500 font-sans">
          Auto-synchronized updates matching direct feeds from Letterboxd, MUBI, and Criterion Channel.
        </p>
      </div>
    </div>
  )
})

// --- 5. CONTEXTUAL UI (Focus Mode Card) ---
export const ContextualUI = memo(function ContextualUI() {
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)

  return (
    <div className="flex flex-col justify-between w-full h-full min-h-[220px] relative overflow-hidden group">
      <div>
        <div className="flex justify-between items-start mb-3">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            Interactive Focus Detail
          </span>
          <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
        </div>
        
        {/* Cinematic Film Description with subtle staggered highlights */}
        <h4 className="font-sans font-bold text-lg text-zinc-100 mb-1 leading-tight">La Dolce Vita</h4>
        <p className="font-mono text-[10px] text-zinc-500 mb-2">FEDERICO FELLINI • 1960</p>
        <p className="font-sans text-xs text-zinc-400 leading-relaxed max-w-[90%]">
          A journalist spends a week traversing Rome, searching for <span className="text-zinc-200 bg-zinc-800/80 px-1 py-0.5 rounded border border-zinc-700/30">love</span>, meaning, and the <span className="text-emerald-400 bg-emerald-500/5 px-1 py-0.5 rounded border border-emerald-500/10">dolce vita</span> (sweet life).
        </p>
      </div>

      {/* Dynamic Floating Glass Toolbar popping up on card hover */}
      <div className="mt-4 flex justify-center w-full">
        <div className="glass-card border border-zinc-700/30 rounded-full py-1.5 px-3 flex items-center gap-4 shadow-lg scale-95 group-hover:scale-100 transition-transform duration-300">
          <button 
            onClick={() => setLiked(!liked)} 
            className="flex items-center gap-1 text-[11px] font-medium transition-colors duration-200"
            style={{ color: liked ? '#10b981' : '#a1a1aa' }}
          >
            <Eye weight={liked ? "fill" : "regular"} className="w-3.5 h-3.5" />
            <span>Watch</span>
          </button>
          <div className="w-px h-3 bg-zinc-800" />
          <button 
            onClick={() => setSaved(!saved)}
            className="flex items-center gap-1 text-[11px] font-medium transition-colors duration-200"
            style={{ color: saved ? '#10b981' : '#a1a1aa' }}
          >
            <BookmarkSimple weight={saved ? "fill" : "regular"} className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
          <div className="w-px h-3 bg-zinc-800" />
          <button className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-100 transition-colors duration-200">
            <ShareNetwork className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  )
})

// --- MAIN BENTO GRID ASSEMBLY ---
export function BentoShowcase() {
  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4 md:px-0">
      <div className="text-center md:text-left mb-10">
        <h2 className="font-sans font-bold text-2xl md:text-3xl tracking-tight text-zinc-100 mb-2">
          Lists, evolved.
        </h2>
        <p className="font-sans text-sm text-zinc-500 max-w-md">
          A modular collection engine constructed for cinephiles. Discover five pillars of premium list architecture.
        </p>
      </div>

      {/* Grid Layout (Collapses to single column on mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Intelligent List (Span 1) */}
        <div className="glass-card rounded-[2rem] p-6 md:p-8 flex flex-col justify-between shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)]">
          <IntelligentList />
        </div>

        {/* Card 2: Command Input (Span 1) */}
        <div className="glass-card rounded-[2rem] p-6 md:p-8 flex flex-col justify-between shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)]">
          <CommandInput />
        </div>

        {/* Card 3: Live Status (Span 1) */}
        <div className="glass-card rounded-[2rem] p-6 md:p-8 flex flex-col justify-between shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)]">
          <LiveStatus />
        </div>

        {/* Card 4: Wide Data Stream (Span 2) */}
        <div className="glass-card rounded-[2rem] p-6 md:p-8 flex flex-col justify-between shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)] md:col-span-2 overflow-hidden">
          <WideDataStream />
        </div>

        {/* Card 5: Contextual UI (Span 1) */}
        <div className="glass-card rounded-[2rem] p-6 md:p-8 flex flex-col justify-between shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)]">
          <ContextualUI />
        </div>

      </div>
    </div>
  )
}
