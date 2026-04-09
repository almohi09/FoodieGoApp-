import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import { OrderStatus } from '../api/ordersApi';

export interface TrackingPoint {
  latitude: number;
  longitude: number;
}

interface TrackingOrderRow {
  id: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string | null;
  payment_status: string | null;
  created_at: string;
  updated_at: string;
  restaurant_id: string;
  address_id: string;
  rider_lat: number | null;
  rider_lng: number | null;
  rider_name: string | null;
  rider_phone: string | null;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  name: string;
  price: number;
  quantity: number;
}

interface AddressRow {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  lat: number | null;
  lng: number | null;
}

interface RestaurantRow {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
}

export interface OrderTrackingData {
  order: TrackingOrderRow | null;
  items: OrderItemRow[];
  customerLocation: TrackingPoint | null;
  restaurantLocation: TrackingPoint | null;
  riderLocation: TrackingPoint | null;
  riderName: string;
  riderPhone: string;
  customerAddress: string;
  restaurantName: string;
  statusTimestamps: Partial<Record<OrderStatus, string>>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const normalizeError = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: string }).message;
    if (message) {
      return message;
    }
  }

  return fallback;
};

export const useOrderTracking = (orderId: string): OrderTrackingData => {
  const [order, setOrder] = useState<TrackingOrderRow | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [customerLocation, setCustomerLocation] = useState<TrackingPoint | null>(null);
  const [restaurantLocation, setRestaurantLocation] = useState<TrackingPoint | null>(null);
  const [riderLocation, setRiderLocation] = useState<TrackingPoint | null>(null);
  const [riderName, setRiderName] = useState('Rider will be assigned soon');
  const [riderPhone, setRiderPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('Address unavailable');
  const [restaurantName, setRestaurantName] = useState('Restaurant');
  const [statusTimestamps, setStatusTimestamps] = useState<Partial<Record<OrderStatus, string>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(
          'id,status,subtotal,delivery_fee,total,payment_method,payment_status,created_at,updated_at,restaurant_id,address_id,rider_lat,rider_lng,rider_name,rider_phone',
        )
        .eq('id', orderId)
        .single<TrackingOrderRow>();

      if (orderError || !orderData) {
        throw new Error(normalizeError(orderError, 'Failed to load order'));
      }

      setOrder(orderData);
      setRiderName(orderData.rider_name || 'Rider will be assigned soon');
      setRiderPhone(orderData.rider_phone || '');

      if (typeof orderData.rider_lat === 'number' && typeof orderData.rider_lng === 'number') {
        setRiderLocation({ latitude: orderData.rider_lat, longitude: orderData.rider_lng });
      }

      setStatusTimestamps(prev => ({
        ...prev,
        placed: prev.placed || orderData.created_at,
        [orderData.status]: prev[orderData.status] || orderData.updated_at,
      }));

      const [{ data: itemsData }, { data: addressData }, { data: restaurantData }] = await Promise.all([
        supabase
          .from('order_items')
          .select('id,order_id,name,price,quantity')
          .eq('order_id', orderData.id)
          .returns<OrderItemRow[]>(),
        supabase
          .from('addresses')
          .select('id,label,street,city,state,pincode,lat,lng')
          .eq('id', orderData.address_id)
          .maybeSingle<AddressRow>(),
        supabase
          .from('restaurants')
          .select('id,name,lat,lng')
          .eq('id', orderData.restaurant_id)
          .maybeSingle<RestaurantRow>(),
      ]);

      setItems(itemsData || []);

      if (addressData) {
        if (typeof addressData.lat === 'number' && typeof addressData.lng === 'number') {
          setCustomerLocation({ latitude: addressData.lat, longitude: addressData.lng });
        }
        setCustomerAddress(
          `${addressData.street}, ${addressData.city}, ${addressData.state} ${addressData.pincode}`,
        );
      }

      if (restaurantData) {
        if (typeof restaurantData.lat === 'number' && typeof restaurantData.lng === 'number') {
          setRestaurantLocation({ latitude: restaurantData.lat, longitude: restaurantData.lng });
        }
        setRestaurantName(restaurantData.name);
      }
    } catch (loadError) {
      setError(normalizeError(loadError, 'Failed to load order tracking'));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (!orderId) {
      return;
    }

    const channel = supabase
      .channel(`order-tracking-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        payload => {
          const updated = payload.new as TrackingOrderRow;
          setOrder(prev => (prev ? { ...prev, ...updated } : updated));
          setRiderName(updated.rider_name || 'Rider will be assigned soon');
          setRiderPhone(updated.rider_phone || '');

          if (typeof updated.rider_lat === 'number' && typeof updated.rider_lng === 'number') {
            setRiderLocation({ latitude: updated.rider_lat, longitude: updated.rider_lng });
          }

          setStatusTimestamps(prev => ({
            ...prev,
            [updated.status]: prev[updated.status] || updated.updated_at,
          }));
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
      }
    };
  }, [orderId]);

  return useMemo(
    () => ({
      order,
      items,
      customerLocation,
      restaurantLocation,
      riderLocation,
      riderName,
      riderPhone,
      customerAddress,
      restaurantName,
      statusTimestamps,
      loading,
      error,
      refresh: loadOrder,
    }),
    [
      customerAddress,
      customerLocation,
      error,
      items,
      loadOrder,
      loading,
      order,
      restaurantLocation,
      restaurantName,
      riderLocation,
      riderName,
      riderPhone,
      statusTimestamps,
    ],
  );
};

export default useOrderTracking;
