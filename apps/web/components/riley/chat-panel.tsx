'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles, Star } from 'lucide-react'
import { useRileyChat } from '@/lib/hooks/api'
import type { RileyChatMessage, RileyTopPick } from '@/types'

const suggestedPrompts = [
  'What should I watch tonight?',
  "What's the biggest movie news this week?",
  'Recommend a series like Severance',
]

// A chat entry is a wire message plus, for assistant turns, resolved
// recommendation cards. Only role/content are sent back to the API.
interface ChatEntry extends RileyChatMessage {
  recommendations?: RileyTopPick[]
}

const stripeStyle = {
  background: 'repeating-linear-gradient(135deg, #31261a 0px, #31261a 9px, #241c15 9px, #241c15 18px)',
}

function RecCards({ picks }: { picks: RileyTopPick[] }) {
  return (
    <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pt-2 pb-1">
      {picks.map((pick) => (
        <Link
          key={`${pick.media_type}-${pick.tmdb_id}`}
          href={`/movie/${pick.tmdb_id}?type=${pick.media_type}`}
          title={pick.blurb || pick.title}
          className="group w-[96px] flex-shrink-0"
        >
          <div
            className="w-[96px] h-[144px] rounded-lg relative overflow-hidden border border-outline-variant group-hover:border-primary/50 transition-colors"
            style={pick.poster_path ? undefined : stripeStyle}
          >
            {pick.poster_path && (
              <Image
                src={`https://image.tmdb.org/t/p/w154${pick.poster_path}`}
                alt={pick.title}
                fill
                sizes="96px"
                className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
              />
            )}
            {pick.vote_average > 0 && (
              <div className="absolute top-1 right-1 bg-black/70 rounded px-1 py-0.5 flex items-center gap-0.5">
                <Star size={8} className="text-primary" fill="currentColor" />
                <span className="font-mono text-[9px] text-on-surface">{pick.vote_average.toFixed(1)}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
          </div>
          <div className="mt-1.5 text-[11px] font-semibold text-on-surface line-clamp-2 leading-tight group-hover:text-primary transition-colors">
            {pick.title}
          </div>
          {pick.blurb && (
            <div className="text-[10px] text-primary/80 italic line-clamp-2 leading-tight mt-0.5">{pick.blurb}</div>
          )}
        </Link>
      ))}
    </div>
  )
}

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const chat = useRileyChat()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, chat.isPending])

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || chat.isPending) return
    setError(null)
    const next: ChatEntry[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(next)
    setInput('')
    chat.mutate(next.map(({ role, content }) => ({ role, content })), {
      onSuccess: (data) => {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.reply, recommendations: data.recommendations },
        ])
      },
      onError: (err) => {
        const { status, message } = (err as { status?: number; message?: string }) ?? {}
        // 429s carry a specific server message (per-minute vs daily limit)
        if (status === 429) setError(message || 'Riley needs a breather — try again in a minute.')
        else if (status === 503) setError('Riley is offline right now.')
        else setError("Riley couldn't reply. Try again?")
      },
    })
  }

  return (
    <div className="flex flex-col bg-surface border border-outline-variant rounded-2xl overflow-hidden h-[480px] lg:h-[560px]">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-outline-variant">
        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
          <Sparkles size={14} className="text-primary" />
        </div>
        <span className="font-semibold text-[14px] text-on-surface">Chat with Riley</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4">
            <Sparkles size={22} className="text-primary/60" />
            <p className="text-[13px] text-on-surface-variant">
              Ask Riley anything about movies and series.
            </p>
            <div className="flex flex-col gap-2 w-full">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  className="text-[12.5px] text-on-surface-variant bg-surface-container hover:bg-surface-container-high hover:text-on-surface border border-outline-variant rounded-full px-3.5 py-2 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] bg-primary/15 text-on-surface rounded-2xl rounded-br-md px-3.5 py-2.5 text-[13.5px] leading-relaxed">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-1">
                <Sparkles size={11} className="text-primary" />
              </div>
              <div className="max-w-[85%] min-w-0">
                <div className="bg-surface-container text-on-surface rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
                {msg.recommendations && msg.recommendations.length > 0 && (
                  <RecCards picks={msg.recommendations} />
                )}
              </div>
            </div>
          )
        )}

        {chat.isPending && (
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-1">
              <Sparkles size={11} className="text-primary" />
            </div>
            <div className="bg-surface-container rounded-2xl rounded-bl-md px-3.5 py-3 flex gap-1.5">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="w-1.5 h-1.5 rounded-full bg-on-surface-variant animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-[12.5px] text-error text-center py-1">{error}</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="flex items-center gap-2 px-4 py-3 border-t border-outline-variant"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Riley…"
          className="flex-1 bg-surface-container text-on-surface text-[13.5px] rounded-full px-4 py-2.5 outline-none placeholder:text-on-surface-variant/60 focus:ring-1 focus:ring-primary/40"
        />
        <button
          type="submit"
          disabled={!input.trim() || chat.isPending}
          className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0"
          aria-label="Send"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  )
}
