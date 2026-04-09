import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Typography } from '../../theme';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'gray';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const BACKGROUND_BY_VARIANT: Record<BadgeVariant, string> = {
  success: Colors.SUCCESS_LIGHT,
  warning: Colors.WARNING_LIGHT,
  error: Colors.ERROR_LIGHT,
  info: Colors.INFO_LIGHT,
  gray: Colors.BG_TERTIARY,
};

const TEXT_BY_VARIANT: Record<BadgeVariant, string> = {
  success: Colors.SUCCESS,
  warning: Colors.WARNING,
  error: Colors.ERROR,
  info: Colors.INFO,
  gray: Colors.TEXT_SECONDARY,
};

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'gray' }) => (
  <View style={[styles.badge, { backgroundColor: BACKGROUND_BY_VARIANT[variant] }]}>
    <Text style={[styles.text, { color: TEXT_BY_VARIANT[variant] }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
});

export default Badge;

