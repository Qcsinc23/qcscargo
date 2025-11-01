import { supabase } from '../supabase'
import type { SEOKeyword } from '../types'
import { logger } from '../logger'

/**
 * Keyword Research Service
 * Discovers and analyzes keywords for SEO optimization
 */
export class KeywordResearch {
  /**
   * Discover high-opportunity keywords for NJ Caribbean logistics
   */
  static async discoverKeywords(
    seedKeyword: string,
    location: string = 'New Jersey'
  ): Promise<SEOKeyword[]> {
    try {
      // Search existing keywords in database
      const { data, error } = await supabase
        .from('seo_keywords')
        .select('*')
        .ilike('keyword', `%${seedKeyword}%`)
        .eq('target_location', location)
        .order('priority', { ascending: false })
        .limit(20)

      if (error) throw error

      return data || []
    } catch (error: any) {
      logger.error('Error discovering keywords', {
        component: 'KeywordResearch',
        action: 'discoverKeywords',
        seedKeyword,
        location,
        error: String(error)
      })
      return []
    }
  }

  /**
   * Generate LSI (Latent Semantic Indexing) keywords from primary keyword
   */
  static generateLSIKeywords(primaryKeyword: string): string[] {
    const keyword = primaryKeyword.toLowerCase()

    // Expanded LSI keyword database for logistics/shipping
    const lsiMap: Record<string, string[]> = {
      'air cargo': [
        'air freight',
        'air shipping',
        'airport cargo',
        'express air cargo',
        'air cargo services',
        'cargo airline',
        'air cargo rates',
        'air cargo tracking'
      ],
      'air cargo shipping': [
        'air freight shipping',
        'express air shipping',
        'air cargo services',
        'air freight forwarding',
        'air cargo rates',
        'airport shipping',
        'international air cargo'
      ],
      'package forwarding': [
        'mail forwarding',
        'parcel forwarding',
        'package consolidation',
        'forwarding service',
        'international forwarding',
        'shipping forwarding',
        'package receiving'
      ],
      'caribbean shipping': [
        'shipping to caribbean',
        'caribbean freight',
        'caribbean logistics',
        'caribbean delivery',
        'caribbean cargo',
        'caribbean air freight',
        'caribbean express shipping'
      ],
      'new jersey': [
        'nj',
        'newark',
        'jersey city',
        'garden state',
        'new jersey shipping',
        'nj logistics',
        'newark airport'
      ],
      'freight forwarder': [
        'cargo forwarder',
        'shipping forwarder',
        'logistics company',
        'freight services',
        'cargo services',
        'international freight',
        'customs broker'
      ],
      'express shipping': [
        'fast shipping',
        'expedited shipping',
        'rush delivery',
        'priority shipping',
        'same day shipping',
        'overnight shipping',
        'urgent shipping'
      ]
    }

    // Find matching LSI keywords
    let lsiKeywords: string[] = []

    for (const [key, values] of Object.entries(lsiMap)) {
      if (keyword.includes(key) || key.includes(keyword)) {
        lsiKeywords = [...lsiKeywords, ...values]
      }
    }

    // Generate additional variations
    const variations: string[] = []

    // Add location-specific variations if location mentioned
    if (keyword.includes('new jersey') || keyword.includes('nj')) {
      variations.push(
        'newark shipping',
        'jersey city cargo',
        'nj air freight',
        'new jersey logistics'
      )
    }

    // Add Caribbean destination variations
    if (keyword.includes('caribbean')) {
      variations.push(
        'jamaica shipping',
        'haiti cargo',
        'trinidad freight',
        'dominican republic shipping',
        'barbados logistics'
      )
    }

    // Add service variations
    if (keyword.includes('shipping') || keyword.includes('cargo') || keyword.includes('freight')) {
      variations.push(
        'international shipping',
        'logistics services',
        'cargo handling',
        'freight management'
      )
    }

    // Combine and remove duplicates
    const allKeywords = [...lsiKeywords, ...variations]
    return [...new Set(allKeywords)].slice(0, 15)
  }

  /**
   * Find quick-win keywords (high opportunity, low difficulty)
   */
  static async findQuickWins(
    service: string,
    location: string = 'New Jersey'
  ): Promise<SEOKeyword[]> {
    try {
      const { data, error } = await supabase
        .from('seo_keywords')
        .select('*')
        .eq('related_service', service)
        .eq('target_location', location)
        .or('keyword_difficulty.is.null,keyword_difficulty.lte.30')
        .order('priority', { ascending: false })
        .limit(10)

      if (error) throw error

      return (
        data?.filter(
          kw =>
            !kw.current_ranking ||
            (kw.current_ranking > 10 && kw.current_ranking <= 50)
        ) || []
      )
    } catch (error: any) {
      logger.error('Error finding quick wins', {
        component: 'KeywordResearch',
        action: 'findQuickWins',
        service,
        location,
        error: String(error)
      })
      return []
    }
  }

  /**
   * Analyze search intent for a keyword
   */
  static analyzeSearchIntent(keyword: string): 'informational' | 'commercial' | 'transactional' | 'navigational' {
    const kw = keyword.toLowerCase()

    // Navigational indicators
    if (kw.includes('near me') || kw.includes('location') || kw.includes('address')) {
      return 'navigational'
    }

    // Transactional indicators
    const transactionalTerms = [
      'buy',
      'purchase',
      'order',
      'quote',
      'price',
      'cost',
      'rates',
      'cheap',
      'affordable',
      'get',
      'request',
      'book'
    ]
    if (transactionalTerms.some(term => kw.includes(term))) {
      return 'transactional'
    }

    // Commercial indicators
    const commercialTerms = [
      'best',
      'top',
      'review',
      'compare',
      'vs',
      'alternative',
      'service',
      'company',
      'provider'
    ]
    if (commercialTerms.some(term => kw.includes(term))) {
      return 'commercial'
    }

    // Informational indicators
    const informationalTerms = [
      'how to',
      'what is',
      'guide',
      'tips',
      'explained',
      'information',
      'learn',
      'understand',
      'why'
    ]
    if (informationalTerms.some(term => kw.includes(term))) {
      return 'informational'
    }

    // Default based on service-related keywords
    if (kw.includes('shipping') || kw.includes('cargo') || kw.includes('freight')) {
      return 'transactional'
    }

    return 'informational'
  }

  /**
   * Get keyword suggestions based on current post
   */
  static async getKeywordSuggestions(
    currentKeyword: string,
    targetLocation: string = 'New Jersey'
  ): Promise<SEOKeyword[]> {
    try {
      // Find similar keywords
      const { data, error } = await supabase
        .from('seo_keywords')
        .select('*')
        .neq('keyword', currentKeyword)
        .eq('target_location', targetLocation)
        .order('priority', { ascending: false })
        .limit(10)

      if (error) throw error

      return data || []
    } catch (error: any) {
      logger.error('Error getting keyword suggestions', {
        component: 'KeywordResearch',
        action: 'getKeywordSuggestions',
        currentKeyword,
        targetLocation,
        error: String(error)
      })
      return []
    }
  }

  /**
   * Calculate keyword opportunity score
   */
  static calculateOpportunityScore(
    searchVolume?: number,
    difficulty?: number,
    currentRanking?: number
  ): number {
    let score = 0

    // Search volume component (40 points max)
    if (searchVolume) {
      if (searchVolume >= 1000) score += 40
      else if (searchVolume >= 500) score += 30
      else if (searchVolume >= 100) score += 20
      else if (searchVolume >= 10) score += 10
    } else {
      score += 15 // Medium volume assumption if unknown
    }

    // Difficulty component (40 points max) - Lower difficulty = higher score
    if (difficulty !== undefined) {
      if (difficulty <= 20) score += 40
      else if (difficulty <= 40) score += 30
      else if (difficulty <= 60) score += 20
      else if (difficulty <= 80) score += 10
    } else {
      score += 20 // Medium difficulty assumption if unknown
    }

    // Ranking opportunity (20 points max)
    if (currentRanking) {
      if (currentRanking > 50) score += 20 // Not ranked, high opportunity
      else if (currentRanking > 20) score += 15
      else if (currentRanking > 10) score += 10
      else if (currentRanking > 3) score += 5
    } else {
      score += 15 // High opportunity if not ranked
    }

    return Math.min(100, score)
  }
}

