import { create } from 'zustand';
import {
  initialUserState,
  reduceUserState,
  UserAction,
  UserState,
} from './slices/userSlice';
import {
  initialCartState,
  reduceCartState,
  CartAction,
  CartState,
} from './slices/cartSlice';
import {
  initialOrderState,
  reduceOrderState,
  OrderAction,
  OrderState,
} from './slices/orderSlice';

export interface RootState {
  user: UserState;
  cart: CartState;
  orders: OrderState;
}

export type AppAction = UserAction | CartAction | OrderAction;
export type AppDispatch = (action: AppAction) => void;

interface AppStore extends RootState {
  dispatch: AppDispatch;
}

export const useStore = create<AppStore>((set) => ({
  user: initialUserState,
  cart: initialCartState,
  orders: initialOrderState,
  dispatch: (action) => {
    set((state) => ({
      user: reduceUserState(state.user, action),
      cart: reduceCartState(state.cart, action),
      orders: reduceOrderState(state.orders, action),
    }));
  },
}));
