import { useToast } from '@/components/Toast';
import React, { useCallback, useEffect, useState } from 'react';
import {ActivityIndicator, // size="small"
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/theme/colors';
import { RootStackParamList } from '../../navigation/AppNavigator';
import {
  sellerOrderService,
  SellerOrder,
} from '../../api/sellerOrderService';
import { sellerMenuService } from '../../api/sellerMenuService';
import { sellerEarningsService } from '../../api/sellerEarningsService';
import { sellerRestaurantService } from '../../api/sellerRestaurantService';
import { adminAuditService } from '../../api/adminAuditService';
import { MenuItem } from '../../types';

type SellerDashboardNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SellerDashboard'
>;

const { width } = Dimensions.get('window');

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  trend?: string;
  trendUp?: boolean;
  colors: any;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendUp,
  colors,
}) => (
  <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
    <View
      style={[
        styles.statIconContainer,
        { backgroundColor: colors.primary + '15' },
      ]}
    >
      <Text style={styles.statIcon}>{icon}</Text>
    </View>
    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
      {value}
    </Text>
    <Text style={[styles.statTitle, { color: colors.textSecondary }]}>
      {title}
    </Text>
    {trend && (
      <View
        style={[
          styles.trendBadge,
          {
            backgroundColor: trendUp
              ? colors.success + '20'
              : colors.error + '20',
          },
        ]}
      >
        <Text
          style={[
            styles.trendText,
            { color: trendUp ? colors.success : colors.error },
          ]}
        >
          {trend}
        </Text>
      </View>
    )}
  </View>
);

const formatOrderLine = (order: SellerOrder): string =>
  `INR ${Math.round(order.finalAmount || 0)} â€¢ ${order.status}`;

export const SellerDashboardScreen: React.FC = () => {
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const { colors, isDark } = theme;
  const navigation = useNavigation<SellerDashboardNavigationProp>();
  const insets = useSafeAreaInsets();

  const [restaurantId, setRestaurantId] = useState('restaurant_1');
  const [stats, setStats] = useState({
    todayOrders: '0',
    revenue: 'INR 0',
    avgOrderValue: 'INR 0',
    pending: '0',
  });
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [pendingOrders, setPendingOrders] = useState<SellerOrder[]>([]);
  const [lowStockItems, setLowStockItems] = useState<MenuItem[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const refresh = useCallback(async (id: string) => {
    const [orderStats, pendingOrdersResult, lowStock, earnings, storeStatus] =
      await Promise.all([
        sellerOrderService.getOrderStats(id),
        sellerOrderService.getPendingOrders(id),
        sellerMenuService.getLowStockItems(id),
        sellerEarningsService.getEarningsSummary(id),
        sellerRestaurantService.getOperationalStatus(id),
      ]);

    setStats({
      todayOrders: String(orderStats.stats?.completedToday || 0),
      revenue: `INR ${Math.round(orderStats.stats?.revenueToday || 0)}`,
      avgOrderValue: `INR ${Math.round(earnings.summary?.averageOrderValue || 0)}`,
      pending: String(pendingOrdersResult.orders?.length || 0),
    });
    setPendingOrders(pendingOrdersResult.orders || []);
    setLowStockItems(lowStock.items || []);
    if (storeStatus.success && storeStatus.status) {
      setIsStoreOpen(storeStatus.status.isOpen);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const sellerRaw = await AsyncStorage.getItem('seller_data');
      const seller = sellerRaw ? JSON.parse(sellerRaw) : null;
      const resolvedRestaurantId =
        seller?.restaurantId || seller?.id || 'restaurant_1';
      setRestaurantId(resolvedRestaurantId);
      await refresh(resolvedRestaurantId);
    };

    init();
  }, [refresh]);

  const handleLogout = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'LoginOptions' }],
    });
  };

  const handleManageMenu = () => {
    navigation.navigate('SellerMenu');
  };

  const handleStoreStatusToggle = async () => {
    setActionLoadingId('store-status');
    const next = !isStoreOpen;
    const response = await sellerRestaurantService.setOperationalStatus(
      restaurantId,
      next,
      next ? undefined : 'Temporarily closed by seller',
    );
    if (response.success && response.status) {
      await adminAuditService.recordEvent({
        actorRole: 'seller',
        actorId: restaurantId,
        action: response.status.isOpen ? 'store_open' : 'store_close',
        targetType: 'restaurant',
        targetId: restaurantId,
        outcome: 'success',
      });
      setIsStoreOpen(response.status.isOpen);
      showToast({ type: 'info', message: response.status.isOpen ? 'Store is now OPEN' : 'Store is now CLOSED', });
    } else {
      await adminAuditService.recordEvent({
        actorRole: 'seller',
        actorId: restaurantId,
        action: next ? 'store_open' : 'store_close',
        targetType: 'restaurant',
        targetId: restaurantId,
        outcome: 'failure',
        errorCode: response.errorCode,
        details: response.error,
      });
      showToast({ type: 'info', message: response.error || 'Failed to update status' });
    }
    setActionLoadingId(null);
  };

  const handleOrderAction = async (
    orderId: string,
    action: 'accept' | 'reject' | 'start_prep' | 'ready',
  ) => {
    setActionLoadingId(`${action}-${orderId}`);
    let success = false;
    let error = '';

    if (action === 'accept') {
      const res = await sellerOrderService.acceptOrder(restaurantId, orderId);
      success = res.success;
      error = res.error || '';
    } else if (action === 'reject') {
      const res = await sellerOrderService.rejectOrder(
        restaurantId,
        orderId,
        'Temporarily unable to serve',
      );
      success = res.success;
      error = res.error || '';
    } else if (action === 'start_prep') {
      const res = await sellerOrderService.startPreparing(
        restaurantId,
        orderId,
      );
      success = res.success;
      error = res.error || '';
    } else if (action === 'ready') {
      const res = await sellerOrderService.markReady(restaurantId, orderId);
      success = res.success;
      error = res.error || '';
    }

    if (!success) {
      await adminAuditService.recordEvent({
        actorRole: 'seller',
        actorId: restaurantId,
        action: `order_${action}`,
        targetType: 'order',
        targetId: orderId,
        outcome: 'failure',
        details: error || 'Unable to update order',
      });
      showToast({ type: 'error', message: error || 'Unable to update order' });
    } else {
      await adminAuditService.recordEvent({
        actorRole: 'seller',
        actorId: restaurantId,
        action: `order_${action}`,
        targetType: 'order',
        targetId: orderId,
        outcome: 'success',
      });
    }
    await refresh(restaurantId);
    setActionLoadingId(null);
  };

  const handleStockQuickAction = async (item: MenuItem) => {
    setActionLoadingId(`stock-${item.id}`);
    const targetAvailability = !item.isAvailable;
    const toggleResult = await sellerMenuService.toggleItemAvailability(
      restaurantId,
      item.id,
      targetAvailability,
    );
    if (!toggleResult.success) {
      await adminAuditService.recordEvent({
        actorRole: 'seller',
        actorId: restaurantId,
        action: 'menu_stock_toggle',
        targetType: 'menu_item',
        targetId: item.id,
        outcome: 'failure',
        errorCode: toggleResult.errorCode,
        details: toggleResult.error,
      });
      showToast({ type: 'info', message: toggleResult.error || 'Unable to update item', });
      setActionLoadingId(null);
      return;
    }

    if (targetAvailability) {
      await sellerMenuService.updateItemStock(restaurantId, item.id, 20);
    }
    await adminAuditService.recordEvent({
      actorRole: 'seller',
      actorId: restaurantId,
      action: targetAvailability
        ? 'menu_restock_enable'
        : 'menu_mark_unavailable',
      targetType: 'menu_item',
      targetId: item.id,
      outcome: 'success',
    });
    await refresh(restaurantId);
    setActionLoadingId(null);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top }}
      testID="seller-dashboard-screen"
    >
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity activeOpacity={0.7} onPress={handleLogout}>
            <Text style={styles.headerIcon}>Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={toggleTheme}>
            <Text style={styles.headerIcon}>{isDark ? 'Light' : 'Dark'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>FG</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.restaurantName}>Seller Operations</Text>
            <View
              style={[styles.statusBadge, { backgroundColor: colors.surface }]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isStoreOpen
                      ? colors.success
                      : colors.error,
                  },
                ]}
              />
              <Text style={[styles.statusText, { color: colors.textPrimary }]}>
                {isStoreOpen ? 'Store Open' : 'Store Closed'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Today's Orders"
          value={stats.todayOrders}
          icon="Orders"
          trend="+12%"
          trendUp
          colors={colors}
        />
        <StatCard
          title="Revenue"
          value={stats.revenue}
          icon="INR"
          trend="+8%"
          trendUp
          colors={colors}
        />
        <StatCard
          title="Avg Order Value"
          value={stats.avgOrderValue}
          icon="AOV"
          colors={colors}
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          icon="Queue"
          colors={colors}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Menu
        </Text>
        <View style={[styles.actionCard, { backgroundColor: colors.surface }]}>
          <TouchableOpacity activeOpacity={0.7}
            style={styles.menuManagementBtn}
            onPress={handleManageMenu}
            testID="seller-menu-management-button"
          >
            <Text style={styles.menuManagementIcon}>ðŸ½ï¸</Text>
            <View style={styles.menuManagementInfo}>
              <Text
                style={[
                  styles.menuManagementTitle,
                  { color: colors.textPrimary },
                ]}
              >
                Menu Management
              </Text>
              <Text
                style={[
                  styles.menuManagementSub,
                  { color: colors.textSecondary },
                ]}
              >
                Add, edit, or remove items
              </Text>
            </View>
            <Text
              style={[
                styles.menuManagementArrow,
                { color: colors.textTertiary },
              ]}
            >
              â†’
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Store Control
        </Text>
        <View style={[styles.actionCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
            Operational Status: {isStoreOpen ? 'OPEN' : 'CLOSED'}
          </Text>
          <TouchableOpacity activeOpacity={0.7}
            style={[
              styles.actionButton,
              { backgroundColor: isStoreOpen ? colors.error : colors.success },
            ]}
            onPress={handleStoreStatusToggle}
            disabled={actionLoadingId === 'store-status'}
            testID="seller-store-status-toggle"
          >
            {actionLoadingId === 'store-status' ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.actionButtonText}>
                {isStoreOpen ? 'Close Store' : 'Open Store'}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}
            style={[styles.storeHoursButton, { borderColor: colors.primary }]}
            onPress={() => navigation.navigate('SellerStoreHours')}
          >
            <Text
              style={[styles.storeHoursButtonText, { color: colors.primary }]}
            >
              Set Store Hours
            </Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}
            style={[styles.storeHoursButton, { borderColor: colors.primary }]}
            onPress={() => navigation.navigate('SellerNotificationPreferences')}
          >
            <Text
              style={[styles.storeHoursButtonText, { color: colors.primary }]}
            >
              Notifications
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Pending Queue Actions
        </Text>
        <View style={[styles.actionCard, { backgroundColor: colors.surface }]}>
          {pendingOrders.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No pending orders right now.
            </Text>
          ) : (
            pendingOrders.slice(0, 5).map(order => (
              <View
                key={order.id}
                style={[styles.queueRow, { borderBottomColor: colors.border }]}
              >
                <View style={styles.queueMeta}>
                  <Text
                    style={[styles.queueOrderId, { color: colors.textPrimary }]}
                  >
                    #{order.id.slice(0, 8)}
                  </Text>
                  <Text
                    style={[styles.queueSub, { color: colors.textSecondary }]}
                  >
                    {formatOrderLine(order)}
                  </Text>
                  {order.prepSLAMinutes && order.status === 'preparing' && (
                    <View style={styles.slaIndicator}>
                      <Text style={styles.slaText}>
                        â±ï¸ Prep SLA: {order.prepSLAMinutes} min
                      </Text>
                      {order.prepDeadline && (
                        <Text
                          style={[
                            styles.slaDeadline,
                            {
                              color:
                                new Date(order.prepDeadline) < new Date()
                                  ? colors.error
                                  : colors.warning,
                            },
                          ]}
                        >
                          {new Date(order.prepDeadline) < new Date()
                            ? 'âš ï¸ OVERDUE'
                            : `Due ${new Date(order.prepDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
                <View style={styles.queueActions}>
                  {order.status === 'pending' && (
                    <>
                      <TouchableOpacity activeOpacity={0.7}
                        style={[
                          styles.queueActionBtn,
                          { backgroundColor: colors.success },
                        ]}
                        onPress={() => handleOrderAction(order.id, 'accept')}
                        disabled={actionLoadingId === `accept-${order.id}`}
                      >
                        <Text style={styles.queueActionText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity activeOpacity={0.7}
                        style={[
                          styles.queueActionBtn,
                          { backgroundColor: colors.error },
                        ]}
                        onPress={() => handleOrderAction(order.id, 'reject')}
                        disabled={actionLoadingId === `reject-${order.id}`}
                      >
                        <Text style={styles.queueActionText}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {order.status === 'confirmed' && (
                    <TouchableOpacity activeOpacity={0.7}
                      style={[
                        styles.queueActionBtn,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={() => handleOrderAction(order.id, 'start_prep')}
                      disabled={actionLoadingId === `start_prep-${order.id}`}
                    >
                      <Text style={styles.queueActionText}>Start Prep</Text>
                    </TouchableOpacity>
                  )}
                  {order.status === 'preparing' && (
                    <TouchableOpacity activeOpacity={0.7}
                      style={[
                        styles.queueActionBtn,
                        { backgroundColor: colors.success },
                      ]}
                      onPress={() => handleOrderAction(order.id, 'ready')}
                      disabled={actionLoadingId === `ready-${order.id}`}
                    >
                      <Text style={styles.queueActionText}>Mark Ready</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Low Stock Quick Fix
        </Text>
        <View style={[styles.actionCard, { backgroundColor: colors.surface }]}>
          {lowStockItems.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No low stock alerts.
            </Text>
          ) : (
            lowStockItems.slice(0, 5).map(item => (
              <View
                key={item.id}
                style={[styles.queueRow, { borderBottomColor: colors.border }]}
              >
                <View style={styles.queueMeta}>
                  <Text
                    style={[styles.queueOrderId, { color: colors.textPrimary }]}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.queueSub, { color: colors.textSecondary }]}
                  >
                    Status: {item.isAvailable ? 'Available' : 'Unavailable'}
                  </Text>
                </View>
                <TouchableOpacity activeOpacity={0.7}
                  style={[
                    styles.queueActionBtn,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={() => handleStockQuickAction(item)}
                  disabled={actionLoadingId === `stock-${item.id}`}
                >
                  <Text style={styles.queueActionText}>
                    {item.isAvailable ? 'Mark Unavailable' : 'Restock + Enable'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          FoodieGo Partner Pilot Ops
        </Text>
      </View>
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerIcon: {
    fontSize: 14,
    color: Colors.TEXT_INVERSE,
    fontWeight: '700',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 20,
    color: Colors.TEXT_INVERSE,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.TEXT_INVERSE,
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    marginTop: -20,
    gap: 12,
  },
  statCard: {
    width: (width - 48) / 2,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 14,
    fontWeight: '700',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
  },
  trendBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginTop: 8,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingLeft: 4,
  },
  menuManagementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  menuManagementIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  menuManagementInfo: {
    flex: 1,
  },
  menuManagementTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuManagementSub: {
    fontSize: 12,
    marginTop: 2,
  },
  menuManagementArrow: {
    fontSize: 20,
  },
  actionCard: {
    borderRadius: 16,
    padding: 14,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: Colors.TEXT_INVERSE,
    fontSize: 14,
    fontWeight: '700',
  },
  storeHoursButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeHoursButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  queueMeta: {
    flex: 1,
    paddingRight: 8,
  },
  queueOrderId: {
    fontSize: 14,
    fontWeight: '700',
  },
  queueSub: {
    fontSize: 12,
    marginTop: 2,
  },
  queueActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  queueActionBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  queueActionText: {
    color: Colors.TEXT_INVERSE,
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    padding: 24,
  },
  footerText: {
    fontSize: 12,
  },
  bottomSpacer: {
    height: 32,
  },
  slaIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  slaText: {
    fontSize: 11,
    color: '#666',
  },
  slaDeadline: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default SellerDashboardScreen;











