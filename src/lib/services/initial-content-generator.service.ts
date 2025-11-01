import { ContentQueueService } from './content-queue.service'
import { KeywordResearch } from './keyword-research.service'
import { supabase } from '../supabase'
import { logger } from '../logger'

/**
 * Initial Content Generator Service
 * Generates initial high-priority blog posts for launch
 */
export class InitialContentGenerator {
  /**
   * Priority keywords for NJ Caribbean logistics domination
   */
  private static readonly PRIORITY_KEYWORDS = [
    {
      keyword: 'air cargo shipping New Jersey',
      priority: 10,
      targetLocation: 'New Jersey',
      targetService: 'air-cargo'
    },
    {
      keyword: 'package forwarding New Jersey Caribbean',
      priority: 10,
      targetLocation: 'New Jersey',
      targetService: 'package-forwarding'
    },
    {
      keyword: 'shipping to Jamaica from New Jersey',
      priority: 9,
      targetLocation: 'Jamaica',
      targetService: 'air-cargo'
    },
    {
      keyword: 'shipping to Haiti from New Jersey',
      priority: 9,
      targetLocation: 'Haiti',
      targetService: 'air-cargo'
    },
    {
      keyword: 'express air cargo New Jersey',
      priority: 8,
      targetLocation: 'New Jersey',
      targetService: 'express-shipping'
    },
    {
      keyword: 'international shipping New Jersey',
      priority: 8,
      targetLocation: 'New Jersey',
      targetService: 'freight-forwarding'
    },
    {
      keyword: 'caribbean shipping services New Jersey',
      priority: 9,
      targetLocation: 'Caribbean',
      targetService: 'air-cargo'
    },
    {
      keyword: 'customs brokerage New Jersey',
      priority: 7,
      targetLocation: 'New Jersey',
      targetService: 'customs-brokerage'
    },
    {
      keyword: 'airport cargo services Newark',
      priority: 8,
      targetLocation: 'Newark',
      targetService: 'air-cargo'
    },
    {
      keyword: 'same day shipping New Jersey',
      priority: 7,
      targetLocation: 'New Jersey',
      targetService: 'express-shipping'
    }
  ]

  /**
   * Generate all initial blog posts
   */
  static async generateInitialPosts(): Promise<{
    queued: number
    errors: string[]
  }> {
    const results = {
      queued: 0,
      errors: [] as string[]
    }

    try {
      logger.info('Starting initial blog post generation', {
        component: 'InitialContentGenerator',
        action: 'generateInitialPosts',
        keywordCount: this.PRIORITY_KEYWORDS.length
      })

      for (const keywordConfig of this.PRIORITY_KEYWORDS) {
        try {
          // Queue content generation
          await ContentQueueService.queueContentGeneration(
            keywordConfig.keyword,
            'blog-post',
            {
              priority: keywordConfig.priority,
              targetLocation: keywordConfig.targetLocation,
              targetService: keywordConfig.targetService
            }
          )
          
          results.queued++
          
          logger.info('Queued keyword for generation', {
            component: 'InitialContentGenerator',
            keyword: keywordConfig.keyword
          })
        } catch (error: any) {
          results.errors.push(`Failed to queue ${keywordConfig.keyword}: ${error.message}`)
          logger.error('Error queueing keyword', {
            component: 'InitialContentGenerator',
            keyword: keywordConfig.keyword,
            error: String(error)
          })
        }
      }

      return results
    } catch (error: any) {
      logger.error('Error generating initial posts', {
        component: 'InitialContentGenerator',
        action: 'generateInitialPosts',
        error: String(error)
      })
      throw error
    }
  }

  /**
   * Generate and auto-publish initial posts immediately
   */
  static async generateAndPublishInitialPosts(): Promise<{
    published: number
    errors: string[]
  }> {
    const results = {
      published: 0,
      errors: [] as string[]
    }

    try {
      // First, queue all posts
      const queueResults = await this.generateInitialPosts()

      // Wait a bit for queue to process
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Get all queued items
      const queueItems = await ContentQueueService.getQueueItems({
        status: 'pending',
        limit: 20
      })

      // Process and auto-publish each
      for (const item of queueItems) {
        try {
          // Process the generation
          await ContentQueueService.processQueueItem(item.id)

          // Wait for generation
          await new Promise(resolve => setTimeout(resolve, 5000))

          // Auto-publish
          await ContentQueueService.autoPublishGeneratedContent(item.id)
          results.published++
        } catch (error: any) {
          results.errors.push(`Failed to publish ${item.target_keyword}: ${error.message}`)
        }
      }

      return results
    } catch (error: any) {
      logger.error('Error generating and publishing initial posts', {
        component: 'InitialContentGenerator',
        action: 'generateAndPublishInitialPosts',
        error: String(error)
      })
      throw error
    }
  }
}

