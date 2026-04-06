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
  success: string;
  successLight: string;
  info: string;
  infoLight: string;
  loyalty: string;
  loyaltyLight: string;
  error: string;
  errorLight: string;
  warning: string;

  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceElevated: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  border: string;
  borderLight: string;
  divider: string;

  overlay: string;
  shadow: string;

  veg: string;
  nonVeg: string;
  jain: string;

  statusBar: 'light-content' | 'dark-content';
  tabBar: string;
}

export interface Theme {
  colors: ThemeColors;
  isDark: boolean;
}

const lightColors: ThemeColors = {
  primary: '#E85D3F',
  primaryDark: '#C6472F',
  primaryLight: '#F39A7A',
  success: '#4FA56D',
  successLight: '#EAF5ED',
  info: '#4E8FCB',
  infoLight: '#E8F1FA',
  loyalty: '#D9A441',
  loyaltyLight: '#FBF3E2',
  error: '#D94C4C',
  errorLight: '#FCECEC',
  warning: '#E3A13B',

  background: '#FFF8F1',
  surface: '#FFFFFF',
  surfaceSecondary: '#F7EFE5',
  surfaceElevated: '#FFFFFF',

  textPrimary: '#2F241F',
  textSecondary: '#6E5B51',
  textTertiary: '#9A877B',
  textInverse: '#FFFFFF',

  border: '#EADCCD',
  borderLight: '#F4EBDD',
  divider: '#EADCCD',

  overlay: 'rgba(38, 24, 17, 0.35)',
  shadow: 'rgba(52, 35, 26, 0.12)',

  veg: '#4FA56D',
  nonVeg: '#D94C4C',
  jain: '#D9A441',

  statusBar: 'dark-content',
  tabBar: '#FFFFFF',
};

const darkColors: ThemeColors = {
  primary: '#FF7A59',
  primaryDark: '#E06245',
  primaryLight: '#FFA68D',
  success: '#63C283',
  successLight: '#2C4E3A',
  info: '#70A8D9',
  infoLight: '#2A3C4E',
  loyalty: '#E1B564',
  loyaltyLight: '#4A3A21',
  error: '#EA6A6A',
  errorLight: '#4B2424',
  warning: '#E6B255',

  background: '#1B1410',
  surface: '#251B16',
  surfaceSecondary: '#30231D',
  surfaceElevated: '#342720',

  textPrimary: '#FDF3EA',
  textSecondary: '#D5C0B1',
  textTertiary: '#AE9486',
  textInverse: '#FFFFFF',

  border: '#4A382E',
  borderLight: '#30231D',
  divider: '#4A382E',

  overlay: 'rgba(0, 0, 0, 0.62)',
  shadow: 'rgba(0, 0, 0, 0.45)',

  veg: '#63C283',
  nonVeg: '#EA6A6A',
  jain: '#E1B564',

  statusBar: 'light-content',
  tabBar: '#251B16',
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
