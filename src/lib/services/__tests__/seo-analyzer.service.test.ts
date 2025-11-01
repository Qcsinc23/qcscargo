/**
 * SEO Analyzer Service Unit Tests
 */

import { describe, it, expect } from 'vitest'
import { SEOAnalyzer } from '../seo-analyzer.service'
import type { BlogPost } from '../../types'

describe('SEOAnalyzer', () => {
  const mockPost: BlogPost = {
    id: '1',
    title: 'Air Cargo Shipping New Jersey Guide',
    slug: 'air-cargo-shipping-new-jersey',
    meta_title: 'Air Cargo Shipping New Jersey - Expert Guide | QCS Cargo',
    meta_description: 'Complete guide to air cargo shipping services in New Jersey. Fast, reliable international freight forwarding.',
    content: [
      { type: 'heading', level: 1, text: 'Air Cargo Shipping New Jersey' },
      { type: 'paragraph', text: 'When it comes to shipping cargo from New Jersey, air freight services offer the fastest delivery times. QCS Cargo specializes in air cargo shipping throughout New Jersey and to the Caribbean.' }
    ],
    focus_keyword: 'air cargo shipping New Jersey',
    target_locations: ['New Jersey', 'Caribbean'],
    target_services: ['air-cargo'],
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    views_count: 0,
    seo_score: 0,
    readability_score: 0
  }

  describe('analyzeBlogPost', () => {
    it('should analyze complete blog post', async () => {
      const analysis = await SEOAnalyzer.analyzeBlogPost(mockPost)
      expect(analysis).toBeDefined()
      expect(analysis.overallScore).toBeGreaterThanOrEqual(0)
      expect(analysis.overallScore).toBeLessThanOrEqual(100)
      expect(analysis.titleAnalysis).toBeDefined()
      expect(analysis.metaDescriptionAnalysis).toBeDefined()
      expect(analysis.contentAnalysis).toBeDefined()
      expect(analysis.contentAnalysis.wordCount).toBeGreaterThan(0)
      expect(analysis.contentAnalysis.readabilityScore).toBeGreaterThanOrEqual(0)
    })

    it('should detect keyword in title and description', async () => {
      const analysis = await SEOAnalyzer.analyzeBlogPost(mockPost)
      expect(analysis.titleAnalysis.hasKeyword).toBe(true)
      expect(analysis.metaDescriptionAnalysis.hasKeyword).toBe(true)
    })

    it('should calculate valid scores', async () => {
      const analysis = await SEOAnalyzer.analyzeBlogPost(mockPost)
      expect(analysis.titleAnalysis.score).toBeGreaterThanOrEqual(0)
      expect(analysis.titleAnalysis.score).toBeLessThanOrEqual(100)
      expect(analysis.metaDescriptionAnalysis.score).toBeGreaterThanOrEqual(0)
      expect(analysis.metaDescriptionAnalysis.score).toBeLessThanOrEqual(100)
    })
  })
})

