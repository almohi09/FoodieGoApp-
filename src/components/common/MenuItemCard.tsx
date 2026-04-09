import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '../../theme';
import { DiscountBadge, Badge } from './Badge';

interface MenuItemCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  isVeg: boolean;
  isAvailable?: boolean;
  popular?: boolean;
  discount?: number;
  quantity?: number;
  onAdd: () => void;
  onRemove: () => void;
  onPress?: () => void;
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
  discount,
  quantity = 0,
  onAdd,
  onRemove,
  onPress,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[
        styles.container,
        !isAvailable && styles.unavailable,
        { backgroundColor: colors.surface },
      ]}
      onPress={onPress}
    >
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
          {popular && <Badge label="★ Popular" variant="warning" size="sm" />}
          {discount && discount > 0 && (
            <DiscountBadge discount={discount} size="sm" />
          )}
        </View>

        <Text
          style={[styles.name, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text
          style={[styles.description, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {description}
        </Text>

        <View style={styles.footer}>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.textPrimary }]}>
              ₹{price}
            </Text>
            {discount && discount > 0 && (
              <Text
                style={[styles.originalPrice, { color: colors.textTertiary }]}
              >
                ₹{Math.round(price / (1 - discount / 100))}
              </Text>
            )}
          </View>
          {!isAvailable && (
            <Text style={[styles.unavailableText, { color: colors.error }]}>
              Unavailable
            </Text>
          )}
        </View>
      </View>

      <View style={styles.imageSection}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <View
            style={[
              styles.image,
              styles.imagePlaceholder,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <Icon name="restaurant" size={36} color={colors.primary} />
          </View>
        )}

        {isAvailable && (
          <View style={styles.quantityControl}>
            {quantity === 0 ? (
              <TouchableOpacity activeOpacity={0.7}
                style={[
                  styles.addButton,
                  {
                    borderColor: colors.primary,
                    backgroundColor: colors.surface,
                  },
                ]}
                onPress={onAdd}
               
                testID={`menu-item-add-${id}`}
              >
                <Icon name="add" size={16} color={colors.primary} />
                <Text style={[styles.addButtonText, { color: colors.primary }]}>
                  ADD
                </Text>
              </TouchableOpacity>
            ) : (
              <View
                style={[
                  styles.quantityContainer,
                  { backgroundColor: colors.primary },
                ]}
              >
                <TouchableOpacity activeOpacity={0.7}
                  style={styles.quantityButton}
                  onPress={onRemove}
                 
                  testID={`menu-item-remove-${id}`}
                >
                  <Icon name="remove" size={16} color={colors.textInverse} />
                </TouchableOpacity>
                <Text
                  style={[styles.quantityText, { color: colors.textInverse }]}
                >
                  {quantity}
                </Text>
                <TouchableOpacity activeOpacity={0.7}
                  style={styles.quantityButton}
                  onPress={onAdd}
                 
                  testID={`menu-item-add-${id}`}
                >
                  <Icon name="add" size={16} color={colors.textInverse} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  unavailable: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    marginRight: 14,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
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
  name: {
    ...typography.bodyMedium,
    marginBottom: 4,
  },
  description: {
    ...typography.small,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    ...typography.bodySemibold,
  },
  originalPrice: {
    ...typography.small,
    textDecorationLine: 'line-through',
  },
  unavailableText: {
    ...typography.small,
    marginLeft: spacing.md,
  },
  imageSection: {
    width: 96,
    height: 96,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageEmoji: {
    fontSize: 36,
  },
  quantityControl: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    alignItems: 'center',
  },
  addButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
  },
  addButtonText: {
    ...typography.smallMedium,
    fontWeight: '700',
    fontSize: 13,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    ...shadows.md,
  },
  quantityButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginTop: -2,
  },
  quantityText: {
    ...typography.bodyMedium,
    fontWeight: '700',
    marginHorizontal: 10,
    minWidth: 20,
    textAlign: 'center',
  },
});

