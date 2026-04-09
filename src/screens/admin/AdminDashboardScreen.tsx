import { useToast } from '@/components/Toast';
import React, { useCallback, useEffect, useState } from 'react';
import {ActivityIndicator, // size="small"
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '@/theme/colors';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { adminDashboardService } from '../../api/adminDashboardService';
import { adminModerationService } from '../../api/adminModerationService';
import {
  adminUserService,
  Seller,
  User,
} from '../../api/adminUserService';
import {
  adminPayoutService,
  PayoutItem,
} from '../../api/adminPayoutService';
import {
  adminAuditService,
  AuditLogItem,
} from '../../api/adminAuditService';
import {
  dispatchService,
  DispatchOrder,
  DispatchRider,
  DispatchStatus,
} from '../../api/dispatchService';

type AdminDashboardNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AdminDashboard'
>;

const { width } = Dimensions.get('window');

interface StatCardProps {
  title: string;
  value: string;
  colors: any;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, colors }) => (
  <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
      {value}
    </Text>
    <Text style={[styles.statTitle, { color: colors.textSecondary }]}>
      {title}
    </Text>
  </View>
);

export const AdminDashboardScreen: React.FC = () => {
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const { colors, isDark } = theme;
  const navigation = useNavigation<AdminDashboardNavigationProp>();
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState({
    users: '0',
    sellers: '0',
    ordersToday: '0',
    revenueToday: 'INR 0',
  });
  const [alertsCount, setAlertsCount] = useState(0);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [userControls, setUserControls] = useState<User[]>([]);
  const [sellerControls, setSellerControls] = useState<Seller[]>([]);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [dispatchOrders, setDispatchOrders] = useState<DispatchOrder[]>([]);
  const [dispatchRiders, setDispatchRiders] = useState<DispatchRider[]>([]);
  const [dispatchSource, setDispatchSource] = useState<'remote' | 'local'>(
    'local',
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditSource, setAuditSource] = useState<'remote' | 'local'>('local');
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  const refreshDashboard = useCallback(async () => {
    const [
      dashboardStats,
      alerts,
      flagged,
      users,
      sellers,
      payoutQueue,
      recentAudit,
      dispatchBoard,
    ] = await Promise.all([
      adminDashboardService.getDashboardStats(),
      adminDashboardService.getAlerts(),
      adminModerationService.getReportedItems({ page: 1, limit: 10 }),
      adminUserService.getUsers({ page: 1, limit: 5, role: 'customer' }),
      adminUserService.getSellers({ page: 1, limit: 5 }),
      adminPayoutService.getPayoutQueue({
        page: 1,
        limit: 5,
        status: 'pending',
      }),
      adminAuditService.getRecentLogs(8),
      dispatchService.getDispatchBoard(8),
    ]);

    setStats({
      users: String(dashboardStats.stats?.totalUsers || 0),
      sellers: String(dashboardStats.stats?.totalSellers || 0),
      ordersToday: String(dashboardStats.stats?.ordersToday || 0),
      revenueToday: `INR ${Math.round(dashboardStats.stats?.revenueToday || 0)}`,
    });
    setAlertsCount(alerts.alerts?.length || 0);
    setFlaggedCount(flagged.items?.length || 0);
    setUserControls(users.users || []);
    setSellerControls(sellers.sellers || []);
    setPayouts(payoutQueue.items || []);
    setDispatchOrders(dispatchBoard.orders || []);
    setDispatchRiders(dispatchBoard.riders || []);
    setDispatchSource(dispatchBoard.source || 'local');
    setAuditLogs(recentAudit.items || []);
    setAuditSource(recentAudit.source || 'local');
  }, []);

  const logAudit = async (payload: {
    action: string;
    targetType: string;
    targetId: string;
    outcome: 'success' | 'failure';
    errorCode?: string;
    details?: string;
  }) => {
    await adminAuditService.recordEvent({
      actorRole: 'admin',
      action: payload.action,
      targetType: payload.targetType,
      targetId: payload.targetId,
      outcome: payload.outcome,
      errorCode: payload.errorCode,
      details: payload.details,
    });
  };

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  const withAction = async (actionId: string, fn: () => Promise<boolean>) => {
    setLoadingActionId(actionId);
    const ok = await fn();
    setLoadingActionId(null);
    if (ok) {
      await refreshDashboard();
    }
  };

  const handleUserToggle = async (user: User) => {
    await withAction(`user-${user.id}`, async () => {
      if (user.status === 'active') {
        const res = await adminUserService.suspendUser(
          user.id,
          'Pilot compliance hold',
        );
        if (!res.success) {
          await logAudit({
            action: 'suspend_user',
            targetType: 'user',
            targetId: user.id,
            outcome: 'failure',
            errorCode: res.errorCode,
            details: res.error,
          });
          showToast({ type: 'error', message: res.error || 'Unable to suspend user' });
        } else {
          await logAudit({
            action: 'suspend_user',
            targetType: 'user',
            targetId: user.id,
            outcome: 'success',
          });
        }
        return res.success;
      }
      const res = await adminUserService.reactivateUser(user.id);
      if (!res.success) {
        await logAudit({
          action: 'reactivate_user',
          targetType: 'user',
          targetId: user.id,
          outcome: 'failure',
          errorCode: res.errorCode,
          details: res.error,
        });
        showToast({ type: 'error', message: res.error || 'Unable to reactivate user' });
      } else {
        await logAudit({
          action: 'reactivate_user',
          targetType: 'user',
          targetId: user.id,
          outcome: 'success',
        });
      }
      return res.success;
    });
  };

  const handleSellerToggle = async (seller: Seller) => {
    await withAction(`seller-${seller.id}`, async () => {
      if (seller.status === 'approved') {
        const res = await adminUserService.suspendSeller(
          seller.id,
          'Pilot compliance hold',
        );
        if (!res.success) {
          await logAudit({
            action: 'suspend_seller',
            targetType: 'seller',
            targetId: seller.id,
            outcome: 'failure',
            errorCode: res.errorCode,
            details: res.error,
          });
          showToast({ type: 'error', message: res.error || 'Unable to suspend seller' });
        } else {
          await logAudit({
            action: 'suspend_seller',
            targetType: 'seller',
            targetId: seller.id,
            outcome: 'success',
          });
        }
        return res.success;
      }
      const res = await adminUserService.reactivateSeller(seller.id);
      if (!res.success) {
        await logAudit({
          action: 'reactivate_seller',
          targetType: 'seller',
          targetId: seller.id,
          outcome: 'failure',
          errorCode: res.errorCode,
          details: res.error,
        });
        showToast({ type: 'error', message: res.error || 'Unable to reactivate seller', });
      } else {
        await logAudit({
          action: 'reactivate_seller',
          targetType: 'seller',
          targetId: seller.id,
          outcome: 'success',
        });
      }
      return res.success;
    });
  };

  const handlePayoutAction = async (
    payout: PayoutItem,
    action: 'processing' | 'paid' | 'hold',
  ) => {
    await withAction(`payout-${payout.id}-${action}`, async () => {
      if (action === 'processing') {
        const res = await adminPayoutService.markProcessing(payout.id);
        if (!res.success) {
          await logAudit({
            action: 'payout_mark_processing',
            targetType: 'payout',
            targetId: payout.id,
            outcome: 'failure',
            errorCode: res.errorCode,
            details: res.error,
          });
          showToast({ type: 'error', message: res.error || 'Unable to mark processing', });
        } else {
          await logAudit({
            action: 'payout_mark_processing',
            targetType: 'payout',
            targetId: payout.id,
            outcome: 'success',
          });
        }
        return res.success;
      }
      if (action === 'paid') {
        const res = await adminPayoutService.markPaid(
          payout.id,
          `pilot-ref-${Date.now()}`,
        );
        if (!res.success) {
          await logAudit({
            action: 'payout_mark_paid',
            targetType: 'payout',
            targetId: payout.id,
            outcome: 'failure',
            errorCode: res.errorCode,
            details: res.error,
          });
          showToast({ type: 'error', message: res.error || 'Unable to mark paid', });
        } else {
          await logAudit({
            action: 'payout_mark_paid',
            targetType: 'payout',
            targetId: payout.id,
            outcome: 'success',
          });
        }
        return res.success;
      }
      const res = await adminPayoutService.holdPayout(
        payout.id,
        'Manual review required',
      );
      if (!res.success) {
        await logAudit({
          action: 'payout_hold',
          targetType: 'payout',
          targetId: payout.id,
          outcome: 'failure',
          errorCode: res.errorCode,
          details: res.error,
        });
        showToast({ type: 'error', message: res.error || 'Unable to hold payout', });
      } else {
        await logAudit({
          action: 'payout_hold',
          targetType: 'payout',
          targetId: payout.id,
          outcome: 'success',
        });
      }
      return res.success;
    });
  };

  const handleAssignRider = async (order: DispatchOrder) => {
    const candidate = dispatchRiders.find(rider => rider.isAvailable);
    if (!candidate) {
      showToast({ type: 'info', message: 'No rider available for assignment' });
      return;
    }
    await withAction(`dispatch-assign-${order.id}`, async () => {
      const result = await dispatchService.assignRider(order.id, candidate.id);
      if (!result.success) {
        await logAudit({
          action: 'dispatch_assign_rider',
          targetType: 'order',
          targetId: order.id,
          outcome: 'failure',
          errorCode: result.errorCode,
          details: result.error,
        });
        showToast({ type: 'error', message: result.error || 'Unable to assign rider', });
        return false;
      }
      await logAudit({
        action: 'dispatch_assign_rider',
        targetType: 'order',
        targetId: order.id,
        outcome: 'success',
        details: `rider=${candidate.id}`,
      });
      return true;
    });
  };

  const getNextDispatchStatus = (
    current: DispatchStatus,
  ): { next: DispatchStatus; actionText: string } | null => {
    if (current === 'assigned') {
      return { next: 'picked_up', actionText: 'Mark Picked' };
    }
    if (current === 'picked_up') {
      return { next: 'out_for_delivery', actionText: 'Start Delivery' };
    }
    if (current === 'out_for_delivery') {
      return { next: 'delivered', actionText: 'Mark Delivered' };
    }
    return null;
  };

  const handleDispatchProgress = async (order: DispatchOrder) => {
    const next = getNextDispatchStatus(order.status);
    if (!next) {
      return;
    }
    await withAction(`dispatch-progress-${order.id}-${next.next}`, async () => {
      const generatedOtp =
        next.next === 'delivered'
          ? `${Math.floor(1000 + Math.random() * 9000)}`
          : undefined;
      const result = await dispatchService.updateStatus(
        order.id,
        next.next,
        generatedOtp,
      );
      if (!result.success) {
        await logAudit({
          action: `dispatch_${next.next}`,
          targetType: 'order',
          targetId: order.id,
          outcome: 'failure',
          errorCode: result.errorCode,
          details: result.error,
        });
        showToast({ type: 'error', message: result.error || 'Unable to update status', });
        return false;
      }
      await logAudit({
        action: `dispatch_${next.next}`,
        targetType: 'order',
        targetId: order.id,
        outcome: 'success',
        details: result.order?.proofOtp
          ? `proofOtp=${result.order.proofOtp}`
          : undefined,
      });
      if (result.order?.proofOtp) {
        showToast({ type: 'info', message: `Proof OTP: ${result.order.proofOtp}`, });
      }
      return true;
    });
  };

  const handleLogout = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'LoginOptions' }],
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top }}
      testID="admin-dashboard-screen"
    >
      <View style={[styles.header, { backgroundColor: colors.textPrimary }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.adminName}>Admin</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity activeOpacity={0.7} onPress={toggleTheme} style={styles.headerButton}>
              <Text style={styles.headerIcon}>{isDark ? 'Light' : 'Dark'}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7}
              onPress={handleLogout}
              style={styles.headerButton}
            >
              <Text style={styles.headerIcon}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard title="Users" value={stats.users} colors={colors} />
        <StatCard title="Sellers" value={stats.sellers} colors={colors} />
        <StatCard
          title="Orders Today"
          value={stats.ordersToday}
          colors={colors}
        />
        <StatCard
          title="Revenue Today"
          value={stats.revenueToday}
          colors={colors}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Moderation Overview
        </Text>
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          <Text style={[styles.panelRow, { color: colors.textPrimary }]}>
            SLA Alerts: {alertsCount}
          </Text>
          <Text style={[styles.panelRow, { color: colors.textPrimary }]}>
            Flagged Items: {flaggedCount}
          </Text>
          <View style={styles.moderationButtons}>
            <TouchableOpacity activeOpacity={0.7}
              style={[styles.smallButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('AdminModeration')}
              testID="admin-moderation-button"
            >
              <Text style={styles.smallButtonText}>Reports & Approvals</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7}
              style={[
                styles.smallButton,
                { backgroundColor: colors.textTertiary },
              ]}
              onPress={() => navigation.navigate('ErrorCenter')}
              testID="admin-error-center-button"
            >
              <Text style={styles.smallButtonText}>Error Center</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          SLA & Performance
        </Text>
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          <TouchableOpacity activeOpacity={0.7}
            style={styles.fullRowButton}
            onPress={() => navigation.navigate('AdminSLABreach')}
            testID="admin-sla-breach-button"
          >
            <View style={styles.fullRowButtonContent}>
              <Text style={[styles.fullRowButtonIcon]}>SLA</Text>
              <View style={styles.fullRowButtonText}>
                <Text
                  style={[
                    styles.fullRowButtonTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  SLA Breach Investigation
                </Text>
                <Text
                  style={[
                    styles.fullRowButtonSub,
                    { color: colors.textSecondary },
                  ]}
                >
                  Investigate prep time, delivery delays
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.fullRowButtonArrow,
                { color: colors.textTertiary },
              ]}
            >
              â†’
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Settings
        </Text>
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          <TouchableOpacity activeOpacity={0.7}
            style={styles.fullRowButton}
            onPress={() => navigation.navigate('AdminNotificationPreferences')}
            testID="admin-notification-prefs-button"
          >
            <View style={styles.fullRowButtonContent}>
              <Text style={styles.fullRowButtonIcon}>bell</Text>
              <View style={styles.fullRowButtonText}>
                <Text
                  style={[
                    styles.fullRowButtonTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Notification Preferences
                </Text>
                <Text
                  style={[
                    styles.fullRowButtonSub,
                    { color: colors.textSecondary },
                  ]}
                >
                  Configure alerts and notification channels
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.fullRowButtonArrow,
                { color: colors.textTertiary },
              ]}
            >
              â†’
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          User Controls
        </Text>
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          {userControls.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No users loaded
            </Text>
          ) : (
            userControls.map(user => (
              <View
                key={user.id}
                style={[styles.row, { borderBottomColor: colors.border }]}
              >
                <View style={styles.meta}>
                  <Text
                    style={[styles.titleText, { color: colors.textPrimary }]}
                  >
                    {user.name || user.phone}
                  </Text>
                  <Text
                    style={[styles.subText, { color: colors.textSecondary }]}
                  >
                    {user.status} â€¢ orders {user.orderCount}
                  </Text>
                </View>
                <TouchableOpacity activeOpacity={0.7}
                  style={[
                    styles.smallAction,
                    {
                      backgroundColor:
                        user.status === 'active'
                          ? colors.error
                          : colors.success,
                    },
                  ]}
                  onPress={() => handleUserToggle(user)}
                  disabled={loadingActionId === `user-${user.id}`}
                >
                  {loadingActionId === `user-${user.id}` ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.smallActionText}>
                      {user.status === 'active' ? 'Suspend' : 'Reactivate'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Seller Controls
        </Text>
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          {sellerControls.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No sellers loaded
            </Text>
          ) : (
            sellerControls.map(seller => (
              <View
                key={seller.id}
                style={[styles.row, { borderBottomColor: colors.border }]}
              >
                <View style={styles.meta}>
                  <Text
                    style={[styles.titleText, { color: colors.textPrimary }]}
                  >
                    {seller.businessName}
                  </Text>
                  <Text
                    style={[styles.subText, { color: colors.textSecondary }]}
                  >
                    {seller.status} â€¢ orders {seller.totalOrders}
                  </Text>
                </View>
                {(seller.status === 'approved' ||
                  seller.status === 'suspended') && (
                  <TouchableOpacity activeOpacity={0.7}
                    style={[
                      styles.smallAction,
                      {
                        backgroundColor:
                          seller.status === 'approved'
                            ? colors.error
                            : colors.success,
                      },
                    ]}
                    onPress={() => handleSellerToggle(seller)}
                    disabled={loadingActionId === `seller-${seller.id}`}
                  >
                    {loadingActionId === `seller-${seller.id}` ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.smallActionText}>
                        {seller.status === 'approved'
                          ? 'Suspend'
                          : 'Reactivate'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Payout Monitoring
        </Text>
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          {payouts.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No pending payouts
            </Text>
          ) : (
            payouts.map(payout => (
              <View
                key={payout.id}
                style={[styles.row, { borderBottomColor: colors.border }]}
              >
                <View style={styles.meta}>
                  <Text
                    style={[styles.titleText, { color: colors.textPrimary }]}
                  >
                    {payout.sellerName}
                  </Text>
                  <Text
                    style={[styles.subText, { color: colors.textSecondary }]}
                  >
                    INR {Math.round(payout.amount)} â€¢ {payout.status}
                  </Text>
                </View>
                <View style={styles.actionGroup}>
                  <TouchableOpacity activeOpacity={0.7}
                    style={[
                      styles.smallAction,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={() => handlePayoutAction(payout, 'processing')}
                    disabled={
                      loadingActionId === `payout-${payout.id}-processing`
                    }
                  >
                    <Text style={styles.smallActionText}>Proc</Text>
                  </TouchableOpacity>
                  <TouchableOpacity activeOpacity={0.7}
                    style={[
                      styles.smallAction,
                      { backgroundColor: colors.success },
                    ]}
                    onPress={() => handlePayoutAction(payout, 'paid')}
                    disabled={loadingActionId === `payout-${payout.id}-paid`}
                  >
                    <Text style={styles.smallActionText}>Paid</Text>
                  </TouchableOpacity>
                  <TouchableOpacity activeOpacity={0.7}
                    style={[
                      styles.smallAction,
                      { backgroundColor: colors.error },
                    ]}
                    onPress={() => handlePayoutAction(payout, 'hold')}
                    disabled={loadingActionId === `payout-${payout.id}-hold`}
                  >
                    <Text style={styles.smallActionText}>Hold</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Dispatch Queue ({dispatchSource})
          </Text>
          <TouchableOpacity activeOpacity={0.7}
            onPress={() => navigation.navigate('AdminDispatchBoard')}
            testID="admin-dispatch-board-button"
          >
            <Text style={[styles.viewAllText, { color: colors.primary }]}>
              View Full Board
            </Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          {dispatchOrders.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No dispatch orders
            </Text>
          ) : (
            dispatchOrders.map(order => {
              const nextDispatchAction = getNextDispatchStatus(order.status);
              return (
                <View
                  key={order.id}
                  style={[styles.row, { borderBottomColor: colors.border }]}
                >
                  <View style={styles.meta}>
                    <Text
                      style={[styles.titleText, { color: colors.textPrimary }]}
                    >
                      #{order.id}
                    </Text>
                    <Text
                      style={[styles.subText, { color: colors.textSecondary }]}
                    >
                      {order.restaurantName} - INR {Math.round(order.amount)}
                    </Text>
                    <Text
                      style={[styles.subText, { color: colors.textSecondary }]}
                    >
                      {order.status}
                      {order.riderName ? ` - ${order.riderName}` : ''}
                      {order.proofOtp ? ` - OTP ${order.proofOtp}` : ''}
                    </Text>
                  </View>
                  <View style={styles.actionGroup}>
                    {(order.status === 'ready_for_pickup' ||
                      !order.riderId) && (
                      <TouchableOpacity activeOpacity={0.7}
                        style={[
                          styles.smallAction,
                          { backgroundColor: colors.primary },
                        ]}
                        onPress={() => handleAssignRider(order)}
                        disabled={
                          loadingActionId === `dispatch-assign-${order.id}`
                        }
                        testID={`dispatch-assign-${order.id}`}
                      >
                        <Text style={styles.smallActionText}>Assign</Text>
                      </TouchableOpacity>
                    )}
                    {nextDispatchAction && (
                      <TouchableOpacity activeOpacity={0.7}
                        style={[
                          styles.smallAction,
                          { backgroundColor: colors.success },
                        ]}
                        onPress={() => handleDispatchProgress(order)}
                        disabled={
                          loadingActionId ===
                          `dispatch-progress-${order.id}-${nextDispatchAction.next}`
                        }
                        testID={`dispatch-progress-${order.id}`}
                      >
                        <Text style={styles.smallActionText}>
                          {nextDispatchAction.actionText}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {(order.status as string) === 'cancelled' && (
                      <TouchableOpacity activeOpacity={0.7}
                        style={[
                          styles.smallAction,
                          { backgroundColor: colors.error },
                        ]}
                        onPress={() =>
                          showToast({
                            type: 'info',
                            message:
                              'For MVP, process refund manually from Razorpay dashboard.',
                          })
                        }
                        testID={`dispatch-refund-${order.id}`}
                      >
                        <Text style={styles.smallActionText}>Initiate Refund</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Security Audit Logs ({auditSource})
          </Text>
          <TouchableOpacity activeOpacity={0.7}
            onPress={() => navigation.navigate('AdminAuditLog')}
            testID="admin-audit-log-button"
          >
            <Text style={[styles.viewAllText, { color: colors.primary }]}>
              View Full
            </Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          {auditLogs.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No audit events captured yet
            </Text>
          ) : (
            auditLogs.map(item => (
              <View
                key={item.id}
                style={[styles.row, { borderBottomColor: colors.border }]}
              >
                <View style={styles.meta}>
                  <Text
                    style={[styles.titleText, { color: colors.textPrimary }]}
                  >
                    {item.action}
                  </Text>
                  <Text
                    style={[styles.subText, { color: colors.textSecondary }]}
                  >
                    {item.targetType}:{item.targetId.slice(0, 10)} -{' '}
                    {item.outcome}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.subText,
                    {
                      color:
                        item.outcome === 'success'
                          ? colors.success
                          : colors.error,
                    },
                  ]}
                >
                  {item.outcome.toUpperCase()}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity activeOpacity={0.7}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={refreshDashboard}
        >
          <Text style={styles.primaryButtonText}>Refresh Dashboard</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  adminName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.TEXT_INVERSE,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    minWidth: 60,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headerIcon: {
    fontSize: 12,
    color: Colors.TEXT_INVERSE,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    marginTop: -20,
    gap: 12,
  },
  statCard: {
    width: (width - 48) / 2,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingLeft: 4,
  },
  panel: {
    borderRadius: 16,
    padding: 14,
  },
  panelRow: {
    fontSize: 14,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  meta: {
    flex: 1,
    paddingRight: 8,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  subText: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
  },
  smallAction: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 56,
    alignItems: 'center',
  },
  smallActionText: {
    color: Colors.TEXT_INVERSE,
    fontSize: 12,
    fontWeight: '700',
  },
  actionGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: Colors.TEXT_INVERSE,
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  bottomSpacer: {
    height: 32,
  },
  moderationButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  smallButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonText: {
    color: Colors.TEXT_INVERSE,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  fullRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  fullRowButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fullRowButtonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  fullRowButtonText: {
    flex: 1,
  },
  fullRowButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  fullRowButtonSub: {
    fontSize: 12,
    marginTop: 2,
  },
  fullRowButtonArrow: {
    fontSize: 20,
    marginLeft: 12,
  },
});

export default AdminDashboardScreen;










