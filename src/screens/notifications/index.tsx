import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import supabase from '../../config/supabase';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/authStore';
import { notificationService } from '../../services/notificationService';
import { EmptyState } from '../../components/EmptyState';
import { OrdersScreenSkeleton } from '../../components/skeletons';
import styles from './styles';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string | null;
  is_read: boolean;
  order_id: string | null;
  created_at: string;
}

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore(state => state.user);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('id,user_id,title,body,type,is_read,order_id,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .returns<NotificationRow[]>();

      if (fetchError) {
        throw fetchError;
      }
      setNotifications(data || []);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Failed to load notifications.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, [user?.id]);

  useEffect(() => {
    const timer = setTimeout(() => setMinDelayDone(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadNotifications();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const unreadCount = useMemo(
    () => notifications.filter(item => !item.is_read).length,
    [notifications],
  );

  const handleOpen = async (item: NotificationRow) => {
    if (!item.is_read) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', item.id);

      setNotifications(prev =>
        prev.map(row => (row.id === item.id ? { ...row, is_read: true } : row)),
      );
    }

    if (item.order_id) {
      navigation.navigate('OrderTracking', { orderId: item.order_id });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id || unreadCount === 0) {
      return;
    }

    await notificationService.markAllAsRead(user.id);
    setNotifications(prev => prev.map(item => ({ ...item, is_read: true })));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => void handleMarkAllAsRead()}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setError(null);
              void loadNotifications();
            }}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        refreshing={loading}
        onRefresh={() => void loadNotifications()}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.7}
            style={[styles.card, !item.is_read ? styles.unreadCard : null]}
            onPress={() => void handleOpen(item)}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {!item.is_read ? <View style={styles.unreadDot} /> : null}
            </View>
            <Text style={styles.cardBody}>{item.body}</Text>
            <Text style={styles.cardMeta}>
              {new Date(item.created_at).toLocaleString('en-IN')}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          loading && !minDelayDone ? (
            <OrdersScreenSkeleton />
          ) : (
            <EmptyState
              illustration="no-notifications"
              title="No notifications yet"
              subtitle="Order and delivery updates will appear here."
            />
          )
        }
      />
    </View>
  );
};

export default NotificationsScreen;
