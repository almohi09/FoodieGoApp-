import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBox, SkeletonCircle } from '../SkeletonLoader';
import { Spacing } from '../../theme';

export const HomeScreenSkeleton: React.FC = () => (
  <View style={styles.container}>
    <SkeletonBox style={styles.banner} />
    <View style={styles.row}>
      <SkeletonCircle style={styles.circle} />
      <SkeletonCircle style={styles.circle} />
      <SkeletonCircle style={styles.circle} />
      <SkeletonCircle style={styles.circle} />
    </View>
    <SkeletonBox style={styles.card} />
    <SkeletonBox style={styles.card} />
    <SkeletonBox style={styles.card} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  banner: {
    height: 140,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  circle: {
    width: 58,
    height: 58,
  },
  card: {
    height: 150,
  },
});

export default HomeScreenSkeleton;

