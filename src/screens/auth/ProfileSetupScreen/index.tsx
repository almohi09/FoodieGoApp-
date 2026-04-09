import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Button, Input } from '../../../components/common';
import { colors, spacing, typography } from '../../../theme';
import { useAuthStore } from '../../../store/authStore';
import { showToast } from '../../../utils/toast';

const URL_REGEX = /^https?:\/\/.+/i;

export const ProfileSetupScreen: React.FC = () => {
  const profile = useAuthStore(state => state.profile);
  const updateProfile = useAuthStore(state => state.updateProfile);
  const isLoading = useAuthStore(state => state.isLoading);

  const [name, setName] = useState(profile?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [nameError, setNameError] = useState<string | undefined>();
  const [avatarError, setAvatarError] = useState<string | undefined>();

  const handleSaveProfile = async () => {
    setNameError(undefined);
    setAvatarError(undefined);

    const trimmedName = name.trim();
    const trimmedAvatar = avatarUrl.trim();

    let valid = true;
    if (!trimmedName) {
      setNameError('Name is required.');
      valid = false;
    }
    if (trimmedAvatar && !URL_REGEX.test(trimmedAvatar)) {
      setAvatarError('Enter a valid image URL (http/https).');
      valid = false;
    }
    if (!valid) {
      return;
    }

    const result = await updateProfile({
      name: trimmedName,
      avatar_url: trimmedAvatar || null,
    });

    if (!result.success) {
      showToast(result.error || 'Failed to update profile');
      return;
    }

    showToast('Profile setup complete');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Complete your profile</Text>
        <Text style={styles.subtitle}>
          Add your name and profile photo to continue.
        </Text>

        <Input
          label="Full Name"
          value={name}
          onChangeText={value => {
            setName(value);
            if (nameError) {
              setNameError(undefined);
            }
          }}
          placeholder="Enter your name"
          error={nameError}
        />

        <Input
          label="Profile Photo URL"
          value={avatarUrl}
          onChangeText={value => {
            setAvatarUrl(value);
            if (avatarError) {
              setAvatarError(undefined);
            }
          }}
          placeholder="https://example.com/photo.jpg"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          error={avatarError}
        />

        <Button
          title="Save Profile"
          onPress={handleSaveProfile}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
        />
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
});

export default ProfileSetupScreen;

