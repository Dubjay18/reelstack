import React from 'react';
import { Modal, StyleSheet, View, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors, Radius } from '@/constants/theme';

interface BottomSheetProps {
  isPresented: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ isPresented, onDismiss, children }) => {
  return (
    <Modal
      visible={isPresented}
      animationType="slide"
      transparent={true}
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetOverlay}
      >
        {/* Tapping outside the sheet dismisses it */}
        <Pressable style={styles.sheetDismiss} onPress={onDismiss} />
        
        <View style={styles.sheetContent}>
          {/* Handle bar indicator at the top */}
          <View style={styles.sheetHandle} />
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetDismiss: {
    flex: 1,
  },
  sheetContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(60, 73, 71, 0.4)',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(229, 225, 228, 0.2)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
});
export default BottomSheet;
