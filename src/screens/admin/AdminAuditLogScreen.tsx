import React, { useCallback, useState } from 'react';
import { SkeletonBox } from '@/components/SkeletonLoader';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import {
  adminAuditService,
  AuditLogItem,
} from '../../api/adminAuditService';

type AdminAuditLogNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AdminDashboard'
>;

type FilterOutcome = 'all' | 'success' | 'failure';
type FilterTargetType =
  | 'all'
  | 'user'
  | 'seller'
  | 'order'
  | 'payout'
  | 'menu_item';

export const AdminAuditLogScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<AdminAuditLogNavigationProp>();
  const insets = useSafeAreaInsets();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<FilterOutcome>('all');
  const [targetTypeFilter, setTargetTypeFilter] =
    useState<FilterTargetType>('all');

  const loadData = useCallback(async () => {
    try {
      const result = await adminAuditService.getRecentLogs(100);
      if (result.items) {
        setLogs(result.items);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 500);
    loadData();
    return () => clearTimeout(t);
  }, [loadData]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      searchQuery === '' ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.targetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.targetType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesOutcome =
      outcomeFilter === 'all' || log.outcome === outcomeFilter;
    const matchesTargetType =
      targetTypeFilter === 'all' || log.targetType === targetTypeFilter;

    return matchesSearch && matchesOutcome && matchesTargetType;
  });

  const outcomeCounts = {
    all: logs.length,
    success: logs.filter(l => l.outcome === 'success').length,
    failure: logs.filter(l => l.outcome === 'failure').length,
  };

  const targetTypeCounts = {
    all: logs.length,
    user: logs.filter(l => l.targetType === 'user').length,
    seller: logs.filter(l => l.targetType === 'seller').length,
    order: logs.filter(l => l.targetType === 'order').length,
    payout: logs.filter(l => l.targetType === 'payout').length,
    menu_item: logs.filter(l => l.targetType === 'menu_item').length,
  };

  if (loading || !minDelayDone) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: 16 }]}>
        <SkeletonBox style={{ height: 220, marginBottom: 16, borderRadius: 16 }} />
        <SkeletonBox style={{ height: 18, width: '80%', marginBottom: 12 }} />
        <SkeletonBox style={{ height: 14, width: '57%', marginBottom: 10 }} />
        <SkeletonBox style={{ height: 14, width: '69%' }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.textPrimary }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Audit Logs</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.searchContainer}>
          <TextInput
            style={[
              styles.searchInput,
              { backgroundColor: 'rgba(255,255,255,0.15)', color: '#FFF' },
            ]}
            placeholder="Search actions, target IDs..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={[styles.filterSection, { backgroundColor: colors.surface }]}>
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
          Outcome:
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(['all', 'success', 'failure'] as FilterOutcome[]).map(outcome => (
            <TouchableOpacity activeOpacity={0.7}
              key={outcome}
              style={[
                styles.filterChip,
                outcomeFilter === outcome && {
                  backgroundColor:
                    outcome === 'success'
                      ? colors.success
                      : outcome === 'failure'
                        ? colors.error
                        : colors.primary,
                },
              ]}
              onPress={() => setOutcomeFilter(outcome)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      outcomeFilter === outcome ? '#FFF' : colors.textSecondary,
                  },
                ]}
              >
                {outcome.charAt(0).toUpperCase() + outcome.slice(1)} (
                {outcomeCounts[outcome]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text
          style={[
            styles.filterLabel,
            { color: colors.textSecondary, marginTop: 12 },
          ]}
        >
          Type:
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(
            [
              'all',
              'user',
              'seller',
              'order',
              'payout',
              'menu_item',
            ] as FilterTargetType[]
          ).map(type => (
            <TouchableOpacity activeOpacity={0.7}
              key={type}
              style={[
                styles.filterChip,
                targetTypeFilter === type && {
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={() => setTargetTypeFilter(type)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      targetTypeFilter === type ? '#FFF' : colors.textSecondary,
                  },
                ]}
              >
                {type === 'all' ? 'All' : type.replace('_', ' ')} (
                {targetTypeCounts[type]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredLogs}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.logCard, { backgroundColor: colors.surface }]}>
            <View style={styles.logHeader}>
              <Text style={[styles.logAction, { color: colors.textPrimary }]}>
                {item.action}
              </Text>
              <View
                style={[
                  styles.outcomeBadge,
                  {
                    backgroundColor:
                      item.outcome === 'success'
                        ? colors.success + '20'
                        : colors.error + '20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.outcomeBadgeText,
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
            </View>
            <View style={styles.logMeta}>
              <Text
                style={[styles.logMetaText, { color: colors.textTertiary }]}
              >
                {item.targetType}:{item.targetId.slice(0, 12)}...
              </Text>
              <Text
                style={[styles.logMetaText, { color: colors.textTertiary }]}
              >
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </View>
            {item.details && (
              <Text
                style={[styles.logDetails, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {item.details}
              </Text>
            )}
          </View>
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No audit logs found
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
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
  backIcon: { fontSize: 20, color: '#FFF', fontWeight: '700' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  headerSpacer: { width: 40 },
  searchContainer: { marginTop: 12 },
  searchInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
  },
  filterSection: { padding: 16 },
  filterLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  filterScroll: { gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  filterChipText: { fontSize: 12, fontWeight: '500' },
  listContent: { padding: 16 },
  logCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  logAction: { fontSize: 14, fontWeight: '600', flex: 1 },
  outcomeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  outcomeBadgeText: { fontSize: 10, fontWeight: '700' },
  logMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logMetaText: { fontSize: 11 },
  logDetails: { fontSize: 12, marginTop: 4 },
  emptyContainer: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 14 },
});

export default AdminAuditLogScreen;



