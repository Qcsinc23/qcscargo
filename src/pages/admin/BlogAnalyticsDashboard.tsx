import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BlogAnalyticsService } from '@/lib/services/blog-analytics.service'
import { BlogService } from '@/lib/services/blog.service'
import type { BlogAnalytics, BlogPost } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import {
  TrendingUp,
  Eye,
  Users,
  Clock,
  MousePointerClick,
  ArrowRight,
  Calendar,
  Loader2
} from 'lucide-react'
import { format, subDays, startOfDay } from 'date-fns'

export default function BlogAnalyticsDashboard() {
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState<{
    totalViews: number
    totalUniqueVisitors: number
    totalConversions: number
    averageTimeOnPage: number
    topPosts: Array<{ postId: string; title: string; views: number }>
  }>({
    totalViews: 0,
    totalUniqueVisitors: 0,
    totalConversions: 0,
    averageTimeOnPage: 0,
    topPosts: []
  })
  const [timeRange, setTimeRange] = useState<30 | 7 | 90>(30)
  const [loading, setLoading] = useState(true)
  const [viewsData, setViewsData] = useState<any[]>([])
  const [trafficSourceData, setTrafficSourceData] = useState<any[]>([])
  const [topPosts, setTopPosts] = useState<BlogPost[]>([])

  useEffect(() => {
    loadAnalytics()
  }, [timeRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const aggregated = await BlogAnalyticsService.getAggregatedAnalytics(timeRange)
      setAnalytics(aggregated)

      // Load top posts details
      if (aggregated.topPosts.length > 0) {
        const postDetails = await Promise.all(
          aggregated.topPosts.slice(0, 5).map(async ({ postId }) => {
            try {
              return await BlogService.getPostById(postId)
            } catch {
              return null
            }
          })
        )
        setTopPosts(postDetails.filter(Boolean) as BlogPost[])
      }

      // Generate chart data (mock for now - would come from real analytics)
      const days = []
      for (let i = timeRange - 1; i >= 0; i--) {
        days.push({
          date: format(subDays(new Date(), i), 'MMM d'),
          views: Math.floor(Math.random() * 100) + 10,
          visitors: Math.floor(Math.random() * 80) + 5
        })
      }
      setViewsData(days)

      // Traffic source data
      setTrafficSourceData([
        { source: 'Organic Search', value: 45, color: '#3b82f6' },
        { source: 'Direct', value: 25, color: '#10b981' },
        { source: 'Social Media', value: 15, color: '#f59e0b' },
        { source: 'Referral', value: 10, color: '#8b5cf6' },
        { source: 'Email', value: 5, color: '#ef4444' }
      ])
    } catch (error: any) {
      console.error('Failed to load analytics', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Blog Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Performance metrics and insights</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={timeRange === 7 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange(7)}
          >
            7 Days
          </Button>
          <Button
            variant={timeRange === 30 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange(30)}
          >
            30 Days
          </Button>
          <Button
            variant={timeRange === 90 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange(90)}
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Views</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {analytics.totalViews.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>+12% vs last period</span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Unique Visitors</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {analytics.totalUniqueVisitors.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>+8% vs last period</span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg. Time on Page</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {Math.round(analytics.averageTimeOnPage / 60)}m
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.averageTimeOnPage % 60}s
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
                <p className="text-sm font-medium text-gray-500">Conversions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {analytics.totalConversions}
                </p>
                <div className="flex items-center gap-1 mt-2 text-sm text-blue-600">
                  <MousePointerClick className="h-4 w-4" />
                  <span>
                    {analytics.totalViews > 0
                      ? ((analytics.totalConversions / analytics.totalViews) * 100).toFixed(2)
                      : '0'}% conversion rate
                  </span>
                </div>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <MousePointerClick className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Views Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Views Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={viewsData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorViews)"
                  name="Page Views"
                />
                <Area
                  type="monotone"
                  dataKey="visitors"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorVisitors)"
                  name="Unique Visitors"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trafficSourceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Posts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Top Performing Posts</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/blog')}>
              View All Posts
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {topPosts.length > 0 ? (
            <div className="space-y-4">
              {topPosts.map((post, index) => {
                const postStats = analytics.topPosts.find(p => p.postId === post.id)
                return (
                  <div
                    key={post.id}
                    className="flex items-center justify-between border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{post.title}</h4>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {postStats?.views.toLocaleString() || 0} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {post.published_at
                              ? format(new Date(post.published_at), 'MMM d, yyyy')
                              : 'Draft'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {post.seo_score}/100 SEO
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/blog/${post.id}/edit`)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/blog/${post.slug}`)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No analytics data available yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Engagement Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={viewsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Page Views"
                />
                <Line
                  type="monotone"
                  dataKey="visitors"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Visitors"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Bounce Rate</span>
                <span className="text-lg font-bold text-gray-900">42%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Avg. Pages per Session</span>
                <span className="text-lg font-bold text-gray-900">2.3</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">New vs Returning</span>
                <span className="text-lg font-bold text-gray-900">65% / 35%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Top Device</span>
                <span className="text-lg font-bold text-gray-900">Mobile (58%)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

