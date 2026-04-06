import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Loading, MenuItemCard } from '../../components/common';
import { restaurantService } from '../../../data/api/restaurantService';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import {
  addToCart,
  updateQuantity,
  selectCartItems,
} from '../../../store/slices/cartSlice';
import { MenuItem, Restaurant } from '../../../domain/types';

type RestaurantDetailNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'RestaurantDetail'
>;
type RestaurantDetailRouteProp = RouteProp<
  RootStackParamList,
  'RestaurantDetail'
>;

export const RestaurantDetailScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<RestaurantDetailNavigationProp>();
  const route = useRoute<RestaurantDetailRouteProp>();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector(selectCartItems);
  const { restaurantId } = route.params;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showCartBar, setShowCartBar] = useState(false);

  useEffect(() => {
    const loadRestaurantAndMenu = async () => {
      setLoading(true);

      const [restaurantResult, menuResult] = await Promise.all([
        restaurantService.getRestaurantById(restaurantId),
        restaurantService.getMenu(restaurantId),
      ]);

      if (restaurantResult.success && restaurantResult.restaurant) {
        setRestaurant(restaurantResult.restaurant);
      }

      if (menuResult.success && menuResult.menu) {
        setMenuItems(menuResult.menu);
        const categories = [...new Set(menuResult.menu.map(item => item.category))];
        setActiveCategory(categories[0] || null);
      }

      setLoading(false);
    };

    loadRestaurantAndMenu();
  }, [restaurantId]);

  useEffect(() => {
    setShowCartBar(cartItems.length > 0);
  }, [cartItems]);

  const categories = [...new Set(menuItems.map(item => item.category))];

  const getItemQuantity = (itemId: string): number => {
    const cartItem = cartItems.find(ci => ci.item.id === itemId);
    return cartItem?.quantity || 0;
  };

  const handleAddToCart = (item: MenuItem) => {
    if (restaurant) {
      dispatch(
        addToCart({
          item,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          quantity: 1,
          customizations: [],
        }),
      );
    }
  };

  const handleRemoveFromCart = (itemId: string) => {
    const quantity = getItemQuantity(itemId);
    if (quantity > 0) {
      dispatch(updateQuantity({ itemId, quantity: quantity - 1 }));
    }
  };

  const filteredItems = activeCategory
    ? menuItems.filter(item => item.category === activeCategory)
    : menuItems;

  const getCartTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const getCartItemCount = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  if (loading || !restaurant) {
    return <Loading fullScreen />;
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      testID="restaurant-detail-screen"
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image source={{ uri: restaurant.image }} style={styles.coverImage} />
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surface }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: colors.surface }]}
            onPress={() => {}}
          >
            <Text style={styles.shareIcon}>↗</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
          <View style={styles.nameRow}>
            <View style={[styles.vegDot, { backgroundColor: colors.veg }]} />
            <Text
              style={[styles.restaurantName, { color: colors.textPrimary }]}
            >
              {restaurant.name}
            </Text>
          </View>
          <Text style={styles.cuisines}>{restaurant.cuisines.join(' • ')}</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingIcon}>⭐</Text>
                <Text
                  style={[styles.ratingValue, { color: colors.textInverse }]}
                >
                  {restaurant.rating}
                </Text>
              </View>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {restaurant.reviewCount} reviews
              </Text>
            </View>
            <View
              style={[styles.statDivider, { backgroundColor: colors.border }]}
            />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {restaurant.deliveryTime}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Delivery
              </Text>
            </View>
            <View
              style={[styles.statDivider, { backgroundColor: colors.border }]}
            />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {restaurant.deliveryFee === 0
                  ? 'Free'
                  : `₹${restaurant.deliveryFee}`}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Delivery
              </Text>
            </View>
          </View>

          {restaurant.isFlashDeal && (
            <View
              style={[
                styles.offerBanner,
                { backgroundColor: colors.successLight },
              ]}
            >
              <Text style={styles.offerIcon}>🏷️</Text>
              <Text style={[styles.offerText, { color: colors.success }]}>
                {restaurant.flashDealDiscount}% off | Use code FOODIE
                {randomCode(50)}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.menuSection, { backgroundColor: colors.surface }]}>
          <View style={styles.menuHeader}>
            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
              Menu
            </Text>
            <TouchableOpacity style={styles.searchButton}>
              <Text style={styles.searchIcon}>🔍</Text>
              <Text
                style={[styles.searchText, { color: colors.textSecondary }]}
              >
                Search
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
          >
            {categories.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryPill,
                  { backgroundColor: colors.surfaceSecondary },
                  activeCategory === category && {
                    backgroundColor: colors.primary,
                  },
                ]}
                onPress={() => setActiveCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: colors.textSecondary },
                    activeCategory === category && {
                      color: colors.textInverse,
                    },
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.menuItems}>
            {filteredItems.map(item => (
              <MenuItemCard
                key={item.id}
                id={item.id}
                name={item.name}
                description={item.description}
                price={item.price}
                image={item.image}
                isVeg={item.isVeg}
                isAvailable={item.isAvailable}
                popular={item.popular}
                quantity={getItemQuantity(item.id)}
                onAdd={() => handleAddToCart(item)}
                onRemove={() => handleRemoveFromCart(item.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {showCartBar && (
        <View
          style={[
            styles.cartBar,
            {
              backgroundColor: colors.textPrimary,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.cartInfo}
            onPress={() => navigation.navigate('Cart')}
          >
            <View style={styles.cartIconContainer}>
              <Text style={styles.cartEmoji}>🛒</Text>
              <View
                style={[styles.cartBadge, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.cartBadgeText}>{getCartItemCount()}</Text>
              </View>
            </View>
            <View>
              <Text style={styles.cartTotal}>₹{getCartTotal()}</Text>
              <Text style={styles.cartSubtotal}>extra charges may apply</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewCartButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Cart')}
            testID="restaurant-view-cart-button"
          >
            <Text style={styles.viewCartText}>View Cart</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const randomCode = (max: number) => Math.floor(Math.random() * max) + 1;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#EADCCD',
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backIcon: {
    fontSize: 20,
    color: '#000',
  },
  shareButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareIcon: {
    fontSize: 18,
    color: '#000',
  },
  infoSection: {
    padding: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  vegDot: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 10,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  cuisines: {
    fontSize: 14,
    color: '#6E5B51',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EADCCD',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4FA56D',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  ratingIcon: {
    fontSize: 12,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  offerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  offerIcon: {
    fontSize: 16,
  },
  offerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  menuSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7EFE5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchText: {
    fontSize: 13,
  },
  categoryList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  categoryPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  menuItems: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingHorizontal: 16,
  },
  cartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartIconContainer: {
    position: 'relative',
  },
  cartEmoji: {
    fontSize: 28,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  cartTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  cartSubtotal: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  viewCartButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  viewCartText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});


