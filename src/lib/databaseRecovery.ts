/**
 * Database recovery utilities for QCS Cargo application
 */

import { supabase } from './supabase';
import { databaseHealthChecker, DatabaseHealthStatus } from './databaseHealthCheck';
import { errorLogger } from './errorLogger';

export interface RecoveryAction {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  execute: () => Promise<boolean>;
}

export interface RecoveryResult {
  success: boolean;
  actionsExecuted: string[];
  actions_attempted: string[]; // Backward compatibility
  actions_completed: string[]; // Backward compatibility
  actions_failed: string[]; // Backward compatibility
  errors: string[];
  finalStatus: DatabaseHealthStatus;
  next_steps: string[]; // Backward compatibility
}

/**
 * Attempt to reconnect to database
 */
export async function attemptReconnection(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .select('*', { head: true, count: 'exact' });
    return !error;
  } catch (error) {
    errorLogger.error('Database reconnection failed', { error });
    return false;
  }
}

/**
 * Clear local storage and reset auth state
 */
export async function clearAuthState(): Promise<boolean> {
  try {
    await supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    return true;
  } catch (error) {
    errorLogger.error('Failed to clear auth state', { error });
    return false;
  }
}

/**
 * Refresh Supabase client configuration
 */
export async function refreshSupabaseClient(): Promise<boolean> {
  try {
    // Force refresh the session
    const { error } = await supabase.auth.refreshSession();
    return !error;
  } catch (error) {
    errorLogger.error('Failed to refresh Supabase client', { error });
    return false;
  }
}

/**
 * Test basic database operations
 */
export async function testBasicOperations(): Promise<boolean> {
  try {
    // Test read operation
    const { error: readError } = await supabase
      .from('user_profiles')
      .select('*', { head: true, count: 'exact' });
    if (readError) return false;

    // Test auth operation
    const { error: authError } = await supabase.auth.getSession();
    if (authError) return false;

    return true;
  } catch (error) {
    errorLogger.error('Basic operations test failed', { error });
    return false;
  }
}

/**
 * Recovery actions in order of severity
 */
export const recoveryActions: RecoveryAction[] = [
  {
    id: 'reconnect',
    name: 'Reconnect to Database',
    description: 'Attempt to re-establish database connection',
    severity: 'low',
    execute: attemptReconnection
  },
  {
    id: 'refresh_client',
    name: 'Refresh Supabase Client',
    description: 'Refresh the Supabase client session',
    severity: 'low',
    execute: refreshSupabaseClient
  },
  {
    id: 'test_operations',
    name: 'Test Basic Operations',
    description: 'Verify basic database operations are working',
    severity: 'medium',
    execute: testBasicOperations
  },
  {
    id: 'clear_auth',
    name: 'Clear Authentication State',
    description: 'Clear local authentication state and force re-login',
    severity: 'high',
    execute: clearAuthState
  }
];

/**
 * Execute recovery actions based on health status
 */
export async function executeRecovery(healthStatus: DatabaseHealthStatus): Promise<RecoveryResult> {
  const result: RecoveryResult = {
    success: false,
    actionsExecuted: [],
    actions_attempted: [],
    actions_completed: [],
    actions_failed: [],
    errors: [],
    finalStatus: healthStatus,
    next_steps: []
  };

  try {
    // Determine which actions to execute based on health status
    const actionsToExecute: RecoveryAction[] = [];

    if (!healthStatus.connection_status) {
      actionsToExecute.push(
        recoveryActions.find(a => a.id === 'reconnect')!,
        recoveryActions.find(a => a.id === 'refresh_client')!
      );
    }

    if (!healthStatus.auth_status.can_sign_in || !healthStatus.auth_status.can_sign_up) {
      actionsToExecute.push(
        recoveryActions.find(a => a.id === 'clear_auth')!
      );
    }

    if (healthStatus.overall_status === 'error') {
      actionsToExecute.push(
        recoveryActions.find(a => a.id === 'test_operations')!
      );
    }

    // Execute actions
    for (const action of actionsToExecute) {
      try {
        errorLogger.info(`Executing recovery action: ${action.name}`);
        const success = await action.execute();
        
        if (success) {
          result.actionsExecuted.push(action.name);
          errorLogger.info(`Recovery action succeeded: ${action.name}`);
        } else {
          result.errors.push(`Failed to execute: ${action.name}`);
          errorLogger.error(`Recovery action failed: ${action.name}`);
        }
      } catch (error) {
        const errorMsg = `Error executing ${action.name}: ${error}`;
        result.errors.push(errorMsg);
        errorLogger.error(errorMsg, { action: action.id, error });
      }
    }

    // Re-check health status after recovery
    result.finalStatus = await databaseHealthChecker.performHealthCheck();
    result.success = result.finalStatus.overall_status !== 'error';

    // Generate next steps if recovery wasn't fully successful
    if (!result.success) {
      result.next_steps = [
        'Check network connectivity',
        'Verify Supabase credentials',
        'Contact system administrator',
        'Try manual database reconnection'
      ];
    }

    return result;
  } catch (error) {
    result.errors.push(`Recovery process failed: ${error}`);
    errorLogger.error('Recovery process failed', { error });
    return result;
  }
}

/**
 * Emergency recovery procedure
 */
export async function emergencyRecovery(): Promise<RecoveryResult> {
  errorLogger.info('🚨 Starting emergency recovery procedure');
  
  try {
    // Get initial health status
    const initialHealthReport = await databaseHealthChecker.performHealthCheck();
    console.log(`Current system status: ${initialHealthReport.overall_status}`);

    // Execute all recovery actions in sequence
    const result: RecoveryResult = {
      success: false,
      actionsExecuted: [],
      actions_attempted: [],
      actions_completed: [],
      actions_failed: [],
      errors: [],
      finalStatus: initialHealthReport,
      next_steps: []
    };

    for (const action of recoveryActions) {
      try {
        errorLogger.info(`🔧 Executing emergency action: ${action.name}`);
        const success = await action.execute();
        
        if (success) {
          result.actionsExecuted.push(action.name);
          errorLogger.info(`✅ Emergency action succeeded: ${action.name}`);
        } else {
          result.errors.push(`❌ Failed to execute: ${action.name}`);
          errorLogger.error(`Emergency action failed: ${action.name}`);
        }

        // Small delay between actions
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        const errorMsg = `💥 Error executing ${action.name}: ${error}`;
        result.errors.push(errorMsg);
        errorLogger.error(errorMsg, { action: action.id, error });
      }
    }

    // Final health check
    const finalHealthReport = await databaseHealthChecker.performHealthCheck();
    result.finalStatus = finalHealthReport;
    result.success = finalHealthReport.overall_status !== 'error';

    console.log(`🏁 Emergency recovery completed. Final status: ${finalHealthReport.overall_status}`);
    
    return result;
  } catch (error) {
    errorLogger.error('Emergency recovery procedure failed', { error });
    return {
      success: false,
      actionsExecuted: [],
      actions_attempted: [],
      actions_completed: [],
      actions_failed: [],
      errors: [`Emergency recovery failed: ${error}`],
      finalStatus: await databaseHealthChecker.performHealthCheck(),
      next_steps: []
    };
  }
}

/**
 * Auto-recovery based on health check
 */
export async function autoRecover(): Promise<RecoveryResult> {
  try {
    const healthStatus = await databaseHealthChecker.performHealthCheck();
    
    if (healthStatus.overall_status === 'healthy') {
      return {
        success: true,
        actionsExecuted: [],
        actions_attempted: [],
        actions_completed: [],
        actions_failed: [],
        errors: [],
        finalStatus: healthStatus,
        next_steps: []
      };
    }

    return await executeRecovery(healthStatus);
  } catch (error) {
    errorLogger.error('Auto-recovery failed', { error });
    return {
      success: false,
      actionsExecuted: [],
      actions_attempted: [],
      actions_completed: [],
      actions_failed: [],
      errors: [`Auto-recovery failed: ${error}`],
      finalStatus: await databaseHealthChecker.performHealthCheck(),
      next_steps: []
    };
  }
}

// Additional exports for backward compatibility
export const databaseRecoveryManager = {
  executeRecovery,
  emergencyRecovery,
  autoRecover,
  attemptReconnection,
  clearAuthState,
  refreshSupabaseClient,
  testBasicOperations,
  recoveryActions
};

export const performDatabaseRecovery = executeRecovery;

export async function generateRecoveryMigration(): Promise<string> {
  return `-- Auto-generated recovery migration
-- Generated at: ${new Date().toISOString()}

-- Reset connection pool
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();

-- Refresh materialized views if any
-- REFRESH MATERIALIZED VIEW CONCURRENTLY view_name;

-- Analyze tables for better query planning
ANALYZE;

-- Vacuum to reclaim space
VACUUM;

COMMENT ON SCHEMA public IS 'Recovery migration applied successfully';
`;
}

// Export recovery utilities
export const databaseRecovery = {
  executeRecovery,
  emergencyRecovery,
  autoRecover,
  attemptReconnection,
  clearAuthState,
  refreshSupabaseClient,
  testBasicOperations,
  recoveryActions
};

export default databaseRecovery;
