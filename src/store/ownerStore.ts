import { create } from 'zustand';
import supabase from '../config/supabase';
import { notificationService } from '../services/notificationService';
import type { Order } from '@/types/order.types';

export interface OwnerRestaurant {
  id: string;
  name: string;
  description: string | null;
  cuisine_type: string | null;
  delivery_fee: number | null;
  min_order_amount: number | null;
  image_url: string | null;
  is_open: boolean;
  lat: number | null;
  lng: number | null;
}

export interface OwnerMenuItemInput {
  id?: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isAvailable: boolean;
  isVeg: boolean;
}

interface OwnerStoreState {
  currentRestaurant: OwnerRestaurant | null;
  pendingOrders: Order[];
  pendingOrdersCount: number;
  isLoading: boolean;
  error: string | null;
  fetchCurrentRestaurant: (userId: string) => Promise<boolean>;
  fetchPendingOrders: () => Promise<void>;
  subscribeToNewOrders: () => (() => void) | void;
  acceptOrder: (orderId: string) => Promise<boolean>;
  rejectOrder: (orderId: string, reason: string) => Promise<boolean>;
  updateOrderStatus: (orderId: string, status: string) => Promise<boolean>;
  updateMenuItem: (item: OwnerMenuItemInput) => Promise<boolean>;
  deleteMenuItem: (itemId: string) => Promise<boolean>;
  toggleRestaurantOpen: (isOpen: boolean) => Promise<boolean>;
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

const notifyOrderUpdate = async (
  orderId: string,
  title: string,
  body: string,
) => {
  const { data: orderRow } = await supabase
    .from('orders')
    .select('id,user_id')
    .eq('id', orderId)
    .maybeSingle<{ id: string; user_id: string }>();

  if (!orderRow) {
    return;
  }

  await notificationService.sendNotification({
    user_id: orderRow.user_id,
    title,
    body,
    type: 'order_update',
    order_id: orderRow.id,
  });
};

export const useOwnerStore = create<OwnerStoreState>((set, get) => ({
  currentRestaurant: null,
  pendingOrders: [],
  pendingOrdersCount: 0,
  isLoading: false,
  error: null,

  fetchCurrentRestaurant: async (userId: string) => {
    set({ isLoading: true, error: null });

    const { data: ownerRow, error: ownerError } = await supabase
      .from('restaurant_owners')
      .select('restaurant_id')
      .eq('user_id', userId)
      .maybeSingle<{ restaurant_id: string }>();

    if (ownerError || !ownerRow) {
      set({
        isLoading: false,
        currentRestaurant: null,
        error: normalizeError(ownerError, 'Restaurant owner mapping not found'),
      });
      return false;
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id,name,description,cuisine_type,delivery_fee,min_order_amount,image_url,is_open,lat,lng')
      .eq('id', ownerRow.restaurant_id)
      .single<OwnerRestaurant>();

    if (restaurantError || !restaurant) {
      set({
        isLoading: false,
        error: normalizeError(restaurantError, 'Failed to load restaurant'),
      });
      return false;
    }

    set({ currentRestaurant: restaurant, isLoading: false });
    await get().fetchPendingOrders();
    return true;
  },

  fetchPendingOrders: async () => {
    const restaurantId = get().currentRestaurant?.id;
    if (!restaurantId) {
      set({ pendingOrders: [], pendingOrdersCount: 0 });
      return;
    }

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'placed');

    set({ pendingOrders: (data as Order[]) ?? [], pendingOrdersCount: data?.length ?? 0 });
  },

  subscribeToNewOrders: () => {
    const restaurantId = get().currentRestaurant?.id;
    if (!restaurantId) {
      return;
    }

    const channel = supabase
      .channel(`owner-orders-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        payload => {
          const nextOrder = payload.new as Order;
          if (nextOrder.status !== 'placed') {
            return;
          }
          set(state => ({
            pendingOrders: [nextOrder, ...state.pendingOrders],
            pendingOrdersCount: state.pendingOrdersCount + 1,
          }));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },

  acceptOrder: async (orderId: string) => {
    const success = await get().updateOrderStatus(orderId, 'confirmed');
    if (success) {
      set(state => ({
        pendingOrders: state.pendingOrders.filter(o => o.id !== orderId),
        pendingOrdersCount: Math.max(0, state.pendingOrdersCount - 1),
      }));
      const restaurant = get().currentRestaurant;
      await notifyOrderUpdate(
        orderId,
        'Order Confirmed!',
        `${restaurant?.name || 'Restaurant'} has accepted your order`,
      );
    }
    return success;
  },

  rejectOrder: async (orderId: string, reason: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', rejection_reason: reason })
      .eq('id', orderId);

    if (error) {
      set({ error: normalizeError(error, 'Failed to reject order') });
      return false;
    }

    await notifyOrderUpdate(
      orderId,
      'Order Cancelled',
      `Your order was cancelled. ${reason || ''}`.trim(),
    );

    set(state => ({
      pendingOrders: state.pendingOrders.filter(o => o.id !== orderId),
      pendingOrdersCount: Math.max(0, state.pendingOrdersCount - 1),
    }));

    return true;
  },

  updateOrderStatus: async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      set({ error: normalizeError(error, 'Failed to update order status') });
      return false;
    }

    return true;
  },

  updateMenuItem: async item => {
    const payload = {
      id: item.id,
      category_id: item.categoryId,
      restaurant_id: item.restaurantId,
      name: item.name,
      description: item.description,
      price: item.price,
      image_url: item.imageUrl,
      is_available: item.isAvailable,
      is_veg: item.isVeg,
    };

    const { error } = await supabase
      .from('menu_items')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      set({ error: normalizeError(error, 'Failed to save menu item') });
      return false;
    }

    return true;
  },

  deleteMenuItem: async itemId => {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      set({ error: normalizeError(error, 'Failed to delete menu item') });
      return false;
    }

    return true;
  },

  toggleRestaurantOpen: async (isOpen: boolean) => {
    const restaurantId = get().currentRestaurant?.id;
    if (!restaurantId) {
      set({ error: 'No active restaurant selected' });
      return false;
    }

    const { error } = await supabase
      .from('restaurants')
      .update({ is_open: isOpen })
      .eq('id', restaurantId);

    if (error) {
      set({ error: normalizeError(error, 'Failed to update restaurant status') });
      return false;
    }

    set(state => ({
      currentRestaurant: state.currentRestaurant
        ? { ...state.currentRestaurant, is_open: isOpen }
        : state.currentRestaurant,
    }));

    return true;
  },
}));

export default useOwnerStore;
