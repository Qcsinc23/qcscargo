import { supabase } from '../supabase'
import type { BlogPost, InternalLink } from '../types'
import { logger } from '../logger'

/**
 * Link Building Service
 * Automatically creates strategic internal links between related posts
 */
export class LinkBuildingService {
  /**
   * Automatically create internal links for a blog post
   */
  static async createInternalLinks(postId: string): Promise<void> {
    try {
      // Get the current post
      const post = await this.getPostById(postId)
      if (!post) return

      // Find related posts based on keywords, categories, and services
      const relatedPosts = await this.findRelatedPosts(post)

      // Extract text content for link insertion
      const contentText = this.extractTextFromContent(post.content)

      // Create links for each related post
      for (const relatedPost of relatedPosts.slice(0, 5)) {
        // Find natural anchor text opportunities
        const anchorOpportunities = this.findAnchorTextOpportunities(
          contentText,
          relatedPost
        )

        for (const opportunity of anchorOpportunities.slice(0, 2)) {
          // Check if link already exists
          const existingLink = await this.checkExistingLink(postId, relatedPost.id, opportunity.anchorText)
          
          if (!existingLink) {
            await supabase.from('internal_links').insert({
              source_post_id: postId,
              target_post_id: relatedPost.id,
              anchor_text: opportunity.anchorText,
              link_context: opportunity.context
            })
          }
        }
      }
    } catch (error: any) {
      logger.error('Error creating internal links', {
        component: 'LinkBuildingService',
        action: 'createInternalLinks',
        postId,
        error: String(error)
      })
    }
  }

  /**
   * Find related posts based on keywords, categories, and target services
   */
  private static async findRelatedPosts(post: BlogPost): Promise<BlogPost[]> {
    try {
      // Build query to find related posts
      let query = supabase
        .from('blog_posts')
        .select('*')
        .neq('id', post.id)
        .eq('status', 'published')

      // Find posts with matching target services
      if (post.target_services && post.target_services.length > 0) {
        query = query.overlaps('target_services', post.target_services)
      }

      // Find posts with matching target locations
      if (post.target_locations && post.target_locations.length > 0) {
        query = query.overlaps('target_locations', post.target_locations)
      }

      const { data, error } = await query
        .order('published_at', { ascending: false })
        .limit(10)

      if (error) throw error

      // Also find posts by category match
      if (post.categories && post.categories.length > 0) {
        const categoryIds = post.categories.map(c => c.id)
        
        const { data: categoryPosts } = await supabase
          .from('blog_posts')
          .select(`
            *,
            blog_post_categories!inner(category_id)
          `)
          .neq('id', post.id)
          .eq('status', 'published')
          .in('blog_post_categories.category_id', categoryIds)
          .order('published_at', { ascending: false })
          .limit(5)

        // Combine and deduplicate
        const allPosts = [...(data || []), ...(categoryPosts || [])]
        const uniquePosts = Array.from(
          new Map(allPosts.map(p => [p.id, p])).values()
        )

        return uniquePosts.slice(0, 10) as BlogPost[]
      }

      return (data || []) as BlogPost[]
    } catch (error: any) {
      logger.error('Error finding related posts', {
        component: 'LinkBuildingService',
        action: 'findRelatedPosts',
        postId: post.id,
        error: String(error)
      })
      return []
    }
  }

  /**
   * Find natural anchor text opportunities in content
   */
  private static findAnchorTextOpportunities(
    contentText: string,
    targetPost: BlogPost
  ): Array<{ anchorText: string; context: string }> {
    const opportunities: Array<{ anchorText: string; context: string }> = []

    // Extract keywords from target post
    const targetKeywords = [
      targetPost.title.toLowerCase(),
      targetPost.focus_keyword.toLowerCase(),
      ...(targetPost.target_services || []),
      ...(targetPost.target_locations || [])
    ]

    // Split content into sentences
    const sentences = contentText.split(/[.!?]+/).filter(s => s.trim().length > 0)

    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase()

      // Check for keyword matches
      for (const keyword of targetKeywords) {
        if (lowerSentence.includes(keyword)) {
          // Find the phrase containing the keyword
          const words = sentence.split(/\s+/)
          const keywordIndex = words.findIndex(w =>
            w.toLowerCase().includes(keyword)
          )

          if (keywordIndex >= 0) {
            // Extract context (surrounding words)
            const start = Math.max(0, keywordIndex - 5)
            const end = Math.min(words.length, keywordIndex + 5)
            const contextWords = words.slice(start, end)
            const context = contextWords.join(' ')

            // Use keyword as anchor or a nearby phrase
            const anchorText = keyword.length > 3 ? keyword : targetPost.title

            opportunities.push({
              anchorText,
              context: context.substring(0, 150)
            })
          }
        }
      }
    }

    return opportunities.slice(0, 5)
  }

  /**
   * Extract plain text from content blocks
   */
  private static extractTextFromContent(content: any[]): string {
    return content
      .filter(block => block.type === 'paragraph' || block.type === 'heading')
      .map(block => block.text || '')
      .join(' ')
  }

  /**
   * Get post by ID
   */
  private static async getPostById(postId: string): Promise<BlogPost | null> {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_post_categories(
            category:blog_categories(*)
          )
        `)
        .eq('id', postId)
        .single()

      if (error) throw error

      return {
        ...data,
        categories: (data.blog_post_categories || []).map((pc: any) => pc.category)
      } as BlogPost
    } catch (error: any) {
      logger.error('Error getting post by ID', {
        component: 'LinkBuildingService',
        action: 'getPostById',
        postId,
        error: String(error)
      })
      return null
    }
  }

  /**
   * Check if an internal link already exists
   */
  private static async checkExistingLink(
    sourcePostId: string,
    targetPostId: string,
    anchorText: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('internal_links')
        .select('id')
        .eq('source_post_id', sourcePostId)
        .eq('target_post_id', targetPostId)
        .eq('anchor_text', anchorText)
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return !!data
    } catch {
      return false
    }
  }

  /**
   * Analyze internal link structure
   */
  static async analyzeInternalLinkStructure(): Promise<{
    totalLinks: number
    postsWithLinks: number
    postsWithoutLinks: number
    averageLinksPerPost: number
  }> {
    try {
      const { data: links, error: linksError } = await supabase
        .from('internal_links')
        .select('source_post_id')

      if (linksError) throw linksError

      const { data: posts, error: postsError } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('status', 'published')

      if (postsError) throw postsError

      const postsWithLinks = new Set(links?.map(l => l.source_post_id) || [])
      const postsWithoutLinks = (posts?.length || 0) - postsWithLinks.size

      return {
        totalLinks: links?.length || 0,
        postsWithLinks: postsWithLinks.size,
        postsWithoutLinks,
        averageLinksPerPost:
          postsWithLinks.size > 0
            ? (links?.length || 0) / postsWithLinks.size
            : 0
      }
    } catch (error: any) {
      logger.error('Error analyzing internal link structure', {
        component: 'LinkBuildingService',
        action: 'analyzeInternalLinkStructure',
        error: String(error)
      })
      return {
        totalLinks: 0,
        postsWithLinks: 0,
        postsWithoutLinks: 0,
        averageLinksPerPost: 0
      }
    }
  }

  /**
   * Suggest internal links for a post
   */
  static async suggestInternalLinks(postId: string): Promise<
    Array<{
      targetPostId: string
      targetPostTitle: string
      anchorText: string
      relevanceScore: number
    }>
  > {
    try {
      const post = await this.getPostById(postId)
      if (!post) return []

      const relatedPosts = await this.findRelatedPosts(post)
      const suggestions = []

      for (const relatedPost of relatedPosts) {
        const relevanceScore = this.calculateRelevanceScore(post, relatedPost)
        const anchorText = this.suggestAnchorText(post, relatedPost)

        suggestions.push({
          targetPostId: relatedPost.id,
          targetPostTitle: relatedPost.title,
          anchorText,
          relevanceScore
        })
      }

      return suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 10)
    } catch (error: any) {
      logger.error('Error suggesting internal links', {
        component: 'LinkBuildingService',
        action: 'suggestInternalLinks',
        postId,
        error: String(error)
      })
      return []
    }
  }

  /**
   * Calculate relevance score between two posts
   */
  private static calculateRelevanceScore(post1: BlogPost, post2: BlogPost): number {
    let score = 0

    // Category match (40 points)
    const category1Ids = new Set(post1.categories?.map(c => c.id) || [])
    const category2Ids = new Set(post2.categories?.map(c => c.id) || [])
    const categoryOverlap = [...category1Ids].filter(id => category2Ids.has(id)).length
    score += (categoryOverlap / Math.max(category1Ids.size, category2Ids.size, 1)) * 40

    // Service match (30 points)
    const serviceOverlap = post1.target_services.filter(s =>
      post2.target_services.includes(s)
    ).length
    score += (serviceOverlap / Math.max(post1.target_services.length, post2.target_services.length, 1)) * 30

    // Location match (20 points)
    const locationOverlap = post1.target_locations.filter(l =>
      post2.target_locations.includes(l)
    ).length
    score += (locationOverlap / Math.max(post1.target_locations.length, post2.target_locations.length, 1)) * 20

    // Keyword similarity (10 points)
    if (post1.focus_keyword && post2.focus_keyword) {
      const words1 = new Set(post1.focus_keyword.toLowerCase().split(/\s+/))
      const words2 = new Set(post2.focus_keyword.toLowerCase().split(/\s+/))
      const keywordOverlap = [...words1].filter(w => words2.has(w)).length
      score += (keywordOverlap / Math.max(words1.size, words2.size, 1)) * 10
    }

    return Math.min(100, Math.round(score))
  }

  /**
   * Suggest anchor text for linking
   */
  private static suggestAnchorText(sourcePost: BlogPost, targetPost: BlogPost): string {
    // Prefer using target post's focus keyword if it's relevant
    if (targetPost.focus_keyword) {
      return targetPost.focus_keyword
    }

    // Fall back to post title (first few words)
    const titleWords = targetPost.title.split(/\s+/).slice(0, 5)
    return titleWords.join(' ')
  }

  /**
   * Find broken internal links
   */
  static async findBrokenLinks(): Promise<
    Array<{
      sourcePostId: string
      sourcePostTitle: string
      targetPostId: string
      anchorText: string
    }>
  > {
    try {
      const { data: links, error } = await supabase
        .from('internal_links')
        .select(`
          source_post_id,
          target_post_id,
          anchor_text,
          source:blog_posts!internal_links_source_post_id_fkey(title),
          target:blog_posts!internal_links_target_post_id_fkey(id)
        `)

      if (error) throw error

      const brokenLinks = []

      for (const link of links || []) {
        // Check if target post still exists and is published
        if (!link.target) {
          brokenLinks.push({
            sourcePostId: link.source_post_id,
            sourcePostTitle: (link.source as any)?.title || 'Unknown',
            targetPostId: link.target_post_id,
            anchorText: link.anchor_text
          })
        }
      }

      return brokenLinks
    } catch (error: any) {
      logger.error('Error finding broken links', {
        component: 'LinkBuildingService',
        action: 'findBrokenLinks',
        error: String(error)
      })
      return []
    }
  }
}

