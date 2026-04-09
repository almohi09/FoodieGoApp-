import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, // size="small"
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { useCartStore } from '../../../store/cartStore';
import { useAuthStore } from '../../../store/authStore';
import supabase from '../../../config/supabase';
import { createOrder } from '../../../api/ordersApi';
import { showToast } from '../../../utils/toast';
import { paymentService, CheckoutPaymentMethod } from '../../../services/paymentService';
import { notificationService } from '../../../services/notificationService';
import { Colors } from '../../../theme';
import styles from './styles';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface AddressRow {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
  lat?: number | null;
  lng?: number | null;
}

const TAX_RATE = 0.05;

export const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const items = useCartStore(state => state.items);
  const restaurantId = useCartStore(state => state.restaurantId);
  const restaurantName = useCartStore(state => state.restaurantName);
  const subtotal = useCartStore(state => state.subtotal);
  const deliveryFee = useCartStore(state => state.deliveryFee);
  const clearCart = useCartStore(state => state.clearCart);

  const [selectedPayment, setSelectedPayment] = useState<CheckoutPaymentMethod>('cod');
  const [couponCode, setCouponCode] = useState('');
  const [address, setAddress] = useState<AddressRow | null>(null);
  const [addressLoading, setAddressLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);

  const mapPreviewUrl = useMemo(() => {
    if (!address?.lat || !address?.lng) {
      return null;
    }
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${address.lat},${address.lng}&zoom=15&size=160x160&markers=${address.lat},${address.lng},red-pushpin`;
  }, [address?.lat, address?.lng]);

  const taxes = useMemo(() => Number((subtotal * TAX_RATE).toFixed(2)), [subtotal]);
  const grandTotal = useMemo(
    () => Number((subtotal + deliveryFee + taxes).toFixed(2)),
    [deliveryFee, subtotal, taxes],
  );

  useEffect(() => {
    const loadDefaultAddress = async () => {
      if (!user) {
        setAddressLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('addresses')
        .select('id,label,street,city,state,pincode,is_default,lat,lng')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .limit(1)
        .returns<AddressRow[]>();

      if (!error && data && data.length > 0) {
        setAddress(data[0]);
      }

      setAddressLoading(false);
    };

    void loadDefaultAddress();
  }, [user]);

  const handlePlaceOrder = async () => {
    if (!user || !restaurantId || items.length === 0) {
      showToast('Cart is empty');
      return;
    }

    if (!address) {
      showToast('Please set a delivery address');
      return;
    }

    setPlacingOrder(true);

    const createResult = await createOrder({
      userId: user.id,
      restaurantId,
      addressId: address.id,
      paymentMethod: selectedPayment,
      subtotal,
      deliveryFee,
      total: grandTotal,
      items,
    });

    if (!createResult.success || !createResult.order) {
      setPlacingOrder(false);
      showToast(createResult.error || 'Failed to place order');
      return;
    }

    const orderId = createResult.order.id;
    const notifyRestaurantOwners = async () => {
      const { data: owners } = await supabase
        .from('restaurant_owners')
        .select('user_id')
        .eq('restaurant_id', restaurantId)
        .returns<Array<{ user_id: string }>>();

      const ownerRows = owners || [];
      const customerName = profile?.name?.trim() || 'Customer';

      await Promise.all(
        ownerRows.map(owner =>
          notificationService.sendNotification({
            user_id: owner.user_id,
            title: 'New Order! ðŸ›µ',
            body: `Order #${orderId.slice(0, 8)} - INR ${grandTotal.toFixed(2)} from ${customerName}`,
            type: 'order_update',
            order_id: orderId,
          }),
        ),
      );
    };

    if (selectedPayment === 'cod') {
      await notifyRestaurantOwners();
      await notificationService.promptForOrderNotifications(user.id);
      setPlacingOrder(false);
      clearCart();
      navigation.replace('OrderTracking', { orderId });
      return;
    }

    const paymentResult = await paymentService.initiatePayment({
      orderId,
      amountInRupees: grandTotal,
      customerName: profile?.name || 'FoodieGo User',
      customerEmail: user.email || '',
      customerPhone: profile?.phone || user.phone || '',
      paymentMethod: selectedPayment,
    });

    if (!paymentResult.success) {
      await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          rejection_reason: 'Payment failed',
        })
        .eq('id', orderId);

      setPlacingOrder(false);
      showToast(paymentResult.error || 'Unable to complete payment', 'error');
      return;
    }

    await notifyRestaurantOwners();
    await notificationService.promptForOrderNotifications(user.id);
    setPlacingOrder(false);
    clearCart();
    navigation.replace('OrderTracking', { orderId });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Delivery address</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('LocationEntry')}>
              <Text style={styles.linkText}>Change</Text>
            </TouchableOpacity>
          </View>
          {addressLoading ? (
            <ActivityIndicator size="small" color={Colors.PRIMARY} />
          ) : address ? (
            <View style={styles.addressRow}>
              <View style={styles.addressContent}>
                <Text style={styles.addressLabel}>{address.label}</Text>
                <Text style={styles.addressLine}>
                  {address.street}, {address.city}, {address.state} {address.pincode}
                </Text>
              </View>
              <View style={styles.mapThumb}>
                {mapPreviewUrl ? (
                  <Image source={{ uri: mapPreviewUrl }} style={styles.mapThumbImage} />
                ) : (
                  <View style={styles.mapThumbPlaceholder}>
                    <Text style={styles.mapPin}>ðŸ“</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <Text style={styles.addressMissing}>No default address selected.</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order summary</Text>
          {items.map(item => (
            <View key={item.id} style={styles.summaryItemRow}>
              <Text style={styles.summaryItemText} numberOfLines={1}>
                {item.quantity} x {item.name}
              </Text>
              <Text style={styles.summaryItemValue}>INR {item.lineTotal.toFixed(2)}</Text>
            </View>
          ))}
          <Text style={styles.summaryRestaurant}>From: {restaurantName}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment method</Text>
          <TouchableOpacity activeOpacity={0.7}
            style={[styles.paymentOption, selectedPayment === 'cod' ? styles.paymentOptionActive : null]}
            onPress={() => setSelectedPayment('cod')}
          >
            <View style={styles.paymentContent}>
              <Text style={styles.paymentTitle}>Cash on Delivery</Text>
              <View style={styles.codBadge}>
                <Text style={styles.codBadgeText}>Pay on delivery</Text>
              </View>
            </View>
            <View style={[styles.radio, selectedPayment === 'cod' ? styles.radioSelected : null]}>
              {selectedPayment === 'cod' ? <View style={styles.radioDot} /> : null}
            </View>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.7}
            style={[styles.paymentOption, selectedPayment === 'upi' ? styles.paymentOptionActive : null]}
            onPress={() => setSelectedPayment('upi')}
          >
            <View style={styles.paymentContent}>
              <Text style={styles.paymentTitle}>UPI</Text>
            </View>
            <View style={[styles.radio, selectedPayment === 'upi' ? styles.radioSelected : null]}>
              {selectedPayment === 'upi' ? <View style={styles.radioDot} /> : null}
            </View>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.7}
            style={[styles.paymentOption, selectedPayment === 'card' ? styles.paymentOptionActive : null]}
            onPress={() => setSelectedPayment('card')}
          >
            <View style={styles.paymentContent}>
              <Text style={styles.paymentTitle}>Credit / Debit Card</Text>
            </View>
            <View style={[styles.radio, selectedPayment === 'card' ? styles.radioSelected : null]}>
              {selectedPayment === 'card' ? <View style={styles.radioDot} /> : null}
            </View>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.7}
            style={[styles.paymentOption, selectedPayment === 'netbanking' ? styles.paymentOptionActive : null]}
            onPress={() => setSelectedPayment('netbanking')}
          >
            <View style={styles.paymentContent}>
              <Text style={styles.paymentTitle}>Net Banking</Text>
            </View>
            <View style={[styles.radio, selectedPayment === 'netbanking' ? styles.radioSelected : null]}>
              {selectedPayment === 'netbanking' ? <View style={styles.radioDot} /> : null}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Apply coupon</Text>
          <TextInput
            value={couponCode}
            onChangeText={setCouponCode}
            placeholder="Enter coupon code"
            placeholderTextColor={Colors.TEXT_TERTIARY}
            style={styles.couponInput}
          />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>INR {subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery fee</Text>
            <Text style={styles.summaryValue}>INR {deliveryFee.toFixed(2)}</Text>
          </View>
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
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity activeOpacity={0.7}
          style={[styles.placeOrderButton, placingOrder ? styles.placeOrderButtonDisabled : null]}
          onPress={() => void handlePlaceOrder()}
          disabled={placingOrder}
        >
          {placingOrder ? (
            <ActivityIndicator size="small" color={Colors.TEXT_INVERSE} />
          ) : (
            <Text style={styles.placeOrderText}>Place Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CheckoutScreen;


