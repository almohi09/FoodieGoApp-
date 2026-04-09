import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, shadows, spacing, typography } from '../../theme';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { RestaurantItem } from '../../hooks/useRestaurants';

interface RestaurantCardProps {
  restaurant: RestaurantItem;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant }) => {
  const navigation = useNavigation<NavigationProp>();
  const [imageError, setImageError] = React.useState(false);

  const handlePress = () => {
    navigation.navigate('RestaurantDetail', { restaurantId: restaurant.id });
  };

  return (
    <TouchableOpacity activeOpacity={0.7} style={styles.card} onPress={handlePress}>
      <View style={styles.imageContainer}>
        <Image
          source={
            imageError
              ? require('../../assets/images/placeholder.png')
              : { uri: restaurant.imageUrl }
          }
          defaultSource={require('../../assets/images/placeholder.png')}
          style={styles.image}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
        <View style={styles.badgesRow}>
          <View
            style={[
              styles.vegBadge,
              { backgroundColor: restaurant.isPureVeg ? colors.veg : colors.nonVeg },
            ]}
          />
          {restaurant.hasOffer ? (
            <View style={styles.offerBadge}>
              <Text style={styles.offerText}>Offers</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.name}>
            {restaurant.name}
          </Text>
          <View style={styles.ratingBadge}>
            <Icon name="star" size={12} color={colors.textInverse} />
            <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
          </View>
        </View>
        <Text numberOfLines={1} style={styles.subtitle}>
          {restaurant.cuisineType} â€¢ {restaurant.areaName}
        </Text>
        <Text style={styles.meta}>
          {restaurant.deliveryTimeMin} mins â€¢ Min â‚¹{restaurant.minOrderAmount}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  imageContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  badgesRow: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  vegBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.textInverse,
  },
  offerBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 10,
  },
  offerText: {
    ...typography.smallMedium,
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    ...typography.bodySemibold,
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.veg,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  ratingText: {
    ...typography.smallMedium,
    color: colors.textInverse,
    marginLeft: 4,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  meta: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
});

export default RestaurantCard;


