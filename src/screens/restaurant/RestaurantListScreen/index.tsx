import React, { useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import RestaurantCard from '../../../components/RestaurantCard';
import { RestaurantSortOption, useRestaurants } from '../../../hooks/useRestaurants';
import styles from './styles';
import { Colors } from '../../../theme';

type RestaurantListRouteProp = RouteProp<RootStackParamList, 'RestaurantList'>;

const SORT_OPTIONS: Array<{ key: RestaurantSortOption; label: string }> = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'rating', label: 'Rating' },
  { key: 'delivery_time', label: 'Delivery time' },
  { key: 'cost_low_to_high', label: 'Cost low to high' },
  { key: 'cost_high_to_low', label: 'Cost high to low' },
];

export const RestaurantListScreen: React.FC = () => {
  const route = useRoute<RestaurantListRouteProp>();
  const initialCategory = route.params?.category || 'All';

  const [pureVeg, setPureVeg] = useState(false);
  const [rating4Plus, setRating4Plus] = useState(false);
  const [under150Delivery, setUnder150Delivery] = useState(false);
  const [fastDelivery, setFastDelivery] = useState(false);
  const [sortBy, setSortBy] = useState<RestaurantSortOption>('relevance');

  const { restaurants, loading, error, refetch } = useRestaurants({
    category: initialCategory,
    pureVeg,
    rating4Plus,
    under150Delivery,
    fastDelivery,
    sortBy,
  });

  const filterChips = useMemo(
    () => [
      { label: 'Pure Veg', active: pureVeg, toggle: () => setPureVeg(v => !v) },
      {
        label: 'Rating 4.0+',
        active: rating4Plus,
        toggle: () => setRating4Plus(v => !v),
      },
      {
        label: 'Under 150 delivery',
        active: under150Delivery,
        toggle: () => setUnder150Delivery(v => !v),
      },
      {
        label: 'Fast delivery',
        active: fastDelivery,
        toggle: () => setFastDelivery(v => !v),
      },
    ],
    [fastDelivery, pureVeg, rating4Plus, under150Delivery],
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={restaurants}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <RestaurantCard restaurant={item} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
        ListHeaderComponent={
          <View>
            <View style={styles.filtersContainer}>
              {filterChips.map(chip => (
                <TouchableOpacity activeOpacity={0.7}
                  key={chip.label}
                  style={[styles.filterChip, chip.active ? styles.filterChipActive : null]}
                  onPress={chip.toggle}
                 
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      chip.active ? styles.filterChipTextActive : null,
                    ]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sortContainer}>
              <Icon name="swap-vertical" size={16} color={Colors.TEXT_SECONDARY} />
              <Text style={styles.sortLabel}>Sort:</Text>
              <FlatList
                horizontal
                data={SORT_OPTIONS}
                keyExtractor={item => item.key}
                renderItem={({ item }) => (
                  <TouchableOpacity activeOpacity={0.7}
                    style={[styles.sortChip, sortBy === item.key ? styles.sortChipActive : null]}
                    onPress={() => setSortBy(item.key)}
                  >
                    <Text
                      style={[
                        styles.sortChipText,
                        sortBy === item.key ? styles.sortChipTextActive : null,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}
                showsHorizontalScrollIndicator={false}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {loading ? <Text style={styles.helperText}>Loading restaurants...</Text> : null}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No restaurants found</Text>
              <Text style={styles.emptyText}>Try changing filters or sort options.</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default RestaurantListScreen;

