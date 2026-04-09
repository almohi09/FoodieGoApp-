import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';

interface LoadingProps {
  size?: 'small' | 'large';
  message?: string;
  fullScreen?: boolean;
  variant?: 'default' | 'dots' | 'pulse';
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'large',
  message,
  fullScreen = false,
  variant = 'default',
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  const renderIndicator = () => {
    if (variant === 'dots') {
      return (
        <View style={styles.dotsContainer}>
          {[0, 1, 2].map(i => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: colors.primary,
                  opacity: 0.3 + i * 0.25,
                },
              ]}
            />
          ))}
        </View>
      );
    }

    return <ActivityIndicator size={size} color={colors.primary} />;
  };

  const content = (
    <View style={styles.container}>
      {renderIndicator()}
      {message && (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
        {content}
      </View>
    );
  }

  return content;
};

interface InlineLoadingProps {
  message?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({ message }) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <View style={styles.inlineContainer}>
      <ActivityIndicator size="small" color={colors.primary} />
      {message && (
        <Text style={[styles.inlineMessage, { color: colors.textTertiary }]}>
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    ...typography.body,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  inlineMessage: {
    ...typography.small,
  },
});

