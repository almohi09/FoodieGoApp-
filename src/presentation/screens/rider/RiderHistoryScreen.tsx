import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { useTheme } from '../../../context/ThemeContext';
import { riderService, RiderOrder } from '../../../data/api/riderService';

type RiderHistoryNavigationProp = NativeStackNavigationProp<
  any,
  'RiderHistory'
>;

export const RiderHistoryScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<RiderHistoryNavigationProp>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadData = useCallback(
    async (pageNum: number = 1, isRefresh: boolean = false) => {
      try {
        const result = await riderService.getDeliveryHistory({
          page: pageNum,
          limit: 20,
          status: 'delivered',
        });
        if (result.success) {
          if (isRefresh || pageNum === 1) {
            setOrders(result.orders || []);
          } else {
            setOrders(prev => [...prev, ...(result.orders || [])]);
          }
          setHasMore((result.orders?.length || 0) === 20);
        }
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    loadData(1, true);
  }, [loadData]);

  const onEndReached = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadData(nextPage);
    }
  };

  const renderOrderItem = ({ item }: { item: RiderOrder }) => (
    <TouchableOpacity
      style={[styles.orderItem, { backgroundColor: colors.surface }]}
      onPress={() =>
        navigation.navigate('RiderTaskDetail', {
          orderId: item.id,
          order: item,
        })
      }
    >
      <View style={styles.orderHeader}>
        <View>
          <Text style={[styles.orderRestaurant, { color: colors.textPrimary }]}>
            {item.restaurantName}
          </Text>
          <Text style={[styles.orderDate, { color: colors.textTertiary }]}>
            {new Date(item.deliveredAt || item.assignedAt).toLocaleDateString(
              'en-IN',
              {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              },
            )}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: colors.success + '20' },
          ]}
        >
          <Text style={[styles.statusText, { color: colors.success }]}>
            {item.status === 'delivered' ? '✓ Delivered' : item.status}
          </Text>
        </View>
      </View>
      <View style={styles.orderFooter}>
        <Text style={[styles.orderId, { color: colors.textTertiary }]}>
          #{item.orderId?.slice(-8) || 'N/A'}
        </Text>
        <Text style={[styles.orderAmount, { color: colors.primary }]}>
          +₹{item.deliveryFee}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={[styles.backIcon, { color: colors.textPrimary }]}>
            ←
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Delivery History
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={styles.statIcon}>📦</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {orders.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
            Deliveries
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={styles.statIcon}>⭐</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            4.8
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
            Rating
          </Text>
        </View>
      </View>

      {/* Orders List */}
      {loading && orders.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={item => item.id}
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
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No delivery history yet
              </Text>
              <Text
                style={[styles.emptySubtext, { color: colors.textTertiary }]}
              >
                Your completed deliveries will appear here
              </Text>
            </View>
          }
          ListFooterComponent={
            loading && orders.length > 0 ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={styles.footerLoader}
              />
            ) : null
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
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  orderItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderRestaurant: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 12,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
  footerLoader: {
    marginVertical: 16,
  },
});

export default RiderHistoryScreen;
