import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryGhost: string;
  secondary: string;
  secondaryLight: string;
  success: string;
  successLight: string;
  info: string;
  infoLight: string;
  loyalty: string;
  loyaltyLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;

  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceElevated: string;
  surfaceWarm: string;
  surfaceCard: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  textMuted: string;

  border: string;
  borderLight: string;
  borderAccent: string;
  divider: string;

  overlay: string;
  overlayLight: string;
  overlayGradient: string;
  shadow: string;
  shadowMedium: string;
  shadowDark: string;

  veg: string;
  nonVeg: string;
  jain: string;

  gradient: {
    primary: string[];
    warm: string[];
    dark: string[];
    sunset: string[];
    success: string[];
  };

  promo: {
    gold: string;
    orange: string;
    red: string;
  };

  status: {
    online: string;
    busy: string;
    offline: string;
    pending: string;
    preparing: string;
    delivered: string;
    cancelled: string;
  };

  statusBar: 'light-content' | 'dark-content';
  tabBar: string;
}

export interface Theme {
  colors: ThemeColors;
  isDark: boolean;
}

const lightColors: ThemeColors = {
  primary: '#FF5A1F',
  primaryDark: '#D9480F',
  primaryLight: '#FF8A5B',
  primaryGhost: '#FF5A1F1A',
  secondary: '#FC7B45',
  secondaryLight: '#FFE8DD',
  success: '#1FA971',
  successLight: '#E7F8F1',
  info: '#2F80ED',
  infoLight: '#E9F1FF',
  loyalty: '#F6A609',
  loyaltyLight: '#FFF5D9',
  warning: '#F59E0B',
  warningLight: '#FFF5DD',
  error: '#E5484D',
  errorLight: '#FFE9EB',

  background: '#FFF8F4',
  surface: '#FFFFFF',
  surfaceSecondary: '#FFF1E8',
  surfaceElevated: '#FFFFFF',
  surfaceWarm: '#FFF4EC',
  surfaceCard: '#FFFFFF',

  textPrimary: '#1F1B16',
  textSecondary: '#625B54',
  textTertiary: '#9E948B',
  textInverse: '#FFFFFF',
  textMuted: '#D8CEC5',

  border: '#F0E1D5',
  borderLight: '#F7EDE6',
  borderAccent: '#FF5A1F',
  divider: '#F4E8DF',

  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayLight: 'rgba(35, 24, 14, 0.08)',
  overlayGradient: 'rgba(255, 90, 31, 0.08)',
  shadow: 'rgba(31, 27, 22, 0.08)',
  shadowMedium: 'rgba(31, 27, 22, 0.14)',
  shadowDark: 'rgba(31, 27, 22, 0.2)',

  veg: '#1FA971',
  nonVeg: '#E5484D',
  jain: '#F6A609',

  gradient: {
    primary: ['#FF5A1F', '#FF8A5B'],
    warm: ['#FFF8F4', '#FFF0E6'],
    dark: ['#1F1B16', '#322A22'],
    sunset: ['#FF5A1F', '#E5484D'],
    success: ['#1FA971', '#0E9F6E'],
  },

  promo: {
    gold: '#F6A609',
    orange: '#FF5A1F',
    red: '#E5484D',
  },

  status: {
    online: '#1FA971',
    busy: '#F6A609',
    offline: '#9E948B',
    pending: '#2F80ED',
    preparing: '#F59E0B',
    delivered: '#1FA971',
    cancelled: '#E5484D',
  },

  statusBar: 'dark-content',
  tabBar: '#FFFFFF',
};

const darkColors: ThemeColors = {
  primary: '#FF8A5B',
  primaryDark: '#FF5A1F',
  primaryLight: '#FFB291',
  primaryGhost: '#FF8A5B33',
  secondary: '#FF9A6D',
  secondaryLight: '#4E2E1F',
  success: '#35C58E',
  successLight: '#18382C',
  info: '#6EB0FF',
  infoLight: '#1D3554',
  loyalty: '#F7C14D',
  loyaltyLight: '#4D3A18',
  warning: '#F7B955',
  warningLight: '#4D3717',
  error: '#F36A70',
  errorLight: '#4A2024',

  background: '#19120D',
  surface: '#2A1F17',
  surfaceSecondary: '#33261D',
  surfaceElevated: '#3A2B20',
  surfaceWarm: '#2E221A',
  surfaceCard: '#30241C',

  textPrimary: '#FFF5EE',
  textSecondary: '#D7C3B3',
  textTertiary: '#A88F7D',
  textInverse: '#19120D',
  textMuted: '#7B6455',

  border: '#4C3729',
  borderLight: '#3A2B20',
  borderAccent: '#FF8A5B',
  divider: '#4C3729',

  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.22)',
  overlayGradient: 'rgba(255, 138, 91, 0.16)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowMedium: 'rgba(0, 0, 0, 0.4)',
  shadowDark: 'rgba(0, 0, 0, 0.5)',

  veg: '#35C58E',
  nonVeg: '#F36A70',
  jain: '#F7C14D',

  gradient: {
    primary: ['#FF8A5B', '#FF5A1F'],
    warm: ['#2A1F17', '#3A2B20'],
    dark: ['#19120D', '#2A1F17'],
    sunset: ['#FF8A5B', '#F36A70'],
    success: ['#35C58E', '#0E9F6E'],
  },

  promo: {
    gold: '#F7C14D',
    orange: '#FF8A5B',
    red: '#F36A70',
  },

  status: {
    online: '#35C58E',
    busy: '#F7C14D',
    offline: '#A88F7D',
    pending: '#6EB0FF',
    preparing: '#F7B955',
    delivered: '#35C58E',
    cancelled: '#F36A70',
  },

  statusBar: 'light-content',
  tabBar: '#2A1F17',
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@foodiego_theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    loadTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      } else {
        setIsDark(systemColorScheme === 'dark');
      }
    } catch {
      setIsDark(systemColorScheme === 'dark');
    }
  };

  const saveTheme = async (dark: boolean) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light');
    } catch {
      // Silent fail
    }
  };

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    saveTheme(newIsDark);
  };

  const setTheme = (dark: boolean) => {
    setIsDark(dark);
    saveTheme(dark);
  };

  const theme: Theme = {
    colors: isDark ? darkColors : lightColors,
    isDark,
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
