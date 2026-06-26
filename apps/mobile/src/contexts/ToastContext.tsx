import React, { createContext, useContext, useState, useCallback } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { Colors, Radius, Typography, Shadow, Spacing } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [visible, setVisible] = useState(false);
  const translateY = useSharedValue(150);
  const insets = useSafeAreaInsets();

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setToastType(type);
    setVisible(true);
    
    // Trigger tactile haptics
    if (type === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (type === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Slide-up spring transition
    translateY.value = withSpring(0, { damping: 15, stiffness: 120 });

    // Auto dismiss after 3 seconds
    setTimeout(() => {
      translateY.value = withTiming(150, { duration: 250 }, (finished) => {
        if (finished) {
          runOnJS(setVisible)(false);
        }
      });
    }, 3000);
  }, []);

  const toastAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: translateY.value === 150 ? 0 : 1,
  }));

  const getBorderColor = () => {
    if (toastType === 'success') return Colors.secondary;
    if (toastType === 'error') return Colors.error;
    return Colors.primary;
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.toastContainer,
            toastAnimatedStyle,
            { bottom: Math.max(insets.bottom, 16) + 16, borderColor: getBorderColor() },
            Shadow.elevated,
          ]}
        >
          <Text numberOfLines={2} style={[Typography.bodySm, styles.toastText]}>
            {message}
          </Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: Spacing.gutter,
    right: Spacing.gutter,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  toastText: {
    color: Colors.onSurface,
    fontWeight: '600',
    textAlign: 'center',
  },
});
