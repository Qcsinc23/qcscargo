import { supabase } from '../supabase'
import type { BlogPost } from '../types'
import { logger } from '../logger'
import { BlogService } from './blog.service'
import { ContentQueueService } from './content-queue.service'

/**
 * Content Scheduler Service
 * Manages automated publishing and scheduling of blog posts
 */
export class ContentScheduler {
  /**
   * Schedule a post to be published at a specific time
   */
  static async schedulePost(
    postId: string,
    scheduledFor: Date
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          status: 'scheduled',
          scheduled_for: scheduledFor.toISOString()
        })
        .eq('id', postId)

      if (error) throw error

      logger.info('Post scheduled', {
        component: 'ContentScheduler',
        action: 'schedulePost',
        postId,
        scheduledFor: scheduledFor.toISOString()
      })
    } catch (error: any) {
      logger.error('Error scheduling post', {
        component: 'ContentScheduler',
        action: 'schedulePost',
        postId,
        error: String(error)
      })
      throw error
    }
  }

  /**
   * Unschedule a post (change back to draft)
   */
  static async unschedulePost(postId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          status: 'draft',
          scheduled_for: null
        })
        .eq('id', postId)

      if (error) throw error
    } catch (error: any) {
      logger.error('Error unscheduling post', {
        component: 'ContentScheduler',
        action: 'unschedulePost',
        postId,
        error: String(error)
      })
      throw error
    }
  }

  /**
   * Publish a scheduled post immediately
   */
  static async publishScheduledPost(postId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          scheduled_for: null
        })
        .eq('id', postId)

      if (error) throw error

      logger.info('Scheduled post published', {
        component: 'ContentScheduler',
        action: 'publishScheduledPost',
        postId
      })
    } catch (error: any) {
      logger.error('Error publishing scheduled post', {
        component: 'ContentScheduler',
        action: 'publishScheduledPost',
        postId,
        error: String(error)
      })
      throw error
    }
  }

  /**
   * Process all scheduled posts that are due for publication
   * This should be called by a cron job or scheduled function
   */
  static async processScheduledPosts(): Promise<{
    published: number
    failed: number
    errors: string[]
  }> {
    const results = {
      published: 0,
      failed: 0,
      errors: [] as string[]
    }

    try {
      const now = new Date().toISOString()

      // Get all posts scheduled for publication
      const { data: scheduledPosts, error: fetchError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'scheduled')
        .not('scheduled_for', 'is', null)
        .lte('scheduled_for', now)

      if (fetchError) throw fetchError

      if (!scheduledPosts || scheduledPosts.length === 0) {
        return results
      }

      logger.info('Processing scheduled posts', {
        component: 'ContentScheduler',
        action: 'processScheduledPosts',
        count: scheduledPosts.length
      })

      // Publish each scheduled post
      for (const post of scheduledPosts) {
        try {
          await this.publishScheduledPost(post.id)
          results.published++
        } catch (error: any) {
          results.failed++
          results.errors.push(`Failed to publish post ${post.id}: ${error.message}`)
          logger.error('Failed to publish scheduled post', {
            component: 'ContentScheduler',
            action: 'processScheduledPosts',
            postId: post.id,
            error: String(error)
          })
        }
      }

      return results
    } catch (error: any) {
      logger.error('Error processing scheduled posts', {
        component: 'ContentScheduler',
        action: 'processScheduledPosts',
        error: String(error)
      })
      throw error
    }
  }

  /**
   * Get all scheduled posts with their scheduled times
   */
  static async getScheduledPosts(): Promise<BlogPost[]> {
    try {
      const posts = await BlogService.getPosts({
        status: 'scheduled',
        limit: 100
      })

      // Filter to only include posts with scheduled_for
      return posts.filter(post => post.scheduled_for)
    } catch (error: any) {
      logger.error('Error getting scheduled posts', {
        component: 'ContentScheduler',
        action: 'getScheduledPosts',
        error: String(error)
      })
      return []
    }
  }

  /**
   * Get upcoming scheduled posts (next 7 days)
   */
  static async getUpcomingPosts(days: number = 7): Promise<BlogPost[]> {
    try {
      const now = new Date()
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + days)

      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'scheduled')
        .not('scheduled_for', 'is', null)
        .gte('scheduled_for', now.toISOString())
        .lte('scheduled_for', futureDate.toISOString())
        .order('scheduled_for', { ascending: true })

      if (error) throw error

      return (data || []) as BlogPost[]
    } catch (error: any) {
      logger.error('Error getting upcoming posts', {
        component: 'ContentScheduler',
        action: 'getUpcomingPosts',
        error: String(error)
      })
      return []
    }
  }

  /**
   * Schedule content generation and auto-publish
   */
  static async scheduleContentGeneration(
    keyword: string,
    scheduledFor: Date,
    options: {
      priority?: number
      autoPublish?: boolean
      targetLocation?: string
      targetService?: string
    } = {}
  ): Promise<string> {
    try {
      // Add to queue with scheduled time
      const queueItem = await ContentQueueService.queueContentGeneration(
        keyword,
        'blog-post',
        {
          priority: options.priority || 5,
          scheduledFor: scheduledFor.toISOString(),
          targetLocation: options.targetLocation,
          targetService: options.targetService
        }
      )

      // If auto-publish is enabled, process and publish when ready
      if (options.autoPublish) {
        // Process immediately if scheduled for now or past
        if (scheduledFor <= new Date()) {
          await ContentQueueService.processQueueItem(queueItem.id)
          
          // Wait a bit for generation
          await new Promise(resolve => setTimeout(resolve, 5000))
          
          // Auto-publish if generation succeeded
          try {
            await ContentQueueService.autoPublishGeneratedContent(queueItem.id)
          } catch (error) {
            // If generation failed, the post will remain in review
            logger.warn('Auto-publish failed, content in review', {
              component: 'ContentScheduler',
              queueItemId: queueItem.id
            })
          }
        }
      }

      return queueItem.id
    } catch (error: any) {
      logger.error('Error scheduling content generation', {
        component: 'ContentScheduler',
        action: 'scheduleContentGeneration',
        keyword,
        error: String(error)
      })
      throw error
    }
  }

  /**
   * Get scheduling statistics
   */
  static async getSchedulingStats(): Promise<{
    scheduled: number
    publishedToday: number
    publishingToday: number
    publishingThisWeek: number
  }> {
    try {
      const now = new Date()
      const startOfDay = new Date(now.setHours(0, 0, 0, 0))
      const endOfDay = new Date(now.setHours(23, 59, 59, 999))
      const endOfWeek = new Date()
      endOfWeek.setDate(endOfWeek.getDate() + 7)

      const [scheduledPosts, publishedToday, publishingToday, publishingThisWeek] = await Promise.all([
        this.getScheduledPosts(),
        supabase
          .from('blog_posts')
          .select('id')
          .eq('status', 'published')
          .gte('published_at', startOfDay.toISOString())
          .lte('published_at', endOfDay.toISOString()),
        supabase
          .from('blog_posts')
          .select('id')
          .eq('status', 'scheduled')
          .not('scheduled_for', 'is', null)
          .gte('scheduled_for', startOfDay.toISOString())
          .lte('scheduled_for', endOfDay.toISOString()),
        supabase
          .from('blog_posts')
          .select('id')
          .eq('status', 'scheduled')
          .not('scheduled_for', 'is', null)
          .gte('scheduled_for', startOfDay.toISOString())
          .lte('scheduled_for', endOfWeek.toISOString())
      ])

      return {
        scheduled: scheduledPosts.length,
        publishedToday: publishedToday.data?.length || 0,
        publishingToday: publishingToday.data?.length || 0,
        publishingThisWeek: publishingThisWeek.data?.length || 0
      }
    } catch (error: any) {
      logger.error('Error getting scheduling stats', {
        component: 'ContentScheduler',
        action: 'getSchedulingStats',
        error: String(error)
      })
      return {
        scheduled: 0,
        publishedToday: 0,
        publishingToday: 0,
        publishingThisWeek: 0
      }
    }
  }
}

