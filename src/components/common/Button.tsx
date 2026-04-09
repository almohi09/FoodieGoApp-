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
  View,
} from 'react-native';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  responsiveSize,
} from '../../theme';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 360;

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?:
    | 'primary'
    | 'secondary'
    | 'text'
    | 'danger'
    | 'success'
    | 'ghost'
    | 'outline';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  iconString?: string;
  iconPosition?: 'left' | 'right';
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  testID?: string;
  fullWidth?: boolean;
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
  iconString,
  iconPosition = 'left',
  size = 'medium',
  animated = true,
  testID,
  fullWidth,
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
    const baseStyles: (ViewStyle | false | undefined)[] = [
      styles.button,
      styles[size],
      isDisabled ? styles.disabled : undefined,
      fullWidth ? styles.fullWidth : undefined,
    ];

    switch (variant) {
      case 'secondary':
        return [...baseStyles, styles.secondary];
      case 'text':
        return [...baseStyles, styles.textButton];
      case 'danger':
        return [...baseStyles, styles.danger];
      case 'success':
        return [...baseStyles, styles.success];
      case 'ghost':
        return [...baseStyles, styles.ghost];
      case 'outline':
        return [...baseStyles, styles.outline];
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
      case 'danger':
        return [...baseStyles, styles.dangerText];
      case 'success':
        return [...baseStyles, styles.successText];
      case 'ghost':
      case 'outline':
        return [...baseStyles, styles.ghostText];
      default:
        return [...baseStyles, styles.primaryText];
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          color={
            variant === 'primary' ||
            variant === 'danger' ||
            variant === 'success'
              ? colors.textInverse
              : colors.primary
          }
          size="small"
        />
      );
    }

    const textEl = (
      <Text style={[getTextStyle(), textStyle]} numberOfLines={1}>
        {title}
      </Text>
    );

    if (iconString) {
      const iconEl = (
        <Text
          style={[
            styles.iconText,
            { fontSize: size === 'small' ? 14 : size === 'large' ? 20 : 17 },
          ]}
        >
          {iconString}
        </Text>
      );

      return (
        <View style={styles.content}>
          {iconPosition === 'left' && iconEl}
          {textEl}
          {iconPosition === 'right' && iconEl}
        </View>
      );
    }

    return (
      <View style={styles.content}>
        {icon && <View style={styles.iconWrapper}>{icon}</View>}
        {textEl}
      </View>
    );
  };

  return (
    <Animated.View
      style={animated ? { transform: [{ scale: scaleAnim }] } : undefined}
    >
      <TouchableOpacity activeOpacity={0.7}
        style={[getButtonStyle(), style]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
       
        testID={testID}
        accessibilityLabel={title}
        accessibilityRole="button"
      >
        {renderContent()}
      </TouchableOpacity>
    </Animated.View>
  );
};

interface IconButtonProps {
  icon: string;
  onPress: () => void;
  size?: number;
  backgroundColor?: string;
  iconColor?: string;
  disabled?: boolean;
  testID?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 44,
  backgroundColor,
  iconColor,
  disabled,
  testID,
}) => {
  return (
    <TouchableOpacity activeOpacity={0.7}
      style={[
        styles.iconButton,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: backgroundColor || colors.surfaceSecondary,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
     
      testID={testID}
    >
      <Text
        style={[
          styles.iconButtonText,
          {
            fontSize: size * 0.45,
            color: iconColor || colors.textPrimary,
          },
        ]}
      >
        {icon}
      </Text>
    </TouchableOpacity>
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
  fullWidth: {
    width: '100%',
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
    backgroundColor: colors.surfaceSecondary,
  },
  textButton: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.sm,
  },
  ghost: {
    backgroundColor: colors.primaryGhost,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.error,
  },
  success: {
    backgroundColor: colors.success,
  },
  disabled: {
    backgroundColor: colors.border,
    borderColor: colors.border,
    borderWidth: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginRight: spacing.xs,
  },
  iconText: {
    marginHorizontal: spacing.xs,
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
    color: colors.textPrimary,
  },
  linkText: {
    color: colors.primary,
  },
  ghostText: {
    color: colors.primary,
  },
  dangerText: {
    color: colors.textInverse,
  },
  successText: {
    color: colors.textInverse,
  },
  disabledText: {
    color: colors.textTertiary,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {},
});

