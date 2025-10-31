/**
 * Error logging utility for QCS Cargo application
 */

import { monitoring, type ErrorContext } from './monitoring';
import { logger } from './logger';

export interface ErrorLogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  context?: Record<string, unknown>;
  stack?: string;
}

class ErrorLogger {
  private logs: ErrorLogEntry[] = [];

  log(level: 'error' | 'warn' | 'info', message: string, context?: Record<string, unknown>, error?: Error) {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      stack: error?.stack
    };

    this.logs.push(entry);
    
    // Use logger utility for consistent logging
    if (level === 'error') {
      logger.error(message, error instanceof Error ? error : undefined, context);
    } else if (level === 'warn') {
      logger.warn(message, context);
    } else {
      logger.info(message, context);
    }

    // Send to monitoring service for errors and warnings
    if (level === 'error' && error) {
      const errorContext: ErrorContext = {
        component: (context && typeof context === 'object' && 'component' in context && typeof context.component === 'string') ? context.component : 'unknown',
        action: (context && typeof context === 'object' && 'action' in context && typeof context.action === 'string') ? context.action : 'error_logged',
        metadata: context,
        url: window.location.href,
        userAgent: navigator.userAgent
      };
      monitoring.captureError(error, errorContext);
    }

    // Keep only last 100 logs to prevent memory issues
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
  }

  error(message: string, context?: Record<string, unknown>, error?: Error) {
    this.log('error', message, context, error);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  getLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const errorLogger = new ErrorLogger();

// Export specific logging functions for backward compatibility
export const logError = (message: string, context?: Record<string, unknown>, error?: Error) => {
  errorLogger.error(message, context, error);
};

export const logAuthError = (message: string, context?: Record<string, unknown>, additionalContext?: Record<string, unknown>) => {
  errorLogger.error(`[AUTH] ${message}`, { ...context, ...additionalContext });
};

export const logValidationError = (message: string, field?: string, value?: unknown) => {
  errorLogger.error(`[VALIDATION] ${message}`, { field, value });
};

export const logDatabaseError = (error: Error | string, table?: string, operation?: string, data?: unknown) => {
  const message = typeof error === 'string' ? error : error.message;
  const errorObj = typeof error === 'string' ? undefined : error;
  errorLogger.error(`[DATABASE] ${message}`, { table, operation, data }, errorObj);
};

export default errorLogger;