/**
 * Schema Markup Generator Service Unit Tests
 */

import { describe, it, expect } from 'vitest'
import { SchemaMarkupGenerator } from '../schema-markup.service'
import type { BlogPost } from '../../types'

describe('SchemaMarkupGenerator', () => {
  const mockPost: BlogPost = {
    id: '1',
    title: 'Test Post',
    slug: 'test-post',
    meta_title: 'Test Meta Title',
    meta_description: 'Test description',
    content: [],
    focus_keyword: 'test',
    target_locations: ['New Jersey'],
    target_services: ['air-cargo'],
    status: 'published',
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    views_count: 0,
    seo_score: 0,
    readability_score: 0
  }

  describe('generateArticleSchema', () => {
    it('should generate valid Article schema', () => {
      const schema = SchemaMarkupGenerator.generateArticleSchema(mockPost)
      expect(schema).toHaveProperty('@context', 'https://schema.org')
      expect(schema).toHaveProperty('@type', 'Article')
      expect(schema).toHaveProperty('headline', mockPost.title)
    })
  })

  describe('generateLocalBusinessSchema', () => {
    it('should generate valid LocalBusiness schema', () => {
      const services = ['air-cargo', 'package-forwarding']
      const serviceAreas = ['New Jersey', 'Caribbean']
      const schema = SchemaMarkupGenerator.generateLocalBusinessSchema(services, serviceAreas)
      expect(schema).toHaveProperty('@context', 'https://schema.org')
      expect(schema).toHaveProperty('@type', 'LocalBusiness')
    })
  })

  describe('combineSchemas', () => {
    it('should combine multiple schemas', () => {
      const schema1 = SchemaMarkupGenerator.generateArticleSchema(mockPost)
      const services = ['air-cargo']
      const serviceAreas = ['New Jersey']
      const schema2 = SchemaMarkupGenerator.generateLocalBusinessSchema(services, serviceAreas)
      const combined = SchemaMarkupGenerator.combineSchemas([schema1, schema2])
      expect(combined).toBeInstanceOf(Array)
      expect(combined.length).toBe(2)
    })
  })
})

