import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../../../theme';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { EmptyState } from '../../components/common';
import { Order } from '../../../domain/types';
import { orderService } from '../../../data/api/orderService';

type OrdersNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MainTabs'
>;

export const OrdersScreen: React.FC = () => {
  const navigation = useNavigation<OrdersNavigationProp>();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadOrders = React.useCallback(async () => {
    setIsLoading(true);
    const result = await orderService.getOrders({ page: 1, limit: 30 });
    if (result.success && result.orders) {
      setOrders(result.orders);
    } else {
      setOrders([]);
    }
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'delivered':
        return colors.success;
      case 'cancelled':
        return colors.error;
      case 'pending':
        return colors.warning;
      default:
        return colors.info;
    }
  };

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending Confirmation';
      case 'confirmed':
        return 'Confirmed';
      case 'preparing':
        return 'Preparing';
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() =>
        item.status === 'out_for_delivery' ||
        item.status === 'preparing' ||
        item.status === 'confirmed'
          ? navigation.navigate('OrderTracking', { orderId: item.id })
          : null
      }
    >
      <View style={styles.orderHeader}>
        <View style={styles.restaurantInfo}>
          <Image
            source={{ uri: item.restaurantImage }}
            style={styles.restaurantImage}
          />
          <View>
            <Text style={styles.restaurantName}>{item.restaurantName}</Text>
            <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.orderItems}>
        <Text style={styles.itemsText} numberOfLines={1}>
          {item.items.map(i => i.name).join(', ')}
        </Text>
        <Text style={styles.itemsCount}>
          {item.items.length} item{item.items.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>₹{item.finalAmount}</Text>
        {(item.status === 'out_for_delivery' ||
          item.status === 'preparing' ||
          item.status === 'confirmed') && (
          <TouchableOpacity
            style={styles.trackButton}
            onPress={() =>
              navigation.navigate('OrderTracking', { orderId: item.id })
            }
          >
            <Text style={styles.trackButtonText}>Track Order</Text>
          </TouchableOpacity>
        )}
      </View>

      {item.foodieCoinsEarned > 0 && (
        <View style={styles.coinsEarned}>
          <Text style={styles.coinsIcon}>🪙</Text>
          <Text style={styles.coinsText}>
            +{item.foodieCoinsEarned} coins earned
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={item => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={loadOrders}
        ListEmptyComponent={
          <EmptyState
            icon="📋"
            title="No Orders Yet"
            message="Your order history will appear here once you place an order."
            actionLabel="Start Ordering"
            onAction={() =>
              navigation.navigate('MainTabs', { screen: 'Home' } as any)
            }
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.sm,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  listContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantImage: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
    backgroundColor: colors.surfaceSecondary,
  },
  restaurantName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  orderDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.small,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  orderItems: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  itemsText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    marginRight: spacing.md,
  },
  itemsCount: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  trackButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
  },
  trackButtonText: {
    ...typography.captionMedium,
    color: colors.textInverse,
  },
  coinsEarned: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.loyaltyLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  coinsIcon: {
    fontSize: 14,
  },
  coinsText: {
    ...typography.small,
    color: colors.loyalty,
    fontWeight: '600',
  },
});
