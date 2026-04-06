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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Button } from '../../components/common';
import { authService } from '../../../data/api/authService';
import { useAppDispatch } from '../../hooks/useRedux';
import { setUser } from '../../../store/slices/userSlice';

type UserRegisterNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'UserRegister'
>;
type UserRegisterRouteProp = RouteProp<RootStackParamList, 'UserRegister'>;

export const UserRegisterScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<UserRegisterNavigationProp>();
  const route = useRoute<UserRegisterRouteProp>();
  const insets = useSafeAreaInsets();
  const { phone } = route.params;
  const dispatch = useAppDispatch();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (name.trim().length < 2) {
      Alert.alert('Invalid Name', 'Please enter a valid name.');
      return;
    }

    if (email && !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.registerUser(phone, name.trim(), email.trim() || undefined);
      if (result.success && result.user) {
        dispatch(setUser(result.user));
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      } else {
        Alert.alert('Registration Failed', 'Please try again.');
      }
    } catch {
      Alert.alert('Registration Failed', 'Please try again.');
    } finally {
      setLoading(false);
    }
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
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backText, { color: colors.textPrimary }]}>
              ←
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.titleSection}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Create your account
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Complete your profile to get started
            </Text>
          </View>

          <View style={styles.form}>
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text
                style={[styles.inputLabel, { color: colors.textSecondary }]}
              >
                Full Name *
              </Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
              />
            </View>

            <View
              style={[
                styles.inputContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text
                style={[styles.inputLabel, { color: colors.textSecondary }]}
              >
                Phone Number
              </Text>
              <View style={styles.phoneDisplay}>
                <Text
                  style={[styles.phoneText, { color: colors.textTertiary }]}
                >
                  {phone}
                </Text>
                <View
                  style={[
                    styles.verifiedBadge,
                    { backgroundColor: colors.success + '20' },
                  ]}
                >
                  <Text
                    style={[styles.verifiedText, { color: colors.success }]}
                  >
                    ✓ Verified
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.inputContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text
                style={[styles.inputLabel, { color: colors.textSecondary }]}
              >
                Email (Optional)
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
          </View>

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            disabled={name.trim().length < 2}
            style={styles.button}
          />

          <Text style={[styles.terms, { color: colors.textTertiary }]}>
            By creating an account, you agree to our{' '}
            <Text style={[styles.link, { color: colors.primary }]}>
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text style={[styles.link, { color: colors.primary }]}>
              Privacy Policy
            </Text>
          </Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  titleSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
  },
  form: {
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
  phoneDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneText: {
    fontSize: 16,
  },
  verifiedBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  button: {
    marginBottom: 16,
  },
  terms: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    fontWeight: '500',
  },
});
