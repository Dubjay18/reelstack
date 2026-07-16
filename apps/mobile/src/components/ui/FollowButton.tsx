import React from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useFollowUser, useUnfollowUser, useFollowStatus } from '@/lib/hooks/api';

interface FollowButtonProps {
  targetUserId: string;
  targetUsername: string;
  variant?: 'full' | 'compact';
}

export function FollowButton({ targetUserId, targetUsername, variant = 'full' }: FollowButtonProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isSelf = user?.id === targetUserId;

  const { data: followStatus, isLoading: isFollowStatusLoading } = useFollowStatus(
    targetUserId,
    !!user && !isSelf && !!targetUserId
  );

  const followMutation = useFollowUser(targetUserId);
  const unfollowMutation = useUnfollowUser(targetUserId);

  const isFollowing = followStatus?.is_following ?? false;
  const isPending = followMutation.isPending || unfollowMutation.isPending;

  if (!user || isSelf || !targetUserId) return null;

  const handleToggle = () => {
    if (isPending) return;
    if (isFollowing) {
      unfollowMutation.mutate(undefined, {
        onSuccess: () => showToast(`Unfollowed @${targetUsername}`, 'success'),
        onError: (err: any) => showToast(err?.message || 'Failed to unfollow', 'error'),
      });
    } else {
      followMutation.mutate(undefined, {
        onSuccess: () => showToast(`Following @${targetUsername}`, 'success'),
        onError: (err: any) => showToast(err?.message || 'Failed to follow', 'error'),
      });
    }
  };

  const isCompact = variant === 'compact';

  return (
    <Pressable
      onPress={handleToggle}
      disabled={isFollowStatusLoading || isPending}
      style={[
        styles.button,
        isCompact ? styles.buttonCompact : styles.buttonFull,
        isFollowing ? styles.followingActive : styles.followActive,
        isPending && { opacity: 0.7 },
      ]}
    >
      {!isCompact && (
        <MaterialIcons
          name={isFollowing ? 'person-remove' : 'person-add'}
          size={16}
          color={isFollowing ? Colors.onSurfaceVariant : Colors.onPrimary}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          isCompact ? Typography.caption : Typography.bodySm,
          isFollowing ? styles.followingText : styles.followText,
        ]}
      >
        {isPending ? 'Saving...' : isFollowing ? 'Unfollow' : 'Follow'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  buttonFull: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    width: '60%',
  },
  buttonCompact: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  followActive: {
    backgroundColor: Colors.primary,
  },
  followText: {
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  followingActive: {
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  followingText: {
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  icon: {
    marginRight: Spacing.xs,
  },
});
