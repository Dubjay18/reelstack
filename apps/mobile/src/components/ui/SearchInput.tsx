import React, { useState } from 'react';
import { StyleSheet, TextInput, View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/constants/theme';
import Animated, { useSharedValue, useAnimatedStyle, interpolateColor, withTiming } from 'react-native-reanimated';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChangeText,
  placeholder = 'Search movies & TV shows...',
  autoFocus = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const focusProgress = useSharedValue(0);

  const handleFocus = () => {
    setIsFocused(true);
    focusProgress.value = withTiming(1, { duration: 200 });
  };

  const handleBlur = () => {
    setIsFocused(false);
    focusProgress.value = withTiming(0, { duration: 200 });
  };

  const animatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusProgress.value,
      [0, 1],
      ['rgba(60, 73, 71, 0.5)', Colors.primary]
    );
    return {
      borderColor,
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <MaterialIcons 
        name="search" 
        size={20} 
        color={isFocused ? Colors.primary : Colors.onSurfaceVariant} 
        style={styles.icon} 
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.onSurfaceVariant + '80'}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoFocus={autoFocus}
        style={[styles.input]}
        keyboardAppearance="dark"
        clearButtonMode="never"
        selectionColor={Colors.primary}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} style={styles.clearButton}>
          <MaterialIcons name="cancel" size={18} color={Colors.onSurfaceVariant} />
        </Pressable>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderRadius: Radius.md,
    height: 48,
    paddingHorizontal: Spacing.sm,
  },
  icon: {
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    color: Colors.onSurface,
    height: '100%',
    padding: 0,
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
});
export default SearchInput;
