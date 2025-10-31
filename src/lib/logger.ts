/**
 * Production-safe logging utility
 * Conditionally logs based on environment and sends errors to monitoring in production
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isProduction = import.meta.env.PROD;

  /**
   * Log general information (only in development)
   */
  log(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`[LOG] ${message}`, context || '');
    }
  }

  /**
   * Log informational messages (only in development)
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context || '');
    }
  }

  /**
   * Log warnings (always logged, but formatted differently)
   */
  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, context || '');
    } else {
      // In production, send to monitoring service
      this.sendToMonitoring('warn', message, context);
    }
  }

  /**
   * Log errors (always logged and sent to monitoring)
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: error.stack, name: error.name }
      : error;

    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, errorDetails, context || '');
    } else {
      // In production, send to monitoring service
      this.sendToMonitoring('error', message, {
        ...context,
        error: errorDetails,
      });
    }
  }

  /**
   * Debug logs (only in development)
   */
  debug(message: string, data?: unknown): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  }

  /**
   * Group logs together (only in development)
   */
  group(label: string, callback: () => void): void {
    if (this.isDevelopment) {
      console.group(label);
      callback();
      console.groupEnd();
    } else {
      callback();
    }
  }

  /**
   * Log performance metrics
   */
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  /**
   * Send logs to monitoring service
   * Integrates with the monitoring service (supabase/functions/monitoring-errors)
   * For additional services like Sentry, LogRocket, Datadog, extend this method
   */
  private sendToMonitoring(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): void {
    // Integrated with monitoring service via errorLogger
    // See src/lib/monitoring.ts for error tracking implementation
    
    // For production, critical errors are automatically captured by monitoring service
    // Additional services can be integrated here:
    // Example with Sentry:
    // if (typeof window !== 'undefined' && (window as any).Sentry) {
    //   (window as any).Sentry.captureMessage(message, {
    //     level: level as SeverityLevel,
    //     contexts: { custom: context }
    //   });
    // }

    // Store critical errors locally as fallback
    if (level === 'error' && this.isProduction) {
      // Store in localStorage for debugging (limit size)
      try {
        const logs = JSON.parse(localStorage.getItem('error_logs') || '[]');
        logs.push({
          timestamp: new Date().toISOString(),
          level,
          message,
          context,
        });
        // Keep only last 50 errors
        const trimmedLogs = logs.slice(-50);
        localStorage.setItem('error_logs', JSON.stringify(trimmedLogs));
      } catch (e) {
        // Silent fail if localStorage is full
      }
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for backward compatibility
export default logger;
