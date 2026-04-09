import { useToast } from '@/components/Toast';
import React, { useState, useEffect } from 'react';
import {ActivityIndicator, // size="small"
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import {
  sellerMenuService,
  CreateMenuItemData,
  Category,
} from '../../api/sellerMenuService';
import { MenuItem } from '../../types';

type SellerMenuItemFormNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;
type SellerMenuItemFormRouteProp = RouteProp<
  RootStackParamList,
  'SellerMenuItemForm'
>;

export const SellerMenuItemFormScreen: React.FC = () => {
  const { showToast } = useToast();
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<SellerMenuItemFormNavigationProp>();
  const route = useRoute<SellerMenuItemFormRouteProp>();
  const insets = useSafeAreaInsets();

  const { restaurantId, item, isEditing } = route.params || {};
  const existingItem = item as MenuItem | undefined;

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [name, setName] = useState(existingItem?.name || '');
  const [description, setDescription] = useState(
    existingItem?.description || '',
  );
  const [price, setPrice] = useState(existingItem?.price?.toString() || '');
  const [selectedCategory, setSelectedCategory] = useState(
    existingItem?.category || '',
  );
  const [isVeg, setIsVeg] = useState(existingItem?.isVeg ?? true);
  const [isCustomizable, setIsCustomizable] = useState(
    existingItem?.isCustomizable ?? false,
  );
  const [isAvailable, setIsAvailable] = useState(
    existingItem?.isAvailable ?? true,
  );
  const [isPopular, setIsPopular] = useState(existingItem?.popular ?? false);
  const [imageUrl, setImageUrl] = useState(existingItem?.image || '');

  useEffect(() => {
    const loadCategories = async () => {
      const result = await sellerMenuService.getMenu(restaurantId);
      if (result.success && result.categories) {
        setCategories(result.categories);
      }
    };
    loadCategories();
  }, [restaurantId]);

  const validate = (): boolean => {
    if (!name.trim()) {
      showToast({ type: 'error', message: 'Please enter item name' });
      return false;
    }
    if (!price || parseFloat(price) <= 0) {
      showToast({ type: 'error', message: 'Please enter a valid price' });
      return false;
    }
    if (!selectedCategory) {
      showToast({ type: 'error', message: 'Please select a category' });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const itemData: CreateMenuItemData = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        category: selectedCategory,
        isVeg,
        isCustomizable,
        isAvailable,
        popular: isPopular,
        image: imageUrl || undefined,
      };

      let result;
      if (isEditing && existingItem) {
        result = await sellerMenuService.updateMenuItem(
          restaurantId,
          existingItem.id,
          itemData,
        );
      } else {
        result = await sellerMenuService.createMenuItem(restaurantId, itemData);
      }

      if (result.success) {
        showToast({
          type: 'success',
          message: isEditing ? 'Item updated successfully' : 'Item created successfully',
        });
        navigation.goBack();
      } else {
        showToast({ type: 'error', message: result.error || 'Failed to save item' });
      }
    } catch {
      showToast({ type: 'error', message: 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 16, backgroundColor: colors.surface },
        ]}
      >
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()}>
          <Text style={[styles.cancelButton, { color: colors.textSecondary }]}>
            Cancel
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {isEditing ? 'Edit Item' : 'New Item'}
        </Text>
        <TouchableOpacity activeOpacity={0.7} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveButton, { color: colors.primary }]}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.form,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Basic Info
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Item Name *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="e.g., Margherita Pizza"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              maxLength={50}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Description
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="Describe the dish..."
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Price (â‚¹) *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Category *
          </Text>
          <View style={styles.categoryGrid}>
            {categories.map(cat => (
              <TouchableOpacity activeOpacity={0.7}
                key={cat.id}
                style={[
                  styles.categoryOption,
                  { borderColor: colors.border },
                  selectedCategory === cat.name && {
                    borderColor: colors.primary,
                    backgroundColor: colors.primary + '10',
                  },
                ]}
                onPress={() => setSelectedCategory(cat.name)}
              >
                <Text
                  style={[
                    styles.categoryOptionText,
                    {
                      color:
                        selectedCategory === cat.name
                          ? colors.primary
                          : colors.textPrimary,
                    },
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Food Type
          </Text>
          <View style={styles.foodTypeRow}>
            <TouchableOpacity activeOpacity={0.7}
              style={[
                styles.foodTypeOption,
                { borderColor: colors.border },
                isVeg && styles.foodTypeSelected,
                isVeg && {
                  borderColor: colors.success,
                  backgroundColor: colors.success + '10',
                },
              ]}
              onPress={() => setIsVeg(true)}
            >
              <View
                style={[styles.vegIndicator, { borderColor: colors.success }]}
              >
                <View
                  style={[styles.vegDot, { backgroundColor: colors.success }]}
                />
              </View>
              <Text
                style={[
                  styles.foodTypeText,
                  { color: isVeg ? colors.success : colors.textPrimary },
                ]}
              >
                Vegetarian
              </Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7}
              style={[
                styles.foodTypeOption,
                { borderColor: colors.border },
                !isVeg && styles.foodTypeSelected,
                !isVeg && {
                  borderColor: colors.error,
                  backgroundColor: colors.error + '10',
                },
              ]}
              onPress={() => setIsVeg(false)}
            >
              <View
                style={[styles.vegIndicator, { borderColor: colors.error }]}
              >
                <View
                  style={[styles.nonVegDot, { backgroundColor: colors.error }]}
                />
              </View>
              <Text
                style={[
                  styles.foodTypeText,
                  { color: !isVeg ? colors.error : colors.textPrimary },
                ]}
              >
                Non-Vegetarian
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Settings
          </Text>

          <View style={styles.switchRow}>
            <View>
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>
                Available
              </Text>
              <Text style={[styles.switchDesc, { color: colors.textTertiary }]}>
                Item shown to customers
              </Text>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={setIsAvailable}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.switchRow}>
            <View>
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>
                Popular
              </Text>
              <Text style={[styles.switchDesc, { color: colors.textTertiary }]}>
                Show as popular item
              </Text>
            </View>
            <Switch
              value={isPopular}
              onValueChange={setIsPopular}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.switchRow}>
            <View>
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>
                Customizable
              </Text>
              <Text style={[styles.switchDesc, { color: colors.textTertiary }]}>
                Allow customization options
              </Text>
            </View>
            <Switch
              value={isCustomizable}
              onValueChange={setIsCustomizable}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Image URL
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.background, color: colors.textPrimary },
            ]}
            placeholder="https://example.com/image.jpg"
            placeholderTextColor={colors.textTertiary}
            value={imageUrl}
            onChangeText={setImageUrl}
            keyboardType="url"
            autoCapitalize="none"
          />
          <Text style={[styles.helpText, { color: colors.textTertiary }]}>
            Optional: Enter a URL for the item image
          </Text>
        </View>

        <TouchableOpacity activeOpacity={0.7}
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditing ? 'Update Item' : 'Create Item'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cancelButton: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  form: {
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  foodTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  foodTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  foodTypeSelected: {},
  vegIndicator: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nonVegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  foodTypeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  switchDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  helpText: {
    fontSize: 12,
    marginTop: 8,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SellerMenuItemFormScreen;






