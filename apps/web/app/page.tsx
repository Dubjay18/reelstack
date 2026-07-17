"use client"

import Link from 'next/link'
import { motion } from 'framer-motion'
import { FloatingNav } from '@/components/ui/floating-nav'
import { HeroGallery } from '@/components/ui/hero-gallery'
import { BentoShowcase } from '@/components/ui/bento-showcase'
import { Film, BarChart2, Share2, Smartphone, Download } from 'lucide-react'

const ANDROID_APK_URL =
  process.env.NEXT_PUBLIC_ANDROID_APK_URL ||
  'https://github.com/Dubjay18/reelstack/releases/download/mobile-v1.0.0/reelstack.apk'

const features = [
  {
    icon: Film,
    title: "Curate, don't scroll",
    desc: 'Build ranked lists instead of feeding a feed no one controls.',
  },
  {
    icon: BarChart2,
    title: 'A living taste score',
    desc: 'Every save, follow and list you publish moves your Curator Score.',
  },
  {
    icon: Share2,
    title: 'One link, your whole shelf',
    desc: 'Share a single profile page instead of screenshotting your history.',
  },
]

export default function LandingPage() {
  return (
    <div className="text-on-surface min-h-[100dvh] flex flex-col font-sans relative overflow-x-hidden bg-background">
      {/* Sticky Nav */}
      <FloatingNav />

      <main className="flex-grow flex flex-col relative z-10">

        {/* Hero */}
        <section className="w-full max-w-[1280px] mx-auto px-12 min-h-[80vh] flex items-center gap-14 pt-28 lg:pt-0">

          {/* Left: copy + CTAs */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 80, damping: 16, delay: 0.15 }}
            className="flex-1 max-w-[560px]"
          >
            {/* Eyebrow pill */}
            <div className="inline-flex items-center gap-2 border border-outline-variant rounded-full px-3.5 py-1.5 text-xs text-on-surface-variant mb-7">
              <Film size={14} className="text-primary" />
              Now tracking 50,000+ titles
            </div>

            <h1
              className="font-bold text-[56px] leading-[1.08] text-on-surface mb-7"
              style={{ letterSpacing: '-0.03em' }}
            >
              Every film you&apos;ve loved,<br />
              now <span className="text-primary">one link away.</span>
            </h1>

            <p className="text-[17px] leading-[1.6] text-on-surface-variant max-w-[46ch] mb-9">
              Reelstack is a public record of your taste: rate, collect, and share what you watch — without the noise of a feed telling you what to think of it.
            </p>

            <div className="flex gap-3.5 mb-11">
              <Link
                href="/register"
                className="bg-primary text-on-primary font-semibold px-7 py-3.5 rounded-full text-[15px] transition-all hover:opacity-90 active:scale-[0.97] shadow-[0_4px_24px_-4px_rgba(235,156,62,0.5)]"
              >
                Start your stack
              </Link>
              <Link
                href="/search"
                className="bg-transparent text-on-surface border border-outline-variant px-7 py-3.5 rounded-full text-[15px] transition-all hover:bg-surface active:scale-[0.97]"
              >
                Browse titles
              </Link>
            </div>

            {/* Stats row */}
            <div className="flex gap-7 pt-6 border-t border-outline-variant">
              {[
                { value: '50,000+', label: 'Titles catalogued' },
                { value: '14,000+', label: 'Active curators' },
                { value: 'Zero', label: 'Ads or algorithm' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-[20px] font-bold text-on-surface" style={{ letterSpacing: '-0.02em' }}>{s.value}</div>
                  <div className="text-[11px] text-on-surface-variant uppercase tracking-[0.08em] mt-1 font-mono">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: poster collage */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 80, damping: 16, delay: 0.25 }}
            className="flex-1 relative min-h-[500px] hidden lg:block"
          >
            <HeroGallery />
          </motion.div>
        </section>

        {/* Android app download banner */}
        <section className="max-w-[1280px] mx-auto px-12 w-full pb-16">
          <div className="bg-surface border border-outline-variant rounded-2xl p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center">
                <Smartphone size={22} className="text-primary" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="font-semibold text-[17px] text-on-surface mb-1" style={{ letterSpacing: '-0.01em' }}>
                  Get Reelstack on Android
                </h3>
                <p className="text-[14px] leading-[1.6] text-on-surface-variant max-w-[52ch]">
                  Direct APK download — no Play Store required. You&apos;ll need to allow installs from unknown sources. iOS is coming soon.
                </p>
              </div>
            </div>
            <a
              href={ANDROID_APK_URL}
              download
              className="shrink-0 inline-flex items-center gap-2 bg-primary text-on-primary font-semibold px-6 py-3 rounded-full text-[15px] transition-all hover:opacity-90 active:scale-[0.97] whitespace-nowrap"
            >
              <Download size={17} strokeWidth={2} />
              Download APK
            </a>
          </div>
          <div className="font-mono text-[11px] text-on-surface-variant uppercase tracking-[0.08em] mt-2.5 ml-1">
            v1.0.0 · Android 8+
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-[1280px] mx-auto px-12 w-full">
          <div className="h-px bg-outline-variant" />
        </div>

        {/* Features section */}
        <section className="max-w-[1280px] mx-auto px-12 py-20 w-full">
          <div className="font-mono text-[12px] tracking-[0.1em] text-primary uppercase mb-3">Why Reelstack</div>
          <h2
            className="font-bold text-[36px] text-on-surface mb-12 max-w-[20ch]"
            style={{ letterSpacing: '-0.02em' }}
          >
            A shelf you actually own.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-surface border border-outline-variant rounded-2xl p-7"
              >
                <f.icon size={26} className="text-primary mb-[18px]" strokeWidth={1.75} />
                <h3 className="font-semibold text-[19px] text-on-surface mb-2" style={{ letterSpacing: '-0.01em' }}>{f.title}</h3>
                <p className="text-[14px] leading-[1.6] text-on-surface-variant">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bento showcase (live interactive demos) */}
        <section className="w-full py-20 bg-gradient-to-b from-background to-surface-container">
          <BentoShowcase />
        </section>

      </main>

      {/* Footer */}
      <footer className="max-w-[1280px] mx-auto px-12 py-8 w-full flex justify-between items-center border-t border-outline-variant">
        <span className="font-bold text-primary" style={{ letterSpacing: '-0.02em' }}>Reelstack</span>
        <span className="font-mono text-[11px] text-on-surface-variant uppercase tracking-[0.08em]">
          No ads. No algorithm. Pure curation.
        </span>
        <div className="flex gap-6 text-[13px] text-on-surface-variant">
          <Link href="/privacy" className="hover:text-on-surface transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-on-surface transition-colors">Terms</Link>
        </div>
      </footer>
    </div>
  )
}
