import React, { useCallback, useState } from 'react';
import { SkeletonBox } from '@/components/SkeletonLoader';
import {
  ActivityIndicator, // size="small"
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import {
  adminDashboardService,
  SLAMetrics,
} from '../../api/adminDashboardService';

type AdminSLABreachNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AdminDashboard'
>;

type BreachType = 'all' | 'prep' | 'delivery' | 'response';
type TimeFilter = 'today' | 'week' | 'month';

interface MockBreachItem {
  id: string;
  type: 'prep' | 'delivery' | 'response';
  orderId: string;
  restaurantName: string;
  expectedMinutes: number;
  actualMinutes: number;
  delayMinutes: number;
  riderName?: string;
  createdAt: string;
  status: 'pending' | 'investigating' | 'resolved';
}

const generateMockBreaches = (): MockBreachItem[] => {
  const restaurants = [
    'Pizza Palace',
    'Burger Barn',
    'Sushi Station',
    'Taco Town',
    'Curry Corner',
    'Noodle House',
    'Grill Master',
    'Veggie Delight',
  ];
  const riders = ['Rajesh K.', 'Amit S.', 'Priya M.', 'Vikram J.', 'Sneha R.'];
  const types: ('prep' | 'delivery' | 'response')[] = [
    'prep',
    'delivery',
    'response',
  ];

  return Array.from({ length: 25 }, (_, i) => {
    const type = types[Math.floor(Math.random() * types.length)];
    const expected = type === 'prep' ? 25 : type === 'delivery' ? 35 : 5;
    const actual = expected + Math.floor(Math.random() * 30) + 5;
    const statuses: MockBreachItem['status'][] = [
      'pending',
      'investigating',
      'resolved',
    ];

    return {
      id: `breach_${i + 1}`,
      type,
      orderId: `ORD${String(10000 + i).padStart(5, '0')}`,
      restaurantName:
        restaurants[Math.floor(Math.random() * restaurants.length)],
      expectedMinutes: expected,
      actualMinutes: actual,
      delayMinutes: actual - expected,
      riderName:
        type === 'delivery'
          ? riders[Math.floor(Math.random() * riders.length)]
          : undefined,
      createdAt: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      status: statuses[Math.floor(Math.random() * statuses.length)],
    };
  });
};

export const AdminSLABreachScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<AdminSLABreachNavigationProp>();
  const insets = useSafeAreaInsets();

  const [breaches, setBreaches] = useState<MockBreachItem[]>(
    generateMockBreaches(),
  );
  const [loading, setLoading] = useState(false);
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [slaMetrics, setSLAMetrics] = useState<SLAMetrics | null>(null);
  const [breachFilter, setBreachFilter] = useState<BreachType>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [investigateId, setInvestigateId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const result = await adminDashboardService.getSLAMetrics();
      if (result.success && result.metrics) {
        setSLAMetrics(result.metrics);
      }
    } catch (error) {
      console.error('Failed to load SLA metrics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setBreaches(generateMockBreaches());
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 500);
    loadData();
    return () => clearTimeout(t);
  }, [loadData]);

  const filteredBreaches = breaches.filter(breach => {
    const matchesFilter =
      breachFilter === 'all' || breach.type === breachFilter;
    const matchesSearch =
      searchQuery === '' ||
      breach.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      breach.restaurantName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const breachCounts = {
    all: breaches.length,
    prep: breaches.filter(b => b.type === 'prep').length,
    delivery: breaches.filter(b => b.type === 'delivery').length,
    response: breaches.filter(b => b.type === 'response').length,
  };

  const statusCounts = {
    pending: breaches.filter(b => b.status === 'pending').length,
    investigating: breaches.filter(b => b.status === 'investigating').length,
    resolved: breaches.filter(b => b.status === 'resolved').length,
  };

  const handleInvestigate = (id: string) => {
    setInvestigateId(id);
    setBreaches(prev =>
      prev.map(b => (b.id === id ? { ...b, status: 'investigating' } : b)),
    );
    setTimeout(() => {
      setInvestigateId(null);
      setBreaches(prev =>
        prev.map(b => (b.id === id ? { ...b, status: 'resolved' } : b)),
      );
    }, 2000);
  };

  const getBreachTypeLabel = (type: MockBreachItem['type']) => {
    switch (type) {
      case 'prep':
        return 'Prep Time';
      case 'delivery':
        return 'Delivery Time';
      case 'response':
        return 'Response Time';
    }
  };

  const getBreachColor = (delayMinutes: number) => {
    if (delayMinutes > 30) return colors.error;
    if (delayMinutes > 15) return colors.warning;
    return colors.primary;
  };

  if (loading || !minDelayDone) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: 16 }]}>
        <SkeletonBox style={{ height: 220, marginBottom: 16, borderRadius: 16 }} />
        <SkeletonBox style={{ height: 18, width: '82%', marginBottom: 12 }} />
        <SkeletonBox style={{ height: 14, width: '56%', marginBottom: 10 }} />
        <SkeletonBox style={{ height: 14, width: '68%' }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.textPrimary }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SLA Breach Investigation</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.searchContainer}>
          <TextInput
            style={[
              styles.searchInput,
              { backgroundColor: 'rgba(255,255,255,0.15)', color: '#FFF' },
            ]}
            placeholder="Search order, restaurant..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={[styles.metricsCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.metricsTitle, { color: colors.textPrimary }]}>
          SLA Overview
        </Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: colors.primary }]}>
              {slaMetrics?.avgPrepTime?.toFixed(1) || '25.0'}m
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>
              Avg Prep
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: colors.primary }]}>
              {slaMetrics?.avgDeliveryTime?.toFixed(1) || '35.0'}m
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>
              Avg Delivery
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: colors.error }]}>
              {(slaMetrics?.slaBreaches?.prepTimeBreaches || 0) +
                (slaMetrics?.slaBreaches?.deliveryTimeBreaches || 0) || 12}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>
              Breaches
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: colors.error }]}>
              {(slaMetrics?.slaBreaches?.prepTimeBreaches ?? 0) +
                (slaMetrics?.slaBreaches?.deliveryTimeBreaches ?? 0) || 12}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>
              Breaches
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.filterSection, { backgroundColor: colors.surface }]}>
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
          Breach Type:
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(['all', 'prep', 'delivery', 'response'] as BreachType[]).map(
            type => (
              <TouchableOpacity activeOpacity={0.7}
                key={type}
                style={[
                  styles.filterChip,
                  breachFilter === type && { backgroundColor: colors.primary },
                ]}
                onPress={() => setBreachFilter(type)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color:
                        breachFilter === type ? '#FFF' : colors.textSecondary,
                    },
                  ]}
                >
                  {type === 'all' ? 'All' : getBreachTypeLabel(type)} (
                  {breachCounts[type]})
                </Text>
              </TouchableOpacity>
            ),
          )}
        </ScrollView>

        <Text
          style={[
            styles.filterLabel,
            { color: colors.textSecondary, marginTop: 12 },
          ]}
        >
          Time:
        </Text>
        <View style={styles.timeFilterRow}>
          {(['today', 'week', 'month'] as TimeFilter[]).map(time => (
            <TouchableOpacity activeOpacity={0.7}
              key={time}
              style={[
                styles.timeChip,
                timeFilter === time && { backgroundColor: colors.primary },
              ]}
              onPress={() => setTimeFilter(time)}
            >
              <Text
                style={[
                  styles.timeChipText,
                  {
                    color: timeFilter === time ? '#FFF' : colors.textSecondary,
                  },
                ]}
              >
                {time.charAt(0).toUpperCase() + time.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statusSummary}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: colors.warning + '20' },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: colors.warning }]}>
              Pending: {statusCounts.pending}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: colors.info + '20' },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: colors.info }]}>
              Investigating: {statusCounts.investigating}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: colors.success + '20' },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: colors.success }]}>
              Resolved: {statusCounts.resolved}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={filteredBreaches}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View
            style={[styles.breachCard, { backgroundColor: colors.surface }]}
          >
            <View style={styles.breachHeader}>
              <View
                style={[
                  styles.breachTypeBadge,
                  { backgroundColor: getBreachColor(item.delayMinutes) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.breachTypeText,
                    { color: getBreachColor(item.delayMinutes) },
                  ]}
                >
                  {getBreachTypeLabel(item.type)}
                </Text>
              </View>
              <View
                style={[
                  styles.statusIndicator,
                  {
                    backgroundColor:
                      item.status === 'resolved'
                        ? colors.success
                        : item.status === 'investigating'
                          ? colors.info
                          : colors.warning,
                  },
                ]}
              >
                <Text style={styles.statusIndicatorText}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.breachDetails}>
              <View style={styles.detailRow}>
                <Text
                  style={[styles.detailLabel, { color: colors.textTertiary }]}
                >
                  Order
                </Text>
                <Text
                  style={[styles.detailValue, { color: colors.textPrimary }]}
                >
                  {item.orderId}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text
                  style={[styles.detailLabel, { color: colors.textTertiary }]}
                >
                  Restaurant
                </Text>
                <Text
                  style={[styles.detailValue, { color: colors.textPrimary }]}
                >
                  {item.restaurantName}
                </Text>
              </View>
              {item.riderName && (
                <View style={styles.detailRow}>
                  <Text
                    style={[styles.detailLabel, { color: colors.textTertiary }]}
                  >
                    Rider
                  </Text>
                  <Text
                    style={[styles.detailValue, { color: colors.textPrimary }]}
                  >
                    {item.riderName}
                  </Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text
                  style={[styles.detailLabel, { color: colors.textTertiary }]}
                >
                  Delay
                </Text>
                <Text
                  style={[
                    styles.detailValue,
                    {
                      color: getBreachColor(item.delayMinutes),
                      fontWeight: '700',
                    },
                  ]}
                >
                  +{item.delayMinutes}m ({item.expectedMinutes}m â†’{' '}
                  {item.actualMinutes}m)
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text
                  style={[styles.detailLabel, { color: colors.textTertiary }]}
                >
                  Time
                </Text>
                <Text
                  style={[styles.detailValue, { color: colors.textSecondary }]}
                >
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
            </View>

            {item.status === 'pending' && (
              <TouchableOpacity activeOpacity={0.7}
                style={[
                  styles.investigateButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => handleInvestigate(item.id)}
                disabled={investigateId === item.id}
              >
                {investigateId === item.id ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.investigateButtonText}>
                    Start Investigation
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No SLA breaches found
            </Text>
          </View>
        }
      />
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
  searchContainer: { marginTop: 12 },
  searchInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
  },
  metricsCard: { margin: 16, padding: 16, borderRadius: 16 },
  metricsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  metricsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  metricItem: { alignItems: 'center', flex: 1 },
  metricValue: { fontSize: 18, fontWeight: '700' },
  metricLabel: { fontSize: 11, marginTop: 4 },
  filterSection: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  filterLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  filterScroll: { gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  timeFilterRow: { flexDirection: 'row', gap: 8 },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  timeChipText: { fontSize: 13, fontWeight: '500' },
  statusSummary: { flexDirection: 'row', marginTop: 12, gap: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  listContent: { padding: 16 },
  breachCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  breachHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breachTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  breachTypeText: { fontSize: 12, fontWeight: '700' },
  statusIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusIndicatorText: { fontSize: 11, fontWeight: '600', color: '#FFF' },
  breachDetails: { gap: 6 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: '500' },
  investigateButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  investigateButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  emptyContainer: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 14 },
});

export default AdminSLABreachScreen;




