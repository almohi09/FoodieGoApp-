import { useToast } from '@/components/Toast';
import React, { useState } from 'react';
import {Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/theme/colors';
import { RootStackParamList } from '../../navigation/AppNavigator';

type SellerNotificationNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SellerDashboard'
>;

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  channels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
  };
}

const DEFAULT_SETTINGS: NotificationSetting[] = [
  {
    id: 'new_orders',
    title: 'New Orders',
    description: 'Receive alerts for new order arrivals',
    enabled: true,
    channels: { inApp: true, email: false, push: true },
  },
  {
    id: 'order_cancelled',
    title: 'Order Cancellations',
    description: 'Alerts when customers cancel orders',
    enabled: true,
    channels: { inApp: true, email: true, push: true },
  },
  {
    id: 'low_stock',
    title: 'Low Stock Alerts',
    description: 'Notifications when menu items are running low',
    enabled: true,
    channels: { inApp: true, email: false, push: true },
  },
  {
    id: 'reviews',
    title: 'New Reviews',
    description: 'Alerts for new customer reviews and ratings',
    enabled: false,
    channels: { inApp: true, email: false, push: false },
  },
  {
    id: 'payouts',
    title: 'Payout Updates',
    description: 'Notifications about payout processing and status',
    enabled: true,
    channels: { inApp: true, email: true, push: false },
  },
  {
    id: 'sla_breaches',
    title: 'SLA Warnings',
    description: 'Alerts for prep time SLA breaches',
    enabled: true,
    channels: { inApp: true, email: true, push: true },
  },
  {
    id: 'system',
    title: 'System Updates',
    description: 'Important system announcements and updates',
    enabled: true,
    channels: { inApp: true, email: true, push: false },
  },
];

const STORAGE_KEY = 'seller_notification_prefs';

export const SellerNotificationPreferencesScreen: React.FC = () => {
  const { showToast } = useToast();
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<SellerNotificationNavigationProp>();
  const insets = useSafeAreaInsets();

  const [settings, setSettings] =
    useState<NotificationSetting[]>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  React.useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setHasChanges(false);
      showToast({ type: 'success', message: 'Notification preferences updated successfully' });
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      showToast({ type: 'error', message: 'Failed to save preferences' });
    }
  };

  const toggleSetting = (id: string) => {
    setSettings(prev =>
      prev.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    );
    setHasChanges(true);
  };

  const toggleChannel = (
    settingId: string,
    channel: 'inApp' | 'email' | 'push',
  ) => {
    setSettings(prev =>
      prev.map(s =>
        s.id === settingId
          ? {
              ...s,
              channels: { ...s.channels, [channel]: !s.channels[channel] },
            }
          : s,
      ),
    );
    setHasChanges(true);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Notifications
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          Push your phone to stay updated
        </Text>

        {settings.map(setting => (
          <View
            key={setting.id}
            style={[styles.settingCard, { backgroundColor: colors.surface }]}
          >
            <TouchableOpacity activeOpacity={0.7}
              style={styles.settingHeader}
              onPress={() => toggleSetting(setting.id)}
            >
              <View style={styles.settingInfo}>
                <Text
                  style={[styles.settingTitle, { color: colors.textPrimary }]}
                >
                  {setting.title}
                </Text>
                <Text
                  style={[styles.settingDesc, { color: colors.textSecondary }]}
                >
                  {setting.description}
                </Text>
              </View>
              <Switch
                value={setting.enabled}
                onValueChange={() => toggleSetting(setting.id)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </TouchableOpacity>

            {setting.enabled && (
              <View style={styles.channelRow}>
                <TouchableOpacity activeOpacity={0.7}
                  style={[
                    styles.channelChip,
                    setting.channels.inApp && styles.channelChipActive,
                    { borderColor: colors.border },
                  ]}
                  onPress={() => toggleChannel(setting.id, 'inApp')}
                >
                  <Text
                    style={[
                      styles.channelChipText,
                      {
                        color: setting.channels.inApp
                          ? colors.primary
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    📱 In-App
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7}
                  style={[
                    styles.channelChip,
                    setting.channels.email && styles.channelChipActive,
                    { borderColor: colors.border },
                  ]}
                  onPress={() => toggleChannel(setting.id, 'email')}
                >
                  <Text
                    style={[
                      styles.channelChipText,
                      {
                        color: setting.channels.email
                          ? colors.primary
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    📧 Email
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7}
                  style={[
                    styles.channelChip,
                    setting.channels.push && styles.channelChipActive,
                    { borderColor: colors.border },
                  ]}
                  onPress={() => toggleChannel(setting.id, 'push')}
                >
                  <Text
                    style={[
                      styles.channelChipText,
                      {
                        color: setting.channels.push
                          ? colors.primary
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    🔔 Push
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {hasChanges && (
        <View style={[styles.footer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity activeOpacity={0.7}
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={saveSettings}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG_SECONDARY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    padding: 16,
  },
  sectionHeader: {
    fontSize: 13,
    marginBottom: 12,
  },
  settingCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 13,
  },
  channelRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  channelChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  channelChipActive: {
    backgroundColor: Colors.INFO_LIGHT,
    borderColor: Colors.INFO,
  },
  channelChipText: {
    fontSize: 12,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SellerNotificationPreferencesScreen;








