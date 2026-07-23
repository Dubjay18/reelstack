'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useListComments, useCreateListComment, useDeleteListComment } from '@/lib/hooks/api'
import { useAuth } from '@/components/providers/auth-provider'
import { MessageCircle, MessagesSquare, Sparkles } from 'lucide-react'
import type { ListComment } from '@/types'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function groupReplies(comments: ListComment[]): ListComment[] {
  const map = new Map<string, ListComment>()
  const topLevel: ListComment[] = []
  for (const c of comments) {
    map.set(c.id, { ...c, replies: [] })
  }
  for (const c of map.values()) {
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.replies!.push(c)
    } else {
      topLevel.push(c)
    }
  }
  return topLevel
}

function ListCommentForm({
  listId,
  parentId,
  onCancel,
  placeholder,
}: {
  listId: string
  parentId?: string
  onCancel?: () => void
  placeholder?: string
}) {
  const [body, setBody] = useState('')
  const [type, setType] = useState<'comment' | 'suggestion'>('comment')
  const createComment = useCreateListComment()

  const handleSubmit = async () => {
    if (!body.trim()) return
    await createComment.mutateAsync({ listId, body: body.trim(), type, parentId })
    setBody('')
    setType('comment')
    onCancel?.()
  }

  return (
    <div className="flex flex-col gap-2">
      {!parentId && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setType('comment')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              type === 'comment'
                ? 'bg-primary text-on-primary border-primary'
                : 'border-outline-variant text-on-surface-variant hover:border-primary/50'
            }`}
          >
            Comment
          </button>
          <button
            type="button"
            onClick={() => setType('suggestion')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${
              type === 'suggestion'
                ? 'bg-primary text-on-primary border-primary'
                : 'border-outline-variant text-on-surface-variant hover:border-primary/50'
            }`}
          >
            <Sparkles size={12} strokeWidth={2} />
            Suggest an addition
          </button>
        </div>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder ?? (type === 'suggestion' ? 'What should they add to this list?' : 'Share your thoughts...')}
        maxLength={1000}
        rows={3}
        className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/50 resize-none focus:outline-none focus:border-primary/50 transition-colors"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-on-surface-variant/60 font-mono">{body.length}/1000</span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-on-surface-variant hover:text-on-surface transition-colors px-3 py-1.5"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!body.trim() || createComment.isPending}
            className="text-xs font-bold bg-primary text-on-primary px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createComment.isPending ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ListCommentThread({
  comment,
  listId,
  currentUserId,
  isReply = false,
}: {
  comment: ListComment
  listId: string
  currentUserId: string | null
  isReply?: boolean
}) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const deleteComment = useDeleteListComment()
  const isOwner = currentUserId === comment.user_id

  const handleDelete = async () => {
    if (!confirm('Delete this comment?')) return
    await deleteComment.mutateAsync({ commentId: comment.id, listId })
  }

  return (
    <div className={`${isReply ? 'ml-8 pl-4 border-l border-outline-variant/30' : ''}`}>
      <div className="flex items-start gap-3 py-3">
        <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-xs text-on-surface-variant font-bold shrink-0 overflow-hidden">
          {comment.avatar_url ? (
            <img src={comment.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            (comment.username?.[0] ?? '?').toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-on-surface truncate">
              {comment.username ?? 'anonymous'}
            </span>
            {comment.type === 'suggestion' && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                <Sparkles size={10} strokeWidth={2.5} />
                Suggestion
              </span>
            )}
            <span className="text-xs text-on-surface-variant/60">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap break-words">
            {comment.body}
          </p>
          <div className="flex items-center gap-3 mt-2">
            {currentUserId && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="text-xs text-on-surface-variant/60 hover:text-primary transition-colors"
              >
                Reply
              </button>
            )}
            {isOwner && (
              <button
                onClick={handleDelete}
                disabled={deleteComment.isPending}
                className="text-xs text-on-surface-variant/40 hover:text-error transition-colors"
              >
                {deleteComment.isPending ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
          {showReplyForm && (
            <div className="mt-3">
              <ListCommentForm
                listId={listId}
                parentId={comment.id}
                onCancel={() => setShowReplyForm(false)}
                placeholder={`Reply to ${comment.username ?? 'anonymous'}...`}
              />
            </div>
          )}
        </div>
      </div>
      {comment.replies?.map((reply) => (
        <ListCommentThread key={reply.id} comment={reply} listId={listId} currentUserId={currentUserId} isReply />
      ))}
    </div>
  )
}

export function ListCommentSection({ listId }: { listId: string }) {
  const { data: rawComments, isLoading } = useListComments(listId)
  const { user } = useAuth()
  const currentUserId = user?.id ?? null

  const comments = useMemo(() => {
    if (!rawComments) return []
    return groupReplies(rawComments)
  }, [rawComments])

  if (isLoading) {
    return (
      <section>
        <h3 className="font-section-title text-section-title mb-sm text-on-surface font-semibold flex items-center gap-2">
          <MessageCircle size={18} className="text-primary" strokeWidth={1.75} />
          Comments &amp; Suggestions
        </h3>
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-container-high shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-surface-container-high rounded w-24" />
                <div className="h-3 bg-surface-container-high rounded w-full" />
                <div className="h-3 bg-surface-container-high rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section>
      <h3 className="font-section-title text-section-title mb-sm text-on-surface font-semibold flex items-center gap-2">
        <MessageCircle size={18} className="text-primary" strokeWidth={1.75} />
        Comments &amp; Suggestions{comments.length > 0 ? ` (${comments.length})` : ''}
      </h3>

      {currentUserId ? (
        <div className="mb-6 bg-surface-container/50 p-4 rounded-xl border border-outline-variant/50">
          <ListCommentForm listId={listId} />
        </div>
      ) : (
        <div className="mb-6 bg-surface-container/50 p-4 rounded-xl border border-outline-variant/50 text-center">
          <p className="text-sm text-on-surface-variant">
            <Link href="/login" className="text-primary hover:underline font-semibold">Log in</Link>
            {' '}to comment or suggest an addition
          </p>
        </div>
      )}

      {comments.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-outline-variant/30 rounded-xl bg-surface-container/20">
          <MessagesSquare size={36} className="text-on-surface-variant/30 mx-auto mb-2" strokeWidth={1.25} />
          <p className="text-sm text-on-surface-variant">No comments yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="divide-y divide-outline-variant/20">
          {comments.map((comment) => (
            <ListCommentThread key={comment.id} comment={comment} listId={listId} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </section>
  )
}
