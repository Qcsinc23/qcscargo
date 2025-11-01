import { supabase } from '../supabase'
import { logger } from '../logger'
import { BlogService } from './blog.service'
import { ContentScheduler } from './content-scheduler.service'
import { AutomatedWorkflows } from './automated-workflows.service'
import type { BlogPost } from '../types'

/**
 * Monitoring Service
 * Tracks system health, errors, and performance metrics
 */
export class MonitoringService {
  /**
   * Get system health status
   */
  static async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'critical'
    issues: string[]
    metrics: {
      totalPosts: number
      scheduledPosts: number
      failedGenerations: number
      brokenLinks: number
      avgSeoScore: number
    }
  }> {
    const issues: string[] = []
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy'

    try {
      // Get metrics
      const [
        totalPosts,
        scheduledPosts,
        failedGenerations,
        brokenLinks,
        avgSeoScore
      ] = await Promise.all([
        supabase.from('blog_posts').select('id', { count: 'exact' }).eq('status', 'published'),
        ContentScheduler.getScheduledPosts(),
        supabase
          .from('content_generation_queue')
          .select('id', { count: 'exact' })
          .eq('status', 'failed'),
        AutomatedWorkflows.getWorkflowStats(),
        supabase
          .from('blog_posts')
          .select('seo_score')
          .eq('status', 'published')
          .not('seo_score', 'is', null)
      ])

      const posts = totalPosts.data || []
      const failed = failedGenerations.data || []
      const seoScores = avgSeoScore.data || []

      const avgScore = seoScores.length > 0
        ? seoScores.reduce((sum, p) => sum + (p.seo_score || 0), 0) / seoScores.length
        : 0

      // Check for issues
      if (failed.length > 5) {
        issues.push(`${failed.length} failed content generations`)
        status = 'degraded'
      }

      if (brokenLinks.totalInternalLinks > 0 && brokenLinks.brokenLinks > 10) {
        issues.push(`${brokenLinks.brokenLinks} broken internal links`)
        status = 'degraded'
      }

      if (avgScore < 50) {
        issues.push(`Low average SEO score: ${Math.round(avgScore)}`)
        status = 'degraded'
      }

      if (issues.length > 3) {
        status = 'critical'
      }

      return {
        status,
        issues,
        metrics: {
          totalPosts: posts.length,
          scheduledPosts: scheduledPosts.length,
          failedGenerations: failed.length,
          brokenLinks: brokenLinks.brokenLinks,
          avgSeoScore: Math.round(avgScore)
        }
      }
    } catch (error: any) {
      logger.error('Error getting system health', {
        component: 'MonitoringService',
        action: 'getSystemHealth',
        error: String(error)
      })
      return {
        status: 'critical',
        issues: ['Unable to retrieve system health'],
        metrics: {
          totalPosts: 0,
          scheduledPosts: 0,
          failedGenerations: 0,
          brokenLinks: 0,
          avgSeoScore: 0
        }
      }
    }
  }

  /**
   * Get performance metrics
   */
  static async getPerformanceMetrics(): Promise<{
    averagePageLoad: number
    averageTimeOnPage: number
    bounceRate: number
    conversionRate: number
  }> {
    try {
      // Get analytics data for last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: analytics } = await supabase
        .from('blog_analytics')
        .select('*')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])

      if (!analytics || analytics.length === 0) {
        return {
          averagePageLoad: 0,
          averageTimeOnPage: 0,
          bounceRate: 0,
          conversionRate: 0
        }
      }

      const totalViews = analytics.reduce((sum, a) => sum + (a.page_views || 0), 0)
      const totalConversions = analytics.reduce((sum, a) => sum + (a.conversion_events || 0), 0)
      const totalTime = analytics.reduce((sum, a) => sum + (a.avg_time_on_page || 0), 0)
      const timeCount = analytics.filter(a => a.avg_time_on_page).length

      // Mock bounce rate calculation (would need actual bounce tracking)
      const bounceRate = 42 // Example value

      return {
        averagePageLoad: 1.2, // Mock value - would need real performance tracking
        averageTimeOnPage: timeCount > 0 ? Math.round(totalTime / timeCount) : 0,
        bounceRate,
        conversionRate: totalViews > 0 ? (totalConversions / totalViews) * 100 : 0
      }
    } catch (error: any) {
      logger.error('Error getting performance metrics', {
        component: 'MonitoringService',
        action: 'getPerformanceMetrics',
        error: String(error)
      })
      return {
        averagePageLoad: 0,
        averageTimeOnPage: 0,
        bounceRate: 0,
        conversionRate: 0
      }
    }
  }

  /**
   * Check for alerts (critical issues that need attention)
   */
  static async getAlerts(): Promise<Array<{
    severity: 'critical' | 'warning' | 'info'
    title: string
    message: string
    actionUrl?: string
  }>> {
    const alerts: Array<{
      severity: 'critical' | 'warning' | 'info'
      title: string
      message: string
      actionUrl?: string
    }> = []

    try {
      const health = await this.getSystemHealth()

      // Critical alerts
      if (health.status === 'critical') {
        alerts.push({
          severity: 'critical',
          title: 'System Health Critical',
          message: `Multiple issues detected: ${health.issues.join(', ')}`,
          actionUrl: '/admin/monitoring'
        })
      }

      // Failed generations
      if (health.metrics.failedGenerations > 0) {
        alerts.push({
          severity: health.metrics.failedGenerations > 5 ? 'critical' : 'warning',
          title: 'Failed Content Generations',
          message: `${health.metrics.failedGenerations} content generation(s) failed`,
          actionUrl: '/admin/blog/queue'
        })
      }

      // Broken links
      if (health.metrics.brokenLinks > 10) {
        alerts.push({
          severity: 'warning',
          title: 'Broken Internal Links',
          message: `${health.metrics.brokenLinks} broken internal links detected`,
          actionUrl: '/admin/blog'
        })
      }

      // Low SEO scores
      if (health.metrics.avgSeoScore < 50) {
        alerts.push({
          severity: 'warning',
          title: 'Low SEO Scores',
          message: `Average SEO score is ${health.metrics.avgSeoScore}/100. Consider optimizing content.`,
          actionUrl: '/admin/blog/analytics'
        })
      }

      // Scheduled posts pending
      if (health.metrics.scheduledPosts > 10) {
        alerts.push({
          severity: 'info',
          title: 'Scheduled Posts',
          message: `${health.metrics.scheduledPosts} posts scheduled for publication`,
          actionUrl: '/admin/blog/calendar'
        })
      }

      return alerts
    } catch (error: any) {
      logger.error('Error getting alerts', {
        component: 'MonitoringService',
        action: 'getAlerts',
        error: String(error)
      })
      return []
    }
  }

  /**
   * Get recent activity log
   */
  static async getRecentActivity(limit: number = 20): Promise<Array<{
    type: string
    message: string
    timestamp: string
  }>> {
    try {
      // Get recent posts
      const recentPosts = await BlogService.getPosts({
        status: 'published',
        limit: limit
      })

      return recentPosts.map(post => ({
        type: 'post_published',
        message: `Post "${post.title}" was published`,
        timestamp: post.published_at || post.updated_at
      }))
    } catch (error: any) {
      logger.error('Error getting recent activity', {
        component: 'MonitoringService',
        action: 'getRecentActivity',
        error: String(error)
      })
      return []
    }
  }
}

