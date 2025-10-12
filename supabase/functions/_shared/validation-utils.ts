/**
 * Validation utilities for Supabase Edge Functions
 * Provides middleware for input validation and sanitization
 */

import { z } from 'zod';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

/**
 * Validate request data against a Zod schema
 */
export function validateRequestData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data);
    return {
      success: true,
      data: validatedData
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));
      
      return {
        success: false,
        errors
      };
    }
    
    return {
      success: false,
      errors: [{
        field: 'unknown',
        message: 'Validation failed with unknown error',
        code: 'UNKNOWN_ERROR'
      }]
    };
  }
}

/**
 * Create standardized error response for validation failures
 */
export function createValidationErrorResponse(
  errors: ValidationError[],
  statusCode: number = 400
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Input validation failed',
        details: errors,
        timestamp: new Date().toISOString()
      }
    }),
    {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH'
      }
    }
  );
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validate and sanitize request body
 */
export function validateAndSanitizeRequest<T>(
  schema: z.ZodSchema<T>,
  requestBody: unknown
): ValidationResult<T> {
  // First sanitize the input
  const sanitizedBody = sanitizeObject(requestBody);
  
  // Then validate against schema
  return validateRequestData(schema, sanitizedBody);
}

/**
 * Rate limiting implementation
 */
class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  
  checkLimit(
    key: string, 
    limit: number = 10, 
    windowMs: number = 60000
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = this.requests.get(key);
    
    if (!record || now > record.resetTime) {
      // New window or expired window
      this.requests.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: now + windowMs
      };
    }
    
    if (record.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime
      };
    }
    
    record.count++;
    return {
      allowed: true,
      remaining: limit - record.count,
      resetTime: record.resetTime
    };
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  userId: string,
  endpoint: string,
  limit: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const key = `${userId}:${endpoint}`;
  return rateLimiter.checkLimit(key, limit, windowMs);
}

/**
 * Create rate limit exceeded response
 */
export function createRateLimitResponse(resetTime: number): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        details: {
          resetTime: new Date(resetTime).toISOString()
        },
        timestamp: new Date().toISOString()
      }
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH'
      }
    }
  );
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\(\)\+]+$/;
  return phoneRegex.test(phone);
}

/**
 * Validate ZIP code format
 */
export function isValidZipCode(zipCode: string): boolean {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zipCode);
}

/**
 * Create parameterized query string for SQL injection prevention
 */
export function createParameterizedQuery(
  baseQuery: string,
  params: Record<string, any>
): { query: string; values: any[] } {
  const values: any[] = [];
  let paramIndex = 1;
  
  const parameterizedQuery = baseQuery.replace(/\$\{(\w+)\}/g, (match, paramName) => {
    if (params[paramName] !== undefined) {
      values.push(params[paramName]);
      return `$${paramIndex++}`;
    }
    throw new Error(`Missing parameter: ${paramName}`);
  });
  
  return {
    query: parameterizedQuery,
    values
  };
}

/**
 * Log validation errors for monitoring
 */
export function logValidationError(
  endpoint: string,
  errors: ValidationError[],
  userId?: string
): void {
  console.error('Validation error:', {
    endpoint,
    userId,
    errors,
    timestamp: new Date().toISOString()
  });
  
  // In production, send to monitoring service
  if (typeof Deno !== 'undefined' && Deno.env.get('NODE_ENV') === 'production') {
    // Send to monitoring service
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/monitoring-errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        level: 'warn',
        message: 'Validation error',
        context: {
          endpoint,
          userId,
          errors
        }
      })
    }).catch(err => console.error('Failed to send validation error to monitoring:', err));
  }
}
