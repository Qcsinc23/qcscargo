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

  describe('analyzeTitle', () => {
    it('should detect keyword in title', () => {
      const analysis = SEOAnalyzer.analyzeTitle(
        'Air Cargo Shipping New Jersey Guide',
        'air cargo shipping New Jersey'
      )
      expect(analysis.hasKeyword).toBe(true)
      expect(analysis.score).toBeGreaterThan(0)
    })

    it('should check title length', () => {
      const shortTitle = 'Air Cargo'
      const analysis = SEOAnalyzer.analyzeTitle(shortTitle, 'air cargo')
      expect(analysis.length).toBe(shortTitle.length)
    })
  })

  describe('analyzeMetaDescription', () => {
    it('should detect keyword in description', () => {
      const analysis = SEOAnalyzer.analyzeMetaDescription(
        'Air cargo shipping services in New Jersey',
        'air cargo shipping New Jersey'
      )
      expect(analysis.hasKeyword).toBe(true)
    })

    it('should check description length', () => {
      const desc = 'Complete guide to air cargo shipping services in New Jersey. Fast, reliable international freight forwarding.'
      const analysis = SEOAnalyzer.analyzeMetaDescription(desc, 'air cargo')
      expect(analysis.length).toBe(desc.length)
      expect(analysis.length).toBeGreaterThan(120)
    })
  })

  describe('analyzeContent', () => {
    it('should count words in content', () => {
      const analysis = SEOAnalyzer.analyzeContent(mockPost.content, mockPost.focus_keyword)
      expect(analysis.wordCount).toBeGreaterThan(0)
    })

    it('should calculate keyword density', () => {
      const analysis = SEOAnalyzer.analyzeContent(mockPost.content, mockPost.focus_keyword)
      expect(analysis.keywordDensity).toBeGreaterThanOrEqual(0)
      expect(analysis.keywordDensity).toBeLessThanOrEqual(100)
    })
  })

  describe('calculateReadability', () => {
    it('should calculate readability score', () => {
      const text = 'This is a simple sentence. It has clear words and structure.'
      const score = SEOAnalyzer.calculateReadability(text)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })
  })
})

