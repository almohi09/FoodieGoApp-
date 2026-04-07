import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../context/ThemeContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import {
  adminModerationService,
  ReportedItem,
  ApprovalQueueItem,
} from '../../../data/api/adminModerationService';

type AdminModerationNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AdminDashboard'
>;

type TabType = 'reports' | 'approvals';

const ReportedItemCard: React.FC<{
  item: ReportedItem;
  onPress: () => void;
  colors: any;
}> = ({ item, onPress, colors }) => {
  const statusColors: Record<string, string> = {
    pending: colors.warning,
    reviewed: colors.info,
    actioned: colors.error,
    dismissed: colors.textTertiary,
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <View
          style={[styles.typeBadge, { backgroundColor: colors.primary + '20' }]}
        >
          <Text style={[styles.typeBadgeText, { color: colors.primary }]}>
            {item.type.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColors[item.status] + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: statusColors[item.status] },
            ]}
          >
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text
        style={[styles.itemName, { color: colors.textPrimary }]}
        numberOfLines={1}
      >
        {item.itemName}
      </Text>
      {item.restaurantName && (
        <Text
          style={[styles.subText, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          Restaurant: {item.restaurantName}
        </Text>
      )}
      <Text
        style={[styles.reason, { color: colors.textSecondary }]}
        numberOfLines={2}
      >
        {item.reason}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={[styles.metaText, { color: colors.textTertiary }]}>
          By: {item.reporterName}
        </Text>
        <Text style={[styles.metaText, { color: colors.textTertiary }]}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const ApprovalItemCard: React.FC<{
  item: ApprovalQueueItem;
  onPress: () => void;
  colors: any;
}> = ({ item, onPress, colors }) => {
  const priorityColors: Record<string, string> = {
    low: colors.textTertiary,
    medium: colors.warning,
    high: colors.error,
  };

  const typeLabels: Record<string, string> = {
    seller_registration: 'Seller Registration',
    document_verification: 'Document Verification',
    menu_item: 'Menu Item',
    restaurant_edit: 'Restaurant Edit',
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <View
          style={[styles.typeBadge, { backgroundColor: colors.primary + '20' }]}
        >
          <Text style={[styles.typeBadgeText, { color: colors.primary }]}>
            {typeLabels[item.type] || item.type}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: priorityColors[item.priority] + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: priorityColors[item.priority] },
            ]}
          >
            {item.priority.toUpperCase()}
          </Text>
        </View>
      </View>
      {item.businessName && (
        <Text
          style={[styles.itemName, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {item.businessName}
        </Text>
      )}
      {item.sellerName && (
        <Text
          style={[styles.subText, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          Owner: {item.sellerName}
        </Text>
      )}
      <Text style={[styles.metaText, { color: colors.textTertiary }]}>
        Submitted: {new Date(item.submittedAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );
};

export const AdminModerationScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<AdminModerationNavigationProp>();

  const [activeTab, setActiveTab] = useState<TabType>('reports');
  const [reportedItems, setReportedItems] = useState<ReportedItem[]>([]);
  const [approvalItems, setApprovalItems] = useState<ApprovalQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportsPage, setReportsPage] = useState(1);
  const [approvalsPage, setApprovalsPage] = useState(1);
  const [hasMoreReports, setHasMoreReports] = useState(true);
  const [hasMoreApprovals, setHasMoreApprovals] = useState(true);
  const [filterStatus] = useState<
    ReportedItem['status'] | 'all'
  >('all');
  const [filterType, setFilterType] = useState<ReportedItem['type'] | 'all'>(
    'all',
  );

  const loadReportedItems = useCallback(
    async (page = 1, append = false) => {
      const params: any = { page, limit: 20 };
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterType !== 'all') params.type = filterType;

      const result = await adminModerationService.getReportedItems(params);
      if (result.success) {
        setReportedItems(prev =>
          append ? [...prev, ...(result.items || [])] : result.items || [],
        );
        setHasMoreReports((result.items?.length || 0) === 20);
        setReportsPage(page);
      }
      return result;
    },
    [filterStatus, filterType],
  );

  const loadApprovalItems = useCallback(async (page = 1, append = false) => {
    const result = await adminModerationService.getApprovalQueue({
      page,
      limit: 20,
    });
    if (result.success) {
      setApprovalItems(prev =>
        append ? [...prev, ...(result.items || [])] : result.items || [],
      );
      setHasMoreApprovals((result.items?.length || 0) === 20);
      setApprovalsPage(page);
    }
    return result;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      loadReportedItems(1, false),
      loadApprovalItems(1, false),
    ]);
    setLoading(false);
  }, [loadReportedItems, loadApprovalItems]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLoadMore = () => {
    if (activeTab === 'reports' && hasMoreReports && !loading) {
      loadReportedItems(reportsPage + 1, true);
    } else if (activeTab === 'approvals' && hasMoreApprovals && !loading) {
      loadApprovalItems(approvalsPage + 1, true);
    }
  };

  const handleItemPress = (item: ReportedItem | ApprovalQueueItem) => {
    if (item && typeof item === 'object' && 'type' in item) {
      navigation.navigate('AdminModerationDetail', { item: item as any });
    }
  };

  const renderReportedItem = ({ item }: { item: ReportedItem }) => (
    <ReportedItemCard
      item={item}
      onPress={() => handleItemPress(item)}
      colors={colors}
    />
  );

  const renderApprovalItem = ({ item }: { item: ApprovalQueueItem }) => (
    <ApprovalItemCard
      item={item}
      onPress={() => handleItemPress(item)}
      colors={colors}
    />
  );

  const renderEmpty = (message: string) => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {message}
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={[styles.filterBar, { backgroundColor: colors.surface }]}>
      <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
        Type:
      </Text>
      {(['all', 'restaurant', 'menu_item', 'review'] as const).map(type => (
        <TouchableOpacity
          key={type}
          style={[
            styles.filterChip,
            filterType === type && { backgroundColor: colors.primary },
          ]}
          onPress={() => {
            setFilterType(type);
            setTimeout(() => loadReportedItems(1, false), 0);
          }}
        >
          <Text
            style={[
              styles.filterChipText,
              { color: filterType === type ? '#FFF' : colors.textSecondary },
            ]}
          >
            {type === 'all' ? 'All' : type.replace('_', ' ')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
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
          <Text style={styles.headerTitle}>Moderation</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
            onPress={() => setActiveTab('reports')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'reports' && styles.activeTabText,
              ]}
            >
              Reports ({reportedItems.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'approvals' && styles.activeTab]}
            onPress={() => setActiveTab('approvals')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'approvals' && styles.activeTabText,
              ]}
            >
              Approvals ({approvalItems.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={(activeTab === 'reports' ? reportedItems : approvalItems) as any}
        keyExtractor={item => item.id}
        renderItem={
          (activeTab === 'reports'
            ? renderReportedItem
            : renderApprovalItem) as any
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={activeTab === 'reports' ? renderHeader : null}
        ListEmptyComponent={renderEmpty(
          activeTab === 'reports'
            ? 'No reported items found'
            : 'No pending approvals',
        )}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
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
    paddingBottom: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  headerSpacer: {
    width: 40,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FFF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  activeTabText: {
    color: '#000',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
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
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  subText: {
    fontSize: 13,
    marginBottom: 4,
  },
  reason: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  metaText: {
    fontSize: 11,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default AdminModerationScreen;
