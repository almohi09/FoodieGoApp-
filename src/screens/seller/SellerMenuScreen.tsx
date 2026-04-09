import { useToast } from '@/components/Toast';
import { SkeletonBox } from '@/components/SkeletonLoader';
import React, { useCallback, useEffect, useState } from 'react';
import {ActivityIndicator, // size="small"
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/theme/colors';
import { RootStackParamList } from '../../navigation/AppNavigator';
import {
  sellerMenuService,
  Category,
} from '../../api/sellerMenuService';
import { MenuItem } from '../../types';

type SellerMenuNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SellerMenuScreen: React.FC = () => {
  const { showToast } = useToast();
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<SellerMenuNavigationProp>();
  const insets = useSafeAreaInsets();

  const [restaurantId, setRestaurantId] = useState('restaurant_1');
  const [loading, setLoading] = useState(true);
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategoryName, setSelectedCategoryName] = useState<
    string | null
  >(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isAddCategoryModalVisible, setIsAddCategoryModalVisible] =
    useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

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
            !selectedCategoryName
          ) {
            setSelectedCategoryName(result.categories[0].name);
          }
        } else {
          showToast({ type: 'error', message: result.error || 'Failed to load menu' });
        }
      } catch {
        showToast({ type: 'error', message: 'Something went wrong' });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedCategoryName],
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

  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 500);
    return () => clearTimeout(t);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMenu(restaurantId);
  };

  const filteredItems = selectedCategoryName
    ? menuItems.filter(item => item.category === selectedCategoryName)
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
              showToast({ type: 'error', message: result.error || 'Failed to delete item' });
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
      showToast({ type: 'error', message: result.error || 'Failed to update availability' });
    }
    setActionLoadingId(null);
  };

  const handleAddCategory = () => {
    setNewCategoryName('');
    setIsAddCategoryModalVisible(true);
  };

  const handleSubmitCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      showToast({ type: 'error', message: 'Please enter a category name' });
      return;
    }

    const result = await sellerMenuService.createCategory(restaurantId, name);
    if (result.success) {
      setIsAddCategoryModalVisible(false);
      setSelectedCategoryName(name);
      await loadMenu(restaurantId);
    } else {
      showToast({ type: 'error', message: result.error || 'Failed to create category' });
    }
  };

  const handleDeleteCategory = (category: Category) => {
    if (category.itemCount > 0) {
      showToast({ type: 'error', message: 'Remove all items from this category first' });
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
            if (selectedCategoryName === category.name) {
              setSelectedCategoryName(categories[0]?.name || null);
            }
            await loadMenu(restaurantId);
          } else {
            showToast({ type: 'error', message: result.error || 'Failed to delete category' });
          }
        },
      },
    ]);
  };

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <TouchableOpacity activeOpacity={0.7}
      style={[styles.menuItemCard, { backgroundColor: colors.surface }]}
      onPress={() => handleEditItem(item)}
    >
      <View style={styles.menuItemLeft}>
        <View style={styles.menuItemImage}>
          {item.image ? (
            <Text style={styles.menuItemImageText}>IMG</Text>
          ) : (
            <Text style={styles.menuItemEmoji}>{item.isVeg ? 'ðŸ¥¬' : 'ðŸ–'}</Text>
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
              â‚¹{item.price}
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
        <TouchableOpacity activeOpacity={0.7}
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
        <TouchableOpacity activeOpacity={0.7}
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

  if (loading || !minDelayDone) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: 16 }]}>
        <SkeletonBox style={{ height: 220, marginBottom: 16, borderRadius: 16 }} />
        <SkeletonBox style={{ height: 18, width: '84%', marginBottom: 12 }} />
        <SkeletonBox style={{ height: 14, width: '55%', marginBottom: 10 }} />
        <SkeletonBox style={{ height: 14, width: '72%' }} />
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
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()}>
            <Text style={[styles.backButton, { color: colors.primary }]}>
              â† Back
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Menu
          </Text>
          <TouchableOpacity activeOpacity={0.7}
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
          <TouchableOpacity activeOpacity={0.7}
            style={[
              styles.categoryChip,
              {
                backgroundColor: !selectedCategoryName
                  ? colors.primary
                  : colors.surface,
              },
            ]}
            onPress={() => setSelectedCategoryName(null)}
          >
            <Text
              style={[
                styles.categoryChipText,
                {
                  color: !selectedCategoryName
                    ? colors.surface
                    : colors.textPrimary,
                },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {categories.map(category => (
            <TouchableOpacity activeOpacity={0.7}
              key={category.id}
              style={[
                styles.categoryChip,
                {
                  backgroundColor:
                    selectedCategoryName === category.name
                      ? colors.primary
                      : colors.surface,
                },
              ]}
              onPress={() => setSelectedCategoryName(category.name)}
              onLongPress={() => handleDeleteCategory(category)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  {
                    color:
                      selectedCategoryName === category.name
                        ? colors.surface
                        : colors.textPrimary,
                  },
                ]}
              >
                {category.name} ({category.itemCount})
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity activeOpacity={0.7}
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
            <Text style={styles.emptyIcon}>ðŸ½ï¸</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No items in this category
            </Text>
            <TouchableOpacity activeOpacity={0.7}
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

      <TouchableOpacity activeOpacity={0.7}
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleAddItem}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent
        visible={isAddCategoryModalVisible}
        onRequestClose={() => setIsAddCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              New Category
            </Text>
            <TextInput
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Category name"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.modalInput,
                { borderColor: colors.border, color: colors.textPrimary },
              ]}
              autoFocus
              maxLength={40}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity activeOpacity={0.7}
                style={styles.modalAction}
                onPress={() => setIsAddCategoryModalVisible(false)}
              >
                <Text style={[styles.modalActionText, { color: colors.error }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7}
                style={styles.modalAction}
                onPress={handleSubmitCategory}
              >
                <Text
                  style={[styles.modalActionText, { color: colors.primary }]}
                >
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: Colors.BG_SECONDARY,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  modalActions: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
  },
  modalAction: {
    paddingVertical: 6,
  },
  modalActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SellerMenuScreen;











