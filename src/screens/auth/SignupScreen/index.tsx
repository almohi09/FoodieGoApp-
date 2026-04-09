import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input } from '../../../components/common';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { colors, spacing, typography } from '../../../theme';
import { showToast } from '../../../utils/toast';
import { useAuthStore } from '../../../store/authStore';

type SignupNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SignupScreen: React.FC = () => {
  const navigation = useNavigation<SignupNavigationProp>();
  const signUp = useAuthStore(state => state.signUp);
  const isLoading = useAuthStore(state => state.isLoading);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [nameError, setNameError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();

  const validate = (): boolean => {
    let valid = true;

    if (!name.trim()) {
      setNameError('Name is required.');
      valid = false;
    }
    if (!EMAIL_REGEX.test(email.trim().toLowerCase())) {
      setEmailError('Enter a valid email address.');
      valid = false;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      valid = false;
    }
    if (confirmPassword !== password) {
      setConfirmError('Passwords do not match.');
      valid = false;
    }
    return valid;
  };

  const handleSignup = async () => {
    setNameError(undefined);
    setEmailError(undefined);
    setPasswordError(undefined);
    setConfirmError(undefined);

    if (!validate()) {
      return;
    }

    const result = await signUp(
      email.trim().toLowerCase(),
      password,
      name.trim(),
    );

    if (!result.success) {
      showToast(result.error || 'Sign-up failed');
      return;
    }

    if (result.requiresEmailConfirmation) {
      showToast('Check your email to confirm your account, then log in.');
      navigation.navigate('Login');
      return;
    }

    showToast('Account created successfully');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Sign up with email and password.</Text>

        <Input
          label="Name"
          value={name}
          onChangeText={value => {
            setName(value);
            if (nameError) {
              setNameError(undefined);
            }
          }}
          placeholder="Your full name"
          error={nameError}
        />

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
          placeholder="At least 6 characters"
          error={passwordError}
        />

        <Input
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={value => {
            setConfirmPassword(value);
            if (confirmError) {
              setConfirmError(undefined);
            }
          }}
          secureTextEntry
          placeholder="Re-enter password"
          error={confirmError}
        />

        <Button
          title="Sign up"
          onPress={handleSignup}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
        />

        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Login')} style={styles.linkButton}>
          <Text style={styles.linkText}>Already have an account? Login</Text>
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
});

export default SignupScreen;

