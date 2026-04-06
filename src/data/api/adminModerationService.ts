import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://api.foodiego.in/api/v1';

export interface ReportedItem {
  id: string;
  type: 'restaurant' | 'menu_item' | 'review';
  itemId: string;
  itemName: string;
  restaurantId?: string;
  restaurantName?: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  description?: string;
  evidence?: string[];
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: string;
  action?: string;
  createdAt: string;
}

export interface ApprovalQueueItem {
  id: string;
  type:
    | 'seller_registration'
    | 'document_verification'
    | 'menu_item'
    | 'restaurant_edit';
  sellerId?: string;
  sellerName?: string;
  businessName?: string;
  data: Record<string, any>;
  submittedAt: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ModerationAction {
  id: string;
  targetType: 'restaurant' | 'menu_item' | 'review' | 'user' | 'seller';
  targetId: string;
  action: 'warning' | 'remove' | 'suspend' | 'ban' | 'delete';
  reason: string;
  performedBy: string;
  performedAt: string;
}

class AdminModerationService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.api.interceptors.request.use(async config => {
      if (!this.token) {
        this.token = await AsyncStorage.getItem('auth_token');
      }
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  async getReportedItems(
    options: {
      page?: number;
      limit?: number;
      type?: ReportedItem['type'];
      status?: ReportedItem['status'];
    } = {},
  ): Promise<{
    success: boolean;
    items?: ReportedItem[];
    total?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/reports', {
        params: options,
      });
      return {
        success: true,
        items: response.data.items,
        total: response.data.total,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch reports',
      };
    }
  }

  async getReportedItemById(reportId: string): Promise<{
    success: boolean;
    item?: ReportedItem;
    error?: string;
  }> {
    try {
      const response = await this.api.get(`/admin/reports/${reportId}`);
      return { success: true, item: response.data.item };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch report',
      };
    }
  }

  async reviewReport(
    reportId: string,
    action: 'actioned' | 'dismissed',
    notes: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post(`/admin/reports/${reportId}/review`, {
        action,
        notes,
      });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to review report',
      };
    }
  }

  async takeAction(
    targetType: ModerationAction['targetType'],
    targetId: string,
    action: ModerationAction['action'],
    reason: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post('/admin/moderation/action', {
        targetType,
        targetId,
        action,
        reason,
      });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to take action',
      };
    }
  }

  async getApprovalQueue(
    options: {
      page?: number;
      limit?: number;
      type?: ApprovalQueueItem['type'];
      priority?: ApprovalQueueItem['priority'];
    } = {},
  ): Promise<{
    success: boolean;
    items?: ApprovalQueueItem[];
    total?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/approvals', {
        params: options,
      });
      return {
        success: true,
        items: response.data.items,
        total: response.data.total,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch approvals',
      };
    }
  }

  async approveItem(
    approvalId: string,
    notes?: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post(`/admin/approvals/${approvalId}/approve`, { notes });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to approve',
      };
    }
  }

  async rejectApproval(
    approvalId: string,
    reason: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post(`/admin/approvals/${approvalId}/reject`, { reason });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to reject',
      };
    }
  }

  async requestMoreInfo(
    approvalId: string,
    questions: string[],
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post(`/admin/approvals/${approvalId}/request-info`, {
        questions,
      });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to request info',
      };
    }
  }

  async getPendingSellerApprovals(): Promise<{
    success: boolean;
    sellers?: {
      id: string;
      businessName: string;
      ownerName: string;
      submittedAt: string;
    }[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/approvals/pending-sellers');
      return { success: true, sellers: response.data.sellers };
    } catch (error: any) {
      return {
        success: false,
        error:
          error.response?.data?.message || 'Failed to fetch pending sellers',
      };
    }
  }

  async getPendingDocumentVerifications(): Promise<{
    success: boolean;
    documents?: {
      id: string;
      sellerId: string;
      sellerName: string;
      documentType: string;
      submittedAt: string;
    }[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/approvals/pending-documents');
      return { success: true, documents: response.data.documents };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch documents',
      };
    }
  }

  async verifyDocument(
    documentId: string,
    verified: boolean,
    notes?: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post(`/admin/documents/${documentId}/verify`, {
        verified,
        notes,
      });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to verify document',
      };
    }
  }

  async getModerationHistory(
    options: {
      page?: number;
      limit?: number;
      targetType?: ModerationAction['targetType'];
      action?: ModerationAction['action'];
    } = {},
  ): Promise<{
    success: boolean;
    actions?: ModerationAction[];
    total?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/moderation/history', {
        params: options,
      });
      return {
        success: true,
        actions: response.data.actions,
        total: response.data.total,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch history',
      };
    }
  }

  async getFlaggedReviews(): Promise<{
    success: boolean;
    reviews?: {
      id: string;
      content: string;
      rating: number;
      restaurantName: string;
      userName: string;
      flagCount: number;
      createdAt: string;
    }[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/admin/reviews/flagged');
      return { success: true, reviews: response.data.reviews };
    } catch (error: any) {
      return {
        success: false,
        error:
          error.response?.data?.message || 'Failed to fetch flagged reviews',
      };
    }
  }

  async removeReview(
    reviewId: string,
    reason: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post(`/admin/reviews/${reviewId}/remove`, { reason });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to remove review',
      };
    }
  }
}

export const adminModerationService = new AdminModerationService();
export default adminModerationService;
