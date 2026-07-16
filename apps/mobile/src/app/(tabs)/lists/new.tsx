import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Radius, Typography, Shadow, Spacing } from '@/constants/theme';
import { useCreateList } from '@/lib/hooks/api';
import { useToast } from '@/contexts/ToastContext';
import { MaterialIcons } from '@expo/vector-icons';
import { Switch } from 'react-native';
import { useAuthGuard } from '@/hooks/useAuthGuard';

export default function CreateListScreen() {
  const { isAuthorized } = useAuthGuard();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const router = useRouter();
  const { showToast } = useToast();
  const createListMutation = useCreateList();

  if (!isAuthorized) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const handleCreate = async () => {
    if (!title.trim()) {
      showToast('Please enter a list title', 'error');
      return;
    }

    try {
      const newList = await createListMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        is_public: isPublic,
      });

      showToast('List created successfully!', 'success');
      
      // Navigate to newly created list detail screen
      router.replace(`/(tabs)/lists/${newList.id}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to create list', 'error');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
          </Pressable>
          <Text style={[Typography.heading, styles.headerTitle]}>New List</Text>
          <View style={{ width: 40 }} /> {/* balance layout */}
        </View>

        <View style={styles.form}>
          {/* Title */}
          <Text style={[Typography.caption, styles.label]}>List Title</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Cyberpunk Masterpieces"
              placeholderTextColor={Colors.onSurfaceVariant + '80'}
              style={[Typography.bodyLg, styles.input]}
              selectionColor={Colors.primary}
              keyboardAppearance="dark"
              maxLength={100}
            />
          </View>

          {/* Description */}
          <Text style={[Typography.caption, styles.label]}>Description (Optional)</Text>
          <View style={[styles.inputWrapper, styles.multilineWrapper]}>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What is this list about?"
              placeholderTextColor={Colors.onSurfaceVariant + '80'}
              multiline
              numberOfLines={4}
              style={[Typography.bodyLg, styles.input, styles.multilineInput]}
              selectionColor={Colors.primary}
              keyboardAppearance="dark"
              maxLength={500}
            />
          </View>

          {/* Privacy Switch Option */}
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={[Typography.bodyLg, styles.switchLabel]}>Public List</Text>
              <Text style={[Typography.caption, styles.switchSubtitle]}>
                {isPublic 
                  ? 'Anyone can view this list and search for it.' 
                  : 'Only you can view and edit this list.'}
              </Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: Colors.surfaceVariant, true: Colors.primary }}
              thumbColor={isPublic ? Colors.onPrimary : Colors.outline}
            />
          </View>

          {/* Submit Button */}
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.submitButtonPressed,
              createListMutation.isPending && styles.submitButtonDisabled,
            ]}
            onPress={handleCreate}
            disabled={createListMutation.isPending}
          >
            {createListMutation.isPending ? (
              <ActivityIndicator color={Colors.onPrimary} size="small" />
            ) : (
              <Text style={[Typography.bodyLg, styles.submitButtonText]}>Create List</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
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
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingTop: 60,
    paddingHorizontal: Spacing.gutter,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  headerTitle: {
    color: Colors.onSurface,
    fontWeight: '600',
  },
  form: {
    flex: 1,
  },
  label: {
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(60, 73, 71, 0.4)',
    borderRadius: Radius.md,
    height: 50,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
    justifyContent: 'center',
  },
  multilineWrapper: {
    height: 120,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  input: {
    color: Colors.onSurface,
    width: '100%',
  },
  multilineInput: {
    height: '100%',
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLow,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(60, 73, 71, 0.3)',
    marginBottom: Spacing.xl,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  switchLabel: {
    color: Colors.onSurface,
    fontWeight: '600',
    marginBottom: 2,
  },
  switchSubtitle: {
    color: Colors.onSurfaceVariant,
    opacity: 0.8,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
    marginBottom: Spacing.xl,
  },
  submitButtonPressed: {
    opacity: 0.9,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.onPrimary,
    fontWeight: '600',
  },
});
