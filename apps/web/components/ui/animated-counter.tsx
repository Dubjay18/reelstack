"use client"

import { useEffect, useMemo, useRef } from 'react'
import { motion, useInView, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'

// Matches leading digits/commas so "50,000+" animates the number and keeps
// trailing text ("+") static, and non-numeric values ("Zero") just render as-is.
function parseValue(raw: string): { prefix: string; digits: number; suffix: string } | null {
  const match = raw.match(/^([^\d]*)([\d,]+)(.*)$/)
  if (!match) return null
  const [, prefix, digitsStr, suffix] = match
  return { prefix, digits: Number(digitsStr.replace(/,/g, '')), suffix }
}

export function AnimatedCounter({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  // Vertical-only inset — a symmetric '-10%' also shrinks the left/right
  // edges, which never fires for stats sitting near the viewport's left edge.
  const isInView = useInView(ref, { once: true, margin: '-10% 0px -10% 0px' })
  const prefersReducedMotion = useReducedMotion()
  // Memoized on `value` alone — a fresh object every render would tear down
  // and rebuild the spring subscription below on every render, racing with
  // framer-motion's update tick and silently dropping the animation.
  const parsed = useMemo(() => parseValue(value), [value])

  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { stiffness: 60, damping: 20 })

  useEffect(() => {
    if (isInView && parsed) {
      motionValue.set(parsed.digits)
    }
  }, [isInView, parsed, motionValue])

  useEffect(() => {
    if (!ref.current) return
    return spring.on('change', (latest) => {
      if (ref.current && parsed) {
        ref.current.textContent = `${parsed.prefix}${Math.round(latest).toLocaleString()}${parsed.suffix}`
      }
    })
  }, [spring, parsed])

  if (!parsed || prefersReducedMotion) {
    return <span ref={ref}>{value}</span>
  }

  return <motion.span ref={ref}>{parsed.prefix}0{parsed.suffix}</motion.span>
}
