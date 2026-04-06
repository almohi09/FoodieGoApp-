import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Dimensions,
  Animated,
} from 'react-native';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  responsiveSize,
} from '../../../theme';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 360;

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  size = 'medium',
  animated = true,
  testID,
}) => {
  const isDisabled = disabled || loading;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (animated && !isDisabled) {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (animated && !isDisabled) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }).start();
    }
  };

  const getButtonStyle = () => {
    const baseStyles: (ViewStyle | false)[] = [
      styles.button,
      styles[size],
      isDisabled && styles.disabled,
    ];

    switch (variant) {
      case 'secondary':
        return [...baseStyles, styles.secondary];
      case 'text':
        return [...baseStyles, styles.textButton];
      default:
        return [...baseStyles, styles.primary];
    }
  };

  const getTextStyle = () => {
    const baseStyles: (TextStyle | false)[] = [
      styles.text,
      styles[`${size}Text`],
      isDisabled && styles.disabledText,
    ];

    switch (variant) {
      case 'secondary':
        return [...baseStyles, styles.secondaryText];
      case 'text':
        return [...baseStyles, styles.linkText];
      default:
        return [...baseStyles, styles.primaryText];
    }
  };

  return (
    <Animated.View
      style={animated ? { transform: [{ scale: scaleAnim }] } : undefined}
    >
      <TouchableOpacity
        style={[getButtonStyle(), style]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1}
        testID={testID}
        accessibilityLabel={title}
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'primary' ? colors.textInverse : colors.primary}
            size="small"
          />
        ) : (
          <>
            {icon}
            <Text style={[getTextStyle(), textStyle]} numberOfLines={1}>
              {title}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  small: {
    paddingVertical: isSmallScreen ? spacing.sm : spacing.sm + 2,
    paddingHorizontal: isSmallScreen ? spacing.md : spacing.lg,
    minHeight: 36,
  },
  medium: {
    paddingVertical: isSmallScreen ? spacing.md : spacing.md + 2,
    paddingHorizontal: isSmallScreen ? spacing.lg : spacing.xl,
    minHeight: 44,
  },
  large: {
    paddingVertical: isSmallScreen ? spacing.lg : spacing.lg + 2,
    paddingHorizontal: isSmallScreen ? spacing.xl : spacing.xxl,
    minHeight: 52,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  textButton: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.sm,
  },
  disabled: {
    backgroundColor: colors.border,
    borderColor: colors.border,
  },
  text: {
    ...typography.bodyMedium,
  },
  smallText: {
    fontSize: responsiveSize(13),
  },
  mediumText: {
    fontSize: responsiveSize(15),
  },
  largeText: {
    fontSize: responsiveSize(17),
  },
  primaryText: {
    color: colors.textInverse,
  },
  secondaryText: {
    color: colors.primary,
  },
  linkText: {
    color: colors.primary,
  },
  disabledText: {
    color: colors.textTertiary,
  },
});
