import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Button } from '../../components/common';

type OrderConfirmedNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OrderConfirmed'>;
type OrderConfirmedRouteProp = RouteProp<RootStackParamList, 'OrderConfirmed'>;

export const OrderConfirmedScreen: React.FC = () => {
  const navigation = useNavigation<OrderConfirmedNavigationProp>();
  const route = useRoute<OrderConfirmedRouteProp>();
  const insets = useSafeAreaInsets();
  const { orderId } = route.params;

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(checkAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('MainTabs');
    }, 5000);

    return () => clearTimeout(timer);
  }, [scaleAnim, checkAnim, fadeAnim, navigation]);

  const checkScale = checkAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.2, 1],
  });

  return (
    <View
      style={[styles.container, { paddingTop: insets.top }]}
      testID="order-confirmed-screen"
    >
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.checkCircle}>
            <Animated.Text
              style={[
                styles.checkIcon,
                {
                  transform: [{ scale: checkScale }],
                  opacity: checkAnim,
                },
              ]}
            >
              ✓
            </Animated.Text>
          </View>
          <View style={styles.confetti}>
            <Text style={styles.confetti1}>🎉</Text>
            <Text style={styles.confetti2}>🎊</Text>
            <Text style={styles.confetti3}>✨</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
          <Text style={styles.title}>Order Confirmed!</Text>
          <Text style={styles.subtitle}>
            Your delicious food is being prepared
          </Text>
        </Animated.View>

        <Animated.View style={[styles.orderInfo, { opacity: fadeAnim }]}>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderIdLabel}>Order ID</Text>
            <Text style={styles.orderId}>{orderId}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.estimatedTime}>
            <Text style={styles.timeLabel}>Estimated Delivery</Text>
            <View style={styles.timeRow}>
              <Text style={styles.timeValue}>25-35</Text>
              <Text style={styles.timeUnit}>min</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.coinsEarned, { opacity: fadeAnim }]}>
          <Text style={styles.coinsIcon}>🪙</Text>
          <Text style={styles.coinsText}>+39 coins earned</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <Button
          title="Track Order"
          onPress={() => navigation.replace('OrderTracking', { orderId })}
          style={styles.trackButton}
          testID="order-confirmed-track-order-button"
        />
        <Button
          title="Back to Home"
          onPress={() => navigation.replace('MainTabs')}
          variant="text"
          style={styles.homeButton}
        />
      </Animated.View>

      <View style={[styles.footerNote, { paddingBottom: insets.bottom + spacing.md }]}>
        <Text style={styles.noteText}>
          Redirecting to home in 5 seconds...
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  checkIcon: {
    fontSize: 60,
    color: colors.surface,
    fontWeight: '700',
  },
  confetti: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  confetti1: {
    position: 'absolute',
    top: 0,
    left: 10,
    fontSize: 24,
  },
  confetti2: {
    position: 'absolute',
    top: 20,
    right: 10,
    fontSize: 24,
  },
  confetti3: {
    position: 'absolute',
    bottom: 10,
    left: 30,
    fontSize: 20,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  orderIdContainer: {
    alignItems: 'center',
    paddingRight: spacing.lg,
  },
  orderIdLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  orderId: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
    marginRight: spacing.lg,
  },
  estimatedTime: {
    alignItems: 'center',
  },
  timeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  timeValue: {
    ...typography.h2,
    color: colors.primary,
  },
  timeUnit: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  coinsEarned: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.loyaltyLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
  },
  coinsIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  coinsText: {
    ...typography.bodyMedium,
    color: colors.loyalty,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  trackButton: {
    width: '100%',
    marginBottom: spacing.sm,
  },
  homeButton: {
    width: '100%',
  },
  footerNote: {
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  noteText: {
    ...typography.small,
    color: colors.textTertiary,
  },
});




