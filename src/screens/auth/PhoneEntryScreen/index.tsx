import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Button, Input } from '../../../components/common';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { colors, spacing, typography } from '../../../theme';
import { useAuthStore } from '../../../store/authStore';
import { showToast } from '../../../utils/toast';

type PhoneEntryNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PhoneEntry'
>;

const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

export const PhoneEntryScreen: React.FC = () => {
  const navigation = useNavigation<PhoneEntryNavigationProp>();
  const signInWithPhone = useAuthStore(state => state.signInWithPhone);
  const isLoading = useAuthStore(state => state.isLoading);

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | undefined>();

  const isPhoneValid = useMemo(() => INDIAN_PHONE_REGEX.test(phone), [phone]);

  const handlePhoneChange = (value: string) => {
    const next = value.replace(/[^\d]/g, '').slice(0, 10);
    setPhone(next);
    if (phoneError) {
      setPhoneError(undefined);
    }
  };

  const handleSendOtp = async () => {
    if (!INDIAN_PHONE_REGEX.test(phone)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    const fullPhone = `+91${phone}`;
    const result = await signInWithPhone(fullPhone);
    if (!result.success) {
      showToast(result.error || 'Failed to send OTP');
      return;
    }

    showToast('OTP sent successfully');
    navigation.navigate('OTPVerify', { phone: fullPhone });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Login with phone</Text>
        <Text style={styles.subtitle}>
          Enter your mobile number to receive a one-time password.
        </Text>

        <View style={styles.phoneRow}>
          <View style={styles.countryPicker}>
            <Text style={styles.flag}>🇮🇳</Text>
            <Text style={styles.countryCode}>+91</Text>
          </View>
          <Input
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="number-pad"
            placeholder="10-digit mobile number"
            containerStyle={styles.phoneInputContainer}
            style={styles.phoneInput}
            maxLength={10}
            error={phoneError}
          />
        </View>

        <Button
          title="Send OTP"
          onPress={handleSendOtp}
          loading={isLoading}
          disabled={!isPhoneValid || isLoading}
          style={styles.primaryButton}
        />

        <TouchableOpacity activeOpacity={0.7}
          onPress={() => navigation.navigate('Login')}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>Use email and password instead</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7}
          onPress={() => navigation.navigate('Signup')}
          style={styles.linkButton}
        >
          <Text style={styles.secondaryLinkText}>
            New here? Create an account
          </Text>
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
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  countryPicker: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    marginTop: 25,
  },
  flag: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  countryCode: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  phoneInputContainer: {
    flex: 1,
  },
  phoneInput: {
    height: 50,
  },
  primaryButton: {
    marginTop: spacing.sm,
  },
  linkButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
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

export default PhoneEntryScreen;

