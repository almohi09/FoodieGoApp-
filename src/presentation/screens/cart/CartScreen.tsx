import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../../../theme';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Button, EmptyState } from '../../components/common';
import { useAppSelector, useAppDispatch } from '../../hooks/useRedux';
import {
  updateQuantity,
  removeFromCart,
  clearCart,
  selectCartItems,
  selectCartTotal,
  selectQuoteDetails,
  selectFinalTotal,
  addToCart,
} from '../../../store/slices/cartSlice';
import { useAppStore } from '../../../data/storage/appStore';

type CartNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Cart'>;

export const CartScreen: React.FC = () => {
  const navigation = useNavigation<CartNavigationProp>();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector(selectCartItems);
  const cartTotal = useAppSelector(selectCartTotal);
  const {
    restaurantName,
    couponDiscount,
    deliveryFee,
    packagingFee: pkgFee,
    taxes: taxAmt,
  } = useAppSelector(state => state.cart);
  const quoteDetails = useAppSelector(selectQuoteDetails);
  const finalTotal =
    useAppSelector(selectFinalTotal) ||
    cartTotal + deliveryFee - couponDiscount;

  const packagingFee = pkgFee || quoteDetails.packagingFee;
  const taxes = taxAmt || quoteDetails.taxes;

  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);
  const { loadCheckoutRecovery, clearCheckoutRecovery } = useAppStore();

  useEffect(() => {
    const checkRecovery = async () => {
      const recovery = await loadCheckoutRecovery();
      if (recovery && recovery.cartItems && recovery.cartItems.length > 0) {
        setShowRecoveryBanner(true);
      }
    };
    checkRecovery();
  }, [loadCheckoutRecovery]);

  const handleResumeCheckout = async () => {
    const recovery = await loadCheckoutRecovery();
    if (recovery && recovery.cartItems && recovery.cartItems.length > 0) {
      for (const item of recovery.cartItems) {
        dispatch(
          addToCart({
            item: item.item,
            restaurantId: item.restaurantId,
            restaurantName: item.restaurantName,
            quantity: item.quantity,
            customizations: item.customizations || [],
          }),
        );
      }
      await clearCheckoutRecovery();
      setShowRecoveryBanner(false);
      navigation.navigate('Checkout');
    }
  };

  const handleDismissRecovery = async () => {
    await clearCheckoutRecovery();
    setShowRecoveryBanner(false);
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    dispatch(updateQuantity({ itemId, quantity }));
  };

  const handleRemoveItem = (itemId: string) => {
    dispatch(removeFromCart(itemId));
  };

  const handleClearCart = () => {
    dispatch(clearCart());
  };

  if (cartItems.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Cart</Text>
          <View style={styles.headerSpacer} />
        </View>
        <EmptyState
          icon="🛒"
          title="Your cart is empty"
          message="Add items from a restaurant to get started"
          actionLabel="Browse Restaurants"
          onAction={() =>
            navigation.navigate('MainTabs', { screen: 'Home' } as any)
          }
        />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { paddingTop: insets.top }]}
      testID="cart-screen"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Cart</Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {showRecoveryBanner && (
        <View style={styles.recoveryBanner}>
          <View style={styles.recoveryContent}>
            <Text style={styles.recoveryIcon}>↩️</Text>
            <View style={styles.recoveryTextContainer}>
              <Text style={styles.recoveryTitle}>
                Continue your previous order?
              </Text>
              <Text style={styles.recoverySubtext}>
                You have items from a previous session
              </Text>
            </View>
            <View style={styles.recoveryActions}>
              <TouchableOpacity
                style={styles.recoveryDismiss}
                onPress={handleDismissRecovery}
              >
                <Text style={styles.recoveryDismissText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.recoveryResume}
                onPress={handleResumeCheckout}
              >
                <Text style={styles.recoveryResumeText}>Resume</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.restaurantBanner}>
          <Text style={styles.restaurantIcon}>🏪</Text>
          <Text style={styles.restaurantName}>{restaurantName}</Text>
        </View>

        <View style={styles.itemsSection}>
          {cartItems.map(item => (
            <View key={item.id} style={styles.cartItem}>
              <Image
                source={{ uri: item.item.image }}
                style={styles.itemImage}
              />
              <View style={styles.itemInfo}>
                <View style={styles.itemHeader}>
                  <View
                    style={[
                      styles.vegBadge,
                      {
                        borderColor: item.item.isVeg
                          ? colors.veg
                          : colors.nonVeg,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.vegDot,
                        {
                          backgroundColor: item.item.isVeg
                            ? colors.veg
                            : colors.nonVeg,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.itemName}>{item.item.name}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{item.totalPrice}</Text>

                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() =>
                      item.quantity === 1
                        ? handleRemoveItem(item.id)
                        : handleUpdateQuantity(item.id, item.quantity - 1)
                    }
                  >
                    <Text style={styles.quantityButtonText}>
                      {item.quantity === 1 ? '🗑️' : '-'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.quantity}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() =>
                      handleUpdateQuantity(item.id, item.quantity + 1)
                    }
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.billSection}>
          <Text style={styles.sectionTitle}>Bill Details</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billValue}>₹{cartTotal}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            <Text style={styles.billValue}>₹{deliveryFee}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Packaging Fee</Text>
            <Text style={styles.billValue}>₹{packagingFee}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Taxes (GST)</Text>
            <Text style={styles.billValue}>₹{taxes}</Text>
          </View>
          {couponDiscount > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: colors.success }]}>
                Coupon Discount
              </Text>
              <Text style={[styles.billValue, { color: colors.success }]}>
                -₹{couponDiscount}
              </Text>
            </View>
          )}
          <View style={styles.billDivider} />
          <View style={styles.billRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{finalTotal}</Text>
          </View>
        </View>

        <View style={styles.savingsSection}>
          <Text style={styles.savingsIcon}>💰</Text>
          <Text style={styles.savingsText}>
            You're saving ₹{couponDiscount} on this order!
          </Text>
        </View>

        <View style={styles.coinsSection}>
          <View style={styles.coinsRow}>
            <Text style={styles.coinsLabel}>🪙 FoodieCoins to earn</Text>
            <Text style={styles.coinsValue}>~{Math.floor(cartTotal / 10)}</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}
      >
        <View style={styles.totalContainer}>
          <Text style={styles.footerTotalLabel}>Total</Text>
          <Text style={styles.footerTotalValue}>₹{finalTotal}</Text>
        </View>
        <Button
          title="Proceed to Checkout"
          onPress={() => navigation.navigate('Checkout')}
          style={styles.checkoutButton}
          testID="cart-proceed-checkout-button"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.sm,
  },
  backIcon: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  title: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  clearText: {
    ...typography.bodyMedium,
    color: colors.error,
  },
  restaurantBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  restaurantIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  restaurantName: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  itemsSection: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  cartItem: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemImage: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
    marginRight: spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  vegBadge: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  vegDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  itemName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  itemPrice: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textInverse,
  },
  quantity: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginHorizontal: spacing.md,
    minWidth: 24,
    textAlign: 'center',
  },
  billSection: {
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  billLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  billValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  billDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  totalLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  totalValue: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  savingsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  savingsIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  savingsText: {
    ...typography.captionMedium,
    color: colors.success,
  },
  coinsSection: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  coinsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coinsLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  coinsValue: {
    ...typography.bodyMedium,
    color: colors.loyalty,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  totalContainer: {},
  footerTotalLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  footerTotalValue: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  checkoutButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  recoveryBanner: {
    backgroundColor: colors.primaryLight || '#E3F2FD',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
  },
  recoveryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recoveryIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  recoveryTextContainer: {
    flex: 1,
  },
  recoveryTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  recoverySubtext: {
    ...typography.small,
    color: colors.textSecondary,
  },
  recoveryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recoveryDismiss: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  recoveryDismissText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  recoveryResume: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginLeft: spacing.sm,
  },
  recoveryResumeText: {
    ...typography.bodyMedium,
    color: colors.textInverse,
  },
  headerSpacer: {
    width: 40,
  },
  bottomSpacer: {
    height: 40,
  },
});
