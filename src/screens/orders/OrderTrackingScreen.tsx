import { useToast } from '@/components/Toast';
import React, { useState, useEffect, useCallback } from 'react';
import {View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../../theme';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { trackingService } from '../../api/trackingService';
import { OrderStatus } from '../../types';
import { MapView } from '../../components/common/MapView';

type OrderTrackingNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'OrderTracking'
>;
type OrderTrackingRouteProp = RouteProp<RootStackParamList, 'OrderTracking'>;

const ORDER_STEPS = [
  { id: 'confirmed', label: 'Confirmed', icon: '✓' },
  { id: 'preparing', label: 'Preparing', icon: '👨‍🍳' },
  { id: 'out_for_delivery', label: 'Out for Delivery', icon: '🛵' },
  { id: 'delivered', label: 'Delivered', icon: '🏠' },
];

export const OrderTrackingScreen: React.FC = () => {
  const { showToast } = useToast();
  const navigation = useNavigation<OrderTrackingNavigationProp>();
  const route = useRoute<OrderTrackingRouteProp>();
  const insets = useSafeAreaInsets();
  const { orderId } = route.params;

  const [currentStatus, setCurrentStatus] = useState<OrderStatus>('confirmed');
  const [eta, setEta] = useState(25);
  const [riderLocation, setRiderLocation] = useState({
    lat: 28.62,
    lng: 77.36,
  });
  const [restaurantLocation] = useState({ lat: 28.61, lng: 77.35 });
  const [deliveryLocation] = useState({ lat: 28.63, lng: 77.37 });
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [riderInfo] = useState({
    name: 'Rajesh Kumar',
    phone: '+919876543210',
  });
  const [deliveryProof] = useState({
    otp: '1234',
    signature: null,
    photo: null,
  });
  const [showProof, setShowProof] = useState(false);

  const handleCallRider = useCallback(() => {
    const phoneUrl = `tel:${riderInfo.phone}`;
    Linking.canOpenURL(phoneUrl).then(supported => {
      if (supported) {
        Linking.openURL(phoneUrl);
      } else {
        showToast({ type: 'info', message: 'Your device does not support phone calls.', });
      }
    });
  }, [riderInfo.phone]);

  const handleChatRider = useCallback(() => {
    const smsUrl = `sms:${riderInfo.phone}`;
    Linking.canOpenURL(smsUrl).then(supported => {
      if (supported) {
        Linking.openURL(smsUrl);
      } else {
        showToast({ type: 'info', message: 'Your device does not support SMS.' });
      }
    });
  }, [riderInfo.phone]);

  useEffect(() => {
    let stopTracking: (() => void) | null = null;

    const initRealtimeTracking = async () => {
      await trackingService.subscribeToPushNotifications(orderId);
      stopTracking = trackingService.startRealtimeTracking(
        orderId,
        {
          onStatusChange: status => setCurrentStatus(status),
          onETAUpdate: etaMinutes => setEta(etaMinutes),
          onRiderLocationUpdate: location => setRiderLocation(location),
          onError: errorMessage => setTrackingError(errorMessage),
        },
        8000,
      );
    };

    initRealtimeTracking();

    return () => {
      if (stopTracking) {
        stopTracking();
      }
    };
  }, [orderId]);

  const getStepStatus = (stepIndex: number) => {
    const statusOrder: OrderStatus[] = [
      'confirmed',
      'preparing',
      'out_for_delivery',
      'delivered',
    ];
    const currentIndex = statusOrder.findIndex(s => s === currentStatus);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <View
      style={[styles.container, { paddingTop: insets.top }]}
      testID="order-tracking-screen"
    >
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Track Order</Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.helpIcon}>❓</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.mapContainer}>
          <MapView
            origin={restaurantLocation}
            destination={deliveryLocation}
            riderLocation={riderLocation}
            showRoute={true}
            height={220}
          />

          <View style={styles.etaCard}>
            <Text style={styles.etaLabel}>Estimated Arrival</Text>
            <View style={styles.etaRow}>
              <Text style={styles.etaTime}>{eta}</Text>
              <Text style={styles.etaUnit}>min</Text>
            </View>
          </View>
        </View>

        <View style={styles.riderCard}>
          <View style={styles.riderAvatar}>
            <Text style={styles.riderEmoji}>🏍️</Text>
          </View>
          <View style={styles.riderInfo}>
            <Text style={styles.riderName}>{riderInfo.name}</Text>
            <Text style={styles.riderSubtext}>Your delivery partner</Text>
          </View>
          <View style={styles.riderActions}>
            <TouchableOpacity activeOpacity={0.7}
              style={styles.riderButton}
              onPress={handleCallRider}
            >
              <Text style={styles.riderButtonIcon}>📞</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7}
              style={styles.riderButton}
              onPress={handleChatRider}
            >
              <Text style={styles.riderButtonIcon}>💬</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>Order Status</Text>
          {trackingError && (
            <Text style={styles.errorText}>{trackingError}</Text>
          )}
          <View style={styles.stepsContainer}>
            {ORDER_STEPS.map((step, index) => {
              const status = getStepStatus(index);
              return (
                <View key={step.id} style={styles.stepRow}>
                  <View style={styles.stepIconContainer}>
                    <View
                      style={[
                        styles.stepIcon,
                        status === 'completed' && styles.stepIconCompleted,
                        status === 'active' && styles.stepIconActive,
                      ]}
                    >
                      {status === 'completed' ? (
                        <Text style={styles.stepIconText}>✓</Text>
                      ) : (
                        <Text style={styles.stepIconEmoji}>{step.icon}</Text>
                      )}
                    </View>
                    {index < ORDER_STEPS.length - 1 && (
                      <View
                        style={[
                          styles.stepLine,
                          status === 'completed' && styles.stepLineCompleted,
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.stepContent}>
                    <Text
                      style={[
                        styles.stepLabel,
                        status === 'active' && styles.stepLabelActive,
                      ]}
                    >
                      {step.label}
                    </Text>
                    {status === 'active' && (
                      <Text style={styles.stepTime}>In progress...</Text>
                    )}
                    {status === 'completed' && (
                      <Text style={styles.stepTime}>Completed</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderTitle}>Order #{orderId}</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => setShowProof(!showProof)}>
              <Text style={styles.orderDetails}>
                {showProof ? 'Hide Proof' : 'Delivery Proof'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantIcon}>🍕</Text>
            <View>
              <Text style={styles.restaurantName}>Pizza Palace</Text>
              <Text style={styles.orderItems}>
                1x Margherita Pizza, 1x Garlic Bread
              </Text>
            </View>
          </View>
          {showProof && currentStatus === 'delivered' && (
            <View style={styles.proofSection}>
              <View style={styles.proofRow}>
                <Text style={styles.proofLabel}>OTP Verified</Text>
                <Text style={[styles.proofValue, { color: colors.success }]}>
                  ✓ {deliveryProof.otp}
                </Text>
              </View>
              {deliveryProof.signature && (
                <View style={styles.proofRow}>
                  <Text style={styles.proofLabel}>Signature</Text>
                  <Text style={styles.proofValue}>Received</Text>
                </View>
              )}
              {deliveryProof.photo && (
                <View style={styles.proofRow}>
                  <Text style={styles.proofLabel}>Photo Proof</Text>
                  <Text style={styles.proofValue}>Captured</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  helpIcon: {
    fontSize: 20,
  },
  mapContainer: {
    position: 'relative',
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  mapText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  mapCoords: {
    ...typography.small,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  etaCard: {
    position: 'absolute',
    bottom: -40,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.lg,
  },
  etaLabel: {
    ...typography.caption,
    color: colors.textInverse,
    opacity: 0.9,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  etaTime: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textInverse,
  },
  etaUnit: {
    ...typography.body,
    color: colors.textInverse,
    marginLeft: spacing.xs,
  },
  riderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: spacing.lg,
    marginTop: spacing.xxxl,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  riderAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  riderEmoji: {
    fontSize: 28,
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  riderSubtext: {
    ...typography.small,
    color: colors.textSecondary,
  },
  riderActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  riderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  riderButtonIcon: {
    fontSize: 20,
  },
  stepsCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  stepsTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.small,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  stepsContainer: {
    paddingLeft: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  stepIconContainer: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIconCompleted: {
    backgroundColor: colors.success,
  },
  stepIconActive: {
    backgroundColor: colors.primary,
  },
  stepIconText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textInverse,
  },
  stepIconEmoji: {
    fontSize: 18,
  },
  stepLine: {
    width: 2,
    height: 30,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
  },
  stepLineCompleted: {
    backgroundColor: colors.success,
  },
  stepContent: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  stepLabel: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  stepLabelActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  stepTime: {
    ...typography.small,
    color: colors.textTertiary,
    marginTop: 2,
  },
  orderCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  orderTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  orderDetails: {
    ...typography.captionMedium,
    color: colors.primary,
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  restaurantName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  orderItems: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bottomSpacer: {
    height: 40,
  },
  proofSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  proofRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  proofLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  proofValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
});







