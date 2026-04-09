import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { offlineQueueService } from '../../services/offlineQueueService';
import { useTheme } from '../../context/ThemeContext';
import { Shadow, Typography, Spacing } from '../../theme';

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
    const unsubscribe = offlineQueueService.onNetworkChange(async online => {
      setIsOnline(online);
      Animated.spring(slideAnim, {
        toValue: online ? -60 : 0,
        useNativeDriver: true,
      }).start();
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
        <Text style={[styles.icon, { color: colors.textInverse }]}>
          {isOnline ? '📡' : '📴'}
        </Text>
        <View style={styles.textContainer}>
          <Text style={[styles.text, { color: colors.textInverse }]}>
            {shouldShowSyncing
              ? `Syncing ${pendingCount} pending action${pendingCount !== 1 ? 's' : ''}...`
              : 'You are offline'}
          </Text>
          {!isOnline && (
            <Text style={[styles.subText, { color: colors.textInverse }]}>
              Actions will be saved and synced when you're back online
            </Text>
          )}
        </View>
        {!isOnline && (
          <TouchableOpacity activeOpacity={0.7}
            style={[styles.retryButton, { backgroundColor: colors.overlayLight }]}
            onPress={handleRetry}
           
          >
            <Text style={[styles.retryText, { color: colors.textInverse }]}>Retry</Text>
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
    ...Shadow.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    paddingTop: 48,
  },
  icon: {
    ...Typography.h2,
    marginRight: Spacing.sm + 4,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    ...Typography.body2,
    fontWeight: '600',
  },
  subText: {
    ...Typography.caption,
    marginTop: 2,
    opacity: 0.8,
  },
  retryButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retryText: {
    ...Typography.label,
    fontWeight: '600',
  },
});

export default OfflineIndicator;

