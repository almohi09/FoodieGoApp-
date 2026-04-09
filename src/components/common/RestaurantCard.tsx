import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import {
  spacing,
  borderRadius,
  shadows,
  typography,
  responsiveSize,
} from '../../theme';
import { Restaurant } from '../../types';
import { DiscountBadge } from './Badge';

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = Math.min(160, (width - 48) * 0.45);

interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress: () => void;
  variant?: 'default' | 'compact' | 'featured';
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  onPress,
  variant = 'default',
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  if (variant === 'compact') {
    return (
      <TouchableOpacity activeOpacity={0.7}
        style={[styles.compactContainer, { backgroundColor: colors.surface }]}
        onPress={onPress}
       
      >
        <View
          style={[
            styles.compactImage,
            { backgroundColor: colors.surfaceSecondary },
          ]}
        >
          {restaurant.isFlashDeal && (
            <DiscountBadge discount={restaurant.flashDealDiscount!} size="sm" />
          )}
          <Icon name="restaurant" size={28} color={colors.primary} />
        </View>
        <View style={styles.compactContent}>
          <Text
            style={[styles.compactName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {restaurant.name}
          </Text>
          <Text
            style={[styles.compactCuisines, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {restaurant.cuisines.join(' • ')}
          </Text>
          <View style={styles.compactMeta}>
            <View
              style={[
                styles.ratingBadgeMini,
                { backgroundColor: colors.success },
              ]}
            >
              <Icon name="star" size={10} color={colors.textInverse} />
              <Text
                style={[styles.ratingTextWhite, { color: colors.textInverse }]}
              >
                {restaurant.rating}
              </Text>
            </View>
            <Text style={[styles.metaItem, { color: colors.textTertiary }]}>
              {restaurant.deliveryTime}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'featured') {
    return (
      <TouchableOpacity activeOpacity={0.7}
        style={[styles.featuredContainer, { backgroundColor: colors.surface }]}
        onPress={onPress}
       
      >
        <View
          style={[
            styles.featuredImage,
            { backgroundColor: colors.surfaceSecondary },
          ]}
        >
          {restaurant.isFlashDeal && (
            <DiscountBadge discount={restaurant.flashDealDiscount!} />
          )}
          <Icon name="pizza" size={40} color={colors.primary} />
          <View
            style={[
              styles.featuredOverlay,
              { backgroundColor: colors.overlay },
            ]}
          >
            <View
              style={[styles.vegDotSmall, { backgroundColor: colors.veg }]}
            />
          </View>
        </View>
        <View style={styles.featuredContent}>
          <Text
            style={[styles.featuredName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {restaurant.name}
          </Text>
          <Text
            style={[styles.featuredCuisines, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {restaurant.cuisines.join(', ')}
          </Text>
          <View style={styles.featuredMeta}>
            <View
              style={[
                styles.ratingBadgeMini,
                { backgroundColor: colors.success },
              ]}
            >
              <Icon name="star" size={10} color={colors.textInverse} />
              <Text
                style={[styles.ratingTextWhite, { color: colors.textInverse }]}
              >
                {restaurant.rating}
              </Text>
            </View>
            <Text style={[styles.metaDot, { color: colors.textTertiary }]}>
              •
            </Text>
            <Text style={[styles.metaItem, { color: colors.textSecondary }]}>
              {restaurant.deliveryTime}
            </Text>
            <Text style={[styles.metaDot, { color: colors.textTertiary }]}>
              •
            </Text>
            <Text style={[styles.metaItem, { color: colors.textSecondary }]}>
              {restaurant.deliveryFee === 0
                ? 'Free Delivery'
                : `₹${restaurant.deliveryFee}`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.7}
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={onPress}
     
    >
      <View style={[styles.imageWrapper, { height: IMAGE_HEIGHT }]}>
        {restaurant.image ? (
          <Image
            source={{ uri: restaurant.image }}
            style={[styles.image, { height: IMAGE_HEIGHT }]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.imagePlaceholder,
              {
                height: IMAGE_HEIGHT,
                backgroundColor: colors.surfaceSecondary,
              },
            ]}
          >
            <Icon name="restaurant" size={48} color={colors.primary} />
          </View>
        )}
        {restaurant.isFlashDeal && (
          <DiscountBadge discount={restaurant.flashDealDiscount!} />
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.nameContainer}>
            <View
              style={[styles.vegDot, { backgroundColor: colors.primary }]}
            />
            <Text
              style={[styles.name, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {restaurant.name}
            </Text>
          </View>
        </View>
        <Text
          style={[styles.cuisines, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {restaurant.cuisines.join(' • ')}
        </Text>
        <View style={styles.footer}>
          <View
            style={[
              styles.ratingBadge,
              { backgroundColor: colors.success + '20' },
            ]}
          >
            <Icon name="star" size={12} color={colors.success} />
            <Text style={[styles.rating, { color: colors.success }]}>
              {restaurant.rating}
            </Text>
            <Text style={[styles.reviewCount, { color: colors.textTertiary }]}>
              ({restaurant.reviewCount})
            </Text>
          </View>
          <Text style={[styles.metaDot, { color: colors.textTertiary }]}>
            •
          </Text>
          <Text style={[styles.metaItem, { color: colors.textSecondary }]}>
            {restaurant.deliveryTime}
          </Text>
          <Text style={[styles.metaDot, { color: colors.textTertiary }]}>
            •
          </Text>
          <Text style={[styles.metaItem, { color: colors.textSecondary }]}>
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
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
    overflow: 'hidden',
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  name: {
    ...typography.bodyMedium,
    flex: 1,
  },
  cuisines: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  ratingBadgeMini: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: borderRadius.xs,
    gap: 2,
  },
  ratingIcon: {
    fontSize: responsiveSize(12),
    fontWeight: '700',
  },
  rating: {
    ...typography.captionMedium,
    fontWeight: '700',
    marginLeft: 4,
  },
  ratingTextWhite: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 2,
  },
  reviewCount: {
    ...typography.small,
    marginLeft: 2,
  },
  metaDot: {
    ...typography.caption,
    marginHorizontal: spacing.xs,
  },
  metaItem: {
    ...typography.caption,
  },
  featuredContainer: {
    width: width * 0.68,
    borderRadius: borderRadius.lg,
    marginRight: spacing.lg,
    ...shadows.card,
    overflow: 'hidden',
  },
  featuredImage: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  featuredOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  vegDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  featuredContent: {
    padding: spacing.md,
  },
  featuredName: {
    ...typography.bodyMedium,
    marginBottom: 2,
  },
  featuredCuisines: {
    ...typography.small,
    marginBottom: spacing.sm,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  compactContainer: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...shadows.sm,
    alignItems: 'center',
  },
  compactImage: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  compactContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  compactName: {
    ...typography.captionMedium,
    marginBottom: 2,
  },
  compactCuisines: {
    ...typography.small,
    marginBottom: 4,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});


