import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { authService } from '../../../data/api/authService';

type SellerRegisterNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SellerRegister'
>;

type BusinessType = 'restaurant' | 'grocery' | 'pharmacy' | 'other';

const BUSINESS_TYPES: { type: BusinessType; label: string; icon: string }[] = [
  { type: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { type: 'grocery', label: 'Grocery', icon: '🛒' },
  { type: 'pharmacy', label: 'Pharmacy', icon: '💊' },
  { type: 'other', label: 'Other', icon: '📦' },
];

export const SellerRegisterScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<SellerRegisterNavigationProp>();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('restaurant');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (step === 1) {
      if (phone.length !== 10) {
        Alert.alert(
          'Invalid Phone',
          'Please enter a valid 10-digit phone number.',
        );
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!name || !email.includes('@')) {
        Alert.alert(
          'Invalid Details',
          'Please fill in all required fields correctly.',
        );
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!businessName || !address) {
        Alert.alert('Invalid Details', 'Please fill in business details.');
        return;
      }
      handleRegister();
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const result = await authService.registerSeller({
        phone: `+91${phone}`,
        name,
        email,
        businessName,
        businessType,
        address,
      });
      if (result.success) {
        Alert.alert(
          'Application Submitted',
          'Your restaurant registration is under review. We will contact you within 24-48 hours.',
          [{ text: 'OK', onPress: () => navigation.navigate('LoginOptions') }],
        );
      } else {
        Alert.alert('Registration Failed', 'Could not submit registration.');
      }
    } catch {
      Alert.alert('Registration Failed', 'Could not submit registration.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
        Partner Phone Number
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Enter your phone number to get started
      </Text>
      <View
        style={[styles.inputContainer, { backgroundColor: colors.surface }]}
      >
        <View style={styles.phoneInputRow}>
          <View
            style={[
              styles.countryCode,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <Text
              style={[styles.countryCodeText, { color: colors.textPrimary }]}
            >
              +91
            </Text>
          </View>
          <TextInput
            style={[
              styles.phoneInput,
              styles.input,
              {
                color: colors.textPrimary,
                backgroundColor: colors.surfaceSecondary,
              },
            ]}
            value={phone}
            onChangeText={text =>
              setPhone(text.replace(/[^0-9]/g, '').slice(0, 10))
            }
            placeholder="Phone Number"
            placeholderTextColor={colors.textTertiary}
            keyboardType="phone-pad"
          />
        </View>
      </View>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
        Personal Details
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Tell us about yourself
      </Text>
      <View
        style={[styles.inputContainer, { backgroundColor: colors.surface }]}
      >
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
          Full Name *
        </Text>
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          value={name}
          onChangeText={setName}
          placeholder="Enter your full name"
          placeholderTextColor={colors.textTertiary}
        />
      </View>
      <View
        style={[styles.inputContainer, { backgroundColor: colors.surface }]}
      >
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
          Email *
        </Text>
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          placeholderTextColor={colors.textTertiary}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
        Business Details
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Tell us about your business
      </Text>

      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        Business Type
      </Text>
      <View style={styles.businessTypes}>
        {BUSINESS_TYPES.map(item => (
          <TouchableOpacity
            key={item.type}
            style={[
              styles.typeCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              businessType === item.type && {
                borderColor: colors.primary,
                backgroundColor: colors.primary + '10',
              },
            ]}
            onPress={() => setBusinessType(item.type)}
          >
            <Text style={styles.typeIcon}>{item.icon}</Text>
            <Text style={[styles.typeLabel, { color: colors.textPrimary }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View
        style={[styles.inputContainer, { backgroundColor: colors.surface }]}
      >
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
          Business Name *
        </Text>
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="e.g., The Food Court"
          placeholderTextColor={colors.textTertiary}
        />
      </View>

      <View
        style={[styles.inputContainer, { backgroundColor: colors.surface }]}
      >
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
          Business Address *
        </Text>
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          value={address}
          onChangeText={setAddress}
          placeholder="Enter your business address"
          placeholderTextColor={colors.textTertiary}
          multiline
        />
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (step > 1 ? setStep(step - 1) : navigation.goBack())}
          >
            <Text style={[styles.backText, { color: colors.textPrimary }]}>
              ←
            </Text>
          </TouchableOpacity>
          <Text style={[styles.stepIndicator, { color: colors.textSecondary }]}>
            Step {step} of 3
          </Text>
        </View>

        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${(step / 3) * 100}%`,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>

        <View style={styles.content}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleNext}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: colors.textInverse }]}>
              {loading
                ? 'Submitting...'
                : step === 3
                  ? 'Submit Application'
                  : 'Continue'}
            </Text>
          </TouchableOpacity>

          {step === 1 && (
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('SellerLogin')}
            >
              <Text style={[styles.loginText, { color: colors.textSecondary }]}>
                Already registered?{' '}
                <Text style={[styles.loginLinkText, { color: colors.primary }]}>
                  Login
                </Text>
              </Text>
            </TouchableOpacity>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 24,
  },
  stepIndicator: {
    fontSize: 14,
    marginLeft: 12,
  },
  progressBar: {
    height: 4,
    marginHorizontal: 16,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    marginBottom: 24,
  },
  inputContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 16,
    padding: 0,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCode: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  businessTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  typeCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 14,
  },
  loginLinkText: {
    fontWeight: '600',
  },
});

