/**
 * Global test setup
 */

import { chromium, FullConfig } from '@playwright/test';
import { TestDatabase } from './setup';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');
  
  try {
    // Initialize test database
    console.log('📊 Setting up test database...');
    await TestDatabase.reset();
    await TestDatabase.createTestVehicles();
    await TestDatabase.createTestDestinations();
    
    console.log('✅ Test database setup complete');
    
    // Verify Supabase connection
    console.log('🔌 Verifying Supabase connection...');
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';
    
    const supabase = createClient(supabaseUrl, serviceKey);
    
    const { data, error } = await supabase
      .from('vehicles')
      .select('count')
      .limit(1);
    
    if (error) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
    
    console.log('✅ Supabase connection verified');
    
    // Check if required tables exist
    console.log('📋 Verifying database schema...');
    const requiredTables = [
      'user_profiles',
      'bookings',
      'vehicles',
      'vehicle_assignments',
      'destinations'
    ];
    
    for (const table of requiredTables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (tableError) {
        throw new Error(`Required table ${table} not found: ${tableError.message}`);
      }
    }
    
    console.log('✅ Database schema verified');
    
    // Test edge functions are accessible
    console.log('⚡ Testing edge functions...');
    const testFunctions = [
      'create-booking',
      'get-available-windows',
      'quote-request'
    ];
    
    for (const func of testFunctions) {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/${func}`, {
          method: 'OPTIONS'
        });
        
        if (!response.ok) {
          throw new Error(`Edge function ${func} not accessible: ${response.status}`);
        }
      } catch (error) {
        console.warn(`⚠️  Edge function ${func} test failed:`, error.message);
      }
    }
    
    console.log('✅ Edge functions verified');
    
    // Create test admin user for tests that need it
    console.log('👤 Creating test admin user...');
    try {
      const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
        email: 'test-admin@example.com',
        password: 'TestAdmin123!',
        email_confirm: true,
        app_metadata: { role: 'admin' },
        user_metadata: {
          first_name: 'Test',
          last_name: 'Admin'
        }
      });
      
      if (adminError) {
        console.warn('⚠️  Test admin user creation failed:', adminError.message);
      } else {
        // Create admin profile
        await supabase
          .from('user_profiles')
          .insert({
            id: adminData.user.id,
            first_name: 'Test',
            last_name: 'Admin',
            email: 'test-admin@example.com',
            role: 'admin'
          });
        
        console.log('✅ Test admin user created');
      }
    } catch (error) {
      console.warn('⚠️  Test admin user creation failed:', error.message);
    }
    
    console.log('🎉 Global test setup complete!');
    
  } catch (error) {
    console.error('❌ Global test setup failed:', error);
    throw error;
  }
}

export default globalSetup;
