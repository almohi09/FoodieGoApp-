import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CheckoutRecoveryState {
  restaurantId: string | null;
  restaurantName: string | null;
  cartItems: any[];
  addressId: string | null;
  paymentMethod: string | null;
  quoteDetails: {
    subtotal: number;
    packagingFee: number;
    taxes: number;
    deliveryFee: number;
    total: number;
  } | null;
  pendingOrderId: string | null;
  lastUpdated: number | null;
}

interface AppState {
  isFirstLaunch: boolean;
  hasSeenOnboarding: boolean;
  isDarkMode: boolean;
  checkoutRecovery: CheckoutRecoveryState | null;
  setFirstLaunch: (value: boolean) => void;
  setOnboardingSeen: (value: boolean) => void;
  toggleDarkMode: () => void;
  saveCheckoutRecovery: (state: CheckoutRecoveryState) => Promise<void>;
  clearCheckoutRecovery: () => Promise<void>;
  loadCheckoutRecovery: () => Promise<CheckoutRecoveryState | null>;
  loadPersistedState: () => Promise<void>;
}

const CHECKOUT_RECOVERY_KEY = 'checkout_recovery_state';

export const useAppStore = create<AppState>((set, _get) => ({
  isFirstLaunch: true,
  hasSeenOnboarding: false,
  isDarkMode: false,
  checkoutRecovery: null,
  setFirstLaunch: value => set({ isFirstLaunch: value }),
  setOnboardingSeen: value => set({ hasSeenOnboarding: value }),
  toggleDarkMode: () => set(state => ({ isDarkMode: !state.isDarkMode })),
  saveCheckoutRecovery: async state => {
    try {
      const recoveryState: CheckoutRecoveryState = {
        ...state,
        lastUpdated: Date.now(),
      };
      await AsyncStorage.setItem(
        CHECKOUT_RECOVERY_KEY,
        JSON.stringify(recoveryState),
      );
      set({ checkoutRecovery: recoveryState });
    } catch (error) {
      console.error('Error saving checkout recovery state:', error);
    }
  },
  clearCheckoutRecovery: async () => {
    try {
      await AsyncStorage.removeItem(CHECKOUT_RECOVERY_KEY);
      set({ checkoutRecovery: null });
    } catch (error) {
      console.error('Error clearing checkout recovery state:', error);
    }
  },
  loadCheckoutRecovery: async () => {
    try {
      const saved = await AsyncStorage.getItem(CHECKOUT_RECOVERY_KEY);
      if (saved) {
        const recoveryState = JSON.parse(saved) as CheckoutRecoveryState;
        const hoursSinceLastUpdate =
          (Date.now() - (recoveryState.lastUpdated || 0)) / (1000 * 60 * 60);
        if (hoursSinceLastUpdate < 24 && recoveryState.pendingOrderId) {
          set({ checkoutRecovery: recoveryState });
          return recoveryState;
        } else if (
          hoursSinceLastUpdate < 24 &&
          recoveryState.cartItems &&
          recoveryState.cartItems.length > 0
        ) {
          set({ checkoutRecovery: recoveryState });
          return recoveryState;
        } else {
          await AsyncStorage.removeItem(CHECKOUT_RECOVERY_KEY);
        }
      }
      return null;
    } catch (error) {
      console.error('Error loading checkout recovery state:', error);
      return null;
    }
  },
  loadPersistedState: async () => {
    try {
      const hasSeen = await AsyncStorage.getItem('hasSeenOnboarding');
      set({ hasSeenOnboarding: hasSeen === 'true' });
    } catch (error) {
      console.error('Error loading persisted state:', error);
    }
  },
}));
