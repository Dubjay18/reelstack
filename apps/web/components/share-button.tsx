'use client'

import { useState } from 'react'

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
        className="p-xs bg-surface-container-low border border-outline-variant rounded-md text-on-surface hover:bg-surface-container transition-colors relative active:scale-95 duration-150 flex items-center justify-center"
      >
        <span className="material-symbols-outlined text-[20px]">share</span>
      </button>
      {copied && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-800 text-zinc-100 text-[10px] rounded shadow-lg whitespace-nowrap animate-pulse">
          Copied!
        </span>
      )}
    </div>
  )
}
