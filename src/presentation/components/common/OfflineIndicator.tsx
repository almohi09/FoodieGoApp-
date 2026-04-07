import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { offlineQueueService } from '../../../data/services/offlineQueueService';
import { useTheme } from '../../../context/ThemeContext';

interface OfflineIndicatorProps {
  onRetry?: () => void;
  showQueueStatus?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  onRetry,
  showQueueStatus = false,
}) => {
  const { theme } = useTheme();
  const { colors } = theme;
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [slideAnim] = useState(new Animated.Value(-60));

  useEffect(() => {
    const unsubscribe = offlineQueueService.onNetworkChange(async (online) => {
      setIsOnline(online);
      if (online) {
        Animated.spring(slideAnim, {
          toValue: -60,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    });

    offlineQueueService.checkConnectivity().then(setIsOnline);

    const interval = setInterval(() => {
      const stats = offlineQueueService.getStats();
      setPendingCount(stats.pendingActions);
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [slideAnim]);

  const handleRetry = async () => {
    const online = await offlineQueueService.checkConnectivity();
    setIsOnline(online);
    if (online) {
      onRetry?.();
    }
  };

  if (isOnline && pendingCount === 0) {
    return null;
  }

  const shouldShowSyncing = showQueueStatus && isOnline && pendingCount > 0;
  const shouldRender = !isOnline || shouldShowSyncing;

  if (!shouldRender) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isOnline ? colors.warning : colors.error,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{isOnline ? '📡' : '📴'}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.text}>
            {shouldShowSyncing
              ? `Syncing ${pendingCount} pending action${pendingCount !== 1 ? 's' : ''}...`
              : 'You are offline'}
          </Text>
          {!isOnline && (
            <Text style={styles.subText}>
              Actions will be saved and synced when you're back online
            </Text>
          )}
        </View>
        {!isOnline && (
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  subText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retryText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default OfflineIndicator;
