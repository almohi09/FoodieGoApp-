import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const {} = Dimensions.get('window');

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width: w,
  height = 16,
  borderRadius = 8,
  style,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: w ?? '100%',
          height,
          borderRadius,
          backgroundColor: colors.surfaceSecondary,
          opacity,
        },
        style,
      ]}
    />
  );
};

interface SkeletonCardProps {
  variant?: 'restaurant' | 'menuItem' | 'compact';
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  variant = 'restaurant',
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  if (variant === 'restaurant') {
    return (
      <View style={[styles.cardContainer, { backgroundColor: colors.surface }]}>
        <Skeleton width="100%" height={140} borderRadius={16} />
        <View style={styles.cardContent}>
          <View style={styles.cardRow}>
            <Skeleton width={160} height={18} borderRadius={6} />
            <Skeleton width={40} height={18} borderRadius={6} />
          </View>
          <Skeleton
            width={120}
            height={14}
            borderRadius={6}
            style={{ marginTop: 6 }}
          />
          <View style={[styles.cardRow, { marginTop: 10 }]}>
            <Skeleton width={60} height={24} borderRadius={12} />
            <Skeleton width={80} height={14} borderRadius={6} />
          </View>
        </View>
      </View>
    );
  }

  if (variant === 'menuItem') {
    return (
      <View
        style={[styles.menuItemContainer, { backgroundColor: colors.surface }]}
      >
        <View style={styles.menuItemContent}>
          <Skeleton width={80} height={14} borderRadius={6} />
          <Skeleton
            width="90%"
            height={14}
            borderRadius={6}
            style={{ marginTop: 6 }}
          />
          <Skeleton
            width={60}
            height={14}
            borderRadius={6}
            style={{ marginTop: 6 }}
          />
        </View>
        <Skeleton width={90} height={90} borderRadius={12} />
      </View>
    );
  }

  return (
    <View
      style={[styles.compactContainer, { backgroundColor: colors.surface }]}
    >
      <Skeleton width={64} height={64} borderRadius={12} />
      <View style={styles.compactContent}>
        <Skeleton width={120} height={16} borderRadius={6} />
        <Skeleton
          width={80}
          height={12}
          borderRadius={6}
          style={{ marginTop: 4 }}
        />
        <Skeleton
          width={100}
          height={12}
          borderRadius={6}
          style={{ marginTop: 4 }}
        />
      </View>
    </View>
  );
};

interface SkeletonListProps {
  count?: number;
  variant?: 'restaurant' | 'menuItem' | 'compact';
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 4,
  variant = 'restaurant',
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} variant={variant} />
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  cardContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardContent: {
    padding: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemContainer: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  menuItemContent: {
    flex: 1,
    marginRight: 14,
  },
  compactContainer: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  compactContent: {
    flex: 1,
    marginLeft: 12,
  },
});

