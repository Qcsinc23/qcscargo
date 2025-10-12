/**
 * Test setup and utilities for QCS Cargo
 */

import { createClient } from '@supabase/supabase-js';
import { expect } from '@playwright/test';

// Test configuration
export const TEST_CONFIG = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || 'http://localhost:54321',
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key',
  testTimeout: 30000,
  retryAttempts: 3
};

// Create test Supabase client
export const supabase = createClient(
  TEST_CONFIG.supabaseUrl,
  TEST_CONFIG.supabaseServiceKey
);

// Test data factories
export const testData = {
  createUser: () => ({
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    first_name: 'Test',
    last_name: 'User'
  }),
  
  createBooking: () => ({
    window_start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    window_end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // Tomorrow + 2 hours
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
    notes: 'Test booking',
    idempotency_key: `test-${Date.now()}-${Math.random()}`
  }),
  
  createVehicle: () => ({
    name: `Test Vehicle ${Date.now()}`,
    capacity_lbs: 1000,
    active: true,
    vehicle_type: 'van'
  }),
  
  createQuote: () => ({
    customerInfo: {
      fullName: 'Test Customer',
      email: 'test@example.com'
    },
    destinationId: 1,
    weight: 100,
    serviceType: 'standard',
    rateBreakdown: {
      baseShippingCost: 50,
      expressSurcharge: 0,
      totalCost: 50
    }
  })
};

// Test utilities
export class TestUtils {
  /**
   * Clean up test data
   */
  static async cleanup() {
    try {
      // Delete test bookings
      await supabase
        .from('bookings')
        .delete()
        .like('idempotency_key', 'test-%');
      
      // Delete test vehicles
      await supabase
        .from('vehicles')
        .delete()
        .like('name', 'Test Vehicle %');
      
      // Delete test users (if any)
      const { data: users } = await supabase.auth.admin.listUsers();
      for (const user of users.users) {
        if (user.email?.includes('test-') && user.email?.includes('@example.com')) {
          await supabase.auth.admin.deleteUser(user.id);
        }
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  }
  
  /**
   * Wait for condition to be true
   */
  static async waitFor(
    condition: () => Promise<boolean> | boolean,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<boolean> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    return false;
  }
  
  /**
   * Create test user and return auth token
   */
  static async createTestUser(userData = testData.createUser()) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        first_name: userData.first_name,
        last_name: userData.last_name
      }
    });
    
    if (error) throw error;
    
    // Create user profile
    await supabase
      .from('user_profiles')
      .insert({
        id: data.user.id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        role: 'customer'
      });
    
    return {
      user: data.user,
      email: userData.email,
      password: userData.password
    };
  }
  
  /**
   * Create test admin user
   */
  static async createTestAdmin() {
    const adminData = {
      email: `admin-${Date.now()}@example.com`,
      password: 'AdminPassword123!',
      first_name: 'Test',
      last_name: 'Admin'
    };
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminData.email,
      password: adminData.password,
      email_confirm: true,
      app_metadata: { role: 'admin' },
      user_metadata: {
        first_name: adminData.first_name,
        last_name: adminData.last_name
      }
    });
    
    if (error) throw error;
    
    // Create admin profile
    await supabase
      .from('user_profiles')
      .insert({
        id: data.user.id,
        first_name: adminData.first_name,
        last_name: adminData.last_name,
        email: adminData.email,
        role: 'admin'
      });
    
    return {
      user: data.user,
      email: adminData.email,
      password: adminData.password
    };
  }
  
  /**
   * Get auth token for user
   */
  static async getAuthToken(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data.session?.access_token;
  }
  
  /**
   * Make authenticated request to edge function
   */
  static async makeAuthenticatedRequest(
    functionName: string,
    data: any,
    token: string
  ) {
    const response = await fetch(
      `${TEST_CONFIG.supabaseUrl}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );
    
    return {
      status: response.status,
      data: await response.json()
    };
  }
  
  /**
   * Assert booking was created successfully
   */
  static async assertBookingCreated(bookingId: number) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();
    
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.status).toBe('confirmed');
    
    return data;
  }
  
  /**
   * Assert vehicle assignment was created
   */
  static async assertVehicleAssignment(bookingId: number) {
    const { data, error } = await supabase
      .from('vehicle_assignments')
      .select('*')
      .eq('booking_id', bookingId)
      .single();
    
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.vehicle_id).toBeTruthy();
    
    return data;
  }
  
  /**
   * Assert capacity calculation is correct
   */
  static async assertCapacityCalculation(
    vehicleId: number,
    expectedUsed: number,
    expectedRemaining: number
  ) {
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('capacity_lbs')
      .eq('id', vehicleId)
      .single();
    
    const { data: assignments } = await supabase
      .from('vehicle_assignments')
      .select('bookings(estimated_weight)')
      .eq('vehicle_id', vehicleId);
    
    const usedCapacity = assignments?.reduce((sum, assignment) => 
      sum + (assignment.bookings?.estimated_weight || 0), 0) || 0;
    
    const remainingCapacity = vehicle.capacity_lbs - usedCapacity;
    
    expect(usedCapacity).toBeCloseTo(expectedUsed, 1);
    expect(remainingCapacity).toBeCloseTo(expectedRemaining, 1);
  }
}

// Test database helpers
export class TestDatabase {
  /**
   * Reset test database
   */
  static async reset() {
    try {
      // Delete all test data
      await supabase.from('vehicle_assignments').delete().neq('id', 0);
      await supabase.from('bookings').delete().neq('id', 0);
      await supabase.from('vehicles').delete().neq('id', 0);
      await supabase.from('user_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Reset sequences
      await supabase.rpc('reset_sequences');
    } catch (error) {
      console.warn('Database reset failed:', error);
    }
  }
  
  /**
   * Create test vehicles
   */
  static async createTestVehicles() {
    const vehicles = [
      { name: 'Test Van 1', capacity_lbs: 1000, active: true },
      { name: 'Test Van 2', capacity_lbs: 1500, active: true },
      { name: 'Test Truck', capacity_lbs: 2000, active: true }
    ];
    
    const { data, error } = await supabase
      .from('vehicles')
      .insert(vehicles)
      .select();
    
    if (error) throw error;
    return data;
  }
  
  /**
   * Create test destinations
   */
  static async createTestDestinations() {
    const destinations = [
      { name: 'Test Destination 1', address: '123 Test St', city: 'Test City', state: 'NJ', zip_code: '07032' },
      { name: 'Test Destination 2', address: '456 Test Ave', city: 'Test City', state: 'NJ', zip_code: '07033' }
    ];
    
    const { data, error } = await supabase
      .from('destinations')
      .insert(destinations)
      .select();
    
    if (error) throw error;
    return data;
  }
}

// Performance testing utilities
export class PerformanceTest {
  /**
   * Measure function execution time
   */
  static async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    return { result, duration };
  }
  
  /**
   * Run concurrent requests
   */
  static async runConcurrent<T>(
    requests: Array<() => Promise<T>>,
    concurrency: number = 10
  ): Promise<Array<{ success: boolean; result?: T; error?: any; duration: number }>> {
    const results: Array<{ success: boolean; result?: T; error?: any; duration: number }> = [];
    
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(async (request) => {
          const { result, duration } = await this.measureTime(request);
          return { result, duration };
        })
      );
      
      results.push(...batchResults.map((result, index) => ({
        success: result.status === 'fulfilled',
        result: result.status === 'fulfilled' ? result.value.result : undefined,
        error: result.status === 'rejected' ? result.reason : undefined,
        duration: result.status === 'fulfilled' ? result.value.duration : 0
      })));
    }
    
    return results;
  }
}

// Export test configuration
export default {
  TEST_CONFIG,
  testData,
  TestUtils,
  TestDatabase,
  PerformanceTest
};
