import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBox } from '../SkeletonLoader';
import { Spacing } from '../../theme';

export const RestaurantDetailSkeleton: React.FC = () => (
  <View style={styles.container}>
    <SkeletonBox style={styles.header} />
    <View style={styles.tabs}>
      <SkeletonBox style={styles.tab} />
      <SkeletonBox style={styles.tab} />
      <SkeletonBox style={styles.tab} />
    </View>
    <SkeletonBox style={styles.row} />
    <SkeletonBox style={styles.row} />
    <SkeletonBox style={styles.row} />
    <SkeletonBox style={styles.row} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  header: {
    height: 220,
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  tab: {
    width: 90,
    height: 36,
  },
  row: {
    height: 90,
  },
});

export default RestaurantDetailSkeleton;

