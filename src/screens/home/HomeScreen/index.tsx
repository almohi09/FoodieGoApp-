import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { useAuthStore } from '../../../store/authStore';
import { useRestaurants } from '../../../hooks/useRestaurants';
import RestaurantCard from '../../../components/RestaurantCard';
import { locationService } from '../../../api/locationService';
import supabase from '../../../config/supabase';
import { Colors } from '../../../theme';
import { EmptyState } from '../../../components/EmptyState';
import { InlineErrorCard } from '../../../components/InlineErrorCard';
import { HomeScreenSkeleton } from '../../../components/skeletons';
import { useCartStore } from '../../../store/cartStore';
import styles from './styles';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CATEGORY_CHIPS = [
  'All',
  'Biryani',
  'Pizza',
  'Chinese',
  'Burger',
  'Desserts',
  'South Indian',
];

const BANNERS = [
  'https://picsum.photos/seed/banner-1/900/360',
  'https://picsum.photos/seed/banner-2/900/360',
  'https://picsum.photos/seed/banner-3/900/360',
];
const BANNER_CARD_WIDTH = 300;
const BANNER_CARD_GAP = 16;

const MIND_CATEGORIES = [
  { title: 'Biryani', image: 'https://picsum.photos/seed/mind-biryani/200/200' },
  { title: 'Pizza', image: 'https://picsum.photos/seed/mind-pizza/200/200' },
  { title: 'Chinese', image: 'https://picsum.photos/seed/mind-chinese/200/200' },
  { title: 'Burger', image: 'https://picsum.photos/seed/mind-burger/200/200' },
  { title: 'Desserts', image: 'https://picsum.photos/seed/mind-dessert/200/200' },
  { title: 'South Indian', image: 'https://picsum.photos/seed/mind-south/200/200' },
];

const getGreeting = (name: string) => {
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) {
    greeting = 'Good morning';
  } else if (hour < 17) {
    greeting = 'Good afternoon';
  }
  return `${greeting}, ${name}`;
};

const extractArea = (address?: string) => {
  if (!address) {
    return 'Choose delivery location';
  }
  const parts = address.split(',').map(item => item.trim());
  return parts[0] || 'Choose delivery location';
};

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const profile = useAuthStore(state => state.profile);
  const user = useAuthStore(state => state.user);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [vegOnly, setVegOnly] = useState(false);
  const [areaName, setAreaName] = useState('Detecting location...');
  const [unreadCount, setUnreadCount] = useState(0);
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [activeBanner, setActiveBanner] = useState(0);
  const [erroredImages, setErroredImages] = useState<Record<string, boolean>>({});
  const bannerScrollRef = React.useRef<ScrollView | null>(null);
  const cartItemCount = useCartStore(state => state.itemCount);

  const { restaurants, loading, error, refetch } = useRestaurants({
    category: selectedCategory === 'All' ? undefined : selectedCategory,
    pureVeg: vegOnly,
  });

  React.useEffect(() => {
    const loadLocation = async () => {
      const location = await locationService.getCurrentLocation();
      setAreaName(extractArea(location?.address));
    };
    void loadLocation();
  }, []);

  React.useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    const loadUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setUnreadCount(count || 0);
    };

    void loadUnread();

    const channel = supabase
      .channel(`home-unread-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadUnread();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  React.useEffect(() => {
    const timer = setTimeout(() => setMinDelayDone(true), 500);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setActiveBanner(prev => (prev + 1) % BANNERS.length);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    bannerScrollRef.current?.scrollTo({
      x: activeBanner * (BANNER_CARD_WIDTH + BANNER_CARD_GAP),
      animated: true,
    });
  }, [activeBanner]);

  const greeting = useMemo(
    () => getGreeting(profile?.name?.trim() || 'Foodie'),
    [profile?.name],
  );

  const onRefresh = async () => {
    await refetch();
  };

  const onBannerScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (BANNER_CARD_WIDTH + BANNER_CARD_GAP));
    setActiveBanner(Math.max(0, Math.min(index, BANNERS.length - 1)));
  };

  const ListHeader = (
    <View>
      <View style={styles.topSection}>
        <TouchableOpacity activeOpacity={0.7}
          style={styles.locationBar}
          onPress={() => navigation.navigate('LocationEntry')}
        >
          <Icon name="location" size={16} color={Colors.PRIMARY} />
          <Text style={styles.locationText} numberOfLines={1}>
            {areaName}
          </Text>
          <Icon name="chevron-down" size={16} color={Colors.TEXT_SECONDARY} />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7}
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search')}
        >
          <Icon name="search" size={18} color={Colors.TEXT_TERTIARY} />
          <Text style={styles.searchText}>Search for restaurants or dishes</Text>
        </TouchableOpacity>

        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>{greeting}</Text>
          <TouchableOpacity activeOpacity={0.7}
            style={[styles.vegToggle, vegOnly ? styles.vegToggleActive : null]}
            onPress={() => setVegOnly(prev => !prev)}
          >
            <Text style={[styles.vegToggleText, vegOnly ? styles.vegToggleTextActive : null]}>
              Veg only
            </Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}
            style={styles.cartButton}
            onPress={() => navigation.navigate('Cart')}
          >
            <Icon name="cart-outline" size={20} color={Colors.TEXT_PRIMARY} />
            {cartItemCount > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartItemCount > 99 ? '99+' : cartItemCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}
            style={styles.bellButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Icon name="notifications-outline" size={20} color={Colors.TEXT_PRIMARY} />
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={bannerScrollRef}
        horizontal
        pagingEnabled
        snapToInterval={BANNER_CARD_WIDTH + BANNER_CARD_GAP}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bannerRow}
        onMomentumScrollEnd={onBannerScroll}
      >
        {BANNERS.map(uri => (
          <Image
            key={uri}
            source={
              erroredImages[uri]
                ? require('../../../assets/images/placeholder.png')
                : { uri }
            }
            defaultSource={require('../../../assets/images/placeholder.png')}
            style={styles.bannerImage}
            resizeMode="cover"
            onError={() =>
              setErroredImages(prev => ({
                ...prev,
                [uri]: true,
              }))
            }
          />
        ))}
      </ScrollView>
      <View style={styles.bannerDotsRow}>
        {BANNERS.map((uri, index) => (
          <View
            key={`${uri}-dot`}
            style={[styles.bannerDot, index === activeBanner ? styles.bannerDotActive : null]}
          />
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {CATEGORY_CHIPS.map(chip => {
          const active = chip === selectedCategory;
          return (
            <TouchableOpacity activeOpacity={0.7}
              key={chip}
              style={[styles.chip, active ? styles.chipActive : null]}
              onPress={() => setSelectedCategory(chip)}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                {chip}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What&apos;s on your mind?</Text>
        <View style={styles.mindGrid}>
          {MIND_CATEGORIES.map(item => (
            <TouchableOpacity activeOpacity={0.7} key={item.title} style={styles.mindItem}>
              <Image
                source={
                  erroredImages[item.image]
                    ? require('../../../assets/images/placeholder.png')
                    : { uri: item.image }
                }
                defaultSource={require('../../../assets/images/placeholder.png')}
                style={styles.mindImage}
                resizeMode="cover"
                onError={() =>
                  setErroredImages(prev => ({
                    ...prev,
                    [item.image]: true,
                  }))
                }
              />
              <Text style={styles.mindLabel}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Restaurants near you</Text>
        <TouchableOpacity activeOpacity={0.7}
          onPress={() =>
            navigation.navigate('RestaurantList', {
              category: selectedCategory,
            })
          }
          style={styles.filterIconButton}
        >
          <Icon name="options" size={18} color={Colors.TEXT_PRIMARY} />
        </TouchableOpacity>
      </View>

      {loading && !minDelayDone ? <HomeScreenSkeleton /> : null}
      {error ? <InlineErrorCard message={error} onRetry={() => void refetch()} /> : null}
      {!loading && !error && restaurants.length === 0 ? (
        <EmptyState
          illustration="no-restaurants"
          title="No restaurants available"
          subtitle="Try changing filters or location."
          buttonText="Retry"
          onButtonPress={() => void refetch()}
        />
      ) : null}
    </View>
  );

  return (
    <FlatList
      data={loading && !minDelayDone ? [] : restaurants}
      keyExtractor={item => item.id}
      removeClippedSubviews
      windowSize={5}
      initialNumToRender={8}
      maxToRenderPerBatch={10}
      renderItem={({ item }) => <RestaurantCard restaurant={item} />}
      ListHeaderComponent={ListHeader}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={Colors.PRIMARY} />}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default HomeScreen;



