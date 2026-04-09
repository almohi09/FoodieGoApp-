import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import supabase from '../config/supabase';
import { MenuItem } from '../hooks/useMenu';

export interface CartItem {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
  lineTotal: number;
  isVeg: boolean;
}

interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string;
  error: string | null;
  addItem: (item: MenuItem, restaurantId: string, restaurantName: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  clearError: () => void;
  subtotal: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
}

interface RestaurantFeeRow {
  delivery_fee: number | null;
}

const calculateTotals = (
  items: CartItem[],
  deliveryFee: number,
): Pick<CartState, 'subtotal' | 'itemCount' | 'total'> => {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = subtotal + (itemCount > 0 ? deliveryFee : 0);
  return {
    subtotal,
    itemCount,
    total,
  };
};

const loadRestaurantDeliveryFee = async (restaurantId: string) => {
  const { data } = await supabase
    .from('restaurants')
    .select('delivery_fee')
    .eq('id', restaurantId)
    .maybeSingle<RestaurantFeeRow>();

  return Number(data?.delivery_fee || 0);
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantId: null,
      restaurantName: '',
      error: null,
      subtotal: 0,
      deliveryFee: 0,
      total: 0,
      itemCount: 0,

      addItem: (item, restaurantId, restaurantName) => {
        const current = get();
        const existing = current.items.find(cartItem => cartItem.id === item.id);

        let nextItems: CartItem[];
        if (existing) {
          nextItems = current.items.map(cartItem =>
            cartItem.id === item.id
              ? {
                  ...cartItem,
                  quantity: cartItem.quantity + 1,
                  lineTotal: (cartItem.quantity + 1) * cartItem.price,
                }
              : cartItem,
          );
        } else {
          nextItems = [
            ...current.items,
            {
              id: item.id,
              name: item.name,
              imageUrl: item.imageUrl,
              price: item.price,
              quantity: 1,
              lineTotal: item.price,
              isVeg: item.isVeg,
            },
          ];
        }

        const nextState = calculateTotals(nextItems, current.deliveryFee);
        set({
          items: nextItems,
          restaurantId,
          restaurantName,
          error: null,
          ...nextState,
        });

        void loadRestaurantDeliveryFee(restaurantId)
          .then(fee => {
            const latest = get();
            if (latest.restaurantId !== restaurantId) {
              return;
            }
            const totals = calculateTotals(latest.items, fee);
            set({
              deliveryFee: fee,
              error: null,
              ...totals,
            });
          })
          .catch(() => {
            set({
              error: 'Unable to refresh delivery fee. Please try again.',
            });
          });
      },

      removeItem: itemId => {
        const current = get();
        const nextItems = current.items.filter(item => item.id !== itemId);
        const nextDeliveryFee = nextItems.length === 0 ? 0 : current.deliveryFee;
        const totals = calculateTotals(nextItems, nextDeliveryFee);
        set({
          items: nextItems,
          error: null,
          ...(nextItems.length === 0
            ? {
                restaurantId: null,
                restaurantName: '',
              }
            : {}),
          deliveryFee: nextDeliveryFee,
          ...totals,
        });
      },

      updateQuantity: (itemId, quantity) => {
        const current = get();
        if (quantity <= 0) {
          current.removeItem(itemId);
          return;
        }

        const nextItems = current.items.map(item =>
          item.id === itemId
            ? { ...item, quantity, lineTotal: quantity * item.price }
            : item,
        );
        const totals = calculateTotals(nextItems, current.deliveryFee);
        set({
          items: nextItems,
          error: null,
          ...totals,
        });
      },

      clearCart: () => {
        set({
          items: [],
          restaurantId: null,
          restaurantName: '',
          error: null,
          subtotal: 0,
          deliveryFee: 0,
          total: 0,
          itemCount: 0,
        });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'foodiego-cart-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        items: state.items,
        restaurantId: state.restaurantId,
        restaurantName: state.restaurantName,
        subtotal: state.subtotal,
        deliveryFee: state.deliveryFee,
        total: state.total,
        itemCount: state.itemCount,
      }),
    },
  ),
);

export default useCartStore;
