import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, Address } from '../../domain/types';

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    addAddress: (state, action: PayloadAction<Address>) => {
      if (state.user) {
        const addresses = state.user.addresses.map(a => ({ ...a, isDefault: false }));
        addresses.push({ ...action.payload, isDefault: addresses.length === 0 });
        state.user.addresses = addresses;
      }
    },
    updateAddress: (state, action: PayloadAction<Address>) => {
      if (state.user) {
        state.user.addresses = state.user.addresses.map(a =>
          a.id === action.payload.id ? action.payload : a
        );
      }
    },
    removeAddress: (state, action: PayloadAction<string>) => {
      if (state.user) {
        const filtered = state.user.addresses.filter(a => a.id !== action.payload);
        if (filtered.length > 0 && !filtered.some(a => a.isDefault)) {
          filtered[0].isDefault = true;
        }
        state.user.addresses = filtered;
      }
    },
    setDefaultAddress: (state, action: PayloadAction<string>) => {
      if (state.user) {
        state.user.addresses = state.user.addresses.map(a => ({
          ...a,
          isDefault: a.id === action.payload,
        }));
      }
    },
    addFoodieCoins: (state, action: PayloadAction<number>) => {
      if (state.user) {
        state.user.foodieCoins += action.payload;
      }
    },
    deductFoodieCoins: (state, action: PayloadAction<number>) => {
      if (state.user && state.user.foodieCoins >= action.payload) {
        state.user.foodieCoins -= action.payload;
      }
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
  },
});

export const {
  setUser,
  setLoading,
  setError,
  updateUser,
  addAddress,
  updateAddress,
  removeAddress,
  setDefaultAddress,
  addFoodieCoins,
  deductFoodieCoins,
  logout,
} = userSlice.actions;

export default userSlice.reducer;
