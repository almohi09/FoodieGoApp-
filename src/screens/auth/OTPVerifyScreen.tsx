import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Button } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { showToast } from '../../utils/toast';
import { useAuthStore } from '../../store/authStore';

type OTPVerifyNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'OTPVerify'
>;

type OTPVerifyRouteProp = RouteProp<RootStackParamList, 'OTPVerify'>;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export const OTPVerifyScreen: React.FC = () => {
  const navigation = useNavigation<OTPVerifyNavigationProp>();
  const route = useRoute<OTPVerifyRouteProp>();
  const { phone } = route.params;

  const verifyOTP = useAuthStore(state => state.verifyOTP);
  const signInWithPhone = useAuthStore(state => state.signInWithPhone);
  const isLoading = useAuthStore(state => state.isLoading);

  const [otpValues, setOtpValues] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpError, setOtpError] = useState<string | undefined>();
  const [resendTimer, setResendTimer] = useState(RESEND_SECONDS);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const otp = useMemo(() => otpValues.join(''), [otpValues]);

  useEffect(() => {
    if (resendTimer <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setResendTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleOtpChange = (value: string, index: number) => {
    const digit = value.replace(/[^\d]/g, '').slice(-1);
    const next = [...otpValues];
    next[index] = digit;
    setOtpValues(next);

    if (otpError) {
      setOtpError(undefined);
    }

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (
      event.nativeEvent.key === 'Backspace' &&
      otpValues[index] === '' &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH) {
      setOtpError('Enter the 6-digit OTP sent to your phone.');
      return;
    }

    const result = await verifyOTP(phone, otp);
    if (!result.success) {
      setOtpError(result.error || 'Invalid OTP');
      showToast(result.error || 'OTP verification failed');
      return;
    }

    showToast('Phone verified successfully');
  };

  const handleResend = async () => {
    if (resendTimer > 0) {
      return;
    }

    const result = await signInWithPhone(phone);
    if (!result.success) {
      showToast(result.error || 'Failed to resend OTP');
      return;
    }

    setResendTimer(RESEND_SECONDS);
    setOtpValues(Array(OTP_LENGTH).fill(''));
    setOtpError(undefined);
    inputRefs.current[0]?.focus();
    showToast('OTP resent');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>Enter the code sent to {phone}</Text>

        <View style={styles.otpRow}>
          {otpValues.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.otpInput,
                digit ? styles.otpFilled : null,
                otpError ? styles.otpErrorBorder : null,
              ]}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={value => handleOtpChange(value, index)}
              onKeyPress={event => handleKeyPress(event, index)}
              returnKeyType="done"
              textAlign="center"
            />
          ))}
        </View>
        {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}

        <Button
          title="Verify OTP"
          onPress={handleVerify}
          loading={isLoading}
          disabled={otp.length !== OTP_LENGTH || isLoading}
          style={styles.verifyButton}
        />

        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't receive OTP?</Text>
          <TouchableOpacity activeOpacity={0.7} disabled={resendTimer > 0 || isLoading} onPress={handleResend}>
            <Text style={[styles.resendLink, resendTimer > 0 ? styles.resendDisabled : null]}>
              {resendTimer > 0 ? ` Resend in ${resendTimer}s` : ' Resend now'}
            </Text>
          </TouchableOpacity>
        </View>
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
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
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  otpInput: {
    width: 46,
    height: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    ...typography.h4,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  otpFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGhost,
  },
  otpErrorBorder: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.small,
    color: colors.error,
    marginBottom: spacing.md,
  },
  verifyButton: {
    marginTop: spacing.sm,
  },
  resendRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  resendLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  resendLink: {
    ...typography.captionMedium,
    color: colors.primary,
  },
  resendDisabled: {
    color: colors.textTertiary,
  },
});

export default OTPVerifyScreen;
