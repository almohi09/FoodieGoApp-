import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors, spacing, borderRadius } from '../../../theme';

interface MenuItemCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  isVeg: boolean;
  isAvailable?: boolean;
  popular?: boolean;
  quantity?: number;
  onAdd: () => void;
  onRemove: () => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  id,
  name,
  description,
  price,
  image,
  isVeg,
  isAvailable = true,
  popular,
  quantity = 0,
  onAdd,
  onRemove,
}) => {
  return (
    <View style={[styles.container, !isAvailable && styles.unavailable]}>
      <View style={styles.content}>
        <View style={styles.badges}>
          <View
            style={[
              styles.vegBadge,
              { borderColor: isVeg ? colors.veg : colors.nonVeg },
            ]}
          >
            <View
              style={[
                styles.vegDot,
                { backgroundColor: isVeg ? colors.veg : colors.nonVeg },
              ]}
            />
          </View>
          {popular && (
            <View
              style={[styles.popularBadge, { backgroundColor: colors.warning }]}
            >
              <Text style={styles.popularText}>★ Popular</Text>
            </View>
          )}
        </View>

        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.price}>₹{price}</Text>
          {!isAvailable && (
            <Text style={styles.unavailableText}>Unavailable</Text>
          )}
        </View>
      </View>

      <View style={styles.imageSection}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.imageEmoji}>🍽️</Text>
          </View>
        )}

        {isAvailable && (
          <View style={styles.quantityControl}>
            {quantity === 0 ? (
              <TouchableOpacity
                style={styles.addButton}
                onPress={onAdd}
                activeOpacity={0.8}
                testID={`menu-item-add-${id}`}
              >
                <Text style={styles.addButtonText}>ADD</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={onRemove}
                  activeOpacity={0.8}
                  testID={`menu-item-remove-${id}`}
                >
                  <Text style={styles.quantityButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={onAdd}
                  activeOpacity={0.8}
                  testID={`menu-item-add-${id}`}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  unavailable: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
    marginRight: 14,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  vegBadge: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  popularBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  unavailableText: {
    fontSize: 12,
    color: colors.error,
    marginLeft: spacing.md,
  },
  imageSection: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageEmoji: {
    fontSize: 40,
  },
  quantityControl: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textInverse,
    marginTop: -2,
  },
  quantityText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
});

