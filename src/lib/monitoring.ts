/**
 * Monitoring and error tracking utilities for QCS Cargo
 */

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface BusinessMetric {
  event: string;
  value?: number;
  properties?: Record<string, any>;
  timestamp: string;
  userId?: string;
}

class MonitoringService {
  private errorQueue: Array<{ error?: Error; context: ErrorContext; message?: string; level?: string; timestamp?: string }> = [];
  private performanceQueue: PerformanceMetric[] = [];
  private businessQueue: BusinessMetric[] = [];
  private sessionId: string;
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupOnlineListener();
    this.setupErrorBoundary();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushQueues();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private setupErrorBoundary(): void {
    window.addEventListener('error', (event) => {
      this.captureError(new Error(event.message), {
        component: 'global',
        action: 'unhandled_error',
        url: event.filename,
        metadata: {
          line: event.lineno,
          column: event.colno,
          stack: event.error?.stack
        }
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(new Error(event.reason), {
        component: 'global',
        action: 'unhandled_promise_rejection',
        metadata: {
          reason: event.reason
        }
      });
    });
  }

  /**
   * Capture and track errors
   */
  captureError(error: Error, context: ErrorContext = {}): void {
    const errorData = {
      error,
      context: {
        ...context,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        url: context.url || window.location.href,
        userAgent: context.userAgent || navigator.userAgent
      }
    };

    this.errorQueue.push(errorData);

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error captured:', error, context);
    }

    // Send to backend if online
    if (this.isOnline) {
      this.sendErrorToBackend(errorData);
    }

    // Keep only last 50 errors in memory
    if (this.errorQueue.length > 50) {
      this.errorQueue = this.errorQueue.slice(-50);
    }
  }

  /**
   * Capture warning events
   */
  captureWarning(message: string, context: ErrorContext = { component: 'unknown', action: 'warning' }): void {
    const warningData = {
      message,
      context,
      timestamp: new Date().toISOString(),
      level: 'warning'
    };

    this.errorQueue.push(warningData);

    // Log to console in development
    if (import.meta.env.DEV) {
      console.warn('Warning captured:', message, context);
    }

    // Send to backend if online
    if (this.isOnline) {
      this.sendErrorToBackend(warningData);
    }
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: PerformanceMetric): void {
    const performanceData = {
      ...metric,
      timestamp: metric.timestamp || new Date().toISOString()
    };

    this.performanceQueue.push(performanceData);

    if (this.isOnline) {
      this.sendPerformanceToBackend(performanceData);
    }

    // Keep only last 100 metrics in memory
    if (this.performanceQueue.length > 100) {
      this.performanceQueue = this.performanceQueue.slice(-100);
    }
  }

  /**
   * Track business metrics
   */
  trackBusiness(metric: BusinessMetric): void {
    const businessData = {
      ...metric,
      timestamp: metric.timestamp || new Date().toISOString()
    };

    this.businessQueue.push(businessData);

    if (this.isOnline) {
      this.sendBusinessToBackend(businessData);
    }

    // Keep only last 200 metrics in memory
    if (this.businessQueue.length > 200) {
      this.businessQueue = this.businessQueue.slice(-200);
    }
  }

  /**
   * Track API call performance
   */
  trackApiCall<T>(
    apiCall: () => Promise<T>,
    context: { endpoint: string; method: string; userId?: string }
  ): Promise<T> {
    const startTime = performance.now();
    
    return apiCall()
      .then((result) => {
        const duration = performance.now() - startTime;
        this.trackPerformance({
          name: 'api_call_duration',
          value: duration,
          unit: 'milliseconds',
          timestamp: new Date().toISOString(),
          metadata: {
            endpoint: context.endpoint,
            method: context.method,
            success: true
          }
        });
        return result;
      })
      .catch((error) => {
        const duration = performance.now() - startTime;
        this.trackPerformance({
          name: 'api_call_duration',
          value: duration,
          unit: 'milliseconds',
          timestamp: new Date().toISOString(),
          metadata: {
            endpoint: context.endpoint,
            method: context.method,
            success: false,
            error: error.message
          }
        });
        
        this.captureError(error, {
          component: 'api',
          action: 'api_call_failed',
          userId: context.userId,
          metadata: {
            endpoint: context.endpoint,
            method: context.method
          }
        });
        
        throw error;
      });
  }

  /**
   * Track user interactions
   */
  trackUserAction(action: string, properties: Record<string, any> = {}): void {
    this.trackBusiness({
      event: `user_action_${action}`,
      properties,
      userId: this.getCurrentUserId(),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track booking events
   */
  trackBookingEvent(event: string, properties: Record<string, any> = {}): void {
    this.trackBusiness({
      event: `booking_${event}`,
      properties,
      userId: this.getCurrentUserId(),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track quote events
   */
  trackQuoteEvent(event: string, properties: Record<string, any> = {}): void {
    this.trackBusiness({
      event: `quote_${event}`,
      properties,
      userId: this.getCurrentUserId(),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get current user ID from auth context
   */
  private getCurrentUserId(): string | undefined {
    // This would be injected from the auth context
    return (window as any).__currentUserId;
  }

  /**
   * Send error to backend
   */
  private async sendErrorToBackend(errorData: { error?: Error; context: ErrorContext; message?: string; level?: string }): Promise<void> {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: errorData.error?.message || 'Unknown error',
          stack: errorData.error?.stack || '',
          context: errorData.context
        })
      });
    } catch (err) {
      console.warn('Failed to send error to backend:', err);
    }
  }

  /**
   * Send performance metric to backend
   */
  private async sendPerformanceToBackend(metric: PerformanceMetric): Promise<void> {
    try {
      await fetch('/api/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metric)
      });
    } catch (err) {
      console.warn('Failed to send performance metric to backend:', err);
    }
  }

  /**
   * Send business metric to backend
   */
  private async sendBusinessToBackend(metric: BusinessMetric): Promise<void> {
    try {
      await fetch('/api/business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metric)
      });
    } catch (err) {
      console.warn('Failed to send business metric to backend:', err);
    }
  }

  /**
   * Flush all queues when back online
   */
  private async flushQueues(): Promise<void> {
    if (!this.isOnline) return;

    // Flush errors
    for (const errorData of this.errorQueue) {
      await this.sendErrorToBackend(errorData);
    }
    this.errorQueue = [];

    // Flush performance metrics
    for (const metric of this.performanceQueue) {
      await this.sendPerformanceToBackend(metric);
    }
    this.performanceQueue = [];

    // Flush business metrics
    for (const metric of this.businessQueue) {
      await this.sendBusinessToBackend(metric);
    }
    this.businessQueue = [];
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get monitoring data for debugging
   */
  getDebugData(): {
    errors: number;
    performance: number;
    business: number;
    sessionId: string;
    isOnline: boolean;
  } {
    return {
      errors: this.errorQueue.length,
      performance: this.performanceQueue.length,
      business: this.businessQueue.length,
      sessionId: this.sessionId,
      isOnline: this.isOnline
    };
  }
}

// Create singleton instance
export const monitoring = new MonitoringService();

// Export convenience functions
export const captureError = (error: Error, context?: ErrorContext) => monitoring.captureError(error, context);
export const trackPerformance = (metric: PerformanceMetric) => monitoring.trackPerformance(metric);
export const trackBusiness = (metric: BusinessMetric) => monitoring.trackBusiness(metric);
export const trackApiCall = <T>(apiCall: () => Promise<T>, context: { endpoint: string; method: string; userId?: string }) => 
  monitoring.trackApiCall(apiCall, context);
export const trackUserAction = (action: string, properties?: Record<string, any>) => 
  monitoring.trackUserAction(action, properties);
export const trackBookingEvent = (event: string, properties?: Record<string, any>) => 
  monitoring.trackBookingEvent(event, properties);
export const trackQuoteEvent = (event: string, properties?: Record<string, any>) => 
  monitoring.trackQuoteEvent(event, properties);

export default monitoring;
