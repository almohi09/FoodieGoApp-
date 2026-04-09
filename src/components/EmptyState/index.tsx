import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Colors, Radius, Spacing, Typography } from '../../theme';

type IllustrationKey =
  | 'empty-cart'
  | 'no-orders'
  | 'no-restaurants'
  | 'no-results'
  | 'no-notifications';

interface EmptyStateProps {
  illustration: IllustrationKey;
  title: string;
  subtitle: string;
  buttonText?: string;
  onButtonPress?: () => void;
}

const Illustration: React.FC<{ type: IllustrationKey }> = ({ type }) => {
  if (type === 'empty-cart') {
    return (
      <Svg width={96} height={96} viewBox="0 0 96 96">
        <Rect x="14" y="26" width="62" height="36" rx="8" fill={Colors.PRIMARY_LIGHT} />
        <Circle cx="32" cy="72" r="7" fill={Colors.TEXT_TERTIARY} />
        <Circle cx="60" cy="72" r="7" fill={Colors.TEXT_TERTIARY} />
      </Svg>
    );
  }
  if (type === 'no-orders') {
    return (
      <Svg width={96} height={96} viewBox="0 0 96 96">
        <Rect x="22" y="14" width="52" height="68" rx="8" fill={Colors.INFO_LIGHT} />
        <Rect x="30" y="30" width="36" height="6" rx="3" fill={Colors.INFO} />
        <Rect x="30" y="44" width="26" height="6" rx="3" fill={Colors.TEXT_TERTIARY} />
      </Svg>
    );
  }
  if (type === 'no-restaurants') {
    return (
      <Svg width={96} height={96} viewBox="0 0 96 96">
        <Rect x="16" y="28" width="64" height="44" rx="8" fill={Colors.WARNING_LIGHT} />
        <Rect x="24" y="36" width="48" height="10" rx="5" fill={Colors.WARNING} />
        <Rect x="24" y="52" width="34" height="8" rx="4" fill={Colors.TEXT_TERTIARY} />
      </Svg>
    );
  }
  if (type === 'no-results') {
    return (
      <Svg width={96} height={96} viewBox="0 0 96 96">
        <Circle cx="42" cy="42" r="20" fill={Colors.BG_TERTIARY} />
        <Path d="M57 57L72 72" stroke={Colors.TEXT_TERTIARY} strokeWidth="6" strokeLinecap="round" />
      </Svg>
    );
  }
  return (
    <Svg width={96} height={96} viewBox="0 0 96 96">
      <Rect x="22" y="18" width="52" height="60" rx="14" fill={Colors.SUCCESS_LIGHT} />
      <Circle cx="48" cy="46" r="5" fill={Colors.SUCCESS} />
      <Rect x="34" y="56" width="28" height="5" rx="2.5" fill={Colors.TEXT_TERTIARY} />
    </Svg>
  );
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  illustration,
  title,
  subtitle,
  buttonText,
  onButtonPress,
}) => (
  <View style={styles.container}>
    <Illustration type={illustration} />
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
    {buttonText && onButtonPress ? (
      <TouchableOpacity activeOpacity={0.7} style={styles.button} onPress={onButtonPress}>
        <Text style={styles.buttonText}>{buttonText}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  title: {
    ...Typography.h3,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body2,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  button: {
    marginTop: Spacing.md,
    backgroundColor: Colors.PRIMARY,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  buttonText: {
    ...Typography.label,
    color: Colors.TEXT_INVERSE,
  },
});

export default EmptyState;

