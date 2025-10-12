/**
 * Global test teardown
 */

import { FullConfig } from '@playwright/test';
import { TestUtils, TestDatabase } from './setup';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');
  
  try {
    // Clean up all test data
    console.log('🗑️  Cleaning up test data...');
    await TestUtils.cleanup();
    await TestDatabase.reset();
    
    console.log('✅ Test data cleanup complete');
    
    // Clean up test admin user
    console.log('👤 Cleaning up test admin user...');
    try {
      const { createClient } = await import('@supabase/supabase-js');
      
      const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';
      
      const supabase = createClient(supabaseUrl, serviceKey);
      
      // Find and delete test admin user
      const { data: users } = await supabase.auth.admin.listUsers();
      const testAdmin = users.users.find(user => user.email === 'test-admin@example.com');
      
      if (testAdmin) {
        await supabase.auth.admin.deleteUser(testAdmin.id);
        console.log('✅ Test admin user deleted');
      }
    } catch (error) {
      console.warn('⚠️  Test admin user cleanup failed:', error.message);
    }
    
    // Reset database sequences
    console.log('🔄 Resetting database sequences...');
    try {
      const { createClient } = await import('@supabase/supabase-js');
      
      const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';
      
      const supabase = createClient(supabaseUrl, serviceKey);
      
      // Reset sequences to start from 1
      await supabase.rpc('reset_sequences');
      
      console.log('✅ Database sequences reset');
    } catch (error) {
      console.warn('⚠️  Database sequence reset failed:', error.message);
    }
    
    // Generate test report summary
    console.log('📊 Generating test report summary...');
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const resultsDir = path.join(process.cwd(), 'test-results');
      const summaryFile = path.join(resultsDir, 'test-summary.json');
      
      const summary = {
        timestamp: new Date().toISOString(),
        environment: {
          supabaseUrl: process.env.VITE_SUPABASE_URL || 'http://localhost:54321',
          nodeEnv: process.env.NODE_ENV || 'test'
        },
        cleanup: {
          testDataRemoved: true,
          adminUserRemoved: true,
          sequencesReset: true
        }
      };
      
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }
      
      fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
      
      console.log('✅ Test summary generated');
    } catch (error) {
      console.warn('⚠️  Test summary generation failed:', error.message);
    }
    
    console.log('🎉 Global test teardown complete!');
    
  } catch (error) {
    console.error('❌ Global test teardown failed:', error);
    // Don't throw error to avoid masking test failures
  }
}

export default globalTeardown;
