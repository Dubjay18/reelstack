'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { useSaveList, useUnsaveList, useSaveStatus } from '@/lib/hooks/api'

interface SaveButtonProps {
  listId: string
  listOwnerId: string
}

export function SaveButton({ listId, listOwnerId }: SaveButtonProps) {
  const { user } = useAuth()
  const router = useRouter()

  const isSelf = user?.id === listOwnerId
  const { data: status, isLoading } = useSaveStatus(listId, !!user && !isSelf)

  const saveMutation = useSaveList(listId)
  const unsaveMutation = useUnsaveList(listId)

  if (isSelf) {
    return null
  }

  const isSaved = status?.saved ?? false
  const saveCount = status?.save_count ?? 0
  const isPending = saveMutation.isPending || unsaveMutation.isPending

  const handleToggle = async () => {
    if (!user) {
      router.push('/login')
      return
    }
    if (isPending) return
    if (isSaved) {
      unsaveMutation.mutate()
    } else {
      saveMutation.mutate()
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading || isPending}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm self-start ${
        isSaved
          ? 'text-primary bg-primary/10 border border-primary/30 hover:bg-primary/20'
          : 'text-zinc-300 border border-zinc-800 hover:border-primary/50 hover:text-primary'
      } disabled:opacity-50`}
    >
      {isPending ? (
        <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <span className="material-symbols-outlined text-[16px]">
          {isSaved ? 'bookmark' : 'bookmark_border'}
        </span>
      )}
      <span>{isSaved ? 'Saved' : 'Save'}</span>
      {saveCount > 0 && (
        <span className="text-xs text-zinc-500 ml-1">({saveCount})</span>
      )}
    </button>
  )
}
