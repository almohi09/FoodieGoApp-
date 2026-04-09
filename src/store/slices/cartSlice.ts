import { CartItem, SelectedCustomization } from '../../types';

export interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
  couponCode: string | null;
  couponDiscount: number;
  deliveryFee: number;
  packagingFee: number;
  taxes: number;
  subtotal: number;
  isLoading: boolean;
}

export const initialCartState: CartState = {
  items: [],
  restaurantId: null,
  restaurantName: null,
  couponCode: null,
  couponDiscount: 0,
  deliveryFee: 40,
  packagingFee: 0,
  taxes: 0,
  subtotal: 0,
  isLoading: false,
};

const calculateItemPrice = (
  basePrice: number,
  _customizations: SelectedCustomization[],
  quantity: number,
): number => basePrice * quantity;

type AddToCartPayload = {
  item: CartItem['item'];
  restaurantId: string;
  restaurantName: string;
  quantity: number;
  customizations: SelectedCustomization[];
};

type UpdateQuantityPayload = {
  itemId: string;
  quantity: number;
  customizations?: SelectedCustomization[];
};

type CartActionMap = {
  addToCart: AddToCartPayload;
  updateQuantity: UpdateQuantityPayload;
  removeFromCart: string;
  clearCart: undefined;
  applyCoupon: { code: string; discount: number };
  removeCoupon: undefined;
  setDeliveryFee: number;
  setQuoteDetails: { subtotal: number; packagingFee: number; taxes: number };
};

type ActionName = keyof CartActionMap;
export type CartAction = {
  [K in ActionName]: CartActionMap[K] extends undefined
    ? { type: `cart/${K}` }
    : { type: `cart/${K}`; payload: CartActionMap[K] };
}[ActionName];

const createAction = <K extends ActionName>(type: K) => {
  return (payload?: CartActionMap[K]) =>
    payload === undefined
      ? ({ type: `cart/${type}` } as CartAction)
      : ({ type: `cart/${type}`, payload } as CartAction);
};

export const addToCart = createAction('addToCart');
export const updateQuantity = createAction('updateQuantity');
export const removeFromCart = createAction('removeFromCart');
export const clearCart = createAction('clearCart');
export const applyCoupon = createAction('applyCoupon');
export const removeCoupon = createAction('removeCoupon');
export const setDeliveryFee = createAction('setDeliveryFee');
export const setQuoteDetails = createAction('setQuoteDetails');

export const reduceCartState = (
  state: CartState,
  action: CartAction | { type: string; payload?: unknown },
): CartState => {
  switch (action.type) {
    case 'cart/addToCart': {
      const payload = (action as Extract<CartAction, { type: 'cart/addToCart' }>).payload;
      let nextState = { ...state, items: [...state.items] };

      if (nextState.restaurantId && nextState.restaurantId !== payload.restaurantId) {
        nextState = {
          ...nextState,
          items: [],
          couponCode: null,
          couponDiscount: 0,
        };
      }

      const existingIndex = nextState.items.findIndex(
        cartItem =>
          cartItem.item.id === payload.item.id &&
          JSON.stringify(cartItem.customizations) ===
            JSON.stringify(payload.customizations),
      );

      if (existingIndex >= 0) {
        const existingItem = nextState.items[existingIndex];
        const quantity = existingItem.quantity + payload.quantity;
        nextState.items[existingIndex] = {
          ...existingItem,
          quantity,
          totalPrice: calculateItemPrice(
            payload.item.price,
            existingItem.customizations,
            quantity,
          ),
        };
      } else {
        nextState.items.push({
          id: `${payload.item.id}_${Date.now()}`,
          item: payload.item,
          restaurantId: payload.restaurantId,
          restaurantName: payload.restaurantName,
          quantity: payload.quantity,
          customizations: payload.customizations,
          totalPrice: calculateItemPrice(
            payload.item.price,
            payload.customizations,
            payload.quantity,
          ),
        });
      }

      return {
        ...nextState,
        restaurantId: payload.restaurantId,
        restaurantName: payload.restaurantName,
      };
    }
    case 'cart/updateQuantity': {
      const payload =
        (action as Extract<CartAction, { type: 'cart/updateQuantity' }>).payload;
      const items = [...state.items];
      const index = items.findIndex(
        item =>
          item.id === payload.itemId ||
          (payload.customizations &&
            item.item.id === payload.itemId &&
            JSON.stringify(item.customizations) ===
              JSON.stringify(payload.customizations)),
      );
      if (index >= 0) {
        if (payload.quantity <= 0) {
          items.splice(index, 1);
        } else {
          const target = items[index];
          items[index] = {
            ...target,
            quantity: payload.quantity,
            totalPrice: calculateItemPrice(
              target.item.price,
              target.customizations,
              payload.quantity,
            ),
          };
        }
      }

      if (items.length === 0) {
        return {
          ...state,
          items,
          restaurantId: null,
          restaurantName: null,
          couponCode: null,
          couponDiscount: 0,
        };
      }

      return {
        ...state,
        items,
      };
    }
    case 'cart/removeFromCart': {
      const itemId = (action as Extract<CartAction, { type: 'cart/removeFromCart' }>).payload;
      const items = state.items.filter(item => item.id !== itemId);
      if (items.length === 0) {
        return {
          ...state,
          items,
          restaurantId: null,
          restaurantName: null,
          couponCode: null,
          couponDiscount: 0,
        };
      }
      return {
        ...state,
        items,
      };
    }
    case 'cart/clearCart':
      return {
        ...state,
        items: [],
        restaurantId: null,
        restaurantName: null,
        couponCode: null,
        couponDiscount: 0,
      };
    case 'cart/applyCoupon': {
      const payload = (action as Extract<CartAction, { type: 'cart/applyCoupon' }>).payload;
      return {
        ...state,
        couponCode: payload.code,
        couponDiscount: payload.discount,
      };
    }
    case 'cart/removeCoupon':
      return {
        ...state,
        couponCode: null,
        couponDiscount: 0,
      };
    case 'cart/setDeliveryFee':
      return {
        ...state,
        deliveryFee: (action as Extract<CartAction, { type: 'cart/setDeliveryFee' }>).payload,
      };
    case 'cart/setQuoteDetails': {
      const payload = (action as Extract<CartAction, { type: 'cart/setQuoteDetails' }>).payload;
      return {
        ...state,
        subtotal: payload.subtotal,
        packagingFee: payload.packagingFee,
        taxes: payload.taxes,
      };
    }
    default:
      return state;
  }
};

export const selectCartItems = (state: { cart: CartState }) => state.cart.items;
export const selectCartTotal = (state: { cart: CartState }) =>
  state.cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
export const selectCartItemCount = (state: { cart: CartState }) =>
  state.cart.items.reduce((sum, item) => sum + item.quantity, 0);
export const selectQuoteDetails = (state: { cart: CartState }) => ({
  subtotal: state.cart.subtotal,
  packagingFee: state.cart.packagingFee,
  taxes: state.cart.taxes,
});
export const selectFinalTotal = (state: { cart: CartState }) => {
  const { subtotal, packagingFee, taxes, deliveryFee, couponDiscount } =
    state.cart;
  return subtotal + packagingFee + taxes + deliveryFee - couponDiscount;
};

