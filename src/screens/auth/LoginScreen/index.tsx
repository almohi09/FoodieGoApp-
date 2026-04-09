import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input } from '../../../components/common';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { colors, spacing, typography } from '../../../theme';
import { showToast } from '../../../utils/toast';
import { useAuthStore } from '../../../store/authStore';

type LoginNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginNavigationProp>();
  const signInWithEmail = useAuthStore(state => state.signInWithEmail);
  const isLoading = useAuthStore(state => state.isLoading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

  const validate = (): boolean => {
    let valid = true;
    if (!EMAIL_REGEX.test(email.trim().toLowerCase())) {
      setEmailError('Enter a valid email address.');
      valid = false;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      valid = false;
    }
    return valid;
  };

  const handleLogin = async () => {
    setEmailError(undefined);
    setPasswordError(undefined);

    if (!validate()) {
      return;
    }

    const result = await signInWithEmail(email.trim().toLowerCase(), password);
    if (!result.success) {
      showToast(result.error || 'Login failed');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Login</Text>
        <Text style={styles.subtitle}>Use your email and password to continue.</Text>

        <Input
          label="Email"
          value={email}
          onChangeText={value => {
            setEmail(value);
            if (emailError) {
              setEmailError(undefined);
            }
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="you@example.com"
          error={emailError}
        />

        <Input
          label="Password"
          value={password}
          onChangeText={value => {
            setPassword(value);
            if (passwordError) {
              setPasswordError(undefined);
            }
          }}
          secureTextEntry
          placeholder="Enter your password"
          error={passwordError}
        />

        <Button
          title="Login"
          onPress={handleLogin}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
        />

        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('PhoneEntry')} style={styles.linkButton}>
          <Text style={styles.linkText}>Use phone OTP instead</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Signup')} style={styles.linkButton}>
          <Text style={styles.secondaryLinkText}>Create a new account</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxxl,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  button: {
    marginTop: spacing.md,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  linkText: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
  secondaryLinkText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

export default LoginScreen;

