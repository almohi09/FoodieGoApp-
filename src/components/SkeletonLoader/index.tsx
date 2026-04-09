import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors, Radius } from '../../theme';

interface SkeletonBaseProps {
  style?: StyleProp<ViewStyle>;
}

const useShimmer = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [opacity]);

  return opacity;
};

export const SkeletonBox: React.FC<SkeletonBaseProps> = ({ style }) => {
  const opacity = useShimmer();
  return <Animated.View style={[styles.base, styles.box, style, { opacity }]} />;
};

export const SkeletonText: React.FC<SkeletonBaseProps> = ({ style }) => {
  const opacity = useShimmer();
  return <Animated.View style={[styles.base, styles.text, style, { opacity }]} />;
};

export const SkeletonCircle: React.FC<SkeletonBaseProps> = ({ style }) => {
  const opacity = useShimmer();
  return <Animated.View style={[styles.base, styles.circle, style, { opacity }]} />;
};

export const SkeletonLoader: React.FC = () => (
  <View style={styles.loaderWrap}>
    <SkeletonBox style={styles.loaderBoxLarge} />
    <SkeletonBox style={styles.loaderBoxMedium} />
    <SkeletonBox style={styles.loaderBoxMedium} />
    <SkeletonBox style={styles.loaderBoxSmall} />
  </View>
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.BG_TERTIARY,
  },
  box: {
    borderRadius: Radius.md,
  },
  text: {
    height: 12,
    borderRadius: Radius.sm,
    width: '100%',
  },
  circle: {
    borderRadius: Radius.full,
  },
  loaderWrap: {
    padding: 16,
  },
  loaderBoxLarge: {
    height: 120,
    marginBottom: 12,
  },
  loaderBoxMedium: {
    height: 72,
    marginBottom: 12,
  },
  loaderBoxSmall: {
    height: 56,
  },
});
