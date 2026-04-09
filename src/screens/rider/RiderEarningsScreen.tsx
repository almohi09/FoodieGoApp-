import React, { useCallback, useEffect, useState } from 'react';
import { SkeletonBox } from '@/components/SkeletonLoader';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { riderService } from '../../api/riderService';
import { Colors } from '../../theme';

type RiderEarningsNavigationProp = NativeStackNavigationProp<any>;

interface EarningsSummary {
  today: number;
  week: number;
  month: number;
  total: number;
}

export const RiderEarningsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<RiderEarningsNavigationProp>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<EarningsSummary>({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
  });
  const [earnings, setEarnings] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<
    'today' | 'week' | 'month'
  >('week');

  const loadData = useCallback(async () => {
    try {
      const result = await riderService.getEarnings({ period: selectedPeriod });
      if (result.success && result.earnings) {
        setEarnings(result.earnings.orders || []);
        const total = result.earnings.total || 0;

        if (selectedPeriod === 'today') {
          setSummary(prev => ({ ...prev, today: total }));
        } else if (selectedPeriod === 'week') {
          setSummary(prev => ({ ...prev, week: total }));
        } else {
          setSummary(prev => ({ ...prev, month: total }));
        }
      }
    } catch (error) {
      console.error('Failed to load earnings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 500);
    return () => clearTimeout(t);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const renderPeriodButton = (
    period: 'today' | 'week' | 'month',
    label: string,
  ) => (
    <TouchableOpacity activeOpacity={0.7}
      style={[
        styles.periodButton,
        {
          backgroundColor:
            selectedPeriod === period ? colors.primary : colors.surface,
          borderColor: colors.border,
        },
      ]}
      onPress={() => setSelectedPeriod(period)}
    >
      <Text
        style={[
          styles.periodButtonText,
          { color: selectedPeriod === period ? colors.textInverse : colors.textPrimary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderEarningItem = ({ item }: { item: any }) => (
    <View style={[styles.earningItem, { backgroundColor: colors.surface }]}>
      <View style={styles.earningInfo}>
        <Text style={[styles.earningOrderId, { color: colors.textPrimary }]}>
          Order #{item.orderId?.slice(-6) || 'N/A'}
        </Text>
        <Text style={[styles.earningDate, { color: colors.textTertiary }]}>
          {new Date(item.deliveredAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.earningAmount}>
        <Text style={[styles.earningValue, { color: colors.success }]}>
          +₹{item.amount}
        </Text>
        <Text style={[styles.earningDistance, { color: colors.textTertiary }]}>
          {item.distance?.toFixed(1) || 0} km
        </Text>
      </View>
    </View>
  );

  const getCurrentEarnings = () => {
    switch (selectedPeriod) {
      case 'today':
        return summary.today;
      case 'week':
        return summary.week;
      case 'month':
        return summary.month;
      default:
        return 0;
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      testID="rider-earnings-screen"
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={[styles.backIcon, { color: colors.textPrimary }]}>
            ←
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Earnings
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View
          style={[styles.mainEarningCard, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.mainEarningLabel}>
            {selectedPeriod === 'today'
              ? "Today's Earnings"
              : selectedPeriod === 'week'
                ? 'This Week'
                : 'This Month'}
          </Text>
          <Text style={styles.mainEarningValue}>₹{getCurrentEarnings()}</Text>
          <Text style={styles.mainEarningSubtext}>
            {earnings.length} deliveries
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              ₹{summary.today}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
              Today
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              ₹{summary.week}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
              This Week
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              ₹{summary.month}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
              This Month
            </Text>
          </View>
        </View>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {renderPeriodButton('today', 'Today')}
        {renderPeriodButton('week', 'This Week')}
        {renderPeriodButton('month', 'This Month')}
      </View>

      {/* Earnings List */}
      {loading || !minDelayDone ? (
        <View style={[styles.loadingContainer, { paddingHorizontal: 16, justifyContent: 'flex-start' }]}>
          <SkeletonBox style={{ height: 64, width: 180, alignSelf: 'center', marginBottom: 16, borderRadius: 10 }} />
          <SkeletonBox style={{ height: 180, marginBottom: 16, borderRadius: 16 }} />
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonBox
              key={`earnings-row-${index}`}
              style={{ height: 68, borderRadius: 12, marginBottom: 10 }}
            />
          ))}
        </View>
      ) : (
        <FlatList
          data={earnings}
          renderItem={renderEarningItem}
          keyExtractor={item => item.orderId}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 20 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No earnings for this period
              </Text>
            </View>
          }
        />
      )}
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
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  summaryContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  mainEarningCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 12,
    alignItems: 'center',
  },
  mainEarningLabel: {
    color: Colors.TEXT_INVERSE,
    fontSize: 14,
    marginBottom: 8,
  },
  mainEarningValue: {
    color: Colors.TEXT_INVERSE,
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  mainEarningSubtext: {
    color: Colors.TEXT_INVERSE,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  earningItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  earningInfo: {},
  earningOrderId: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  earningDate: {
    fontSize: 12,
  },
  earningAmount: {
    alignItems: 'flex-end',
  },
  earningValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  earningDistance: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
  },
});

export default RiderEarningsScreen;





