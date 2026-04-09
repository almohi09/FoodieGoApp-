import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import supabase from '../../../config/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useRiderStore } from '../../../store/riderStore';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import styles from './styles';

interface HistoryRow {
  id: string;
  amount: number;
  paid_at: string;
  restaurantName: string;
  customerArea: string;
  rating: number;
}

export const RiderHistoryScreen: React.FC = () => {
  const profile = useAuthStore(state => state.profile);
  const { riderId, initialize } = useRiderStore();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (profile?.id && !riderId) {
      void initialize(profile.id);
    }
  }, [initialize, profile?.id, riderId]);

  const load = async () => {
    if (!riderId) {
      return;
    }

    setLoading(true);
    setRefreshing(true);
    setError(null);
    try {

    let query = supabase
      .from('rider_earnings')
      .select('id,amount,paid_at,order_id')
      .eq('rider_id', riderId)
      .order('paid_at', { ascending: false });

    if (fromDate) {
      query = query.gte('paid_at', `${fromDate}T00:00:00.000Z`);
    }
    if (toDate) {
      query = query.lte('paid_at', `${toDate}T23:59:59.999Z`);
    }

    const { data: earnings } = await query.returns<
      Array<{ id: string; amount: number; paid_at: string; order_id: string }>
    >();

    const orderIds = (earnings || []).map(row => row.order_id);
    const { data: orders } = await supabase
      .from('orders')
      .select('id,restaurant_id,address_id')
      .in('id', orderIds)
      .returns<Array<{ id: string; restaurant_id: string; address_id: string }>>();

    const restaurantIds = [...new Set((orders || []).map(order => order.restaurant_id))];
    const addressIds = [...new Set((orders || []).map(order => order.address_id))];

    const [{ data: restaurants }, { data: addresses }] = await Promise.all([
      supabase
        .from('restaurants')
        .select('id,name')
        .in('id', restaurantIds)
        .returns<Array<{ id: string; name: string }>>(),
      supabase
        .from('addresses')
        .select('id,city,state')
        .in('id', addressIds)
        .returns<Array<{ id: string; city: string; state: string }>>(),
    ]);

    const orderMap = new Map((orders || []).map(order => [order.id, order]));
    const restMap = new Map((restaurants || []).map(rest => [rest.id, rest.name]));
    const addressMap = new Map((addresses || []).map(add => [add.id, `${add.city}, ${add.state}`]));

      setRows(
        (earnings || []).map(row => {
          const order = orderMap.get(row.order_id);
          return {
            id: row.id,
            amount: Number(row.amount),
            paid_at: row.paid_at,
            restaurantName: order ? restMap.get(order.restaurant_id) || 'Restaurant' : 'Restaurant',
            customerArea: order ? addressMap.get(order.address_id) || 'Area' : 'Area',
            rating: 5,
          };
        }),
      );
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Failed to load rider history.',
      );
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [riderId, fromDate, toDate]);

  const dateText = useMemo(() => {
    if (!fromDate && !toDate) {
      return 'All dates';
    }
    return `${fromDate || '...'} to ${toDate || '...'}`;
  }, [fromDate, toDate]);

  if (loading || !minDelayDone) {
    return <SkeletonLoader />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <Text style={styles.filterText}>{dateText}</Text>
        <TouchableOpacity activeOpacity={0.7} style={styles.filterButton} onPress={() => setShowFilter(true)}>
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setError(null);
              void load();
            }}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        refreshing={refreshing}
        onRefresh={() => void load()}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Text style={styles.title}>{new Date(item.paid_at).toLocaleString('en-IN')}</Text>
            <Text style={styles.text}>
              {item.restaurantName} {'->'} {item.customerArea}
            </Text>
            <Text style={styles.text}>INR {item.amount.toFixed(2)} | Rating {item.rating.toFixed(1)}</Text>
          </View>
        )}
        ListEmptyComponent={
          !error ? (
            <EmptyState
              illustration="no-orders"
              title="No delivery history"
              subtitle="Completed deliveries will appear here."
            />
          ) : null
        }
      />

      <Modal visible={showFilter} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Filter by date range</Text>
            <TextInput
              style={styles.input}
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="From (YYYY-MM-DD)"
            />
            <TextInput
              style={styles.input}
              value={toDate}
              onChangeText={setToDate}
              placeholder="To (YYYY-MM-DD)"
            />
            <TouchableOpacity activeOpacity={0.7} style={styles.action} onPress={() => setShowFilter(false)}>
              <Text style={styles.actionText}>Apply</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7}
              style={styles.action}
              onPress={() => {
                setFromDate('');
                setToDate('');
                setShowFilter(false);
              }}
            >
              <Text style={styles.actionText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default RiderHistoryScreen;
