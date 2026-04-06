import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows } from '../../../theme';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Button, Input } from '../../components/common';
import { useAppSelector } from '../../hooks/useRedux';
import { selectCartItems, selectCartTotal } from '../../../store/slices/cartSlice';
import { useAppDispatch } from '../../hooks/useRedux';
import { applyCoupon, clearCart, setDeliveryFee } from '../../../store/slices/cartSlice';
import { checkoutService } from '../../../data/api/checkoutService';
import { inventoryService } from '../../../data/api/inventoryService';
import { couponService } from '../../../data/api/couponService';
import { paymentService } from '../../../data/api/paymentService';
import { paymentReconciliationService } from '../../../data/api/paymentReconciliationService';
import { authService } from '../../../data/api/authService';
import { setOrders } from '../../../store/slices/orderSlice';
import { Order, PaymentMethod } from '../../../domain/types';
import { orderService } from '../../../data/api/orderService';
import { fraudDetectionService } from '../../../data/api/fraudDetectionService';
import { experimentService } from '../../../data/api/experimentService';
import { trackEvent } from '../../../monitoring/telemetry';
import {
  clearGuardState,
  enforceLocalVelocityGuard,
  recordGuardedFailure,
} from '../../../data/api/securityGuard';

type CheckoutNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Checkout'>;

export const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<CheckoutNavigationProp>();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector(selectCartItems);
  const cartTotal = useAppSelector(selectCartTotal);
  const { couponCode, couponDiscount, deliveryFee } = useAppSelector(state => state.cart);
  const user = useAppSelector(state => state.user.user);

  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('upi');
  const [scheduleOrder, setScheduleOrder] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [addresses, setAddresses] = useState<
    Array<{ id: string; label: string; address: string; isDefault?: boolean }>
  >([]);
  const [placingError, setPlacingError] = useState<string | null>(null);
  const isDevE2EAssist = __DEV__;

  const restaurantId = cartItems[0]?.restaurantId;

  useEffect(() => {
    const loadAddresses = async () => {
      const fallback = user?.addresses?.map(a => ({
        id: a.id,
        label: a.label,
        address: a.address,
        isDefault: a.isDefault,
      })) || [];

      const response = await authService.getAddresses();
      const apiAddresses =
        response.success && response.addresses
          ? response.addresses.map(a => ({
              id: a.id,
              label: a.label,
              address: a.address,
              isDefault: a.isDefault,
            }))
          : fallback;

      setAddresses(apiAddresses);
      const defaultAddress = apiAddresses.find(a => a.isDefault) || apiAddresses[0];
      if (defaultAddress) {
        setSelectedAddress(defaultAddress.id);
      }
    };

    loadAddresses();
  }, [user?.addresses]);

  useEffect(() => {
    const loadQuote = async () => {
      if (!restaurantId || !selectedAddress || cartItems.length === 0) {
        return;
      }

      const quote = await checkoutService.getPriceQuote(
        restaurantId,
        cartItems.map(item => ({
          menuItemId: item.item.id,
          quantity: item.quantity,
        })),
        selectedAddress,
      );

      if (quote.success && quote.quote) {
        dispatch(setDeliveryFee(quote.quote.deliveryFee));
      }
    };

    loadQuote();
  }, [cartItems, dispatch, restaurantId, selectedAddress]);

  const paymentMethods = [
    { id: 'upi', icon: '📱', name: 'UPI', subtitle: 'Google Pay, PhonePe, Paytm' },
    { id: 'card', icon: '💳', name: 'Credit/Debit Card', subtitle: 'Visa, Mastercard, RuPay' },
    { id: 'wallet', icon: '👛', name: 'Wallet', subtitle: 'Paytm, Amazon Pay' },
    { id: 'cod', icon: '💵', name: 'Cash on Delivery', subtitle: 'Pay when you receive' },
  ];

  const finalTotal = useMemo(
    () => cartTotal + deliveryFee - couponDiscount,
    [cartTotal, couponDiscount, deliveryFee],
  );

  const handlePlaceOrder = async () => {
    if (!restaurantId) {
      Alert.alert('Checkout Error', 'Cart is empty.');
      return;
    }
    if (!selectedAddress) {
      Alert.alert('Address Required', 'Please select a delivery address.');
      return;
    }

    setLoading(true);
    setPlacingError(null);
    await trackEvent('checkout_start', {
      cartTotal,
      itemCount: cartItems.length,
      paymentMethod: selectedPayment,
    });

    try {
      const localGuard = await enforceLocalVelocityGuard('order_place', {
        maxAttempts: 6,
        windowSec: 600,
        cooldownSec: 180,
        blockedMessage: 'Too many order attempts',
      });
      if (!localGuard.allowed) {
        throw new Error(localGuard.message || 'Please retry later.');
      }

      const cartValidation = await inventoryService.validateCart(
        restaurantId,
        cartItems.map(item => ({
          menuItemId: item.item.id,
          quantity: item.quantity,
        })),
      );
      if (!cartValidation.success || !cartValidation.validation?.valid) {
        throw new Error(
          cartValidation.validation?.issues?.join(', ') ||
            cartValidation.error ||
            'Cart items are no longer available.',
        );
      }

      const isOpen = await checkoutService.checkRestaurantHours(restaurantId);
      if (!isOpen.isOpen) {
        throw new Error(
          isOpen.nextOpensAt
            ? `Restaurant is closed. Opens at ${isOpen.nextOpensAt}`
            : 'Restaurant is closed right now.',
        );
      }

      if (couponInput.trim()) {
        const couponValidation = await couponService.validateCoupon(
          couponInput.trim().toUpperCase(),
          restaurantId,
          cartTotal,
        );
        if (!couponValidation.valid) {
          throw new Error(couponValidation.message || 'Coupon not eligible');
        }
      }

      const shouldRunFraudCheck = experimentService.getFeatureValue(
        'fraud_precheck',
        true,
      );
      if (shouldRunFraudCheck && user?.id) {
        const fraudCheck = await fraudDetectionService.checkOrder({
          userId: user.id,
          amount: finalTotal,
          items: cartItems.map(item => ({
            menuItemId: item.item.id,
            quantity: item.quantity,
          })),
          addressId: selectedAddress,
          couponCode: couponCode || undefined,
          paymentMethod: selectedPayment,
        });
        if (fraudCheck.action === 'block') {
          throw new Error('Order blocked by risk checks. Please contact support.');
        }
      }

      const orderResult = await checkoutService.placeOrder({
        restaurantId,
        items: cartItems.map(item => ({
          menuItemId: item.item.id,
          quantity: item.quantity,
        })),
        deliveryAddressId: selectedAddress,
        paymentMethod: selectedPayment as PaymentMethod,
        couponCode: couponCode || undefined,
      });

      if (!orderResult.success || !orderResult.orderId || !orderResult.paymentDetails) {
        throw new Error(orderResult.error || 'Order could not be placed.');
      }

      const paymentStatus = await paymentService.processPaymentWithRetry({
        orderId: orderResult.orderId,
        amount: orderResult.paymentDetails.amount,
        method: orderResult.paymentDetails.method,
      });

      const reconciliation = await paymentReconciliationService.reconcileOrderPayment(
        orderResult.orderId,
        paymentStatus,
      );
      const finalPaymentStatus = reconciliation.finalStatus;

      if (!reconciliation.success) {
        await trackEvent('payment_failed', {
          orderId: orderResult.orderId,
          method: selectedPayment,
          error: finalPaymentStatus.error,
          attempts: reconciliation.attempts,
          timedOut: reconciliation.timedOut,
        });
        throw new Error(
          finalPaymentStatus.error || 'Payment failed after reconciliation.',
        );
      }
      await trackEvent('payment_success', {
        orderId: orderResult.orderId,
        method: selectedPayment,
        source: finalPaymentStatus.source || 'unknown',
        attempts: reconciliation.attempts,
      });

      const actualOrders = await orderService.getOrders({
        page: 1,
        limit: 20,
      });
      if (actualOrders.success && actualOrders.orders) {
        dispatch(setOrders(actualOrders.orders as Order[]));
      }

      dispatch(clearCart());
      await clearGuardState('order_place');
      await trackEvent('checkout_complete', { orderId: orderResult.orderId });
      await trackEvent('order_placed', { orderId: orderResult.orderId });
      navigation.replace('OrderConfirmed', { orderId: orderResult.orderId });
    } catch (error: any) {
      await recordGuardedFailure('order_place');
      const message = error?.message || 'Unable to place order.';
      setPlacingError(message);
      Alert.alert('Checkout Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCoupon = () => {
    if (!restaurantId) {
      return;
    }

    const code = couponInput.trim().toUpperCase();
    if (!code) {
      return;
    }

    couponService.applyCoupon(code, restaurantId, cartTotal).then(result => {
      if (result.success && result.discount) {
        dispatch(applyCoupon({ code, discount: result.discount }));
      } else {
        trackEvent('support_contacted', {
          reason: 'coupon_apply_failure',
          code,
          errorCode: result.errorCode || 'unknown',
        });
        Alert.alert('Coupon Failed', result.error || 'Coupon not applicable');
      }
    });
  };

  const handleSimulateE2EOrder = async () => {
    const fakeOrderId = `E2E-${Date.now()}`;
    dispatch(clearCart());
    await trackEvent('checkout_complete', { orderId: fakeOrderId, mode: 'e2e-simulated' });
    navigation.replace('OrderConfirmed', { orderId: fakeOrderId });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="checkout-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Checkout</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          {addresses.map((addr) => (
            <TouchableOpacity
              key={addr.id}
              style={[
                styles.addressCard,
                selectedAddress === addr.id && styles.addressCardSelected,
              ]}
              onPress={() => setSelectedAddress(addr.id)}
            >
              <View style={styles.addressHeader}>
                <View style={styles.radioOuter}>
                  {selectedAddress === addr.id && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.addressLabel}>{addr.label}</Text>
              </View>
              <Text style={styles.addressText}>{addr.address}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addAddressButton}>
            <Text style={styles.addAddressIcon}>+</Text>
            <Text style={styles.addAddressText}>Add New Address</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Apply Coupon</Text>
            <TouchableOpacity>
              <Text style={styles.viewCoupons}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.couponInput}>
            <Input
              value={couponInput}
              onChangeText={setCouponInput}
              placeholder="Enter coupon code"
              containerStyle={styles.couponField}
            />
            <Button
              title="Apply"
              onPress={handleApplyCoupon}
              variant="secondary"
              style={styles.applyButton}
            />
          </View>
          {couponCode && (
            <View style={styles.appliedCoupon}>
              <Text style={styles.appliedCouponText}>✓ {couponCode} applied</Text>
              <Text style={styles.appliedDiscount}>-₹{couponDiscount}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentCard,
                selectedPayment === method.id && styles.paymentCardSelected,
              ]}
              onPress={() => setSelectedPayment(method.id)}
            >
              <View style={styles.paymentHeader}>
                <View style={styles.radioOuter}>
                  {selectedPayment === method.id && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.paymentIcon}>{method.icon}</Text>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentName}>{method.name}</Text>
                  <Text style={styles.paymentSubtitle}>{method.subtitle}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.scheduleRow}
            onPress={() => setScheduleOrder(!scheduleOrder)}
          >
            <Text style={styles.scheduleIcon}>📅</Text>
            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleTitle}>Schedule Order</Text>
              <Text style={styles.scheduleSubtitle}>Deliver at a specific time</Text>
            </View>
            <View style={[styles.toggle, scheduleOrder && styles.toggleActive]}>
              <View style={[styles.toggleThumb, scheduleOrder && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          {placingError && <Text style={styles.errorText}>{placingError}</Text>}
          <View style={styles.summaryCard}>
            {cartItems.map((item) => (
              <View key={item.id} style={styles.summaryItem}>
                <Text style={styles.summaryItemName}>
                  {item.quantity}x {item.item.name}
                </Text>
                <Text style={styles.summaryItemPrice}>₹{item.totalPrice}</Text>
              </View>
            ))}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Item Total</Text>
              <Text style={styles.summaryValue}>₹{cartTotal}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>₹{deliveryFee}</Text>
            </View>
            {couponDiscount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.success }]}>
                  Discount
                </Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>
                  -₹{couponDiscount}
                </Text>
              </View>
            )}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total to Pay</Text>
              <Text style={styles.totalValue}>₹{finalTotal}</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Total</Text>
          <Text style={styles.footerTotalValue}>₹{finalTotal}</Text>
        </View>
        <Button
          title="Place Order"
          onPress={handlePlaceOrder}
          loading={loading}
          style={styles.placeOrderButton}
          testID="checkout-place-order-button"
        />
      </View>
      {isDevE2EAssist && (
        <View style={[styles.devE2EBar, { paddingBottom: insets.bottom + spacing.xs }]}>
          <Button
            title="Simulate E2E Success"
            onPress={handleSimulateE2EOrder}
            variant="secondary"
            style={styles.devE2EButton}
            testID="checkout-simulate-success-button"
          />
        </View>
      )}
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
  headerSpacer: {
    width: 24,
    height: 24,
  },
  section: {
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  viewCoupons: {
    ...typography.captionMedium,
    color: colors.primary,
  },
  addressCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  addressCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  addressLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  addressText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 28,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
    padding: spacing.md,
  },
  addAddressIcon: {
    fontSize: 18,
    color: colors.primary,
    marginRight: spacing.sm,
  },
  addAddressText: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
  couponInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  couponField: {
    flex: 1,
    marginBottom: 0,
    marginRight: spacing.sm,
  },
  applyButton: {
    paddingVertical: spacing.md,
  },
  appliedCoupon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
  },
  appliedCouponText: {
    ...typography.captionMedium,
    color: colors.success,
  },
  appliedDiscount: {
    ...typography.bodyMedium,
    color: colors.success,
  },
  paymentCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  paymentCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  paymentSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  scheduleSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.success,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  summaryCard: {},
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  summaryItemName: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  summaryItemPrice: {
    ...typography.body,
    color: colors.textPrimary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  totalLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  totalValue: {
    ...typography.h4,
    color: colors.primary,
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
  footerTotal: {},
  footerTotalLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  footerTotalValue: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  placeOrderButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  devE2EBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    backgroundColor: colors.surface,
  },
  devE2EButton: {
    width: '100%',
  },
});

