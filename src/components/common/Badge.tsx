import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography, borderRadius, spacing, colors as themeColors } from '../../theme';

type BadgeVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'gold'
  | 'subtle';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: string;
  onPress?: () => void;
  pill?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'subtle',
  size = 'md',
  icon,
  onPress,
  pill = false,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  const getVariantColors = () => {
    switch (variant) {
      case 'primary':
        return { bg: colors.primaryGhost, text: colors.primary };
      case 'success':
        return { bg: colors.successLight, text: colors.success };
      case 'warning':
        return { bg: colors.warningLight, text: colors.warning };
      case 'error':
        return { bg: colors.errorLight, text: colors.error };
      case 'info':
        return { bg: colors.infoLight, text: colors.info };
      case 'gold':
        return { bg: colors.loyaltyLight, text: colors.loyalty };
      default:
        return { bg: colors.surfaceSecondary, text: colors.textSecondary };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          paddingVertical: 2,
          paddingHorizontal: 6,
          fontSize: 10,
          iconSize: 10,
        };
      case 'lg':
        return {
          paddingVertical: 6,
          paddingHorizontal: 12,
          fontSize: 14,
          iconSize: 14,
        };
      default:
        return {
          paddingVertical: 4,
          paddingHorizontal: 8,
          fontSize: 12,
          iconSize: 12,
        };
    }
  };

  const variantColors = getVariantColors();
  const sizeStyles = getSizeStyles();
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[
        styles.badge,
        pill && styles.pill,
        {
          backgroundColor: variantColors.bg,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
        },
      ]}
      onPress={onPress}
    >
      {icon && (
        <Text style={[styles.icon, { fontSize: sizeStyles.iconSize }]}>
          {icon}
        </Text>
      )}
      <Text
        style={[
          styles.text,
          {
            color: variantColors.text,
            fontSize: sizeStyles.fontSize,
          },
        ]}
      >
        {label}
      </Text>
    </Container>
  );
};

type StatusType =
  | 'online'
  | 'busy'
  | 'offline'
  | 'pending'
  | 'preparing'
  | 'delivered'
  | 'cancelled';

interface StatusChipProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

const statusConfig: Record<
  StatusType,
  { label: string; color: string; bgColor: string }
> = {
  online: { label: 'Open', color: themeColors.status.online, bgColor: themeColors.successLight },
  busy: { label: 'Busy', color: themeColors.status.busy, bgColor: themeColors.warningLight },
  offline: { label: 'Closed', color: themeColors.status.offline, bgColor: themeColors.surfaceSecondary },
  pending: { label: 'Pending', color: themeColors.status.pending, bgColor: themeColors.infoLight },
  preparing: { label: 'Preparing', color: themeColors.status.preparing, bgColor: themeColors.warningLight },
  delivered: { label: 'Delivered', color: themeColors.status.delivered, bgColor: themeColors.successLight },
  cancelled: { label: 'Cancelled', color: themeColors.status.cancelled, bgColor: themeColors.errorLight },
};

export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  label,
  size = 'md',
  showDot = true,
}) => {
  const { theme } = useTheme();
  const c = theme.colors;

  const themed = {
    label: statusConfig[status].label,
    color:
      (c.status as Record<StatusType, string>)[status] ||
      statusConfig[status].color,
    bgColor: `${(c.status as Record<StatusType, string>)[status] || statusConfig[status].color}20`,
  };

  return (
    <View
      style={[
        styles.statusChip,
        size === 'sm' && styles.statusChipSm,
        { backgroundColor: themed.bgColor },
      ]}
    >
      {showDot && (
        <View style={[styles.statusDot, { backgroundColor: themed.color }]} />
      )}
      <Text
        style={[
          styles.statusText,
          size === 'sm' && styles.statusTextSm,
          { color: themed.color },
        ]}
      >
        {label || themed.label}
      </Text>
    </View>
  );
};

interface DiscountBadgeProps {
  discount: number;
  size?: 'sm' | 'md';
}

export const DiscountBadge: React.FC<DiscountBadgeProps> = ({
  discount,
  size = 'md',
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <View
      style={[
        styles.discountBadge,
        size === 'sm' && styles.discountBadgeSm,
        { backgroundColor: colors.primary },
      ]}
    >
      <Text
        style={[styles.discountText, size === 'sm' && styles.discountTextSm]}
      >
        {discount}% OFF
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  pill: {
    borderRadius: borderRadius.full,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    ...typography.smallMedium,
    fontWeight: '600',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  statusChipSm: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    ...typography.smallMedium,
    fontWeight: '600',
  },
  statusTextSm: {
    ...typography.tiny,
  },
  discountBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    zIndex: 1,
  },
  discountBadgeSm: {
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  discountText: {
    ...typography.tiny,
    fontWeight: '700',
    color: themeColors.textInverse,
  },
  discountTextSm: {
    fontSize: 9,
  },
});

