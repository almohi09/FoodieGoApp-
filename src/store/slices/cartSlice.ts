import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CartItem, SelectedCustomization } from '../../domain/types';

interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
  couponCode: string | null;
  couponDiscount: number;
  deliveryFee: number;
  isLoading: boolean;
}

const initialState: CartState = {
  items: [],
  restaurantId: null,
  restaurantName: null,
  couponCode: null,
  couponDiscount: 0,
  deliveryFee: 40,
  isLoading: false,
};

const calculateItemPrice = (
  basePrice: number,
  customizations: SelectedCustomization[],
  quantity: number
): number => {
  return basePrice * quantity;
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (
      state,
      action: PayloadAction<{
        item: CartItem['item'];
        restaurantId: string;
        restaurantName: string;
        quantity: number;
        customizations: SelectedCustomization[];
      }>
    ) => {
      const { item, restaurantId, restaurantName, quantity, customizations } = action.payload;

      if (state.restaurantId && state.restaurantId !== restaurantId) {
        state.items = [];
        state.couponCode = null;
        state.couponDiscount = 0;
      }

      state.restaurantId = restaurantId;
      state.restaurantName = restaurantName;

      const existingIndex = state.items.findIndex(
        cartItem =>
          cartItem.item.id === item.id &&
          JSON.stringify(cartItem.customizations) === JSON.stringify(customizations)
      );

      if (existingIndex >= 0) {
        state.items[existingIndex].quantity += quantity;
        state.items[existingIndex].totalPrice = calculateItemPrice(
          item.price,
          state.items[existingIndex].customizations,
          state.items[existingIndex].quantity
        );
      } else {
        const newItem: CartItem = {
          id: `${item.id}_${Date.now()}`,
          item,
          restaurantId,
          restaurantName,
          quantity,
          customizations,
          totalPrice: calculateItemPrice(item.price, customizations, quantity),
        };
        state.items.push(newItem);
      }
    },
    updateQuantity: (
      state,
      action: PayloadAction<{ itemId: string; quantity: number; customizations?: SelectedCustomization[] }>
    ) => {
      const { itemId, quantity, customizations } = action.payload;
      const index = state.items.findIndex(
        item =>
          item.id === itemId ||
          (customizations &&
            item.item.id === itemId &&
            JSON.stringify(item.customizations) === JSON.stringify(customizations))
      );

      if (index >= 0) {
        if (quantity <= 0) {
          state.items.splice(index, 1);
        } else {
          state.items[index].quantity = quantity;
          state.items[index].totalPrice = calculateItemPrice(
            state.items[index].item.price,
            state.items[index].customizations,
            quantity
          );
        }
      }

      if (state.items.length === 0) {
        state.restaurantId = null;
        state.restaurantName = null;
        state.couponCode = null;
        state.couponDiscount = 0;
      }
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload);

      if (state.items.length === 0) {
        state.restaurantId = null;
        state.restaurantName = null;
        state.couponCode = null;
        state.couponDiscount = 0;
      }
    },
    clearCart: (state) => {
      state.items = [];
      state.restaurantId = null;
      state.restaurantName = null;
      state.couponCode = null;
      state.couponDiscount = 0;
    },
    applyCoupon: (state, action: PayloadAction<{ code: string; discount: number }>) => {
      state.couponCode = action.payload.code;
      state.couponDiscount = action.payload.discount;
    },
    removeCoupon: (state) => {
      state.couponCode = null;
      state.couponDiscount = 0;
    },
    setDeliveryFee: (state, action: PayloadAction<number>) => {
      state.deliveryFee = action.payload;
    },
  },
});

export const {
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  applyCoupon,
  removeCoupon,
  setDeliveryFee,
} = cartSlice.actions;

export const selectCartItems = (state: { cart: CartState }) => state.cart.items;
export const selectCartTotal = (state: { cart: CartState }) =>
  state.cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
export const selectCartItemCount = (state: { cart: CartState }) =>
  state.cart.items.reduce((sum, item) => sum + item.quantity, 0);

export default cartSlice.reducer;
