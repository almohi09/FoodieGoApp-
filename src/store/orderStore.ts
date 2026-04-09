import { create } from 'zustand';
import { supabase } from '@/config/supabase';
import type { CreateOrderPayload, Order } from '@/types/order.types';

interface OrderState {
  orders: Order[];
  activeOrder: Order | null;
  isLoading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  createOrder: (payload: CreateOrderPayload) => Promise<Order>;
  fetchOrderById: (id: string) => Promise<void>;
  subscribeToOrder: (orderId: string) => () => void;
  clearError: () => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  activeOrder: null,
  isLoading: false,
  error: null,

  fetchOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, menu_items(*)), restaurants(name, image_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      set({ orders: (data ?? []) as Order[] });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Failed to fetch orders' });
    } finally {
      set({ isLoading: false });
    }
  },

  createOrder: async (payload: CreateOrderPayload) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('create_order_transaction', payload);
      if (error) {
        throw error;
      }

      await get().fetchOrders();
      return data as Order;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create order';
      set({ error: msg });
      throw new Error(msg);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchOrderById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, menu_items(*)), restaurants(name, image_url), riders(*)')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      set({ activeOrder: data as Order });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Failed to fetch order' });
    } finally {
      set({ isLoading: false });
    }
  },

  subscribeToOrder: (orderId: string) => {
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        payload => {
          set(state => ({
            activeOrder:
              state.activeOrder?.id === orderId
                ? ({ ...state.activeOrder, ...(payload.new as Partial<Order>) } as Order)
                : state.activeOrder,
            orders: state.orders.map(o =>
              o.id === orderId ? ({ ...o, ...(payload.new as Partial<Order>) } as Order) : o,
            ),
          }));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },

  clearError: () => set({ error: null }),
}));

export default useOrderStore;
