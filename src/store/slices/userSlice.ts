import { Address, User } from '../../types';

export interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export const initialUserState: UserState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

type UserActionMap = {
  setUser: User | null;
  setLoading: boolean;
  setError: string | null;
  updateUser: Partial<User>;
  addAddress: Address;
  updateAddress: Address;
  removeAddress: string;
  setDefaultAddress: string;
  addFoodieCoins: number;
  deductFoodieCoins: number;
  logout: undefined;
};

type ActionName = keyof UserActionMap;
export type UserAction = {
  [K in ActionName]: UserActionMap[K] extends undefined
    ? { type: `user/${K}` }
    : { type: `user/${K}`; payload: UserActionMap[K] };
}[ActionName];

const createAction = <K extends ActionName>(type: K) => {
  return (payload?: UserActionMap[K]) =>
    payload === undefined
      ? ({ type: `user/${type}` } as UserAction)
      : ({ type: `user/${type}`, payload } as UserAction);
};

export const setUser = createAction('setUser');
export const setLoading = createAction('setLoading');
export const setError = createAction('setError');
export const updateUser = createAction('updateUser');
export const addAddress = createAction('addAddress');
export const updateAddress = createAction('updateAddress');
export const removeAddress = createAction('removeAddress');
export const setDefaultAddress = createAction('setDefaultAddress');
export const addFoodieCoins = createAction('addFoodieCoins');
export const deductFoodieCoins = createAction('deductFoodieCoins');
export const logout = createAction('logout');

export const reduceUserState = (
  state: UserState,
  action: UserAction | { type: string; payload?: unknown },
): UserState => {
  switch (action.type) {
    case 'user/setUser': {
      const user = (action as Extract<UserAction, { type: 'user/setUser' }>).payload;
      return {
        ...state,
        user,
        isAuthenticated: !!user,
        error: null,
      };
    }
    case 'user/setLoading':
      return {
        ...state,
        isLoading: (action as Extract<UserAction, { type: 'user/setLoading' }>).payload,
      };
    case 'user/setError':
      return {
        ...state,
        error: (action as Extract<UserAction, { type: 'user/setError' }>).payload,
        isLoading: false,
      };
    case 'user/updateUser': {
      if (!state.user) {
        return state;
      }
      return {
        ...state,
        user: {
          ...state.user,
          ...(action as Extract<UserAction, { type: 'user/updateUser' }>).payload,
        },
      };
    }
    case 'user/addAddress': {
      if (!state.user) {
        return state;
      }
      const newAddress = (action as Extract<UserAction, { type: 'user/addAddress' }>).payload;
      const addresses = state.user.addresses.map(address => ({
        ...address,
        isDefault: false,
      }));
      addresses.push({ ...newAddress, isDefault: addresses.length === 0 });
      return {
        ...state,
        user: {
          ...state.user,
          addresses,
        },
      };
    }
    case 'user/updateAddress': {
      if (!state.user) {
        return state;
      }
      const payload = (action as Extract<UserAction, { type: 'user/updateAddress' }>).payload;
      return {
        ...state,
        user: {
          ...state.user,
          addresses: state.user.addresses.map(address =>
            address.id === payload.id ? payload : address,
          ),
        },
      };
    }
    case 'user/removeAddress': {
      if (!state.user) {
        return state;
      }
      const addressId = (action as Extract<UserAction, { type: 'user/removeAddress' }>).payload;
      const filtered = state.user.addresses.filter(address => address.id !== addressId);
      if (filtered.length > 0 && !filtered.some(address => address.isDefault)) {
        filtered[0] = { ...filtered[0], isDefault: true };
      }
      return {
        ...state,
        user: {
          ...state.user,
          addresses: filtered,
        },
      };
    }
    case 'user/setDefaultAddress': {
      if (!state.user) {
        return state;
      }
      const addressId = (action as Extract<UserAction, { type: 'user/setDefaultAddress' }>).payload;
      return {
        ...state,
        user: {
          ...state.user,
          addresses: state.user.addresses.map(address => ({
            ...address,
            isDefault: address.id === addressId,
          })),
        },
      };
    }
    case 'user/addFoodieCoins': {
      if (!state.user) {
        return state;
      }
      const amount = (action as Extract<UserAction, { type: 'user/addFoodieCoins' }>).payload;
      return {
        ...state,
        user: {
          ...state.user,
          foodieCoins: state.user.foodieCoins + amount,
        },
      };
    }
    case 'user/deductFoodieCoins': {
      if (!state.user) {
        return state;
      }
      const amount = (action as Extract<UserAction, { type: 'user/deductFoodieCoins' }>).payload;
      if (state.user.foodieCoins < amount) {
        return state;
      }
      return {
        ...state,
        user: {
          ...state.user,
          foodieCoins: state.user.foodieCoins - amount,
        },
      };
    }
    case 'user/logout':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        error: null,
      };
    default:
      return state;
  }
};

