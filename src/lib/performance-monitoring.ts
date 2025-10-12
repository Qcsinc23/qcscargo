/**
 * Performance monitoring and optimization utilities
 */

import { monitoring } from './monitoring';
import type { ErrorContext } from './error-handling';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface DatabaseQueryMetric {
  query: string;
  duration: number;
  rows: number;
  timestamp: string;
  context?: string;
}

export interface APIMetric {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: string;
  userId?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private queryMetrics: DatabaseQueryMetric[] = [];
  private apiMetrics: APIMetric[] = [];
  private maxMetrics = 1000;

  /**
   * Track a performance metric
   */
  trackMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
    
    // Send to monitoring service
    monitoring.trackPerformance(metric);
  }

  /**
   * Track database query performance
   */
  trackQuery(query: string, duration: number, rows: number, context?: string): void {
    const metric: DatabaseQueryMetric = {
      query: this.sanitizeQuery(query),
      duration,
      rows,
      timestamp: new Date().toISOString(),
      context
    };
    
    this.queryMetrics.push(metric);
    
    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxMetrics) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetrics);
    }
    
    // Log slow queries
    if (duration > 1000) { // 1 second
      console.warn('Slow query detected:', {
        query: metric.query,
        duration: `${duration}ms`,
        rows,
        context
      });
      
      monitoring.captureWarning('Slow database query', {
        component: 'database',
        action: 'slow_query',
        query: metric.query,
        duration,
        rows,
        context: context || 'unknown'
      } as ErrorContext);
    }
  }

  /**
   * Track API endpoint performance
   */
  trackAPI(endpoint: string, method: string, duration: number, statusCode: number, userId?: string): void {
    const metric: APIMetric = {
      endpoint,
      method,
      duration,
      statusCode,
      timestamp: new Date().toISOString(),
      userId
    };
    
    this.apiMetrics.push(metric);
    
    // Keep only recent metrics
    if (this.apiMetrics.length > this.maxMetrics) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxMetrics);
    }
    
    // Log slow API calls
    if (duration > 2000) { // 2 seconds
      console.warn('Slow API call detected:', {
        endpoint,
        method,
        duration: `${duration}ms`,
        statusCode
      });
      
      monitoring.captureWarning('Slow API call', {
        component: 'api',
        action: 'slow_call',
        endpoint,
        method,
        duration,
        statusCode,
        userId
      } as ErrorContext);
    }
  }

  /**
   * Measure function execution time
   */
  async measureFunction<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      this.trackMetric({
        name,
        value: duration,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        metadata: {
          ...metadata,
          success: true
        }
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      this.trackMetric({
        name,
        value: duration,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        metadata: {
          ...metadata,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      throw error;
    }
  }

  /**
   * Measure component render time
   */
  measureComponent(componentName: string, renderTime: number): void {
    this.trackMetric({
      name: `component_render_${componentName}`,
      value: renderTime,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      metadata: {
        component: componentName
      }
    });
  }

  /**
   * Measure page load time
   */
  measurePageLoad(pageName: string, loadTime: number): void {
    this.trackMetric({
      name: `page_load_${pageName}`,
      value: loadTime,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      metadata: {
        page: pageName
      }
    });
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    metrics: PerformanceMetric[];
    slowQueries: DatabaseQueryMetric[];
    slowAPIs: APIMetric[];
    averageResponseTime: number;
    totalRequests: number;
  } {
    const slowQueries = this.queryMetrics.filter(q => q.duration > 1000);
    const slowAPIs = this.apiMetrics.filter(a => a.duration > 2000);
    
    const allDurations = [
      ...this.metrics.map(m => m.value),
      ...this.queryMetrics.map(q => q.duration),
      ...this.apiMetrics.map(a => a.duration)
    ];
    
    const averageResponseTime = allDurations.length > 0 
      ? allDurations.reduce((sum, duration) => sum + duration, 0) / allDurations.length
      : 0;
    
    return {
      metrics: this.metrics.slice(-100), // Last 100 metrics
      slowQueries,
      slowAPIs,
      averageResponseTime,
      totalRequests: this.apiMetrics.length
    };
  }

  /**
   * Get query performance analysis
   */
  getQueryAnalysis(): {
    slowestQueries: DatabaseQueryMetric[];
    mostFrequentQueries: Array<{ query: string; count: number; avgDuration: number }>;
    totalQueryTime: number;
  } {
    const slowestQueries = [...this.queryMetrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
    
    const queryStats = new Map<string, { count: number; totalDuration: number }>();
    
    this.queryMetrics.forEach(metric => {
      const existing = queryStats.get(metric.query) || { count: 0, totalDuration: 0 };
      queryStats.set(metric.query, {
        count: existing.count + 1,
        totalDuration: existing.totalDuration + metric.duration
      });
    });
    
    const mostFrequentQueries = Array.from(queryStats.entries())
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    const totalQueryTime = this.queryMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    
    return {
      slowestQueries,
      mostFrequentQueries,
      totalQueryTime
    };
  }

  /**
   * Sanitize SQL query for logging
   */
  private sanitizeQuery(query: string): string {
    return query
      .replace(/\$\d+/g, '?') // Replace parameter placeholders
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 200); // Limit length
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.queryMetrics = [];
    this.apiMetrics = [];
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Performance monitoring decorators and utilities
 */

/**
 * Decorator to measure function performance
 */
export function measurePerformance(name: string, metadata?: Record<string, any>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.measureFunction(
        `${target.constructor.name}.${propertyName}`,
        () => method.apply(this, args),
        metadata
      );
    };
  };
}

/**
 * Higher-order function to measure async operations
 */
export function withPerformanceTracking<T extends any[], R>(
  name: string,
  fn: (...args: T) => Promise<R>,
  metadata?: Record<string, any>
) {
  return async (...args: T): Promise<R> => {
    return performanceMonitor.measureFunction(name, () => fn(...args), metadata);
  };
}

/**
 * React hook for measuring component performance
 */
export function usePerformanceTracking(componentName: string) {
  const startTime = performance.now();
  
  return {
    endMeasurement: () => {
      const endTime = performance.now();
      performanceMonitor.measureComponent(componentName, endTime - startTime);
    }
  };
}

/**
 * Web Vitals monitoring
 */
export class WebVitalsMonitor {
  private vitals: Array<{ name: string; value: number; timestamp: string }> = [];
  
  constructor() {
    this.initializeWebVitals();
  }
  
  private initializeWebVitals(): void {
    // Monitor Core Web Vitals
    if (typeof window !== 'undefined') {
      // First Contentful Paint
      this.observePaint('first-contentful-paint');
      
      // Largest Contentful Paint
      this.observeLCP();
      
      // First Input Delay
      this.observeFID();
      
      // Cumulative Layout Shift
      this.observeCLS();
    }
  }
  
  private observePaint(metricName: string): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === metricName) {
            this.recordVital(metricName, entry.startTime);
          }
        }
      });
      
      observer.observe({ entryTypes: ['paint'] });
    }
  }
  
  private observeLCP(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordVital('largest-contentful-paint', lastEntry.startTime);
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    }
  }
  
  private observeFID(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as PerformanceEventTiming;
          if (fidEntry.processingStart) {
            this.recordVital('first-input-delay', fidEntry.processingStart - fidEntry.startTime);
          }
        }
      });
      
      observer.observe({ entryTypes: ['first-input'] });
    }
  }
  
  private observeCLS(): void {
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.recordVital('cumulative-layout-shift', clsValue);
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
    }
  }
  
  private recordVital(name: string, value: number): void {
    const vital = {
      name,
      value,
      timestamp: new Date().toISOString()
    };
    
    this.vitals.push(vital);
    
    // Send to monitoring service
    monitoring.trackPerformance({
      name: `web_vital_${name}`,
      value,
      unit: 'ms',
      timestamp: vital.timestamp
    });
  }
  
  getVitals(): Array<{ name: string; value: number; timestamp: string }> {
    return [...this.vitals];
  }
}

// Initialize Web Vitals monitoring
export const webVitalsMonitor = new WebVitalsMonitor();

/**
 * Database performance monitoring
 */
export class DatabasePerformanceMonitor {
  private queries: Map<string, { count: number; totalTime: number; minTime: number; maxTime: number }> = new Map();
  
  trackQuery(query: string, duration: number, rows: number): void {
    const sanitizedQuery = this.sanitizeQuery(query);
    const existing = this.queries.get(sanitizedQuery) || { count: 0, totalTime: 0, minTime: Infinity, maxTime: 0 };
    
    this.queries.set(sanitizedQuery, {
      count: existing.count + 1,
      totalTime: existing.totalTime + duration,
      minTime: Math.min(existing.minTime, duration),
      maxTime: Math.max(existing.maxTime, duration)
    });
    
    // Track in performance monitor
    performanceMonitor.trackQuery(query, duration, rows);
  }
  
  getQueryStats(): Array<{
    query: string;
    count: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
  }> {
    return Array.from(this.queries.entries()).map(([query, stats]) => ({
      query,
      count: stats.count,
      avgTime: stats.totalTime / stats.count,
      minTime: stats.minTime === Infinity ? 0 : stats.minTime,
      maxTime: stats.maxTime,
      totalTime: stats.totalTime
    })).sort((a, b) => b.totalTime - a.totalTime);
  }
  
  private sanitizeQuery(query: string): string {
    return query
      .replace(/\$\d+/g, '?')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }
}

export const databasePerformanceMonitor = new DatabasePerformanceMonitor();
