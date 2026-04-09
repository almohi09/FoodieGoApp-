import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBox } from '../SkeletonLoader';
import { Spacing } from '../../theme';

export const RiderHomeSkeleton: React.FC = () => (
  <View style={styles.container}>
    <SkeletonBox style={styles.toggle} />
    <View style={styles.row}>
      <SkeletonBox style={styles.stat} />
      <SkeletonBox style={styles.stat} />
      <SkeletonBox style={styles.stat} />
    </View>
    <SkeletonBox style={styles.map} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  toggle: {
    height: 58,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  stat: {
    flex: 1,
    height: 84,
  },
  map: {
    height: 260,
  },
});

export default RiderHomeSkeleton;

