import type { BlogPost, SEOAnalysisResult, ContentBlock } from '../types'

/**
 * SEO Analyzer Service - Analyzes blog posts for SEO optimization
 */
export class SEOAnalyzer {
  /**
   * Perform comprehensive SEO analysis on a blog post
   */
  static async analyzeBlogPost(post: BlogPost): Promise<SEOAnalysisResult> {
    const titleAnalysis = this.analyzeTitle(post.title, post.focus_keyword)
    const metaDescriptionAnalysis = this.analyzeMetaDescription(
      post.meta_description,
      post.focus_keyword
    )
    const contentAnalysis = this.analyzeContent(post.content, post.focus_keyword)
    const localSEOAnalysis = this.analyzeLocalSEO(post)
    const localSEOAnalysisWithScore = {
      ...localSEOAnalysis,
      score: localSEOAnalysis.score
    }
    const technicalSEO = this.analyzeTechnicalSEO(post)

    // Calculate content analysis score
    const contentScore = this.calculateContentScore(contentAnalysis)

    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      titleAnalysis.score * 0.15 +
        metaDescriptionAnalysis.score * 0.15 +
        contentScore * 0.35 +
        localSEOAnalysisWithScore.score * 0.20 +
        technicalSEO.score * 0.15
    )

    return {
      overallScore,
      titleAnalysis,
      metaDescriptionAnalysis,
      contentAnalysis,
      localSEOAnalysis: localSEOAnalysisWithScore,
      technicalSEO
    }
  }

  /**
   * Analyze title optimization
   */
  private static analyzeTitle(title: string, keyword: string): SEOAnalysisResult['titleAnalysis'] {
    const hasKeyword = title.toLowerCase().includes(keyword.toLowerCase())
    const length = title.length
    const optimalLength = 50 // Google typically shows 50-60 characters

    let score = 0
    const recommendations: string[] = []

    // Keyword presence (40 points)
    if (hasKeyword) {
      score += 40
    } else {
      recommendations.push('Include the focus keyword in the title')
    }

    // Length optimization (30 points)
    if (length >= 30 && length <= 60) {
      score += 30
    } else if (length < 30) {
      score += 15
      recommendations.push('Title is too short - aim for 30-60 characters')
    } else {
      score += 20
      recommendations.push('Title is too long - may be truncated in search results')
    }

    // Keyword position (20 points) - Better if keyword appears earlier
    if (hasKeyword) {
      const keywordPosition = title.toLowerCase().indexOf(keyword.toLowerCase())
      const positionRatio = keywordPosition / length
      if (positionRatio < 0.3) {
        score += 20 // Keyword in first 30%
      } else if (positionRatio < 0.6) {
        score += 15
      } else {
        score += 10
        recommendations.push('Move the focus keyword closer to the beginning of the title')
      }
    }

    // Natural language (10 points)
    if (length > 20 && !this.isKeywordStuffed(title, keyword)) {
      score += 10
    } else {
      recommendations.push('Make the title sound more natural')
    }

    return {
      score: Math.min(100, score),
      hasKeyword,
      length,
      recommendations
    }
  }

  /**
   * Analyze meta description optimization
   */
  private static analyzeMetaDescription(
    description: string,
    keyword: string
  ): SEOAnalysisResult['metaDescriptionAnalysis'] {
    const hasKeyword = description.toLowerCase().includes(keyword.toLowerCase())
    const length = description.length
    const optimalLength = 155 // Google typically shows 155-160 characters
    const hasCallToAction = /(get|learn|discover|request|contact|call|quote)/i.test(description)

    let score = 0
    const recommendations: string[] = []

    // Keyword presence (30 points)
    if (hasKeyword) {
      score += 30
    } else {
      recommendations.push('Include the focus keyword in the meta description')
    }

    // Length optimization (30 points)
    if (length >= 120 && length <= 160) {
      score += 30
    } else if (length < 120) {
      score += 15
      recommendations.push('Meta description is too short - aim for 120-160 characters')
    } else {
      score += 20
      recommendations.push('Meta description is too long - may be truncated in search results')
    }

    // Call to action (20 points)
    if (hasCallToAction) {
      score += 20
    } else {
      recommendations.push('Add a call-to-action to encourage clicks')
    }

    // Natural language (20 points)
    if (length > 50 && !this.isKeywordStuffed(description, keyword)) {
      score += 20
    } else {
      recommendations.push('Make the meta description sound more natural and compelling')
    }

    return {
      score: Math.min(100, score),
      hasKeyword,
      length,
      hasCallToAction,
      recommendations
    }
  }

  /**
   * Analyze content optimization
   */
  private static analyzeContent(
    content: ContentBlock[],
    keyword: string
  ): SEOAnalysisResult['contentAnalysis'] {
    // Extract all text content
    const allText = content
      .filter(block => block.type === 'paragraph' || block.type === 'heading')
      .map(block => block.text || '')
      .join(' ')

    const wordCount = allText.split(/\s+/).filter(word => word.length > 0).length

    // Calculate keyword density
    const keywordCount = (allText.toLowerCase().match(new RegExp(keyword.toLowerCase(), 'g')) || [])
      .length
    const keywordDensity = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0

    // Analyze heading structure
    const headings = content.filter(block => block.type === 'heading') as Array<
      ContentBlock & { level: number }
    >
    const hasH1 = headings.some(h => h.level === 1)
    const h1Count = headings.filter(h => h.level === 1).length
    const headingLevels = [...new Set(headings.map(h => h.level))].sort()

    // Find LSI keywords (simplified - in production, use NLP or keyword research tools)
    const lsiKeywords = this.findLSIKeywords(allText, keyword)

    // Calculate readability (simplified Flesch Reading Ease approximation)
    const readabilityScore = this.calculateReadability(allText)

    const recommendations: string[] = []

    // Word count recommendations
    if (wordCount < 1000) {
      recommendations.push('Content is too short - aim for at least 1500 words')
    } else if (wordCount >= 1000 && wordCount < 1500) {
      recommendations.push('Consider expanding content to 1500+ words for better SEO')
    } else if (wordCount > 2500) {
      recommendations.push('Consider splitting very long content into multiple posts')
    }

    // Keyword density recommendations
    if (keywordDensity < 0.5) {
      recommendations.push('Keyword density is too low - increase keyword usage naturally')
    } else if (keywordDensity > 0.5 && keywordDensity < 1) {
      recommendations.push('Consider increasing keyword usage slightly')
    } else if (keywordDensity > 2) {
      recommendations.push('Keyword density is too high - may be considered keyword stuffing')
    }

    // Heading structure recommendations
    if (!hasH1) {
      recommendations.push('Add an H1 heading with the focus keyword')
    }
    if (h1Count > 1) {
      recommendations.push('Use only one H1 heading per page')
    }
    if (headingLevels.length < 2) {
      recommendations.push('Add more subheadings (H2, H3) to structure content')
    }

    // LSI keywords recommendations
    if (lsiKeywords.length < 1) {
      recommendations.push('Include related keywords to improve topical relevance')
    } else if (lsiKeywords.length < 3) {
      recommendations.push('Include more related keywords (LSI keywords) throughout content')
    }

    // Readability recommendations
    if (readabilityScore < 50) {
      recommendations.push('Content is difficult to read - simplify language and sentence structure')
    } else if (readabilityScore < 60) {
      recommendations.push('Improve readability by simplifying sentences')
    }

    return {
      wordCount,
      keywordDensity: Math.round(keywordDensity * 100) / 100,
      lsiKeywordsFound: lsiKeywords,
      headingStructure: {
        hasH1,
        h1Count,
        headingLevels,
        recommendations: []
      },
      readabilityScore,
      recommendations
    }
  }

  /**
   * Analyze local SEO elements
   */
  private static analyzeLocalSEO(post: BlogPost): SEOAnalysisResult['localSEOAnalysis'] & { score: number } {
    const allText = post.content
      .filter(block => block.type === 'paragraph' || block.type === 'heading')
      .map(block => block.text || '')
      .join(' ')
      .toLowerCase()

    const njLocations = [
      'new jersey',
      'newark',
      'jersey city',
      'paterson',
      'elizabeth',
      'edison',
      'woodbridge'
    ]
    const caribbeanLocations = [
      'jamaica',
      'haiti',
      'dominican republic',
      'trinidad',
      'tobago',
      'barbados',
      'grenada',
      'st lucia',
      'antigua',
      'caribbean'
    ]

    const allLocations = [...njLocations, ...caribbeanLocations]
    const locationMentions = allLocations.filter(loc => allText.includes(loc))
    const hasLocationMentions = locationMentions.length > 0

    const totalWords = allText.split(/\s+/).length
    const locationWordCount = locationMentions.length
    const locationDensity = totalWords > 0 ? (locationWordCount / totalWords) * 100 : 0

    const hasLocalSchema = !!post.schema_markup?.LocalBusiness || !!post.schema_markup?.ServiceArea

    let score = 0
    const recommendations: string[] = []

    // Location mentions (40 points)
    if (hasLocationMentions) {
      score += 40
      if (locationMentions.length >= 3) {
        score += 10
      } else {
        recommendations.push('Mention more specific NJ and Caribbean locations')
      }
    } else {
      recommendations.push('Include mentions of New Jersey cities and Caribbean destinations')
    }

    // Location density (30 points)
    if (locationDensity >= 0.5 && locationDensity <= 2) {
      score += 30
    } else if (locationDensity > 0.2) {
      score += 20
    } else {
      score += 10
      recommendations.push('Increase location mentions throughout the content')
    }

    // Local schema (20 points)
    if (hasLocalSchema) {
      score += 20
    } else {
      recommendations.push('Add LocalBusiness schema markup with service areas')
    }

    // NAP consistency (10 points) - Would need to check against Google Business Profile
    // Simplified: check if target_locations is populated
    if (post.target_locations && post.target_locations.length > 0) {
      score += 10
    } else {
      recommendations.push('Specify target locations in post metadata')
    }

    return {
      score: Math.min(100, score),
      hasLocationMentions,
      locationDensity: Math.round(locationDensity * 100) / 100,
      hasLocalSchema,
      hasNAPConsistency: post.target_locations?.length > 0 || false,
      recommendations
    }
  }

  /**
   * Analyze technical SEO elements
   */
  private static analyzeTechnicalSEO(post: BlogPost): SEOAnalysisResult['technicalSEO'] & { score: number } {
    const images = post.content.filter(block => block.type === 'image')
    const hasImageAlt = images.every(img => img.altText && img.altText.length > 0)
    const featuredImageHasAlt = !post.featured_image_url || !!post.featured_image_alt

    // Count internal links (would need to check internal_links table or parse content)
    const hasInternalLinks = post.content.some(
      block => block.type === 'paragraph' && block.text?.includes('[')
    ) // Simplified check

    const hasExternalLinks = post.content.some(block => {
      if (block.type === 'paragraph' && block.text) {
        return /https?:\/\//.test(block.text)
      }
      return false
    })

    const hasSchema = !!post.schema_markup

    let score = 0
    const recommendations: string[] = []

    // Image alt text (25 points)
    if (hasImageAlt && featuredImageHasAlt) {
      score += 25
    } else {
      if (!hasImageAlt) {
        recommendations.push('Add alt text to all images')
      }
      if (!featuredImageHasAlt) {
        recommendations.push('Add alt text to featured image')
      }
      score += 10
    }

    // Internal links (25 points)
    if (hasInternalLinks) {
      score += 25
    } else {
      recommendations.push('Add internal links to related blog posts and service pages')
      score += 10
    }

    // External links (15 points)
    if (hasExternalLinks) {
      score += 15
    } else {
      recommendations.push('Add external links to authoritative sources for credibility')
      score += 5
    }

    // Schema markup (35 points)
    if (hasSchema) {
      score += 35
    } else {
      recommendations.push('Add schema markup (Article, LocalBusiness, etc.)')
      score += 5
    }

    const finalScore = Math.min(100, score)

    return {
      score: finalScore,
      hasImageAlt: hasImageAlt && featuredImageHasAlt,
      hasInternalLinks,
      internalLinkCount: 0, // Would need to count from database
      hasExternalLinks,
      hasSchema,
      recommendations
    }
  }

  /**
   * Calculate content analysis score
   */
  private static calculateContentScore(analysis: SEOAnalysisResult['contentAnalysis']): number {
    let score = 0

    // Word count (20 points)
    if (analysis.wordCount >= 1500 && analysis.wordCount <= 2500) {
      score += 20
    } else if (analysis.wordCount >= 1000) {
      score += 15
    } else {
      score += 10
    }

    // Keyword density (25 points)
    if (analysis.keywordDensity >= 1 && analysis.keywordDensity <= 2) {
      score += 25
    } else if (analysis.keywordDensity > 0.5) {
      score += 20
    } else {
      score += 10
    }

    // Heading structure (20 points)
    if (analysis.headingStructure.hasH1 && analysis.headingStructure.h1Count === 1) {
      score += 20
    } else {
      score += 10
    }

    // LSI keywords (15 points)
    if (analysis.lsiKeywordsFound.length >= 3) {
      score += 15
    } else if (analysis.lsiKeywordsFound.length >= 1) {
      score += 10
    } else {
      score += 5
    }

    // Readability (20 points)
    if (analysis.readabilityScore >= 60) {
      score += 20
    } else if (analysis.readabilityScore >= 50) {
      score += 15
    } else {
      score += 10
    }

    return Math.min(100, score)
  }

  /**
   * Calculate readability score (simplified Flesch Reading Ease)
   */
  private static calculateReadability(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const words = text.split(/\s+/).filter(w => w.length > 0)
    const syllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0)

    if (sentences.length === 0 || words.length === 0) return 0

    const avgSentenceLength = words.length / sentences.length
    const avgSyllablesPerWord = syllables / words.length

    // Simplified Flesch Reading Ease formula
    const score =
      206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  /**
   * Count syllables in a word (approximation)
   */
  private static countSyllables(word: string): number {
    word = word.toLowerCase()
    if (word.length <= 3) return 1

    word = word.replace(/[^a-z]/g, '')
    const matches = word.match(/[aeiouy]+/g)
    if (!matches) return 1

    let count = matches.length
    if (word.match(/e$/)) count--
    return Math.max(1, count)
  }

  /**
   * Find LSI (Latent Semantic Indexing) keywords
   */
  private static findLSIKeywords(text: string, primaryKeyword: string): string[] {
    // Simplified LSI keyword finder
    // In production, use NLP libraries or keyword research APIs
    const relatedTerms: Record<string, string[]> = {
      'air cargo': ['shipping', 'freight', 'logistics', 'transport', 'air freight'],
      'package forwarding': ['forwarding', 'shipping', 'parcel', 'delivery', 'mail'],
      'caribbean': ['islands', 'tropical', 'jamaica', 'haiti', 'trinidad'],
      'new jersey': ['nj', 'newark', 'jersey city', 'garden state', 'northeast']
    }

    const keywordLower = primaryKeyword.toLowerCase()
    const related = relatedTerms[keywordLower] || []
    const textLower = text.toLowerCase()

    return related.filter(term => textLower.includes(term))
  }

  /**
   * Check if text appears to be keyword stuffed
   */
  private static isKeywordStuffed(text: string, keyword: string): boolean {
    const keywordCount = (text.toLowerCase().match(new RegExp(keyword.toLowerCase(), 'g')) || [])
      .length
    const wordCount = text.split(/\s+/).length
    const density = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0

    return density > 3 // More than 3% is likely stuffing
  }
}

