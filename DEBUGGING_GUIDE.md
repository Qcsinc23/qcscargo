# JavaScript/TypeScript Application Error Debugging Guide

## Overview
This guide provides step-by-step debugging approaches for the three main errors identified in the QCS Cargo application.

## Error 1: Grammarly.js Integration Issue

### Symptoms
- Console error: "Not supported: in app messages from Iterable" at line 2
- Browser extension conflicts with form inputs

### Debugging Steps
1. **Check Browser Extensions**
   ```bash
   # Open browser developer tools
   # Navigate to Console tab
   # Look for Grammarly-related errors
   ```

2. **Verify Meta Tags**
   ```html
   <!-- Ensure these are in index.html -->
   <meta name="grammarly" content="false" />
   <meta name="grammarly-extension-install" content="false" />
   ```

3. **Test in Incognito Mode**
   - Open application in incognito/private browsing
   - If error disappears, confirms browser extension conflict

### Solution Applied
- Added Grammarly prevention meta tags to `index.html`
- Prevents browser extension interference

## Error 2: Edge Function HTTP 500 Internal Server Error

### Symptoms
- HTTP 500 error from `localhost:54321/functions/v1/create-shipment`
- Edge function failure during shipment creation

### Debugging Steps

1. **Check Supabase Logs**
   ```bash
   # View Edge Function logs
   supabase functions logs create-shipment
   
   # Check database logs
   supabase logs
   ```

2. **Verify Database Schema**
   ```sql
   -- Check shipments table structure
   \d shipments;
   
   -- Check shipment_items table structure
   \d shipment_items;
   
   -- Verify foreign key constraints
   SELECT conname, conrelid::regclass, confrelid::regclass 
   FROM pg_constraint 
   WHERE contype = 'f' AND conrelid = 'shipments'::regclass;
   ```

3. **Test Edge Function Directly**
   ```bash
   # Test with curl
   curl -X POST http://localhost:54321/functions/v1/create-shipment \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "destination_id": 1,
       "service_level": "standard",
       "items": [{
         "description": "Test Item",
         "weight": 5.0,
         "quantity": 1,
         "category": "general"
       }]
     }'
   ```

4. **Validate Environment Variables**
   ```bash
   # Check if required env vars are set
   echo $SUPABASE_SERVICE_ROLE_KEY
   echo $SUPABASE_URL
   ```

### Root Causes Identified
- **Schema Mismatch**: Base migration uses UUID, table schema uses SERIAL
- **Type Conversion Issues**: String to integer conversion problems
- **Missing Validation**: Insufficient input validation
- **Error Handling**: Poor error propagation

### Solutions Applied
- Enhanced input validation in Edge Function
- Improved error handling and logging
- Fixed data type conversions
- Added comprehensive error messages

## Error 3: React Component Error

### Symptoms
- "Edge Function returned a non-2xx status code" exception
- Error thrown at line 292 in `handleSubmit` function (line 274)

### Debugging Steps

1. **Enable Debug Logging**
   ```typescript
   // Add to CreateShipmentPage.tsx
   console.log('Submitting shipment with data:', formData);
   console.log('Edge function response:', { data, error });
   ```

2. **Check Network Tab**
   - Open browser DevTools → Network tab
   - Submit form and check the create-shipment request
   - Examine request payload and response

3. **Validate Form Data**
   ```typescript
   // Add validation logging
   console.log('Form validation:', {
     hasDestination: !!formData.destination_id,
     itemsValid: formData.items.every(item => 
       item.description && item.weight > 0 && item.quantity > 0
     )
   });
   ```

4. **Test Error Scenarios**
   - Submit with missing required fields
   - Submit with invalid destination
   - Submit with malformed data

### Solutions Applied
- Enhanced error handling with specific error types
- Improved user-friendly error messages
- Added comprehensive validation
- Better logging for debugging

## Database Schema Issues

### Problem: ID Type Mismatch
```sql
-- Base migration creates UUID primary key
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- ...
);

-- But table schema expects SERIAL
CREATE TABLE shipments (
    id SERIAL PRIMARY KEY,
    -- ...
);
```

### Solution: Schema Alignment
```sql
-- Option 1: Update base migration to use SERIAL
ALTER TABLE shipments ALTER COLUMN id TYPE INTEGER;

-- Option 2: Update table schema to use UUID
ALTER TABLE shipments ALTER COLUMN id TYPE UUID;
```

## Testing Procedures

### 1. Unit Testing Edge Function
```typescript
// Test file: create-shipment.test.ts
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

Deno.test("Create shipment with valid data", async () => {
  const request = new Request("http://localhost/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      destination_id: 1,
      service_level: "standard",
      items: [{ description: "Test", weight: 5, quantity: 1 }]
    })
  });
  
  // Test function logic
});
```

### 2. Integration Testing
```bash
# Test complete flow
npm run test:integration

# Test specific scenarios
npm run test:create-shipment
```

### 3. Load Testing
```bash
# Test Edge Function under load
supabase functions serve --env-file .env.local
# Use tools like Artillery or k6 for load testing
```

## Monitoring and Alerting

### 1. Error Tracking
```typescript
// Add to error handling
if (error) {
  // Log to external service (e.g., Sentry)
  console.error('Shipment creation failed:', {
    error: error.message,
    userId: customerId,
    timestamp: new Date().toISOString(),
    formData: formData
  });
}
```

### 2. Performance Monitoring
```typescript
// Add performance tracking
const startTime = performance.now();
// ... function execution
const endTime = performance.now();
console.log(`Function execution time: ${endTime - startTime}ms`);
```

## Production Deployment Checklist

- [ ] Environment variables configured
- [ ] Database schema aligned
- [ ] Edge functions deployed
- [ ] Error tracking enabled
- [ ] Performance monitoring active
- [ ] Load testing completed
- [ ] Security review passed
- [ ] Backup procedures tested

## Common Pitfalls

1. **Environment Variables**: Missing or incorrect Supabase credentials
2. **CORS Issues**: Incorrect CORS headers in Edge Functions
3. **Authentication**: Token expiration or invalid tokens
4. **Rate Limiting**: Exceeding Supabase rate limits
5. **Schema Changes**: Unsynced database schema changes

## Support Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [React Error Boundaries](https://reactjs.org/docs/error-boundaries.html)
- [TypeScript Error Handling](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)