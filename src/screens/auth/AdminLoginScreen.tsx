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

type AdminLoginNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AdminLogin'
>;

export const AdminLoginScreen: React.FC = () => {
  const { showToast } = useToast();
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<AdminLoginNavigationProp>();
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
      const result = await authService.loginAdmin(email, password);
      if (result.success) {
        navigation.reset({ index: 0, routes: [{ name: 'AdminDashboard' }] });
      } else {
        showToast({ type: 'error', message: 'Invalid admin credentials' });
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
      testID="admin-login-screen"
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity activeOpacity={0.7} style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={[styles.logo, { backgroundColor: colors.textPrimary }]}>
              <Icon name="shield-checkmark" size={34} color={colors.surface} />
            </View>
          </View>

          <View style={styles.titleSection}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Admin Portal</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Access FoodieGo management dashboard</Text>
          </View>

          <View style={styles.form}>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Admin Email</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter admin email"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                testID="admin-login-email-input"
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
                  testID="admin-login-password-input"
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
                  message: 'Admin password reset instructions have been sent.',
                })
              }
            >
              <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Login to Dashboard"
            onPress={handleLogin}
            loading={loading}
            disabled={!email || !password}
            style={styles.button}
            testID="admin-login-submit-button"
          />

          <View style={styles.securityNote}>
            <Icon name="lock-closed" size={14} color={colors.textTertiary} />
            <Text style={[styles.securityText, { color: colors.textTertiary }]}>Restricted to authorized personnel only</Text>
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
  securityNote: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
  },
  securityText: { fontSize: 12 },
});





