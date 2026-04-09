import { useToast } from '@/components/Toast';
import React, { useState } from 'react';
import {View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Button } from '../../components/common';
import { authService } from '../../api/authService';

type SellerLoginNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SellerLogin'
>;

export const SellerLoginScreen: React.FC = () => {
  const { showToast } = useToast();
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<SellerLoginNavigationProp>();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.includes('@')) {
      showToast({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    if (password.length < 6) {
      showToast({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }

    setLoading(true);
    try {
      const result = await authService.loginSeller(email, password);
      if (result.success) {
        navigation.reset({ index: 0, routes: [{ name: 'SellerDashboard' }] });
      } else {
        showToast({ type: 'error', message: 'Invalid seller credentials' });
      }
    } catch {
      showToast({ type: 'error', message: 'Unable to login right now' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID="seller-login-screen"
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity activeOpacity={0.7} style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={[styles.logo, { backgroundColor: colors.primaryGhost }]}>
              <Icon name="storefront" size={36} color={colors.primary} />
            </View>
          </View>

          <View style={styles.titleSection}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Partner Login</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Manage your restaurant on FoodieGo</Text>
          </View>

          <View style={styles.form}>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                testID="seller-login-email-input"
              />
            </View>

            <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput, { color: colors.textPrimary }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity activeOpacity={0.7} onPress={() => setShowPassword(!showPassword)}>
                  <Text style={[styles.showPassword, { color: colors.primary }]}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity activeOpacity={0.7}
              style={styles.forgotPassword}
              onPress={() =>
                showToast({
                  type: 'info',
                  message: 'Password reset instructions have been sent to your email.',
                })
              }
            >
              <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Login"
            onPress={handleLogin}
            loading={loading}
            disabled={!email || !password}
            style={styles.button}
            testID="seller-login-continue-button"
          />

          <View style={styles.registerPrompt}>
            <Text style={[styles.registerText, { color: colors.textSecondary }]}>Do not have an account? </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('SellerRegister', { phone: '' })}>
              <Text style={[styles.registerLink, { color: colors.primary }]}>Register Restaurant</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1, paddingHorizontal: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 24 },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 15 },
  form: { marginBottom: 24 },
  inputContainer: { borderRadius: 12, padding: 16, marginBottom: 12 },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: { fontSize: 16, padding: 0 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1 },
  showPassword: { fontSize: 14, fontWeight: '500' },
  forgotPassword: { alignItems: 'flex-end', marginTop: 8 },
  forgotText: { fontSize: 14, fontWeight: '500' },
  button: { marginBottom: 16 },
  registerPrompt: { flexDirection: 'row', justifyContent: 'center' },
  registerText: { fontSize: 14 },
  registerLink: { fontSize: 14, fontWeight: '600' },
});





