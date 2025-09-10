/**
 * Error logging utility for QCS Cargo application
 */

export interface ErrorLogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  context?: any;
  stack?: string;
}

class ErrorLogger {
  private logs: ErrorLogEntry[] = [];

  log(level: 'error' | 'warn' | 'info', message: string, context?: any, error?: Error) {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      stack: error?.stack
    };

    this.logs.push(entry);
    
    // Console logging for development
    if (level === 'error') {
      console.error(`[${entry.timestamp}] ERROR:`, message, context, error);
    } else if (level === 'warn') {
      console.warn(`[${entry.timestamp}] WARN:`, message, context);
    } else {
      console.log(`[${entry.timestamp}] INFO:`, message, context);
    }

    // Keep only last 100 logs to prevent memory issues
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
  }

  error(message: string, context?: any, error?: Error) {
    this.log('error', message, context, error);
  }

  warn(message: string, context?: any) {
    this.log('warn', message, context);
  }

  info(message: string, context?: any) {
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
export const logError = (message: string, context?: any, error?: Error) => {
  errorLogger.error(message, context, error);
};

export const logAuthError = (message: string, context?: any, additionalContext?: any) => {
  errorLogger.error(`[AUTH] ${message}`, { context, additionalContext });
};

export const logValidationError = (message: string, field?: string, value?: any) => {
  errorLogger.error(`[VALIDATION] ${message}`, { field, value });
};

export const logDatabaseError = (error: Error | string, table?: string, operation?: string, data?: any) => {
  const message = typeof error === 'string' ? error : error.message;
  const errorObj = typeof error === 'string' ? undefined : error;
  errorLogger.error(`[DATABASE] ${message}`, { table, operation, data }, errorObj);
};

export default errorLogger;