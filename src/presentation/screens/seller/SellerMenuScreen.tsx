import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../context/ThemeContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import {
  sellerMenuService,
  Category,
} from '../../../data/api/sellerMenuService';
import { MenuItem } from '../../../domain/types';

type SellerMenuNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SellerMenuScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<SellerMenuNavigationProp>();
  const insets = useSafeAreaInsets();

  const [restaurantId, setRestaurantId] = useState('restaurant_1');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadMenu = useCallback(
    async (id: string) => {
      try {
        const result = await sellerMenuService.getMenu(id);
        if (result.success) {
          setCategories(result.categories || []);
          setMenuItems(result.items || []);
          if (
            result.categories &&
            result.categories.length > 0 &&
            !selectedCategory
          ) {
            setSelectedCategory(result.categories[0].id);
          }
        } else {
          Alert.alert('Error', result.error || 'Failed to load menu');
        }
      } catch {
        Alert.alert('Error', 'Something went wrong');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedCategory],
  );

  useEffect(() => {
    const init = async () => {
      const sellerRaw = await AsyncStorage.getItem('seller_data');
      const seller = sellerRaw ? JSON.parse(sellerRaw) : null;
      const id = seller?.restaurantId || seller?.id || 'restaurant_1';
      setRestaurantId(id);
      await loadMenu(id);
    };
    init();
  }, [loadMenu]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMenu(restaurantId);
  };

  const filteredItems = selectedCategory
    ? menuItems.filter(item => item.category === selectedCategory)
    : menuItems;

  const handleAddItem = () => {
    navigation.navigate('SellerMenuItemForm' as any, { restaurantId });
  };

  const handleEditItem = (item: MenuItem) => {
    navigation.navigate('SellerMenuItemForm' as any, {
      restaurantId,
      item,
      isEditing: true,
    });
  };

  const handleDeleteItem = async (item: MenuItem) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(item.id);
            const result = await sellerMenuService.deleteMenuItem(
              restaurantId,
              item.id,
            );
            if (result.success) {
              await loadMenu(restaurantId);
            } else {
              Alert.alert('Error', result.error || 'Failed to delete item');
            }
            setActionLoadingId(null);
          },
        },
      ],
    );
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    setActionLoadingId(item.id);
    const result = await sellerMenuService.toggleItemAvailability(
      restaurantId,
      item.id,
      !item.isAvailable,
    );
    if (result.success) {
      await loadMenu(restaurantId);
    } else {
      Alert.alert('Error', result.error || 'Failed to update availability');
    }
    setActionLoadingId(null);
  };

  const handleAddCategory = () => {
    Alert.prompt(
      'New Category',
      'Enter category name',
      async name => {
        if (name && name.trim()) {
          const result = await sellerMenuService.createCategory(
            restaurantId,
            name.trim(),
          );
          if (result.success) {
            await loadMenu(restaurantId);
          } else {
            Alert.alert('Error', result.error || 'Failed to create category');
          }
        }
      },
      'plain-text',
    );
  };

  const handleDeleteCategory = (category: Category) => {
    if (category.itemCount > 0) {
      Alert.alert('Cannot Delete', 'Remove all items from this category first');
      return;
    }

    Alert.alert('Delete Category', `Delete "${category.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await sellerMenuService.deleteCategory(
            restaurantId,
            category.id,
          );
          if (result.success) {
            if (selectedCategory === category.id) {
              setSelectedCategory(categories[0]?.id || null);
            }
            await loadMenu(restaurantId);
          } else {
            Alert.alert('Error', result.error || 'Failed to delete category');
          }
        },
      },
    ]);
  };

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <TouchableOpacity
      style={[styles.menuItemCard, { backgroundColor: colors.surface }]}
      onPress={() => handleEditItem(item)}
    >
      <View style={styles.menuItemLeft}>
        <View style={styles.menuItemImage}>
          {item.image ? (
            <Text style={styles.menuItemImageText}>IMG</Text>
          ) : (
            <Text style={styles.menuItemEmoji}>{item.isVeg ? '🥬' : '🍖'}</Text>
          )}
        </View>
        <View style={styles.menuItemInfo}>
          <View style={styles.menuItemNameRow}>
            <Text style={[styles.menuItemName, { color: colors.textPrimary }]}>
              {item.name}
            </Text>
            {item.popular && (
              <View
                style={[
                  styles.popularBadge,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.popularBadgeText}>Popular</Text>
              </View>
            )}
          </View>
          <Text
            style={[styles.menuItemDesc, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.description}
          </Text>
          <View style={styles.menuItemMeta}>
            <Text style={[styles.menuItemPrice, { color: colors.primary }]}>
              ₹{item.price}
            </Text>
            <View
              style={[
                styles.availabilityBadge,
                {
                  backgroundColor: item.isAvailable
                    ? colors.success + '20'
                    : colors.error + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.availabilityText,
                  { color: item.isAvailable ? colors.success : colors.error },
                ]}
              >
                {item.isAvailable ? 'Available' : 'Unavailable'}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.menuItemActions}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            {
              backgroundColor: item.isAvailable
                ? colors.error + '20'
                : colors.success + '20',
            },
          ]}
          onPress={() => handleToggleAvailability(item)}
          disabled={actionLoadingId === item.id}
        >
          {actionLoadingId === item.id ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text
              style={[
                styles.actionBtnText,
                { color: item.isAvailable ? colors.error : colors.success },
              ]}
            >
              {item.isAvailable ? 'Disable' : 'Enable'}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.deleteBtn, { borderColor: colors.error }]}
          onPress={() => handleDeleteItem(item)}
        >
          <Text style={[styles.deleteBtnText, { color: colors.error }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      testID="seller-menu-screen"
    >
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 16, backgroundColor: colors.surface },
        ]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.backButton, { color: colors.primary }]}>
              ← Back
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Menu
          </Text>
          <TouchableOpacity
            onPress={handleAddItem}
            testID="seller-menu-add-item-button"
          >
            <Text style={[styles.addButton, { color: colors.primary }]}>
              + Add
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              {
                backgroundColor: !selectedCategory
                  ? colors.primary
                  : colors.surface,
              },
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text
              style={[
                styles.categoryChipText,
                {
                  color: !selectedCategory
                    ? colors.surface
                    : colors.textPrimary,
                },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                {
                  backgroundColor:
                    selectedCategory === category.id
                      ? colors.primary
                      : colors.surface,
                },
              ]}
              onPress={() => setSelectedCategory(category.id)}
              onLongPress={() => handleDeleteCategory(category)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  {
                    color:
                      selectedCategory === category.id
                        ? colors.surface
                        : colors.textPrimary,
                  },
                ]}
              >
                {category.name} ({category.itemCount})
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[
              styles.categoryChip,
              styles.addCategoryChip,
              { borderColor: colors.primary },
            ]}
            onPress={handleAddCategory}
          >
            <Text style={[styles.categoryChipText, { color: colors.primary }]}>
              + Category
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={item => item.id}
        renderItem={renderMenuItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No items in this category
            </Text>
            <TouchableOpacity
              style={[
                styles.emptyAddButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleAddItem}
            >
              <Text style={styles.emptyAddButtonText}>Add First Item</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleAddItem}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoriesContainer: {
    paddingVertical: 12,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addCategoryChip: {
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  menuItemCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  menuItemLeft: {
    flex: 1,
    flexDirection: 'row',
  },
  menuItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemImageText: {
    fontSize: 10,
    color: '#999',
  },
  menuItemEmoji: {
    fontSize: 28,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  popularBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  popularBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  menuItemDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  menuItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  menuItemActions: {
    marginLeft: 12,
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 16,
  },
  emptyAddButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },
});

export default SellerMenuScreen;
