/**
 * Retry logic with exponential backoff for handling transient failures
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  retryCondition?: (error: any) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
  totalDelay: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryCondition: (error: any) => {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true; // Network error
    }
    if (error.name === 'AbortError') {
      return true; // Timeout
    }
    if (error.status >= 500 && error.status < 600) {
      return true; // Server error
    }
    if (error.status === 429) {
      return true; // Rate limited
    }
    return false;
  }
};

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number, 
  baseDelay: number, 
  maxDelay: number, 
  backoffMultiplier: number, 
  jitter: boolean
): number {
  const exponentialDelay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);
  
  if (jitter) {
    // Add random jitter to prevent thundering herd
    const jitterAmount = cappedDelay * 0.1;
    const randomJitter = (Math.random() - 0.5) * 2 * jitterAmount;
    return Math.max(0, cappedDelay + randomJitter);
  }
  
  return cappedDelay;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  let totalDelay = 0;
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await fn();
      return {
        success: true,
        data: result,
        attempts: attempt,
        totalDelay
      };
    } catch (error) {
      lastError = error;
      
      // Check if we should retry this error
      if (!config.retryCondition(error)) {
        return {
          success: false,
          error,
          attempts: attempt,
          totalDelay
        };
      }
      
      // Don't sleep after the last attempt
      if (attempt < config.maxRetries) {
        const delay = calculateDelay(
          attempt,
          config.baseDelay,
          config.maxDelay,
          config.backoffMultiplier,
          config.jitter
        );
        
        totalDelay += delay;
        await sleep(delay);
      }
    }
  }
  
  return {
    success: false,
    error: lastError,
    attempts: config.maxRetries,
    totalDelay
  };
}

/**
 * Retry with circuit breaker pattern
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000,
    private retryOptions: RetryOptions = {}
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<RetryResult<T>> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        return {
          success: false,
          error: new Error('Circuit breaker is OPEN'),
          attempts: 0,
          totalDelay: 0
        };
      }
    }
    
    const result = await retryWithBackoff(fn, this.retryOptions);
    
    if (result.success) {
      this.onSuccess();
    } else {
      this.onFailure();
    }
    
    return result;
  }
  
  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
  
  getState(): string {
    return this.state;
  }
  
  getFailureCount(): number {
    return this.failureCount;
  }
}

/**
 * Retry specific operations with appropriate configurations
 */
export const retryConfigs = {
  // Database operations - more aggressive retry
  database: {
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true
  },
  
  // API calls - moderate retry
  api: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 15000,
    backoffMultiplier: 2,
    jitter: true
  },
  
  // File operations - fewer retries
  file: {
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 8000,
    backoffMultiplier: 2,
    jitter: false
  },
  
  // Critical operations - maximum retry
  critical: {
    maxRetries: 10,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 1.5,
    jitter: true
  }
};

/**
 * Convenience functions for common retry scenarios
 */
export const retryDatabase = <T>(fn: () => Promise<T>) => 
  retryWithBackoff(fn, retryConfigs.database);

export const retryApi = <T>(fn: () => Promise<T>) => 
  retryWithBackoff(fn, retryConfigs.api);

export const retryFile = <T>(fn: () => Promise<T>) => 
  retryWithBackoff(fn, retryConfigs.file);

export const retryCritical = <T>(fn: () => Promise<T>) => 
  retryWithBackoff(fn, retryConfigs.critical);

/**
 * Retry with timeout
 */
export async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
  });
  
  const retryPromise = retryWithBackoff(fn, options);
  
  try {
    const result = await Promise.race([retryPromise, timeoutPromise]);
    return result;
  } catch (error) {
    return {
      success: false,
      error,
      attempts: 0,
      totalDelay: 0
    };
  }
}

/**
 * Batch retry for multiple operations
 */
export async function retryBatch<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<Array<RetryResult<T>>> {
  const results = await Promise.allSettled(
    operations.map(op => retryWithBackoff(op, options))
  );
  
  return results.map(result => 
    result.status === 'fulfilled' 
      ? result.value 
      : {
          success: false,
          error: result.reason,
          attempts: 0,
          totalDelay: 0
        }
  );
}
