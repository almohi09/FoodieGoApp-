import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import supabase from '../../../config/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useOwnerStore } from '../../../store/ownerStore';
import { Colors } from '../../../theme';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonBox } from '@/components/SkeletonLoader';
import styles from './styles';

interface MenuCategory {
  id: string;
  name: string;
  sort_order: number;
}

interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_veg: boolean;
}

const initialForm = {
  id: '',
  name: '',
  description: '',
  price: '',
  imageUrl: '',
  categoryId: '',
  isAvailable: true,
  isVeg: true,
};

export const MenuScreen: React.FC = () => {
  const profile = useAuthStore(state => state.profile);
  const { currentRestaurant, fetchCurrentRestaurant, updateMenuItem, deleteMenuItem } = useOwnerStore();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [erroredImages, setErroredImages] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (!profile?.id) {
        return;
      }

      if (!currentRestaurant) {
        await fetchCurrentRestaurant(profile.id);
      }

      const restaurantId = useOwnerStore.getState().currentRestaurant?.id;
      if (!restaurantId) {
        return;
      }

      const [{ data: categoriesData }, { data: itemsData }] = await Promise.all([
        supabase
          .from('menu_categories')
          .select('id,name,sort_order')
          .eq('restaurant_id', restaurantId)
          .order('sort_order', { ascending: true })
          .returns<MenuCategory[]>(),
        supabase
          .from('menu_items')
          .select('id,category_id,name,description,price,image_url,is_available,is_veg')
          .eq('restaurant_id', restaurantId)
          .returns<MenuItem[]>(),
      ]);

      const nextCategories = categoriesData || [];
      setCategories(nextCategories);
      setItems(itemsData || []);

      setExpanded(
        nextCategories.reduce<Record<string, boolean>>((acc, category) => {
          acc[category.id] = true;
          return acc;
        }, {}),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [profile?.id, currentRestaurant?.id]);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    categories.forEach(category => {
      map.set(
        category.id,
        items.filter(item => item.category_id === category.id),
      );
    });
    return map;
  }, [categories, items]);

  const toggleAvailability = async (item: MenuItem, next: boolean) => {
    if (!currentRestaurant) {
      return;
    }

    await updateMenuItem({
      id: item.id,
      restaurantId: currentRestaurant.id,
      categoryId: item.category_id,
      name: item.name,
      description: item.description || '',
      price: Number(item.price),
      imageUrl: item.image_url || '',
      isAvailable: next,
      isVeg: item.is_veg,
    });

    await loadData();
  };

  const moveCategory = async (category: MenuCategory, direction: 'up' | 'down') => {
    const currentIndex = categories.findIndex(item => item.id === category.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) {
      return;
    }

    const next = [...categories];
    const [moved] = next.splice(currentIndex, 1);
    next.splice(targetIndex, 0, moved);

    await Promise.all(
      next.map((row, index) =>
        supabase.from('menu_categories').update({ sort_order: index + 1 }).eq('id', row.id),
      ),
    );

    await loadData();
  };

  const addCategory = async () => {
    if (!currentRestaurant || !newCategoryName.trim()) {
      return;
    }

    await supabase.from('menu_categories').insert({
      restaurant_id: currentRestaurant.id,
      name: newCategoryName.trim(),
      sort_order: categories.length + 1,
    });

    setNewCategoryName('');
    setShowCategoryModal(false);
    await loadData();
  };

  const removeCategory = async (categoryId: string) => {
    await supabase.from('menu_categories').delete().eq('id', categoryId);
    await loadData();
  };

  const openAddItem = () => {
    setForm({
      ...initialForm,
      categoryId: categories[0]?.id || '',
    });
    setShowItemModal(true);
  };

  const openEditItem = (item: MenuItem) => {
    setForm({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      imageUrl: item.image_url || '',
      categoryId: item.category_id,
      isAvailable: item.is_available,
      isVeg: item.is_veg,
    });
    setShowItemModal(true);
  };

  const saveItem = async () => {
    if (!currentRestaurant || !form.name.trim() || !form.categoryId) {
      return;
    }

    const success = await updateMenuItem({
      id: form.id || undefined,
      restaurantId: currentRestaurant.id,
      categoryId: form.categoryId,
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price || 0),
      imageUrl: form.imageUrl.trim(),
      isAvailable: form.isAvailable,
      isVeg: form.isVeg,
    });

    if (success) {
      setShowItemModal(false);
      await loadData();
    }
  };

  const removeItem = async (itemId: string) => {
    await deleteMenuItem(itemId);
    await loadData();
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isLoading ? (
        <View>
          <SkeletonBox style={{ height: 50, borderRadius: 12, marginBottom: 16 }} />
          {Array.from({ length: 3 }).map((_, sectionIndex) => (
            <View key={`menu-skeleton-section-${sectionIndex}`} style={{ marginBottom: 16 }}>
              <SkeletonBox style={{ height: 20, width: '45%', marginBottom: 12, borderRadius: 8 }} />
              {Array.from({ length: 2 }).map((__, itemIndex) => (
                <View
                  key={`menu-skeleton-item-${sectionIndex}-${itemIndex}`}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
                >
                  <SkeletonBox style={{ width: 60, height: 60, borderRadius: 10, marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <SkeletonBox style={{ height: 14, width: '72%', marginBottom: 8, borderRadius: 6 }} />
                    <SkeletonBox style={{ height: 12, width: '50%', borderRadius: 6 }} />
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : null}
      {!isLoading ? (
      <>
      {categories.length === 0 && items.length === 0 ? (
        <EmptyState
          illustration="no-orders"
          title="No menu items yet"
          subtitle="Add your first category or item to start accepting orders."
          buttonText="Add Category"
          onButtonPress={() => setShowCategoryModal(true)}
        />
      ) : null}
      {categories.map(category => {
        const categoryItems = itemsByCategory.get(category.id) || [];
        return (
          <View key={category.id} style={styles.categoryCard}>
            <TouchableOpacity activeOpacity={0.7}
              style={styles.categoryHeader}
             
              onPress={() =>
                setExpanded(prev => ({
                  ...prev,
                  [category.id]: !prev[category.id],
                }))
              }
            >
              <View style={styles.categoryHeaderLeft}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{categoryItems.length}</Text>
                </View>
              </View>
              <View style={styles.categoryHeaderRight}>
                <TouchableOpacity activeOpacity={0.7} style={styles.inlineIconButton} onPress={() => void moveCategory(category, 'up')}>
                  <Icon name="arrow-up" size={14} color={Colors.TEXT_SECONDARY} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7} style={styles.inlineIconButton} onPress={() => void moveCategory(category, 'down')}>
                  <Icon name="arrow-down" size={14} color={Colors.TEXT_SECONDARY} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7} style={styles.inlineIconButton} onPress={() => void removeCategory(category.id)}>
                  <Icon name="trash-outline" size={14} color={Colors.ERROR} />
                </TouchableOpacity>
                <Icon name="reorder-three-outline" size={18} color={Colors.TEXT_TERTIARY} />
              </View>
            </TouchableOpacity>

            {expanded[category.id]
              ? categoryItems.map(item => (
                  <View key={item.id} style={styles.itemRow}>
                    {item.image_url ? (
                      <Image
                        source={erroredImages[item.id] ? require('../../../assets/images/placeholder.png') : { uri: item.image_url }}
                        defaultSource={require('../../../assets/images/placeholder.png')}
                        style={styles.itemImage}
                        resizeMode="cover"
                        onError={() =>
                          setErroredImages(prev => ({
                            ...prev,
                            [item.id]: true,
                          }))
                        }
                      />
                    ) : (
                      <View style={styles.itemImagePlaceholder}>
                        <Icon name="image-outline" size={18} color={Colors.TEXT_TERTIARY} />
                      </View>
                    )}
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.itemPrice}>INR {Number(item.price).toFixed(2)}</Text>
                      <View
                        style={[
                          styles.vegDot,
                          { backgroundColor: item.is_veg ? Colors.VEG : Colors.NON_VEG },
                        ]}
                      />
                    </View>
                    <View style={styles.itemActions}>
                      <Switch
                        value={item.is_available}
                        trackColor={{ false: Colors.BORDER_DARK, true: Colors.VEG }}
                        thumbColor={Colors.TEXT_INVERSE}
                        onValueChange={next => {
                          void toggleAvailability(item, next);
                        }}
                      />
                      <TouchableOpacity activeOpacity={0.7} style={styles.iconButton} onPress={() => openEditItem(item)}>
                        <Text style={styles.tinyButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity activeOpacity={0.7} style={styles.iconButton} onPress={() => void removeItem(item.id)}>
                        <Text style={styles.tinyButtonText}>Del</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              : null}
          </View>
        );
      })}

      <TouchableOpacity activeOpacity={0.7} style={styles.addButton} onPress={() => setShowCategoryModal(true)}>
        <Text style={styles.addButtonText}>Add Category</Text>
      </TouchableOpacity>

      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add Category</Text>
            <TextInput
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Category name"
              style={styles.input}
            />
            <TouchableOpacity activeOpacity={0.7} style={styles.addButton} onPress={() => void addCategory()}>
              <Text style={styles.addButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={styles.addButton} onPress={() => setShowCategoryModal(false)}>
              <Text style={styles.addButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showItemModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{form.id ? 'Edit Item' : 'Add Item'}</Text>
            <View style={styles.previewCard}>
              {form.imageUrl ? (
                <Image
                  source={erroredImages.formPreview ? require('../../../assets/images/placeholder.png') : { uri: form.imageUrl }}
                  defaultSource={require('../../../assets/images/placeholder.png')}
                  style={styles.previewImage}
                  resizeMode="cover"
                  onError={() =>
                    setErroredImages(prev => ({
                      ...prev,
                      formPreview: true,
                    }))
                  }
                />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <Icon name="image-outline" size={22} color={Colors.TEXT_TERTIARY} />
                </View>
              )}
            </View>
            <TextInput
              value={form.name}
              onChangeText={text => setForm(prev => ({ ...prev, name: text }))}
              placeholder="Item name"
              style={styles.input}
            />
            <TextInput
              value={form.description}
              onChangeText={text => setForm(prev => ({ ...prev, description: text }))}
              placeholder="Description"
              style={[styles.input, styles.textarea]}
              multiline
            />
            <TextInput
              value={form.price}
              onChangeText={text => setForm(prev => ({ ...prev, price: text }))}
              placeholder="Price"
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              value={form.imageUrl}
              onChangeText={text => setForm(prev => ({ ...prev, imageUrl: text }))}
              placeholder="Image URL"
              style={styles.input}
            />

            {categories.map(category => {
              const active = form.categoryId === category.id;
              return (
                <TouchableOpacity activeOpacity={0.7}
                  key={category.id}
                  style={[styles.selectChip, active ? styles.selectChipActive : null]}
                  onPress={() => setForm(prev => ({ ...prev, categoryId: category.id }))}
                >
                  <Text style={styles.tinyButtonText}>{category.name}</Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.rowBetween}>
              <Text style={styles.caption}>Veg Item</Text>
              <Switch value={form.isVeg} onValueChange={next => setForm(prev => ({ ...prev, isVeg: next }))} />
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.caption}>Available</Text>
              <Switch value={form.isAvailable} onValueChange={next => setForm(prev => ({ ...prev, isAvailable: next }))} />
            </View>

            <TouchableOpacity activeOpacity={0.7} style={styles.addButton} onPress={() => void saveItem()}>
              <Text style={styles.addButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={styles.addButton} onPress={() => setShowItemModal(false)}>
              <Text style={styles.addButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </>
      ) : null}
      </ScrollView>

      <TouchableOpacity activeOpacity={0.7} style={styles.addFab} onPress={openAddItem}>
        <Icon name="add" size={28} color={Colors.TEXT_INVERSE} />
      </TouchableOpacity>
    </View>
  );
};

export default MenuScreen;



