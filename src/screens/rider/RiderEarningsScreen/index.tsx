import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import supabase from '../../../config/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useRiderStore } from '../../../store/riderStore';
import { Colors } from '../../../theme';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import styles from './styles';

type Period = 'today' | 'week' | 'month';

interface EarningRow {
  id: string;
  order_id: string;
  amount: number;
  paid_at: string;
  orderStatus: string;
  restaurantName: string;
  customerArea: string;
}

export const RiderEarningsScreen: React.FC = () => {
  const profile = useAuthStore(state => state.profile);
  const { riderId, initialize } = useRiderStore();
  const [period, setPeriod] = useState<Period>('today');
  const [rows, setRows] = useState<EarningRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minDelayDone, setMinDelayDone] = useState(false);

  useEffect(() => {
    if (profile?.id && !riderId) {
      void initialize(profile.id);
    }
  }, [initialize, profile?.id, riderId]);

  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 500);
    return () => clearTimeout(t);
  }, []);

  const loadEarnings = async () => {
    if (!riderId) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const start = new Date();
      if (period === 'today') {
        start.setHours(0, 0, 0, 0);
      } else if (period === 'week') {
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
      } else {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
      }

      const { data: earnings } = await supabase
        .from('rider_earnings')
        .select('id,order_id,amount,paid_at')
        .eq('rider_id', riderId)
        .gte('paid_at', start.toISOString())
        .order('paid_at', { ascending: false })
        .returns<Array<{ id: string; order_id: string; amount: number; paid_at: string }>>();

      const earningRows = earnings || [];
      const orderIds = earningRows.map(row => row.order_id);
      const { data: orders } = await supabase
        .from('orders')
        .select('id,status,restaurant_id,address_id')
        .in('id', orderIds)
        .returns<Array<{ id: string; status: string; restaurant_id: string; address_id: string }>>();

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
      const restaurantMap = new Map((restaurants || []).map(rest => [rest.id, rest.name]));
      const addressMap = new Map((addresses || []).map(add => [add.id, `${add.city}, ${add.state}`]));

        setRows(
          earningRows.map(row => {
            const order = orderMap.get(row.order_id);
            return {
              ...row,
              orderStatus: order?.status || 'delivered',
              restaurantName: order ? restaurantMap.get(order.restaurant_id) || 'Restaurant' : 'Restaurant',
              customerArea: order ? addressMap.get(order.address_id) || 'Area' : 'Area',
            };
          }),
        );
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Failed to load rider earnings.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEarnings();
  }, [period, riderId]);

  const retryLoad = () => {
    setError(null);
    void loadEarnings();
  };

  const summary = useMemo(() => {
    const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
    const deliveries = rows.length;
    const avg = deliveries > 0 ? total / deliveries : 0;
    return { total, deliveries, avg };
  }, [rows]);

  const weeklyBars = useMemo(() => {
    const days: Array<{ label: string; amount: number }> = [];
    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - index);
      date.setHours(0, 0, 0, 0);
      const dayStart = date.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const amount = rows
        .filter(row => {
          const time = new Date(row.paid_at).getTime();
          return time >= dayStart && time < dayEnd;
        })
        .reduce((sum, row) => sum + Number(row.amount), 0);

      days.push({
        label: date.toLocaleDateString('en-IN', { weekday: 'short' }),
        amount,
      });
    }
    return days;
  }, [rows]);

  const maxBar = Math.max(1, ...weeklyBars.map(day => day.amount));
  const chartHeight = 170;
  const chartBottom = 132;
  const yTicks = [maxBar, maxBar * 0.66, maxBar * 0.33, 0];

  if (loading || !minDelayDone) {
    return <SkeletonLoader />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        {(['today', 'week', 'month'] as Period[]).map(key => {
          const active = key === period;
          const label = key === 'today' ? 'Today' : key === 'week' ? 'This Week' : 'This Month';
          return (
            <TouchableOpacity activeOpacity={0.7}
              key={key}
              style={[styles.tabChip, active ? styles.tabChipActive : null]}
              onPress={() => setPeriod(key)}
            >
              <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={retryLoad}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content}>
        {!error && rows.length === 0 ? (
          <EmptyState
            illustration="no-orders"
            title="No earnings yet"
            subtitle="Complete deliveries to start seeing your earnings."
          />
        ) : null}
        <View style={styles.heroWrap}>
          <Text style={styles.heroLabel}>Total earnings</Text>
          <Text style={styles.heroValue}>INR {summary.total.toFixed(0)}</Text>
          <Text style={styles.heroMeta}>
            {summary.deliveries} deliveries • Avg INR {summary.avg.toFixed(0)}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Last 7 days</Text>
          <Svg width="100%" height={chartHeight}>
            {yTicks.map((tick, index) => {
              const y = 18 + index * 32;
              return (
                <React.Fragment key={`tick-${index}`}>
                  <Line x1="28" y1={y} x2="300" y2={y} stroke={Colors.BORDER} strokeWidth="1" />
                  <SvgText x="2" y={y + 3} fill={Colors.TEXT_TERTIARY} fontSize="9">
                    {Math.round(tick)}
                  </SvgText>
                </React.Fragment>
              );
            })}
            {weeklyBars.map((day, index) => {
              const barWidth = 26;
              const gap = 14;
              const x = 34 + index * (barWidth + gap);
              const barHeight = (day.amount / maxBar) * 96;
              const y = chartBottom - barHeight;
              const isToday = index === weeklyBars.length - 1;
              return (
                <React.Fragment key={`${day.label}-${index}`}>
                  <Rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={isToday ? Colors.PRIMARY_DARK : Colors.PRIMARY}
                    rx={7}
                  />
                  <SvgText x={x + barWidth / 2} y={148} fill={Colors.TEXT_SECONDARY} fontSize="10" textAnchor="middle">
                    {day.label}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Deliveries</Text>
          {rows.map(row => (
            <View key={row.id} style={styles.listRow}>
              <View style={styles.listLeft}>
                <Text style={styles.listTitle}>{row.restaurantName}</Text>
                <Text style={styles.listText}>
                  {row.customerArea} • {new Date(row.paid_at).toLocaleString('en-IN')}
                </Text>
              </View>
              <Text style={styles.listAmount}>INR {Number(row.amount).toFixed(2)}</Text>
            </View>
          ))}
          {rows.length === 0 ? <Text style={styles.listText}>No earnings for selected period.</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Payout Info</Text>
          <Text style={styles.listText}>Earnings paid every Monday</Text>
          <Text style={styles.listText}>Bank account: XXXX XXXX 2451</Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default RiderEarningsScreen;
