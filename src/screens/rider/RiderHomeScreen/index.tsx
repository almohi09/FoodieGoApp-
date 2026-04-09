import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import supabase from '../../../config/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useRiderStore } from '../../../store/riderStore';
import { locationService } from '../../../services/locationService';
import { showToast } from '../../../utils/toast';
import { Colors } from '../../../theme';
import { RiderHomeSkeleton } from '../../../components/skeletons';
import styles from './styles';

const DEFAULT_COORDS = { latitude: 25.4358, longitude: 81.8463 };
const REQUEST_TIMEOUT_SECONDS = 30;

const haversineKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const earth = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earth * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

export const RiderHomeScreen: React.FC = () => {
  const profile = useAuthStore(state => state.profile);
  const {
    riderId,
    isOnline,
    currentDelivery,
    incomingDelivery,
    todayEarnings,
    todayDeliveries,
    onlineHours,
    initialize,
    setOnlineStatus,
    refreshCurrentDelivery,
    acceptDelivery,
    declineDelivery,
    confirmPickup,
    confirmDelivery,
  } = useRiderStore();

  const [showIncomingModal, setShowIncomingModal] = useState(false);
  const [countdown, setCountdown] = useState(REQUEST_TIMEOUT_SECONDS);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [minDelayDone, setMinDelayDone] = useState(false);

  const [mapLocation, setMapLocation] = useState(DEFAULT_COORDS);
  const [animatedLocation, setAnimatedLocation] = useState(DEFAULT_COORDS);
  const lastLocationRef = useRef(DEFAULT_COORDS);
  const locationTweenRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pulse = useRef(new Animated.Value(1)).current;
  const shimmer = useRef(new Animated.Value(0.35)).current;
  const modalSlide = useRef(new Animated.Value(420)).current;
  const toggleAnim = useRef(new Animated.Value(isOnline ? 1 : 0)).current;

  const assignedDelivery = currentDelivery || incomingDelivery;
  const isStepPickup = assignedDelivery
    ? assignedDelivery.status === 'confirmed' || assignedDelivery.status === 'preparing'
    : false;

  useEffect(() => {
    if (profile?.id) {
      void initialize(profile.id);
    }
  }, [initialize, profile?.id]);

  useEffect(() => {
    const stop = locationService.watchLocation(location => {
      const next = { latitude: location.lat, longitude: location.lng };
      setMapLocation(next);

      if (locationTweenRef.current) {
        clearInterval(locationTweenRef.current);
      }

      const start = lastLocationRef.current;
      let step = 0;
      const totalSteps = 12;
      locationTweenRef.current = setInterval(() => {
        step += 1;
        const progress = Math.min(step / totalSteps, 1);
        const frame = {
          latitude: start.latitude + (next.latitude - start.latitude) * progress,
          longitude: start.longitude + (next.longitude - start.longitude) * progress,
        };
        setAnimatedLocation(frame);
        if (progress >= 1 && locationTweenRef.current) {
          clearInterval(locationTweenRef.current);
          locationTweenRef.current = null;
          lastLocationRef.current = next;
        }
      }, 80);
    });

    void locationService.getCurrentLocation().then(location => {
      const initial = { latitude: location.lat, longitude: location.lng };
      setMapLocation(initial);
      setAnimatedLocation(initial);
      lastLocationRef.current = initial;
    });

    return () => {
      stop();
      if (locationTweenRef.current) {
        clearInterval(locationTweenRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!riderId) {
      return;
    }

    const channel = supabase
      .channel(`rider-live-${riderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `rider_id=eq.${riderId}`,
        },
        () => {
          void refreshCurrentDelivery();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshCurrentDelivery, riderId]);

  useEffect(() => {
    if (incomingDelivery && incomingDelivery.id !== activeRequestId) {
      setActiveRequestId(incomingDelivery.id);
      setCountdown(REQUEST_TIMEOUT_SECONDS);
      setShowIncomingModal(true);
      modalSlide.setValue(420);
      Animated.timing(modalSlide, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [activeRequestId, incomingDelivery, modalSlide]);

  useEffect(() => {
    if (!showIncomingModal || !incomingDelivery) {
      return;
    }

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          void declineDelivery(incomingDelivery.id);
          setShowIncomingModal(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [declineDelivery, incomingDelivery, showIncomingModal]);

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.35, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulseLoop.start();

    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.35, duration: 900, useNativeDriver: true }),
      ]),
    );
    shimmerLoop.start();

    return () => {
      pulseLoop.stop();
      shimmerLoop.stop();
    };
  }, [pulse, shimmer]);

  useEffect(() => {
    const timer = setTimeout(() => setMinDelayDone(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    Animated.timing(toggleAnim, {
      toValue: isOnline ? 1 : 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isOnline, toggleAnim]);

  const handleToggleOnline = async (next: boolean) => {
    await setOnlineStatus(next);
    await refreshCurrentDelivery();
  };

  const handleAccept = async () => {
    if (!incomingDelivery) {
      return;
    }
    const success = await acceptDelivery(incomingDelivery.id);
    if (success) {
      setShowIncomingModal(false);
      await refreshCurrentDelivery();
    }
  };

  const handleDecline = async () => {
    if (!incomingDelivery) {
      return;
    }
    const success = await declineDelivery(incomingDelivery.id);
    if (success) {
      setShowIncomingModal(false);
    }
  };

  const handlePrimaryAction = async () => {
    if (!assignedDelivery) {
      return;
    }

    if (isStepPickup) {
      await confirmPickup(assignedDelivery.id);
      return;
    }

    const success = await confirmDelivery(assignedDelivery.id);
    if (success) {
      showToast('Delivery completed successfully.', 'success');
    }
  };

  const mapRoute = useMemo(() => {
    if (!assignedDelivery) {
      return [] as Array<{ latitude: number; longitude: number }>;
    }

    if (isStepPickup) {
      return [
        animatedLocation,
        { latitude: assignedDelivery.restaurantLat, longitude: assignedDelivery.restaurantLng },
      ];
    }

    return [
      { latitude: assignedDelivery.restaurantLat, longitude: assignedDelivery.restaurantLng },
      { latitude: assignedDelivery.customerLat, longitude: assignedDelivery.customerLng },
    ];
  }, [animatedLocation, assignedDelivery, isStepPickup]);

  const distanceRemainingKm = useMemo(() => {
    if (!assignedDelivery) {
      return 0;
    }
    if (isStepPickup) {
      return haversineKm(
        animatedLocation.latitude,
        animatedLocation.longitude,
        assignedDelivery.restaurantLat,
        assignedDelivery.restaurantLng,
      );
    }
    return haversineKm(
      animatedLocation.latitude,
      animatedLocation.longitude,
      assignedDelivery.customerLat,
      assignedDelivery.customerLng,
    );
  }, [animatedLocation.latitude, animatedLocation.longitude, assignedDelivery, isStepPickup]);

  const statusColor = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.TEXT_PRIMARY, Colors.PRIMARY],
  });

  if (!minDelayDone) {
    return <RiderHomeSkeleton />;
  }

  const mapHeightStyle = assignedDelivery ? styles.map60 : styles.map50;

  return (
    <View style={styles.container}>
      <View style={[styles.mapSection, mapHeightStyle]}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: mapLocation.latitude,
            longitude: mapLocation.longitude,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          }}
        >
          <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
          <Marker coordinate={animatedLocation} title="You">
            <View style={styles.riderMarker}>
              <Icon name="bicycle" size={14} color={Colors.TEXT_INVERSE} />
            </View>
          </Marker>
          {assignedDelivery ? (
            <>
              <Marker
                coordinate={{ latitude: assignedDelivery.restaurantLat, longitude: assignedDelivery.restaurantLng }}
                title={assignedDelivery.restaurantName}
              />
              <Marker
                coordinate={{ latitude: assignedDelivery.customerLat, longitude: assignedDelivery.customerLng }}
                title={assignedDelivery.customerName}
              />
              <Polyline
                coordinates={mapRoute}
                strokeColor={Colors.PRIMARY}
                strokeWidth={4}
                lineDashPattern={[8, 8]}
              />
            </>
          ) : null}
        </MapView>
        {!isOnline ? <View style={styles.offlineMapOverlay} /> : null}
      </View>

      {assignedDelivery ? (
        <View style={styles.activePanel}>
          <View style={styles.stepHeaderRow}>
            <Text style={styles.stepHeaderText}>Step {isStepPickup ? 1 : 2} of 2</Text>
            <View style={styles.stepDotsRow}>
              <View style={[styles.stepDotIndicator, styles.stepDotDone]} />
              <View style={[styles.stepDotIndicator, !isStepPickup ? styles.stepDotDone : styles.stepDotPending]} />
            </View>
          </View>

          <View style={styles.stepBlock}>
            <View style={styles.stepBlockHeadRed}>
              <Text style={styles.stepBlockHeadText}>Go to Restaurant</Text>
            </View>
            <Text style={styles.stepBlockTitle}>{assignedDelivery.restaurantName}</Text>
            <Text style={styles.stepBlockSub}>Restaurant pickup point</Text>
          </View>

          <View style={styles.stepBlock}>
            <View style={styles.stepBlockHeadGreen}>
              <Text style={styles.stepBlockHeadText}>Deliver to Customer</Text>
            </View>
            <Text style={styles.stepBlockTitle}>{assignedDelivery.customerName}</Text>
            <Text style={styles.stepBlockSub}>{assignedDelivery.customerAddress}</Text>
          </View>

          <Text style={styles.distanceText}>{distanceRemainingKm.toFixed(1)} km away</Text>

          <TouchableOpacity activeOpacity={0.7} style={styles.primaryAction} onPress={() => void handlePrimaryAction()}>
            <Text style={styles.primaryActionText}>
              {isStepPickup ? 'Confirm Pickup' : 'Confirm Delivery'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.idlePanel}>
          <View style={styles.toggleWrap}>
            {isOnline ? (
              <Animated.View style={[styles.onlinePulseRing, { transform: [{ scale: pulse }] }]} />
            ) : null}
            <TouchableOpacity activeOpacity={0.7}
              style={[styles.bigToggle, isOnline ? styles.bigToggleOnline : styles.bigToggleOffline]}
              onPress={() => void handleToggleOnline(!isOnline)}
            >
              <Icon name="power" size={34} color={Colors.TEXT_INVERSE} />
            </TouchableOpacity>
          </View>

          <Animated.Text style={[styles.statusLine, { color: statusColor }]}>
            {isOnline ? 'You are online - waiting for orders' : 'You are offline'}
          </Animated.Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Deliveries</Text>
              <Text style={styles.statValue}>{todayDeliveries}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Earned</Text>
              <Text style={styles.statValue}>INR {todayEarnings.toFixed(0)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Hours online</Text>
              <Text style={styles.statValue}>{onlineHours.toFixed(1)}</Text>
            </View>
          </View>

          {isOnline ? (
            <View style={styles.waitingCard}>
              <Animated.View style={[styles.shimmer, { opacity: shimmer }]} />
              <Text style={styles.waitingTitle}>Waiting for orders</Text>
              <Text style={styles.waitingSub}>We&apos;ll notify you as soon as a delivery request arrives.</Text>
            </View>
          ) : null}
        </View>
      )}

      <Modal visible={showIncomingModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Animated.View style={[styles.requestSheet, { transform: [{ translateY: modalSlide }] }]}>
            <View style={styles.requestTop}>
              <Text style={styles.requestEarnAmount}>
                INR {incomingDelivery ? Math.max(30, incomingDelivery.total * 0.12).toFixed(0) : '0'}
              </Text>
              <Text style={styles.requestEarnLabel}>Estimated earnings</Text>
            </View>

            <View style={styles.requestMiddle}>
              <View style={styles.routeRow}>
                <Icon name="restaurant-outline" size={16} color={Colors.TEXT_SECONDARY} />
                <Text style={styles.routeDistance}>{incomingDelivery?.distanceKm.toFixed(1) || '0.0'} km</Text>
                <Icon name="person-outline" size={16} color={Colors.TEXT_SECONDARY} />
              </View>
              <Text style={styles.requestLine}>{incomingDelivery?.restaurantName || '-'}</Text>
              <Text style={styles.requestSub}>Restaurant area</Text>
              <Text style={styles.requestLine}>{incomingDelivery?.customerName || '-'}</Text>
              <Text style={styles.requestSub}>{incomingDelivery?.customerAddress || '-'}</Text>
              <Text style={styles.requestEta}>Estimated time: {Math.max(10, Math.round((incomingDelivery?.distanceKm || 1) * 6))} min</Text>
            </View>

            <View style={styles.requestBottom}>
              <View style={styles.timerTrack}>
                <View
                  style={[
                    styles.timerFill,
                    { width: `${(countdown / REQUEST_TIMEOUT_SECONDS) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.timerText}>
                00:{countdown.toString().padStart(2, '0')} seconds to respond
              </Text>

              <TouchableOpacity activeOpacity={0.7} style={styles.acceptFull} onPress={() => void handleAccept()}>
                <Text style={styles.acceptFullText}>ACCEPT</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7} style={styles.declineTextButton} onPress={() => void handleDecline()}>
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

export default RiderHomeScreen;


