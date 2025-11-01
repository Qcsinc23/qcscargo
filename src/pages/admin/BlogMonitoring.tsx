import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MonitoringService } from '@/lib/services/monitoring.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  TrendingUp,
  Clock,
  Link as LinkIcon,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

export default function BlogMonitoring() {
  const navigate = useNavigate()
  const [health, setHealth] = useState<any>(null)
  const [performance, setPerformance] = useState<any>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMonitoringData()
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadMonitoringData()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const loadMonitoringData = async () => {
    try {
      setLoading(true)
      const [healthData, performanceData, alertsData, activityData] = await Promise.all([
        MonitoringService.getSystemHealth(),
        MonitoringService.getPerformanceMetrics(),
        MonitoringService.getAlerts(),
        MonitoringService.getRecentActivity()
      ])

      setHealth(healthData)
      setPerformance(performanceData)
      setAlerts(alertsData)
      setActivity(activityData)
    } catch (error: any) {
      toast.error('Failed to load monitoring data')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-6 w-6 text-green-600" />
      case 'degraded':
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />
      case 'critical':
        return <XCircle className="h-6 w-6 text-red-600" />
      default:
        return <Activity className="h-6 w-6 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: 'bg-green-100 text-green-800',
      degraded: 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800'
    }
    return (
      <Badge className={variants[status as keyof typeof variants] || ''}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      default:
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  if (loading && !health) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog System Monitoring</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time system health and performance</p>
        </div>
        <Button variant="outline" onClick={loadMonitoringData}>
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
            {health && (
              <div className="flex items-center gap-2">
                {getStatusIcon(health.status)}
                {getStatusBadge(health.status)}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {health && (
            <>
              {health.issues.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 mb-2">Issues Detected:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                    {health.issues.map((issue: string, index: number) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Posts</p>
                  <p className="text-2xl font-bold">{health.metrics.totalPosts}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Scheduled</p>
                  <p className="text-2xl font-bold">{health.metrics.scheduledPosts}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Failed Generations</p>
                  <p className="text-2xl font-bold text-red-600">
                    {health.metrics.failedGenerations}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Broken Links</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {health.metrics.brokenLinks}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg. SEO Score</p>
                  <p className="text-2xl font-bold">{health.metrics.avgSeoScore}/100</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg ${
                    alert.severity === 'critical'
                      ? 'bg-red-50 border-red-200'
                      : alert.severity === 'warning'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.severity)}
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{alert.title}</h4>
                      <p className="text-sm mt-1">{alert.message}</p>
                      {alert.actionUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => navigate(alert.actionUrl)}
                        >
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg. Page Load</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {performance?.averagePageLoad.toFixed(1)}s
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Time on Page</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {Math.round((performance?.averageTimeOnPage || 0) / 60)}m
                </p>
                <p className="text-xs text-gray-500">
                  {(performance?.averageTimeOnPage || 0) % 60}s
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Bounce Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {performance?.bounceRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {performance?.conversionRate.toFixed(2)}%
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length > 0 ? (
            <div className="space-y-2">
              {activity.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded">
                      <Activity className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.message}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(item.timestamp), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

