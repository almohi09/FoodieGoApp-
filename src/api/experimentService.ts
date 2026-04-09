import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import appEnv from '../config/env';

const API_BASE_URL = appEnv.apiBaseUrl;
const EXPERIMENTS_STORAGE_KEY = '@ab_experiments';

export interface Experiment {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
  variants: ExperimentVariant[];
  targeting: ExperimentTargeting;
  startDate: string;
  endDate?: string;
  metrics: string[];
}

export interface ExperimentVariant {
  id: string;
  name: string;
  weight: number;
  config: Record<string, any>;
}

export interface ExperimentTargeting {
  userIds?: string[];
  userSegments?: string[];
  minOrders?: number;
  maxOrders?: number;
  newUsersOnly?: boolean;
}

export interface ExperimentAssignment {
  experimentId: string;
  variantId: string;
  config: Record<string, any>;
}

export interface ExperimentConversion {
  experimentId: string;
  variantId: string;
  eventName: string;
  count: number;
  value: number;
}

class ExperimentService {
  private api: AxiosInstance;
  private token: string | null = null;
  private cachedAssignments: Map<string, ExperimentAssignment> = new Map();
  private userId: string | null = null;

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

    this.loadCachedAssignments();
  }

  private async loadCachedAssignments(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(EXPERIMENTS_STORAGE_KEY);
      if (saved) {
        const assignments = JSON.parse(saved) as ExperimentAssignment[];
        assignments.forEach(a => this.cachedAssignments.set(a.experimentId, a));
      }
    } catch {}
  }

  private async saveCachedAssignments(): Promise<void> {
    try {
      const assignments = Array.from(this.cachedAssignments.values());
      await AsyncStorage.setItem(
        EXPERIMENTS_STORAGE_KEY,
        JSON.stringify(assignments),
      );
    } catch {}
  }

  async setUserId(userId: string): Promise<void> {
    this.userId = userId;
    await this.fetchAssignments();
  }

  async fetchAssignments(): Promise<void> {
    if (!this.userId) return;

    try {
      const response = await this.api.get('/experiments/assignments', {
        params: { userId: this.userId },
      });

      const assignments = response.data.assignments as ExperimentAssignment[];
      this.cachedAssignments.clear();
      assignments.forEach(a => this.cachedAssignments.set(a.experimentId, a));
      await this.saveCachedAssignments();
    } catch {}
  }

  getVariant(experimentId: string): ExperimentAssignment | null {
    return this.cachedAssignments.get(experimentId) || null;
  }

  getConfig<T = any>(experimentId: string, key: string, defaultValue: T): T {
    const assignment = this.cachedAssignments.get(experimentId);
    if (!assignment) return defaultValue;
    return (assignment.config[key] as T) ?? defaultValue;
  }

  async trackConversion(
    experimentId: string,
    variantId: string,
    eventName: string,
    value?: number,
  ): Promise<void> {
    try {
      await this.api.post('/experiments/track', {
        experimentId,
        variantId,
        eventName,
        value,
        userId: this.userId,
        timestamp: new Date().toISOString(),
      });
    } catch {}
  }

  async getActiveExperiments(): Promise<{
    success: boolean;
    experiments?: Experiment[];
    error?: string;
  }> {
    try {
      const response = await this.api.get('/experiments');
      return { success: true, experiments: response.data.experiments };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch experiments',
      };
    }
  }

  async getExperimentById(experimentId: string): Promise<{
    success: boolean;
    experiment?: Experiment;
    error?: string;
  }> {
    try {
      const response = await this.api.get(`/experiments/${experimentId}`);
      return { success: true, experiment: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch experiment',
      };
    }
  }

  async getExperimentResults(experimentId: string): Promise<{
    success: boolean;
    results?: {
      variantId: string;
      variantName: string;
      impressions: number;
      conversions: number;
      conversionRate: number;
      avgValue: number;
      statisticalSignificance: number;
    }[];
    error?: string;
  }> {
    try {
      const response = await this.api.get(
        `/experiments/${experimentId}/results`,
      );
      return { success: true, results: response.data.results };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch results',
      };
    }
  }

  isFeatureEnabled(featureKey: string): boolean {
    for (const assignment of this.cachedAssignments.values()) {
      if (assignment.config[`feature_${featureKey}`] !== undefined) {
        return assignment.config[`feature_${featureKey}`] as boolean;
      }
    }
    return false;
  }

  getFeatureValue<T>(featureKey: string, defaultValue: T): T {
    for (const assignment of this.cachedAssignments.values()) {
      if (assignment.config[`feature_${featureKey}`] !== undefined) {
        return assignment.config[`feature_${featureKey}`] as T;
      }
    }
    return defaultValue;
  }

  clearCache(): void {
    this.cachedAssignments.clear();
    AsyncStorage.removeItem(EXPERIMENTS_STORAGE_KEY);
  }
}

export const experimentService = new ExperimentService();
export default experimentService;


