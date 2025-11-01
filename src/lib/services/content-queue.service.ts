import { supabase } from '../supabase'
import type { ContentGenerationQueue, ContentType } from '../types'
import { logger } from '../logger'
import { SEOContentGenerator } from './seo-content-generator.service'
import { BlogService } from './blog.service'
import { LinkBuildingService } from './link-building.service'

/**
 * Content Generation Queue Service
 * Manages queued blog post generation and processing
 */
export class ContentQueueService {
  /**
   * Add a new content generation job to the queue
   */
  static async queueContentGeneration(
    targetKeyword: string,
    contentType: ContentType = 'blog-post',
    options: {
      priority?: number
      scheduledFor?: string
      targetLocation?: string
      targetService?: string
      searchIntent?: 'informational' | 'commercial' | 'transactional' | 'navigational'
    } = {}
  ): Promise<ContentGenerationQueue> {
    try {
      const { data, error } = await supabase
        .from('content_generation_queue')
        .insert({
          target_keyword: targetKeyword,
          content_type: contentType,
          priority: options.priority || 5,
          status: 'pending',
          scheduled_for: options.scheduledFor || null
        })
        .select()
        .single()

      if (error) throw error

      return data as ContentGenerationQueue
    } catch (error: any) {
      logger.error('Error queuing content generation', {
        component: 'ContentQueueService',
        action: 'queueContentGeneration',
        targetKeyword,
        error: String(error)
      })
      throw error
    }
  }

  /**
   * Process a queued content generation job
   */
  static async processQueueItem(queueItemId: string): Promise<void> {
    try {
      // Get queue item
      const { data: queueItem, error: fetchError } = await supabase
        .from('content_generation_queue')
        .select('*')
        .eq('id', queueItemId)
        .single()

      if (fetchError) throw fetchError
      if (!queueItem) throw new Error('Queue item not found')
      if (queueItem.status !== 'pending') {
        throw new Error(`Queue item is not pending (status: ${queueItem.status})`)
      }

      // Update status to generating
      await supabase
        .from('content_generation_queue')
        .update({ status: 'generating' })
        .eq('id', queueItemId)

      // Generate content using AI
      const generatedContent = await SEOContentGenerator.generateWithSEOOptimization({
        targetKeyword: queueItem.target_keyword,
        relatedKeywords: [],
        targetLocation: 'New Jersey',
        targetService: 'air-cargo',
        contentType: queueItem.content_type,
        tone: 'professional',
        wordCount: 2500,
        includeSchema: true
      } as any)

      // Save generated content to queue item
      await supabase
        .from('content_generation_queue')
        .update({
          status: 'review',
          generated_content: generatedContent as any,
          generation_prompt: `Generate SEO-optimized ${queueItem.content_type} for keyword: ${queueItem.target_keyword}`
        })
        .eq('id', queueItemId)

      logger.info('Content generation completed', {
        component: 'ContentQueueService',
        action: 'processQueueItem',
        queueItemId,
        seoScore: generatedContent.seoScore
      })
    } catch (error: any) {
      logger.error('Error processing queue item', {
        component: 'ContentQueueService',
        action: 'processQueueItem',
        queueItemId,
        error: String(error)
      })

      // Update status to failed
      await supabase
        .from('content_generation_queue')
        .update({
          status: 'failed',
          error_message: error.message || 'Unknown error occurred'
        })
        .eq('id', queueItemId)

      throw error
    }
  }

  /**
   * Auto-publish generated content (skip review)
   */
  static async autoPublishGeneratedContent(queueItemId: string): Promise<string> {
    try {
      // Get queue item with generated content
      const { data: queueItem, error: fetchError } = await supabase
        .from('content_generation_queue')
        .select('*')
        .eq('id', queueItemId)
        .single()

      if (fetchError) throw fetchError
      if (!queueItem) throw new Error('Queue item not found')
      if (!queueItem.generated_content) {
        throw new Error('No generated content found')
      }

      const generated = queueItem.generated_content as any

      // Create blog post from generated content
      const blogPost = await BlogService.createPost({
        title: generated.title,
        slug: generated.slug,
        meta_title: generated.metaTitle,
        meta_description: generated.metaDescription,
        content: generated.content,
        excerpt: generated.excerpt,
        focus_keyword: generated.focusKeyword,
        status: 'published',
        published_at: new Date().toISOString(),
        seo_score: generated.seoScore || 0,
        readability_score: generated.readabilityScore || 0,
        target_locations: generated.targetLocations || ['New Jersey', 'Caribbean'],
        target_services: generated.targetServices || ['air-cargo'],
        schema_markup: generated.schemaMarkup || {}
      } as any)

      // Create internal links
      await LinkBuildingService.createInternalLinks(blogPost.id)

      // Update queue item status
      await supabase
        .from('content_generation_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', queueItemId)

      return blogPost.id
    } catch (error: any) {
      logger.error('Error auto-publishing content', {
        component: 'ContentQueueService',
        action: 'autoPublishGeneratedContent',
        queueItemId,
        error: String(error)
      })
      throw error
    }
  }

  /**
   * Get all queued items
   */
  static async getQueueItems(
    options: {
      status?: ContentGenerationQueue['status']
      limit?: number
      offset?: number
    } = {}
  ): Promise<ContentGenerationQueue[]> {
    try {
      let query = supabase
        .from('content_generation_queue')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })

      if (options.status) {
        query = query.eq('status', options.status)
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) throw error
      return (data || []) as ContentGenerationQueue[]
    } catch (error: any) {
      logger.error('Error fetching queue items', {
        component: 'ContentQueueService',
        action: 'getQueueItems',
        error: String(error)
      })
      return []
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<{
    pending: number
    generating: number
    review: number
    completed: number
    failed: number
    total: number
  }> {
    try {
      const { data, error } = await supabase
        .from('content_generation_queue')
        .select('status')

      if (error) throw error

      const stats = {
        pending: 0,
        generating: 0,
        review: 0,
        completed: 0,
        failed: 0,
        total: 0
      }

      data?.forEach(item => {
        stats[item.status as keyof typeof stats]++
        stats.total++
      })

      return stats
    } catch (error: any) {
      logger.error('Error getting queue stats', {
        component: 'ContentQueueService',
        action: 'getQueueStats',
        error: String(error)
      })
      return {
        pending: 0,
        generating: 0,
        review: 0,
        completed: 0,
        failed: 0,
        total: 0
      }
    }
  }

  /**
   * Delete a queue item
   */
  static async deleteQueueItem(queueItemId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('content_generation_queue')
        .delete()
        .eq('id', queueItemId)

      if (error) throw error
    } catch (error: any) {
      logger.error('Error deleting queue item', {
        component: 'ContentQueueService',
        action: 'deleteQueueItem',
        queueItemId,
        error: String(error)
      })
      throw error
    }
  }

  /**
   * Retry a failed queue item
   */
  static async retryQueueItem(queueItemId: string): Promise<void> {
    try {
      // Reset status to pending
      await supabase
        .from('content_generation_queue')
        .update({
          status: 'pending',
          error_message: null
        })
        .eq('id', queueItemId)

      // Process immediately
      await this.processQueueItem(queueItemId)
    } catch (error: any) {
      logger.error('Error retrying queue item', {
        component: 'ContentQueueService',
        action: 'retryQueueItem',
        queueItemId,
        error: String(error)
      })
      throw error
    }
  }

  /**
   * Cancel a queued item
   */
  static async cancelQueueItem(queueItemId: string): Promise<void> {
    try {
      const { data: queueItem } = await supabase
        .from('content_generation_queue')
        .select('status')
        .eq('id', queueItemId)
        .single()

      if (queueItem?.status === 'generating') {
        throw new Error('Cannot cancel item that is currently generating')
      }

      await supabase
        .from('content_generation_queue')
        .delete()
        .eq('id', queueItemId)
    } catch (error: any) {
      logger.error('Error canceling queue item', {
        component: 'ContentQueueService',
        action: 'cancelQueueItem',
        queueItemId,
        error: String(error)
      })
      throw error
    }
  }
}

