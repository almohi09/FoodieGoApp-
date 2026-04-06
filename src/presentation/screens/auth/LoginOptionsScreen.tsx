import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { RootStackParamList } from '../../navigation/AppNavigator';

type LoginOptionsNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'LoginOptions'
>;

export const LoginOptionsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<LoginOptionsNavigationProp>();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');

  const handleSendOTP = () => {
    if (phone.length !== 10) {
      Alert.alert('Invalid Number', 'Enter a valid 10-digit phone number.');
      return;
    }

    navigation.navigate('OTPVerify', { phone: `+91${phone}` });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.content, { paddingTop: insets.top + 18 }]}>
          <View style={styles.hero}>
            <Text style={[styles.brand, { color: colors.textPrimary }]}>FoodieGo</Text>
            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Order food in minutes</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>Choose your role and continue</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface }]}> 
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>User Login</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Continue with phone OTP</Text>

            <View style={[styles.inputContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}> 
              <View style={[styles.countryCode, { borderRightColor: colors.border }]}>
                <Text style={[styles.countryCodeText, { color: colors.textPrimary }]}>+91</Text>
              </View>
              <TextInput
                style={[styles.phoneInput, { color: colors.textPrimary }]}
                value={phone}
                onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, '').slice(0, 10))}
                placeholder="Phone number"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleSendOTP}
            >
              <Text style={styles.primaryButtonText}>Continue with OTP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => navigation.navigate('PhoneEntry')}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>Open User Login Screen</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface }]}> 
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Restaurant Partner</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Login or register as seller</Text>

            <View style={styles.rowButtons}>
              <TouchableOpacity
                style={[styles.halfButton, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => navigation.navigate('SellerLogin')}
              >
                <Text style={[styles.halfButtonText, { color: colors.textPrimary }]}>Seller Login</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.halfButton, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => navigation.navigate('SellerRegister', { phone: '' })}
              >
                <Text style={[styles.halfButtonText, { color: colors.textPrimary }]}>Register</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface }]}> 
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Admin</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Platform management portal</Text>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => navigation.navigate('AdminLogin')}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>Admin Login</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.guestButton, { borderColor: colors.border }]}
            onPress={() => navigation.navigate('MainTabs')}
            testID="login-continue-guest"
          >
            <Text style={[styles.guestText, { color: colors.textSecondary }]}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  hero: {
    marginBottom: 14,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
  },
  heroTitle: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '700',
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 13,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  countryCode: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRightWidth: 1,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  primaryButton: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  halfButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  guestButton: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  guestText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

