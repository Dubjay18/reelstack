import Link from 'next/link'
import Image from 'next/image'

export default function LandingPage() {
  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-sans selection:bg-primary/30 selection:text-primary">
      {/* Main Asymmetric Layout */}
      <main className="flex-grow flex flex-col lg:flex-row relative z-10 overflow-hidden">
        {/* Ambient Glow behind collage */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        
        {/* Left Column: Copy & Actions */}
        <section className="flex-1 flex flex-col justify-center px-lg py-xl lg:pl-[10%] lg:pr-xl z-20">
          <div className="max-w-xl">
            <h1 className="font-display-xl-mobile text-display-xl-mobile lg:font-display-xl lg:text-display-xl text-on-background mb-lg">
              The watchlist that <span className="text-primary">speaks for you.</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-xl max-w-md">
              Reelstack turns what you watch into a public taste profile. Curate collections, discover critically acclaimed cinema, and construct your digital film gallery.
            </p>
            <div className="flex flex-col sm:flex-row gap-md items-start sm:items-center">
              <Link 
                href="/register" 
                className="bg-primary text-on-primary px-lg py-sm rounded-md font-heading text-heading transition-all duration-200 hover:bg-primary-fixed hover:shadow-[0_0_15px_rgba(79,219,200,0.3)] w-full sm:w-auto text-center"
              >
                Get started free
              </Link>
              <Link 
                href="/search" 
                className="bg-transparent border border-outline-variant text-on-background px-lg py-sm rounded-md font-heading text-heading transition-all duration-200 hover:border-primary/50 hover:text-primary hover:bg-primary/5 w-full sm:w-auto text-center"
              >
                Browse a sample
              </Link>
            </div>
          </div>
        </section>

        {/* Right Column: Visual Collage */}
        <section className="flex-1 relative min-h-[500px] lg:min-h-screen flex items-center justify-center p-lg lg:p-0 z-10 overflow-hidden [perspective:1000px]">
          <div className="relative w-full h-full max-w-[600px] max-h-[800px] min-h-[500px]">
            
            {/* Background Poster (Blurred/Faded) */}
            <div className="absolute top-[10%] right-[10%] w-40 md:w-56 poster-aspect rounded-xl overflow-hidden border border-surface-container opacity-40 blur-[2px] transform rotate-6 z-0">
              <Image
                src="/scifi_monolith.png"
                alt="A vintage 1970s science fiction film poster aesthetic. Grainy texture, deep void blacks, and a single piercing beam of harsh white light hitting a brutalist monolithic structure."
                fill
                sizes="(max-width: 768px) 160px, 224px"
                className="object-cover object-center"
                priority
              />
            </div>

            {/* Mid-ground Poster Left */}
            <div className="absolute top-[25%] left-[5%] md:left-[15%] w-48 md:w-64 poster-aspect rounded-xl overflow-hidden border border-outline-variant shadow-[0_20px_40px_rgba(0,0,0,0.8)] transform -rotate-3 transition-transform duration-500 hover:rotate-0 hover:z-30 z-10">
              <Image
                src="/thriller_poster.png"
                alt="Cinematic still of a tense psychological thriller."
                fill
                sizes="(max-width: 768px) 192px, 256px"
                className="object-cover object-center"
                priority
              />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
              <div className="absolute bottom-md left-md right-md">
                <span className="font-body-sm text-body-sm text-on-background line-clamp-2 leading-tight">Nocturnal Animals</span>
              </div>
            </div>

            {/* Foreground Poster Right */}
            <div className="absolute bottom-[20%] right-[5%] md:right-[20%] w-52 md:w-72 poster-aspect rounded-xl overflow-hidden border border-outline-variant shadow-[0_30px_50px_rgba(0,0,0,0.9)] transform rotate-2 transition-transform duration-500 hover:-rotate-1 hover:z-30 z-20">
              <Image
                src="/desert_dusk.png"
                alt="A sweeping, epic wide shot of a desert landscape at dusk."
                fill
                sizes="(max-width: 768px) 208px, 288px"
                className="object-cover object-center"
                priority
              />
              <div className="absolute top-sm right-sm flex gap-xs">
                {/* Watched Indicator */}
                <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_5px_rgba(74,225,118,0.5)]"></div>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end p-md">
                <span className="font-body-sm text-body-sm text-on-background line-clamp-2 leading-tight mb-xs">Dune: Part Two</span>
                <div className="flex gap-sm">
                  <span className="inline-flex items-center justify-center font-mono text-[10px] uppercase text-surface px-2 py-0.5 rounded-full bg-primary font-bold">MUBI</span>
                </div>
              </div>
            </div>

            {/* Floating Sample List Card Overlay */}
            <div className="absolute bottom-[10%] left-[10%] md:left-[5%] glass-panel border border-outline-variant rounded-xl p-md shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] z-40 flex items-center gap-md w-[280px] sm:w-[320px] transform hover:-translate-y-1 transition-transform duration-300">
              {/* Poster Strip Left */}
              <div className="flex -space-x-4 relative shrink-0">
                <div className="w-10 h-16 poster-aspect rounded-sm overflow-hidden border border-surface-container relative z-10 shadow-md">
                  <Image
                    src="/bokeh_neon.png"
                    alt="Late Night Arthouse poster 1"
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
                <div className="w-10 h-16 poster-aspect rounded-sm overflow-hidden border border-surface-container relative z-20 shadow-md">
                  <Image
                    src="/film_grain.png"
                    alt="Late Night Arthouse poster 2"
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
                <div className="w-10 h-16 poster-aspect rounded-sm overflow-hidden border border-surface-container relative z-30 shadow-md">
                  <Image
                    src="/minimal_white.png"
                    alt="Late Night Arthouse poster 3"
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
              </div>
              {/* Metadata Right */}
              <div className="flex flex-col min-w-0">
                <h3 className="font-heading text-heading text-on-background leading-tight truncate">Late Night Arthouse</h3>
                <p className="font-mono text-mono text-on-surface-variant mt-1 opacity-80 truncate">12 films • @director</p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant ml-auto text-[18px] opacity-50 shrink-0">arrow_forward</span>
            </div>

          </div>
        </section>
      </main>

      {/* Footer Strip */}
      <footer className="w-full py-md px-lg lg:px-[10%] flex justify-between items-center border-t border-outline-variant/30 z-20 bg-background/90 backdrop-blur-md shrink-0">
        <div className="font-display-md text-display-md font-bold text-primary tracking-tight">Reelstack</div>
        <div className="font-mono text-mono text-on-surface-variant tracking-wide uppercase text-[11px] opacity-70">
          No ads. No algorithms.
        </div>
      </footer>
    </div>
  )
}
