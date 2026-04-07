import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import appEnv from '../../config/env';

const API_BASE_URL = appEnv.apiBaseUrl;

export interface SupportTicket {
  id: string;
  userId: string;
  orderId?: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export type TicketCategory =
  | 'order_issue'
  | 'delivery_issue'
  | 'food_quality'
  | 'refund_request'
  | 'complaint'
  | 'suggestion'
  | 'account_issue'
  | 'other';

export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_customer'
  | 'resolved'
  | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'user' | 'agent' | 'system';
  senderName: string;
  message: string;
  attachments?: string[];
  createdAt: string;
}

export interface CreateTicketData {
  subject: string;
  category: TicketCategory;
  priority?: TicketPriority;
  orderId?: string;
  message: string;
  attachments?: string[];
}

export interface ChatMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'user' | 'agent' | 'system';
  senderName: string;
  senderAvatar?: string;
  message: string;
  attachments?: string[];
  createdAt: string;
  read: boolean;
}

class SupportService {
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

  async createTicket(data: CreateTicketData): Promise<{
    success: boolean;
    ticket?: SupportTicket;
    error?: string;
  }> {
    try {
      const response = await this.api.post('/support/tickets', data);
      return { success: true, ticket: response.data.ticket };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create ticket',
      };
    }
  }

  async getTickets(
    options: {
      status?: TicketStatus;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    success: boolean;
    tickets?: SupportTicket[];
    total?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.get('/support/tickets', {
        params: {
          status: options.status,
          page: options.page || 1,
          limit: options.limit || 20,
        },
      });
      return {
        success: true,
        tickets: response.data.tickets,
        total: response.data.total,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch tickets',
      };
    }
  }

  async getTicketById(ticketId: string): Promise<{
    success: boolean;
    ticket?: SupportTicket;
    error?: string;
  }> {
    try {
      const response = await this.api.get(`/support/tickets/${ticketId}`);
      return { success: true, ticket: response.data.ticket };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch ticket',
      };
    }
  }

  async addMessage(
    ticketId: string,
    message: string,
    attachments?: string[],
  ): Promise<{
    success: boolean;
    newMessage?: TicketMessage;
    error?: string;
  }> {
    try {
      const response = await this.api.post(
        `/support/tickets/${ticketId}/messages`,
        {
          message,
          attachments,
        },
      );
      return { success: true, newMessage: response.data.message };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to send message',
      };
    }
  }

  async getMessages(
    ticketId: string,
    page: number = 1,
  ): Promise<{
    success: boolean;
    messages?: TicketMessage[];
    hasMore?: boolean;
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/support/tickets/${ticketId}/messages`,
        {
          params: { page },
        },
      );
      return {
        success: true,
        messages: response.data.messages,
        hasMore: response.data.hasMore,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch messages',
      };
    }
  }

  async closeTicket(ticketId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post(`/support/tickets/${ticketId}/close`);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to close ticket',
      };
    }
  }

  async reopenTicket(
    ticketId: string,
    reason: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post(`/support/tickets/${ticketId}/reopen`, { reason });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to reopen ticket',
      };
    }
  }

  async rateTicket(
    ticketId: string,
    rating: number,
    feedback?: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.api.post(`/support/tickets/${ticketId}/rate`, {
        rating,
        feedback,
      });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to rate ticket',
      };
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const response = await this.api.get('/support/unread-count');
      return response.data.count || 0;
    } catch {
      return 0;
    }
  }

  async markAsRead(ticketId: string): Promise<void> {
    try {
      await this.api.post(`/support/tickets/${ticketId}/read`);
    } catch {}
  }

  async getQuickHelp(): Promise<{
    success: boolean;
    topics?: { title: string; icon: string; articleCount: number }[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/support/quick-help');
      return { success: true, topics: response.data.topics };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch help topics',
      };
    }
  }

  async getFAQ(category?: string): Promise<{
    success: boolean;
    faqs?: { question: string; answer: string; category: string }[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/support/faq', {
        params: { category },
      });
      return { success: true, faqs: response.data.faqs };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch FAQs',
      };
    }
  }
}

export const supportService = new SupportService();
export default supportService;

