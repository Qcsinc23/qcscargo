import { supabase } from '../supabase'
import type { BlogAnalytics } from '../types'
import { logger } from '../logger'

/**
 * Blog Analytics Service
 * Tracks page views, engagement, and conversion metrics
 */
export class BlogAnalyticsService {
  /**
   * Track a page view
   */
  static async trackPageView(
    postId: string,
    options: {
      trafficSource?: string
      referrer?: string
      userAgent?: string
    } = {}
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const trafficSource = options.trafficSource || this.detectTrafficSource(options.referrer || '')

      // Check if analytics entry exists for today
      const { data: existing } = await supabase
        .from('blog_analytics')
        .select('id, page_views, unique_visitors')
        .eq('blog_post_id', postId)
        .eq('date', today)
        .eq('traffic_source', trafficSource)
        .maybeSingle()

      if (existing) {
        // Update existing entry
        await supabase
          .from('blog_analytics')
          .update({
            page_views: (existing.page_views || 0) + 1,
            unique_visitors: (existing.unique_visitors || 0) + 1 // Simplified - would need session tracking for true uniqueness
          })
          .eq('id', existing.id)
      } else {
        // Create new entry
        await supabase.from('blog_analytics').insert({
          blog_post_id: postId,
          date: today,
          page_views: 1,
          unique_visitors: 1,
          traffic_source: trafficSource
        })
      }
    } catch (error: any) {
      logger.error('Error tracking page view', {
        component: 'BlogAnalyticsService',
        action: 'trackPageView',
        postId,
        error: String(error)
      })
      // Don't throw - analytics shouldn't break the user experience
    }
  }

  /**
   * Track time on page
   */
  static async trackTimeOnPage(
    postId: string,
    timeInSeconds: number
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Get or create analytics entry
      const { data: analytics } = await supabase
        .from('blog_analytics')
        .select('id, avg_time_on_page, page_views')
        .eq('blog_post_id', postId)
        .eq('date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (analytics && analytics.avg_time_on_page) {
        // Calculate new average
        const newAvg = Math.round(
          (analytics.avg_time_on_page * (analytics.page_views - 1) + timeInSeconds) /
            analytics.page_views
        )

        await supabase
          .from('blog_analytics')
          .update({ avg_time_on_page: newAvg })
          .eq('id', analytics.id)
      } else if (analytics) {
        // First time tracking for this day
        await supabase
          .from('blog_analytics')
          .update({ avg_time_on_page: Math.round(timeInSeconds) })
          .eq('id', analytics.id)
      }
    } catch (error: any) {
      logger.error('Error tracking time on page', {
        component: 'BlogAnalyticsService',
        action: 'trackTimeOnPage',
        postId,
        error: String(error)
      })
    }
  }

  /**
   * Track conversion event (e.g., quote request from blog)
   */
  static async trackConversion(
    postId: string,
    conversionType: string = 'quote_request'
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]

      const { data: analytics } = await supabase
        .from('blog_analytics')
        .select('id, conversion_events')
        .eq('blog_post_id', postId)
        .eq('date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (analytics) {
        await supabase
          .from('blog_analytics')
          .update({
            conversion_events: (analytics.conversion_events || 0) + 1
          })
          .eq('id', analytics.id)
      } else {
        // Create new entry if doesn't exist
        await supabase.from('blog_analytics').insert({
          blog_post_id: postId,
          date: today,
          conversion_events: 1
        })
      }
    } catch (error: any) {
      logger.error('Error tracking conversion', {
        component: 'BlogAnalyticsService',
        action: 'trackConversion',
        postId,
        conversionType,
        error: String(error)
      })
    }
  }

  /**
   * Get analytics for a blog post
   */
  static async getPostAnalytics(
    postId: string,
    days: number = 30
  ): Promise<BlogAnalytics[]> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await supabase
        .from('blog_analytics')
        .select('*')
        .eq('blog_post_id', postId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false })

      if (error) throw error
      return (data || []) as BlogAnalytics[]
    } catch (error: any) {
      logger.error('Error getting post analytics', {
        component: 'BlogAnalyticsService',
        action: 'getPostAnalytics',
        postId,
        error: String(error)
      })
      return []
    }
  }

  /**
   * Get aggregated analytics across all posts
   */
  static async getAggregatedAnalytics(
    days: number = 30
  ): Promise<{
    totalViews: number
    totalUniqueVisitors: number
    totalConversions: number
    averageTimeOnPage: number
    topPosts: Array<{ postId: string; title: string; views: number }>
  }> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await supabase
        .from('blog_analytics')
        .select(`
          *,
          blog_post:blog_posts(id, title)
        `)
        .gte('date', startDate.toISOString().split('T')[0])

      if (error) throw error

      const analytics = data || []

      // Aggregate totals
      const totalViews = analytics.reduce((sum, a) => sum + (a.page_views || 0), 0)
      const totalUniqueVisitors = analytics.reduce(
        (sum, a) => sum + (a.unique_visitors || 0),
        0
      )
      const totalConversions = analytics.reduce(
        (sum, a) => sum + (a.conversion_events || 0),
        0
      )

      // Calculate average time on page
      const times = analytics
        .map(a => a.avg_time_on_page)
        .filter(t => t !== null && t !== undefined) as number[]
      const averageTimeOnPage =
        times.length > 0 ? times.reduce((sum, t) => sum + t, 0) / times.length : 0

      // Top posts by views
      const postViews = new Map<string, number>()
      analytics.forEach(a => {
        const postId = a.blog_post_id
        const views = a.page_views || 0
        postViews.set(postId, (postViews.get(postId) || 0) + views)
      })

      const topPosts = Array.from(postViews.entries())
        .map(([postId, views]) => {
          const post = analytics.find(a => a.blog_post_id === postId)?.blog_post as any
          return {
            postId,
            title: post?.title || 'Unknown',
            views
          }
        })
        .sort((a, b) => b.views - a.views)
        .slice(0, 10)

      return {
        totalViews,
        totalUniqueVisitors,
        totalConversions,
        averageTimeOnPage: Math.round(averageTimeOnPage),
        topPosts
      }
    } catch (error: any) {
      logger.error('Error getting aggregated analytics', {
        component: 'BlogAnalyticsService',
        action: 'getAggregatedAnalytics',
        error: String(error)
      })
      return {
        totalViews: 0,
        totalUniqueVisitors: 0,
        totalConversions: 0,
        averageTimeOnPage: 0,
        topPosts: []
      }
    }
  }

  /**
   * Detect traffic source from referrer
   */
  private static detectTrafficSource(referrer: string): string {
    if (!referrer) return 'direct'

    const url = new URL(referrer)
    const hostname = url.hostname.toLowerCase()

    // Social media
    if (hostname.includes('facebook') || hostname.includes('fb.com')) return 'facebook'
    if (hostname.includes('twitter') || hostname.includes('x.com')) return 'twitter'
    if (hostname.includes('linkedin')) return 'linkedin'
    if (hostname.includes('instagram')) return 'instagram'

    // Search engines
    if (hostname.includes('google')) return 'google'
    if (hostname.includes('bing')) return 'bing'
    if (hostname.includes('yahoo')) return 'yahoo'

    // Check for UTM parameters
    const utmSource = url.searchParams.get('utm_source')
    if (utmSource) return utmSource

    // External referrer
    return 'referral'
  }
}

