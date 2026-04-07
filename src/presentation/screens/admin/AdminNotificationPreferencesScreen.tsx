import React, { useState } from 'react';
import {
  Alert,
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
import { useTheme } from '../../../context/ThemeContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { adminAuditService } from '../../../data/api/adminAuditService';

type AdminNotificationNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AdminDashboard'
>;

interface NotificationChannel {
  id: string;
  label: string;
  description: string;
}

interface NotificationCategory {
  id: string;
  title: string;
  description: string;
  channels: NotificationChannel[];
}

const CHANNELS: NotificationChannel[] = [
  {
    id: 'in_app',
    label: 'In-App',
    description: 'Show notifications within the app',
  },
  { id: 'email', label: 'Email', description: 'Receive alerts via email' },
  { id: 'push', label: 'Push', description: 'Send push notifications' },
  { id: 'sms', label: 'SMS', description: 'Send SMS for critical alerts' },
];

const CATEGORIES: NotificationCategory[] = [
  {
    id: 'orders',
    title: 'Order Alerts',
    description: 'Order-related notifications and updates',
    channels: CHANNELS,
  },
  {
    id: 'sla',
    title: 'SLA Breaches',
    description: 'Alerts for prep time, delivery delays, and SLA violations',
    channels: CHANNELS,
  },
  {
    id: 'users',
    title: 'User Activity',
    description: 'New registrations, suspicious activity, account changes',
    channels: CHANNELS,
  },
  {
    id: 'sellers',
    title: 'Seller Activity',
    description:
      'New seller registrations, document submissions, suspension requests',
    channels: CHANNELS,
  },
  {
    id: 'payouts',
    title: 'Payout Alerts',
    description: 'Payout processing, failures, and reconciliation issues',
    channels: CHANNELS,
  },
  {
    id: 'moderation',
    title: 'Moderation Alerts',
    description:
      'Reported items, flagged content, approval queue notifications',
    channels: CHANNELS,
  },
  {
    id: 'system',
    title: 'System Alerts',
    description: 'Backend health, API errors, performance degradation',
    channels: CHANNELS,
  },
];

interface NotificationState {
  [key: string]: {
    [channelId: string]: boolean;
  };
}

export const AdminNotificationPreferencesScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<AdminNotificationNavigationProp>();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<NotificationState>(() => {
    const initial: NotificationState = {};
    CATEGORIES.forEach(category => {
      initial[category.id] = {};
      category.channels.forEach(channel => {
        initial[category.id][channel.id] = channel.id === 'in_app';
      });
    });
    return initial;
  });

  const [saving, setSaving] = useState(false);

  const toggleNotification = (categoryId: string, channelId: string) => {
    setNotifications(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        [channelId]: !prev[categoryId][channelId],
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAuditService.recordEvent({
        actorRole: 'admin',
        action: 'update_notification_preferences',
        targetType: 'admin_settings',
        targetId: 'notification_preferences',
        outcome: 'success',
        details: JSON.stringify(notifications),
      });

      Alert.alert(
        'Saved',
        'Notification preferences have been updated successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Preferences',
      'This will reset all notification preferences to default. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            const reset: NotificationState = {};
            CATEGORIES.forEach(category => {
              reset[category.id] = {};
              category.channels.forEach(channel => {
                reset[category.id][channel.id] = channel.id === 'in_app';
              });
            });
            setNotifications(reset);
          },
        },
      ],
    );
  };

  const getActiveChannels = (categoryId: string): string[] => {
    return Object.entries(notifications[categoryId] || {})
      .filter(([_, enabled]) => enabled)
      .map(([channelId]) => channelId);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.textPrimary }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Preferences</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Configure which notifications you want to receive and through which
          channels. Critical alerts are always sent via in-app notification.
        </Text>

        {CATEGORIES.map(category => (
          <View
            key={category.id}
            style={[styles.categoryCard, { backgroundColor: colors.surface }]}
          >
            <View style={styles.categoryHeader}>
              <Text
                style={[styles.categoryTitle, { color: colors.textPrimary }]}
              >
                {category.title}
              </Text>
              <Text
                style={[styles.categoryDesc, { color: colors.textSecondary }]}
              >
                {category.description}
              </Text>
            </View>

            <View style={styles.channelsContainer}>
              <Text
                style={[styles.channelsLabel, { color: colors.textSecondary }]}
              >
                Channels:
              </Text>
              <View style={styles.channelTags}>
                {getActiveChannels(category.id).length === 0 ? (
                  <View
                    style={[
                      styles.noChannelTag,
                      { backgroundColor: colors.error + '20' },
                    ]}
                  >
                    <Text
                      style={[styles.noChannelText, { color: colors.error }]}
                    >
                      None
                    </Text>
                  </View>
                ) : (
                  getActiveChannels(category.id).map(channelId => {
                    const channel = CHANNELS.find(c => c.id === channelId);
                    return (
                      <View
                        key={channelId}
                        style={[
                          styles.channelTag,
                          { backgroundColor: colors.success + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.channelTagText,
                            { color: colors.success },
                          ]}
                        >
                          {channel?.label || channelId}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>
            </View>

            <View style={styles.togglesContainer}>
              {category.channels.map(channel => (
                <View
                  key={channel.id}
                  style={[
                    styles.toggleRow,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.toggleInfo}>
                    <Text
                      style={[
                        styles.toggleLabel,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {channel.label}
                    </Text>
                    <Text
                      style={[
                        styles.toggleDesc,
                        { color: colors.textTertiary },
                      ]}
                    >
                      {channel.description}
                    </Text>
                  </View>
                  <Switch
                    value={notifications[category.id]?.[channel.id] || false}
                    onValueChange={() =>
                      toggleNotification(category.id, channel.id)
                    }
                    trackColor={{
                      false: colors.border,
                      true: colors.primary + '80',
                    }}
                    thumbColor={
                      notifications[category.id]?.[channel.id]
                        ? colors.primary
                        : colors.surface
                    }
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        <View
          style={[styles.quickSettings, { backgroundColor: colors.surface }]}
        >
          <Text
            style={[styles.quickSettingsTitle, { color: colors.textPrimary }]}
          >
            Quick Settings
          </Text>
          <TouchableOpacity
            style={[
              styles.quickButton,
              { backgroundColor: colors.success + '20' },
            ]}
            onPress={() => {
              const enableAll: NotificationState = {};
              CATEGORIES.forEach(category => {
                enableAll[category.id] = {};
                category.channels.forEach(channel => {
                  enableAll[category.id][channel.id] = true;
                });
              });
              setNotifications(enableAll);
            }}
          >
            <Text style={[styles.quickButtonText, { color: colors.success }]}>
              Enable All Notifications
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.quickButton,
              { backgroundColor: colors.error + '20' },
            ]}
            onPress={() => {
              const disableAll: NotificationState = {};
              CATEGORIES.forEach(category => {
                disableAll[category.id] = {};
                category.channels.forEach(channel => {
                  disableAll[category.id][channel.id] = false;
                });
              });
              setNotifications(disableAll);
            }}
          >
            <Text style={[styles.quickButtonText, { color: colors.error }]}>
              Disable All Notifications
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.quickButton,
              { backgroundColor: colors.primary + '20' },
            ]}
            onPress={() => {
              const criticalOnly: NotificationState = {};
              CATEGORIES.forEach(category => {
                criticalOnly[category.id] = {};
                category.channels.forEach(channel => {
                  criticalOnly[category.id][channel.id] =
                    channel.id === 'in_app' || channel.id === 'push';
                });
              });
              setNotifications(criticalOnly);
            }}
          >
            <Text style={[styles.quickButtonText, { color: colors.primary }]}>
              Critical Only (In-App + Push)
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.surface,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.resetButton, { borderColor: colors.error }]}
          onPress={handleReset}
        >
          <Text style={[styles.resetButtonText, { color: colors.error }]}>
            Reset to Default
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: { fontSize: 20, color: '#FFF', fontWeight: '700' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  headerSpacer: { width: 40 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  categoryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryHeader: { marginBottom: 12 },
  categoryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  categoryDesc: { fontSize: 13 },
  channelsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 6,
  },
  channelsLabel: { fontSize: 12, fontWeight: '600', marginRight: 8 },
  channelTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  channelTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  channelTagText: { fontSize: 11, fontWeight: '600' },
  noChannelTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  noChannelText: { fontSize: 11, fontWeight: '600' },
  togglesContainer: { gap: 0 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 14, fontWeight: '500' },
  toggleDesc: { fontSize: 12, marginTop: 2 },
  quickSettings: {
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  quickSettingsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  quickButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  quickButtonText: { fontSize: 14, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  resetButtonText: { fontSize: 14, fontWeight: '600' },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});

export default AdminNotificationPreferencesScreen;
