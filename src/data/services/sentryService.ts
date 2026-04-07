import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  timestamp: number;
  context?: Record<string, any>;
  level: 'error' | 'warning' | 'info';
}

export interface UserFeedback {
  email: string;
  message: string;
  orderId?: string;
}

type ErrorCallback = (error: ErrorLog) => void;
type Breadcrumb = {
  message: string;
  category: string;
  timestamp: number;
  data?: Record<string, any>;
};

class SentryService {
  private errorLogs: ErrorLog[] = [];
  private breadcrumbs: Breadcrumb[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private maxLogs = 100;
  private maxBreadcrumbs = 50;
  private isInitialized = false;
  private userId: string | null = null;
  private releaseVersion: string = '1.0.0';

  async initialize(options: { releaseVersion?: string } = {}): Promise<void> {
    if (this.isInitialized) return;

    if (options.releaseVersion) {
      this.releaseVersion = options.releaseVersion;
    }

    await this.loadErrorLogs();

    this.setupGlobalErrorHandlers();

    this.isInitialized = true;
  }

  private async loadErrorLogs(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('error_logs');
      if (saved) {
        this.errorLogs = JSON.parse(saved);
      }
    } catch {
      this.errorLogs = [];
    }
  }

  private async saveErrorLogs(): Promise<void> {
    try {
      await AsyncStorage.setItem('error_logs', JSON.stringify(this.errorLogs));
    } catch {
      console.warn('Failed to save error logs');
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Global error handlers for React Native would be set up at the App level
    // This method is available for manual error capture
  }

  captureException(
    error: Error,
    options: {
      source?: string;
      lineno?: number;
      colno?: number;
      type?: string;
      context?: Record<string, any>;
    } = {},
  ): string {
    const errorLog: ErrorLog = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: error.message || 'Unknown error',
      stack: error.stack,
      timestamp: Date.now(),
      context: {
        ...options.context,
        source: options.source,
        lineno: options.lineno,
        colno: options.colno,
        type: options.type,
        userId: this.userId,
        release: this.releaseVersion,
        userAgent:
          typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      },
      level: 'error',
    };

    this.errorLogs.unshift(errorLog);
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs = this.errorLogs.slice(0, this.maxLogs);
    }

    this.saveErrorLogs();

    this.errorCallbacks.forEach(callback => {
      try {
        callback(errorLog);
      } catch {
        console.warn('Error callback failed');
      }
    });

    console.error(`[Sentry] Error captured: ${errorLog.message}`, errorLog);

    return errorLog.id;
  }

  captureMessage(
    message: string,
    options: {
      level?: 'error' | 'warning' | 'info';
      context?: Record<string, any>;
    } = {},
  ): string {
    const errorLog: ErrorLog = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      timestamp: Date.now(),
      context: {
        ...options.context,
        userId: this.userId,
        release: this.releaseVersion,
      },
      level: options.level || 'info',
    };

    if (options.level === 'error') {
      this.errorLogs.unshift(errorLog);
      if (this.errorLogs.length > this.maxLogs) {
        this.errorLogs = this.errorLogs.slice(0, this.maxLogs);
      }
      this.saveErrorLogs();
    }

    return errorLog.id;
  }

  addBreadcrumb(
    message: string,
    category: string,
    data?: Record<string, any>,
  ): void {
    const breadcrumb: Breadcrumb = {
      message,
      category,
      timestamp: Date.now(),
      data,
    };

    this.breadcrumbs.unshift(breadcrumb);
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(0, this.maxBreadcrumbs);
    }
  }

  setUser(userId: string, extra?: Record<string, any>): void {
    this.userId = userId;
    this.addBreadcrumb('User set', 'session', { userId, ...extra });
  }

  clearUser(): void {
    this.userId = null;
    this.addBreadcrumb('User cleared', 'session');
  }

  setTag(key: string, value: string): void {
    this.addBreadcrumb(`Tag set: ${key}`, 'tags', { [key]: value });
  }

  setContext(key: string, context: Record<string, any>): void {
    this.addBreadcrumb(`Context set: ${key}`, 'context', { [key]: context });
  }

  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
    };
  }

  getErrorLogs(
    options: {
      limit?: number;
      level?: 'error' | 'warning' | 'info';
      since?: number;
    } = {},
  ): ErrorLog[] {
    let logs = [...this.errorLogs];

    if (options.level) {
      logs = logs.filter(log => log.level === options.level);
    }

    if (options.since) {
      logs = logs.filter(log => log.timestamp >= options.since!);
    }

    return logs.slice(0, options.limit || this.maxLogs);
  }

  getRecentErrors(limit = 10): ErrorLog[] {
    return this.getErrorLogs({ limit, level: 'error' });
  }

  clearErrorLogs(): void {
    this.errorLogs = [];
    this.saveErrorLogs();
  }

  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  async getDiagnostics(): Promise<{
    errorCount: number;
    warningCount: number;
    recentErrors: ErrorLog[];
    breadcrumbs: Breadcrumb[];
    userId: string | null;
    release: string;
  }> {
    return {
      errorCount: this.errorLogs.filter(e => e.level === 'error').length,
      warningCount: this.errorLogs.filter(e => e.level === 'warning').length,
      recentErrors: this.getRecentErrors(20),
      breadcrumbs: this.getBreadcrumbs(),
      userId: this.userId,
      release: this.releaseVersion,
    };
  }

  exportLogs(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        logs: this.errorLogs,
        breadcrumbs: this.breadcrumbs,
        userId: this.userId,
        release: this.releaseVersion,
      },
      null,
      2,
    );
  }

  async submitFeedback(feedback: UserFeedback): Promise<{ success: boolean }> {
    try {
      console.log('[Sentry] Feedback submitted:', feedback);
      this.addBreadcrumb('Feedback submitted', 'feedback', feedback);
      return { success: true };
    } catch {
      return { success: false };
    }
  }
}

export const sentryService = new SentryService();
export default sentryService;
