/**
 * Tests for capacity calculation logic and edge cases
 */

import { test, expect } from '@playwright/test';
import { TestUtils, TestDatabase, testData } from './setup';

test.describe('Capacity Calculation Tests', () => {
  let testUser: any;
  let testVehicles: any[];
  let authToken: string;

  test.beforeEach(async () => {
    await TestUtils.cleanup();
    testUser = await TestUtils.createTestUser();
    authToken = await TestUtils.getAuthToken(testUser.email, testUser.password);
    testVehicles = await TestDatabase.createTestVehicles();
  });

  test.afterEach(async () => {
    await TestUtils.cleanup();
  });

  test('should calculate capacity correctly for non-overlapping bookings', async () => {
    const vehicle = testVehicles[0];
    const baseTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
    
    // Create two non-overlapping bookings
    const booking1 = {
      ...testData.createBooking(),
      window_start: new Date(baseTime.getTime() + 1 * 60 * 60 * 1000).toISOString(), // +1 hour
      window_end: new Date(baseTime.getTime() + 3 * 60 * 60 * 1000).toISOString(),   // +3 hours
      estimated_weight: 500,
      idempotency_key: `test-${Date.now()}-1`
    };
    
    const booking2 = {
      ...testData.createBooking(),
      window_start: new Date(baseTime.getTime() + 4 * 60 * 60 * 1000).toISOString(), // +4 hours
      window_end: new Date(baseTime.getTime() + 6 * 60 * 60 * 1000).toISOString(),   // +6 hours
      estimated_weight: 300,
      idempotency_key: `test-${Date.now()}-2`
    };
    
    // Create both bookings
    await TestUtils.makeAuthenticatedRequest('create-booking', booking1, authToken);
    await TestUtils.makeAuthenticatedRequest('create-booking', booking2, authToken);
    
    // Both should succeed since they don't overlap
    const { data: bookings } = await TestDatabase.supabase
      .from('bookings')
      .select('*')
      .in('idempotency_key', [booking1.idempotency_key, booking2.idempotency_key]);
    
    expect(bookings).toHaveLength(2);
  });

  test('should calculate capacity correctly for partially overlapping bookings', async () => {
    const vehicle = testVehicles[0];
    const baseTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Create two partially overlapping bookings
    const booking1 = {
      ...testData.createBooking(),
      window_start: new Date(baseTime.getTime() + 1 * 60 * 60 * 1000).toISOString(), // +1 hour
      window_end: new Date(baseTime.getTime() + 4 * 60 * 60 * 1000).toISOString(),   // +4 hours
      estimated_weight: 600,
      idempotency_key: `test-${Date.now()}-1`
    };
    
    const booking2 = {
      ...testData.createBooking(),
      window_start: new Date(baseTime.getTime() + 3 * 60 * 60 * 1000).toISOString(), // +3 hours (overlaps)
      window_end: new Date(baseTime.getTime() + 6 * 60 * 60 * 1000).toISOString(),   // +6 hours
      estimated_weight: 500,
      idempotency_key: `test-${Date.now()}-2`
    };
    
    // First booking should succeed
    const result1 = await TestUtils.makeAuthenticatedRequest('create-booking', booking1, authToken);
    expect(result1.status).toBe(200);
    
    // Second booking should fail due to capacity exceeded (600 + 500 = 1100 > 1000)
    const result2 = await TestUtils.makeAuthenticatedRequest('create-booking', booking2, authToken);
    expect(result2.status).toBe(400);
    expect(result2.data.error).toContain('capacity');
  });

  test('should handle exact time window overlaps', async () => {
    const vehicle = testVehicles[0];
    const baseTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const windowStart = new Date(baseTime.getTime() + 1 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(baseTime.getTime() + 3 * 60 * 60 * 1000).toISOString();
    
    const booking1 = {
      ...testData.createBooking(),
      window_start: windowStart,
      window_end: windowEnd,
      estimated_weight: 400,
      idempotency_key: `test-${Date.now()}-1`
    };
    
    const booking2 = {
      ...testData.createBooking(),
      window_start: windowStart, // Exact same time
      window_end: windowEnd,     // Exact same time
      estimated_weight: 400,
      idempotency_key: `test-${Date.now()}-2`
    };
    
    // First booking should succeed
    const result1 = await TestUtils.makeAuthenticatedRequest('create-booking', booking1, authToken);
    expect(result1.status).toBe(200);
    
    // Second booking should fail due to exact overlap
    const result2 = await TestUtils.makeAuthenticatedRequest('create-booking', booking2, authToken);
    expect(result2.status).toBe(400);
  });

  test('should handle edge case where booking starts exactly when another ends', async () => {
    const vehicle = testVehicles[0];
    const baseTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const booking1 = {
      ...testData.createBooking(),
      window_start: new Date(baseTime.getTime() + 1 * 60 * 60 * 1000).toISOString(),
      window_end: new Date(baseTime.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      estimated_weight: 500,
      idempotency_key: `test-${Date.now()}-1`
    };
    
    const booking2 = {
      ...testData.createBooking(),
      window_start: new Date(baseTime.getTime() + 3 * 60 * 60 * 1000).toISOString(), // Starts when first ends
      window_end: new Date(baseTime.getTime() + 5 * 60 * 60 * 1000).toISOString(),
      estimated_weight: 500,
      idempotency_key: `test-${Date.now()}-2`
    };
    
    // Both should succeed since they don't actually overlap
    const result1 = await TestUtils.makeAuthenticatedRequest('create-booking', booking1, authToken);
    const result2 = await TestUtils.makeAuthenticatedRequest('create-booking', booking2, authToken);
    
    expect(result1.status).toBe(200);
    expect(result2.status).toBe(200);
  });

  test('should handle multiple overlapping bookings correctly', async () => {
    const vehicle = testVehicles[0];
    const baseTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Create multiple bookings with complex overlaps
    const bookings = [
      {
        ...testData.createBooking(),
        window_start: new Date(baseTime.getTime() + 1 * 60 * 60 * 1000).toISOString(), // 1-3 hours
        window_end: new Date(baseTime.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        estimated_weight: 200,
        idempotency_key: `test-${Date.now()}-1`
      },
      {
        ...testData.createBooking(),
        window_start: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2-4 hours (overlaps with 1)
        window_end: new Date(baseTime.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        estimated_weight: 300,
        idempotency_key: `test-${Date.now()}-2`
      },
      {
        ...testData.createBooking(),
        window_start: new Date(baseTime.getTime() + 3 * 60 * 60 * 1000).toISOString(), // 3-5 hours (overlaps with 2)
        window_end: new Date(baseTime.getTime() + 5 * 60 * 60 * 1000).toISOString(),
        estimated_weight: 400,
        idempotency_key: `test-${Date.now()}-3`
      }
    ];
    
    // All should succeed since total weight (200 + 300 + 400 = 900) is less than capacity (1000)
    for (const booking of bookings) {
      const result = await TestUtils.makeAuthenticatedRequest('create-booking', booking, authToken);
      expect(result.status).toBe(200);
    }
    
    // Verify all bookings were created
    const { data: createdBookings } = await TestDatabase.supabase
      .from('bookings')
      .select('*')
      .in('idempotency_key', bookings.map(b => b.idempotency_key));
    
    expect(createdBookings).toHaveLength(3);
  });

  test('should reject booking that would exceed vehicle capacity', async () => {
    const vehicle = testVehicles[0];
    const baseTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Create booking that exceeds vehicle capacity
    const booking = {
      ...testData.createBooking(),
      window_start: new Date(baseTime.getTime() + 1 * 60 * 60 * 1000).toISOString(),
      window_end: new Date(baseTime.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      estimated_weight: vehicle.capacity_lbs + 100, // Exceeds capacity
      idempotency_key: `test-${Date.now()}-1`
    };
    
    const result = await TestUtils.makeAuthenticatedRequest('create-booking', booking, authToken);
    expect(result.status).toBe(400);
    expect(result.data.error).toContain('capacity');
  });

  test('should handle zero weight bookings', async () => {
    const baseTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const booking = {
      ...testData.createBooking(),
      window_start: new Date(baseTime.getTime() + 1 * 60 * 60 * 1000).toISOString(),
      window_end: new Date(baseTime.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      estimated_weight: 0,
      idempotency_key: `test-${Date.now()}-1`
    };
    
    const result = await TestUtils.makeAuthenticatedRequest('create-booking', booking, authToken);
    expect(result.status).toBe(400);
    expect(result.data.error).toContain('weight');
  });

  test('should handle negative weight bookings', async () => {
    const baseTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const booking = {
      ...testData.createBooking(),
      window_start: new Date(baseTime.getTime() + 1 * 60 * 60 * 1000).toISOString(),
      window_end: new Date(baseTime.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      estimated_weight: -100,
      idempotency_key: `test-${Date.now()}-1`
    };
    
    const result = await TestUtils.makeAuthenticatedRequest('create-booking', booking, authToken);
    expect(result.status).toBe(400);
    expect(result.data.error).toContain('weight');
  });

  test('should handle very small time windows', async () => {
    const baseTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const booking = {
      ...testData.createBooking(),
      window_start: new Date(baseTime.getTime() + 1 * 60 * 60 * 1000).toISOString(),
      window_end: new Date(baseTime.getTime() + 1 * 60 * 60 * 1000 + 1).toISOString(), // 1ms window
      estimated_weight: 100,
      idempotency_key: `test-${Date.now()}-1`
    };
    
    const result = await TestUtils.makeAuthenticatedRequest('create-booking', booking, authToken);
    expect(result.status).toBe(400);
    expect(result.data.error).toContain('time');
  });

  test('should handle past time windows', async () => {
    const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
    
    const booking = {
      ...testData.createBooking(),
      window_start: new Date(pastTime.getTime() + 1 * 60 * 60 * 1000).toISOString(),
      window_end: new Date(pastTime.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      estimated_weight: 100,
      idempotency_key: `test-${Date.now()}-1`
    };
    
    const result = await TestUtils.makeAuthenticatedRequest('create-booking', booking, authToken);
    expect(result.status).toBe(400);
    expect(result.data.error).toContain('past');
  });

  test('should handle time windows in the far future', async () => {
    const futureTime = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
    
    const booking = {
      ...testData.createBooking(),
      window_start: new Date(futureTime.getTime() + 1 * 60 * 60 * 1000).toISOString(),
      window_end: new Date(futureTime.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      estimated_weight: 100,
      idempotency_key: `test-${Date.now()}-1`
    };
    
    const result = await TestUtils.makeAuthenticatedRequest('create-booking', booking, authToken);
    expect(result.status).toBe(400);
    expect(result.data.error).toContain('advance');
  });
});
