'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'

interface ShareButtonProps {
  url?: string
}

export function ShareButton({ url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '')
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={handleShare}
        aria-label="Share"
        className="p-xs bg-surface-container border border-outline-variant rounded-md text-on-surface hover:bg-surface-container-high transition-colors relative active:scale-95 duration-150 flex items-center justify-center"
      >
        <Share2 size={18} strokeWidth={1.75} />
      </button>
      {copied && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-surface-container-highest text-on-surface text-[10px] rounded shadow-lg whitespace-nowrap animate-pulse">
          Copied!
        </span>
      )}
    </div>
  )
}
