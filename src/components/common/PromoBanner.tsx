import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { shadows, borderRadius, typography } from '../../theme';

const { width } = Dimensions.get('window');
const BANNER_WIDTH = width - 32;
const BANNER_HEIGHT = 140;

interface PromoBannerProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: string;
  backgroundColor?: string;
  onPress?: () => void;
  variant?: 'primary' | 'gradient' | 'gold' | 'flash';
}

export const PromoBanner: React.FC<PromoBannerProps> = ({
  title,
  subtitle,
  badge,
  icon = 'gift',
  backgroundColor,
  onPress,
  variant = 'primary',
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  const getVariantStyles = () => {
    switch (variant) {
      case 'gradient':
        return {
          backgroundColor: colors.primary,
          textColor: colors.textInverse,
          subtitleColor: 'rgba(255,255,255,0.85)',
          badgeBg: colors.textInverse,
          badgeText: colors.primary,
          iconBg: 'rgba(255,255,255,0.2)',
          iconColor: colors.textInverse,
        };
      case 'gold':
        return {
          backgroundColor: colors.loyalty,
          textColor: '#1A1A2E',
          subtitleColor: 'rgba(26,26,46,0.7)',
          badgeBg: '#1A1A2E',
          badgeText: colors.loyalty,
          iconBg: 'rgba(0,0,0,0.1)',
          iconColor: '#1A1A2E',
        };
      case 'flash':
        return {
          backgroundColor: colors.secondary,
          textColor: colors.textInverse,
          subtitleColor: 'rgba(255,255,255,0.85)',
          badgeBg: colors.loyalty,
          badgeText: '#1A1A2E',
          iconBg: 'rgba(255,255,255,0.2)',
          iconColor: colors.textInverse,
        };
      default:
        return {
          backgroundColor: backgroundColor || colors.primary,
          textColor: colors.textInverse,
          subtitleColor: 'rgba(255,255,255,0.85)',
          badgeBg: colors.surface,
          badgeText: colors.primary,
          iconBg: 'rgba(255,255,255,0.2)',
          iconColor: colors.textInverse,
        };
    }
  };

  const variantStyles = getVariantStyles();

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[
        styles.container,
        {
          backgroundColor: variantStyles.backgroundColor,
          width: BANNER_WIDTH,
          height: BANNER_HEIGHT,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.content}>
        {badge && (
          <View
            style={[styles.badge, { backgroundColor: variantStyles.badgeBg }]}
          >
            <Text
              style={[styles.badgeText, { color: variantStyles.badgeText }]}
            >
              {badge}
            </Text>
          </View>
        )}
        <Text style={[styles.title, { color: variantStyles.textColor }]}>
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[styles.subtitle, { color: variantStyles.subtitleColor }]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: variantStyles.iconBg },
        ]}
      >
        <Icon name={icon as any} size={36} color={variantStyles.iconColor} />
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    ...shadows.lg,
  },
  content: {
    flex: 1,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  badgeText: {
    ...typography.tiny,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    ...typography.h2,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.caption,
    lineHeight: 18,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
});

