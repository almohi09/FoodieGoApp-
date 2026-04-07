import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useTheme } from '../../../context/ThemeContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import {
  adminModerationService,
  ReportedItem,
  ApprovalQueueItem,
} from '../../../data/api/adminModerationService';
import { adminAuditService } from '../../../data/api/adminAuditService';

type AdminModerationDetailNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AdminDashboard'
>;

type AdminModerationDetailRouteProp = RouteProp<
  RootStackParamList,
  'AdminModerationDetail'
>;

type ItemType = ReportedItem | ApprovalQueueItem;

const isReportedItem = (item: unknown): item is ReportedItem => {
  return (
    !!item &&
    typeof item === 'object' &&
    'type' in item &&
    'itemId' in item
  );
};

export const AdminModerationDetailScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<AdminModerationDetailNavigationProp>();
  const route = useRoute<AdminModerationDetailRouteProp>();
  const insets = useSafeAreaInsets();

  const item = route.params?.item as ItemType | undefined;
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [actionReason, setActionReason] = useState('');

  const isReported = isReportedItem(item);

  const logAudit = async (
    action: string,
    targetType: string,
    targetId: string,
    success: boolean,
    details?: string,
  ) => {
    await adminAuditService.recordEvent({
      actorRole: 'admin',
      action,
      targetType,
      targetId,
      outcome: success ? 'success' : 'failure',
      details,
    });
  };

  const handleDismiss = async () => {
    if (!notes.trim()) {
      Alert.alert(
        'Notes Required',
        'Please provide notes for dismissing this item.',
      );
      return;
    }
    setActionLoading(true);
    if (isReported) {
      const result = await adminModerationService.reviewReport(
        item.id,
        'dismissed',
        notes,
      );
      if (result.success) {
        await logAudit('dismiss_report', item.type, item.id, true, notes);
        Alert.alert('Success', 'Report has been dismissed.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await logAudit(
          'dismiss_report',
          item.type,
          item.id,
          false,
          result.error,
        );
        Alert.alert('Error', result.error || 'Failed to dismiss report');
      }
    } else {
      const result = await adminModerationService.rejectApproval(
        item.id,
        notes,
      );
      if (result.success) {
        await logAudit('reject_approval', item.type, item.id, true, notes);
        Alert.alert('Success', 'Approval request has been rejected.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await logAudit(
          'reject_approval',
          item.type,
          item.id,
          false,
          result.error,
        );
        Alert.alert('Error', result.error || 'Failed to reject approval');
      }
    }
    setActionLoading(false);
  };

  const handleApprove = async () => {
    setActionLoading(true);
    if (isReported) {
      const result = await adminModerationService.reviewReport(
        item.id,
        'actioned',
        notes,
      );
      if (result.success) {
        await logAudit('action_report', item.type, item.id, true, notes);
        Alert.alert('Success', 'Report has been actioned.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await logAudit(
          'action_report',
          item.type,
          item.id,
          false,
          result.error,
        );
        Alert.alert('Error', result.error || 'Failed to action report');
      }
    } else {
      const result = await adminModerationService.approveItem(item.id, notes);
      if (result.success) {
        await logAudit('approve_item', item.type, item.id, true, notes);
        Alert.alert('Success', 'Item has been approved.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await logAudit('approve_item', item.type, item.id, false, result.error);
        Alert.alert('Error', result.error || 'Failed to approve item');
      }
    }
    setActionLoading(false);
  };

  const handleTakeAction = async (
    action: 'warning' | 'remove' | 'suspend' | 'ban' | 'delete',
  ) => {
    if (!actionReason.trim()) {
      Alert.alert(
        'Reason Required',
        'Please provide a reason for this action.',
      );
      return;
    }
    setActionLoading(true);
    const targetType = isReported ? (item as ReportedItem).type : 'seller';
    const result = await adminModerationService.takeAction(
      targetType as any,
      item.id,
      action,
      actionReason,
    );
    if (result.success) {
      await logAudit(
        `take_action_${action}`,
        targetType,
        item.id,
        true,
        actionReason,
      );
      Alert.alert('Success', `Action "${action}" has been taken.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      await logAudit(
        `take_action_${action}`,
        targetType,
        item.id,
        false,
        result.error,
      );
      Alert.alert('Error', result.error || 'Failed to take action');
    }
    setActionLoading(false);
  };

  const renderReportedItemDetail = (report: ReportedItem) => (
    <>
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Report Details
        </Text>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Type
          </Text>
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
            {report.type.replace('_', ' ')}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Item
          </Text>
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
            {report.itemName}
          </Text>
        </View>
        {report.restaurantName && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Restaurant
            </Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
              {report.restaurantName}
            </Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Status
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: colors.primary + '20' },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: colors.primary }]}>
              {report.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Reporter
          </Text>
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
            {report.reporterName}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Reason
          </Text>
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
            {report.reason}
          </Text>
        </View>
        {report.description && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Description
            </Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
              {report.description}
            </Text>
          </View>
        )}
        {report.evidence && report.evidence.length > 0 && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Evidence
            </Text>
            <Text style={[styles.detailValue, { color: colors.primary }]}>
              {report.evidence.length} item(s) attached
            </Text>
          </View>
        )}
      </View>

      {report.status === 'pending' && (
        <>
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text
              style={[styles.sectionTitle, { color: colors.textSecondary }]}
            >
              Admin Notes
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Add notes for this review..."
              placeholderTextColor={colors.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text
              style={[styles.sectionTitle, { color: colors.textSecondary }]}
            >
              Take Action
            </Text>
            <Text style={[styles.actionHint, { color: colors.textSecondary }]}>
              Optional: Provide a reason for enforcement action
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Action reason (required for enforcement)..."
              placeholderTextColor={colors.textTertiary}
              value={actionReason}
              onChangeText={setActionReason}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.warning },
                ]}
                onPress={() => handleTakeAction('warning')}
                disabled={actionLoading}
              >
                <Text style={styles.actionButtonText}>Warn</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.error }]}
                onPress={() => handleTakeAction('remove')}
                disabled={actionLoading}
              >
                <Text style={styles.actionButtonText}>Remove</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.error }]}
                onPress={() => handleTakeAction('suspend')}
                disabled={actionLoading}
              >
                <Text style={styles.actionButtonText}>Suspend</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </>
  );

  const renderApprovalItemDetail = (approval: ApprovalQueueItem) => {
    const typeLabels: Record<string, string> = {
      seller_registration: 'Seller Registration',
      document_verification: 'Document Verification',
      menu_item: 'Menu Item',
      restaurant_edit: 'Restaurant Edit',
    };
    const priorityColors: Record<string, string> = {
      low: colors.textTertiary,
      medium: colors.warning,
      high: colors.error,
    };

    return (
      <>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Approval Details
          </Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Type
            </Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
              {typeLabels[approval.type] || approval.type}
            </Text>
          </View>
          {approval.businessName && (
            <View style={styles.detailRow}>
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                Business
              </Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {approval.businessName}
              </Text>
            </View>
          )}
          {approval.sellerName && (
            <View style={styles.detailRow}>
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                Seller
              </Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {approval.sellerName}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Priority
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: priorityColors[approval.priority] + '20' },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: priorityColors[approval.priority] },
                ]}
              >
                {approval.priority.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Submitted
            </Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
              {new Date(approval.submittedAt).toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Submission Data
          </Text>
          {Object.entries(approval.data)
            .slice(0, 5)
            .map(([key, value]) => (
              <View key={key} style={styles.detailRow}>
                <Text
                  style={[styles.detailLabel, { color: colors.textSecondary }]}
                >
                  {key}
                </Text>
                <Text
                  style={[styles.detailValue, { color: colors.textPrimary }]}
                >
                  {typeof value === 'object'
                    ? JSON.stringify(value)
                    : String(value)}
                </Text>
              </View>
            ))}
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Admin Notes
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.background,
                color: colors.textPrimary,
                borderColor: colors.border,
              },
            ]}
            placeholder="Add notes for this approval..."
            placeholderTextColor={colors.textTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </>
    );
  };

  if (!item) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Item not found
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.textPrimary }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isReported ? 'Report Review' : 'Approval Review'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isReported
          ? renderReportedItemDetail(item as ReportedItem)
          : renderApprovalItemDetail(item as ApprovalQueueItem)}

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Review Actions
          </Text>
          <View style={styles.primaryActions}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.success },
              ]}
              onPress={handleApprove}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isReported ? 'Action Report' : 'Approve'}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.textTertiary },
              ]}
              onPress={handleDismiss}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isReported ? 'Dismiss' : 'Reject'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    flex: 2,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  actionHint: {
    fontSize: 12,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
  },
});

export default AdminModerationDetailScreen;
