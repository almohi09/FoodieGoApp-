import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Share,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import supabase from '../../../config/supabase';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import styles from './styles';
import { Colors } from '../../../theme';
import { showToast } from '../../../utils/toast';
import { SkeletonLoader } from '@/components/SkeletonLoader';

type RouteType = RouteProp<RootStackParamList, 'OwnerOrderDetail'>;

interface OrderDetails {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  rider_assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  address_id: string;
}

interface OrderItemRow {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const DEFAULT_COORDS = { latitude: 25.4358, longitude: 81.8463 };

export const OwnerOrderDetailScreen: React.FC = () => {
  const route = useRoute<RouteType>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [customerName, setCustomerName] = useState('Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [addressText, setAddressText] = useState('Address unavailable');
  const [coords, setCoords] = useState(DEFAULT_COORDS);
  const [loading, setLoading] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [minDelayDone, setMinDelayDone] = useState(false);

  const loadDetails = async () => {
    setLoading(true);
    setScreenError(null);
    try {
      const { data: orderData } = await supabase
        .from('orders')
        .select('id,status,total,subtotal,delivery_fee,created_at,updated_at,user_id,rider_assigned_at,picked_up_at,delivered_at,address_id')
        .eq('id', orderId)
        .single<OrderDetails>();

      if (!orderData) {
        setScreenError('Order details unavailable.');
        return;
      }

      setOrder(orderData);

      const [{ data: itemRows }, { data: userRow }, { data: addressRow }] = await Promise.all([
        supabase
          .from('order_items')
          .select('id,name,price,quantity')
          .eq('order_id', orderData.id)
          .returns<OrderItemRow[]>(),
        supabase
          .from('profiles')
          .select('name,phone')
          .eq('id', orderData.user_id)
          .maybeSingle<{ name: string; phone: string | null }>(),
        supabase
          .from('addresses')
          .select('street,city,state,pincode,lat,lng')
          .eq('id', orderData.address_id)
          .maybeSingle<{ street: string; city: string; state: string; pincode: string; lat: number | null; lng: number | null }>(),
      ]);

      setItems(itemRows || []);
      if (userRow) {
        setCustomerName(userRow.name || 'Customer');
        setCustomerPhone(userRow.phone || '');
      }
      if (addressRow) {
        setAddressText(`${addressRow.street}, ${addressRow.city}, ${addressRow.state} ${addressRow.pincode}`);
        if (typeof addressRow.lat === 'number' && typeof addressRow.lng === 'number') {
          setCoords({ latitude: addressRow.lat, longitude: addressRow.lng });
        }
      }
    } catch (error) {
      setScreenError(
        error instanceof Error ? error.message : 'Failed to fetch order details.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetails();
  }, [orderId]);

  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 500);
    return () => clearTimeout(t);
  }, []);

  const timeline = useMemo(
    () => [
      { label: 'Order placed', value: order?.created_at || '' },
      { label: 'Confirmed/Updated', value: order?.updated_at || '' },
      { label: 'Rider assigned', value: order?.rider_assigned_at || '' },
      { label: 'Picked up', value: order?.picked_up_at || '' },
      { label: 'Delivered', value: order?.delivered_at || '' },
    ],
    [order],
  );

  const taxes = useMemo(() => Number((Number(order?.subtotal || 0) * 0.05).toFixed(2)), [order?.subtotal]);
  const total = useMemo(
    () => Number((Number(order?.subtotal || 0) + Number(order?.delivery_fee || 0) + taxes).toFixed(2)),
    [order?.delivery_fee, order?.subtotal, taxes],
  );

  const handleCall = async () => {
    if (!customerPhone) {
      return;
    }

    const url = `tel:${customerPhone}`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  };

  const handlePrint = async () => {
    if (!order) {
      return;
    }

    const lines = [
      `FoodieGo Receipt`,
      `Order: ${order.id}`,
      `Customer: ${customerName}`,
      ``,
      ...items.map(item => `${item.quantity} x ${item.name} - INR ${(item.price * item.quantity).toFixed(2)}`),
      ``,
      `Subtotal: INR ${Number(order.subtotal).toFixed(2)}`,
      `Delivery: INR ${Number(order.delivery_fee).toFixed(2)}`,
      `Total: INR ${Number(order.total).toFixed(2)}`,
    ];

    await Share.share({ message: lines.join('\n') });
  };

  const openCustomerMap = async () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  };

  const updateStatus = async (next: string) => {
    if (!order) {
      return;
    }
    const { error } = await supabase.from('orders').update({ status: next }).eq('id', order.id);
    if (error) {
      showToast(error.message || 'Update failed', 'error');
      return;
    }
    setOrder(prev => (prev ? { ...prev, status: next } : prev));
  };

  if (loading || !minDelayDone) {
    return <SkeletonLoader />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {screenError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{screenError}</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setScreenError(null);
              void loadDetails();
            }}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.card}>
        <Text style={styles.title}>Order #{order?.id.slice(0, 8)}</Text>
        <Text style={styles.text}>Status: {order?.status || '-'}</Text>
        <Text style={styles.text}>Total: INR {Number(order?.total || 0).toFixed(2)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Items</Text>
        <View style={styles.tableHead}>
          <Text style={[styles.tableHeadText, styles.itemCol]}>Item</Text>
          <Text style={[styles.tableHeadText, styles.qtyCol]}>Qty</Text>
          <Text style={[styles.tableHeadText, styles.priceCol]}>Price</Text>
        </View>
        {items.map(item => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={[styles.text, styles.itemCol]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.text, styles.qtyCol]}>{item.quantity}</Text>
            <Text style={[styles.text, styles.priceCol]}>
              INR {(item.price * item.quantity).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Customer</Text>
        <Text style={styles.text}>{customerName}</Text>
        <Text style={styles.text}>{customerPhone || 'No phone'}</Text>
        <TouchableOpacity activeOpacity={0.7} style={styles.mapAddressRow} onPress={() => void openCustomerMap()}>
          <Icon name="location-outline" size={16} color={Colors.INFO} />
          <Text style={[styles.text, styles.mapAddressText]}>{addressText}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} style={styles.actionButton} onPress={() => void handleCall()}>
          <Text style={styles.actionButtonText}>Call Customer</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Delivery Address Map</Text>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }}
        >
          <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker coordinate={coords} title="Customer address" />
        </MapView>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Total Breakdown</Text>
        <View style={styles.timelineRow}>
          <Text style={styles.text}>Subtotal</Text>
          <Text style={styles.text}>INR {Number(order?.subtotal || 0).toFixed(2)}</Text>
        </View>
        <View style={styles.rowDivider} />
        <View style={styles.timelineRow}>
          <Text style={styles.text}>Delivery Fee</Text>
          <Text style={styles.text}>INR {Number(order?.delivery_fee || 0).toFixed(2)}</Text>
        </View>
        <View style={styles.rowDivider} />
        <View style={styles.timelineRow}>
          <Text style={styles.text}>Taxes (5%)</Text>
          <Text style={styles.text}>INR {taxes.toFixed(2)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.timelineRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>INR {total.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Order Timeline</Text>
        {timeline.map(row => (
          <View key={row.label} style={styles.timelineRow}>
            <Text style={styles.text}>{row.label}</Text>
            <Text style={styles.text}>{row.value ? new Date(row.value).toLocaleString('en-IN') : '-'}</Text>
          </View>
        ))}
      </View>

      {order?.status === 'confirmed' ? (
        <TouchableOpacity activeOpacity={0.7} style={styles.preparingButton} onPress={() => void updateStatus('preparing')}>
          <Text style={styles.actionButtonText}>Mark as Preparing</Text>
        </TouchableOpacity>
      ) : null}
      {order?.status === 'preparing' ? (
        <View style={styles.statusActionRow}>
          <TouchableOpacity activeOpacity={0.7}
            style={styles.assignRiderButton}
            onPress={() => showToast('Use Orders screen to assign rider.', 'info')}
          >
            <Text style={styles.actionButtonText}>Assign Rider</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} style={styles.readyPickupButton} onPress={() => void updateStatus('picked_up')}>
            <Text style={styles.actionButtonText}>Ready for Pickup</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity activeOpacity={0.7} style={styles.actionButton} onPress={() => void handlePrint()}>
        <Text style={styles.actionButtonText}>Print Bill</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default OwnerOrderDetailScreen;


