import { useToast } from '@/components/Toast';
import { SkeletonBox } from '@/components/SkeletonLoader';
import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { sellerRestaurantService } from '../../api/sellerRestaurantService';
import { adminAuditService } from '../../api/adminAuditService';

type SellerStoreHoursNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SellerStoreHours'
>;

interface DaySchedule {
  day: string;
  shortDay: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

const DAYS: DaySchedule[] = [
  {
    day: 'Monday',
    shortDay: 'Mon',
    isOpen: true,
    openTime: '09:00',
    closeTime: '22:00',
  },
  {
    day: 'Tuesday',
    shortDay: 'Tue',
    isOpen: true,
    openTime: '09:00',
    closeTime: '22:00',
  },
  {
    day: 'Wednesday',
    shortDay: 'Wed',
    isOpen: true,
    openTime: '09:00',
    closeTime: '22:00',
  },
  {
    day: 'Thursday',
    shortDay: 'Thu',
    isOpen: true,
    openTime: '09:00',
    closeTime: '22:00',
  },
  {
    day: 'Friday',
    shortDay: 'Fri',
    isOpen: true,
    openTime: '09:00',
    closeTime: '23:00',
  },
  {
    day: 'Saturday',
    shortDay: 'Sat',
    isOpen: true,
    openTime: '10:00',
    closeTime: '23:00',
  },
  {
    day: 'Sunday',
    shortDay: 'Sun',
    isOpen: false,
    openTime: '10:00',
    closeTime: '21:00',
  },
];

export const SellerStoreHoursScreen: React.FC = () => {
  const { showToast } = useToast();
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<SellerStoreHoursNavigationProp>();
  const insets = useSafeAreaInsets();

  const [restaurantId, setRestaurantId] = useState('restaurant_1');
  const [schedule, setSchedule] = useState<DaySchedule[]>(DAYS);
  const [loading, setLoading] = useState(true);
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [specialHoursEnabled, setSpecialHoursEnabled] = useState(false);
  const [specialHours, setSpecialHours] = useState('');

  useEffect(() => {
    const init = async () => {
      const sellerRaw = await AsyncStorage.getItem('seller_data');
      const seller = sellerRaw ? JSON.parse(sellerRaw) : null;
      const id = seller?.restaurantId || seller?.id || 'restaurant_1';
      setRestaurantId(id);
      await loadStoreHours(id);
    };
    init();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 500);
    return () => clearTimeout(t);
  }, []);

  const loadStoreHours = async (id: string) => {
    try {
      const result = await sellerRestaurantService.getStoreHours(id);
      if (result.success && result.hours) {
        const loaded = DAYS.map(day => {
          const stored = result.hours?.find((h: any) => h.day === day.day);
          return stored
            ? {
                ...day,
                isOpen: stored.isOpen,
                openTime: stored.openTime,
                closeTime: stored.closeTime,
              }
            : day;
        });
        setSchedule(loaded);
      }
    } catch (error) {
      console.error('Failed to load store hours:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDay = (index: number) => {
    setSchedule(prev =>
      prev.map((day, i) =>
        i === index ? { ...day, isOpen: !day.isOpen } : day,
      ),
    );
  };

  const handleQuickSelect = (preset: 'regular' | 'late' | 'early') => {
    const presets = {
      regular: DAYS.map(d => ({ ...d, isOpen: true })),
      late: DAYS.map(d => ({
        ...d,
        isOpen: true,
        closeTime:
          d.day === 'Friday' || d.day === 'Saturday' ? '02:00' : '23:00',
      })),
      early: DAYS.map(d => ({
        ...d,
        isOpen: true,
        openTime: '07:00',
        closeTime: '21:00',
      })),
    };
    setSchedule(presets[preset]);
  };

  const handleSave = async () => {
    const closedDays = schedule.filter(d => !d.isOpen);
    if (closedDays.length === 7) {
      showToast({ type: 'error', message: 'At least one day should be open.' });
      return;
    }

    setSaving(true);
    try {
      const result = await sellerRestaurantService.updateStoreHours(
        restaurantId,
        schedule.map(d => ({
          day: d.day,
          isOpen: d.isOpen,
          openTime: d.openTime,
          closeTime: d.closeTime,
        })),
      );

      if (result.success) {
        await adminAuditService.recordEvent({
          actorRole: 'seller',
          actorId: restaurantId,
          action: 'update_store_hours',
          targetType: 'restaurant',
          targetId: restaurantId,
          outcome: 'success',
        });
        showToast({
          type: 'success',
          message: 'Store hours have been updated.',
        });
        navigation.goBack();
      } else {
        showToast({ type: 'error', message: result.error || 'Failed to update store hours' });
      }
    } catch {
      showToast({ type: 'error', message: 'Something went wrong. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const getCurrentStatus = () => {
    const now = new Date();
    const today = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1];
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (!today.isOpen) return { text: 'Closed Today', color: colors.error };
    if (currentTime < today.openTime)
      return { text: `Opens at ${today.openTime}`, color: colors.warning };
    if (currentTime > today.closeTime)
      return { text: 'Closed for the day', color: colors.error };
    return { text: 'Currently Open', color: colors.success };
  };

  if (loading || !minDelayDone) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: 16 }]}>
        <SkeletonBox style={{ height: 220, marginBottom: 16, borderRadius: 16 }} />
        <SkeletonBox style={{ height: 18, width: '80%', marginBottom: 12 }} />
        <SkeletonBox style={{ height: 14, width: '60%', marginBottom: 10 }} />
        <SkeletonBox style={{ height: 14, width: '72%', marginBottom: 10 }} />
      </View>
    );
  }

  const status = getCurrentStatus();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Store Hours</Text>
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
        <View style={[styles.statusCard, { backgroundColor: colors.surface }]}>
          <View style={styles.statusRow}>
            <View
              style={[styles.statusDot, { backgroundColor: status.color }]}
            />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.text}
            </Text>
          </View>
        </View>

        <View
          style={[styles.quickSelectCard, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Quick Presets
          </Text>
          <View style={styles.quickButtons}>
            <TouchableOpacity activeOpacity={0.7}
              style={[
                styles.quickButton,
                { backgroundColor: colors.surfaceSecondary },
              ]}
              onPress={() => handleQuickSelect('regular')}
            >
              <Text
                style={[styles.quickButtonText, { color: colors.textPrimary }]}
              >
                Regular
              </Text>
              <Text
                style={[styles.quickButtonSub, { color: colors.textTertiary }]}
              >
                9AM - 10PM
              </Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7}
              style={[
                styles.quickButton,
                { backgroundColor: colors.surfaceSecondary },
              ]}
              onPress={() => handleQuickSelect('late')}
            >
              <Text
                style={[styles.quickButtonText, { color: colors.textPrimary }]}
              >
                Late Night
              </Text>
              <Text
                style={[styles.quickButtonSub, { color: colors.textTertiary }]}
              >
                9AM - 2AM
              </Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7}
              style={[
                styles.quickButton,
                { backgroundColor: colors.surfaceSecondary },
              ]}
              onPress={() => handleQuickSelect('early')}
            >
              <Text
                style={[styles.quickButtonText, { color: colors.textPrimary }]}
              >
                Early Bird
              </Text>
              <Text
                style={[styles.quickButtonSub, { color: colors.textTertiary }]}
              >
                7AM - 9PM
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[styles.scheduleCard, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Weekly Schedule
          </Text>
          {schedule.map((day, index) => (
            <View
              key={day.day}
              style={[
                styles.dayRow,
                index < schedule.length - 1 && {
                  borderBottomColor: colors.border,
                  borderBottomWidth: 1,
                },
              ]}
            >
              <View style={styles.dayHeader}>
                <TouchableOpacity activeOpacity={0.7}
                  style={styles.dayToggle}
                  onPress={() => handleToggleDay(index)}
                >
                  <View
                    style={[
                      styles.dayCheckbox,
                      day.isOpen && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    {day.isOpen && <Text style={styles.dayCheckmark}>✓</Text>}
                  </View>
                  <Text style={[styles.dayName, { color: colors.textPrimary }]}>
                    {day.day}
                  </Text>
                </TouchableOpacity>
                <Switch
                  value={day.isOpen}
                  onValueChange={() => handleToggleDay(index)}
                  trackColor={{
                    false: colors.border,
                    true: colors.primary + '80',
                  }}
                  thumbColor={day.isOpen ? colors.primary : colors.surface}
                />
              </View>
              {day.isOpen && (
                <View style={styles.timeRow}>
                  <View style={styles.timePickerContainer}>
                    <Text
                      style={[styles.timeLabel, { color: colors.textTertiary }]}
                    >
                      Opens
                    </Text>
                    <TouchableOpacity activeOpacity={0.7}
                      style={[
                        styles.timePicker,
                        {
                          backgroundColor: colors.surfaceSecondary,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.timeText, { color: colors.textPrimary }]}
                      >
                        {day.openTime}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={[
                      styles.timeSeparator,
                      { color: colors.textTertiary },
                    ]}
                  >
                    to
                  </Text>
                  <View style={styles.timePickerContainer}>
                    <Text
                      style={[styles.timeLabel, { color: colors.textTertiary }]}
                    >
                      Closes
                    </Text>
                    <TouchableOpacity activeOpacity={0.7}
                      style={[
                        styles.timePicker,
                        {
                          backgroundColor: colors.surfaceSecondary,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.timeText, { color: colors.textPrimary }]}
                      >
                        {day.closeTime}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {!day.isOpen && (
                <Text
                  style={[styles.closedLabel, { color: colors.textTertiary }]}
                >
                  Closed
                </Text>
              )}
            </View>
          ))}
        </View>

        <View style={[styles.specialCard, { backgroundColor: colors.surface }]}>
          <View style={styles.specialHeader}>
            <Text style={[styles.specialTitle, { color: colors.textPrimary }]}>
              Special Hours
            </Text>
            <Switch
              value={specialHoursEnabled}
              onValueChange={setSpecialHoursEnabled}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={specialHoursEnabled ? colors.primary : colors.surface}
            />
          </View>
          {specialHoursEnabled && (
            <TextInput
              style={[
                styles.specialInput,
                {
                  backgroundColor: colors.surfaceSecondary,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              placeholder="e.g., Dec 24: 10AM - 4PM, Dec 25: Closed"
              placeholderTextColor={colors.textTertiary}
              value={specialHours}
              onChangeText={setSpecialHours}
              multiline
              numberOfLines={3}
            />
          )}
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
        <TouchableOpacity activeOpacity={0.7}
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Hours'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
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
  statusCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusText: { fontSize: 16, fontWeight: '600' },
  quickSelectCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  quickButtons: { flexDirection: 'row', gap: 8 },
  quickButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickButtonText: { fontSize: 13, fontWeight: '600' },
  quickButtonSub: { fontSize: 10, marginTop: 2 },
  scheduleCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  dayRow: { paddingVertical: 12 },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayToggle: { flexDirection: 'row', alignItems: 'center' },
  dayCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#DDD',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCheckmark: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  dayName: { fontSize: 15, fontWeight: '500' },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginLeft: 34,
    gap: 8,
  },
  timePickerContainer: { flex: 1 },
  timeLabel: { fontSize: 11, marginBottom: 4 },
  timePicker: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  timeText: { fontSize: 14, fontWeight: '600' },
  timeSeparator: { fontSize: 14, marginTop: 20 },
  closedLabel: { fontSize: 13, marginLeft: 34, marginTop: 4 },
  specialCard: { borderRadius: 16, padding: 16 },
  specialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specialTitle: { fontSize: 15, fontWeight: '600' },
  specialInput: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  saveButton: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default SellerStoreHoursScreen;




