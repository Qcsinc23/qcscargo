import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ContentBlock, ContentGenerationConfig, GeneratedContent, BlogPost } from '../types'
import { logger } from '../logger'
import { KeywordResearch } from './keyword-research.service'
import { SEOAnalyzer } from './seo-analyzer.service'

/**
 * SEO Content Generator Service
 * Uses Google Gemini AI to generate SEO-optimized blog content
 */
export class SEOContentGenerator {
  private static apiKey: string | null = null
  private static client: GoogleGenerativeAI | null = null

  /**
   * Initialize Gemini AI client
   */
  private static initializeClient(): GoogleGenerativeAI {
    if (this.client) {
      return this.client
    }

    this.apiKey = import.meta.env.VITE_GOOGLE_GEMINI_API_KEY

    if (!this.apiKey) {
      throw new Error(
        'Google Gemini API key not found. Please set VITE_GOOGLE_GEMINI_API_KEY in your environment variables.'
      )
    }

    this.client = new GoogleGenerativeAI(this.apiKey)
    return this.client
  }

  /**
   * Generate comprehensive blog post content
   */
  static async generateBlogPost(
    config: ContentGenerationConfig
  ): Promise<GeneratedContent> {
    try {
      const client = this.initializeClient()
      const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' })

      // Generate LSI keywords
      const focusKeyword = (config as any).focusKeyword || config.targetKeyword || ''
      const lsiKeywords = KeywordResearch.generateLSIKeywords(focusKeyword)

      // Build the prompt
      const prompt = this.buildBlogPostPrompt(config, lsiKeywords)

      // Generate content
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      // Parse the generated content into structured blocks
      const contentBlocks = this.parseContentToBlocks(text, config)

      // Generate metadata
      const targetLocation = config.targetLocation || 'New Jersey'
      const title = (config as any).title || this.generateTitleFromKeyword(focusKeyword)
      const targetLocations = (config as any).targetLocations || [targetLocation, 'Caribbean']
      const targetServices = (config as any).targetServices || [config.targetService || 'air-cargo']
      
      const metaTitle = this.generateMetaTitle(focusKeyword, targetLocation)
      const metaDescription = this.generateMetaDescription(
        focusKeyword,
        contentBlocks
      )
      const slug = this.generateSlug(focusKeyword, title)
      const excerpt = this.extractExcerpt(contentBlocks)

      // Build GeneratedContent object matching the interface
      const generatedContent: GeneratedContent = {
        title,
        metaTitle,
        metaDescription,
        content: contentBlocks,
        excerpt,
        focusKeyword,
        seoScore: 0, // Will be calculated after
        readabilityScore: 0,
        schemaMarkup: {},
        internalLinkSuggestions: [],
        imageSuggestions: []
      }

      // Add additional fields that might be needed
      return {
        ...generatedContent,
        lsiKeywords,
        slug,
        targetLocations,
        targetServices
      } as any
    } catch (error: any) {
      logger.error('Error generating blog post', {
        component: 'SEOContentGenerator',
        action: 'generateBlogPost',
        config: JSON.stringify(config),
        error: String(error)
      })
      throw new Error(`Failed to generate blog post: ${error.message}`)
    }
  }

  /**
   * Build comprehensive prompt for blog post generation
   */
  private static buildBlogPostPrompt(
    config: ContentGenerationConfig,
    lsiKeywords: string[]
  ): string {
    const focusKeyword = (config as any).focusKeyword || config.targetKeyword || ''
    const title = (config as any).title
    const locationMention = config.targetLocation ? ` in ${config.targetLocation}` : ''
    const targetLocations = (config as any).targetLocations || [config.targetLocation || 'New Jersey', 'Caribbean']
    const targetServices = (config as any).targetServices || [config.targetService || 'air-cargo']
    const searchIntent = (config as any).searchIntent || 'transactional'
    const wordCount = config.wordCount || 2500

    return `You are an expert SEO content writer specializing in logistics, freight forwarding, and international shipping${locationMention}. Write a comprehensive, SEO-optimized blog post that will rank #1 on Google.

**Topic**: ${focusKeyword}
${title ? `**Title**: ${title}` : ''}
**Target Location**: ${targetLocations.join(', ')}
**Target Services**: ${targetServices.join(', ')}

**Requirements**:
1. Write ${wordCount} words of high-quality, original content
2. Optimize for the focus keyword: "${focusKeyword}"
3. Naturally include these LSI keywords: ${lsiKeywords.slice(0, 10).join(', ')}
4. Include location mentions for: ${targetLocations.join(', ')}
5. Write for ${searchIntent} search intent
6. Use ${config.tone || 'professional'} tone
7. Include relevant statistics, examples, and practical advice
8. Use proper heading structure (H2, H3)
9. Include bullet points, numbered lists, and callout sections
10. Write naturally - avoid keyword stuffing
11. Include a strong call-to-action at the end

**Content Structure**:
- Compelling introduction (hook the reader)
- 4-6 main sections with descriptive headings
- Practical tips and actionable advice
- Real-world examples and case studies
- Local references where relevant
- Strong conclusion with CTA

**Tone**: Professional, helpful, authoritative, but approachable

**Format**: Write in markdown format with proper headings, lists, and formatting.

Now write the complete blog post:`
  }

  /**
   * Parse generated text into structured content blocks
   */
  private static parseContentToBlocks(
    text: string,
    config: ContentGenerationConfig
  ): ContentBlock[] {
    const blocks: ContentBlock[] = []
    const lines = text.split('\n').filter(line => line.trim())

    let currentParagraph = ''
    let listItems: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Heading detection
      if (line.startsWith('#')) {
        // Save current paragraph if exists
        if (currentParagraph) {
          blocks.push({
            type: 'paragraph',
            text: currentParagraph.trim()
          })
          currentParagraph = ''
        }

        // Save current list if exists
        if (listItems.length > 0) {
          blocks.push({
            type: 'list',
            items: [...listItems]
          })
          listItems = []
        }

        // Extract heading level and text
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
        if (headingMatch) {
          const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6
          const headingText = headingMatch[2].trim()
          blocks.push({
            type: 'heading',
            level: Math.min(level, 6) as 1 | 2 | 3 | 4 | 5 | 6,
            text: headingText
          })
        }
      }
      // List item detection
      else if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line)) {
        // Save current paragraph if exists
        if (currentParagraph) {
          blocks.push({
            type: 'paragraph',
            text: currentParagraph.trim()
          })
          currentParagraph = ''
        }

        const listItem = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').trim()
        if (listItem) {
          listItems.push(listItem)
        }
      }
      // Regular paragraph
      else if (line.length > 0) {
        // Save list if exists
        if (listItems.length > 0) {
          blocks.push({
            type: 'list',
            items: [...listItems]
          })
          listItems = []
        }

        if (currentParagraph) {
          currentParagraph += ' ' + line
        } else {
          currentParagraph = line
        }
      }
    }

    // Save remaining content
    if (listItems.length > 0) {
      blocks.push({
        type: 'list',
        items: listItems
      })
    }

    if (currentParagraph) {
      blocks.push({
        type: 'paragraph',
        text: currentParagraph.trim()
      })
    }

    // Ensure we have at least one block
    if (blocks.length === 0) {
      blocks.push({
        type: 'paragraph',
        text: text
      })
    }

    return blocks
  }

  /**
   * Generate SEO-optimized meta title
   */
  private static generateMetaTitle(keyword: string, location?: string): string {
    const locationSuffix = location ? ` in ${location}` : ''
    
    // Variations of title formats
    const templates = [
      `${keyword}${locationSuffix} | QCS Cargo`,
      `Best ${keyword}${locationSuffix} Services | QCS Cargo`,
      `${keyword}${locationSuffix} - Expert Guide | QCS Cargo`,
      `Professional ${keyword}${locationSuffix} | QCS Cargo`
    ]

    // Select template that keeps title under 60 chars
    for (const template of templates) {
      if (template.length <= 60) {
        return template
      }
    }

    // Fallback to truncated version
    return `${keyword}${locationSuffix} | QCS Cargo`.substring(0, 60)
  }

  /**
   * Generate SEO-optimized meta description
   */
  private static generateMetaDescription(
    keyword: string,
    contentBlocks: ContentBlock[]
  ): string {
    // Extract first paragraph for description
    const firstParagraph = contentBlocks.find(
      block => block.type === 'paragraph'
    )?.text || ''

    const locationMention = ' in New Jersey and Caribbean'
    
    if (firstParagraph.length > 0) {
      const desc = `${firstParagraph.substring(0, 120)}... Get expert ${keyword}${locationMention}.`
      return desc.substring(0, 160)
    }

    return `Expert ${keyword}${locationMention} services. Fast, reliable shipping and logistics solutions. Get a quote today!`.substring(0, 160)
  }

  /**
   * Generate URL slug from keyword and title
   */
  private static generateSlug(keyword: string, title?: string): string {
    const base = title || keyword
    return base
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100)
  }

  /**
   * Extract excerpt from content blocks
   */
  private static extractExcerpt(blocks: ContentBlock[], maxLength: number = 160): string {
    for (const block of blocks) {
      if (block.type === 'paragraph' && block.text) {
        if (block.text.length <= maxLength) {
          return block.text
        }
        return block.text.substring(0, maxLength - 3) + '...'
      }
    }
    return ''
  }

  /**
   * Generate title from keyword
   */
  private static generateTitleFromKeyword(keyword: string): string {
    // Convert keyword to title case
    return keyword
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  /**
   * Generate content with SEO optimization
   */
  static async generateWithSEOOptimization(
    config: ContentGenerationConfig
  ): Promise<GeneratedContent & { seoScore: number; readabilityScore: number }> {
    // Generate content
    const generated = await this.generateBlogPost(config)

    // Create a mock BlogPost for SEO analysis
    const targetLocations = (generated as any).targetLocations || ['New Jersey', 'Caribbean']
    const targetServices = (generated as any).targetServices || ['air-cargo']
    
    const mockPost: Partial<BlogPost> = {
      title: generated.title,
      meta_title: generated.metaTitle,
      meta_description: generated.metaDescription,
      content: generated.content,
      focus_keyword: generated.focusKeyword,
      target_locations: targetLocations,
      target_services: targetServices
    }

    // Analyze SEO
    try {
      const analysis = await SEOAnalyzer.analyzeBlogPost(mockPost as BlogPost)
      generated.seoScore = analysis.overallScore
      generated.readabilityScore = analysis.contentAnalysis.readabilityScore
    } catch (error) {
      logger.error('Error analyzing SEO', {
        component: 'SEOContentGenerator',
        action: 'generateWithSEOOptimization',
        error: String(error)
      })
    }

    return {
      ...generated,
      seoScore: generated.seoScore,
      readabilityScore: generated.readabilityScore
    }
  }
}

