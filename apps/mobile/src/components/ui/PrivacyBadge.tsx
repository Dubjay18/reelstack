import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Colors, Radius, Typography } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';

interface PrivacyBadgeProps {
  isPublic: boolean;
  onPress?: () => void;
}

export const PrivacyBadge: React.FC<PrivacyBadgeProps> = ({ isPublic, onPress }) => {
  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      style={[
        styles.badge,
        isPublic ? styles.publicBadge : styles.privateBadge,
        onPress && styles.interactive,
      ]}
    >
      <MaterialIcons
        name={isPublic ? 'public' : 'lock'}
        size={12}
        color={isPublic ? Colors.primary : Colors.onSurfaceVariant}
        style={styles.icon}
      />
      <Text style={[Typography.caption, isPublic ? styles.publicText : styles.privateText]}>
        {isPublic ? 'Public' : 'Private'}
      </Text>
    </Container>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  publicBadge: {
    backgroundColor: 'rgba(79, 219, 200, 0.1)',
  },
  privateBadge: {
    backgroundColor: Colors.surfaceVariant,
  },
  interactive: {
    opacity: 0.8,
  },
  icon: {
    marginRight: 4,
  },
  publicText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  privateText: {
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
});
