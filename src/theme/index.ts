import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BASE_WIDTH = 375;
const scale = SCREEN_WIDTH / BASE_WIDTH;

export const responsiveSize = (size: number): number => {
  return Math.round(size * scale);
};

export const colors = {
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
};

export const spacing = {
  xs: responsiveSize(4),
  sm: responsiveSize(8),
  md: responsiveSize(12),
  lg: responsiveSize(16),
  xl: responsiveSize(20),
  xxl: responsiveSize(24),
  xxxl: responsiveSize(32),
};

export const borderRadius = {
  sm: responsiveSize(8),
  md: responsiveSize(12),
  lg: responsiveSize(16),
  xl: responsiveSize(20),
  full: 9999,
};

export const typography = {
  h1: {
    fontSize: responsiveSize(28),
    fontWeight: '700' as const,
    lineHeight: responsiveSize(36),
  },
  h2: {
    fontSize: responsiveSize(24),
    fontWeight: '700' as const,
    lineHeight: responsiveSize(32),
  },
  h3: {
    fontSize: responsiveSize(20),
    fontWeight: '600' as const,
    lineHeight: responsiveSize(28),
  },
  h4: {
    fontSize: responsiveSize(18),
    fontWeight: '600' as const,
    lineHeight: responsiveSize(24),
  },
  body: {
    fontSize: responsiveSize(16),
    fontWeight: '400' as const,
    lineHeight: responsiveSize(24),
  },
  bodyMedium: {
    fontSize: responsiveSize(16),
    fontWeight: '500' as const,
    lineHeight: responsiveSize(24),
  },
  caption: {
    fontSize: responsiveSize(14),
    fontWeight: '400' as const,
    lineHeight: responsiveSize(20),
  },
  captionMedium: {
    fontSize: responsiveSize(14),
    fontWeight: '500' as const,
    lineHeight: responsiveSize(20),
  },
  small: {
    fontSize: responsiveSize(12),
    fontWeight: '400' as const,
    lineHeight: responsiveSize(16),
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: responsiveSize(1) },
    shadowOpacity: 0.05,
    shadowRadius: responsiveSize(2),
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: responsiveSize(2) },
    shadowOpacity: 0.1,
    shadowRadius: responsiveSize(4),
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: responsiveSize(4) },
    shadowOpacity: 0.15,
    shadowRadius: responsiveSize(8),
    elevation: 5,
  },
};

export const hitSlop = {
  top: responsiveSize(10),
  bottom: responsiveSize(10),
  left: responsiveSize(10),
  right: responsiveSize(10),
};

export const commonStyles = {
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  spaceBetween: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  center: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  flex1: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
};
