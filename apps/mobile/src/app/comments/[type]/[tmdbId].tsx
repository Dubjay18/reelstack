import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useComments, useCreateComment, useDeleteComment } from '@/lib/hooks/api';
import type { Comment } from '@/types';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function groupReplies(comments: Comment[]): Comment[] {
  const map = new Map<string, Comment>();
  const topLevel: Comment[] = [];
  for (const c of comments) {
    map.set(c.id, { ...c, replies: [] });
  }
  for (const c of map.values()) {
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.replies!.push(c);
    } else {
      topLevel.push(c);
    }
  }
  return topLevel;
}

function CommentThread({
  comment,
  tmdbId,
  mediaType,
  currentUserId,
  isReply = false,
}: {
  comment: Comment;
  tmdbId: number;
  mediaType: string;
  currentUserId: string | null;
  isReply?: boolean;
}) {
  const deleteComment = useDeleteComment();
  const isOwner = currentUserId === comment.user_id;

  const handleDelete = () => {
    Alert.alert('Delete comment?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteComment.mutate({ commentId: comment.id, tmdbId, mediaType }),
      },
    ]);
  };

  return (
    <View style={isReply ? styles.replyWrapper : undefined}>
      <View style={styles.row}>
        <View style={styles.avatarWrapper}>
          {comment.avatar_url ? (
            <Image source={{ uri: comment.avatar_url }} style={styles.avatar} contentFit="cover" />
          ) : (
            <Text style={styles.avatarInitial}>{(comment.username?.[0] ?? '?').toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowHeader}>
            <Text style={[Typography.bodySm, styles.username]}>{comment.username ?? 'anonymous'}</Text>
            <Text style={styles.timeText}>{timeAgo(comment.created_at)}</Text>
          </View>
          <Text style={[Typography.bodySm, styles.body]}>{comment.body}</Text>
          {isOwner && (
            <Pressable onPress={handleDelete} disabled={deleteComment.isPending}>
              <Text style={styles.deleteText}>{deleteComment.isPending ? 'Deleting...' : 'Delete'}</Text>
            </Pressable>
          )}
        </View>
      </View>
      {comment.replies?.map((reply) => (
        <CommentThread
          key={reply.id}
          comment={reply}
          tmdbId={tmdbId}
          mediaType={mediaType}
          currentUserId={currentUserId}
          isReply
        />
      ))}
    </View>
  );
}

export default function CommentsScreen() {
  const { type, tmdbId } = useLocalSearchParams<{ type: string; tmdbId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [body, setBody] = useState('');

  const mediaType = type || 'movie';
  const tmdbIdNum = Number(tmdbId);

  const { data: rawComments, isLoading } = useComments(tmdbIdNum, mediaType);
  const createComment = useCreateComment();

  const comments = useMemo(() => (rawComments ? groupReplies(rawComments) : []), [rawComments]);

  const handlePost = () => {
    if (!body.trim()) return;
    createComment.mutate(
      { tmdbId: tmdbIdNum, mediaType, body: body.trim() },
      { onSuccess: () => setBody('') }
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
        </Pressable>
        <Text style={[Typography.heading, styles.headerTitle]}>
          Comments{comments.length > 0 ? ` (${comments.length})` : ''}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <CommentThread
              comment={item}
              tmdbId={tmdbIdNum}
              mediaType={mediaType}
              currentUserId={user?.id ?? null}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="forum" size={36} color={Colors.onSurfaceVariant} style={{ opacity: 0.3 }} />
              <Text style={styles.emptyText}>No comments yet. Be the first to share your thoughts!</Text>
            </View>
          }
        />
      )}

      {user ? (
        <View style={styles.composer}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Share your thoughts..."
            placeholderTextColor={Colors.onSurfaceVariant}
            style={styles.input}
            multiline
            maxLength={1000}
            keyboardAppearance="dark"
          />
          <Pressable
            onPress={handlePost}
            disabled={!body.trim() || createComment.isPending}
            style={[styles.postButton, (!body.trim() || createComment.isPending) && { opacity: 0.5 }]}
          >
            <Text style={styles.postButtonText}>{createComment.isPending ? 'Posting...' : 'Post'}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.loginPrompt}>
          <Pressable onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginPromptText}>Log in to leave a comment</Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBar: {
    paddingTop: 50,
    height: 94,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.gutter,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerLow,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    color: Colors.onSurface,
    fontWeight: '600',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.gutter,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  replyWrapper: {
    marginLeft: Spacing.lg,
    paddingLeft: Spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: Colors.surfaceContainerLow,
  },
  avatarWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 32,
    height: 32,
  },
  avatarInitial: {
    color: Colors.onSurfaceVariant,
    fontWeight: '700',
    fontSize: 12,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  username: {
    color: Colors.onSurface,
    fontWeight: '600',
  },
  timeText: {
    color: Colors.onSurfaceVariant,
    fontSize: 11,
    opacity: 0.6,
  },
  body: {
    color: Colors.onSurfaceVariant,
    lineHeight: 19,
  },
  deleteText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: Spacing.sm,
  },
  emptyText: {
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    padding: Spacing.gutter,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerLow,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  postButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  postButtonText: {
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  loginPrompt: {
    padding: Spacing.gutter,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerLow,
    alignItems: 'center',
  },
  loginPromptText: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
