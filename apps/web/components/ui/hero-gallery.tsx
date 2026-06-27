"use client"

import React, { useRef } from 'react'
import Image from 'next/image'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'

const ImageComponent = Image as any


// Sub-component for individual card with interactive 3D tilt
function TiltCard({ 
  src, 
  alt, 
  title, 
  caption, 
  badge,
  className,
  rotation,
  floatDelay
}: {
  src: string
  alt: string
  title?: string
  caption?: string
  badge?: string
  className: string
  rotation: number
  floatDelay: number
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  
  // Motion values for tilt
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  
  // Smooth spring physics
  const tiltX = useSpring(x, { stiffness: 100, damping: 20 })
  const tiltY = useSpring(y, { stiffness: 100, damping: 20 })
  
  // Map mouse coordinates to degrees rotation
  const rotateX = useTransform(tiltY, [-0.5, 0.5], [12, -12])
  const rotateY = useTransform(tiltX, [-0.5, 0.5], [-12, 12])
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    
    // Normalize coordinates from -0.5 to 0.5
    const width = rect.width
    const height = rect.height
    const mouseX = (e.clientX - rect.left) / width - 0.5
    const mouseY = (e.clientY - rect.top) / height - 0.5
    
    x.set(mouseX)
    y.set(mouseY)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d"
      }}
      animate={{
        y: [0, -10, 0],
        rotate: [rotation, rotation + 1, rotation]
      }}
      transition={{
        y: {
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
          delay: floatDelay
        },
        rotate: {
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: floatDelay
        }
      }}
      className={`absolute cursor-pointer [perspective:800px] select-none ${className}`}
    >
      <div 
        className="w-full h-full rounded-2xl overflow-hidden border border-zinc-800/80 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] relative group bg-zinc-950 transition-colors duration-300 hover:border-emerald-500/30"
        style={{ transform: "translateZ(20px)" }}
      >
        <ImageComponent
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 240px, 320px"
          className="object-cover object-center group-hover:scale-[1.03] transition-transform duration-700 ease-out"
          priority
        />
        
        {/* Shadow overlays & border refraction */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent opacity-80" />
        <div className="absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] pointer-events-none rounded-2xl" />

        {/* Floating action pill indicators */}
        {badge && (
          <div className="absolute top-4 right-4 flex gap-1 z-20">
            <span className="text-[9px] font-mono font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shadow-md">
              {badge}
            </span>
          </div>
        )}

        {/* Text descriptions */}
        {title && (
          <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col gap-0.5">
            <h4 className="font-sans font-bold text-zinc-100 text-sm leading-tight group-hover:text-emerald-400 transition-colors duration-300">
              {title}
            </h4>
            {caption && <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-wide">{caption}</span>}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function HeroGallery() {
  return (
    <div className="relative w-full h-full min-h-[460px] md:min-h-[580px] lg:min-h-screen flex items-center justify-center [perspective:1000px] overflow-visible">
      {/* Background radial ambient light glow */}
      <div className="absolute w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Decorative ambient lines */}
      <div className="absolute w-[350px] h-[350px] border border-zinc-900 rounded-full pointer-events-none -z-10 flex items-center justify-center opacity-40">
        <div className="w-[200px] h-[200px] border border-zinc-800/60 rounded-full" />
      </div>

      {/* Card 1: Background Left (Rotated) */}
      <TiltCard
        src="/scifi_monolith.png"
        alt="Science fiction monolithic structure poster"
        title="2001: A Space Odyssey"
        caption="Stanley Kubrick • 1968"
        rotation={-6}
        floatDelay={0}
        className="w-[170px] h-[250px] md:w-[220px] md:h-[320px] left-4 md:left-[5%] top-[10%] opacity-40 hover:opacity-100 transition-opacity duration-300"
      />

      {/* Card 2: Midground Right (Rotated) */}
      <TiltCard
        src="/thriller_poster.png"
        alt="Psychological thriller poster"
        title="Nocturnal Animals"
        caption="Tom Ford • 2016"
        badge="MUBI"
        rotation={4}
        floatDelay={1.5}
        className="w-[190px] h-[280px] md:w-[240px] md:h-[350px] right-4 md:right-[5%] top-[20%] z-10"
      />

      {/* Card 3: Foreground Center (Main) */}
      <TiltCard
        src="/desert_dusk.png"
        alt="Cinematic desert landscape at dusk"
        title="Dune: Part Two"
        caption="Denis Villeneuve • 2024"
        badge="CRITERION"
        rotation={-2}
        floatDelay={3}
        className="w-[210px] h-[310px] md:w-[270px] md:h-[390px] left-[25%] md:left-[22%] bottom-[12%] z-20"
      />

      {/* Card 4: Floating overlay pill for curated list status */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[8%] left-[2%] md:left-[10%] glass-panel border border-zinc-800/80 rounded-2xl p-4 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] z-30 flex items-center gap-4 w-[280px]"
      >
        <div className="flex -space-x-3 relative shrink-0">
          <div className="w-9 h-13 rounded-lg overflow-hidden border border-zinc-950 relative z-10 shadow-sm bg-zinc-900">
            <ImageComponent src="/bokeh_neon.png" alt="Film 1" fill className="object-cover" sizes="36px" />
          </div>
          <div className="w-9 h-13 rounded-lg overflow-hidden border border-zinc-950 relative z-20 shadow-sm bg-zinc-900">
            <ImageComponent src="/film_grain.png" alt="Film 2" fill className="object-cover" sizes="36px" />
          </div>
          <div className="w-9 h-13 rounded-lg overflow-hidden border border-zinc-950 relative z-30 shadow-sm bg-zinc-900">
            <ImageComponent src="/minimal_white.png" alt="Film 3" fill className="object-cover" sizes="36px" />
          </div>
        </div>
        
        <div className="flex flex-col min-w-0">
          <span className="font-sans font-bold text-zinc-100 text-xs truncate">Late Night Arthouse</span>
          <span className="font-mono text-[10px] text-zinc-500 mt-0.5 truncate">12 films • @director</span>
        </div>

        <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center ml-auto hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-colors duration-200 cursor-pointer">
          <span className="material-symbols-outlined text-[14px] text-emerald-400">arrow_forward</span>
        </div>
      </motion.div>
    </div>
  )
}
