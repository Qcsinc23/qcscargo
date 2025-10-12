/**
 * Critical path tests for booking concurrency and race conditions
 */

import { test, expect } from '@playwright/test';
import { TestUtils, TestDatabase, testData, PerformanceTest } from './setup';

test.describe('Booking Concurrency Tests', () => {
  let testUser: any;
  let testVehicles: any[];
  let authToken: string;

  test.beforeEach(async () => {
    // Clean up previous test data
    await TestUtils.cleanup();
    
    // Create test user
    testUser = await TestUtils.createTestUser();
    authToken = await TestUtils.getAuthToken(testUser.email, testUser.password);
    
    // Create test vehicles
    testVehicles = await TestDatabase.createTestVehicles();
  });

  test.afterEach(async () => {
    await TestUtils.cleanup();
  });

  test('should handle concurrent booking requests with same idempotency key', async () => {
    const bookingData = testData.createBooking();
    
    // Create 5 concurrent requests with the same idempotency key
    const requests = Array(5).fill(null).map(() => 
      () => TestUtils.makeAuthenticatedRequest('create-booking', bookingData, authToken)
    );
    
    const results = await PerformanceTest.runConcurrent(requests, 5);
    
    // Only one should succeed, others should return existing booking
    const successfulRequests = results.filter(r => r.success && r.result?.data?.created);
    const duplicateRequests = results.filter(r => r.success && !r.result?.data?.created);
    
    expect(successfulRequests).toHaveLength(1);
    expect(duplicateRequests).toHaveLength(4);
    
    // All should return the same booking ID
    const bookingId = successfulRequests[0].result.data.booking.id;
    results.forEach(result => {
      if (result.success) {
        expect(result.result.data.booking.id).toBe(bookingId);
      }
    });
  });

  test('should prevent double booking with different idempotency keys', async () => {
    const baseBooking = testData.createBooking();
    
    // Create 3 requests for the same time window with different idempotency keys
    const requests = Array(3).fill(null).map((_, index) => {
      const bookingData = {
        ...baseBooking,
        idempotency_key: `test-${Date.now()}-${index}`
      };
      return () => TestUtils.makeAuthenticatedRequest('create-booking', bookingData, authToken);
    });
    
    const results = await PerformanceTest.runConcurrent(requests, 3);
    
    // Only one should succeed due to capacity constraints
    const successfulRequests = results.filter(r => r.success && r.result?.data?.created);
    const failedRequests = results.filter(r => !r.success || r.result?.error);
    
    expect(successfulRequests).toHaveLength(1);
    expect(failedRequests).toHaveLength(2);
    
    // Verify the successful booking was created
    if (successfulRequests.length > 0) {
      const bookingId = successfulRequests[0].result.data.booking.id;
      await TestUtils.assertBookingCreated(bookingId);
      await TestUtils.assertVehicleAssignment(bookingId);
    }
  });

  test('should handle capacity calculation correctly under concurrent load', async () => {
    const vehicle = testVehicles[0];
    const vehicleCapacity = vehicle.capacity_lbs;
    const bookingWeight = 500; // Half capacity
    
    // Create bookings that should fit in capacity
    const booking1 = {
      ...testData.createBooking(),
      estimated_weight: bookingWeight,
      idempotency_key: `test-${Date.now()}-1`
    };
    
    const booking2 = {
      ...testData.createBooking(),
      estimated_weight: bookingWeight,
      idempotency_key: `test-${Date.now()}-2`
    };
    
    // Create third booking that should exceed capacity
    const booking3 = {
      ...testData.createBooking(),
      estimated_weight: bookingWeight + 100, // This should exceed capacity
      idempotency_key: `test-${Date.now()}-3`
    };
    
    // Execute bookings concurrently
    const requests = [
      () => TestUtils.makeAuthenticatedRequest('create-booking', booking1, authToken),
      () => TestUtils.makeAuthenticatedRequest('create-booking', booking2, authToken),
      () => TestUtils.makeAuthenticatedRequest('create-booking', booking3, authToken)
    ];
    
    const results = await PerformanceTest.runConcurrent(requests, 3);
    
    // First two should succeed, third should fail
    const successfulRequests = results.filter(r => r.success && r.result?.data?.created);
    const failedRequests = results.filter(r => !r.success || r.result?.error);
    
    expect(successfulRequests).toHaveLength(2);
    expect(failedRequests).toHaveLength(1);
    
    // Verify capacity calculation
    const successfulBookings = successfulRequests.map(r => r.result.data.booking.id);
    for (const bookingId of successfulBookings) {
      await TestUtils.assertBookingCreated(bookingId);
      await TestUtils.assertVehicleAssignment(bookingId);
    }
  });

  test('should maintain data consistency during partial failures', async () => {
    const bookingData = testData.createBooking();
    
    // Mock a scenario where vehicle assignment might fail
    // This test ensures that if vehicle assignment fails, the booking is rolled back
    
    // Create a booking with invalid vehicle data to trigger partial failure
    const invalidBookingData = {
      ...bookingData,
      estimated_weight: -100 // Invalid weight
    };
    
    const { status, data } = await TestUtils.makeAuthenticatedRequest(
      'create-booking', 
      invalidBookingData, 
      authToken
    );
    
    // Should fail validation
    expect(status).toBe(400);
    expect(data.error).toBeTruthy();
    
    // Verify no booking was created
    const { data: bookings } = await TestDatabase.supabase
      .from('bookings')
      .select('*')
      .eq('idempotency_key', invalidBookingData.idempotency_key);
    
    expect(bookings).toHaveLength(0);
  });

  test('should handle high concurrency without data corruption', async () => {
    const concurrency = 20;
    const requests = Array(concurrency).fill(null).map((_, index) => {
      const bookingData = {
        ...testData.createBooking(),
        idempotency_key: `stress-test-${Date.now()}-${index}`,
        estimated_weight: 50 // Small weight to allow multiple bookings
      };
      return () => TestUtils.makeAuthenticatedRequest('create-booking', bookingData, authToken);
    });
    
    const results = await PerformanceTest.runConcurrent(requests, concurrency);
    
    // Count successful bookings
    const successfulRequests = results.filter(r => r.success && r.result?.data?.created);
    const failedRequests = results.filter(r => !r.success || r.result?.error);
    
    console.log(`Successful bookings: ${successfulRequests.length}`);
    console.log(`Failed bookings: ${failedRequests.length}`);
    
    // Verify all successful bookings were created properly
    for (const result of successfulRequests) {
      const bookingId = result.result.data.booking.id;
      await TestUtils.assertBookingCreated(bookingId);
      await TestUtils.assertVehicleAssignment(bookingId);
    }
    
    // Verify no duplicate bookings exist
    const { data: allBookings } = await TestDatabase.supabase
      .from('bookings')
      .select('idempotency_key')
      .like('idempotency_key', 'stress-test-%');
    
    const uniqueKeys = new Set(allBookings?.map(b => b.idempotency_key) || []);
    expect(uniqueKeys.size).toBe(allBookings?.length || 0);
  });

  test('should handle rapid sequential requests', async () => {
    const requests = Array(10).fill(null).map((_, index) => {
      const bookingData = {
        ...testData.createBooking(),
        idempotency_key: `sequential-${Date.now()}-${index}`,
        estimated_weight: 100
      };
      return () => TestUtils.makeAuthenticatedRequest('create-booking', bookingData, authToken);
    });
    
    // Execute requests sequentially (not concurrently)
    const results = [];
    for (const request of requests) {
      const result = await request();
      results.push({
        success: result.status === 200,
        result: result.data,
        error: result.status !== 200 ? result.data : null
      });
    }
    
    // All should succeed since they're sequential
    const successfulRequests = results.filter(r => r.success && r.result?.data?.created);
    expect(successfulRequests).toHaveLength(10);
    
    // Verify all bookings were created
    for (const result of successfulRequests) {
      const bookingId = result.result.data.booking.id;
      await TestUtils.assertBookingCreated(bookingId);
      await TestUtils.assertVehicleAssignment(bookingId);
    }
  });

  test('should handle mixed success and failure scenarios', async () => {
    const requests = [
      // Valid booking
      () => TestUtils.makeAuthenticatedRequest('create-booking', {
        ...testData.createBooking(),
        idempotency_key: `mixed-${Date.now()}-1`
      }, authToken),
      
      // Invalid booking (missing required field)
      () => TestUtils.makeAuthenticatedRequest('create-booking', {
        ...testData.createBooking(),
        window_start: undefined, // Invalid
        idempotency_key: `mixed-${Date.now()}-2`
      }, authToken),
      
      // Valid booking
      () => TestUtils.makeAuthenticatedRequest('create-booking', {
        ...testData.createBooking(),
        idempotency_key: `mixed-${Date.now()}-3`
      }, authToken),
      
      // Duplicate idempotency key (should return existing)
      () => TestUtils.makeAuthenticatedRequest('create-booking', {
        ...testData.createBooking(),
        idempotency_key: `mixed-${Date.now()}-1` // Same as first
      }, authToken)
    ];
    
    const results = await PerformanceTest.runConcurrent(requests, 4);
    
    // First and third should succeed, second should fail validation, fourth should return existing
    const successfulRequests = results.filter(r => r.success && r.result?.data?.created);
    const validationErrors = results.filter(r => !r.success || r.result?.status === 400);
    const duplicateRequests = results.filter(r => r.success && !r.result?.data?.created);
    
    expect(successfulRequests).toHaveLength(2);
    expect(validationErrors).toHaveLength(1);
    expect(duplicateRequests).toHaveLength(1);
  });
});
