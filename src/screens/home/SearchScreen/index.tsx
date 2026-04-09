import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Keyboard,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../context/ThemeContext';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { Loading } from '../../../components/common';
import { Restaurant } from '../../../types';
import { restaurantService } from '../../../api/restaurantService';
import { SearchQuickFilterId } from '../../../api/searchService';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../../theme';

type SearchNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MainTabs'
>;

const RECENT_SEARCHES_KEY = 'search_recent_searches';
const MAX_RECENT_SEARCHES = 10;

interface SearchFilters {
  query: string;
  cuisine: string | null;
  activeQuickFilters: SearchQuickFilterId[];
}

const quickFilters: Array<{
  id: SearchQuickFilterId;
  name: string;
  icon: string;
}> = [
  { id: 'sort_rating', name: 'Top Rated', icon: '⭐' },
  { id: 'fast', name: 'Fast Delivery', icon: '⚡' },
  { id: 'rating4', name: 'Rating 4+', icon: '🏅' },
  { id: 'offers', name: 'Offers', icon: '🏷️' },
  { id: 'budget', name: 'Under ₹200', icon: '💸' },
];

export const SearchScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<SearchNavigationProp>();
  const insets = useSafeAreaInsets();

  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    cuisine: null,
    activeQuickFilters: [],
  });
  const [results, setResults] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [erroredImages, setErroredImages] = useState<Record<string, boolean>>({});

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      performSearch();
    }, 300);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const loadRecentSearches = async () => {
    try {
      const saved = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const safeItems = parsed.filter(
            (item): item is string => typeof item === 'string',
          );
          setRecentSearches(safeItems.slice(0, MAX_RECENT_SEARCHES));
        }
      }
    } catch (error) {
      console.warn('Failed to load recent searches', error);
    }
  };

  const performSearch = async () => {
    const query = searchText.trim();

    if (!query && !filters.cuisine && filters.activeQuickFilters.length === 0) {
      setResults([]);
      setIsInitialLoad(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await restaurantService.searchRestaurants({
        query,
        cuisine: filters.cuisine || undefined,
      });

      if (result.success && result.restaurants) {
        let filtered = result.restaurants;

        if (filters.activeQuickFilters.includes('fast')) {
          filtered = filtered.filter(r => {
            const mins = parseInt(r.deliveryTime.split('-')[0], 10);
            return mins <= 30;
          });
        }

        if (filters.activeQuickFilters.includes('rating4')) {
          filtered = filtered.filter(r => r.rating >= 4.0);
        }

        if (filters.activeQuickFilters.includes('offers')) {
          filtered = filtered.filter(r => r.isFlashDeal);
        }

        if (filters.activeQuickFilters.includes('budget')) {
          filtered = filtered.filter(r => (r.minimumOrder || 0) <= 200);
        }

        if (filters.activeQuickFilters.includes('sort_rating')) {
          filtered.sort((a, b) => b.rating - a.rating);
        }

        setResults(filtered);
      } else {
        setResults([]);
        setError(result.error || 'Search failed');
      }
    } catch (err) {
      setError('Unable to search. Please try again.');
      console.warn('Search error:', err);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  const addRecentSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const updated = [
      trimmed,
      ...recentSearches.filter(s => s.toLowerCase() !== trimmed.toLowerCase()),
    ].slice(0, MAX_RECENT_SEARCHES);

    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save recent search', error);
    }
  };

  const handleSearchSubmit = () => {
    const query = searchText.trim();
    if (query) {
      addRecentSearch(query);
    }
    Keyboard.dismiss();
  };

  const removeRecentSearch = async (query: string) => {
    const updated = recentSearches.filter(
      s => s.toLowerCase() !== query.toLowerCase(),
    );
    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to remove recent search', error);
    }
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (error) {
      console.warn('Failed to clear recent searches', error);
    }
  };

  const toggleQuickFilter = (id: SearchQuickFilterId) => {
    setFilters(prev => ({
      ...prev,
      activeQuickFilters: prev.activeQuickFilters.includes(id)
        ? prev.activeQuickFilters.filter(f => f !== id)
        : [...prev.activeQuickFilters, id],
    }));
  };

  const handleRestaurantPress = (restaurant: Restaurant) => {
    addRecentSearch(searchText);
    navigation.navigate('RestaurantDetail', { restaurantId: restaurant.id });
  };

  const renderSearchHeader = () => (
    <View
      style={[
        styles.header,
        { backgroundColor: colors.surface, paddingTop: insets.top + 8 },
      ]}
    >
      <View
        style={[styles.searchBar, { backgroundColor: colors.surfaceSecondary }]}
      >
        <Text style={styles.searchIcon}>{'\u{1F50D}'}</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search restaurants, dishes, cuisines"
          placeholderTextColor={colors.textTertiary}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchText.length > 0 && (
          <TouchableOpacity activeOpacity={0.7}
            onPress={() => setSearchText('')}
            style={styles.clearButton}
          >
            <Text style={[styles.clearIcon, { color: colors.textTertiary }]}>
              {'\u2715'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filtersRow}>
        {quickFilters.map(filter => (
          <TouchableOpacity activeOpacity={0.7}
            key={filter.id}
            style={[
              styles.filterChip,
              {
                borderColor: filters.activeQuickFilters.includes(filter.id)
                  ? colors.primary
                  : colors.border,
                backgroundColor: filters.activeQuickFilters.includes(filter.id)
                  ? colors.primary + '22'
                  : colors.surface,
              },
            ]}
            onPress={() => toggleQuickFilter(filter.id)}
          >
            <Text style={styles.filterIcon}>{filter.icon}</Text>
            <Text
              style={[
                styles.filterText,
                {
                  color: filters.activeQuickFilters.includes(filter.id)
                    ? colors.primary
                    : colors.textSecondary,
                },
              ]}
            >
              {filter.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderRecentSearches = () => (
    <View style={styles.recentSection}>
      <View style={styles.recentHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Recent Searches
        </Text>
        {recentSearches.length > 0 && (
          <TouchableOpacity activeOpacity={0.7} onPress={clearRecentSearches}>
            <Text style={[styles.clearAllText, { color: colors.primary }]}>
              Clear all
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {recentSearches.length > 0 ? (
        <View style={styles.recentList}>
          {recentSearches.map(item => (
            <View
              key={item}
              style={[styles.recentItem, { borderBottomColor: colors.border }]}
            >
              <TouchableOpacity activeOpacity={0.7}
                style={styles.recentItemContent}
                onPress={() => {
                  setSearchText(item);
                  addRecentSearch(item);
                }}
              >
                <Icon
                  name="time-outline"
                  size={16}
                  color={colors.textTertiary}
                  style={styles.recentIcon}
                />
                <Text
                  style={[styles.recentText, { color: colors.textPrimary }]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7} onPress={() => removeRecentSearch(item)}>
                <Text
                  style={[styles.removeIcon, { color: colors.textTertiary }]}
                >
                  {'\u2715'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          No recent searches
        </Text>
      )}
    </View>
  );

  const renderRestaurantItem = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity activeOpacity={0.7}
      style={[styles.restaurantCard, { backgroundColor: colors.surface }]}
      onPress={() => handleRestaurantPress(item)}
    >
      <Image
        source={
          erroredImages[item.id]
            ? require('../../../assets/images/placeholder.png')
            : { uri: item.image || `https://picsum.photos/seed/search-${item.id}/80/80` }
        }
        defaultSource={require('../../../assets/images/placeholder.png')}
        style={styles.restaurantThumb}
        resizeMode="cover"
        onError={() =>
          setErroredImages(prev => ({
            ...prev,
            [item.id]: true,
          }))
        }
      />
      <View style={styles.restaurantInfo}>
        <Text
          style={[styles.restaurantName, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text
          style={[styles.restaurantCuisines, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {item.cuisines.join(' � ')}
        </Text>
        <View style={styles.restaurantMeta}>
          <View
            style={[
              styles.ratingBadge,
              { backgroundColor: colors.success + '20' },
            ]}
          >
            <Text style={[styles.ratingText, { color: colors.success }]}>* {item.rating}</Text>
          </View>
          <Text style={[styles.metaDot, { color: colors.textTertiary }]}>�</Text>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {item.deliveryTime}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>🔍</Text>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        {isInitialLoad ? 'Search for restaurants' : 'No results found'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {isInitialLoad
          ? 'Try searching for your favorite dishes or cuisines'
          : 'Try a different search term or adjust filters'}
      </Text>
    </View>
  );

  const renderResults = () => (
    <FlatList
      data={results}
      keyExtractor={item => item.id}
      removeClippedSubviews
      windowSize={5}
      initialNumToRender={8}
      maxToRenderPerBatch={10}
      renderItem={renderRestaurantItem}
      contentContainerStyle={styles.resultsList}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={!loading ? renderEmptyState : null}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderSearchHeader()}

      {loading && results.length === 0 ? (
        <Loading fullScreen message="Searching..." />
      ) : (
        <>
          {isInitialLoad && recentSearches.length === 0 && renderEmptyState()}
          {!isInitialLoad &&
            searchText.trim() === '' &&
            recentSearches.length > 0 && (
              <View style={styles.content}>{renderRecentSearches()}</View>
            )}
          {results.length > 0 && renderResults()}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    elevation: 2,
    shadowColor: Colors.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 14,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  filterText: {
    fontSize: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  recentSection: {
    marginTop: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: '500',
  },
  recentList: {},
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recentItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentIcon: {
    fontSize: 14,
    marginRight: 12,
  },
  recentText: {
    fontSize: 15,
  },
  removeIcon: {
    fontSize: 12,
    padding: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  resultsList: {
    padding: 16,
  },
  restaurantCard: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    alignItems: 'center',
  },
  restaurantThumb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: Colors.BG_TERTIARY,
  },
  dealBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  dealText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.TEXT_INVERSE,
  },
  restaurantInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  restaurantCuisines: {
    fontSize: 12,
    marginBottom: 6,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaDot: {
    fontSize: 10,
    marginHorizontal: 4,
  },
  metaText: {
    fontSize: 11,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default SearchScreen;











