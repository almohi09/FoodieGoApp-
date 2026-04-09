import { create } from 'zustand';
import supabase from '../config/supabase';
import { locationService } from '../services/locationService';
import { notificationService } from '../services/notificationService';

export interface RiderDeliveryOrder {
  id: string;
  status: string;
  total: number;
  restaurantId: string;
  restaurantName: string;
  restaurantLat: number;
  restaurantLng: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerLat: number;
  customerLng: number;
  itemsCount: number;
  distanceKm: number;
  createdAt: string;
}

interface RiderStore {
  isOnline: boolean;
  riderId: string | null;
  currentDelivery: RiderDeliveryOrder | null;
  incomingDelivery: RiderDeliveryOrder | null;
  todayEarnings: number;
  todayDeliveries: number;
  onlineHours: number;
  error: string | null;
  initialize: (userId: string) => Promise<boolean>;
  createRiderProfile: (
    userId: string,
    vehicleType: 'bike' | 'bicycle' | 'scooter',
    vehicleNumber: string,
  ) => Promise<boolean>;
  setOnlineStatus: (isOnline: boolean) => Promise<boolean>;
  updateLocation: (lat: number, lng: number) => Promise<void>;
  refreshCurrentDelivery: () => Promise<void>;
  refreshTodayStats: () => Promise<void>;
  acceptDelivery: (orderId: string) => Promise<boolean>;
  declineDelivery: (orderId: string) => Promise<boolean>;
  confirmPickup: (orderId: string) => Promise<boolean>;
  confirmDelivery: (orderId: string) => Promise<boolean>;
}

const DEFAULT_COORDS = { lat: 25.4358, lng: 81.8463 };

let stopTracking: (() => void) | null = null;
let onlineStartedAt: number | null = null;

const normalizeError = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: string }).message;
    if (message) {
      return message;
    }
  }

  return fallback;
};

const calcDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earth = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earth * c;
};

export const useRiderStore = create<RiderStore>((set, get) => ({
  isOnline: false,
  riderId: null,
  currentDelivery: null,
  incomingDelivery: null,
  todayEarnings: 0,
  todayDeliveries: 0,
  onlineHours: 0,
  error: null,

  initialize: async userId => {
    const { data: riderRow, error } = await supabase
      .from('riders')
      .select('id,is_online,last_location_update')
      .eq('user_id', userId)
      .maybeSingle<{ id: string; is_online: boolean; last_location_update: string | null }>();

    if (error || !riderRow) {
      set({ riderId: null, isOnline: false });
      return false;
    }

    set({ riderId: riderRow.id, isOnline: Boolean(riderRow.is_online), error: null });
    await get().refreshTodayStats();
    await get().refreshCurrentDelivery();
    return true;
  },

  createRiderProfile: async (userId, vehicleType, vehicleNumber) => {
    const { data, error } = await supabase
      .from('riders')
      .insert({
        user_id: userId,
        vehicle_type: vehicleType,
        vehicle_number: vehicleNumber,
        is_online: false,
      })
      .select('id')
      .single<{ id: string }>();

    if (error || !data) {
      set({ error: normalizeError(error, 'Failed to create rider profile') });
      return false;
    }

    set({ riderId: data.id, isOnline: false, error: null });
    return true;
  },

  setOnlineStatus: async isOnline => {
    const riderId = get().riderId;
    if (!riderId) {
      set({ error: 'Rider profile not found' });
      return false;
    }

    const { error } = await supabase
      .from('riders')
      .update({
        is_online: isOnline,
        last_location_update: new Date().toISOString(),
      })
      .eq('id', riderId);

    if (error) {
      set({ error: normalizeError(error, 'Failed to update online status') });
      return false;
    }

    set({ isOnline, error: null });

    if (isOnline) {
      onlineStartedAt = Date.now();
      stopTracking?.();
      stopTracking = await locationService.startRiderTracking(async coords => {
        await get().updateLocation(coords.lat, coords.lng);
      });
    } else {
      stopTracking?.();
      stopTracking = null;
      if (onlineStartedAt) {
        const elapsed = Date.now() - onlineStartedAt;
        set(state => ({
          onlineHours: state.onlineHours + elapsed / (1000 * 60 * 60),
        }));
      }
      onlineStartedAt = null;
    }

    return true;
  },

  updateLocation: async (lat, lng) => {
    const riderId = get().riderId;
    if (!riderId) {
      return;
    }

    await supabase
      .from('riders')
      .update({
        current_lat: lat,
        current_lng: lng,
        last_location_update: new Date().toISOString(),
      })
      .eq('id', riderId);
  },

  refreshCurrentDelivery: async () => {
    const riderId = get().riderId;
    if (!riderId) {
      set({ currentDelivery: null, incomingDelivery: null });
      return;
    }

    const { data: orderRow } = await supabase
      .from('orders')
      .select('id,status,total,restaurant_id,user_id,address_id,created_at')
      .eq('rider_id', riderId)
      .in('status', ['confirmed', 'preparing', 'picked_up'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{
        id: string;
        status: string;
        total: number;
        restaurant_id: string;
        user_id: string;
        address_id: string;
        created_at: string;
      }>();

    if (!orderRow) {
      set({ currentDelivery: null, incomingDelivery: null });
      return;
    }

    const [{ data: restaurant }, { data: customer }, { data: address }, { data: items }, { data: riderRow }] = await Promise.all([
      supabase
        .from('restaurants')
        .select('name,lat,lng')
        .eq('id', orderRow.restaurant_id)
        .maybeSingle<{ name: string; lat: number | null; lng: number | null }>(),
      supabase
        .from('profiles')
        .select('name,phone')
        .eq('id', orderRow.user_id)
        .maybeSingle<{ name: string; phone: string | null }>(),
      supabase
        .from('addresses')
        .select('street,city,state,pincode,lat,lng')
        .eq('id', orderRow.address_id)
        .maybeSingle<{ street: string; city: string; state: string; pincode: string; lat: number | null; lng: number | null }>(),
      supabase
        .from('order_items')
        .select('quantity')
        .eq('order_id', orderRow.id)
        .returns<Array<{ quantity: number }>>(),
      supabase
        .from('riders')
        .select('current_lat,current_lng')
        .eq('id', riderId)
        .maybeSingle<{ current_lat: number | null; current_lng: number | null }>(),
    ]);

    const riderLat = riderRow?.current_lat ?? DEFAULT_COORDS.lat;
    const riderLng = riderRow?.current_lng ?? DEFAULT_COORDS.lng;
    const restLat = restaurant?.lat ?? DEFAULT_COORDS.lat;
    const restLng = restaurant?.lng ?? DEFAULT_COORDS.lng;
    const custLat = address?.lat ?? DEFAULT_COORDS.lat;
    const custLng = address?.lng ?? DEFAULT_COORDS.lng;

    const itemsCount = (items || []).reduce((sum, item) => sum + item.quantity, 0);
    const distance = calcDistanceKm(riderLat, riderLng, restLat, restLng) + calcDistanceKm(restLat, restLng, custLat, custLng);

    const delivery: RiderDeliveryOrder = {
      id: orderRow.id,
      status: orderRow.status,
      total: Number(orderRow.total),
      restaurantId: orderRow.restaurant_id,
      restaurantName: restaurant?.name || 'Restaurant',
      restaurantLat: restLat,
      restaurantLng: restLng,
      customerName: customer?.name || 'Customer',
      customerPhone: customer?.phone || '',
      customerAddress: address
        ? `${address.street}, ${address.city}, ${address.state} ${address.pincode}`
        : 'Address unavailable',
      customerLat: custLat,
      customerLng: custLng,
      itemsCount,
      distanceKm: distance,
      createdAt: orderRow.created_at,
    };

    if (orderRow.status === 'confirmed' || orderRow.status === 'preparing') {
      set({ incomingDelivery: delivery, currentDelivery: null });
    } else {
      set({ currentDelivery: delivery, incomingDelivery: null });
    }
  },

  refreshTodayStats: async () => {
    const riderId = get().riderId;
    if (!riderId) {
      set({ todayDeliveries: 0, todayEarnings: 0 });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: earningsRows } = await supabase
      .from('rider_earnings')
      .select('amount')
      .eq('rider_id', riderId)
      .gte('paid_at', today.toISOString())
      .returns<Array<{ amount: number }>>();

    const rows = earningsRows || [];
    const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);

    set({
      todayDeliveries: rows.length,
      todayEarnings: total,
    });
  },

  acceptDelivery: async orderId => {
    const riderId = get().riderId;
    if (!riderId) {
      return false;
    }

    const { error } = await supabase
      .from('orders')
      .update({
        rider_id: riderId,
        rider_assigned_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) {
      set({ error: normalizeError(error, 'Failed to accept delivery') });
      return false;
    }

    await get().refreshCurrentDelivery();
    return true;
  },

  declineDelivery: async orderId => {
    const riderId = get().riderId;
    if (!riderId) {
      return false;
    }

    const { error } = await supabase
      .from('orders')
      .update({ rider_id: null, rider_assigned_at: null })
      .eq('id', orderId)
      .eq('rider_id', riderId);

    if (error) {
      set({ error: normalizeError(error, 'Failed to decline delivery') });
      return false;
    }

    await get().refreshCurrentDelivery();
    return true;
  },

  confirmPickup: async orderId => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'picked_up', picked_up_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
      set({ error: normalizeError(error, 'Failed to confirm pickup') });
      return false;
    }

    const { data: orderRow } = await supabase
      .from('orders')
      .select('id,user_id')
      .eq('id', orderId)
      .maybeSingle<{ id: string; user_id: string }>();

    if (orderRow) {
      await notificationService.sendNotification({
        user_id: orderRow.user_id,
        title: 'Your food is on the way!',
        body: 'Estimated delivery in 20 minutes',
        type: 'order_update',
        order_id: orderRow.id,
      });
    }

    await get().refreshCurrentDelivery();
    return true;
  },

  confirmDelivery: async orderId => {
    const riderId = get().riderId;
    const currentDelivery = get().currentDelivery;
    if (!riderId || !currentDelivery) {
      return false;
    }

    const earningAmount = Math.max(30, Number((currentDelivery.total * 0.12).toFixed(2)));

    const { error: orderError } = await supabase
      .from('orders')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() })
      .eq('id', orderId);

    if (orderError) {
      set({ error: normalizeError(orderError, 'Failed to mark delivered') });
      return false;
    }

    const { error: earningError } = await supabase
      .from('rider_earnings')
      .insert({ rider_id: riderId, order_id: orderId, amount: earningAmount });

    if (earningError) {
      set({ error: normalizeError(earningError, 'Failed to record earnings') });
      return false;
    }

    const { data: riderRow } = await supabase
      .from('riders')
      .select('total_deliveries')
      .eq('id', riderId)
      .maybeSingle<{ total_deliveries: number }>();

    if (riderRow) {
      await supabase
        .from('riders')
        .update({ total_deliveries: Number(riderRow.total_deliveries || 0) + 1 })
        .eq('id', riderId);
    }

    const { data: orderRow } = await supabase
      .from('orders')
      .select('id,user_id')
      .eq('id', orderId)
      .maybeSingle<{ id: string; user_id: string }>();

    if (orderRow) {
      await notificationService.sendNotification({
        user_id: orderRow.user_id,
        title: 'Order Delivered!',
        body: 'Enjoy your meal! Rate your experience.',
        type: 'order_update',
        order_id: orderRow.id,
      });
    }

    await get().refreshTodayStats();
    await get().refreshCurrentDelivery();
    return true;
  },
}));

export default useRiderStore;
