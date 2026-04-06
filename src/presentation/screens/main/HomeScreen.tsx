import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../context/ThemeContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Loading } from '../../components/common';
import { useAppSelector } from '../../hooks/useRedux';
import { selectCartItemCount } from '../../../store/slices/cartSlice';
import { CUISINES } from '../../../domain/constants';
import { SearchQuickFilterId } from '../../../data/api/searchService';
import { useHomeSearch } from '../../hooks/useHomeSearch';
import { recommendationService } from '../../../data/api/recommendationService';
import { cacheService } from '../../../data/api/cacheService';
import { trackEvent } from '../../../monitoring/telemetry';
import { Restaurant } from '../../../domain/types';

type HomeNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MainTabs'
>;

const { width } = Dimensions.get('window');
const CATEGORY_SIZE = width < 360 ? 56 : 64;
const RESTAURANT_CARD_WIDTH = width * 0.72;
const RECENT_SEARCHES_KEY = 'home_recent_searches';
const MAX_RECENT_SEARCHES = 8;

export const HomeScreen: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { colors, isDark } = theme;
  const navigation = useNavigation<HomeNavigationProp>();
  const insets = useSafeAreaInsets();
  const cartItemCount = useAppSelector(selectCartItemCount);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeQuickFilters, setActiveQuickFilters] = useState<SearchQuickFilterId[]>([]);
  const [recommendedRestaurants, setRecommendedRestaurants] = useState<Restaurant[]>([]);
  const scrollY = useRef(new Animated.Value(0)).current;

  const popularSearches = ['Biryani', 'Pizza', 'Burger', 'Chinese', 'Desserts', 'Pasta'];

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const saved = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        if (!saved) {
          return;
        }

        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const safeItems = parsed.filter((item): item is string => typeof item === 'string');
          setRecentSearches(safeItems.slice(0, MAX_RECENT_SEARCHES));
        }
      } catch (error) {
        console.warn('Failed to load home recent searches', error);
      }
    };

    loadRecentSearches();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise<void>(resolve => setTimeout(resolve, 800));
    setRefreshing(false);
  };

  const persistRecentSearches = useCallback(async (items: string[]) => {
    try {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items));
    } catch (error) {
      console.warn('Failed to save home recent searches', error);
    }
  }, []);

  const addRecentSearch = useCallback((rawQuery: string) => {
    const normalized = rawQuery.trim();
    if (!normalized) {
      return;
    }

    setRecentSearches((previous) => {
      const next = [
        normalized,
        ...previous.filter((item) => item.toLowerCase() !== normalized.toLowerCase()),
      ].slice(0, MAX_RECENT_SEARCHES);
      persistRecentSearches(next);
      return next;
    });
  }, [persistRecentSearches]);

  const removeRecentSearch = useCallback((query: string) => {
    setRecentSearches((previous) => {
      const next = previous.filter((item) => item.toLowerCase() !== query.toLowerCase());
      persistRecentSearches(next);
      return next;
    });
  }, [persistRecentSearches]);

  const clearRecentSearches = useCallback(async () => {
    setRecentSearches([]);
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (error) {
      console.warn('Failed to clear home recent searches', error);
    }
  }, []);

  const {
    results: filteredRestaurants,
    isLoading: isSearchLoading,
    error: searchError,
  } = useHomeSearch({
    query: searchQuery,
    cuisine: selectedCuisine,
    activeQuickFilters,
  });

  const showSearchSuggestions = isSearchFocused && searchQuery.trim().length === 0;
  const isSearching = searchQuery.trim().length > 0;
  const featuredRestaurants =
    isSearching || recommendedRestaurants.length === 0
      ? filteredRestaurants.slice(0, 5)
      : recommendedRestaurants.slice(0, 5);

  useEffect(() => {
    const loadRecommendations = async () => {
      const personalized = await recommendationService.getPersonalizedRecommendations(10);
      if (personalized.success && personalized.recommendations) {
        const restaurants = personalized.recommendations
          .map(item => item.restaurant)
          .filter((item): item is NonNullable<typeof item> => Boolean(item));
        setRecommendedRestaurants(restaurants);
        return;
      }

      const cached = await cacheService.getCachedRestaurants();
      if (cached) {
        setRecommendedRestaurants(cached);
      } else {
        const trending = await recommendationService.getTrendingRestaurants(10);
        if (trending.success && trending.restaurants) {
          setRecommendedRestaurants(trending.restaurants);
        }
      }
    };

    loadRecommendations();
  }, []);

  useEffect(() => {
    if (filteredRestaurants.length > 0) {
      cacheService.cacheRestaurants(filteredRestaurants);
    }
  }, [filteredRestaurants]);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  const hideSearchOverlay = () => {
    Keyboard.dismiss();
    setIsSearchFocused(false);
  };

  const applySearch = (query: string) => {
    setSearchQuery(query);
    setSelectedCuisine(null);
    addRecentSearch(query);
    trackEvent('search', { query });
    hideSearchOverlay();
  };

  const toggleQuickFilter = (id: SearchQuickFilterId) => {
    setActiveQuickFilters((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const renderHeader = () => (
    <Animated.View
      style={[
        styles.header,
        { backgroundColor: colors.surface, opacity: headerOpacity },
      ]}
    >
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.locationButton} activeOpacity={0.7}>
          <View
            style={[
              styles.locationIconContainer,
              { backgroundColor: colors.primary + '20' },
            ]}
          >
            <Text style={styles.locationIcon}>📍</Text>
          </View>
          <View style={styles.locationTextContainer}>
            <Text
              style={[styles.locationLabel, { color: colors.textTertiary }]}
            >
              Deliver to
            </Text>
            <View style={styles.addressRow}>
              <Text
                style={[styles.address, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                Home - Sector 62, Noida
              </Text>
              <Text
                style={[styles.dropdownIcon, { color: colors.textSecondary }]}
              >
                ▼
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[
              styles.themeToggle,
              { backgroundColor: colors.surfaceSecondary },
            ]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Text style={styles.themeIcon}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.cartButton,
              { backgroundColor: colors.primary + '15' },
            ]}
            onPress={() => navigation.navigate('Cart')}
            activeOpacity={0.8}
          >
            <Text style={styles.cartIcon}>🛒</Text>
            {cartItemCount > 0 && (
              <View
                style={[styles.cartBadge, { backgroundColor: colors.primary }]}
              >
                <Text
                  style={[styles.cartBadgeText, { color: colors.textInverse }]}
                >
                  {cartItemCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: colors.surfaceSecondary },
        ]}
      >
        <Text style={styles.searchIcon}>{'\u{1F50D}'}</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search dishes, restaurants, cuisines"
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onFocus={() => setIsSearchFocused(true)}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => applySearch(searchQuery)}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={[styles.clearIcon, { color: colors.textTertiary }]}>
              {'\u2715'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );

  const renderSearchSuggestions = () => (
    <View style={[styles.searchSuggestions, { backgroundColor: colors.background }]}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Searches</Text>
        {recentSearches.length > 0 && (
          <TouchableOpacity onPress={clearRecentSearches}>
            <Text style={[styles.clearAllText, { color: colors.primary }]}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      {recentSearches.length > 0 ? (
        <View style={styles.recentChipsWrap}>
          {recentSearches.map((item) => (
            <View key={item} style={[styles.recentChip, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <TouchableOpacity style={styles.recentChipMain} onPress={() => applySearch(item)}>
                <Text style={[styles.recentChipText, { color: colors.textPrimary }]}>{item}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.removeChipButton, { borderLeftColor: colors.border }]}
                onPress={() => removeRecentSearch(item)}
              >
                <Text style={[styles.removeChipText, { color: colors.textTertiary }]}>{'\u2715'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.emptyRecentText, { color: colors.textTertiary }]}>
          No recent searches yet
        </Text>
      )}

      <Text style={[styles.popularTitle, { color: colors.textSecondary }]}>Popular</Text>
      <View style={styles.popularWrap}>
        {popularSearches.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.popularChip, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => applySearch(item)}
          >
            <Text style={[styles.popularChipText, { color: colors.textPrimary }]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderBanner = () => (
    <View style={styles.bannerContainer}>
      <TouchableOpacity
        style={[styles.banner, { backgroundColor: colors.primary }]}
        activeOpacity={0.95}
      >
        <View style={styles.bannerContent}>
          <View
            style={[styles.bannerBadge, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.bannerBadgeText, { color: colors.primary }]}>
              OFFER
            </Text>
          </View>
          <Text style={[styles.bannerTitle, { color: colors.textInverse }]}>
            Get 50% Off
          </Text>
          <Text style={[styles.bannerSubtitle, { color: colors.textInverse }]}>
            On your first order • Use code FOODIEGO50
          </Text>
        </View>
        <View
          style={[
            styles.bannerImageContainer,
            { backgroundColor: colors.surface + '25' },
          ]}
        >
          <Text style={styles.bannerEmoji}>🍔</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderCategories = () => (
    <View
      style={[styles.categoriesSection, { backgroundColor: colors.surface }]}
    >
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          What's on your mind?
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
      >
        {CUISINES.slice(0, 8).map(cuisine => {
          const isActive = selectedCuisine === cuisine.name;
          return (
            <TouchableOpacity
              key={cuisine.id}
              style={styles.categoryCard}
              onPress={() => setSelectedCuisine(isActive ? null : cuisine.name)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.categoryIconContainer,
                  {
                    width: CATEGORY_SIZE,
                    height: CATEGORY_SIZE,
                    borderRadius: CATEGORY_SIZE / 2,
                    backgroundColor: isActive
                      ? colors.primary
                      : colors.surfaceSecondary,
                  },
                ]}
              >
                <Text style={styles.categoryIcon}>
                  {getCuisineEmoji(cuisine.name)}
                </Text>
              </View>
              <Text
                style={[
                  styles.categoryName,
                  { color: isActive ? colors.primary : colors.textSecondary },
                  isActive && styles.categoryNameActive,
                ]}
                numberOfLines={1}
              >
                {cuisine.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderQuickFilters = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filtersContainer}
    >
      {quickFilters.map((filter) => (
        <TouchableOpacity
          key={filter.id}
          style={[
            styles.filterChip,
            {
              borderColor: activeQuickFilters.includes(filter.id)
                ? colors.primary
                : colors.border,
              backgroundColor: activeQuickFilters.includes(filter.id)
                ? colors.primary + '22'
                : colors.surface,
            },
          ]}
          onPress={() => toggleQuickFilter(filter.id)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterIcon]}>{filter.icon}</Text>
          <Text
            style={[
              styles.filterText,
              {
                color: activeQuickFilters.includes(filter.id)
                  ? colors.primary
                  : colors.textSecondary,
              },
            ]}
          >
            {filter.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderFeaturedRestaurants = () => (
    <View style={styles.featuredSection}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Featured Restaurants
        </Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>
            See All →
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={featuredRestaurants}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.featuredList}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[styles.featuredCard, { backgroundColor: colors.surface }]}
            activeOpacity={0.9}
            testID={`home-featured-restaurant-${index}`}
            onPress={() =>
              {
                trackEvent('restaurant_view', { restaurantId: item.id, source: 'featured' });
                navigation.navigate('RestaurantDetail', { restaurantId: item.id });
              }
            }
          >
            <View
              style={[
                styles.featuredImageContainer,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              {item.isFlashDeal && (
                <View
                  style={[
                    styles.flashDealBadge,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.flashDealText}>
                    {item.flashDealDiscount}% OFF
                  </Text>
                </View>
              )}
              <Text style={styles.featuredImageEmoji}>🍽️</Text>
            </View>
            <View style={styles.featuredContent}>
              <View style={styles.featuredNameRow}>
                <View
                  style={[styles.vegDot, { backgroundColor: colors.veg }]}
                />
                <Text
                  style={[styles.featuredName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
              </View>
              <Text
                style={[
                  styles.featuredCuisines,
                  { color: colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {item.cuisines.join(', ')}
              </Text>
              <View style={styles.featuredMeta}>
                <View
                  style={[
                    styles.ratingBadge,
                    { backgroundColor: colors.success },
                  ]}
                >
                  <Text style={styles.ratingIconWhite}>★</Text>
                  <Text
                    style={[styles.ratingText, { color: colors.textInverse }]}
                  >
                    {item.rating}
                  </Text>
                </View>
                <Text
                  style={[styles.metaText, { color: colors.textSecondary }]}
                >
                  {item.deliveryTime} • ₹
                  {item.deliveryFee === 0 ? 'Free' : item.deliveryFee}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderRestaurants = () => (
    <View
      style={[
        styles.restaurantsSection,
        { backgroundColor: colors.background },
      ]}
    >
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {searchQuery.trim()
            ? `Results for "${searchQuery.trim()}"`
            : selectedCuisine
              ? `${selectedCuisine} Restaurants`
              : 'All Restaurants'}
        </Text>
        {isSearchLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={[styles.restaurantCount, { color: colors.textTertiary }]}>
            {filteredRestaurants.length} places
          </Text>
        )}
      </View>
      {searchError && (
        <Text style={[styles.searchErrorText, { color: colors.error }]}>
          {searchError}
        </Text>
      )}
      {filteredRestaurants.length === 0 && (
        <View style={styles.emptySearchState}>
          <Text style={[styles.emptySearchTitle, { color: colors.textPrimary }]}>
            No matches found
          </Text>
          <Text style={[styles.emptySearchSubtitle, { color: colors.textSecondary }]}>
            Try searching another dish, cuisine, or restaurant.
          </Text>
        </View>
      )}
      {filteredRestaurants.map(restaurant => (
        <TouchableOpacity
          key={restaurant.id}
          style={[styles.restaurantCard, { backgroundColor: colors.surface }]}
          activeOpacity={0.9}
          testID={`home-restaurant-card-${restaurant.id}`}
          onPress={() =>
            {
              trackEvent('restaurant_view', { restaurantId: restaurant.id, source: 'listing' });
              navigation.navigate('RestaurantDetail', {
                restaurantId: restaurant.id,
              });
            }
          }
        >
          <View
            style={[
              styles.restaurantImageContainer,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            {restaurant.isFlashDeal && (
              <View
                style={[
                  styles.cardFlashDeal,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.cardFlashDealText}>
                  {restaurant.flashDealDiscount}% OFF
                </Text>
              </View>
            )}
            <Text style={styles.restaurantEmoji}>🍴</Text>
          </View>
          <View style={styles.restaurantContent}>
            <View style={styles.restaurantHeader}>
              <View style={styles.restaurantNameRow}>
                <View
                  style={[styles.vegDot, { backgroundColor: colors.veg }]}
                />
                <Text
                  style={[styles.restaurantName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {restaurant.name}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.restaurantCuisines,
                { color: colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {restaurant.cuisines.join(' • ')}
            </Text>
            <View style={styles.restaurantMeta}>
              <View
                style={[
                  styles.ratingBox,
                  { backgroundColor: colors.success + '20' },
                ]}
              >
                <Text style={[styles.ratingBoxText, { color: colors.success }]}>
                  ★ {restaurant.rating}
                </Text>
                <Text
                  style={[styles.reviewCount, { color: colors.textSecondary }]}
                >
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
      ))}
    </View>
  );

  if (loading) {
    return <Loading fullScreen message="Finding best restaurants..." />;
  }

  return (
    <Pressable
      testID="home-screen-root"
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
      onPress={hideSearchOverlay}
    >
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        onScrollBeginDrag={hideSearchOverlay}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {renderHeader()}
        {showSearchSuggestions && renderSearchSuggestions()}
        {!isSearching && renderBanner()}
        {!isSearching && renderCategories()}
        {!isSearching && renderQuickFilters()}
        {!isSearching && renderFeaturedRestaurants()}
        {renderRestaurants()}
        <View style={{ height: spacing.xxl * 2 }} />
      </Animated.ScrollView>
    </Pressable>
  );
};

const spacing = {
  lg: 16,
  xl: 20,
  xxl: 24,
};

const quickFilters: Array<{ id: SearchQuickFilterId; name: string; icon: string }> = [
  { id: 'sort_rating', name: 'Top Rated', icon: '⭐' },
  { id: 'fast', name: 'Fast Delivery', icon: '⚡' },
  { id: 'rating4', name: 'Rating 4+', icon: '🏅' },
  { id: 'offers', name: 'Offers', icon: '🏷️' },
  { id: 'budget', name: 'Under ₹200', icon: '💸' },
];

const getCuisineEmoji = (name: string): string => {
  const emojis: Record<string, string> = {
    Pizza: '🍕',
    Biryani: '🍚',
    Burger: '🍔',
    Chinese: '🥡',
    'South Indian': '🥘',
    Desserts: '🍰',
    Pasta: '🍝',
    Salad: '🥗',
    Sushi: '🍣',
    'Street Food': '🍢',
  };
  return emojis[name] || '🍽️';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  locationIcon: {
    fontSize: 18,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  address: {
    fontSize: 15,
    fontWeight: '600',
    maxWidth: width * 0.42,
  },
  dropdownIcon: {
    fontSize: 10,
    marginLeft: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeIcon: {
    fontSize: 18,
  },
  cartButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cartIcon: {
    fontSize: 20,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  cartBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  clearIcon: {
    fontSize: 14,
    padding: 4,
  },
  searchSuggestions: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  recentChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  recentChipMain: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  recentChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  removeChipButton: {
    borderLeftWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  removeChipText: {
    fontSize: 12,
  },
  emptyRecentText: {
    fontSize: 13,
    marginBottom: 12,
  },
  popularTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  popularWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularChip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  popularChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bannerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  banner: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  bannerContent: {
    flex: 1,
  },
  bannerBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  bannerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    opacity: 0.9,
  },
  bannerImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  bannerEmoji: {
    fontSize: 40,
  },
  categoriesSection: {
    paddingVertical: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '500',
  },
  categoriesList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  categoryCard: {
    alignItems: 'center',
    paddingHorizontal: 8,
    minWidth: 72,
  },
  categoryIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryIcon: {
    fontSize: 28,
  },
  categoryName: {
    fontSize: 12,
    textAlign: 'center',
  },
  categoryNameActive: {
    fontWeight: '600',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 4,
  },
  filterIcon: {
    fontSize: 14,
  },
  filterText: {
    fontSize: 13,
  },
  featuredSection: {
    marginTop: 8,
  },
  featuredList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  featuredCard: {
    width: RESTAURANT_CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredImageContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  flashDealBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  flashDealText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  featuredImageEmoji: {
    fontSize: 50,
  },
  featuredContent: {
    padding: 12,
  },
  featuredNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  featuredName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  featuredCuisines: {
    fontSize: 12,
    marginBottom: 8,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    gap: 2,
  },
  ratingIconWhite: {
    fontSize: 10,
    color: '#FFF',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaText: {
    fontSize: 12,
  },
  restaurantsSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  emptySearchState: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 16,
    marginBottom: 12,
  },
  emptySearchTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySearchSubtitle: {
    fontSize: 13,
  },
  restaurantCount: {
    fontSize: 13,
  },
  searchErrorText: {
    fontSize: 12,
    marginBottom: 8,
  },
  restaurantCard: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  restaurantImageContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cardFlashDeal: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    zIndex: 1,
  },
  cardFlashDealText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFF',
  },
  restaurantEmoji: {
    fontSize: 40,
  },
  restaurantContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  restaurantHeader: {
    marginBottom: 2,
  },
  restaurantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  restaurantCuisines: {
    fontSize: 12,
    marginBottom: 6,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    gap: 2,
  },
  ratingBoxText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reviewCount: {
    fontSize: 11,
  },
  metaDot: {
    fontSize: 12,
  },
  metaItem: {
    fontSize: 12,
  },
});

