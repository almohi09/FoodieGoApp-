import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { useTheme } from '../../../context/ThemeContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import {
  dispatchService,
  DispatchOrder,
  DispatchRider,
  DispatchStatus,
} from '../../../data/api/dispatchService';
import { adminAuditService } from '../../../data/api/adminAuditService';

type AdminDispatchBoardNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AdminDashboard'
>;

type FilterStatus = DispatchStatus | 'all';

export const AdminDispatchBoardScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<AdminDispatchBoardNavigationProp>();
  const insets = useSafeAreaInsets();

  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [riders, setRiders] = useState<DispatchRider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  const loadData = useCallback(async () => {
    try {
      const result = await dispatchService.getDispatchBoard(50);
      if (result.orders) {
        setOrders(result.orders);
      }
      if (result.riders) {
        setRiders(result.riders);
      }
    } catch (error) {
      console.error('Failed to load dispatch board:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const logAudit = async (
    action: string,
    targetId: string,
    success: boolean,
    details?: string,
  ) => {
    await adminAuditService.recordEvent({
      actorRole: 'admin',
      action,
      targetType: 'order',
      targetId,
      outcome: success ? 'success' : 'failure',
      details,
    });
  };

  const handleAssignRider = async (order: DispatchOrder) => {
    const candidate = riders.find(rider => rider.isAvailable);
    if (!candidate) {
      return;
    }
    setLoadingActionId(`assign-${order.id}`);
    const result = await dispatchService.assignRider(order.id, candidate.id);
    if (result.success) {
      await logAudit('dispatch_assign_rider', order.id, true);
      await loadData();
    } else {
      await logAudit('dispatch_assign_rider', order.id, false, result.error);
    }
    setLoadingActionId(null);
  };

  const getNextStatus = (current: DispatchStatus): DispatchStatus | null => {
    if (current === 'assigned') return 'picked_up';
    if (current === 'picked_up') return 'out_for_delivery';
    if (current === 'out_for_delivery') return 'delivered';
    return null;
  };

  const handleProgress = async (order: DispatchOrder) => {
    const nextStatus = getNextStatus(order.status);
    if (!nextStatus) return;

    setLoadingActionId(`progress-${order.id}`);
    const generatedOtp =
      nextStatus === 'delivered'
        ? `${Math.floor(1000 + Math.random() * 9000)}`
        : undefined;
    const result = await dispatchService.updateStatus(
      order.id,
      nextStatus,
      generatedOtp,
    );
    if (result.success) {
      await logAudit(`dispatch_${nextStatus}`, order.id, true);
      await loadData();
    } else {
      await logAudit(`dispatch_${nextStatus}`, order.id, false, result.error);
    }
    setLoadingActionId(null);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      searchQuery === '' ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.restaurantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.riderName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: orders.length,
    ready_for_pickup: orders.filter(o => o.status === 'ready_for_pickup')
      .length,
    assigned: orders.filter(o => o.status === 'assigned').length,
    picked_up: orders.filter(o => o.status === 'picked_up').length,
    out_for_delivery: orders.filter(o => o.status === 'out_for_delivery')
      .length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };

  const statusLabels: Record<FilterStatus, string> = {
    all: 'All',
    ready_for_pickup: 'Ready',
    assigned: 'Assigned',
    picked_up: 'Picked',
    out_for_delivery: 'Delivering',
    delivered: 'Delivered',
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>Dispatch Board</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.searchContainer}>
          <TextInput
            style={[
              styles.searchInput,
              { backgroundColor: 'rgba(255,255,255,0.15)', color: '#FFF' },
            ]}
            placeholder="Search order, restaurant, rider..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={[styles.filterBar, { backgroundColor: colors.surface }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(Object.keys(statusLabels) as FilterStatus[]).map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                statusFilter === status && { backgroundColor: colors.primary },
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      statusFilter === status ? '#FFF' : colors.textSecondary,
                  },
                ]}
              >
                {statusLabels[status]} ({statusCounts[status]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const nextStatus = getNextStatus(item.status);
          const canAssign = item.status === 'ready_for_pickup' || !item.riderId;
          return (
            <View
              style={[styles.orderCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.orderHeader}>
                <Text style={[styles.orderId, { color: colors.textPrimary }]}>
                  #{item.id.slice(0, 8)}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: colors.primary + '20' },
                  ]}
                >
                  <Text
                    style={[styles.statusBadgeText, { color: colors.primary }]}
                  >
                    {item.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text
                style={[styles.restaurantName, { color: colors.textSecondary }]}
              >
                {item.restaurantName || 'Restaurant'}
              </Text>
              <Text style={[styles.orderAmount, { color: colors.textPrimary }]}>
                INR {Math.round(item.amount)}
              </Text>
              {item.riderName && (
                <Text
                  style={[styles.riderName, { color: colors.textTertiary }]}
                >
                  Rider: {item.riderName}
                </Text>
              )}
              <View style={styles.orderActions}>
                {canAssign && (
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={() => handleAssignRider(item)}
                    disabled={loadingActionId === `assign-${item.id}`}
                    testID={`dispatch-board-assign-${item.id}`}
                  >
                    {loadingActionId === `assign-${item.id}` ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.actionBtnText}>Assign Rider</Text>
                    )}
                  </TouchableOpacity>
                )}
                {nextStatus && !canAssign && (
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      { backgroundColor: colors.success },
                    ]}
                    onPress={() => handleProgress(item)}
                    disabled={loadingActionId === `progress-${item.id}`}
                    testID={`dispatch-board-progress-${item.id}`}
                  >
                    {loadingActionId === `progress-${item.id}` ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.actionBtnText}>
                        {item.status === 'assigned'
                          ? 'Mark Picked'
                          : item.status === 'picked_up'
                            ? 'Start Delivery'
                            : 'Mark Delivered'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
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
              No dispatch orders found
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
  filterBar: { paddingVertical: 12 },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  listContent: { padding: 16 },
  orderCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: { fontSize: 16, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  restaurantName: { fontSize: 14, marginBottom: 4 },
  orderAmount: { fontSize: 15, fontWeight: '600' },
  riderName: { fontSize: 12, marginTop: 4 },
  orderActions: { flexDirection: 'row', marginTop: 12, gap: 8 },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  emptyContainer: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 14 },
});

export default AdminDispatchBoardScreen;
