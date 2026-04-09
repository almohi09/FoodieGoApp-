import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBox } from '../SkeletonLoader';
import { Spacing } from '../../theme';

export const OwnerDashboardSkeleton: React.FC = () => (
  <View style={styles.container}>
    <View style={styles.row}>
      <SkeletonBox style={styles.stat} />
      <SkeletonBox style={styles.stat} />
    </View>
    <View style={styles.row}>
      <SkeletonBox style={styles.stat} />
      <SkeletonBox style={styles.stat} />
    </View>
    <SkeletonBox style={styles.order} />
    <SkeletonBox style={styles.order} />
    <SkeletonBox style={styles.order} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stat: {
    flex: 1,
    height: 88,
  },
  order: {
    height: 74,
  },
});

export default OwnerDashboardSkeleton;

