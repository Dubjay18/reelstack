import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/constants/theme';

interface EmptyStateProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  buttonText?: string;
  onButtonPress?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  buttonText,
  onButtonPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialIcons name={icon} size={36} color={Colors.primary} />
      </View>
      <Text style={[Typography.heading, styles.title]}>{title}</Text>
      <Text style={[Typography.bodySm, styles.description]}>{description}</Text>
      
      {buttonText && onButtonPress && (
        <Pressable onPress={onButtonPress} style={styles.button}>
          <Text style={[Typography.caption, styles.buttonText]}>{buttonText}</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(60, 73, 71, 0.4)',
    backgroundColor: 'rgba(28, 27, 29, 0.2)',
    marginVertical: Spacing.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(235, 156, 62, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    color: Colors.onSurface,
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '600',
  },
  description: {
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: Spacing.md,
    opacity: 0.7,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  buttonText: {
    color: Colors.onPrimary,
    fontWeight: '600',
  },
});
export default EmptyState;
