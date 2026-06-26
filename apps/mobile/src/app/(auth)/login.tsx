import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Radius, Typography, Shadow, Spacing } from '@/constants/theme';
import { useLogin } from '@/lib/hooks/api';
import { useToast } from '@/contexts/ToastContext';
import { MaterialIcons } from '@expo/vector-icons';
import { GoogleButton } from '@/components/ui/GoogleButton';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { showToast } = useToast();
  const loginMutation = useLogin();

  const handleLogin = async () => {
    if (!email || !password) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    try {
      await loginMutation.mutateAsync({ email, password });
      showToast('Successfully logged in!', 'success');
      // Redirect to Tabs Dashboard
      router.replace('/(tabs)');
    } catch (err: any) {
      showToast(err.message || 'Login failed. Please check your credentials.', 'error');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Back Button */}
        <Pressable onPress={() => router.replace('/')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
        </Pressable>

        <View style={styles.headerContainer}>
          <Text style={[Typography.displayMd, styles.title]}>Welcome back</Text>
          <Text style={[Typography.bodySm, styles.subtitle]}>
            Sign in to access your film lists and curations
          </Text>
        </View>

        <View style={styles.formContainer}>
          {/* Email field */}
          <Text style={[Typography.caption, styles.label]}>Email Address</Text>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="email" size={18} color={Colors.onSurfaceVariant} style={styles.inputIcon} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              placeholderTextColor={Colors.onSurfaceVariant + '80'}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[Typography.bodyLg, styles.input]}
              selectionColor={Colors.primary}
              keyboardAppearance="dark"
            />
          </View>

          {/* Password field */}
          <Text style={[Typography.caption, styles.label]}>Password</Text>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="lock" size={18} color={Colors.onSurfaceVariant} style={styles.inputIcon} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.onSurfaceVariant + '80'}
              secureTextEntry
              autoCapitalize="none"
              style={[Typography.bodyLg, styles.input]}
              selectionColor={Colors.primary}
              keyboardAppearance="dark"
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.submitButtonPressed,
              loginMutation.isPending && styles.submitButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <ActivityIndicator color={Colors.onPrimary} size="small" />
            ) : (
              <Text style={[Typography.bodyLg, styles.submitButtonText]}>Sign In</Text>
            )}
          </Pressable>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={[Typography.caption, styles.dividerText]}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <GoogleButton />
        </View>

        <View style={styles.footerContainer}>
          <Pressable onPress={() => router.push('/(auth)/register')}>
            <Text style={[Typography.bodySm, styles.footerText]}>
              New to Reelstack? <Text style={styles.footerLink}>Create an account</Text>
            </Text>
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
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.gutter,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  headerContainer: {
    marginBottom: Spacing.xl,
    marginTop: 60,
  },
  title: {
    color: Colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.onSurfaceVariant,
    opacity: 0.8,
  },
  formContainer: {
    marginBottom: Spacing.xl,
  },
  label: {
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(60, 73, 71, 0.4)',
    borderRadius: Radius.md,
    height: 50,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    color: Colors.onSurface,
    height: '100%',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    ...Shadow.card,
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
  footerContainer: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  footerText: {
    color: Colors.onSurfaceVariant,
  },
  footerLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(60, 73, 71, 0.4)',
  },
  dividerText: {
    color: Colors.onSurfaceVariant,
    paddingHorizontal: Spacing.sm,
    opacity: 0.7,
  },
});
