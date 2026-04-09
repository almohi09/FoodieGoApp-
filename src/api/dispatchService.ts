import AsyncStorage from '@react-native-async-storage/async-storage';
import { createApiClient } from './httpClient';
import { asArray, asObject, asOptionalString, asTypedObject } from './contracts';
import { parseSecurityActionError } from './securityGuard';

const LOCAL_DISPATCH_KEY = 'dispatch_board_local_v1';

export type DispatchStatus =
  | 'ready_for_pickup'
  | 'assigned'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered';

export interface DispatchRider {
  id: string;
  name: string;
  phone: string;
  isAvailable: boolean;
}

export interface DispatchOrder {
  id: string;
  restaurantName: string;
  amount: number;
  status: DispatchStatus;
  riderId?: string;
  riderName?: string;
  proofOtp?: string;
  updatedAt: string;
}

interface LocalDispatchState {
  orders: DispatchOrder[];
  riders: DispatchRider[];
}

const seedState = (): LocalDispatchState => ({
  orders: [
    {
      id: 'pilot-o-1001',
      restaurantName: 'Pizza Palace',
      amount: 420,
      status: 'ready_for_pickup',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'pilot-o-1002',
      restaurantName: 'Biryani House',
      amount: 310,
      status: 'assigned',
      riderId: 'rider-01',
      riderName: 'Amit Rider',
      updatedAt: new Date().toISOString(),
    },
  ],
  riders: [
    { id: 'rider-01', name: 'Amit Rider', phone: '+91-900000001', isAvailable: false },
    { id: 'rider-02', name: 'Sana Rider', phone: '+91-900000002', isAvailable: true },
    { id: 'rider-03', name: 'Imran Rider', phone: '+91-900000003', isAvailable: true },
  ],
});

class DispatchService {
  private api = createApiClient();

  private async getLocalState(): Promise<LocalDispatchState> {
    const raw = await AsyncStorage.getItem(LOCAL_DISPATCH_KEY);
    if (!raw) {
      const seeded = seedState();
      await AsyncStorage.setItem(LOCAL_DISPATCH_KEY, JSON.stringify(seeded));
      return seeded;
    }
    try {
      const parsed = JSON.parse(raw) as LocalDispatchState;
      return {
        orders: parsed.orders || [],
        riders: parsed.riders || [],
      };
    } catch {
      const seeded = seedState();
      await AsyncStorage.setItem(LOCAL_DISPATCH_KEY, JSON.stringify(seeded));
      return seeded;
    }
  }

  private async saveLocalState(state: LocalDispatchState) {
    await AsyncStorage.setItem(LOCAL_DISPATCH_KEY, JSON.stringify(state));
  }

  async getDispatchBoard(limit: number = 8): Promise<{
    success: boolean;
    source?: 'remote' | 'local';
    orders?: DispatchOrder[];
    riders?: DispatchRider[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/dispatch/board', { params: { limit } });
      const data = asObject(response.data, 'dispatch.getBoard');
      return {
        success: true,
        source: 'remote',
        orders: asArray(data.orders || [], 'dispatch.getBoard.orders', (item, path) =>
          asTypedObject<DispatchOrder>(item, path),
        ),
        riders: asArray(data.riders || [], 'dispatch.getBoard.riders', (item, path) =>
          asTypedObject<DispatchRider>(item, path),
        ),
      };
    } catch (error: any) {
      const local = await this.getLocalState();
      return {
        success: true,
        source: 'local',
        orders: local.orders.slice(0, limit),
        riders: local.riders,
        error: asOptionalString(error?.message, 'dispatch.getBoard.error'),
      };
    }
  }

  async assignRider(orderId: string, riderId: string): Promise<{
    success: boolean;
    order?: DispatchOrder;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      const response = await this.api.post(`/admin/dispatch/orders/${orderId}/assign`, {
        riderId,
      });
      const data = asObject(response.data, 'dispatch.assignRider');
      return {
        success: true,
        order: asTypedObject<DispatchOrder>(data.order, 'dispatch.assignRider.order'),
      };
    } catch (error) {
      const local = await this.getLocalState();
      const rider = local.riders.find(item => item.id === riderId);
      const orderIdx = local.orders.findIndex(item => item.id === orderId);
      if (!rider || orderIdx < 0) {
        const parsed = parseSecurityActionError(error, 'Failed to assign rider');
        return {
          success: false,
          error: parsed.message,
          errorCode: parsed.errorCode,
          retryAfterSec: parsed.retryAfterSec,
        };
      }

      local.orders[orderIdx] = {
        ...local.orders[orderIdx],
        status: 'assigned',
        riderId: rider.id,
        riderName: rider.name,
        updatedAt: new Date().toISOString(),
      };
      local.riders = local.riders.map(item =>
        item.id === rider.id ? { ...item, isAvailable: false } : item,
      );
      await this.saveLocalState(local);
      return { success: true, order: local.orders[orderIdx] };
    }
  }

  async updateStatus(
    orderId: string,
    status: DispatchStatus,
    proofOtp?: string,
  ): Promise<{
    success: boolean;
    order?: DispatchOrder;
    error?: string;
    errorCode?: string;
    retryAfterSec?: number;
  }> {
    try {
      const response = await this.api.post(`/admin/dispatch/orders/${orderId}/status`, {
        status,
        proofOtp,
      });
      const data = asObject(response.data, 'dispatch.updateStatus');
      return {
        success: true,
        order: asTypedObject<DispatchOrder>(data.order, 'dispatch.updateStatus.order'),
      };
    } catch (error) {
      const local = await this.getLocalState();
      const orderIdx = local.orders.findIndex(item => item.id === orderId);
      if (orderIdx < 0) {
        const parsed = parseSecurityActionError(error, 'Failed to update delivery status');
        return {
          success: false,
          error: parsed.message,
          errorCode: parsed.errorCode,
          retryAfterSec: parsed.retryAfterSec,
        };
      }

      const nextOrder: DispatchOrder = {
        ...local.orders[orderIdx],
        status,
        proofOtp: status === 'delivered' ? proofOtp || local.orders[orderIdx].proofOtp : undefined,
        updatedAt: new Date().toISOString(),
      };
      local.orders[orderIdx] = nextOrder;
      if (status === 'delivered' && nextOrder.riderId) {
        local.riders = local.riders.map(item =>
          item.id === nextOrder.riderId ? { ...item, isAvailable: true } : item,
        );
      }
      await this.saveLocalState(local);
      return { success: true, order: nextOrder };
    }
  }
}

export const dispatchService = new DispatchService();
export default dispatchService;
