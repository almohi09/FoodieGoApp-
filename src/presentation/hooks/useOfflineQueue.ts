import { useEffect, useState, useCallback } from 'react';
import {
  offlineQueueService,
  QueueStats,
  QueuedAction,
} from '../../data/services/offlineQueueService';

export const useOfflineQueue = () => {
  const [stats, setStats] = useState<QueueStats>({
    pendingActions: 0,
    failedActions: 0,
    lastSyncTime: null,
    isOnline: true,
  });
  const [pendingActions, setPendingActions] = useState<QueuedAction[]>([]);
  const [failedActions, setFailedActions] = useState<QueuedAction[]>([]);

  const refreshStats = useCallback(() => {
    setStats(offlineQueueService.getStats());
    setPendingActions(offlineQueueService.getPendingActions());
    setFailedActions(offlineQueueService.getFailedActions());
  }, []);

  useEffect(() => {
    const unsubscribe = offlineQueueService.onNetworkChange((_isOnline: boolean) => {
      refreshStats();
    });

    refreshStats();

    return unsubscribe;
  }, [refreshStats]);

  const enqueueAction = useCallback(
    async (type: string, payload: any, options?: { maxRetries?: number }) => {
      const id = await offlineQueueService.enqueue(type, payload, options);
      refreshStats();
      return id;
    },
    [refreshStats],
  );

  const retryFailed = useCallback(async () => {
    await offlineQueueService.retryFailed();
    refreshStats();
  }, [refreshStats]);

  const clearFailed = useCallback(async () => {
    await offlineQueueService.clearFailed();
    refreshStats();
  }, [refreshStats]);

  const checkOnline = useCallback(async () => {
    return offlineQueueService.checkConnectivity();
  }, []);

  return {
    stats,
    pendingActions,
    failedActions,
    enqueueAction,
    retryFailed,
    clearFailed,
    checkOnline,
    refreshStats,
  };
};

export default useOfflineQueue;
