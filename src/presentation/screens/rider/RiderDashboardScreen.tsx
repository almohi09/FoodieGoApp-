import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import {
  riderService,
  RiderOrder,
  RiderStats,
} from '../../../data/api/riderService';
import {
  riderAuthStore,
  RiderProfile,
} from '../../../data/stores/riderAuthStore';
import { riderLocationService } from '../../../data/services/riderLocationService';
import {
  riderNotificationService,
  NewOrderNotification,
} from '../../../data/services/riderNotificationService';
import {
  riderWebSocketService,
  OrderAssignment,
} from '../../../data/services/riderWebSocketService';

type RiderDashboardNavigationProp = NativeStackNavigationProp<any>;

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  colors: any;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, colors }) => (
  <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
      {value}
    </Text>
    <Text style={[styles.statTitle, { color: colors.textSecondary }]}>
      {title}
    </Text>
  </View>
);

export const RiderDashboardScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<RiderDashboardNavigationProp>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [stats, setStats] = useState<RiderStats | null>(null);
  const [assignedOrders, setAssignedOrders] = useState<RiderOrder[]>([]);
  const [activeOrder, setActiveOrder] = useState<RiderOrder | null>(null);
  const [riderProfile, setRiderProfile] = useState<RiderProfile | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [newOrderAlert, setNewOrderAlert] =
    useState<NewOrderNotification | null>(null);
  const [realtimeOrder, setRealtimeOrder] = useState<OrderAssignment | null>(
    null,
  );

  const loadData = useCallback(async () => {
    try {
      const [profileResult, statsResult, ordersResult] = await Promise.all([
        riderAuthStore.getProfile(),
        riderService.getStats(),
        riderService.getAssignedOrders(),
      ]);

      if (profileResult) {
        setRiderProfile(profileResult);
        setIsOnline(profileResult.isOnline);
        if (profileResult.isOnline) {
          riderLocationService.startTracking();
        }
      }

      if (statsResult.success && statsResult.stats) {
        setStats(statsResult.stats);
      }
      if (ordersResult.success && ordersResult.orders) {
        setAssignedOrders(ordersResult.orders);
        const active = ordersResult.orders.find(
          o => o.status === 'picked_up' || o.status === 'out_for_delivery',
        );
        setActiveOrder(active || null);
      }
    } catch (error) {
      console.error('Failed to load rider data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    let cleanupNotifications: (() => void) | undefined;
    let cleanupWs: (() => void) | undefined;

    const initServices = async () => {
      await riderNotificationService.initialize();
      setUnreadNotifications(riderNotificationService.getUnreadCount());

      const unsubscribe = riderNotificationService.addNotificationListener(
        notification => {
          if (!notification.read) {
            setUnreadNotifications(prev => prev + 1);
          }
        },
      );

      const unsubscribeNewOrder = riderNotificationService.addNewOrderListener(
        order => {
          setNewOrderAlert(order);
          setUnreadNotifications(prev => prev + 1);
          loadData();
        },
      );

      cleanupNotifications = () => {
        unsubscribe();
        unsubscribeNewOrder();
      };

      if (riderWebSocketService.isConnected()) {
        setWsConnected(true);
      } else {
        await riderWebSocketService.connect();
      }

      const unsubscribeWsConnection =
        riderWebSocketService.addConnectionListener(connected => {
          setWsConnected(connected);
        });

      const unsubscribeWsOrder = riderWebSocketService.addOrderListener(
        order => {
          setRealtimeOrder(order);
          setNewOrderAlert({
            orderId: order.orderId,
            restaurantName: order.restaurantName,
            restaurantAddress: order.restaurantAddress,
            customerAddress: order.customerAddress,
            deliveryFee: order.deliveryFee,
            distance: order.distance,
            estimatedEarnings: order.deliveryFee,
          });
          loadData();
        },
      );

      cleanupWs = () => {
        unsubscribeWsConnection();
        unsubscribeWsOrder();
      };
    };

    initServices().catch(console.warn);

    return () => {
      cleanupNotifications?.();
      cleanupWs?.();
    };
  }, [loadData]);

  useEffect(() => {
    if (isOnline) {
      riderWebSocketService.connect();
    } else {
      riderWebSocketService.disconnect();
    }
  }, [isOnline]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleToggleOnline = async () => {
    try {
      const newStatus = !isOnline;
      const result = await riderService.setOnlineStatus(newStatus);
      if (result.success) {
        setIsOnline(newStatus);
        if (riderProfile) {
          const updatedProfile = { ...riderProfile, isOnline: newStatus };
          setRiderProfile(updatedProfile);
          await riderAuthStore.updateOnlineStatus(newStatus);
        }
        if (newStatus) {
          riderLocationService.startTracking();
        } else {
          riderLocationService.stopTracking();
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to update status');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          if (isOnline) {
            await riderService.setOnlineStatus(false);
            riderLocationService.stopTracking();
          }
          await riderAuthStore.clearSession();
          navigation.reset({
            index: 0,
            routes: [{ name: 'Splash' }],
          });
        },
      },
    ]);
  };

  const handleOrderPress = (order: RiderOrder) => {
    navigation.navigate('RiderTaskDetail', { orderId: order.id, order });
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
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      testID="rider-dashboard-screen"
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              Welcome back,
            </Text>
            <Text style={[styles.name, { color: colors.textPrimary }]}>
              {riderProfile?.name || 'Rider'}
            </Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.notificationButton}>
              <Text style={styles.notificationIcon}>🔔</Text>
              {unreadNotifications > 0 && (
                <View
                  style={[
                    styles.notificationBadge,
                    { backgroundColor: colors.error },
                  ]}
                >
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.profileButton}
            >
              <Text style={styles.profileIcon}>👤</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* New Order Alert */}
        {newOrderAlert && (
          <TouchableOpacity
            style={[styles.newOrderAlert, { backgroundColor: colors.primary }]}
            onPress={() => {
              setNewOrderAlert(null);
              loadData();
            }}
          >
            <Text style={styles.newOrderIcon}>🆕</Text>
            <View style={styles.newOrderInfo}>
              <Text style={styles.newOrderTitle}>New Order!</Text>
              <Text style={styles.newOrderSubtitle}>
                {newOrderAlert.restaurantName} - ₹{newOrderAlert.deliveryFee}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.newOrderClose}
              onPress={() => setNewOrderAlert(null)}
            >
              <Text style={styles.newOrderCloseText}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Online/Offline Toggle */}
        <View style={[styles.statusCard, { backgroundColor: colors.surface }]}>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
              Status
            </Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isOnline
                      ? colors.success
                      : colors.textTertiary,
                  },
                ]}
              />
              <Text style={[styles.statusText, { color: colors.textPrimary }]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
              {isOnline && (
                <View style={styles.wsIndicator}>
                  <View
                    style={[
                      styles.wsDot,
                      {
                        backgroundColor: wsConnected
                          ? colors.success
                          : colors.error,
                      },
                    ]}
                  />
                  <Text style={[styles.wsText, { color: colors.textTertiary }]}>
                    {wsConnected ? 'Live' : 'Reconnecting...'}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { backgroundColor: isOnline ? colors.error : colors.success },
            ]}
            onPress={handleToggleOnline}
            testID="rider-online-toggle"
          >
            <Text style={styles.toggleButtonText}>
              {isOnline ? 'Go Offline' : 'Go Online'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Realtime Order Alert */}
        {realtimeOrder && (
          <View
            style={[
              styles.realtimeOrderCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.realtimeOrderHeader}>
              <Text style={styles.realtimeOrderIcon}>🔔</Text>
              <Text
                style={[
                  styles.realtimeOrderTitle,
                  { color: colors.textPrimary },
                ]}
              >
                New Order Received!
              </Text>
            </View>
            <View style={styles.realtimeOrderDetails}>
              <Text
                style={[
                  styles.realtimeOrderRestaurant,
                  { color: colors.textPrimary },
                ]}
              >
                {realtimeOrder.restaurantName}
              </Text>
              <Text
                style={[
                  styles.realtimeOrderAddress,
                  { color: colors.textSecondary },
                ]}
              >
                {realtimeOrder.restaurantAddress}
              </Text>
              <View style={styles.realtimeOrderMeta}>
                <Text
                  style={[styles.realtimeOrderFee, { color: colors.success }]}
                >
                  ₹{realtimeOrder.deliveryFee}
                </Text>
                <Text
                  style={[
                    styles.realtimeOrderDistance,
                    { color: colors.textTertiary },
                  ]}
                >
                  {realtimeOrder.distance.toFixed(1)} km
                </Text>
              </View>
            </View>
            <View style={styles.realtimeOrderActions}>
              <TouchableOpacity
                style={[
                  styles.acceptOrderButton,
                  { backgroundColor: colors.success },
                ]}
                onPress={async () => {
                  const result =
                    await riderWebSocketService.acceptOrderFromWebSocket(
                      realtimeOrder.orderId,
                    );
                  if (result.success) {
                    setRealtimeOrder(null);
                    loadData();
                  } else {
                    Alert.alert(
                      'Error',
                      result.error || 'Failed to accept order',
                    );
                  }
                }}
              >
                <Text style={styles.acceptOrderButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.rejectOrderButton,
                  { borderColor: colors.error },
                ]}
                onPress={async () => {
                  const result =
                    await riderWebSocketService.rejectOrderFromWebSocket(
                      realtimeOrder.orderId,
                      'Too far',
                    );
                  if (result.success) {
                    setRealtimeOrder(null);
                  }
                }}
              >
                <Text
                  style={[
                    styles.rejectOrderButtonText,
                    { color: colors.error },
                  ]}
                >
                  Reject
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Active Order Banner */}
        {activeOrder && (
          <TouchableOpacity
            style={[
              styles.activeOrderBanner,
              { backgroundColor: colors.primary },
            ]}
            onPress={() => handleOrderPress(activeOrder)}
          >
            <Text style={styles.activeOrderIcon}>📦</Text>
            <View style={styles.activeOrderInfo}>
              <Text style={styles.activeOrderTitle}>Active Delivery</Text>
              <Text style={styles.activeOrderSubtitle}>
                {activeOrder.status === 'picked_up'
                  ? 'Head to customer'
                  : 'On the way'}
              </Text>
            </View>
            <Text style={styles.activeOrderArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              title="Today's Earnings"
              value={`₹${stats?.earningsToday || 0}`}
              icon="💰"
              colors={colors}
            />
            <StatCard
              title="Deliveries Today"
              value={`${stats?.completedToday || 0}`}
              icon="📦"
              colors={colors}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              title="This Week"
              value={`₹${stats?.earningsWeek || 0}`}
              icon="📅"
              colors={colors}
            />
            <StatCard
              title="Rating"
              value={`${stats?.averageRating?.toFixed(1) || '0.0'} ⭐`}
              icon="⭐"
              colors={colors}
            />
          </View>
        </View>

        {/* Assigned Orders */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Available Orders ({assignedOrders.length})
          </Text>
          {assignedOrders.length === 0 ? (
            <View
              style={[styles.emptyCard, { backgroundColor: colors.surface }]}
            >
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No orders available
              </Text>
              <Text
                style={[styles.emptySubtext, { color: colors.textTertiary }]}
              >
                Pull down to refresh
              </Text>
            </View>
          ) : (
            assignedOrders.map(order => (
              <TouchableOpacity
                key={order.id}
                style={[styles.orderCard, { backgroundColor: colors.surface }]}
                onPress={() => handleOrderPress(order)}
              >
                <View style={styles.orderHeader}>
                  <Text style={styles.orderIcon}>🍔</Text>
                  <View style={styles.orderInfo}>
                    <Text
                      style={[
                        styles.orderRestaurant,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {order.restaurantName}
                    </Text>
                    <Text
                      style={[
                        styles.orderAddress,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {order.restaurantAddress}
                    </Text>
                  </View>
                </View>
                <View style={styles.orderDetails}>
                  <Text style={[styles.orderAmount, { color: colors.primary }]}>
                    ₹{order.deliveryFee}
                  </Text>
                  <Text
                    style={[styles.orderItems, { color: colors.textTertiary }]}
                  >
                    {order.items.length} items
                  </Text>
                </View>
                <View style={styles.orderActions}>
                  <TouchableOpacity
                    style={[
                      styles.acceptButton,
                      { backgroundColor: colors.success },
                    ]}
                    onPress={() => {
                      riderService.acceptOrder(order.id).then(result => {
                        if (result.success) {
                          loadData();
                        } else {
                          Alert.alert('Error', result.error);
                        }
                      });
                    }}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rejectButton, { borderColor: colors.error }]}
                    onPress={() => {
                      riderService
                        .rejectOrder(order.id, 'Too far')
                        .then(result => {
                          if (result.success) {
                            loadData();
                          }
                        });
                    }}
                  >
                    <Text
                      style={[styles.rejectButtonText, { color: colors.error }]}
                    >
                      Reject
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View
        style={[
          styles.bottomNav,
          { backgroundColor: colors.surface, paddingBottom: insets.bottom },
        ]}
      >
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navLabel, { color: colors.primary }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('RiderEarnings')}
        >
          <Text style={styles.navIcon}>💰</Text>
          <Text style={[styles.navLabel, { color: colors.textSecondary }]}>
            Earnings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('RiderHistory')}
        >
          <Text style={styles.navIcon}>📋</Text>
          <Text style={[styles.navLabel, { color: colors.textSecondary }]}>
            History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={[styles.navLabel, { color: colors.textSecondary }]}>
            Profile
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {
    fontSize: 24,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationIcon: {
    fontSize: 24,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  newOrderAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  newOrderIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  newOrderInfo: {
    flex: 1,
  },
  newOrderTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  newOrderSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  newOrderClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newOrderCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  statusInfo: {},
  statusLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
  },
  wsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  wsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  wsText: {
    fontSize: 12,
  },
  realtimeOrderCard: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FF6B00',
    overflow: 'hidden',
  },
  realtimeOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    padding: 12,
  },
  realtimeOrderIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  realtimeOrderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  realtimeOrderDetails: {
    padding: 16,
  },
  realtimeOrderRestaurant: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  realtimeOrderAddress: {
    fontSize: 14,
    marginBottom: 12,
  },
  realtimeOrderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  realtimeOrderFee: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  realtimeOrderDistance: {
    fontSize: 14,
  },
  realtimeOrderActions: {
    flexDirection: 'row',
    padding: 12,
    paddingTop: 0,
  },
  acceptOrderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  acceptOrderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rejectOrderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  rejectOrderButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  toggleButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  activeOrderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  activeOrderIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  activeOrderInfo: {
    flex: 1,
  },
  activeOrderTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  activeOrderSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  activeOrderArrow: {
    color: '#fff',
    fontSize: 24,
  },
  statsGrid: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  orderCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderRestaurant: {
    fontSize: 16,
    fontWeight: '600',
  },
  orderAddress: {
    fontSize: 14,
    marginTop: 2,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  orderItems: {
    fontSize: 14,
  },
  orderActions: {
    flexDirection: 'row',
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  rejectButtonText: {
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 12,
  },
});

export default RiderDashboardScreen;
