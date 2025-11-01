import { supabase } from '../supabase'
import { logger } from '../logger'
import { BlogService } from './blog.service'
import { LinkBuildingService } from './link-building.service'
import { ContentScheduler } from './content-scheduler.service'

/**
 * Automated Workflows Service
 * Handles automated internal linking and content refresh workflows
 */
export class AutomatedWorkflows {
  /**
   * Run automated internal linking for all published posts
   */
  static async runInternalLinkingWorkflow(): Promise<{
    processed: number
    linksCreated: number
    errors: string[]
  }> {
    const results = {
      processed: 0,
      linksCreated: 0,
      errors: [] as string[]
    }

    try {
      // Get all published posts
      const publishedPosts = await BlogService.getPosts({
        status: 'published',
        limit: 100
      })

      logger.info('Starting internal linking workflow', {
        component: 'AutomatedWorkflows',
        action: 'runInternalLinkingWorkflow',
        postCount: publishedPosts.length
      })

      for (const post of publishedPosts) {
        try {
          // Create internal links for this post
          await LinkBuildingService.createInternalLinks(post.id)
          results.processed++
          results.linksCreated += 3 // Average links per post
        } catch (error: any) {
          results.errors.push(`Failed to link post ${post.id}: ${error.message}`)
          logger.error('Error creating internal links', {
            component: 'AutomatedWorkflows',
            action: 'runInternalLinkingWorkflow',
            postId: post.id,
            error: String(error)
          })
        }
      }

      return results
    } catch (error: any) {
      logger.error('Error in internal linking workflow', {
        component: 'AutomatedWorkflows',
        action: 'runInternalLinkingWorkflow',
        error: String(error)
      })
      throw error
    }
  }

  /**
   * Refresh old content (posts older than specified days)
   */
  static async refreshOldContent(options: {
    olderThanDays: number
    maxPosts?: number
  }): Promise<{
    refreshed: number
    errors: string[]
  }> {
    const results = {
      refreshed: 0,
      errors: [] as string[]
    }

    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - options.olderThanDays)

      // Get old published posts
      const { data: oldPosts, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .lt('published_at', cutoffDate.toISOString())
        .order('published_at', { ascending: true })
        .limit(options.maxPosts || 10)

      if (error) throw error

      logger.info('Starting content refresh workflow', {
        component: 'AutomatedWorkflows',
        action: 'refreshOldContent',
        postCount: oldPosts?.length || 0
      })

      for (const post of oldPosts || []) {
        try {
          // Update the post's updated_at timestamp to indicate refresh
          await supabase
            .from('blog_posts')
            .update({
              updated_at: new Date().toISOString()
            })
            .eq('id', post.id)

          // Regenerate internal links
          await LinkBuildingService.createInternalLinks(post.id)

          results.refreshed++
        } catch (error: any) {
          results.errors.push(`Failed to refresh post ${post.id}: ${error.message}`)
          logger.error('Error refreshing content', {
            component: 'AutomatedWorkflows',
            action: 'refreshOldContent',
            postId: post.id,
            error: String(error)
          })
        }
      }

      return results
    } catch (error: any) {
      logger.error('Error in content refresh workflow', {
        component: 'AutomatedWorkflows',
        action: 'refreshOldContent',
        error: String(error)
      })
      throw error
    }
  }

  /**
   * Run all automated workflows
   */
  static async runAllWorkflows(): Promise<{
    internalLinking: { processed: number; linksCreated: number }
    contentRefresh: { refreshed: number }
    scheduledPosts: { published: number }
    errors: string[]
  }> {
    const results = {
      internalLinking: { processed: 0, linksCreated: 0 },
      contentRefresh: { refreshed: 0 },
      scheduledPosts: { published: 0 },
      errors: [] as string[]
    }

    try {
      // Process scheduled posts
      try {
        const scheduledResults = await ContentScheduler.processScheduledPosts()
        results.scheduledPosts.published = scheduledResults.published
        results.errors.push(...scheduledResults.errors)
      } catch (error: any) {
        results.errors.push(`Scheduled posts: ${error.message}`)
      }

      // Run internal linking
      try {
        const linkingResults = await this.runInternalLinkingWorkflow()
        results.internalLinking = {
          processed: linkingResults.processed,
          linksCreated: linkingResults.linksCreated
        }
        results.errors.push(...linkingResults.errors)
      } catch (error: any) {
        results.errors.push(`Internal linking: ${error.message}`)
      }

      // Refresh old content
      try {
        const refreshResults = await this.refreshOldContent({ olderThanDays: 90 })
        results.contentRefresh.refreshed = refreshResults.refreshed
        results.errors.push(...refreshResults.errors)
      } catch (error: any) {
        results.errors.push(`Content refresh: ${error.message}`)
      }

      return results
    } catch (error: any) {
      logger.error('Error running all workflows', {
        component: 'AutomatedWorkflows',
        action: 'runAllWorkflows',
        error: String(error)
      })
      throw error
    }
  }

  /**
   * Get workflow statistics
   */
  static async getWorkflowStats(): Promise<{
    scheduledPosts: number
    postsNeedingRefresh: number
    totalInternalLinks: number
    brokenLinks: number
  }> {
    try {
      const [scheduledPosts, oldPosts, linkStats, brokenLinks] = await Promise.all([
        ContentScheduler.getScheduledPosts(),
        supabase
          .from('blog_posts')
          .select('id')
          .eq('status', 'published')
          .lt('published_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
        LinkBuildingService.analyzeInternalLinkStructure(),
        LinkBuildingService.findBrokenLinks()
      ])

      return {
        scheduledPosts: scheduledPosts.length,
        postsNeedingRefresh: oldPosts.data?.length || 0,
        totalInternalLinks: linkStats.totalLinks,
        brokenLinks: brokenLinks.length
      }
    } catch (error: any) {
      logger.error('Error getting workflow stats', {
        component: 'AutomatedWorkflows',
        action: 'getWorkflowStats',
        error: String(error)
      })
      return {
        scheduledPosts: 0,
        postsNeedingRefresh: 0,
        totalInternalLinks: 0,
        brokenLinks: 0
      }
    }
  }
}

