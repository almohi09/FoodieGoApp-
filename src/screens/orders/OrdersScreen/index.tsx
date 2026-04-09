import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { useAuthStore } from '../../../store/authStore';
import { listOrderItems, listOrders, OrderStatus } from '../../../api/ordersApi';
import { EmptyState } from '../../../components/EmptyState';
import { InlineErrorCard } from '../../../components/InlineErrorCard';
import { OrdersScreenSkeleton } from '../../../components/skeletons';
import { Colors } from '../../../theme';
import styles from './styles';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface RenderOrder {
  id: string;
  status: OrderStatus;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  restaurantId: string;
  restaurantName: string;
  itemCount: number;
}

const STATUS_STYLE_BY_STATUS: Record<
  OrderStatus,
  { badge: ViewStyle; text: TextStyle }
> = {
  placed: { badge: styles.statusPlaced, text: styles.statusTextPlaced },
  confirmed: { badge: styles.statusConfirmed, text: styles.statusTextConfirmed },
  preparing: { badge: styles.statusPreparing, text: styles.statusTextPreparing },
  picked_up: { badge: styles.statusPickedUp, text: styles.statusTextPickedUp },
  delivered: { badge: styles.statusDelivered, text: styles.statusTextDelivered },
  cancelled: { badge: styles.statusCancelled, text: styles.statusTextCancelled },
};

export const OrdersScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore(state => state.user);
  const [orders, setOrders] = useState<RenderOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      setOrders([]);
      return;
    }

    setLoading(true);
    setError(null);
    const ordersResult = await listOrders(user.id);
    if (!ordersResult.success) {
      setOrders([]);
      setError(ordersResult.error || 'Unable to load orders');
      setLoading(false);
      return;
    }

    const ids = ordersResult.orders.map(order => order.id);
    const itemsResult = await listOrderItems(ids);
    const countsByOrder = new Map<string, number>();

    if (itemsResult.success) {
      itemsResult.items.forEach(item => {
        countsByOrder.set(item.order_id, (countsByOrder.get(item.order_id) || 0) + item.quantity);
      });
    }

    setOrders(
      ordersResult.orders.map(order => ({
        id: order.id,
        status: order.status,
        total: Number(order.total),
        paymentMethod: (order.payment_method || 'cod').toUpperCase(),
        paymentStatus: (order.payment_status || 'pending').toUpperCase(),
        createdAt: order.created_at,
        restaurantId: order.restaurant_id,
        restaurantName: order.restaurants?.name || 'Restaurant',
        itemCount: countsByOrder.get(order.id) || 0,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => setMinDelayDone(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const { activeOrders, pastOrders } = useMemo(() => {
    const active = orders.filter(order => order.status !== 'delivered' && order.status !== 'cancelled');
    const past = orders.filter(order => order.status === 'delivered' || order.status === 'cancelled');
    return {
      activeOrders: active,
      pastOrders: past,
    };
  }, [orders]);

  const selectedOrders = activeTab === 'active' ? activeOrders : pastOrders;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orders</Text>
        <View style={styles.tabsRow}>
          <TouchableOpacity activeOpacity={0.7}
            style={[styles.tabChip, activeTab === 'active' ? styles.tabChipActive : null]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabChipText, activeTab === 'active' ? styles.tabChipTextActive : null]}>
              Active Orders
            </Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}
            style={[styles.tabChip, activeTab === 'past' ? styles.tabChipActive : null]}
            onPress={() => setActiveTab('past')}
          >
            <Text style={[styles.tabChipText, activeTab === 'past' ? styles.tabChipTextActive : null]}>
              Past Orders
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={loading && !minDelayDone ? [] : selectedOrders}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={Colors.PRIMARY} />}
        renderItem={({ item }) => {
          const statusStyle = STATUS_STYLE_BY_STATUS[item.status];

          return (
            <TouchableOpacity activeOpacity={0.7}
              style={styles.orderCard}
              onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })}
            >
              <View style={styles.orderTopRow}>
                <Text style={styles.restaurantName}>{item.restaurantName}</Text>
                <View style={[styles.statusBadge, statusStyle.badge]}>
                  <Text style={[styles.statusText, statusStyle.text]}>{item.status.replace('_', ' ')}</Text>
                </View>
              </View>
              <Text style={styles.orderMeta}>
                {new Date(item.createdAt).toLocaleDateString('en-IN')} | {item.itemCount} items
              </Text>
              <Text style={styles.orderMeta}>
                Payment: {item.paymentMethod} | {item.paymentStatus}
              </Text>
              <View style={styles.orderBottomRow}>
                <Text style={styles.totalText}>INR {item.total.toFixed(2)}</Text>
                {activeTab === 'past' ? (
                  <TouchableOpacity activeOpacity={0.7}
                    style={styles.reorderButton}
                    onPress={() =>
                      navigation.navigate('RestaurantDetail', {
                        restaurantId: item.restaurantId,
                      })
                    }
                  >
                    <Text style={styles.reorderText}>Reorder</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          loading && !minDelayDone ? (
            <OrdersScreenSkeleton />
          ) : error ? (
            <InlineErrorCard message={error} onRetry={() => void loadData()} />
          ) : (
            <EmptyState
              illustration="no-orders"
              title={`No ${activeTab} orders`}
              subtitle="Orders will appear here once you place them."
            />
          )
        }
      />
    </View>
  );
};

export default OrdersScreen;

