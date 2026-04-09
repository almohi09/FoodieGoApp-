import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../api/authService';
import { showToast } from '../../utils/toast';

type RiderLoginNavigationProp = NativeStackNavigationProp<any>;

export const RiderLoginScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<RiderLoginNavigationProp>();
  const insets = useSafeAreaInsets();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      showToast('Please enter a valid phone number', 'error');
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const result = await authService.sendOTP(formattedPhone);

      if (result.success) {
        navigation.navigate('RiderOTPVerify', { phone: formattedPhone });
      } else {
        showToast(result.message || 'Failed to send OTP', 'error');
      }
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID="rider-login-screen"
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={[styles.logoWrap, { backgroundColor: colors.primaryGhost }]}>
            <Icon name="bicycle" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Rider Login</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Enter your phone number to continue</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
            <View style={[styles.phoneInputWrapper, { borderColor: colors.border }]}>
              <Text style={[styles.countryCode, { color: colors.textPrimary }]}>+91</Text>
              <TextInput
                style={[styles.phoneInput, { color: colors.textPrimary }]}
                placeholder="Enter phone number"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={10}
              />
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.7}
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleSendOTP}
            disabled={loading}
            testID="rider-login-get-otp-button"
          >
            <Text style={[styles.buttonText, { color: colors.surface }]}>
              {loading ? 'Sending OTP...' : 'Get OTP'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.7} style={styles.secondaryButton} onPress={() => navigation.navigate('LoginOptions')}>
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Are you a customer? Login here</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>By continuing, you agree to our Terms of Service and Privacy Policy</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center' },
  form: { flex: 1 },
  inputContainer: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  countryCode: { fontSize: 16, marginRight: 12 },
  phoneInput: { flex: 1, fontSize: 16, height: '100%' },
  button: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  secondaryButton: { alignItems: 'center', paddingVertical: 12 },
  secondaryButtonText: { fontSize: 14, fontWeight: '500' },
  footer: { marginTop: 24, alignItems: 'center' },
  footerText: { fontSize: 12, textAlign: 'center' },
});

export default RiderLoginScreen;



