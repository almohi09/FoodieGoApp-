import React, { useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { useMenu } from '../../../hooks/useMenu';
import { useRestaurants } from '../../../hooks/useRestaurants';
import { useCartStore } from '../../../store/cartStore';
import { EmptyState } from '../../../components/EmptyState';
import { InlineErrorCard } from '../../../components/InlineErrorCard';
import { RestaurantDetailSkeleton } from '../../../components/skeletons';
import { Colors } from '../../../theme';
import styles from './styles';

type DetailRoute = RouteProp<RootStackParamList, 'RestaurantDetail'>;

export const RestaurantDetailScreen: React.FC = () => {
  const route = useRoute<DetailRoute>();
  const { restaurantId } = route.params;
  const { restaurants } = useRestaurants();
  const { groupedMenu, loading, error, refetch } = useMenu(restaurantId);

  const [menuSearch, setMenuSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const scrollY = useState(new Animated.Value(0))[0];
  const addScale = useState(new Animated.Value(1))[0];
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const cartItems = useCartStore(state => state.items);
  const cartRestaurantId = useCartStore(state => state.restaurantId);
  const cartRestaurantName = useCartStore(state => state.restaurantName);
  const addItem = useCartStore(state => state.addItem);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const clearCart = useCartStore(state => state.clearCart);

  const restaurant = useMemo(
    () => restaurants.find(item => item.id === restaurantId) || null,
    [restaurantId, restaurants],
  );

  const filteredGroups = useMemo(() => {
    const normalized = menuSearch.trim().toLowerCase();
    const bySearch = groupedMenu
      .map(group => ({
        ...group,
        items: group.items.filter(item => {
          if (!normalized) {
            return true;
          }
          return (
            item.name.toLowerCase().includes(normalized) ||
            (item.description || '').toLowerCase().includes(normalized)
          );
        }),
      }))
      .filter(group => group.items.length > 0);

    if (!activeCategory) {
      return bySearch;
    }

    return bySearch.filter(group => group.category.name === activeCategory);
  }, [activeCategory, groupedMenu, menuSearch]);

  React.useEffect(() => {
    const timer = setTimeout(() => setMinDelayDone(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [240, 120],
    extrapolate: 'clamp',
  });
  const headerOverlayOpacity = scrollY.interpolate({
    inputRange: [0, 120, 180],
    outputRange: [1, 0.45, 0],
    extrapolate: 'clamp',
  });
  const compactInfoOpacity = scrollY.interpolate({
    inputRange: [70, 170],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const getQuantity = (itemId: string) => {
    const item = cartItems.find(cartItem => cartItem.id === itemId);
    return item?.quantity || 0;
  };

  const handleAddItem = (itemId: string) => {
    if (!restaurant) {
      return;
    }

    const menuItem = groupedMenu.flatMap(group => group.items).find(i => i.id === itemId);
    if (!menuItem) {
      return;
    }
    if (
      cartRestaurantId &&
      cartRestaurantId !== restaurant.id &&
      cartItems.length > 0
    ) {
      Alert.alert(
        'Replace cart items?',
        `Your cart has items from ${cartRestaurantName}. Do you want to clear it and start fresh?`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: () => {
              clearCart();
              addItem(menuItem, restaurant.id, restaurant.name);
            },
          },
        ],
      );
      return;
    }
    addScale.setValue(0.92);
    Animated.spring(addScale, {
      toValue: 1,
      damping: 12,
      stiffness: 180,
      useNativeDriver: true,
    }).start();
    addItem(menuItem, restaurant.id, restaurant.name);
  };

  const categories = groupedMenu.map(group => group.category.name);

  React.useEffect(() => {
    if (!activeCategory && categories.length > 0) {
      setActiveCategory(categories[0]);
    }
  }, [activeCategory, categories]);

  const hasVariants = (item: { variants?: unknown[] }) =>
    Array.isArray(item.variants) && item.variants.length > 0;

  if (!restaurant) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateTitle}>Restaurant not found</Text>
      </View>
    );
  }

  if (loading && !minDelayDone) {
    return <RestaurantDetailSkeleton />;
  }

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        stickyHeaderIndices={[2]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
      >
        <Animated.View style={[styles.headerImageContainer, { height: headerHeight }]}>
          <Image
            source={
              imageErrors.header
                ? require('../../../assets/images/placeholder.png')
                : { uri: restaurant.imageUrl }
            }
            defaultSource={require('../../../assets/images/placeholder.png')}
            style={styles.headerImage}
            resizeMode="cover"
            onError={() =>
              setImageErrors(prev => ({
                ...prev,
                header: true,
              }))
            }
          />
          <Animated.View style={[styles.headerOverlay, { opacity: headerOverlayOpacity }]}>
            <Text style={styles.headerName}>{restaurant.name}</Text>
            <Text style={styles.headerMeta}>
              {restaurant.cuisineType} • {restaurant.deliveryTimeMin} mins
            </Text>
          </Animated.View>
          <Animated.View style={[styles.compactInfoPill, { opacity: compactInfoOpacity }]}>
            <Text style={styles.compactInfoName} numberOfLines={1}>
              {restaurant.name}
            </Text>
            <Text style={styles.compactInfoMeta} numberOfLines={1}>
              {restaurant.cuisineType} â€¢ {restaurant.deliveryTimeMin} mins
            </Text>
          </Animated.View>
        </Animated.View>

        <View style={styles.searchContainer}>
          <Icon name="search" size={16} color={Colors.TEXT_TERTIARY} />
          <TextInput
            value={menuSearch}
            onChangeText={setMenuSearch}
            placeholder="Search menu items"
            placeholderTextColor={Colors.TEXT_TERTIARY}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map(category => {
              const active = category === activeCategory || (!activeCategory && category === categories[0]);
              return (
                <TouchableOpacity activeOpacity={0.7}
                  key={category}
                  style={[styles.tabChip, active ? styles.tabChipActive : null]}
                  onPress={() => setActiveCategory(category)}
                >
                  <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.menuContainer}>
          {error ? <InlineErrorCard message={error} onRetry={() => void refetch()} /> : null}
          {!loading && !error && filteredGroups.length === 0 ? (
            <EmptyState
              illustration="no-results"
              title="No matching menu items"
              subtitle="Try a different search keyword."
            />
          ) : null}

          {filteredGroups.map(group => (
            <View key={group.category.id} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{group.category.name}</Text>

              {group.items.map(item => {
                const quantity = getQuantity(item.id);
                return (
                  <View key={item.id} style={styles.menuItemCard}>
                    <View style={styles.menuItemInfo}>
                      <View
                        style={[styles.vegDot, { backgroundColor: item.isVeg ? Colors.VEG : Colors.NON_VEG }]}
                      />
                      <Text style={styles.menuItemName}>{item.name}</Text>
                      {hasVariants(item as unknown as { variants?: unknown[] }) ? (
                        <Text style={styles.customizeLabel}>Customize</Text>
                      ) : null}
                      <Text numberOfLines={2} style={styles.menuItemDescription}>
                        {item.description || 'No description'}
                      </Text>
                      <Text style={styles.menuItemPrice}>₹{item.price}</Text>
                    </View>

                    <View style={styles.menuItemActions}>
                      {item.imageUrl ? (
                        <Image
                          source={
                            imageErrors[item.id]
                              ? require('../../../assets/images/placeholder.png')
                              : { uri: item.imageUrl }
                          }
                          defaultSource={require('../../../assets/images/placeholder.png')}
                          style={styles.menuItemImage}
                          resizeMode="cover"
                          onError={() =>
                            setImageErrors(prev => ({
                              ...prev,
                              [item.id]: true,
                            }))
                          }
                        />
                      ) : (
                        <View style={styles.menuItemPlaceholder}>
                          <Icon name="image-outline" size={20} color={Colors.TEXT_TERTIARY} />
                        </View>
                      )}
                      {quantity === 0 ? (
                        <Animated.View style={{ transform: [{ scale: addScale }] }}>
                          <TouchableOpacity activeOpacity={0.7}
                            style={styles.addButton}
                            onPress={() => handleAddItem(item.id)}
                          >
                            <Text style={styles.addButtonText}>ADD</Text>
                          </TouchableOpacity>
                        </Animated.View>
                      ) : (
                        <View style={styles.quantityContainer}>
                          <TouchableOpacity activeOpacity={0.7}
                            style={styles.quantityAction}
                            onPress={() => updateQuantity(item.id, quantity - 1)}
                          >
                            <Text style={styles.quantityActionText}>-</Text>
                          </TouchableOpacity>
                          <Text style={styles.quantityText}>{quantity}</Text>
                          <TouchableOpacity activeOpacity={0.7}
                            style={styles.quantityAction}
                            onPress={() => updateQuantity(item.id, quantity + 1)}
                          >
                            <Text style={styles.quantityActionText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </Animated.ScrollView>
    </View>
  );
};

export default RestaurantDetailScreen;
