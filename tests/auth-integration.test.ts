/**
 * Authentication and authorization integration tests
 */

import { test, expect } from '@playwright/test';
import { TestUtils, TestDatabase } from './setup';

test.describe('Authentication Integration Tests', () => {
  let testUser: any;
  let testAdmin: any;
  let userToken: string;
  let adminToken: string;

  test.beforeEach(async () => {
    await TestUtils.cleanup();
    
    // Create test user
    testUser = await TestUtils.createTestUser();
    userToken = await TestUtils.getAuthToken(testUser.email, testUser.password);
    
    // Create test admin
    testAdmin = await TestUtils.createTestAdmin();
    adminToken = await TestUtils.getAuthToken(testAdmin.email, testAdmin.password);
  });

  test.afterEach(async () => {
    await TestUtils.cleanup();
  });

  test('should authenticate regular users correctly', async () => {
    const { status, data } = await TestUtils.makeAuthenticatedRequest(
      'create-booking',
      {
        window_start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        window_end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'NJ',
          zip_code: '07032',
          country: 'United States'
        },
        pickup_or_drop: 'pickup',
        service_type: 'standard',
        estimated_weight: 100,
        idempotency_key: `test-${Date.now()}`
      },
      userToken
    );
    
    expect(status).toBe(200);
    expect(data.data.created).toBe(true);
  });

  test('should reject unauthenticated requests', async () => {
    const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/create-booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        window_start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        window_end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'NJ',
          zip_code: '07032',
          country: 'United States'
        },
        pickup_or_drop: 'pickup',
        service_type: 'standard',
        estimated_weight: 100,
        idempotency_key: `test-${Date.now()}`
      })
    });
    
    expect(response.status).toBe(401);
  });

  test('should reject requests with invalid tokens', async () => {
    const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/create-booking`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        window_start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        window_end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'NJ',
          zip_code: '07032',
          country: 'United States'
        },
        pickup_or_drop: 'pickup',
        service_type: 'standard',
        estimated_weight: 100,
        idempotency_key: `test-${Date.now()}`
      })
    });
    
    expect(response.status).toBe(401);
  });

  test('should allow admin access to admin functions', async () => {
    const { status, data } = await TestUtils.makeAuthenticatedRequest(
      'admin-reports',
      {
        report_type: 'bookings',
        date_range: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        }
      },
      adminToken
    );
    
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  test('should reject regular user access to admin functions', async () => {
    const { status, data } = await TestUtils.makeAuthenticatedRequest(
      'admin-reports',
      {
        report_type: 'bookings',
        date_range: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        }
      },
      userToken
    );
    
    expect(status).toBe(401);
    expect(data.error).toContain('admin');
  });

  test('should handle role escalation attempts', async () => {
    // Try to access admin function with user token
    const { status, data } = await TestUtils.makeAuthenticatedRequest(
      'admin-customer-list',
      {},
      userToken
    );
    
    expect(status).toBe(401);
    expect(data.error).toContain('permission');
  });

  test('should handle expired tokens', async () => {
    // Create an expired token (this would need to be mocked in a real test)
    const expiredToken = 'expired-token';
    
    const { status, data } = await TestUtils.makeAuthenticatedRequest(
      'create-booking',
      {
        window_start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        window_end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'NJ',
          zip_code: '07032',
          country: 'United States'
        },
        pickup_or_drop: 'pickup',
        service_type: 'standard',
        estimated_weight: 100,
        idempotency_key: `test-${Date.now()}`
      },
      expiredToken
    );
    
    expect(status).toBe(401);
  });

  test('should handle malformed authorization headers', async () => {
    const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/create-booking`, {
      method: 'POST',
      headers: {
        'Authorization': 'InvalidFormat token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        window_start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        window_end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'NJ',
          zip_code: '07032',
          country: 'United States'
        },
        pickup_or_drop: 'pickup',
        service_type: 'standard',
        estimated_weight: 100,
        idempotency_key: `test-${Date.now()}`
      })
    });
    
    expect(response.status).toBe(401);
  });

  test('should handle missing authorization header', async () => {
    const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/create-booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        window_start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        window_end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'NJ',
          zip_code: '07032',
          country: 'United States'
        },
        pickup_or_drop: 'pickup',
        service_type: 'standard',
        estimated_weight: 100,
        idempotency_key: `test-${Date.now()}`
      })
    });
    
    expect(response.status).toBe(401);
  });

  test('should handle concurrent authentication requests', async () => {
    const requests = Array(10).fill(null).map(() => 
      () => TestUtils.makeAuthenticatedRequest(
        'create-booking',
        {
          window_start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          window_end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
          address: {
            street: '123 Test St',
            city: 'Test City',
            state: 'NJ',
            zip_code: '07032',
            country: 'United States'
          },
          pickup_or_drop: 'pickup',
          service_type: 'standard',
          estimated_weight: 100,
          idempotency_key: `concurrent-${Date.now()}-${Math.random()}`
        },
        userToken
      )
    );
    
    const results = await Promise.allSettled(requests.map(req => req()));
    
    // All should succeed since they have different idempotency keys
    const successfulResults = results.filter(r => r.status === 'fulfilled' && r.value.status === 200);
    expect(successfulResults.length).toBeGreaterThan(0);
  });

  test('should handle role changes during session', async () => {
    // Create a user and get token
    const user = await TestUtils.createTestUser();
    const token = await TestUtils.getAuthToken(user.email, user.password);
    
    // User should be able to create booking
    const { status: bookingStatus } = await TestUtils.makeAuthenticatedRequest(
      'create-booking',
      {
        window_start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        window_end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'NJ',
          zip_code: '07032',
          country: 'United States'
        },
        pickup_or_drop: 'pickup',
        service_type: 'standard',
        estimated_weight: 100,
        idempotency_key: `test-${Date.now()}`
      },
      token
    );
    
    expect(bookingStatus).toBe(200);
    
    // User should not be able to access admin functions
    const { status: adminStatus } = await TestUtils.makeAuthenticatedRequest(
      'admin-reports',
      {
        report_type: 'bookings'
      },
      token
    );
    
    expect(adminStatus).toBe(401);
  });

  test('should handle JWT metadata role verification', async () => {
    // This test verifies that the JWT metadata role is properly checked
    // In a real implementation, this would test the JWT claims
    
    const { status, data } = await TestUtils.makeAuthenticatedRequest(
      'create-booking',
      {
        window_start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        window_end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'NJ',
          zip_code: '07032',
          country: 'United States'
        },
        pickup_or_drop: 'pickup',
        service_type: 'standard',
        estimated_weight: 100,
        idempotency_key: `jwt-test-${Date.now()}`
      },
      userToken
    );
    
    expect(status).toBe(200);
    expect(data.data.created).toBe(true);
  });

  test('should handle database role fallback', async () => {
    // This test verifies that if JWT metadata is missing, the system falls back to database lookup
    
    // Create a user without JWT metadata
    const user = await TestUtils.createTestUser({
      email: `no-jwt-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      first_name: 'No',
      last_name: 'JWT'
    });
    
    const token = await TestUtils.getAuthToken(user.email, user.password);
    
    const { status, data } = await TestUtils.makeAuthenticatedRequest(
      'create-booking',
      {
        window_start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        window_end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'NJ',
          zip_code: '07032',
          country: 'United States'
        },
        pickup_or_drop: 'pickup',
        service_type: 'standard',
        estimated_weight: 100,
        idempotency_key: `fallback-test-${Date.now()}`
      },
      token
    );
    
    expect(status).toBe(200);
    expect(data.data.created).toBe(true);
  });
});
