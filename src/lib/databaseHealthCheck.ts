/**
 * Database health check utilities for QCS Cargo application
 */

import { supabase } from './supabase';

export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: any;
  timestamp: string;
}

export interface DatabaseHealthStatus {
  overall: 'healthy' | 'warning' | 'error';
  overall_status: 'healthy' | 'warning' | 'error'; // Backward compatibility
  checks: {
    connection: HealthCheckResult;
    tables: HealthCheckResult;
    functions: HealthCheckResult;
    rls: HealthCheckResult;
  };
  accessible: boolean;
  connection_status: boolean;
  auth_status: {
    can_sign_up: boolean;
    can_sign_in: boolean;
  };
  tables_status: Record<string, { accessible: boolean; error?: string }>;
  recommendations: string[];
}

/**
 * Check database connection
 */
export async function checkConnection(): Promise<HealthCheckResult> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .select('*', { head: true, count: 'exact' });

    if (error) {
      return {
        status: 'error',
        message: 'Database connection failed',
        details: error,
        timestamp: new Date().toISOString()
      };
    }

    return {
      status: 'healthy',
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Database connection error',
      details: error,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Check critical tables exist and are accessible
 */
export async function checkTables(): Promise<HealthCheckResult> {
  const criticalTables = ['user_profiles', 'bookings', 'vehicles', 'business_hours'];
  const results: any[] = [];

  try {
    for (const table of criticalTables) {
      const { error } = await supabase
        .from(table)
        .select('*', { head: true, count: 'exact' });
      results.push({
        table,
        accessible: !error,
        error: error?.message
      });
    }

    const failedTables = results.filter(r => !r.accessible);
    
    if (failedTables.length > 0) {
      return {
        status: 'error',
        message: `${failedTables.length} critical tables inaccessible`,
        details: failedTables,
        timestamp: new Date().toISOString()
      };
    }

    return {
      status: 'healthy',
      message: 'All critical tables accessible',
      details: results,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Table check failed',
      details: error,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Check Edge Functions are accessible
 */
export async function checkFunctions(): Promise<HealthCheckResult> {
  try {
    // Test a simple function call
    const { data, error } = await supabase.functions.invoke('admin-settings-get', {
      body: { test: true }
    });

    if (error && error.message.includes('401')) {
      // 401 is expected for unauthenticated calls, means function is accessible
      return {
        status: 'healthy',
        message: 'Edge Functions accessible',
        timestamp: new Date().toISOString()
      };
    }

    if (error && !error.message.includes('401')) {
      return {
        status: 'warning',
        message: 'Edge Functions may have issues',
        details: error,
        timestamp: new Date().toISOString()
      };
    }

    return {
      status: 'healthy',
      message: 'Edge Functions operational',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Edge Functions check failed',
      details: error,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Check Row Level Security policies
 */
export async function checkRLS(): Promise<HealthCheckResult> {
  try {
    // Test RLS by trying to access user_profiles without auth
    const { data, error } = await supabase.from('user_profiles').select('*').limit(1);
    
    if (error && error.message.includes('RLS')) {
      return {
        status: 'healthy',
        message: 'RLS policies active and working',
        timestamp: new Date().toISOString()
      };
    }

    return {
      status: 'warning',
      message: 'RLS policies may not be properly configured',
      details: { data, error },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'RLS check failed',
      details: error,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Perform comprehensive database health check
 */
export async function performHealthCheck(): Promise<DatabaseHealthStatus> {
  const checks = {
    connection: await checkConnection(),
    tables: await checkTables(),
    functions: await checkFunctions(),
    rls: await checkRLS()
  };

  // Determine overall status
  const hasErrors = Object.values(checks).some(check => check.status === 'error');
  const hasWarnings = Object.values(checks).some(check => check.status === 'warning');
  
  let overall: 'healthy' | 'warning' | 'error' = 'healthy';
  if (hasErrors) {
    overall = 'error';
  } else if (hasWarnings) {
    overall = 'warning';
  }

  // Extract table status details
  const tablesStatus: Record<string, { accessible: boolean; error?: string }> = {};
  if (checks.tables.details && Array.isArray(checks.tables.details)) {
    checks.tables.details.forEach((table: any) => {
      tablesStatus[table.table] = {
        accessible: table.accessible,
        error: table.error
      };
    });
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (checks.connection.status === 'error') {
    recommendations.push('Database connection issues detected. Check network connectivity and credentials.');
  }
  if (checks.tables.status === 'error') {
    recommendations.push('Critical tables are inaccessible. Check database permissions and table existence.');
  }
  if (checks.functions.status === 'error') {
    recommendations.push('Edge Functions are not responding. Check Supabase function deployment.');
  }
  if (checks.rls.status === 'warning') {
    recommendations.push('Row Level Security policies may need review for proper access control.');
  }

  return {
    overall,
    overall_status: overall, // Backward compatibility
    checks,
    accessible: checks.connection.status !== 'error' && checks.tables.status !== 'error',
    connection_status: checks.connection.status === 'healthy',
    auth_status: {
      can_sign_up: checks.connection.status === 'healthy' && checks.tables.status === 'healthy',
      can_sign_in: checks.connection.status === 'healthy' && checks.tables.status === 'healthy'
    },
    tables_status: tablesStatus,
    recommendations
  };
}

/**
 * Quick accessibility check
 */
export async function isDatabaseAccessible(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .select('*', { head: true, count: 'exact' });
    return !error;
  } catch {
    return false;
  }
}

// Additional exports for backward compatibility
export interface DatabaseHealthReport extends DatabaseHealthStatus {}

export const databaseHealthChecker = {
  performHealthCheck,
  checkConnection,
  checkTables,
  checkFunctions,
  checkRLS,
  isDatabaseAccessible
};

export async function runHealthCheckWithLogging(): Promise<DatabaseHealthStatus> {
  console.log('Starting database health check...');
  const result = await performHealthCheck();
  console.log('Database health check completed:', result);
  return result;
}
