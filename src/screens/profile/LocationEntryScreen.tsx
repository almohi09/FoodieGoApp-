import { useToast } from '@/components/Toast';
import React, { useState } from 'react';
import {View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { RootStackParamList } from '../../navigation/AppNavigator';

type MapPickerNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const LocationEntryScreen: React.FC = () => {
  const { showToast } = useToast();
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<MapPickerNavigationProp>();
  const insets = useSafeAreaInsets();
  const [manualAddress, setManualAddress] = useState('');

  const handleConfirmLocation = () => {
    if (!manualAddress.trim()) {
      showToast({ type: 'error', message: 'Please enter your address' });
      return;
    }
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity activeOpacity={0.7}
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backIcon, { color: colors.textPrimary }]}> 
            {'\u2190'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Select Location
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Text style={styles.icon}>{'\u{1F4CD}'}</Text>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Enter Your Address
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          We'll use this for delivering your orders
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            value={manualAddress}
            onChangeText={setManualAddress}
            placeholder="Enter your complete address"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity activeOpacity={0.7}
          style={[styles.confirmButton, { backgroundColor: colors.primary }]}
          onPress={handleConfirmLocation}
        >
          <Text style={[styles.confirmButtonText, { color: colors.textInverse }]}>Confirm Location</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7}
          style={[styles.useCurrentButton, { borderColor: colors.border }]}
          onPress={() => {
            showToast({ type: 'info', message: 'Current location feature will be available soon', });
          }}
        >
          <Text style={styles.useCurrentIcon}>{'\u{1F3AF}'}</Text>
          <Text style={[styles.useCurrentText, { color: colors.textPrimary }]}> 
            Use Current Location
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 120,
  },
  confirmButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  useCurrentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  useCurrentIcon: {
    fontSize: 20,
  },
  useCurrentText: {
    fontSize: 15,
    fontWeight: '500',
  },
});

export default LocationEntryScreen;




