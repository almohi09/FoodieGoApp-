import React from 'react';
import { View, StyleSheet, ViewStyle, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { shadows, borderRadius, spacing } from '../../theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'subtle' | 'warm';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  variant = 'default',
  padding = 'md',
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.surfaceElevated,
          ...shadows.lg,
        };
      case 'subtle':
        return {
          backgroundColor: colors.surfaceSecondary,
          ...shadows.xs,
        };
      case 'warm':
        return {
          backgroundColor: colors.surfaceWarm,
          ...shadows.sm,
        };
      default:
        return {
          backgroundColor: colors.surface,
          ...shadows.card,
        };
    }
  };

  const getPaddingStyles = () => {
    switch (padding) {
      case 'none':
        return {};
      case 'sm':
        return { padding: spacing.sm };
      case 'lg':
        return { padding: spacing.xl };
      default:
        return { padding: spacing.lg };
    }
  };

  return (
    <View
      style={[
        styles.container,
        { borderRadius: borderRadius.lg },
        getVariantStyles(),
        getPaddingStyles(),
        style,
      ]}
    >
      {children}
    </View>
  );
};

interface DividerProps {
  spacing?: number;
}

export const Divider: React.FC<DividerProps> = ({ spacing: sp = 0 }) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: colors.divider, marginVertical: sp },
      ]}
    />
  );
};

interface CardSectionProps {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
}

export const CardSection: React.FC<CardSectionProps> = ({
  children,
  title,
  action,
  style,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <View style={[styles.section, style]}>
      {(title || action) && (
        <View style={styles.sectionHeader}>
          {title && (
            <View style={styles.sectionTitleContainer}>
              <View
                style={[
                  styles.sectionAccent,
                  { backgroundColor: colors.primary },
                ]}
              />
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
          {action && <View>{action}</View>}
        </View>
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  divider: {
    height: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionAccent: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
});

