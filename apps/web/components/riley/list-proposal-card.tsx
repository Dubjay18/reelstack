'use client'

import Link from 'next/link'
import { Check, Loader2, ListPlus, X } from 'lucide-react'
import type { RileyProposedList, RileyConfirmedList } from '@/types'

export type ListProposalStatus = 'pending' | 'creating' | 'created' | 'cancelled' | 'error'

interface ListProposalCardProps {
  proposal: RileyProposedList
  status: ListProposalStatus
  createdList?: RileyConfirmedList
  errorMessage?: string
  onApprove: () => void
  onCancel: () => void
}

// Riley never creates a list on its own — this card is the only path from
// a proposed list to a real one, and it always requires an explicit tap.
export function ListProposalCard({ proposal, status, createdList, errorMessage, onApprove, onCancel }: ListProposalCardProps) {
  if (status === 'cancelled') {
    return <p className="mt-2 text-[12px] text-on-surface-variant italic">Dismissed.</p>
  }

  if (status === 'created' && createdList) {
    return (
      <div className="mt-2 bg-surface-container border border-primary/30 rounded-xl p-3 flex items-center gap-2">
        <Check size={16} className="text-primary flex-shrink-0" />
        <span className="text-[12.5px] text-on-surface flex-1">
          Created <strong>{proposal.title}</strong> with {createdList.item_count} title{createdList.item_count !== 1 ? 's' : ''}.
        </span>
        <Link href={`/lists/${createdList.id}`} className="text-[12px] text-primary font-semibold hover:underline flex-shrink-0">
          View
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-2 bg-surface-container border border-outline-variant rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <ListPlus size={15} className="text-primary flex-shrink-0" />
        <span className="text-[13px] font-semibold text-on-surface">{proposal.title}</span>
        <span className="text-[10px] font-mono uppercase tracking-wide text-on-surface-variant bg-surface-container-high rounded px-1.5 py-0.5 flex-shrink-0">
          {proposal.is_public ? 'Public' : 'Private'}
        </span>
      </div>
      {proposal.description && <p className="text-[12px] text-on-surface-variant mb-2">{proposal.description}</p>}
      <ul className="text-[12px] text-on-surface-variant mb-3 space-y-0.5">
        {proposal.items.map((item) => (
          <li key={`${item.media_type}-${item.tmdb_id}`}>
            • {item.title}
            {item.year && ` (${item.year})`}
          </li>
        ))}
      </ul>
      {errorMessage && <p className="text-[12px] text-error mb-2">{errorMessage}</p>}
      <div className="flex gap-2">
        <button
          onClick={onApprove}
          disabled={status === 'creating'}
          className="flex-1 bg-primary text-on-primary rounded-lg py-1.5 text-[12.5px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 hover:opacity-90 transition-opacity"
        >
          {status === 'creating' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Approve
        </button>
        <button
          onClick={onCancel}
          disabled={status === 'creating'}
          className="px-3 rounded-lg border border-outline-variant text-on-surface-variant text-[12.5px] hover:bg-surface-container-high transition-colors disabled:opacity-60"
          aria-label="Cancel"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
