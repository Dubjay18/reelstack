import React from 'react';
import { StyleSheet, Text, Pressable, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Typography, Spacing, Shadow } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useSaveStatus, useSaveList, useUnsaveList } from '@/lib/hooks/api';

interface SaveButtonProps {
  listId: string;
  listOwnerId: string;
}

export function SaveButton({ listId, listOwnerId }: SaveButtonProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isOwner = user?.id === listOwnerId;

  const { data: saveStatus, isLoading: isStatusLoading } = useSaveStatus(listId, !!user && !isOwner);
  const saveMutation = useSaveList(listId);
  const unsaveMutation = useUnsaveList(listId);

  if (!user || isOwner) return null;

  const isSaved = saveStatus?.saved ?? false;
  const isPending = saveMutation.isPending || unsaveMutation.isPending;

  const handleToggle = () => {
    if (isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isSaved) {
      unsaveMutation.mutate(undefined, {
        onSuccess: () => showToast('Removed from saved lists', 'info'),
        onError: (err: any) => showToast(err?.message || 'Failed to unsave list', 'error'),
      });
    } else {
      saveMutation.mutate(undefined, {
        onSuccess: () => showToast('Saved to your lists', 'success'),
        onError: (err: any) => showToast(err?.message || 'Failed to save list', 'error'),
      });
    }
  };

  return (
    <Pressable
      onPress={handleToggle}
      disabled={isStatusLoading || isPending}
      style={[styles.button, isSaved ? styles.buttonSaved : styles.buttonUnsaved]}
    >
      {isPending ? (
        <ActivityIndicator size="small" color={isSaved ? Colors.onSurfaceVariant : Colors.onPrimary} />
      ) : (
        <MaterialIcons
          name={isSaved ? 'bookmark' : 'bookmark-border'}
          size={20}
          color={isSaved ? Colors.onSurfaceVariant : Colors.onPrimary}
        />
      )}
      <Text style={[Typography.bodyLg, isSaved ? styles.textSaved : styles.textUnsaved]}>
        {isSaved ? 'Saved' : 'Save List'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  buttonUnsaved: {
    backgroundColor: Colors.primary,
    ...Shadow.card,
  },
  buttonSaved: {
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  textUnsaved: {
    color: Colors.onPrimary,
    fontWeight: '600',
  },
  textSaved: {
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
});
