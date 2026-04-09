import { Order, OrderStatus, Rider } from '../types';
import { createApiClient } from './httpClient';
import appEnv from '../config/env';
import {
  asArray,
  asEnum,
  asErrorMessage,
  asNumber,
  asObject,
  asOptionalString,
  asTypedObject,
} from './contracts';

export interface TrackingUpdate {
  status: OrderStatus;
  timestamp: string;
  message: string;
  eta?: number;
  rider?: Rider;
  riderLocation?: {
    lat: number;
    lng: number;
  };
}

export interface TrackingCallbacks {
  onStatusChange?: (status: OrderStatus) => void;
  onRiderLocationUpdate?: (location: { lat: number; lng: number }) => void;
  onETAUpdate?: (eta: number) => void;
  onError?: (error: string) => void;
}

const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'refunded',
] as const;

const ORDER_STATUS_RANK: Record<OrderStatus, number> = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  out_for_delivery: 3,
  delivered: 4,
  cancelled: 5,
  refunded: 6,
};

const MAX_RECONNECT_DELAY_MS = 30000;
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_SEEN_EVENT_IDS = 250;

interface TrackingRuntimeState {
  active: boolean;
  reconnectAttempt: number;
  reconnectTimer?: ReturnType<typeof setTimeout>;
  seenEventIds: Set<string>;
  lastStatusRank: number;
  lastStatusTimestamp: number;
  lastEventTimestamp: number;
  lastLocationSignature?: string;
  lastETAMinutes?: number;
}

const nowMs = () => Date.now();

const parseTimestampMs = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const asMs = Date.parse(value);
    if (!Number.isNaN(asMs)) {
      return asMs;
    }
  }
  return null;
};

class TrackingService {
  private api = createApiClient();
  private pollingIntervals: Map<string, ReturnType<typeof setInterval>> =
    new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private socketConnections: Map<string, any> = new Map();
  private runtimeStates: Map<string, TrackingRuntimeState> = new Map();

  constructor() {
    // Shared client handles auth headers and token refresh.
  }

  async getOrderTracking(orderId: string): Promise<{
    success: boolean;
    order?: Order;
    events?: TrackingUpdate[];
    error?: string;
  }> {
    try {
      const response = await this.api.get(`/orders/${orderId}/tracking`);
      const data = asObject(response.data, 'tracking.getOrderTracking');
      return {
        success: true,
        order: asTypedObject<Order>(
          data.order,
          'tracking.getOrderTracking.order',
        ),
        events: asArray(
          data.events || [],
          'tracking.getOrderTracking.events',
          (item, path) => asTypedObject<TrackingUpdate>(item, path),
        ),
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to get tracking'),
      };
    }
  }

  async getCurrentStatus(orderId: string): Promise<{
    success: boolean;
    status?: OrderStatus;
    estimatedDelivery?: string;
    rider?: Rider;
    error?: string;
  }> {
    try {
      const response = await this.api.get(`/orders/${orderId}/status`);
      const data = asObject(response.data, 'tracking.getCurrentStatus');
      return {
        success: true,
        status: asEnum(
          data.status,
          'tracking.getCurrentStatus.status',
          ORDER_STATUSES,
        ),
        estimatedDelivery: asOptionalString(
          data.estimatedDelivery,
          'tracking.getCurrentStatus.estimatedDelivery',
        ),
        rider: data.rider
          ? asTypedObject<Rider>(data.rider, 'tracking.getCurrentStatus.rider')
          : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to get status'),
      };
    }
  }

  private getOrCreateRuntimeState(orderId: string): TrackingRuntimeState {
    const existing = this.runtimeStates.get(orderId);
    if (existing) {
      return existing;
    }

    const created: TrackingRuntimeState = {
      active: false,
      reconnectAttempt: 0,
      seenEventIds: new Set<string>(),
      lastStatusRank: -1,
      lastStatusTimestamp: 0,
      lastEventTimestamp: 0,
    };
    this.runtimeStates.set(orderId, created);
    return created;
  }

  private rememberEventId(
    state: TrackingRuntimeState,
    eventId: string,
  ): boolean {
    if (state.seenEventIds.has(eventId)) {
      return false;
    }
    state.seenEventIds.add(eventId);
    if (state.seenEventIds.size > MAX_SEEN_EVENT_IDS) {
      const first = state.seenEventIds.values().next().value;
      if (first) {
        state.seenEventIds.delete(first);
      }
    }
    return true;
  }

  private shouldAcceptEvent(
    orderId: string,
    payload: Record<string, unknown>,
  ): boolean {
    const state = this.getOrCreateRuntimeState(orderId);
    const eventId = asOptionalString(
      payload.eventId,
      'tracking.wsMessage.eventId',
    );
    if (eventId && !this.rememberEventId(state, eventId)) {
      return false;
    }

    const timestampMs =
      parseTimestampMs(payload.timestamp) ??
      parseTimestampMs(payload.eventTimestamp) ??
      nowMs();
    if (timestampMs + 3000 < state.lastEventTimestamp) {
      return false;
    }
    state.lastEventTimestamp = Math.max(state.lastEventTimestamp, timestampMs);
    return true;
  }

  private emitStatusUpdate(
    orderId: string,
    status: OrderStatus,
    callbacks: TrackingCallbacks,
    timestampMs?: number,
  ): void {
    const state = this.getOrCreateRuntimeState(orderId);
    const incomingRank = ORDER_STATUS_RANK[status];
    const nextTimestamp = timestampMs ?? nowMs();

    if (incomingRank < state.lastStatusRank) {
      return;
    }
    if (
      incomingRank === state.lastStatusRank &&
      nextTimestamp <= state.lastStatusTimestamp
    ) {
      return;
    }

    state.lastStatusRank = incomingRank;
    state.lastStatusTimestamp = nextTimestamp;
    callbacks.onStatusChange?.(status);
  }

  private emitRiderLocationUpdate(
    orderId: string,
    lat: number,
    lng: number,
    callbacks: TrackingCallbacks,
  ): void {
    const state = this.getOrCreateRuntimeState(orderId);
    const signature = `${lat.toFixed(5)}:${lng.toFixed(5)}`;
    if (state.lastLocationSignature === signature) {
      return;
    }
    state.lastLocationSignature = signature;
    callbacks.onRiderLocationUpdate?.({ lat, lng });
  }

  private emitETAUpdate(
    orderId: string,
    etaMinutes: number,
    callbacks: TrackingCallbacks,
  ): void {
    const state = this.getOrCreateRuntimeState(orderId);
    if (state.lastETAMinutes === etaMinutes) {
      return;
    }
    state.lastETAMinutes = etaMinutes;
    callbacks.onETAUpdate?.(etaMinutes);
  }

  private clearReconnectTimer(orderId: string): void {
    const state = this.runtimeStates.get(orderId);
    if (!state?.reconnectTimer) {
      return;
    }
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = undefined;
  }

  private scheduleReconnect(
    orderId: string,
    callbacks: TrackingCallbacks,
  ): void {
    const state = this.getOrCreateRuntimeState(orderId);
    if (!state.active || state.reconnectTimer) {
      return;
    }

    const attempt = state.reconnectAttempt + 1;
    state.reconnectAttempt = attempt;
    const jitter = Math.floor(Math.random() * 400);
    const delay =
      Math.min(
        MAX_RECONNECT_DELAY_MS,
        BASE_RECONNECT_DELAY_MS * 2 ** Math.min(6, attempt - 1),
      ) + jitter;

    state.reconnectTimer = setTimeout(() => {
      state.reconnectTimer = undefined;
      if (!state.active) {
        return;
      }
      this.connectWebSocket(orderId, callbacks);
    }, delay);
  }

  startPolling(
    orderId: string,
    callbacks: TrackingCallbacks,
    intervalMs = 10000,
  ): void {
    this.stopPolling(orderId);

    const poll = async () => {
      try {
        const result = await this.getCurrentStatus(orderId);
        if (result.success) {
          if (result.status) {
            this.emitStatusUpdate(orderId, result.status, callbacks);
          }
          if (result.rider?.lat && result.rider?.lng) {
            this.emitRiderLocationUpdate(
              orderId,
              result.rider.lat,
              result.rider.lng,
              callbacks,
            );
          }
        } else {
          callbacks.onError?.(result.error || 'Unknown error');
        }
      } catch {
        callbacks.onError?.('Polling failed');
      }
    };

    poll();
    const intervalId = setInterval(poll, intervalMs);
    this.pollingIntervals.set(orderId, intervalId);
  }

  stopPolling(orderId: string): void {
    const interval = this.pollingIntervals.get(orderId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(orderId);
    }
  }

  connectWebSocket(orderId: string, callbacks: TrackingCallbacks): void {
    this.disconnectWebSocket(orderId);

    const wsUrl = appEnv.apiBaseUrl
      .replace('https://', 'wss://')
      .replace('http://', 'ws://');
    const socket = new WebSocket(
      `${wsUrl}${appEnv.trackingSocketPath}/${orderId}/live`,
    );

    socket.onopen = () => {
      const state = this.getOrCreateRuntimeState(orderId);
      state.reconnectAttempt = 0;
      this.clearReconnectTimer(orderId);
    };

    socket.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(orderId, data, callbacks);
      } catch {
        console.warn('Invalid WebSocket message');
      }
    };

    socket.onerror = () => {
      callbacks.onError?.('WebSocket connection error');
    };

    socket.onclose = () => {
      this.socketConnections.delete(orderId);
      this.scheduleReconnect(orderId, callbacks);
    };

    this.socketConnections.set(orderId, socket);
  }

  private handleWebSocketMessage(
    orderId: string,
    data: unknown,
    callbacks: TrackingCallbacks,
  ): void {
    const payload = asObject(data, 'tracking.wsMessage');
    if (!this.shouldAcceptEvent(orderId, payload)) {
      return;
    }

    const messageType = asOptionalString(
      payload.type,
      'tracking.wsMessage.type',
    );
    const timestampMs =
      parseTimestampMs(payload.timestamp) ??
      parseTimestampMs(payload.eventTimestamp) ??
      undefined;

    switch (messageType) {
      case 'status_update':
        this.emitStatusUpdate(
          orderId,
          asEnum(payload.status, 'tracking.wsMessage.status', ORDER_STATUSES),
          callbacks,
          timestampMs,
        );
        break;
      case 'rider_location':
        this.emitRiderLocationUpdate(
          orderId,
          asNumber(payload.lat, 'tracking.wsMessage.lat'),
          asNumber(payload.lng, 'tracking.wsMessage.lng'),
          callbacks,
        );
        break;
      case 'eta_update':
        this.emitETAUpdate(
          orderId,
          asNumber(payload.eta, 'tracking.wsMessage.eta'),
          callbacks,
        );
        break;
      case 'error':
        callbacks.onError?.(
          asOptionalString(payload.message, 'tracking.wsMessage.message') ||
            'Tracking update error',
        );
        break;
    }
  }

  disconnectWebSocket(orderId: string): void {
    this.clearReconnectTimer(orderId);
    const socket = this.socketConnections.get(orderId);
    if (socket) {
      socket.close();
      this.socketConnections.delete(orderId);
    }
  }

  stopAllTracking(): void {
    this.pollingIntervals.forEach(interval => {
      clearInterval(interval);
    });
    this.pollingIntervals.clear();

    this.socketConnections.forEach(socket => {
      socket.close();
    });
    this.socketConnections.clear();

    this.runtimeStates.forEach(state => {
      if (state.reconnectTimer) {
        clearTimeout(state.reconnectTimer);
      }
    });
    this.runtimeStates.clear();
  }

  isPolling(orderId: string): boolean {
    return this.pollingIntervals.has(orderId);
  }

  isConnected(orderId: string): boolean {
    const socket = this.socketConnections.get(orderId);
    return socket?.readyState === WebSocket.OPEN;
  }

  startRealtimeTracking(
    orderId: string,
    callbacks: TrackingCallbacks,
    pollIntervalMs = 10000,
  ): () => void {
    const state = this.getOrCreateRuntimeState(orderId);
    state.active = true;
    state.reconnectAttempt = 0;
    this.clearReconnectTimer(orderId);
    let recoveredToPolling = false;

    this.connectWebSocket(orderId, {
      ...callbacks,
      onError: message => {
        callbacks.onError?.(message);
        if (!recoveredToPolling) {
          recoveredToPolling = true;
          this.startPolling(orderId, callbacks, pollIntervalMs);
        }
      },
    });

    this.startPolling(orderId, callbacks, pollIntervalMs);

    return () => {
      const runtimeState = this.runtimeStates.get(orderId);
      if (runtimeState) {
        runtimeState.active = false;
      }
      this.disconnectWebSocket(orderId);
      this.stopPolling(orderId);
      this.unsubscribeFromPushNotifications(orderId);
      this.runtimeStates.delete(orderId);
    };
  }

  async subscribeToPushNotifications(orderId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post(`/orders/${orderId}/subscribe-notifications`);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to subscribe'),
      };
    }
  }

  async unsubscribeFromPushNotifications(orderId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.delete(`/orders/${orderId}/subscribe-notifications`);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: asErrorMessage(error, 'Failed to unsubscribe'),
      };
    }
  }

  getStatusDisplayInfo(status: OrderStatus): {
    title: string;
    subtitle: string;
    icon: string;
    progress: number;
  } {
    const statusMap: Record<
      OrderStatus,
      { title: string; subtitle: string; icon: string; progress: number }
    > = {
      pending: {
        title: 'Order Placed',
        subtitle: 'Waiting for restaurant confirmation',
        icon: '📋',
        progress: 0.1,
      },
      confirmed: {
        title: 'Confirmed',
        subtitle: 'Restaurant has accepted your order',
        icon: '✓',
        progress: 0.25,
      },
      preparing: {
        title: 'Preparing',
        subtitle: 'Your food is being prepared',
        icon: '👨‍🍳',
        progress: 0.5,
      },
      out_for_delivery: {
        title: 'Out for Delivery',
        subtitle: 'Rider is picking up your order',
        icon: '🛵',
        progress: 0.75,
      },
      delivered: {
        title: 'Delivered',
        subtitle: 'Order delivered successfully',
        icon: '✅',
        progress: 1,
      },
      cancelled: {
        title: 'Cancelled',
        subtitle: 'Order has been cancelled',
        icon: '❌',
        progress: 0,
      },
      refunded: {
        title: 'Refunded',
        subtitle: 'Payment has been refunded',
        icon: '💰',
        progress: 0,
      },
    };

    return (
      statusMap[status] || {
        title: status,
        subtitle: '',
        icon: '•',
        progress: 0,
      }
    );
  }
}

export const trackingService = new TrackingService();
export default trackingService;


