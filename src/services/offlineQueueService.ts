import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface QueueStats {
  pendingActions: number;
  failedActions: number;
  lastSyncTime: number | null;
  isOnline: boolean;
}

type ActionHandler = (
  payload: any,
) => Promise<{ success: boolean; error?: string }>;
type NetworkChangeCallback = (isOnline: boolean) => void;

const QUEUE_STORAGE_KEY = 'offline_action_queue';
const MAX_RETRIES = 3;
const BATCH_SIZE = 5;

class OfflineQueueService {
  private queue: QueuedAction[] = [];
  private isProcessing = false;
  private isInitialized = false;
  private networkListeners: ((isOnline: boolean) => void)[] = [];
  private actionHandlers: Map<string, ActionHandler> = new Map();
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private unsubscribeNetInfo: (() => void) | null = null;
  private lastNetworkState: boolean | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.loadQueue();

    this.unsubscribeNetInfo = NetInfo.addEventListener(
      this.handleNetworkChange.bind(this),
    );

    this.syncInterval = setInterval(() => {
      this.processQueue();
    }, 30000);

    this.isInitialized = true;
  }

  private handleNetworkChange(state: NetInfoState): void {
    const isOnline = Boolean(
      state.isConnected && state.isInternetReachable !== false,
    );

    if (this.lastNetworkState !== null && this.lastNetworkState !== isOnline) {
      if (isOnline) {
        this.processQueue();
      }

      this.networkListeners.forEach(callback => {
        try {
          callback(isOnline);
        } catch (error) {
          console.error('Network listener error:', error);
        }
      });
    }

    this.lastNetworkState = isOnline;
  }

  registerActionHandler(type: string, handler: ActionHandler): void {
    this.actionHandlers.set(type, handler);
  }

  unregisterActionHandler(type: string): void {
    this.actionHandlers.delete(type);
  }

  async enqueue(
    type: string,
    payload: any,
    options: { maxRetries?: number } = {},
  ): Promise<string> {
    const action: QueuedAction = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: options.maxRetries ?? MAX_RETRIES,
    };

    this.queue.push(action);
    await this.saveQueue();

    if (this.lastNetworkState) {
      this.processQueue();
    }

    return action.id;
  }

  async dequeue(actionId: string): Promise<boolean> {
    const index = this.queue.findIndex(a => a.id === actionId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      await this.saveQueue();
      return true;
    }
    return false;
  }

  private async loadQueue(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (saved) {
        this.queue = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || !this.lastNetworkState) return;

    this.isProcessing = true;

    const pendingActions = this.queue.filter(a => a.retryCount < a.maxRetries);

    const actionsToProcess = pendingActions.slice(0, BATCH_SIZE);

    for (const action of actionsToProcess) {
      await this.processAction(action);
    }

    await this.saveQueue();
    this.isProcessing = false;
  }

  private async processAction(action: QueuedAction): Promise<void> {
    const handler = this.actionHandlers.get(action.type);

    if (!handler) {
      console.warn(`No handler registered for action type: ${action.type}`);
      return;
    }

    try {
      const result = await handler(action.payload);

      if (result.success) {
        await this.dequeue(action.id);
      } else {
        action.retryCount++;
        if (action.retryCount >= action.maxRetries) {
          console.error(
            `Action ${action.id} failed after ${action.maxRetries} retries`,
          );
        }
      }
    } catch (error) {
      console.error(`Error processing action ${action.id}:`, error);
      action.retryCount++;
    }
  }

  async retryFailed(): Promise<void> {
    this.queue.forEach(action => {
      action.retryCount = 0;
    });
    await this.saveQueue();
    await this.processQueue();
  }

  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
  }

  async clearFailed(): Promise<void> {
    this.queue = this.queue.filter(a => a.retryCount < a.maxRetries);
    await this.saveQueue();
  }

  getQueue(): QueuedAction[] {
    return [...this.queue];
  }

  getPendingActions(): QueuedAction[] {
    return this.queue.filter(a => a.retryCount < a.maxRetries);
  }

  getFailedActions(): QueuedAction[] {
    return this.queue.filter(a => a.retryCount >= a.maxRetries);
  }

  getStats(): QueueStats {
    return {
      pendingActions: this.getPendingActions().length,
      failedActions: this.getFailedActions().length,
      lastSyncTime:
        this.queue.length > 0
          ? Math.max(...this.queue.map(a => a.timestamp))
          : null,
      isOnline: this.lastNetworkState ?? false,
    };
  }

  onNetworkChange(callback: NetworkChangeCallback): () => void {
    this.networkListeners.push(callback);
    return () => {
      this.networkListeners = this.networkListeners.filter(
        cb => cb !== callback,
      );
    };
  }

  async checkConnectivity(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  }

  destroy(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.networkListeners = [];
    this.actionHandlers.clear();
    this.isInitialized = false;
  }
}

export const offlineQueueService = new OfflineQueueService();
export default offlineQueueService;
