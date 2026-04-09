import { Colors } from './colors';
import { Typography } from './typography';
import { Radius, Shadow, Spacing } from './spacing';

export { Colors, Typography, Spacing, Radius, Shadow };

export const responsiveSize = (size: number): number => size;

export const colors = {
  primary: Colors.PRIMARY,
  primaryDark: Colors.PRIMARY_DARK,
  primaryLight: Colors.PRIMARY_LIGHT,
  primaryGhost: Colors.PRIMARY_LIGHT,
  secondary: Colors.INFO,
  secondaryLight: Colors.INFO_LIGHT,
  success: Colors.SUCCESS,
  successLight: Colors.SUCCESS_LIGHT,
  info: Colors.INFO,
  infoLight: Colors.INFO_LIGHT,
  loyalty: Colors.STAR,
  loyaltyLight: Colors.WARNING_LIGHT,
  warning: Colors.WARNING,
  warningLight: Colors.WARNING_LIGHT,
  error: Colors.ERROR,
  errorLight: Colors.ERROR_LIGHT,
  background: Colors.BG_PRIMARY,
  surface: Colors.BG_PRIMARY,
  surfaceSecondary: Colors.BG_SECONDARY,
  surfaceElevated: Colors.BG_PRIMARY,
  surfaceWarm: Colors.BG_SECONDARY,
  surfaceCard: Colors.BG_PRIMARY,
  textPrimary: Colors.TEXT_PRIMARY,
  textSecondary: Colors.TEXT_SECONDARY,
  textTertiary: Colors.TEXT_TERTIARY,
  textInverse: Colors.TEXT_INVERSE,
  textMuted: Colors.TEXT_TERTIARY,
  border: Colors.BORDER,
  borderLight: Colors.BORDER,
  borderAccent: Colors.PRIMARY,
  divider: Colors.BORDER,
  overlay: Colors.OVERLAY,
  overlayLight: Colors.OVERLAY_LIGHT,
  overlayGradient: Colors.OVERLAY,
  overlayDark: Colors.OVERLAY_DARK,
  overlaySoft: Colors.OVERLAY_SOFT,
  shadow: Colors.SHADOW,
  shadowMedium: Colors.SHADOW,
  shadowDark: Colors.SHADOW,
  veg: Colors.VEG,
  nonVeg: Colors.NON_VEG,
  white95: Colors.WHITE_95,
  white90: Colors.WHITE_90,
  white85: Colors.WHITE_85,
  white80: Colors.WHITE_80,
  white70: Colors.WHITE_70,
  white45: Colors.WHITE_45,
  white30: Colors.WHITE_30,
  white25: Colors.WHITE_25,
  white20: Colors.WHITE_20,
  white15: Colors.WHITE_15,
  black35: Colors.BLACK_35,
  black06: Colors.BLACK_06,
  jain: Colors.WARNING,
  gradient: {
    primary: [Colors.PRIMARY, Colors.PRIMARY_DARK],
    warm: [Colors.BG_PRIMARY, Colors.BG_SECONDARY],
    dark: [Colors.TEXT_PRIMARY, Colors.TEXT_SECONDARY],
    sunset: [Colors.PRIMARY, Colors.WARNING],
    success: [Colors.SUCCESS, Colors.VEG],
  },
  promo: {
    gold: Colors.STAR,
    orange: Colors.WARNING,
    red: Colors.PRIMARY,
  },
  status: {
    online: Colors.SUCCESS,
    busy: Colors.WARNING,
    offline: Colors.TEXT_TERTIARY,
    pending: Colors.INFO,
    preparing: Colors.WARNING,
    delivered: Colors.SUCCESS,
    cancelled: Colors.ERROR,
    placed: Colors.STATUS_PLACED,
    pickedUp: Colors.STATUS_PICKED,
  },
  statusBg: {
    placed: Colors.STATUS_PLACED_BG,
    confirmed: Colors.STATUS_CONFIRMED_BG,
    preparing: Colors.STATUS_PREPARING_BG,
    pickedUp: Colors.STATUS_PICKED_BG,
    delivered: Colors.STATUS_DELIVERED_BG,
    cancelled: Colors.STATUS_CANCELLED_BG,
  },
};

export const spacing = {
  xs: Spacing.xs,
  sm: Spacing.sm,
  cardGap: Spacing.cardGap,
  md: Spacing.md,
  lg: Spacing.lg,
  xl: Spacing.xl,
  xxl: Spacing.xxl,
  screenEdge: Spacing.screenEdge,
  sectionGap: Spacing.sectionGap,
  cardPadding: Spacing.cardPadding,
  iconText: Spacing.iconText,
  touchTarget: Spacing.touchTarget,
  xxxl: Spacing.xxl,
  huge: Spacing.xxl,
};

export const borderRadius = {
  xs: Radius.sm,
  sm: Radius.sm,
  md: Radius.md,
  lg: Radius.lg,
  xl: Radius.xl,
  xxl: Radius.xl,
  full: Radius.full,
  circle: Radius.full,
};

export const typography = {
  h1: Typography.h1,
  h2: Typography.h2,
  h3: Typography.h3,
  h4: Typography.h4,
  body: Typography.body1,
  bodyMedium: Typography.body1,
  bodySemibold: { ...Typography.body1, fontWeight: '600' as const },
  caption: Typography.caption,
  captionMedium: Typography.label,
  captionSemibold: { ...Typography.label, fontWeight: '600' as const },
  small: Typography.caption,
  smallMedium: Typography.label,
  tiny: { ...Typography.caption, fontSize: 11, fontWeight: '600' as const },
  button: Typography.label,
};

export const shadows = {
  xs: Shadow.sm,
  sm: Shadow.sm,
  md: Shadow.md,
  lg: Shadow.md,
  xl: Shadow.md,
  primary: Shadow.md,
  card: Shadow.md,
};

export const hitSlop = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10,
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
    ...shadows.card,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
};
