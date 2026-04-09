import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import supabase from '../../../config/supabase';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { OrderStatus } from '../../../api/ordersApi';
import { useOrderTracking } from '../../../hooks/useOrderTracking';
import styles from './styles';
import { Colors } from '../../../theme';
import { showToast } from '../../../utils/toast';
import { SkeletonBox } from '@/components/SkeletonLoader';

type OrderTrackingRoute = RouteProp<RootStackParamList, 'OrderTracking'>;
type TimelineStepKey = 'placed' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered';

const DEFAULT_COORDINATE = {
  latitude: 25.4358,
  longitude: 81.8463,
};

const TIMELINE_STEPS: Array<{ key: TimelineStepKey; label: string }> = [
  { key: 'placed', label: 'Order Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

const statusToStep = (status: OrderStatus): TimelineStepKey | 'cancelled' => {
  if (status === 'picked_up') {
    return 'out_for_delivery';
  }
  if (status === 'cancelled') {
    return 'cancelled';
  }
  return status as TimelineStepKey;
};

const formatDateTime = (iso: string | undefined) => {
  if (!iso) {
    return 'Pending';
  }

  const date = new Date(iso);
  return `${date.toLocaleDateString('en-IN')} ${date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const OrderTrackingScreen: React.FC = () => {
  const route = useRoute<OrderTrackingRoute>();
  const { orderId } = route.params;
  const {
    order,
    items,
    customerLocation,
    restaurantLocation,
    riderLocation,
    riderName,
    riderPhone,
    customerAddress,
    restaurantName,
    statusTimestamps,
    loading,
    error,
    refresh,
  } = useOrderTracking(orderId);

  const mapRef = useRef<MapView | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const riderAnimationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [animatedRider, setAnimatedRider] = useState(DEFAULT_COORDINATE);
  const animatedRiderRef = useRef(DEFAULT_COORDINATE);
  const hasInitializedRider = useRef(false);
  const mapHeight = Math.round(Dimensions.get('window').height * 0.55);

  const currentStep = statusToStep(order?.status || 'placed');
  const currentStepIndex = currentStep === 'cancelled'
    ? -1
    : TIMELINE_STEPS.findIndex(step => step.key === currentStep);

  const isCancelable = order?.status === 'placed' || order?.status === 'confirmed';

  const itemSummary = useMemo(() => {
    if (items.length === 0) {
      return 'No items';
    }

    return items
      .slice(0, 3)
      .map(item => `${item.quantity}x ${item.name}`)
      .join(', ');
  }, [items]);

  const polylineCoords = useMemo(() => {
    const restaurant = restaurantLocation || DEFAULT_COORDINATE;
    const customer = customerLocation || DEFAULT_COORDINATE;
    const rider = riderLocation || animatedRider || restaurant;
    return [restaurant, rider, customer];
  }, [animatedRider, customerLocation, restaurantLocation, riderLocation]);

  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.35, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );

    loop.start();
    return () => {
      loop.stop();
    };
  }, [pulse]);

  useEffect(() => {
    if (!riderLocation) {
      return;
    }

    if (riderAnimationRef.current) {
      clearInterval(riderAnimationRef.current);
    }

    const start = animatedRiderRef.current;
    const target = riderLocation;
    let step = 0;
    const totalSteps = 12;

    riderAnimationRef.current = setInterval(() => {
      step += 1;
      const progress = Math.min(step / totalSteps, 1);
      const next = {
        latitude: start.latitude + (target.latitude - start.latitude) * progress,
        longitude: start.longitude + (target.longitude - start.longitude) * progress,
      };

      animatedRiderRef.current = next;
      setAnimatedRider(next);

      if (progress >= 1 && riderAnimationRef.current) {
        clearInterval(riderAnimationRef.current);
        riderAnimationRef.current = null;
      }
    }, 75);

    return () => {
      if (riderAnimationRef.current) {
        clearInterval(riderAnimationRef.current);
      }
    };
  }, [riderLocation]);

  useEffect(() => {
    if (riderLocation && !hasInitializedRider.current) {
      hasInitializedRider.current = true;
      animatedRiderRef.current = riderLocation;
      setAnimatedRider(riderLocation);
    }
  }, [riderLocation]);

  useEffect(() => {
    const coords = [
      restaurantLocation || DEFAULT_COORDINATE,
      riderLocation || restaurantLocation || DEFAULT_COORDINATE,
      customerLocation || DEFAULT_COORDINATE,
    ];

    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 90, right: 50, bottom: 90, left: 50 },
        animated: true,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [customerLocation, restaurantLocation, riderLocation]);

  useEffect(() => {
    if (!order) {
      return;
    }

    if (order.status === 'delivered' || order.status === 'cancelled') {
      setCountdownSeconds(0);
      return;
    }

    const etaTarget = new Date(order.created_at).getTime() + 45 * 60 * 1000;

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((etaTarget - Date.now()) / 1000));
      setCountdownSeconds(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [order]);

  const handleCallRider = async () => {
    if (!riderPhone) {
      showToast('Phone number will appear once rider is assigned.', 'info');
      return;
    }

    const phoneUrl = `tel:${riderPhone}`;
    const canOpen = await Linking.canOpenURL(phoneUrl);
    if (canOpen) {
      await Linking.openURL(phoneUrl);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || !isCancelable) {
      return;
    }

    setIsCancelling(true);
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', order.id);

    setIsCancelling(false);

    if (updateError) {
      showToast(updateError.message || 'Unable to cancel order', 'error');
      return;
    }

    showToast('Your order has been cancelled.', 'success');
  };

  const handleSimulateDelivery = async () => {
    if (!order || !customerLocation || !restaurantLocation || isSimulating) {
      return;
    }

    setIsSimulating(true);

    const sequence: OrderStatus[] = ['placed', 'confirmed', 'preparing', 'picked_up', 'delivered'];
    const currentIndex = Math.max(sequence.indexOf(order.status), 0);

    const riderNameValue = order.rider_name || 'Ravi Singh';
    const riderPhoneValue = order.rider_phone || '+919887766554';

    const totalHops = sequence.length - 1;

    for (let index = currentIndex; index < sequence.length; index += 1) {
      const progress = totalHops === 0 ? 1 : index / totalHops;
      const riderLat =
        restaurantLocation.latitude +
        (customerLocation.latitude - restaurantLocation.latitude) * progress;
      const riderLng =
        restaurantLocation.longitude +
        (customerLocation.longitude - restaurantLocation.longitude) * progress;

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: sequence[index],
          rider_lat: riderLat,
          rider_lng: riderLng,
          rider_name: riderNameValue,
          rider_phone: riderPhoneValue,
        })
        .eq('id', order.id);

      if (updateError) {
        showToast(updateError.message || 'Simulation failed', 'error');
        break;
      }

      if (index < sequence.length - 1) {
        await wait(3000);
      }
    }

    setIsSimulating(false);
  };

  if (loading || !minDelayDone) {
    return (
      <View style={[styles.container, { padding: 16 }]}>
        <SkeletonBox style={{ height: 220, marginBottom: 16, borderRadius: 16 }} />
        <SkeletonBox style={{ height: 18, width: '78%', marginBottom: 12 }} />
        <SkeletonBox style={{ height: 14, width: '62%', marginBottom: 10 }} />
        <SkeletonBox style={{ height: 14, width: '70%' }} />
      </View>
    );
  }

  if (!order || error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Order tracking is unavailable.'}</Text>
        <TouchableOpacity activeOpacity={0.7} style={styles.retryButton} onPress={() => void refresh()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const minutes = Math.floor(countdownSeconds / 60);
  const seconds = countdownSeconds % 60;
  const riderDisplayName = riderName || 'Ravi Singh';
  const riderInitials = riderDisplayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('');

  return (
    <View style={styles.container}>
      <View style={[styles.mapContainer, { height: mapHeight }]}>
        <MapView
          ref={map => {
            mapRef.current = map;
          }}
          style={styles.map}
          initialRegion={{
            latitude: (restaurantLocation || DEFAULT_COORDINATE).latitude,
            longitude: (restaurantLocation || DEFAULT_COORDINATE).longitude,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }}
        >
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
          <Marker coordinate={restaurantLocation || DEFAULT_COORDINATE} title={restaurantName} />
          <Marker coordinate={customerLocation || DEFAULT_COORDINATE} title="Delivery Address" />
          <Marker coordinate={animatedRider} title={riderName} />
          <Polyline
            coordinates={polylineCoords}
            strokeColor={Colors.PRIMARY}
            strokeWidth={4}
          />
        </MapView>
      </View>

      <ScrollView>
        <View style={styles.timelineContainer}>
          <Text style={styles.timelineTitle}>Order timeline</Text>
          {TIMELINE_STEPS.map((step, index) => {
            const isCompleted = currentStepIndex >= 0 && index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isPending = !isCompleted && !isCurrent;

            const mappedTimestamp =
              step.key === 'out_for_delivery'
                ? statusTimestamps.picked_up
                : statusTimestamps[step.key];

            return (
              <View key={step.key} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  {isCurrent ? (
                    <Animated.View style={[styles.currentPulseRing, { transform: [{ scale: pulse }] }]}>
                      <View style={[styles.circleBase, styles.circleCurrent]} />
                    </Animated.View>
                  ) : (
                    <View
                      style={[
                        styles.circleBase,
                        isCompleted ? styles.circleCompleted : styles.circlePending,
                      ]}
                    />
                  )}
                  {index < TIMELINE_STEPS.length - 1 ? (
                    <View style={[styles.lineBase, (isCompleted || isCurrent) ? styles.lineCompleted : null]} />
                  ) : null}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>{step.label}</Text>
                  <Text style={styles.timelineTime}>
                    {isPending ? 'Pending' : formatDateTime(mappedTimestamp || order.updated_at)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Order details</Text>
          <Text style={styles.infoText}>Order ID: {order.id}</Text>
          <View style={styles.paymentBadge}>
            <Text style={styles.paymentBadgeText}>
              {`Payment: ${(order.payment_method || 'cod').toUpperCase()} | ${(order.payment_status || 'pending').toUpperCase()}`}
            </Text>
          </View>
          <Text style={styles.infoText}>Items: {itemSummary}</Text>
          <Text style={styles.infoText}>Total: INR {Number(order.total).toFixed(2)}</Text>
          <Text style={styles.infoText}>Address: {customerAddress}</Text>
          <Text style={styles.infoText}>
            ETA: {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
          </Text>

          <View style={styles.buttonRow}>
            {isCancelable ? (
              <TouchableOpacity activeOpacity={0.7}
                style={styles.cancelButton}
                onPress={() => void handleCancelOrder()}
                disabled={isCancelling}
              >
                <Text style={styles.cancelButtonText}>
                  {isCancelling ? 'Cancelling...' : 'Cancel Order'}
                </Text>
              </TouchableOpacity>
            ) : null}

            {__DEV__ ? (
              <TouchableOpacity activeOpacity={0.7}
                style={styles.simulateButton}
                onPress={() => void handleSimulateDelivery()}
                disabled={isSimulating}
              >
                <Text style={styles.simulateButtonText}>
                  {isSimulating ? 'Simulating...' : 'Simulate Delivery'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.riderCard}>
          <View style={styles.riderAvatar}>
            <Text style={styles.riderInitials}>{riderInitials || 'RG'}</Text>
          </View>
          <View style={styles.riderContent}>
            <Text style={styles.riderName}>{riderDisplayName}</Text>
            <View style={styles.riderMeta}>
              <Icon name="star" size={14} color={Colors.STAR} />
              <Text style={styles.riderRating}>4.8</Text>
            </View>
          </View>
          <TouchableOpacity activeOpacity={0.7} style={styles.callIconButton} onPress={() => void handleCallRider()}>
            <Icon name="call" size={18} color={Colors.TEXT_INVERSE} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default OrderTrackingScreen;


