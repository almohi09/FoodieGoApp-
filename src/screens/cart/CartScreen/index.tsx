import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { useCartStore } from '../../../store/cartStore';
import { Colors } from '../../../theme';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import styles from './styles';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TAX_RATE = 0.05;

export const CartScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const items = useCartStore(state => state.items);
  const restaurantName = useCartStore(state => state.restaurantName);
  const subtotal = useCartStore(state => state.subtotal);
  const deliveryFee = useCartStore(state => state.deliveryFee);
  const total = useCartStore(state => state.total);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const removeItem = useCartStore(state => state.removeItem);
  const error = useCartStore(state => state.error);
  const clearError = useCartStore(state => state.clearError);
  const [minDelayDone, setMinDelayDone] = useState(false);

  const taxes = useMemo(() => Number((subtotal * TAX_RATE).toFixed(2)), [subtotal]);
  const grandTotal = useMemo(() => Number((total + taxes).toFixed(2)), [taxes, total]);

  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 500);
    return () => clearTimeout(t);
  }, []);

  if (!minDelayDone) {
    return <SkeletonLoader />;
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          illustration="empty-cart"
          title="Your cart is empty"
          subtitle="Add dishes to continue with your order."
          buttonText="Browse Restaurants"
          onButtonPress={() => navigation.navigate('RestaurantList', { category: 'All' })}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Ordering from</Text>
        <Text style={styles.headerTitle}>{restaurantName}</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Swipeable
            renderRightActions={() => (
              <TouchableOpacity activeOpacity={0.7} style={styles.deleteAction} onPress={() => removeItem(item.id)}>
                <Icon name="trash" size={18} color={Colors.TEXT_INVERSE} />
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            )}
          >
            <View style={styles.itemCard}>
              <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>INR {item.price} each</Text>
                <Text style={styles.itemLineTotal}>Line total: INR {item.lineTotal}</Text>
              </View>

              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.qtyButton}
                  onPress={() => updateQuantity(item.id, item.quantity - 1)}
                >
                  <Text style={styles.qtyButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{item.quantity}</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.qtyButton}
                  onPress={() => updateQuantity(item.id, item.quantity + 1)}
                >
                  <Text style={styles.qtyButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Swipeable>
        )}
      />

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>INR {subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.rowDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery fee</Text>
          <Text style={styles.summaryValue}>INR {deliveryFee.toFixed(2)}</Text>
        </View>
        <View style={styles.rowDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Taxes (5%)</Text>
          <Text style={styles.summaryValue}>INR {taxes.toFixed(2)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.grandLabel}>Grand Total</Text>
          <Text style={styles.grandValue}>INR {grandTotal.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.bottomFade}>
        <View style={styles.bottomFadeLayerOne} />
        <View style={styles.bottomFadeLayerTwo} />
        <View style={styles.bottomFadeLayerThree} />
      </View>

      <View style={styles.bottomBar}>
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={clearError}>
              <Text style={styles.errorBannerDismiss}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <TouchableOpacity activeOpacity={0.7} style={styles.checkoutButton} onPress={() => navigation.navigate('Checkout')}>
          <Text style={styles.checkoutText}>Proceed</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CartScreen;
