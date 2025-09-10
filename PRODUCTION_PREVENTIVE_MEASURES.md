# Production Preventive Measures for JavaScript/TypeScript Applications

## Overview
This document outlines comprehensive preventive measures to avoid similar errors in production environments, based on the analysis of the QCS Cargo application issues.

## 1. Database Schema Management

### Schema Consistency Enforcement
```sql
-- Create schema validation function
CREATE OR REPLACE FUNCTION validate_schema_consistency()
RETURNS TABLE(table_name TEXT, issue TEXT) AS $$
BEGIN
    -- Check for ID type consistency
    RETURN QUERY
    SELECT 
        t.table_name::TEXT,
        'ID type mismatch: expected INTEGER, found ' || c.data_type AS issue
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public' 
    AND c.column_name = 'id' 
    AND c.is_nullable = 'NO'
    AND c.data_type NOT IN ('integer', 'bigint');
END;
$$ LANGUAGE plpgsql;

-- Run validation before deployments
SELECT * FROM validate_schema_consistency();
```

### Migration Best Practices
```bash
# Always test migrations in staging first
supabase db reset --linked
supabase db push --linked

# Validate schema after migration
supabase db diff --linked

# Create rollback scripts for each migration
# migration_rollback_YYYYMMDD.sql
```

### Database Constraints
```sql
-- Add comprehensive constraints
ALTER TABLE shipments 
ADD CONSTRAINT chk_shipments_weight_positive 
CHECK (total_weight > 0);

ALTER TABLE shipment_items 
ADD CONSTRAINT chk_items_weight_positive 
CHECK (weight_lbs > 0);

ALTER TABLE shipment_items 
ADD CONSTRAINT chk_items_quantity_positive 
CHECK (quantity > 0);

-- Add indexes for performance
CREATE INDEX CONCURRENTLY idx_shipments_customer_status 
ON shipments(customer_id, status);

CREATE INDEX CONCURRENTLY idx_shipments_tracking 
ON shipments(tracking_number);
```

## 2. Edge Function Reliability

### Error Handling Standards
```typescript
// Standard error handling template
export const handleEdgeFunctionError = (error: any, context: string) => {
  const errorId = crypto.randomUUID();
  
  console.error(`[${errorId}] ${context}:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // Categorize errors
  if (error.message?.includes('foreign key')) {
    return {
      code: 'INVALID_REFERENCE',
      message: 'Referenced data not found',
      errorId
    };
  }
  
  if (error.message?.includes('authentication')) {
    return {
      code: 'AUTH_ERROR',
      message: 'Authentication required',
      errorId
    };
  }

  return {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    errorId
  };
};
```

### Input Validation Framework
```typescript
// Zod schema for validation
import { z } from 'zod';

export const CreateShipmentSchema = z.object({
  destination_id: z.number().int().positive(),
  service_level: z.enum(['standard', 'express']),
  pickup_date: z.string().datetime().optional(),
  special_instructions: z.string().max(1000).optional(),
  declared_value: z.number().min(0).optional(),
  items: z.array(z.object({
    description: z.string().min(1).max(255),
    weight: z.number().positive(),
    quantity: z.number().int().positive(),
    length: z.number().positive().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    value: z.number().min(0).optional(),
    category: z.string().min(1),
    notes: z.string().max(500).optional()
  })).min(1)
});

// Use in Edge Function
export const validateCreateShipmentInput = (data: unknown) => {
  try {
    return CreateShipmentSchema.parse(data);
  } catch (error) {
    throw new Error(`Validation failed: ${error.message}`);
  }
};
```

### Rate Limiting and Circuit Breaker
```typescript
// Rate limiting implementation
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (userId: string, limit = 10, windowMs = 60000) => {
  const now = Date.now();
  const userLimit = rateLimiter.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimiter.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= limit) {
    throw new Error('Rate limit exceeded');
  }
  
  userLimit.count++;
  return true;
};

// Circuit breaker for database operations
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold = 5,
    private timeout = 60000
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

## 3. Frontend Error Boundaries

### React Error Boundary Implementation
```typescript
// ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Send to error tracking service
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Integration with error tracking (Sentry, LogRocket, etc.)
    console.error('Logging error to service:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>We're sorry, but something unexpected happened.</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Global Error Handler
```typescript
// errorHandler.ts
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  userId?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: AppError[] = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  logError(error: AppError) {
    this.errorQueue.push(error);
    console.error('Application Error:', error);
    
    // Send to monitoring service
    this.sendToMonitoring(error);
  }

  private async sendToMonitoring(error: AppError) {
    try {
      // Send to external monitoring service
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error)
      });
    } catch (e) {
      console.error('Failed to send error to monitoring:', e);
    }
  }

  getRecentErrors(): AppError[] {
    return this.errorQueue.slice(-10);
  }
}

// Global error handler setup
window.addEventListener('error', (event) => {
  ErrorHandler.getInstance().logError({
    code: 'JAVASCRIPT_ERROR',
    message: event.message,
    details: {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    },
    timestamp: new Date().toISOString()
  });
});

window.addEventListener('unhandledrejection', (event) => {
  ErrorHandler.getInstance().logError({
    code: 'UNHANDLED_PROMISE_REJECTION',
    message: event.reason?.message || 'Unhandled promise rejection',
    details: { reason: event.reason },
    timestamp: new Date().toISOString()
  });
});
```

## 4. Third-Party Integration Safety

### Browser Extension Conflict Prevention
```html
<!-- Comprehensive meta tags for common extensions -->
<head>
  <!-- Grammarly -->
  <meta name="grammarly" content="false" />
  <meta name="grammarly-extension-install" content="false" />
  
  <!-- LastPass -->
  <meta name="lastpass" content="false" />
  
  <!-- Honey -->
  <meta name="honey" content="false" />
  
  <!-- General extension prevention -->
  <meta name="browser-extension-prevention" content="true" />
</head>
```

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
```

## 5. Monitoring and Alerting

### Health Check Endpoints
```typescript
// Health check for Edge Functions
export const healthCheck = async () => {
  const checks = {
    database: await checkDatabase(),
    authentication: await checkAuth(),
    externalServices: await checkExternalServices()
  };

  const isHealthy = Object.values(checks).every(check => check.status === 'ok');

  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks
  };
};

async function checkDatabase() {
  try {
    // Simple query to check database connectivity
    const result = await supabase.from('destinations').select('count').limit(1);
    return { status: 'ok', latency: Date.now() };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}
```

### Performance Monitoring
```typescript
// Performance tracking
export const trackPerformance = (operation: string, duration: number) => {
  console.log(`Performance: ${operation} took ${duration}ms`);
  
  // Send to analytics
  if (duration > 1000) {
    console.warn(`Slow operation detected: ${operation} (${duration}ms)`);
  }
};

// Usage
const startTime = performance.now();
await someOperation();
trackPerformance('someOperation', performance.now() - startTime);
```

## 6. Deployment Pipeline Safety

### Pre-deployment Checks
```bash
#!/bin/bash
# pre-deploy.sh

echo "Running pre-deployment checks..."

# 1. Run tests
npm run test
if [ $? -ne 0 ]; then
  echo "Tests failed. Deployment aborted."
  exit 1
fi

# 2. Check TypeScript compilation
npm run build
if [ $? -ne 0 ]; then
  echo "TypeScript compilation failed. Deployment aborted."
  exit 1
fi

# 3. Validate database migrations
supabase db diff --linked
if [ $? -ne 0 ]; then
  echo "Database schema validation failed. Deployment aborted."
  exit 1
fi

# 4. Check environment variables
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
  echo "Required environment variables missing. Deployment aborted."
  exit 1
fi

echo "All pre-deployment checks passed."
```

### Rollback Strategy
```bash
#!/bin/bash
# rollback.sh

PREVIOUS_VERSION=$1

if [ -z "$PREVIOUS_VERSION" ]; then
  echo "Usage: ./rollback.sh <previous_version>"
  exit 1
fi

echo "Rolling back to version $PREVIOUS_VERSION..."

# 1. Rollback database migrations
supabase db reset --linked
supabase db push --linked --include-all --exclude-migrations-after $PREVIOUS_VERSION

# 2. Rollback application code
git checkout $PREVIOUS_VERSION
npm install
npm run build

# 3. Rollback Edge Functions
supabase functions deploy --no-verify-jwt

echo "Rollback completed."
```

## 7. Security Measures

### Input Sanitization
```typescript
import DOMPurify from 'dompurify';

export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};

export const validateAndSanitize = (data: any) => {
  if (typeof data === 'string') {
    return sanitizeInput(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(validateAndSanitize);
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = validateAndSanitize(value);
    }
    return sanitized;
  }
  
  return data;
};
```

### Authentication Hardening
```typescript
// Token validation middleware
export const validateToken = async (token: string) => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      throw new Error('Invalid token');
    }
    
    // Check token expiration
    const tokenPayload = JSON.parse(atob(token.split('.')[1]));
    if (tokenPayload.exp * 1000 < Date.now()) {
      throw new Error('Token expired');
    }
    
    return user;
  } catch (error) {
    throw new Error('Authentication failed');
  }
};
```

## 8. Testing Strategy

### Automated Testing Pipeline
```typescript
// Integration test example
describe('Create Shipment Flow', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('should create shipment successfully', async () => {
    const shipmentData = {
      destination_id: 1,
      service_level: 'standard',
      items: [{
        description: 'Test Item',
        weight: 5.0,
        quantity: 1,
        category: 'general'
      }]
    };

    const response = await createShipment(shipmentData);
    
    expect(response.success).toBe(true);
    expect(response.shipment.tracking_number).toBeDefined();
  });

  it('should handle invalid destination', async () => {
    const shipmentData = {
      destination_id: 999999,
      service_level: 'standard',
      items: [{ description: 'Test', weight: 5, quantity: 1 }]
    };

    await expect(createShipment(shipmentData))
      .rejects
      .toThrow('Invalid destination');
  });
});
```

## 9. Documentation and Training

### Error Response Documentation
```markdown
# API Error Codes

| Code | Description | Action |
|------|-------------|--------|
| INVALID_REFERENCE | Referenced data not found | Check foreign key values |
| AUTH_ERROR | Authentication required | Refresh token or re-login |
| VALIDATION_ERROR | Input validation failed | Check request format |
| RATE_LIMIT_EXCEEDED | Too many requests | Implement backoff strategy |
| INTERNAL_ERROR | Unexpected server error | Contact support with error ID |
```

### Team Training Checklist
- [ ] Database schema management
- [ ] Error handling best practices
- [ ] Security considerations
- [ ] Performance optimization
- [ ] Monitoring and alerting
- [ ] Incident response procedures

## 10. Continuous Improvement

### Error Analysis Process
1. **Weekly Error Review**: Analyze error patterns and frequencies
2. **Root Cause Analysis**: Deep dive into recurring issues
3. **Process Improvement**: Update procedures based on findings
4. **Knowledge Sharing**: Document lessons learned

### Metrics to Track
- Error rates by function/component
- Response times and performance metrics
- User experience impact
- Recovery time from incidents
- Prevention effectiveness

This comprehensive approach ensures robust error prevention and handling in production environments.