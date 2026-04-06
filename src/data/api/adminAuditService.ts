import AsyncStorage from '@react-native-async-storage/async-storage';
import { createApiClient } from './httpClient';
import {
  asArray,
  asObject,
  asOptionalString,
  asTypedObject,
} from './contracts';

const LOCAL_AUDIT_LOGS_KEY = 'admin_audit_logs_local';
const MAX_LOCAL_AUDIT_LOGS = 200;

export type AuditActorRole = 'admin' | 'seller' | 'system';
export type AuditOutcome = 'success' | 'failure';

export interface AuditLogItem {
  id: string;
  actorRole: AuditActorRole;
  actorId?: string;
  action: string;
  targetType: string;
  targetId: string;
  outcome: AuditOutcome;
  errorCode?: string;
  details?: string;
  createdAt: string;
}

export interface RecordAuditEventPayload {
  actorRole: AuditActorRole;
  actorId?: string;
  action: string;
  targetType: string;
  targetId: string;
  outcome: AuditOutcome;
  errorCode?: string;
  details?: string;
}

const makeId = () =>
  `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

class AdminAuditService {
  private api = createApiClient();

  private async readLocalLogs(): Promise<AuditLogItem[]> {
    const raw = await AsyncStorage.getItem(LOCAL_AUDIT_LOGS_KEY);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as unknown[];
      return asArray(parsed, 'adminAudit.localLogs', (item, path) =>
        asTypedObject<AuditLogItem>(item, path),
      );
    } catch {
      return [];
    }
  }

  private async writeLocalLogs(items: AuditLogItem[]) {
    await AsyncStorage.setItem(LOCAL_AUDIT_LOGS_KEY, JSON.stringify(items));
  }

  private async appendLocalLog(item: AuditLogItem) {
    const existing = await this.readLocalLogs();
    const next = [item, ...existing].slice(0, MAX_LOCAL_AUDIT_LOGS);
    await this.writeLocalLogs(next);
  }

  async recordEvent(payload: RecordAuditEventPayload): Promise<{ success: boolean }> {
    const localItem: AuditLogItem = {
      id: makeId(),
      actorRole: payload.actorRole,
      actorId: payload.actorId,
      action: payload.action,
      targetType: payload.targetType,
      targetId: payload.targetId,
      outcome: payload.outcome,
      errorCode: payload.errorCode,
      details: payload.details,
      createdAt: new Date().toISOString(),
    };

    await this.appendLocalLog(localItem);

    try {
      await this.api.post('/admin/audit-logs', payload);
      return { success: true };
    } catch {
      return { success: true };
    }
  }

  async getRecentLogs(limit: number = 20): Promise<{
    success: boolean;
    items?: AuditLogItem[];
    source?: 'remote' | 'local';
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/audit-logs', { params: { limit } });
      const data = asObject(response.data, 'adminAudit.getRecentLogs');
      return {
        success: true,
        source: 'remote',
        items: asArray(data.items || [], 'adminAudit.getRecentLogs.items', (item, path) =>
          asTypedObject<AuditLogItem>(item, path),
        ),
      };
    } catch (error: any) {
      const items = await this.readLocalLogs();
      return {
        success: true,
        source: 'local',
        items: items.slice(0, limit),
        error: asOptionalString(error?.message, 'adminAudit.getRecentLogs.error'),
      };
    }
  }
}

export const adminAuditService = new AdminAuditService();
export default adminAuditService;
