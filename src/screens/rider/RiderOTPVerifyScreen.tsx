import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator, // size="small"
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../api/authService';
import { showToast } from '../../utils/toast';
import {
  riderAuthStore,
  RiderProfile,
} from '../../store/riderAuthStore';
import { riderService } from '../../api/riderService';

type RiderOTPVerifyNavigationProp = NativeStackNavigationProp<any>;

export const RiderOTPVerifyScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<RiderOTPVerifyNavigationProp>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const phone = (route.params as { phone?: string })?.phone || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const timer =
      resendTimer > 0 &&
      setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendTimer]);

  const handleOTPChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value.replace(/[^0-9]/g, '');
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every(digit => digit) && newOtp.join('').length === 6) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    if (code.length !== 6) {
      showToast('Please enter a valid 6-digit code.', 'error');
      return;
    }

    setLoading(true);

    try {
      const result = await authService.verifyOTP(phone, code);

      if (result.success && result.token) {
        const riderProfileResult = await riderService.getProfile();

        const riderProfile: RiderProfile =
          riderProfileResult.success && riderProfileResult.profile
            ? {
                id: riderProfileResult.profile.id,
                name: riderProfileResult.profile.name,
                phone: riderProfileResult.profile.phone,
                email: riderProfileResult.profile.email,
                vehicleType: riderProfileResult.profile.vehicleType,
                vehicleNumber: riderProfileResult.profile.vehicleNumber,
                isOnline: riderProfileResult.profile.isOnline,
                rating: riderProfileResult.profile.rating,
                totalDeliveries: riderProfileResult.profile.totalDeliveries,
              }
            : {
                id: result.user?.id || 'unknown',
                name: result.user?.name || 'Rider',
                phone: phone,
                isOnline: false,
                rating: 0,
                totalDeliveries: 0,
              };

        await riderAuthStore.saveSession({
          token: result.token,
          refreshToken: result.refreshToken || '',
          profile: riderProfile,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });

        navigation.reset({ index: 0, routes: [{ name: 'RiderDashboard' }] });
      } else {
        showToast(result.message || 'Invalid OTP. Please try again.', 'error');
      }
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer === 0) {
      setLoading(true);
      try {
        const result = await authService.resendOTP(phone);
        if (result.success) {
          setResendTimer(30);
          showToast(`A new OTP has been sent to ${phone}`, 'success');
        } else {
          showToast(result.message || 'Failed to resend OTP. Please try again.', 'error');
        }
      } catch {
        showToast('Failed to resend OTP. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity activeOpacity={0.7} style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryGhost }]}>
            <Icon name="bicycle" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Rider Verification</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Enter the 6-digit code sent to{`\n${phone}`}</Text>
        </View>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.otpInput,
                {
                  borderColor: digit ? colors.primary : colors.border,
                  backgroundColor: colors.surface,
                },
                digit && {
                  backgroundColor: colors.primary + '10',
                  borderColor: colors.primary,
                },
              ]}
              value={digit}
              onChangeText={value => handleOTPChange(value, index)}
              onKeyPress={e => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              placeholder="*"
              placeholderTextColor={colors.textTertiary}
            />
          ))}
        </View>

        <TouchableOpacity activeOpacity={0.7}
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => handleVerify()}
          disabled={loading || otp.join('').length !== 6}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.surface }]}>Verify and Continue</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={[styles.resendText, { color: colors.textSecondary }]}>Did not receive the code? </Text>
          <TouchableOpacity activeOpacity={0.7} onPress={handleResend} disabled={resendTimer > 0}>
            <Text
              style={[
                styles.resendLink,
                { color: colors.primary },
                resendTimer > 0 && { color: colors.textTertiary },
              ]}
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  header: { alignItems: 'center', marginBottom: 40 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  button: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: { fontSize: 14 },
  resendLink: { fontSize: 14, fontWeight: '600' },
});

export default RiderOTPVerifyScreen;






