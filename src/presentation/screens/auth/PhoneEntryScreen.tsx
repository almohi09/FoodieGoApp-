import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../../../theme';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Button, Input } from '../../components/common';
import { authService } from '../../../data/api/authService';

type PhoneEntryNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PhoneEntry'>;

export const PhoneEntryScreen: React.FC = () => {
  const navigation = useNavigation<PhoneEntryNavigationProp>();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (phone.length !== 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit phone number.');
      return;
    }

    setLoading(true);

    try {
      const fullPhone = `+91${phone}`;
      const result = await authService.sendOTP(fullPhone);
      if (result.success) {
        navigation.navigate('OTPVerify', { phone: fullPhone });
      } else {
        Alert.alert('OTP Failed', result.message || 'Unable to send OTP');
      }
    } catch {
      Alert.alert('OTP Failed', 'Unable to send OTP right now. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>📱</Text>
          <Text style={styles.title}>Enter your phone number</Text>
          <Text style={styles.subtitle}>
            We'll send you a verification code to verify your account
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.phoneInputContainer}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>+91</Text>
            </View>
            <Input
              value={phone}
              onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, '').slice(0, 10))}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              containerStyle={styles.phoneInput}
              leftIcon={null}
            />
          </View>

          <Button
            title="Send OTP"
            onPress={handleSendOTP}
            loading={loading}
            disabled={phone.length !== 10}
            style={styles.button}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.terms}>
            By continuing, you agree to our{' '}
            <Text style={styles.link}>Terms of Service</Text> and{' '}
            <Text style={styles.link}>Privacy Policy</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={styles.demoLogin}
          onPress={() => navigation.navigate('MainTabs')}
        >
          <Text style={styles.demoLoginText}>Continue as Guest</Text>
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
    paddingTop: spacing.xxxl * 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  form: {
    marginBottom: spacing.xl,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  countryCode: {
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  countryCodeText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    marginBottom: 0,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  button: {
    width: '100%',
  },
  footer: {
    marginTop: 'auto',
    marginBottom: spacing.xl,
  },
  terms: {
    ...typography.small,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: colors.primary,
  },
  demoLogin: {
    alignSelf: 'center',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  demoLoginText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
});
