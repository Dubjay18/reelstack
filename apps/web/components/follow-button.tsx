'use client'

import { useAuth } from '@/components/providers/auth-provider'
import { useFollowUser, useUnfollowUser, useFollowStatus } from '@/lib/hooks/api'

interface FollowButtonProps {
  targetUserId: string
  targetUsername: string
}

export function FollowButton({ targetUserId, targetUsername }: FollowButtonProps) {
  const { user } = useAuth()
  
  // Fetch follow status. Enabled only if logged in and target user is not self.
  const isSelf = user?.id === targetUserId
  const { data: status, isLoading } = useFollowStatus(targetUserId, !!user && !isSelf)
  
  const followMutation = useFollowUser(targetUserId)
  const unfollowMutation = useUnfollowUser(targetUserId)

  // Don't render Follow button for anonymous users or self
  if (!user || isSelf) {
    return null
  }

  const isFollowing = status?.is_following ?? false
  const isPending = followMutation.isPending || unfollowMutation.isPending

  const handleFollowToggle = async () => {
    if (isPending) return
    if (isFollowing) {
      unfollowMutation.mutate()
    } else {
      followMutation.mutate()
    }
  }

  return (
    <button
      onClick={handleFollowToggle}
      disabled={isLoading || isPending}
      className={`px-5 py-1.5 rounded-full font-heading text-body-sm font-semibold transition-all duration-300 ease-out flex items-center justify-center min-w-[100px] border active:scale-95 shadow-md ${
        isFollowing
          ? 'bg-zinc-900 border-zinc-700 hover:border-red-500 hover:text-red-400 hover:bg-zinc-800 text-zinc-300'
          : 'bg-primary border-primary text-background hover:bg-primary/90'
      } disabled:opacity-50`}
    >
      {isPending ? (
        <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
      ) : isFollowing ? (
        'Following'
      ) : (
        'Follow'
      )}
    </button>
  )
}
