// Auth layout — split screen: left = form, right = poster collage with pull quote
import { HeroGallery } from '@/components/ui/hero-gallery'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex font-sans">
      {/* Left: form column */}
      <div className="flex-1 flex items-center justify-center p-12 z-10">
        {children}
      </div>

      {/* Right: poster collage panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-[#17120e]">
        <HeroGallery />
        {/* Gradient fade toward the form side */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to right, #17120e, transparent 30%)' }}
        />
        {/* Pull quote at bottom */}
        <div className="absolute bottom-10 left-10 right-10 z-10">
          <div className="font-mono text-[12px] tracking-[0.1em] text-primary uppercase mb-2.5">
            Curator&apos;s log
          </div>
          <p
            className="font-sans italic text-[20px] leading-[1.5] text-on-surface max-w-[36ch]"
            style={{ letterSpacing: '-0.01em' }}
          >
            &ldquo;The best part isn&apos;t the rating. It&apos;s remembering why I gave it one.&rdquo;
          </p>
        </div>
      </div>
    </div>
  )
}
