import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
import { Button } from '../../components/common';
import { mockCoupons } from '../../../data/api/mockData';
import { useAppSelector } from '../../hooks/useRedux';

type RewardsNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MainTabs'
>;

export const RewardsScreen: React.FC = () => {
  const navigation = useNavigation<RewardsNavigationProp>();
  const insets = useSafeAreaInsets();
  const user = useAppSelector(state => state.user.user);

  const coins = user?.foodieCoins || 1250;
  const isFoodiePass = user?.isFoodiePass || false;

  const benefits = [
    { icon: '🚀', title: 'Free Delivery', desc: 'On all orders above ₹199' },
    { icon: '⚡', title: 'Priority Support', desc: 'Skip the queue for help' },
    { icon: '🎉', title: 'Exclusive Deals', desc: 'Access member-only offers' },
    { icon: '💰', title: '2x Coins', desc: 'Earn double on every order' },
  ];

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Rewards</Text>
      </View>

      <View style={styles.coinsCard}>
        <View style={styles.coinsMain}>
          <View style={styles.coinsInfo}>
            <View style={styles.coinsBalance}>
              <Text style={styles.coinsIcon}>🪙</Text>
              <Text style={styles.coinsAmount}>{coins.toLocaleString()}</Text>
            </View>
            <Text style={styles.coinsLabel}>FoodieCoins</Text>
          </View>
          <View style={styles.coinsActions}>
            <TouchableOpacity
              style={styles.coinsButton}
              onPress={() => navigation.navigate('Checkout')}
            >
              <Text style={styles.coinsButtonText}>Redeem</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.coinsDivider} />
        <View style={styles.coinsFooter}>
          <Text style={styles.coinsHint}>
            100 coins = ₹10 off on your next order
          </Text>
          <Text style={styles.coinsArrow}>→</Text>
        </View>
      </View>

      {!isFoodiePass && (
        <View style={styles.foodiePassCard}>
          <View style={styles.passBadge}>
            <Text style={styles.passBadgeText}>PRO</Text>
          </View>
          <Text style={styles.passTitle}>Get FoodiePass</Text>
          <Text style={styles.passPrice}>₹99/month</Text>
          <View style={styles.benefitsGrid}>
            {benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <Text style={styles.benefitIcon}>{benefit.icon}</Text>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  <Text style={styles.benefitDesc}>{benefit.desc}</Text>
                </View>
              </View>
            ))}
          </View>
          <Button
            title="Get FoodiePass"
            onPress={() => {}}
            style={styles.passButton}
          />
        </View>
      )}

      {isFoodiePass && (
        <View style={styles.passActiveCard}>
          <View style={styles.passActiveHeader}>
            <Text style={styles.passActiveIcon}>👑</Text>
            <View>
              <Text style={styles.passActiveTitle}>FoodiePass Active</Text>
              <Text style={styles.passActiveExpiry}>Expires: 28 Feb 2024</Text>
            </View>
          </View>
          <View style={styles.passActiveBenefits}>
            <View style={styles.passBenefit}>
              <Text style={styles.passBenefitIcon}>✓</Text>
              <Text style={styles.passBenefitText}>Free Delivery</Text>
            </View>
            <View style={styles.passBenefit}>
              <Text style={styles.passBenefitIcon}>✓</Text>
              <Text style={styles.passBenefitText}>2x Coins</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.couponsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Coupons</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {mockCoupons.map(coupon => (
          <TouchableOpacity key={coupon.id} style={styles.couponCard}>
            <View style={styles.couponLeft}>
              <View style={styles.couponDiscount}>
                <Text style={styles.couponDiscountText}>
                  {coupon.discountType === 'flat'
                    ? `₹${coupon.discountValue}`
                    : `${coupon.discountValue}%`}
                </Text>
              </View>
              <View>
                <Text style={styles.couponCode}>{coupon.code}</Text>
                <Text style={styles.couponDesc}>{coupon.description}</Text>
              </View>
            </View>
            <View style={styles.couponRight}>
              <TouchableOpacity style={styles.applyButton}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.leaderboardSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Monthly Leaderboard</Text>
        </View>
        <View style={styles.leaderboardCard}>
          <View style={styles.leaderboardItem}>
            <Text style={styles.rank}>1</Text>
            <Text style={styles.leaderName}>Rahul S.</Text>
            <Text style={styles.leaderCoins}>4,250 🪙</Text>
          </View>
          <View style={styles.leaderboardItem}>
            <Text style={styles.rank}>2</Text>
            <Text style={styles.leaderName}>Priya M.</Text>
            <Text style={styles.leaderCoins}>3,890 🪙</Text>
          </View>
          <View style={[styles.leaderboardItem, styles.currentUserItem]}>
            <Text style={styles.rank}>12</Text>
            <Text style={styles.leaderName}>You</Text>
            <Text style={styles.leaderCoins}>1,250 🪙</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.sm,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  coinsCard: {
    backgroundColor: colors.primary,
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  coinsMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coinsInfo: {},
  coinsActions: {},
  coinsBalance: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinsIcon: {
    fontSize: 32,
    marginRight: spacing.sm,
  },
  coinsAmount: {
    ...typography.h1,
    color: colors.textInverse,
  },
  coinsLabel: {
    ...typography.body,
    color: colors.textInverse,
    opacity: 0.9,
  },
  coinsButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.sm,
  },
  coinsButtonText: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
  coinsDivider: {
    height: 1,
    backgroundColor: colors.surface,
    opacity: 0.2,
    marginVertical: spacing.md,
  },
  coinsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coinsHint: {
    ...typography.caption,
    color: colors.textInverse,
    opacity: 0.9,
  },
  coinsArrow: {
    ...typography.body,
    color: colors.textInverse,
  },
  foodiePassCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  passBadge: {
    backgroundColor: colors.loyalty,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  passBadgeText: {
    ...typography.small,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  passTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  passPrice: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  benefitsGrid: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  benefitText: {},
  benefitTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  benefitDesc: {
    ...typography.small,
    color: colors.textSecondary,
  },
  passButton: {
    width: '100%',
  },
  passActiveCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.loyalty,
    ...shadows.md,
  },
  passActiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  passActiveIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  passActiveTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  passActiveExpiry: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  passActiveBenefits: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  passBenefit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passBenefitIcon: {
    color: colors.success,
    marginRight: spacing.xs,
  },
  passBenefitText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  couponsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
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
  },
  seeAll: {
    ...typography.captionMedium,
    color: colors.primary,
  },
  couponCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  couponLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  couponDiscount: {
    backgroundColor: colors.successLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
  },
  couponDiscountText: {
    ...typography.bodyMedium,
    color: colors.success,
    fontWeight: '700',
  },
  couponCode: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  couponDesc: {
    ...typography.small,
    color: colors.textSecondary,
  },
  couponRight: {
    justifyContent: 'center',
  },
  applyButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
  },
  applyButtonText: {
    ...typography.captionMedium,
    color: colors.textInverse,
  },
  leaderboardSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  leaderboardCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  currentUserItem: {
    backgroundColor: colors.primary + '10',
  },
  rank: {
    ...typography.bodyMedium,
    color: colors.textTertiary,
    width: 30,
  },
  leaderName: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  leaderCoins: {
    ...typography.captionMedium,
    color: colors.loyalty,
  },
  bottomSpacer: {
    height: 40,
  },
});
