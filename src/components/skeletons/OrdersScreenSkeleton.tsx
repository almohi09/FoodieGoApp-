import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBox, SkeletonText } from '../SkeletonLoader';
import { Spacing } from '../../theme';

export const OrdersScreenSkeleton: React.FC = () => (
  <View style={styles.container}>
    <View style={styles.card}>
      <SkeletonText style={styles.title} />
      <SkeletonText style={styles.line} />
      <SkeletonBox style={styles.footer} />
    </View>
    <View style={styles.card}>
      <SkeletonText style={styles.titleShort} />
      <SkeletonText style={styles.line} />
      <SkeletonBox style={styles.footer} />
    </View>
    <View style={styles.card}>
      <SkeletonText style={styles.title} />
      <SkeletonText style={styles.lineShort} />
      <SkeletonBox style={styles.footer} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  card: {
    gap: Spacing.sm,
  },
  title: {
    width: '70%',
  },
  titleShort: {
    width: '45%',
  },
  line: {
    width: '90%',
  },
  lineShort: {
    width: '60%',
  },
  footer: {
    height: 20,
    width: '40%',
  },
});

export default OrdersScreenSkeleton;

