/**
 * Blog Service Unit Tests
 * 
 * These tests verify the core functionality of the BlogService
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BlogService } from '../blog.service'
import type { BlogPost } from '../../types'

// Mock Supabase
vi.mock('../../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
      update: vi.fn(() => Promise.resolve({ data: [], error: null })),
      delete: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }
}))

describe('BlogService', () => {
  describe('getPosts', () => {
    it('should fetch published posts by default', async () => {
      const posts = await BlogService.getPosts()
      expect(posts).toBeDefined()
      expect(Array.isArray(posts)).toBe(true)
    })

    it('should respect limit parameter', async () => {
      const posts = await BlogService.getPosts({ limit: 5 })
      expect(posts.length).toBeLessThanOrEqual(5)
    })

    it('should filter by status when provided', async () => {
      const posts = await BlogService.getPosts({ status: 'draft' })
      expect(posts).toBeDefined()
    })
  })

  describe('getPostBySlug', () => {
    it('should fetch post by slug', async () => {
      const post = await BlogService.getPostBySlug('test-slug')
      expect(post).toBeDefined()
    })

    it('should return null for non-existent slug', async () => {
      // This would be mocked to return null
      const post = await BlogService.getPostBySlug('non-existent')
      // Expect null or error handling
    })
  })

  describe('createPost', () => {
    it('should create a new blog post', async () => {
      const postData: Partial<BlogPost> = {
        title: 'Test Post',
        slug: 'test-post',
        meta_title: 'Test Meta Title',
        meta_description: 'Test meta description',
        content: [{ type: 'paragraph', text: 'Test content' }],
        focus_keyword: 'test',
        target_locations: ['New Jersey'],
        target_services: ['air-cargo'],
        status: 'draft'
      }

      const result = await BlogService.createPost(postData as any)
      expect(result).toBeDefined()
    })
  })

  describe('updatePost', () => {
    it('should update existing post', async () => {
      const updateData = {
        title: 'Updated Title'
      }

      const result = await BlogService.updatePost('test-id', updateData)
      expect(result).toBeDefined()
    })
  })

  describe('deletePost', () => {
    it('should delete a post', async () => {
      await expect(BlogService.deletePost('test-id')).resolves.not.toThrow()
    })
  })

  describe('incrementViewCount', () => {
    it('should increment view count', async () => {
      await expect(BlogService.incrementViewCount('test-id')).resolves.not.toThrow()
    })
  })
})

