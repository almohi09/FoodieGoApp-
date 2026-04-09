import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import supabase from '../../../config/supabase';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { useAuthStore } from '../../../store/authStore';
import { useOwnerStore } from '../../../store/ownerStore';
import { notificationService } from '../../../services/notificationService';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import styles from './styles';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TabKey = 'new' | 'active' | 'completed' | 'cancelled';

interface OwnerOrderRow {
  id: string;
  user_id: string;
  status: string;
  total: number;
  payment_method: string | null;
  payment_status: string | null;
  created_at: string;
  rejection_reason: string | null;
  rider_id: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  itemsText: string;
}

interface RiderRow {
  id: string;
  user_id: string;
  vehicle_type: string | null;
  vehicle_number: string | null;
  is_online: boolean;
  profileName: string;
}

const REASONS = ['Item unavailable', 'Restaurant busy', 'Closing soon', 'Other'];

export const OwnerOrdersScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const profile = useAuthStore(state => state.profile);
  const {
    currentRestaurant,
    fetchCurrentRestaurant,
    acceptOrder,
    rejectOrder,
    updateOrderStatus,
    fetchPendingOrders,
  } = useOwnerStore();

  const [activeTab, setActiveTab] = useState<TabKey>('new');
  const [orders, setOrders] = useState<OwnerOrderRow[]>([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState(REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [riders, setRiders] = useState<RiderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [minDelayDone, setMinDelayDone] = useState(false);
  const autoRejectInFlight = useRef(new Set<string>());

  const loadOrders = async () => {
    if (!profile?.id) {
      return;
    }

    setLoading(true);
    setScreenError(null);
    try {
      if (!currentRestaurant) {
        await fetchCurrentRestaurant(profile.id);
      }

      const restaurantId = useOwnerStore.getState().currentRestaurant?.id;
      if (!restaurantId) {
        return;
      }

      const { data: orderRows } = await supabase
        .from('orders')
        .select('id,user_id,status,total,payment_method,payment_status,created_at,rejection_reason,rider_id,address_id')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .returns<
          Array<{
            id: string;
            user_id: string;
            status: string;
            total: number;
            payment_method: string | null;
            payment_status: string | null;
            created_at: string;
            rejection_reason: string | null;
            rider_id: string | null;
            address_id: string;
          }>
        >();

    const rows = orderRows || [];
    const userIds = [...new Set(rows.map(row => row.user_id))];
    const addressIds = [...new Set(rows.map(row => row.address_id))];

    const [{ data: profiles }, { data: addresses }, { data: items }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id,name,phone')
        .in('id', userIds)
        .returns<Array<{ id: string; name: string; phone: string | null }>>(),
      supabase
        .from('addresses')
        .select('id,street,city,state,pincode')
        .in('id', addressIds)
        .returns<Array<{ id: string; street: string; city: string; state: string; pincode: string }>>(),
      supabase
        .from('order_items')
        .select('order_id,name,quantity')
        .in('order_id', rows.map(row => row.id))
        .returns<Array<{ order_id: string; name: string; quantity: number }>>(),
    ]);

    const profileMap = new Map<string, { name: string; phone: string | null }>();
    (profiles || []).forEach(user => {
      profileMap.set(user.id, { name: user.name || 'Customer', phone: user.phone });
    });

    const addressMap = new Map<string, string>();
    (addresses || []).forEach(address => {
      addressMap.set(
        address.id,
        `${address.street}, ${address.city}, ${address.state} ${address.pincode}`,
      );
    });

    const itemsMap = new Map<string, string>();
    (items || []).forEach(item => {
      const nextItemText = `${item.quantity}x ${item.name}`;
      const prev = itemsMap.get(item.order_id);
      itemsMap.set(item.order_id, prev ? `${prev}, ${nextItemText}` : nextItemText);
    });

      setOrders(
        rows.map(row => ({
          id: row.id,
          user_id: row.user_id,
          status: row.status,
          total: Number(row.total),
          payment_method: row.payment_method,
          payment_status: row.payment_status,
          created_at: row.created_at,
          rejection_reason: row.rejection_reason,
          rider_id: row.rider_id,
          customerName: profileMap.get(row.user_id)?.name || 'Customer',
          customerPhone: profileMap.get(row.user_id)?.phone || '',
          customerAddress: addressMap.get(row.address_id) || 'Address not available',
          itemsText: itemsMap.get(row.id) || 'No items',
        })),
      );

      await fetchPendingOrders();
    } catch (error) {
      setScreenError(
        error instanceof Error ? error.message : 'Failed to load owner orders.',
      );
    } finally {
      setLoading(false);
    }
  };

  const loadRiders = async () => {
    const { data: riderRows } = await supabase
      .from('riders')
      .select('id,user_id,vehicle_type,vehicle_number,is_online')
      .eq('is_online', true)
      .returns<
        Array<{ id: string; user_id: string; vehicle_type: string | null; vehicle_number: string | null; is_online: boolean }>
      >();

    const rows = riderRows || [];
    const userIds = [...new Set(rows.map(row => row.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id,name')
      .in('id', userIds)
      .returns<Array<{ id: string; name: string }>>();

    const map = new Map<string, string>();
    (profiles || []).forEach(profileRow => {
      map.set(profileRow.id, profileRow.name || 'Rider');
    });

    setRiders(
      rows.map(row => ({
        ...row,
        profileName: map.get(row.user_id) || 'Rider',
      })),
    );
  };

  useEffect(() => {
    void loadOrders();
  }, [profile?.id, currentRestaurant?.id]);

  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const restaurantId = currentRestaurant?.id;
    if (!restaurantId) {
      return;
    }

    const channel = supabase
      .channel(`owner-orders-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        payload => {
          if (payload.eventType === 'INSERT') {
            Vibration.vibrate(350);
          }
          void loadOrders();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentRestaurant?.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newOrders = orders.filter(order => order.status === 'placed');

      newOrders.forEach(order => {
        const ageMs = now - new Date(order.created_at).getTime();
        if (ageMs >= 5 * 60 * 1000 && !autoRejectInFlight.current.has(order.id)) {
          autoRejectInFlight.current.add(order.id);
          void rejectOrder(order.id, 'Auto-rejected: No response in 5 minutes').then(() => {
            autoRejectInFlight.current.delete(order.id);
            void loadOrders();
          });
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [orders, rejectOrder]);

  const filteredOrders = useMemo(() => {
    if (activeTab === 'new') {
      return orders.filter(order => order.status === 'placed');
    }
    if (activeTab === 'active') {
      return orders.filter(
        order => ['confirmed', 'preparing', 'picked_up'].includes(order.status),
      );
    }
    if (activeTab === 'completed') {
      return orders.filter(order => order.status === 'delivered');
    }
    return orders.filter(order => order.status === 'cancelled');
  }, [activeTab, orders]);

  const tabCounts = useMemo(
    () => ({
      new: orders.filter(order => order.status === 'placed').length,
      active: orders.filter(order => ['confirmed', 'preparing', 'picked_up'].includes(order.status)).length,
      completed: orders.filter(order => order.status === 'delivered').length,
      cancelled: orders.filter(order => order.status === 'cancelled').length,
    }),
    [orders],
  );

  const handleAccept = async (orderId: string) => {
    const success = await acceptOrder(orderId);
    if (success) {
      await loadOrders();
    }
  };

  const openReject = (orderId: string) => {
    setSelectedOrderId(orderId);
    setSelectedReason(REASONS[0]);
    setCustomReason('');
    setShowRejectModal(true);
  };

  const submitReject = async () => {
    if (!selectedOrderId) {
      return;
    }

    const reason = selectedReason === 'Other' ? customReason.trim() || 'Other' : selectedReason;
    const success = await rejectOrder(selectedOrderId, reason);
    if (success) {
      setShowRejectModal(false);
      await loadOrders();
    }
  };

  const handleMarkReady = async (orderId: string) => {
    const success = await updateOrderStatus(orderId, 'preparing');
    if (success) {
      await loadOrders();
    }
  };

  const openAssignRider = async (orderId: string) => {
    setSelectedOrderId(orderId);
    await loadRiders();
    setShowRiderModal(true);
  };

  const assignRider = async (riderId: string) => {
    if (!selectedOrderId) {
      return;
    }

    const selectedOrder = orders.find(order => order.id === selectedOrderId);
    const selectedRider = riders.find(rider => rider.id === riderId);

    const { error } = await supabase
      .from('orders')
      .update({ rider_id: riderId, rider_assigned_at: new Date().toISOString() })
      .eq('id', selectedOrderId);

    if (!error) {
      if (selectedOrder && selectedRider) {
        const customerArea = selectedOrder.customerAddress.split(',')[0]?.trim() || 'Customer area';
        await notificationService.sendNotification({
          user_id: selectedOrder.user_id,
          title: 'Rider on the way!',
          body: `${selectedRider.profileName} is heading to pick up your order`,
          type: 'order_update',
          order_id: selectedOrder.id,
        });

        await notificationService.sendNotification({
          user_id: selectedRider.user_id,
          title: 'New Delivery Request',
          body: `${currentRestaurant?.name || 'Restaurant'} - ${customerArea} - INR ${Math.max(
            30,
            Number((selectedOrder.total * 0.12).toFixed(2)),
          ).toFixed(2)}`,
          type: 'order_update',
          order_id: selectedOrder.id,
        });
      }

      setShowRiderModal(false);
      await loadOrders();
    }
  };

  const renderOrder = ({ item }: { item: OwnerOrderRow }) => {
    const remainingMs = 5 * 60 * 1000 - (Date.now() - new Date(item.created_at).getTime());
    const warning = item.status === 'placed' && remainingMs > 0 && remainingMs < 5 * 60 * 1000;
    const mins = Math.max(0, Math.floor(remainingMs / 60000));
    const secs = Math.max(0, Math.floor((remainingMs % 60000) / 1000));
    const isPlaced = item.status === 'placed';
    const isActive = ['confirmed', 'preparing', 'picked_up'].includes(item.status);
    const isCompleted = item.status === 'delivered';

    return (
      <TouchableOpacity activeOpacity={0.7}
        style={[
          styles.orderCard,
          isPlaced ? styles.newOrderCard : null,
          isActive ? styles.activeOrderCard : null,
          isCompleted ? styles.completedOrderCard : null,
        ]}
        onPress={() => navigation.navigate('OwnerOrderDetail', { orderId: item.id })}
      >
        <View style={styles.rowBetween}>
          <Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text>
          <Text style={styles.mutedText}>
            {new Date(item.created_at).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <Text style={styles.mutedText}>{item.customerName}</Text>
        <Text style={styles.mutedText} numberOfLines={2}>
          {item.itemsText}
        </Text>
        <Text style={styles.mutedText}>INR {item.total.toFixed(2)}</Text>
        <Text style={styles.mutedText}>
          {item.payment_status === 'paid' ? 'PAID' : (item.payment_method || 'cod').toUpperCase()}
        </Text>
        {warning ? (
          <Text style={styles.warnText}>
            Auto-cancels in {mins}:{secs.toString().padStart(2, '0')}
          </Text>
        ) : null}
        {item.rejection_reason ? (
          <Text style={styles.warnText}>Reason: {item.rejection_reason}</Text>
        ) : null}

        {activeTab === 'new' ? (
          <View style={styles.actionRow}>
            <TouchableOpacity activeOpacity={0.7} style={styles.acceptButton} onPress={() => void handleAccept(item.id)}>
              <Text style={styles.buttonText}>ACCEPT</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={styles.rejectButton} onPress={() => openReject(item.id)}>
              <Text style={styles.rejectText}>REJECT</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {activeTab === 'active' ? (
          <View style={styles.actionRow}>
            <TouchableOpacity activeOpacity={0.7}
              style={styles.readyButton}
              onPress={() => void handleMarkReady(item.id)}
            >
              <Text style={styles.buttonText}>Mark as Ready</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7}
              style={styles.assignButton}
              onPress={() => void openAssignRider(item.id)}
            >
              <Text style={styles.assignButtonText}>Assign Rider</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  if (loading || !minDelayDone) {
    return <SkeletonLoader />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {(['new', 'active', 'completed', 'cancelled'] as TabKey[]).map(tab => {
          const active = tab === activeTab;
          return (
            <TouchableOpacity activeOpacity={0.7}
              key={tab}
              style={[styles.tabChip, active ? styles.tabChipActive : null]}
              onPress={() => setActiveTab(tab)}
            >
              <View style={styles.tabChipInner}>
                <Text style={[styles.tabChipText, active ? styles.tabChipTextActive : null]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
                {tab === 'new' && tabCounts.new > 0 ? (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>{tabCounts.new > 99 ? '99+' : tabCounts.new}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {screenError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{screenError}</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setScreenError(null);
              void loadOrders();
            }}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={filteredOrders}
        keyExtractor={item => item.id}
        removeClippedSubviews
        windowSize={5}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        contentContainerStyle={styles.content}
        onRefresh={() => void loadOrders()}
        refreshing={loading}
        renderItem={renderOrder}
        ListEmptyComponent={<Text style={styles.emptyText}>No orders in this tab.</Text>}
      />

      <Modal visible={showRejectModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select rejection reason</Text>
            {REASONS.map(reason => {
              const active = reason === selectedReason;
              return (
                <TouchableOpacity activeOpacity={0.7}
                  key={reason}
                  style={[styles.reasonChip, active ? styles.reasonChipActive : null]}
                  onPress={() => setSelectedReason(reason)}
                >
                  <Text style={styles.reasonChipText}>{reason}</Text>
                </TouchableOpacity>
              );
            })}
            {selectedReason === 'Other' ? (
              <TextInput
                style={styles.input}
                value={customReason}
                onChangeText={setCustomReason}
                placeholder="Type reason"
              />
            ) : null}
            <TouchableOpacity activeOpacity={0.7} style={styles.modalAction} onPress={() => void submitReject()}>
              <Text style={styles.modalActionText}>Submit rejection</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={styles.modalAction} onPress={() => setShowRejectModal(false)}>
              <Text style={styles.modalActionText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showRiderModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Assign an online rider</Text>
            {riders.length === 0 ? (
              <Text style={styles.emptyText}>No online riders available.</Text>
            ) : (
              riders.map(rider => (
                <TouchableOpacity activeOpacity={0.7}
                  key={rider.id}
                  style={styles.riderCard}
                  onPress={() => void assignRider(rider.id)}
                >
                  <Text style={styles.orderId}>{rider.profileName}</Text>
                  <Text style={styles.mutedText}>
                    {rider.vehicle_type || 'Vehicle'} {rider.vehicle_number ? `| ${rider.vehicle_number}` : ''}
                  </Text>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity activeOpacity={0.7} style={styles.modalAction} onPress={() => setShowRiderModal(false)}>
              <Text style={styles.modalActionText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default OwnerOrdersScreen;


