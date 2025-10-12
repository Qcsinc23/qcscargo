import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { monitoring } from '@/lib/monitoring';

interface HealthStatus {
  status: string;
  checks: {
    database: boolean;
    auth: boolean;
    edge_functions: boolean;
  };
  timestamp: string;
  version: string;
  uptime: number;
}

interface ErrorLog {
  id: string;
  error_type: string;
  error_message: string;
  error_details: any;
  severity: string;
  created_at: string;
  resolved: boolean;
}

interface PerformanceMetric {
  id: string;
  component: string;
  status: string;
  message: string;
  details: any;
  metrics: any;
  checked_at: string;
}

const AdminMonitoring: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHealthStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('health-check');
      if (error) throw error;
      setHealthStatus(data);
    } catch (err) {
      console.error('Failed to load health status:', err);
    }
  };

  const loadErrorLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setErrorLogs(data || []);
    } catch (err) {
      console.error('Failed to load error logs:', err);
    }
  };

  const loadPerformanceMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('system_health')
        .select('*')
        .eq('component', 'performance')
        .order('checked_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setPerformanceMetrics(data || []);
    } catch (err) {
      console.error('Failed to load performance metrics:', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadHealthStatus(),
      loadErrorLogs(),
      loadPerformanceMetrics()
    ]);
    setLoading(false);
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadAllData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: 'default',
      warning: 'secondary',
      error: 'destructive',
      critical: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      info: 'default',
      warning: 'secondary',
      error: 'destructive',
      critical: 'destructive'
    } as const;

    return (
      <Badge variant={variants[severity as keyof typeof variants] || 'default'}>
        {severity}
      </Badge>
    );
  };

  const debugData = monitoring.getDebugData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading monitoring data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor system health, errors, and performance metrics
          </p>
        </div>
        <Button onClick={refreshData} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
          <CardDescription>
            Current system status and component health
          </CardDescription>
        </CardHeader>
        <CardContent>
          {healthStatus ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">Overall Status</span>
                {getStatusBadge(healthStatus.status)}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  {getStatusIcon(healthStatus.checks.database)}
                  <span>Database</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(healthStatus.checks.auth)}
                  <span>Authentication</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(healthStatus.checks.edge_functions)}
                  <span>Edge Functions</span>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Version: {healthStatus.version}</p>
                <p>Uptime: {Math.round(healthStatus.uptime)}s</p>
                <p>Last checked: {new Date(healthStatus.timestamp).toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Unable to load health status. Check system connectivity.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Client-side Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle>Client Debug Info</CardTitle>
          <CardDescription>
            Current client-side monitoring status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{debugData.errors}</div>
              <div className="text-sm text-muted-foreground">Errors in Queue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{debugData.performance}</div>
              <div className="text-sm text-muted-foreground">Performance Metrics</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{debugData.business}</div>
              <div className="text-sm text-muted-foreground">Business Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{debugData.isOnline ? 'Online' : 'Offline'}</div>
              <div className="text-sm text-muted-foreground">Connection Status</div>
            </div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Session ID: {debugData.sessionId}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="errors">Error Logs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Recent Error Logs</CardTitle>
              <CardDescription>
                Latest 50 error entries from the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {errorLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No error logs found
                  </p>
                ) : (
                  errorLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(log.severity)}
                          <span className="font-medium">{log.error_type}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{log.error_message}</p>
                      {log.error_details?.context && (
                        <details className="text-xs text-muted-foreground">
                          <summary>Context</summary>
                          <pre className="mt-2 whitespace-pre-wrap">
                            {JSON.stringify(log.error_details.context, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Recent performance data and system metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceMetrics.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No performance metrics found
                  </p>
                ) : (
                  performanceMetrics.map((metric) => (
                    <div key={metric.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{metric.message}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(metric.checked_at).toLocaleString()}
                        </span>
                      </div>
                      {metric.details && (
                        <div className="text-sm">
                          <strong>Details:</strong>
                          <pre className="mt-1 whitespace-pre-wrap text-xs">
                            {JSON.stringify(metric.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminMonitoring;
