import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import {
  colors,
  spacing,
  borderRadius,
  shadows,
  typography,
  responsiveSize,
} from '../../../theme';
import { Restaurant } from '../../../domain/types';

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = width < 360 ? 140 : width < 600 ? 160 : 180;

interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress: () => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: restaurant.image }}
          style={[styles.image, { height: IMAGE_HEIGHT }]}
          resizeMode="cover"
        />
        {restaurant.isFlashDeal && (
          <View style={styles.flashDealBadge}>
            <Text style={styles.flashDealText}>
              {restaurant.flashDealDiscount}% OFF
            </Text>
          </View>
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.nameContainer}>
            <View style={styles.nameBadge} />
            <Text style={styles.name} numberOfLines={1}>
              {restaurant.name}
            </Text>
          </View>
        </View>
        <Text style={styles.cuisines} numberOfLines={1}>
          {restaurant.cuisines.join(' • ')}
        </Text>
        <View style={styles.footer}>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingIcon}>★</Text>
            <Text style={styles.rating}>{restaurant.rating}</Text>
            <Text style={styles.reviewCount}>({restaurant.reviewCount})</Text>
          </View>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.deliveryTime}>{restaurant.deliveryTime}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.deliveryFee} numberOfLines={1}>
            {restaurant.deliveryFee === 0
              ? 'Free Delivery'
              : `₹${restaurant.deliveryFee}`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
    overflow: 'hidden',
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: '100%',
    backgroundColor: colors.surfaceSecondary,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nameBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  name: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  cuisines: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingIcon: {
    fontSize: responsiveSize(12),
    color: colors.success,
    marginRight: 2,
  },
  rating: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  reviewCount: {
    ...typography.small,
    color: colors.textTertiary,
    marginLeft: 2,
  },
  dot: {
    ...typography.caption,
    color: colors.textTertiary,
    marginHorizontal: spacing.sm,
  },
  deliveryTime: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  deliveryFee: {
    ...typography.caption,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  flashDealBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  flashDealText: {
    ...typography.small,
    fontWeight: '600',
    color: colors.textInverse,
  },
});
