import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppState {
  isFirstLaunch: boolean;
  hasSeenOnboarding: boolean;
  isDarkMode: boolean;
  setFirstLaunch: (value: boolean) => void;
  setOnboardingSeen: (value: boolean) => void;
  toggleDarkMode: () => void;
  loadPersistedState: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  isFirstLaunch: true,
  hasSeenOnboarding: false,
  isDarkMode: false,
  setFirstLaunch: (value) => set({ isFirstLaunch: value }),
  setOnboardingSeen: (value) => set({ hasSeenOnboarding: value }),
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  loadPersistedState: async () => {
    try {
      const hasSeen = await AsyncStorage.getItem('hasSeenOnboarding');
      set({ hasSeenOnboarding: hasSeen === 'true' });
    } catch (error) {
      console.error('Error loading persisted state:', error);
    }
  },
}));
