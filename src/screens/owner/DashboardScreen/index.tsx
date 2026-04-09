import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import supabase from '../../../config/supabase';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { useAuthStore } from '../../../store/authStore';
import { useOwnerStore } from '../../../store/ownerStore';
import { Colors } from '../../../theme';
import { EmptyState } from '../../../components/EmptyState';
import { InlineErrorCard } from '../../../components/InlineErrorCard';
import { OwnerDashboardSkeleton } from '../../../components/skeletons';
import styles from './styles';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface DashboardOrder {
  id: string;
  status: string;
  total: number;
  created_at: string;
  user_id: string;
  customerName: string;
  itemsCount: number;
}

const statusColor = (status: string) => {
  if (status === 'placed') {
    return Colors.TEXT_TERTIARY;
  }
  if (status === 'confirmed') {
    return Colors.INFO;
  }
  if (status === 'preparing') {
    return Colors.WARNING;
  }
  if (status === 'picked_up') {
    return Colors.INFO;
  }
  if (status === 'delivered') {
    return Colors.SUCCESS;
  }
  return Colors.ERROR;
};

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const profile = useAuthStore(state => state.profile);
  const {
    currentRestaurant,
    fetchCurrentRestaurant,
    toggleRestaurantOpen,
  } = useOwnerStore();

  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [showNewOrderBanner, setShowNewOrderBanner] = useState(false);
  const bannerY = React.useRef(new Animated.Value(-68)).current;
  const openAnim = React.useRef(
    new Animated.Value(currentRestaurant?.is_open ? 1 : 0),
  ).current;

  const loadData = async () => {
    if (!profile?.id) {
      return;
    }

    setRefreshing(true);
    setError(null);
    const mapped = await fetchCurrentRestaurant(profile.id);

    if (mapped) {
      const restaurantId = useOwnerStore.getState().currentRestaurant?.id;
      if (restaurantId) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const { data: orderRows } = await supabase
          .from('orders')
          .select('id,status,total,created_at,user_id')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', startOfDay.toISOString())
          .order('created_at', { ascending: false })
          .returns<Array<{ id: string; status: string; total: number; created_at: string; user_id: string }>>();

        const rows = orderRows || [];
        const orderIds = rows.map(order => order.id);
        const userIds = [...new Set(rows.map(order => order.user_id))];

        const [{ data: itemsData }, { data: usersData }] = await Promise.all([
          supabase
            .from('order_items')
            .select('order_id,quantity')
            .in('order_id', orderIds)
            .returns<Array<{ order_id: string; quantity: number }>>(),
          supabase
            .from('profiles')
            .select('id,name')
            .in('id', userIds)
            .returns<Array<{ id: string; name: string }>>(),
        ]);

        const itemsCountByOrder = new Map<string, number>();
        (itemsData || []).forEach(item => {
          itemsCountByOrder.set(
            item.order_id,
            (itemsCountByOrder.get(item.order_id) || 0) + item.quantity,
          );
        });

        const userNameById = new Map<string, string>();
        (usersData || []).forEach(user => {
          userNameById.set(user.id, user.name || 'Customer');
        });

        setOrders(
          rows.map(row => ({
            ...row,
            customerName: userNameById.get(row.user_id) || 'Customer',
            itemsCount: itemsCountByOrder.get(row.id) || 0,
          })),
        );
      }
    } else {
      setError('Unable to load owner dashboard');
    }

    setRefreshing(false);
  };

  useEffect(() => {
    void loadData();
  }, [profile?.id]);

  useEffect(() => {
    const timer = setTimeout(() => setMinDelayDone(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    Animated.timing(openAnim, {
      toValue: currentRestaurant?.is_open ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentRestaurant?.is_open, openAnim]);

  useEffect(() => {
    const restaurantId = currentRestaurant?.id;
    if (!restaurantId) {
      return;
    }

    const channel = supabase
      .channel(`owner-dashboard-orders-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          setShowNewOrderBanner(true);
          Animated.timing(bannerY, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }).start();
          setTimeout(() => {
            Animated.timing(bannerY, {
              toValue: -68,
              duration: 220,
              useNativeDriver: true,
            }).start(() => setShowNewOrderBanner(false));
          }, 3500);
          void loadData();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [bannerY, currentRestaurant?.id]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const revenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
    const cancelledOrders = orders.filter(order => order.status === 'cancelled').length;
    const avgOrder = totalOrders > 0 ? revenue / totalOrders : 0;

    return {
      totalOrders,
      revenue,
      avgOrder,
      cancelledOrders,
    };
  }, [orders]);

  const handleToggle = (next: boolean) => {
    if (!next) {
      Alert.alert(
        'Close restaurant?',
        "Customers won't be able to order.",
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Close',
            style: 'destructive',
            onPress: () => {
              void toggleRestaurantOpen(false);
            },
          },
        ],
      );
      return;
    }

    void toggleRestaurantOpen(true);
  };

  const openBg = openAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.BG_TERTIARY, Colors.SUCCESS],
  });
  const openText = openAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.TEXT_SECONDARY, Colors.TEXT_INVERSE],
  });

  const recentOrders = orders.slice(0, 5);
  const showSkeleton = refreshing && !minDelayDone;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={Colors.PRIMARY} />}
    >
      {showNewOrderBanner ? (
        <Animated.View style={[styles.newOrderBanner, { transform: [{ translateY: bannerY }] }]}>
          <TouchableOpacity activeOpacity={0.7}
            style={styles.newOrderBannerTap}
            onPress={() => navigation.navigate('RestaurantOwnerTabs', { screen: 'OwnerOrders' } as never)}
          >
            <Icon name="notifications" size={16} color={Colors.TEXT_INVERSE} />
            <Text style={styles.newOrderBannerText}>New order received!</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : null}
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <Text style={styles.restaurantName}>{currentRestaurant?.name || 'Restaurant'}</Text>
          <TouchableOpacity activeOpacity={0.7}
            onPress={() => handleToggle(!Boolean(currentRestaurant?.is_open))}
          >
            <Animated.View style={[styles.openPill, { backgroundColor: openBg }]}>
              <Animated.Text style={[styles.openPillText, { color: openText }]}>
                {currentRestaurant?.is_open ? 'OPEN' : 'CLOSED'}
              </Animated.Text>
            </Animated.View>
          </TouchableOpacity>
        </View>
        <Text style={styles.subText}>
          {currentRestaurant?.is_open ? 'Open for orders' : 'Closed'}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: Colors.INFO_LIGHT }]}>
            <Icon name="receipt-outline" size={16} color={Colors.INFO} />
          </View>
          <Text style={styles.statLabel}>Total orders today</Text>
          <Text style={styles.statValue}>{stats.totalOrders}</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: Colors.SUCCESS_LIGHT }]}>
            <Icon name="cash-outline" size={16} color={Colors.SUCCESS} />
          </View>
          <Text style={styles.statLabel}>Revenue today</Text>
          <Text style={styles.statValue}>INR {stats.revenue.toFixed(0)}</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: Colors.WARNING_LIGHT }]}>
            <Icon name="stats-chart-outline" size={16} color={Colors.WARNING} />
          </View>
          <Text style={styles.statLabel}>Avg order value</Text>
          <Text style={styles.statValue}>INR {stats.avgOrder.toFixed(0)}</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: Colors.ERROR_LIGHT }]}>
            <Icon name="close-circle-outline" size={16} color={Colors.ERROR} />
          </View>
          <Text style={styles.statLabel}>Cancelled orders</Text>
          <Text style={styles.statValue}>{stats.cancelledOrders}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Orders</Text>
      {showSkeleton ? (
        <OwnerDashboardSkeleton />
      ) : error ? (
        <InlineErrorCard message={error} onRetry={() => void loadData()} />
      ) : recentOrders.length === 0 ? (
        <EmptyState
          illustration="no-orders"
          title="No recent orders yet"
          subtitle="New orders will appear here."
        />
      ) : (
        recentOrders.map(order => {
          const color = statusColor(order.status);
          return (
            <TouchableOpacity activeOpacity={0.7}
              key={order.id}
              style={styles.orderCard}
              onPress={() => navigation.navigate('OwnerOrderDetail', { orderId: order.id })}
            >
              <View style={styles.orderTopRow}>
                <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
                  <Text style={[styles.statusText, { color }]}>{order.status.replace('_', ' ')}</Text>
                </View>
              </View>
              <Text style={styles.orderMeta}>{order.customerName}</Text>
              <Text style={styles.orderMeta}>
                {order.itemsCount} items | INR {Number(order.total).toFixed(0)}
              </Text>
              <Text style={styles.orderMeta}>
                {new Date(order.created_at).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
};

export default DashboardScreen;


