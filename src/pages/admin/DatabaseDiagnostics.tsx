import React, { useState, useEffect } from 'react'
import { 
  databaseHealthChecker, 
  runHealthCheckWithLogging, 
  DatabaseHealthReport 
} from '../../lib/databaseHealthCheck'
import { 
  databaseRecoveryManager, 
  performDatabaseRecovery, 
  generateRecoveryMigration,
  emergencyRecovery,
  RecoveryResult 
} from '../../lib/databaseRecovery'
import { supabase } from '../../lib/supabase'

const DatabaseDiagnostics: React.FC = () => {
  const [healthReport, setHealthReport] = useState<DatabaseHealthReport | null>(null)
  const [recoveryResult, setRecoveryResult] = useState<RecoveryResult | null>(null)
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false)
  const [isRunningRecovery, setIsRunningRecovery] = useState(false)
  const [isRunningEmergencyRecovery, setIsRunningEmergencyRecovery] = useState(false)
  const [migrationSQL, setMigrationSQL] = useState<string>('')
  const [showMigrationSQL, setShowMigrationSQL] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const runHealthCheck = async () => {
    setIsRunningHealthCheck(true)
    addLog('Starting comprehensive health check...')
    
    try {
      const report = await databaseHealthChecker.performHealthCheck()
      setHealthReport(report)
      addLog(`Health check completed. Status: ${report.overall_status}`)
      
      if (report.recommendations.length > 0) {
        addLog(`Found ${report.recommendations.length} recommendations`)
      }
    } catch (error) {
      addLog(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRunningHealthCheck(false)
    }
  }

  const runRecovery = async () => {
    setIsRunningRecovery(true)
    addLog('Starting database recovery process...')
    
    try {
      // Get current health status first
      const healthStatus = await databaseHealthChecker.performHealthCheck()
      const result = await performDatabaseRecovery(healthStatus)
      setRecoveryResult(result)
      
      addLog(`Recovery completed. Success: ${result.success}`)
      addLog(`Actions attempted: ${result.actions_attempted.length}`)
      addLog(`Actions completed: ${result.actions_completed.length}`)
      addLog(`Actions failed: ${result.actions_failed.length}`)
      
      if (result.actions_failed.length > 0) {
        result.actions_failed.forEach(failure => {
          addLog(`Failed: ${failure}`)
        })
      }
      
      // Run health check after recovery
      await runHealthCheck()
    } catch (error) {
      addLog(`Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRunningRecovery(false)
    }
  }

  const runEmergencyRecovery = async () => {
    setIsRunningEmergencyRecovery(true)
    addLog('🚨 STARTING EMERGENCY RECOVERY...')
    
    try {
      await emergencyRecovery()
      addLog('Emergency recovery completed')
      
      // Run health check after emergency recovery
      await runHealthCheck()
    } catch (error) {
      addLog(`Emergency recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRunningEmergencyRecovery(false)
    }
  }

  const generateMigration = async () => {
    addLog('Generating recovery migration SQL...')
    const sql = await generateRecoveryMigration()
    setMigrationSQL(sql)
    setShowMigrationSQL(true)
    addLog('Migration SQL generated')
  }

  const testDatabaseConnection = async () => {
    addLog('Testing database connection...')
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .select('*', { head: true, count: 'exact' })
      
      if (error) {
        addLog(`Connection test failed: ${error.message}`)
      } else {
        addLog('Database connection successful')
      }
    } catch (error) {
      addLog(`Connection test error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const testUserRegistration = async () => {
    addLog('Testing user registration flow...')
    
    try {
      const testEmail = `test-${Date.now()}@qcstest.com`
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPassword123!',
        options: {
          data: {
            full_name: 'Test User',
            test_user: true
          }
        }
      })

      if (error) {
        addLog(`Registration test failed: ${error.message}`)
      } else {
        addLog('Registration test successful')
        
        // Clean up test user if needed
        if (data.user) {
          addLog(`Test user created with ID: ${data.user.id}`)
        }
      }
    } catch (error) {
      addLog(`Registration test error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  const copyMigrationSQL = () => {
    navigator.clipboard.writeText(migrationSQL)
    addLog('Migration SQL copied to clipboard')
  }

  useEffect(() => {
    // Run initial health check
    runHealthCheck()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'degraded': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Database Diagnostics & Recovery</h1>
          <p className="mt-2 text-gray-600">
            Comprehensive database health monitoring and recovery tools
          </p>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={runHealthCheck}
              disabled={isRunningHealthCheck}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunningHealthCheck ? 'Running...' : 'Health Check'}
            </button>
            
            <button
              onClick={testDatabaseConnection}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Test Connection
            </button>
            
            <button
              onClick={testUserRegistration}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
            >
              Test Registration
            </button>
            
            <button
              onClick={generateMigration}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Generate Migration
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <button
              onClick={runRecovery}
              disabled={isRunningRecovery}
              className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunningRecovery ? 'Recovering...' : 'Run Recovery'}
            </button>
            
            <button
              onClick={runEmergencyRecovery}
              disabled={isRunningEmergencyRecovery}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunningEmergencyRecovery ? 'Emergency Recovery...' : '🚨 Emergency Recovery'}
            </button>
          </div>
        </div>

        {/* Health Report */}
        {healthReport && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">System Health Report</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(healthReport.overall_status)}`}>
                {healthReport.overall_status.toUpperCase()}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Connection Status */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Database Connection</h3>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${healthReport.connection_status ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">{healthReport.connection_status ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>

              {/* Authentication Status */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Authentication</h3>
                <div className="space-y-1">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${healthReport.auth_status.can_sign_up ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm">Sign Up: {healthReport.auth_status.can_sign_up ? 'Working' : 'Failed'}</span>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${healthReport.auth_status.can_sign_in ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm">Sign In: {healthReport.auth_status.can_sign_in ? 'Working' : 'Failed'}</span>
                  </div>
                </div>
              </div>

              {/* Tables Status */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Tables</h3>
                <div className="space-y-1">
                  {Object.entries(healthReport.tables_status).map(([table, status]) => {
                    const tableStatus = status as { accessible: boolean; error?: string };
                    return (
                      <div key={table} className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${tableStatus.accessible ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm">{table}: {tableStatus.accessible ? 'OK' : 'Error'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {healthReport.recommendations.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-2">Recommendations</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <ul className="space-y-1">
                    {healthReport.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-yellow-800">
                        • {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recovery Results */}
        {recoveryResult && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recovery Results</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{recoveryResult.actions_attempted.length}</div>
                <div className="text-sm text-blue-800">Actions Attempted</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{recoveryResult.actions_completed.length}</div>
                <div className="text-sm text-green-800">Actions Completed</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{recoveryResult.actions_failed.length}</div>
                <div className="text-sm text-red-800">Actions Failed</div>
              </div>
            </div>

            {recoveryResult.actions_failed.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <h3 className="font-medium text-red-900 mb-2">Failed Actions</h3>
                <ul className="space-y-1">
                  {recoveryResult.actions_failed.map((failure, index) => (
                    <li key={index} className="text-sm text-red-800">
                      • {failure}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recoveryResult.next_steps.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="font-medium text-blue-900 mb-2">Next Steps</h3>
                <ul className="space-y-1">
                  {recoveryResult.next_steps.map((step, index) => (
                    <li key={index} className="text-sm text-blue-800">
                      • {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Migration SQL */}
        {showMigrationSQL && migrationSQL && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Recovery Migration SQL</h2>
              <div className="space-x-2">
                <button
                  onClick={copyMigrationSQL}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Copy SQL
                </button>
                <button
                  onClick={() => setShowMigrationSQL(false)}
                  className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                >
                  Hide
                </button>
              </div>
            </div>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
              {migrationSQL}
            </pre>
          </div>
        )}

        {/* Logs */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Activity Logs</h2>
            <button
              onClick={clearLogs}
              className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
            >
              Clear Logs
            </button>
          </div>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-64 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DatabaseDiagnostics
