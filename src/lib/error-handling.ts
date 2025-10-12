/**
 * Comprehensive error handling system with retry logic and monitoring
 */

import { retryWithBackoff, retryConfigs, CircuitBreaker } from './retry';
import { monitoring } from './monitoring';

export interface ErrorContext {
  component: string;
  action: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  classification?: ErrorClassification;
  operation?: string;
  timestamp?: string;
  query?: string;
  endpoint?: string;
  [key: string]: any; // Allow additional properties
}

export interface ErrorClassification {
  type: 'network' | 'validation' | 'authentication' | 'authorization' | 'business' | 'system' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  userMessage: string;
  technicalMessage: string;
}

/**
 * Classify errors for appropriate handling
 */
function classifyError(error: any): ErrorClassification {
  // Network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return {
      type: 'network',
      severity: 'medium',
      retryable: true,
      userMessage: 'Network connection failed. Please check your internet connection.',
      technicalMessage: 'Network request failed'
    };
  }
  
  if (error.name === 'AbortError') {
    return {
      type: 'network',
      severity: 'medium',
      retryable: true,
      userMessage: 'Request timed out. Please try again.',
      technicalMessage: 'Request timeout'
    };
  }
  
  // HTTP status errors
  if (error.status) {
    switch (error.status) {
      case 400:
        return {
          type: 'validation',
          severity: 'low',
          retryable: false,
          userMessage: 'Invalid request. Please check your input.',
          technicalMessage: 'Bad request'
        };
      case 401:
        return {
          type: 'authentication',
          severity: 'high',
          retryable: false,
          userMessage: 'Please log in to continue.',
          technicalMessage: 'Unauthorized'
        };
      case 403:
        return {
          type: 'authorization',
          severity: 'high',
          retryable: false,
          userMessage: 'You do not have permission to perform this action.',
          technicalMessage: 'Forbidden'
        };
      case 404:
        return {
          type: 'business',
          severity: 'medium',
          retryable: false,
          userMessage: 'The requested resource was not found.',
          technicalMessage: 'Not found'
        };
      case 429:
        return {
          type: 'system',
          severity: 'medium',
          retryable: true,
          userMessage: 'Too many requests. Please wait a moment and try again.',
          technicalMessage: 'Rate limited'
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          type: 'system',
          severity: 'high',
          retryable: true,
          userMessage: 'Server error. Please try again later.',
          technicalMessage: 'Server error'
        };
      default:
        return {
          type: 'unknown',
          severity: 'medium',
          retryable: error.status >= 500,
          userMessage: 'An unexpected error occurred.',
          technicalMessage: `HTTP ${error.status}`
        };
    }
  }
  
  // Business logic errors
  if (error.message?.includes('capacity')) {
    return {
      type: 'business',
      severity: 'medium',
      retryable: false,
      userMessage: 'No vehicles available for the selected time slot.',
      technicalMessage: 'Capacity exceeded'
    };
  }
  
  if (error.message?.includes('conflict')) {
    return {
      type: 'business',
      severity: 'medium',
      retryable: false,
      userMessage: 'This time slot is no longer available.',
      technicalMessage: 'Booking conflict'
    };
  }
  
  // Default classification
  return {
    type: 'unknown',
    severity: 'medium',
    retryable: false,
    userMessage: 'An unexpected error occurred.',
    technicalMessage: error.message || 'Unknown error'
  };
}

/**
 * Enhanced error handler with retry logic and monitoring
 */
export class ErrorHandler {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  
  /**
   * Handle error with appropriate retry logic and monitoring
   */
  async handleError<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options: {
      retryable?: boolean;
      maxRetries?: number;
      circuitBreakerKey?: string;
    } = {}
  ): Promise<{ success: boolean; data?: T; error?: any; userMessage?: string }> {
    const error = await this.executeWithErrorHandling(operation, context, options);
    
    if (error) {
      const classification = classifyError(error);
      
      // Send to monitoring
      monitoring.captureError(error, {
        ...context,
        classification,
        timestamp: new Date().toISOString()
      } as ErrorContext);
      
      return {
        success: false,
        error,
        userMessage: classification.userMessage
      };
    }
    
    return { success: true };
  }
  
  private async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options: {
      retryable?: boolean;
      maxRetries?: number;
      circuitBreakerKey?: string;
    }
  ): Promise<any> {
    try {
      // Use circuit breaker if specified
      if (options.circuitBreakerKey) {
        const circuitBreaker = this.getCircuitBreaker(options.circuitBreakerKey);
        const result = await circuitBreaker.execute(operation);
        
        if (result.success) {
          return null; // No error
        }
        
        return result.error;
      }
      
      // Use retry logic if operation is retryable
      if (options.retryable !== false) {
        const maxRetries = options.maxRetries || 3;
        const { maxRetries: _, ...apiConfig } = retryConfigs.api;
        const retryResult = await retryWithBackoff(operation, {
          maxRetries,
          ...apiConfig
        });
        
        if (retryResult.success) {
          return null; // No error
        }
        
        return retryResult.error;
      }
      
      // Execute without retry
      await operation();
      return null; // No error
      
    } catch (error) {
      return error;
    }
  }
  
  private getCircuitBreaker(key: string): CircuitBreaker {
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, new CircuitBreaker());
    }
    return this.circuitBreakers.get(key)!;
  }
  
  /**
   * Handle partial failures in complex operations
   */
  async handlePartialFailure<T>(
    operations: Array<{ name: string; operation: () => Promise<T> }>,
    context: ErrorContext,
    options: {
      allowPartialSuccess?: boolean;
      criticalOperations?: string[];
    } = {}
  ): Promise<{
    success: boolean;
    results: Array<{ name: string; success: boolean; data?: T; error?: any }>;
    criticalFailed: boolean;
  }> {
    const results: Array<{ name: string; success: boolean; data?: T; error?: any }> = [];
    let criticalFailed = false;
    
    for (const { name, operation } of operations) {
      try {
        const result = await operation();
        results.push({ name, success: true, data: result });
      } catch (error) {
        const isCritical = options.criticalOperations?.includes(name) || false;
        if (isCritical) {
          criticalFailed = true;
        }
        
        results.push({ name, success: false, error });

        // Log error
        const errorToLog = error instanceof Error ? error : new Error(String(error));
        monitoring.captureError(errorToLog, {
          ...context,
          operation: name,
          isCritical
        } as ErrorContext);
      }
    }
    
    const success = options.allowPartialSuccess ? !criticalFailed : results.every(r => r.success);
    
    return {
      success,
      results,
      criticalFailed
    };
  }
  
  /**
   * Create a safe wrapper for async operations
   */
  createSafeWrapper<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: ErrorContext,
    options: {
      retryable?: boolean;
      maxRetries?: number;
      circuitBreakerKey?: string;
    } = {}
  ) {
    return async (...args: T): Promise<{ success: boolean; data?: R; error?: any; userMessage?: string }> => {
      return this.handleError(() => fn(...args), context, options);
    };
  }
}

// Global error handler instance
export const errorHandler = new ErrorHandler();

/**
 * Convenience functions for common error handling scenarios
 */
export const handleApiError = <T>(
  operation: () => Promise<T>,
  context: ErrorContext
) => errorHandler.handleError(operation, context, { retryable: true });

export const handleDatabaseError = <T>(
  operation: () => Promise<T>,
  context: ErrorContext
) => errorHandler.handleError(operation, context, { 
  retryable: true, 
  maxRetries: 5,
  circuitBreakerKey: 'database'
});

export const handleCriticalError = <T>(
  operation: () => Promise<T>,
  context: ErrorContext
) => errorHandler.handleError(operation, context, { 
  retryable: true, 
  maxRetries: 10,
  circuitBreakerKey: 'critical'
});

export const handleUserAction = <T>(
  operation: () => Promise<T>,
  context: ErrorContext
) => errorHandler.handleError(operation, context, { retryable: false });

/**
 * Error boundary for React components
 */
export class ErrorBoundary extends Error {
  constructor(
    message: string,
    public component: string,
    public originalError: Error
  ) {
    super(message);
    this.name = 'ErrorBoundary';
  }
}

/**
 * Create error with context
 */
export function createError(
  message: string,
  context: ErrorContext,
  originalError?: Error
): Error {
  const error = new Error(message);
  (error as any).context = context;
  (error as any).originalError = originalError;
  return error;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  const classification = classifyError(error);
  return classification.retryable;
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: any): string {
  const classification = classifyError(error);
  return classification.userMessage;
}
