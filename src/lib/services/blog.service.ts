import { supabase } from '../supabase'
import type { BlogPost, BlogCategory, BlogTag, BlogPostStatus } from '../types'
import { logger } from '../logger'

/**
 * Blog Service - Handles all blog post CRUD operations
 */
export class BlogService {
  /**
   * Get all blog posts with optional filters
   */
  static async getPosts(options: {
    status?: BlogPostStatus
    categorySlug?: string
    tagSlug?: string
    limit?: number
    offset?: number
    includeDrafts?: boolean
  } = {}): Promise<BlogPost[]> {
    try {
      let query = supabase
        .from('blog_posts')
        .select(`
          *,
          blog_post_categories!inner(
            category:blog_categories(*)
          ),
          blog_post_tags(
            tag:blog_tags(*)
          )
        `)

      // Apply filters
      if (options.status) {
        query = query.eq('status', options.status)
      } else if (!options.includeDrafts) {
        // Default: only published posts
        query = query.eq('status', 'published')
        query = query.not('published_at', 'is', null)
        query = query.lte('published_at', new Date().toISOString())
      }

      if (options.categorySlug) {
        query = query.eq('blog_post_categories.category.slug', options.categorySlug)
      }

      if (options.tagSlug) {
        query = query.eq('blog_post_tags.tag.slug', options.tagSlug)
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit)
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
      }

      // Order by published_at desc
      query = query.order('published_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      // Transform the nested response
      const posts: BlogPost[] = (data || []).map((post: any) => ({
        ...post,
        categories: post.blog_post_categories?.map((pc: any) => pc.category) || [],
        tags: post.blog_post_tags?.map((pt: any) => pt.tag) || []
      }))

      return posts
    } catch (error: any) {
      logger.error('Error fetching blog posts', {
        component: 'BlogService',
        action: 'getPosts',
        options: JSON.stringify(options),
        error: String(error)
      })
      throw error
    }
  }

  /**
   * Get a single blog post by slug
   */
  static async getPostBySlug(slug: string): Promise<BlogPost | null> {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_post_categories(
            category:blog_categories(*)
          ),
          blog_post_tags(
            tag:blog_tags(*)
          )
        `)
        .eq('slug', slug)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        throw error
      }

      if (!data) return null

      // Transform nested response
      return {
        ...data,
        categories: data.blog_post_categories?.map((pc: any) => pc.category) || [],
        tags: data.blog_post_tags?.map((pt: any) => pt.tag) || []
      } as BlogPost
    } catch (error: any) {
      logger.error('Error fetching blog post by slug', {
        component: 'BlogService',
        action: 'getPostBySlug',
        slug,
        error: String(error)
      })
      throw error
    }
  }

  /**
   * Get a single blog post by ID
   */
  static async getPostById(id: string): Promise<BlogPost | null> {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_post_categories(
            category:blog_categories(*)
          ),
          blog_post_tags(
            tag:blog_tags(*)
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      if (!data) return null

      return {
        ...data,
        categories: data.blog_post_categories?.map((pc: any) => pc.category) || [],
        tags: data.blog_post_tags?.map((pt: any) => pt.tag) || []
      } as BlogPost
    } catch (error: any) {
      logger.error('Error fetching blog post by ID', {
        component: 'BlogService',
        action: 'getPostById',
        id,
        error: String(error)
      })
      throw error
    }
  }

  /**
   * Create a new blog post
   */
  static async createPost(post: Omit<BlogPost, 'id' | 'created_at' | 'updated_at' | 'views_count'>): Promise<BlogPost> {
    try {
      // Extract categories and tags from the post
      const { categories, tags, ...postData } = post

      // Insert the post
      const { data: postResult, error: postError } = await supabase
        .from('blog_posts')
        .insert({
          ...postData,
          content: post.content as any, // JSONB
          target_locations: post.target_locations,
          target_services: post.target_services,
          schema_markup: post.schema_markup as any
        })
        .select()
        .single()

      if (postError) throw postError

      // Associate categories
      if (categories && categories.length > 0) {
        const categoryLinks = categories.map(cat => ({
          blog_post_id: postResult.id,
          category_id: cat.id
        }))

        const { error: categoryError } = await supabase
          .from('blog_post_categories')
          .insert(categoryLinks)

        if (categoryError) {
          logger.warn('Error associating categories', {
            component: 'BlogService',
            action: 'createPost',
            error: String(categoryError)
          })
        }
      }

      // Associate tags
      if (tags && tags.length > 0) {
        const tagLinks = tags.map(tag => ({
          blog_post_id: postResult.id,
          tag_id: tag.id
        }))

        const { error: tagError } = await supabase
          .from('blog_post_tags')
          .insert(tagLinks)

        if (tagError) {
          logger.warn('Error associating tags', {
            component: 'BlogService',
            action: 'createPost',
            error: String(tagError)
          })
        }
      }

      // Fetch the complete post with relations
      const completePost = await this.getPostById(postResult.id)
      if (!completePost) {
        throw new Error('Failed to fetch created post')
      }

      return completePost
    } catch (error: any) {
      logger.error('Error creating blog post', {
        component: 'BlogService',
        action: 'createPost',
        postTitle: post.title,
        postSlug: post.slug,
        error: String(error)
      })
      throw error
    }
  }

  /**
   * Update a blog post
   */
  static async updatePost(
    id: string,
    updates: Partial<Omit<BlogPost, 'id' | 'created_at' | 'views_count'>> & {
      categories?: BlogCategory[]
      tags?: BlogTag[]
    }
  ): Promise<BlogPost> {
    try {
      const { categories, tags, ...updateData } = updates

      // Update the post
      const { data: postResult, error: postError } = await supabase
        .from('blog_posts')
        .update({
          ...updateData,
          content: updateData.content as any,
          target_locations: updateData.target_locations,
          target_services: updateData.target_services,
          schema_markup: updateData.schema_markup as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (postError) throw postError

      // Update categories if provided
      if (categories !== undefined) {
        // Delete existing category associations
        await supabase
          .from('blog_post_categories')
          .delete()
          .eq('blog_post_id', id)

        // Insert new associations
        if (categories.length > 0) {
          const categoryLinks = categories.map(cat => ({
            blog_post_id: id,
            category_id: cat.id
          }))

          const { error: categoryError } = await supabase
            .from('blog_post_categories')
            .insert(categoryLinks)

          if (categoryError) {
            logger.warn('Error updating categories', {
              component: 'BlogService',
              action: 'updatePost',
              error: String(categoryError)
            })
          }
        }
      }

      // Update tags if provided
      if (tags !== undefined) {
        // Delete existing tag associations
        await supabase
          .from('blog_post_tags')
          .delete()
          .eq('blog_post_id', id)

        // Insert new associations
        if (tags.length > 0) {
          const tagLinks = tags.map(tag => ({
            blog_post_id: id,
            tag_id: tag.id
          }))

          const { error: tagError } = await supabase
            .from('blog_post_tags')
            .insert(tagLinks)

          if (tagError) {
            logger.warn('Error updating tags', {
              component: 'BlogService',
              action: 'updatePost',
              error: String(tagError)
            })
          }
        }
      }

      // Fetch the complete updated post
      const completePost = await this.getPostById(id)
      if (!completePost) {
        throw new Error('Failed to fetch updated post')
      }

      return completePost
    } catch (error: any) {
      logger.error('Error updating blog post', {
        component: 'BlogService',
        action: 'updatePost',
        id,
        error: String(error)
      })
      throw error
    }
  }

  /**
   * Delete a blog post
   */
  static async deletePost(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error: any) {
      logger.error('Error deleting blog post', {
        component: 'BlogService',
        action: 'deletePost',
        id,
        error: String(error)
      })
      throw error
    }
  }

  /**
   * Increment view count for a blog post
   */
  static async incrementViewCount(id: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_blog_post_views', {
        post_id: id
      })

      // If RPC doesn't exist, do a manual update
      if (error && (error as any).code === '42883') {
        const post = await this.getPostById(id)
        if (post) {
          await supabase
            .from('blog_posts')
            .update({ views_count: post.views_count + 1 })
            .eq('id', id)
        }
      } else if (error) {
        throw error
      }
    } catch (error) {
      logger.error('Error incrementing view count', {
        component: 'BlogService',
        action: 'incrementViewCount',
        id,
        error: String(error)
      })
      // Don't throw - view count is non-critical
    }
  }

  /**
   * Get all categories
   */
  static async getCategories(): Promise<BlogCategory[]> {
    try {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error: any) {
      logger.error('Error fetching categories', {
        component: 'BlogService',
        action: 'getCategories',
        error: String(error)
      })
      throw error
    }
  }

  /**
   * Get all tags
   */
  static async getTags(limit?: number): Promise<BlogTag[]> {
    try {
      let query = supabase
        .from('blog_tags')
        .select('*')
        .order('usage_count', { ascending: false })

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error: any) {
      logger.error('Error fetching tags', {
        component: 'BlogService',
        action: 'getTags',
        error: String(error)
      })
      throw error
    }
  }
}
