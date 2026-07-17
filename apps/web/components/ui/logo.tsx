import { cn } from '@/lib/utils'

const PETAL_COUNT = 9
const OUTER_R = 46
const INNER_R = 10
const SPREAD = (13 * Math.PI) / 180

/**
 * 9-fold radial "aperture" mark — tapered petals radiating from a center point.
 * Geometry ported from the design handoff's petalPath(); pure trig, no deps.
 */
// Fixed precision keeps the number->string formatting deterministic across
// server/client JS engines — raw float output can differ in the last digit
// and trips a React hydration mismatch.
const r = (n: number) => Math.round(n * 1000) / 1000

export function petalPath(cx: number, cy: number, angle: number, outerR: number, innerR: number, spread: number) {
  const tipX = r(cx + Math.cos(angle) * outerR)
  const tipY = r(cy + Math.sin(angle) * outerR)
  const a1 = angle - spread * 2.2
  const a2 = angle + spread * 2.2
  const b1x = r(cx + Math.cos(angle - spread * 4) * innerR)
  const b1y = r(cy + Math.sin(angle - spread * 4) * innerR)
  const b2x = r(cx + Math.cos(angle + spread * 4) * innerR)
  const b2y = r(cy + Math.sin(angle + spread * 4) * innerR)
  const midR = outerR * 0.55
  const m1x = r(cx + Math.cos(a1) * midR)
  const m1y = r(cy + Math.sin(a1) * midR)
  const m2x = r(cx + Math.cos(a2) * midR)
  const m2y = r(cy + Math.sin(a2) * midR)
  return `M ${b1x} ${b1y} Q ${m1x} ${m1y} ${tipX} ${tipY} Q ${m2x} ${m2y} ${b2x} ${b2y} A ${innerR} ${innerR} 0 0 1 ${b1x} ${b1y} Z`
}

export function petalAngle(i: number, count = PETAL_COUNT) {
  return (i / count) * Math.PI * 2 - Math.PI / 2
}

export const LOGO_ACCENT = '#eb9c3e'
export const LOGO_ON_LIGHT = '#d9552b'

interface LogoMarkProps {
  size?: number
  color?: string
  className?: string
}

/** Static icon-only mark — use on dark backgrounds (accent fill) or light ones (terracotta fill). */
export function LogoMark({ size = 28, color = LOGO_ACCENT, className }: LogoMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      {Array.from({ length: PETAL_COUNT }, (_, i) => (
        <path key={i} d={petalPath(50, 50, petalAngle(i), OUTER_R, INNER_R, SPREAD)} fill={color} />
      ))}
    </svg>
  )
}

interface LogoProps {
  size?: number
  className?: string
  textClassName?: string
  color?: string
  textColor?: string
}

/** Icon + wordmark lockup. */
export function Logo({ size = 28, className, textClassName, color, textColor }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={size} color={color} />
      <span
        className={cn('font-bold text-[18px] text-on-surface', textClassName)}
        style={{ letterSpacing: '-0.02em', color: textColor }}
      >
        Reelstack
      </span>
    </div>
  )
}
