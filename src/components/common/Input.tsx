import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
  Dimensions,
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

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  leftIcon,
  rightIcon,
  style,
  size = 'medium',
  ...props
}) => {
  const inputStyles: TextStyle[] = [
    styles.input,
    size === 'small'
      ? styles.inputSmall
      : size === 'large'
        ? styles.inputLarge
        : styles.inputMedium,
  ];

  if (error) {
    inputStyles.push(styles.inputErrorBorder);
  }
  if (leftIcon) {
    inputStyles.push(styles.inputWithLeftIcon);
  }
  if (rightIcon) {
    inputStyles.push(styles.inputWithRightIcon);
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[styles.inputContainer, error && styles.inputContainerError]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[...inputStyles, style]}
          placeholderTextColor={colors.textTertiary}
          {...props}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: isSmallScreen ? spacing.md : spacing.lg,
  },
  label: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
  },
  inputContainerError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  inputSmall: {
    paddingVertical: isSmallScreen ? spacing.sm : spacing.sm + 2,
    paddingHorizontal: isSmallScreen ? spacing.md : spacing.lg,
    fontSize: responsiveSize(14),
  },
  inputMedium: {
    paddingVertical: isSmallScreen ? spacing.md : spacing.md + 2,
    paddingHorizontal: isSmallScreen ? spacing.lg : spacing.xl,
    fontSize: responsiveSize(16),
  },
  inputLarge: {
    paddingVertical: isSmallScreen ? spacing.lg : spacing.lg + 2,
    paddingHorizontal: isSmallScreen ? spacing.xl : spacing.xxl,
    fontSize: responsiveSize(18),
  },
  inputErrorBorder: {
    borderWidth: 1.5,
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.sm,
  },
  inputWithRightIcon: {
    paddingRight: spacing.sm,
  },
  leftIcon: {
    paddingLeft: isSmallScreen ? spacing.md : spacing.lg,
  },
  rightIcon: {
    paddingRight: isSmallScreen ? spacing.md : spacing.lg,
  },
  error: {
    ...typography.small,
    color: colors.error,
    marginTop: spacing.xs,
  },
});

