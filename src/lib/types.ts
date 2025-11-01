export interface Destination {
  id: number
  country_name: string
  city_name: string
  airport_code: string
  rate_per_lb_1_50: number
  rate_per_lb_51_100: number
  rate_per_lb_101_200: number
  rate_per_lb_201_plus: number
  transit_days_min: number
  transit_days_max: number
  express_surcharge_percent: number
  is_active: boolean
  created_at: string
}

export interface ShippingQuote {
  id: number
  customer_id?: string
  email: string
  full_name: string
  phone?: string
  destination_id: number
  weight_lbs: number
  length_inches?: number
  width_inches?: number
  height_inches?: number
  service_type: 'standard' | 'express'
  declared_value: number
  base_shipping_cost: number
  consolidation_fee: number
  handling_fee: number
  insurance_cost: number
  total_cost: number
  estimated_transit_days?: number
  special_instructions?: string
  status: string
  quote_expires_at: string
  created_at: string
  quote_reference?: string
  quote_document_html?: string
  quote_metadata?: Record<string, any>
  follow_up_status?: string
  follow_up_due_at?: string
  last_follow_up_at?: string
  follow_up_method?: string
  follow_up_error?: string | null
  pdf_attachment_present?: boolean
}

export interface ContactInquiry {
  id: number
  full_name: string
  email: string
  phone?: string
  subject?: string
  message: string
  inquiry_type: string
  status: string
  created_at: string
}

export interface Shipment {
  id: number
  tracking_number: string
  quote_id?: number
  customer_id?: string
  destination_id: number
  weight_lbs: number
  service_type: 'standard' | 'express'
  status: string
  pickup_scheduled_at?: string
  processed_at?: string
  shipped_at?: string
  delivered_at?: string
  carrier_name?: string
  carrier_tracking_number?: string
  customs_cleared_at?: string
  delivery_notes?: string
  created_at: string
  updated_at: string
}

export interface ShippingCalculatorData {
  weight: number
  dimensions?: {
    length: number
    width: number
    height: number
  }
  destinationId: number
  serviceType: 'standard' | 'express'
  declaredValue: number
}

export interface RateBreakdown {
  ratePerLb: number
  baseShippingCost: number
  expressSurcharge: number
  consolidationFee: number
  handlingFee: number
  insuranceCost: number
  totalCost: number
}

export interface CalculatedRate {
  destination: {
    country: string
    city: string
  }
  weight: {
    actual: number
    dimensional?: number
    billable: number
  }
  serviceType: 'standard' | 'express'
  rateBreakdown: RateBreakdown
  transitTime: {
    min: number
    max: number
    estimate: string
  }
  declaredValue: number
}

// =====================================================
// BLOG CMS TYPES
// =====================================================

export type BlogPostStatus = 'draft' | 'scheduled' | 'published' | 'archived'
export type ContentType = 'blog-post' | 'guide' | 'case-study' | 'news-update' | 'faq'
export type SearchIntent = 'informational' | 'commercial' | 'transactional' | 'navigational'
export type ContentBlockType = 'paragraph' | 'heading' | 'list' | 'image' | 'callout' | 'cta' | 'code' | 'quote'

export interface ContentBlock {
  type: ContentBlockType
  level?: number // For headings (1-6)
  text?: string
  items?: string[] // For lists
  style?: string // For callouts ('info', 'warning', 'success', 'error')
  buttonText?: string // For CTAs
  buttonLink?: string // For CTAs
  altText?: string // For images
  url?: string // For images
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  meta_title: string
  meta_description: string
  content: ContentBlock[]
  excerpt?: string
  featured_image_url?: string
  featured_image_alt?: string
  author_id?: string
  status: BlogPostStatus
  published_at?: string
  scheduled_for?: string
  created_at: string
  updated_at: string
  views_count: number
  read_time_minutes?: number
  canonical_url?: string
  focus_keyword: string
  seo_score: number
  readability_score: number
  schema_markup?: Record<string, any>
  target_locations: string[]
  target_services: string[]
  categories?: BlogCategory[]
  tags?: BlogTag[]
}

export interface BlogCategory {
  id: string
  name: string
  slug: string
  description?: string
  parent_id?: string
  display_order: number
  created_at: string
}

export interface BlogTag {
  id: string
  name: string
  slug: string
  usage_count: number
  created_at: string
}

export interface SEOKeyword {
  id: string
  keyword: string
  search_volume?: number
  keyword_difficulty?: number
  search_intent?: SearchIntent
  priority: number
  target_location?: string
  related_service?: string
  current_ranking?: number
  target_ranking: number
  last_checked?: string
  created_at: string
}

export interface KeywordRankingHistory {
  id: string
  keyword_id: string
  ranking: number
  checked_at: string
  source: string
}

export interface ContentGenerationQueue {
  id: string
  target_keyword: string
  content_type: ContentType
  priority: number
  status: 'pending' | 'generating' | 'review' | 'completed' | 'failed'
  generation_prompt?: string
  generated_content?: Record<string, any>
  error_message?: string
  scheduled_for?: string
  created_at: string
  completed_at?: string
}

export interface BlogAnalytics {
  id: string
  blog_post_id: string
  date: string
  page_views: number
  unique_visitors: number
  avg_time_on_page?: number
  bounce_rate?: number
  conversion_events: number
  traffic_source?: string
  created_at: string
}

export interface InternalLink {
  id: string
  source_post_id: string
  target_post_id: string
  anchor_text: string
  link_context?: string
  created_at: string
}

export interface SEOAnalysisResult {
  overallScore: number
  titleAnalysis: {
    score: number
    hasKeyword: boolean
    length: number
    recommendations: string[]
  }
  metaDescriptionAnalysis: {
    score: number
    hasKeyword: boolean
    length: number
    hasCallToAction: boolean
    recommendations: string[]
  }
  contentAnalysis: {
    wordCount: number
    keywordDensity: number
    lsiKeywordsFound: string[]
    headingStructure: {
      hasH1: boolean
      h1Count: number
      headingLevels: number[]
      recommendations: string[]
    }
    readabilityScore: number
    recommendations: string[]
  }
  localSEOAnalysis: {
    hasLocationMentions: boolean
    locationDensity: number
    hasLocalSchema: boolean
    hasNAPConsistency: boolean
    recommendations: string[]
  }
  technicalSEO: {
    hasImageAlt: boolean
    hasInternalLinks: boolean
    internalLinkCount: number
    hasExternalLinks: boolean
    hasSchema: boolean
    recommendations: string[]
  }
}

export interface ContentGenerationConfig {
  targetKeyword: string
  relatedKeywords: string[]
  targetLocation: string
  targetService: string
  contentType: ContentType
  tone: 'professional' | 'conversational' | 'technical' | 'friendly'
  wordCount: number
  includeSchema: boolean
  competitorUrls?: string[]
}

export interface GeneratedContent {
  title: string
  metaTitle: string
  metaDescription: string
  content: ContentBlock[]
  excerpt: string
  focusKeyword: string
  seoScore: number
  readabilityScore: number
  schemaMarkup: Record<string, any>
  internalLinkSuggestions: Array<{
    anchorText: string
    targetPage: string
    context: string
  }>
  imageSuggestions: Array<{
    placement: string
    description: string
    altText: string
  }>
}