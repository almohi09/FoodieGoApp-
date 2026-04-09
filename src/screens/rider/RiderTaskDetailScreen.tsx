import React, { useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import {
  riderService,
  RiderOrder,
  DeliveryProof,
} from '../../api/riderService';
import { showToast } from '../../utils/toast';
import { Colors } from '../../theme';

type RiderTaskDetailRouteProp = RouteProp<any, 'RiderTaskDetail'>;
type RiderTaskDetailNavigationProp = NativeStackNavigationProp<
  any,
  'RiderTaskDetail'
>;

export const RiderTaskDetailScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<RiderTaskDetailNavigationProp>();
  const route = useRoute<RiderTaskDetailRouteProp>();
  const insets = useSafeAreaInsets();

  const params = route.params || {};
  const { order: initialOrder } = params;
  const [order, setOrder] = useState<RiderOrder>(initialOrder);
  const [loading, setLoading] = useState(false);
  const [proofOtp, setProofOtp] = useState('');

  const handleCallCustomer = () => {
    Linking.openURL(`tel:${order.customerPhone}`);
  };

  const handleStartPickup = async () => {
    setLoading(true);
    try {
      const result = await riderService.startPickup(order.id);
      if (result.success && result.order) {
        setOrder(result.order);
      } else {
        showToast(result.error || 'Failed to start pickup', 'error');
      }
    } catch {
      showToast('Failed to start pickup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPickup = async () => {
    setLoading(true);
    try {
      const result = await riderService.confirmPickup(order.id);
      if (result.success && result.order) {
        setOrder(result.order);
      } else {
        showToast(result.error || 'Failed to confirm pickup', 'error');
      }
    } catch {
      showToast('Failed to confirm pickup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!proofOtp || proofOtp.length !== 6) {
      showToast('Please enter a valid 6-digit OTP', 'error');
      return;
    }
    setLoading(true);
    try {
      const proof: DeliveryProof = {
        type: 'otp',
        otp: proofOtp,
      };
      const result = await riderService.confirmDelivery(
        order.id,
        proof,
      );
      if (result.success) {
        showToast('Delivery completed!', 'success');
        navigation.goBack();
      } else {
        showToast(result.error || 'Failed to confirm delivery', 'error');
      }
    } catch {
      showToast('Failed to confirm delivery', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhotoProof = () => {
    showToast('Photo capture would open here. For MVP, using OTP proof.', 'info');
  };

  const renderStep = (
    step: string,
    status: 'completed' | 'current' | 'pending',
  ) => {
    const stepColors = {
      completed: colors.success,
      current: colors.primary,
      pending: colors.textTertiary,
    };
    const stepBg = {
      completed: colors.success + '20',
      current: colors.primary + '20',
      pending: colors.textTertiary + '20',
    };

    return (
      <View style={styles.stepRow} key={step}>
        <View style={[styles.stepCircle, { backgroundColor: stepBg[status] }]}>
          <Text style={[styles.stepIcon, { color: stepColors[status] }]}>
            {status === 'completed' ? '✓' : status === 'current' ? '●' : '○'}
          </Text>
        </View>
        <Text
          style={[
            styles.stepText,
            {
              color:
                status === 'pending' ? colors.textTertiary : colors.textPrimary,
            },
          ]}
        >
          {step}
        </Text>
      </View>
    );
  };

  const getSteps = () => {
    const steps: {
      label: string;
      status: 'completed' | 'current' | 'pending';
    }[] = [{ label: 'Order Assigned', status: 'completed' }];

    if (order.status === 'assigned') {
      steps.push({ label: 'Start Pickup', status: 'current' });
      steps.push({ label: 'Confirm Pickup', status: 'pending' });
      steps.push({ label: 'Deliver', status: 'pending' });
    } else if (order.status === 'picked_up') {
      steps.push({ label: 'Start Pickup', status: 'completed' });
      steps.push({ label: 'Confirm Pickup', status: 'current' });
      steps.push({ label: 'Deliver', status: 'pending' });
    } else if (order.status === 'out_for_delivery') {
      steps.push({ label: 'Start Pickup', status: 'completed' });
      steps.push({ label: 'Confirm Pickup', status: 'completed' });
      steps.push({ label: 'Deliver', status: 'current' });
    } else if (order.status === 'delivered') {
      steps.push({ label: 'Start Pickup', status: 'completed' });
      steps.push({ label: 'Confirm Pickup', status: 'completed' });
      steps.push({ label: 'Deliver', status: 'completed' });
    }

    return steps;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top, paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delivery Details</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Progress Steps */}
        <View style={[styles.stepsCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Delivery Progress
          </Text>
          {getSteps().map(step => renderStep(step.label, step.status))}
        </View>

        {/* Restaurant Info */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Pickup Location
          </Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>🏪</Text>
            <View style={styles.locationInfo}>
              <Text
                style={[styles.locationName, { color: colors.textPrimary }]}
              >
                {order.restaurantName}
              </Text>
              <Text
                style={[
                  styles.locationAddress,
                  { color: colors.textSecondary },
                ]}
              >
                {order.restaurantAddress}
              </Text>
            </View>
          </View>
          <TouchableOpacity activeOpacity={0.7}
            style={[styles.mapButton, { borderColor: colors.primary }]}
            onPress={() => {
              Linking.openURL(
                `https://www.google.com/maps/dir/?api=1&destination=${order.restaurantLat},${order.restaurantLng}`,
              );
            }}
          >
            <Text style={[styles.mapButtonText, { color: colors.primary }]}>
              Open in Maps
            </Text>
          </TouchableOpacity>
        </View>

        {/* Customer Info */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Drop Location
          </Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>🏠</Text>
            <View style={styles.locationInfo}>
              <Text
                style={[styles.locationName, { color: colors.textPrimary }]}
              >
                {order.customerName}
              </Text>
              <Text
                style={[
                  styles.locationAddress,
                  { color: colors.textSecondary },
                ]}
              >
                {order.customerAddress}
              </Text>
            </View>
          </View>
          <View style={styles.customerActions}>
            <TouchableOpacity activeOpacity={0.7}
              style={[
                styles.customerButton,
                { backgroundColor: colors.success },
              ]}
              onPress={handleCallCustomer}
            >
              <Text style={styles.customerButtonIcon}>📞</Text>
              <Text style={styles.customerButtonText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7}
              style={[
                styles.mapButton,
                { borderColor: colors.primary, flex: 1, marginLeft: 12 },
              ]}
              onPress={() => {
                Linking.openURL(
                  `https://www.google.com/maps/dir/?api=1&destination=${order.customerLat},${order.customerLng}`,
                );
              }}
            >
              <Text style={[styles.mapButtonText, { color: colors.primary }]}>
                Navigate
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Items */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Order Items
          </Text>
          {order.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={[styles.itemName, { color: colors.textPrimary }]}>
                {item.quantity}x {item.name}
              </Text>
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
              Delivery Fee
            </Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              ₹{order.deliveryFee}
            </Text>
          </View>
        </View>

        {/* Proof of Delivery (for delivery step) */}
        {order.status === 'out_for_delivery' && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Proof of Delivery
            </Text>
            <Text style={[styles.proofLabel, { color: colors.textSecondary }]}>
              Enter customer OTP to confirm delivery
            </Text>
            <View style={[styles.otpInput, { borderColor: colors.border }]}>
              <TextInput
                style={[styles.otpTextInput, { color: colors.textPrimary }]}
                placeholder="Enter 6-digit OTP"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                maxLength={6}
                value={proofOtp}
                onChangeText={setProofOtp}
              />
            </View>
            <TouchableOpacity activeOpacity={0.7}
              style={[styles.photoButton, { borderColor: colors.border }]}
              onPress={handleTakePhotoProof}
            >
              <Text style={styles.photoButtonIcon}>📷</Text>
              <Text
                style={[
                  styles.photoButtonText,
                  { color: colors.textSecondary },
                ]}
              >
                Or take photo proof
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Button */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.surface,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        {order.status === 'assigned' && (
          <TouchableOpacity activeOpacity={0.7}
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleStartPickup}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>Start Pickup</Text>
          </TouchableOpacity>
        )}
        {order.status === 'picked_up' && (
          <TouchableOpacity activeOpacity={0.7}
            style={[styles.actionButton, { backgroundColor: colors.success }]}
            onPress={handleConfirmPickup}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>Confirm Pickup</Text>
          </TouchableOpacity>
        )}
        {order.status === 'out_for_delivery' && (
          <TouchableOpacity activeOpacity={0.7}
            style={[styles.actionButton, { backgroundColor: colors.success }]}
            onPress={handleConfirmDelivery}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>Confirm Delivery</Text>
          </TouchableOpacity>
        )}
        {order.status === 'delivered' && (
          <View
            style={[styles.actionButton, { backgroundColor: colors.success }]}
          >
            <Text style={styles.actionButtonText}>✓ Delivered</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: Colors.TEXT_INVERSE,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_INVERSE,
  },
  headerRight: {
    width: 40,
  },
  stepsCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepText: {
    fontSize: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '500',
  },
  locationAddress: {
    fontSize: 14,
    marginTop: 4,
  },
  mapButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  mapButtonText: {
    fontWeight: '600',
  },
  customerActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  customerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  customerButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  customerButtonText: {
    color: Colors.TEXT_INVERSE,
    fontWeight: '600',
  },
  itemRow: {
    paddingVertical: 8,
  },
  itemName: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 14,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  proofLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  otpInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  otpTextInput: {
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 8,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  photoButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  photoButtonText: {
    fontSize: 14,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: Colors.TEXT_INVERSE,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RiderTaskDetailScreen;





