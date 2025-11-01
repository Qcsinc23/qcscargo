import type { BlogPost, BlogCategory } from '../types'

/**
 * Schema Markup Generator Service
 * Generates JSON-LD structured data for SEO
 */
export class SchemaMarkupGenerator {
  /**
   * Generate Article schema for blog posts
   */
  static generateArticleSchema(post: BlogPost, authorName?: string, siteUrl?: string): object {
    const baseUrl = siteUrl || 'https://qcscargo.com'
    const articleUrl = `${baseUrl}/blog/${post.slug}`

    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.meta_description,
      image: post.featured_image_url
        ? [
            `${baseUrl}${post.featured_image_url}`,
            ...(post.schema_markup?.image || [])
          ]
        : undefined,
      datePublished: post.published_at || post.created_at,
      dateModified: post.updated_at,
      author: {
        '@type': 'Organization',
        name: authorName || 'Qualified Cargo Solutions',
        url: baseUrl
      },
      publisher: {
        '@type': 'Organization',
        name: 'Qualified Cargo Solutions',
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/logo.png`
        },
        url: baseUrl
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': articleUrl
      },
      url: articleUrl,
      ...(post.categories && post.categories.length > 0
        ? {
            articleSection: post.categories.map(c => c.name).join(', ')
          }
        : {}),
      keywords: [
        post.focus_keyword,
        ...(post.tags?.map(t => t.name) || []),
        ...post.target_locations,
        ...post.target_services
      ].filter(Boolean)
    }
  }

  /**
   * Generate LocalBusiness schema with Service Area
   */
  static generateLocalBusinessSchema(
    services: string[],
    serviceAreas: string[]
  ): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'Qualified Cargo Solutions',
      description:
        'Premium air cargo shipping and package forwarding services from New Jersey to the Caribbean',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Newark',
        addressRegion: 'NJ',
        addressCountry: 'US'
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 40.7357,
        longitude: -74.1724
      },
      url: 'https://qcscargo.com',
      telephone: '+1-XXX-XXX-XXXX', // Update with actual phone
      priceRange: '$$',
      areaServed: serviceAreas.map(area => ({
        '@type': 'City',
        name: area
      })),
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Shipping Services',
        itemListElement: services.map((service, index) => ({
          '@type': 'Offer',
          position: index + 1,
          itemOffered: {
            '@type': 'Service',
            name: service,
            serviceType: 'Shipping Service'
          }
        }))
      }
    }
  }

  /**
   * Generate BreadcrumbList schema for navigation
   */
  static generateBreadcrumbSchema(
    breadcrumbs: Array<{ name: string; url: string }>
  ): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.url
      }))
    }
  }

  /**
   * Generate FAQ schema from content
   */
  static generateFAQSchema(
    faqs: Array<{ question: string; answer: string }>
  ): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    }
  }

  /**
   * Generate HowTo schema for guides
   */
  static generateHowToSchema(
    name: string,
    description: string,
    steps: Array<{ name: string; text: string; image?: string }>
  ): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name,
      description,
      step: steps.map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step.name,
        text: step.text,
        ...(step.image
          ? {
              image: {
                '@type': 'ImageObject',
                url: step.image
              }
            }
          : {})
      }))
    }
  }

  /**
   * Generate Service schema
   */
  static generateServiceSchema(
    serviceName: string,
    description: string,
    serviceType: string,
    areaServed: string[]
  ): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: serviceName,
      description,
      serviceType,
      provider: {
        '@type': 'LocalBusiness',
        name: 'Qualified Cargo Solutions',
        url: 'https://qcscargo.com'
      },
      areaServed: areaServed.map(area => ({
        '@type': 'City',
        name: area
      }))
    }
  }

  /**
   * Generate Organization schema
   */
  static generateOrganizationSchema(): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Qualified Cargo Solutions',
      url: 'https://qcscargo.com',
      logo: 'https://qcscargo.com/logo.png',
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+1-XXX-XXX-XXXX', // Update with actual phone
        contactType: 'customer service',
        areaServed: ['US', 'Caribbean'],
        availableLanguage: ['English']
      },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Newark',
        addressRegion: 'NJ',
        postalCode: '07102',
        addressCountry: 'US'
      },
      sameAs: [
        // Add social media profiles when available
      ]
    }
  }

  /**
   * Combine multiple schemas into a single JSON-LD script
   */
  static combineSchemas(schemas: object[]): string {
    // If only one schema, return it directly
    if (schemas.length === 1) {
      return JSON.stringify(schemas[0], null, 2)
    }

    // Multiple schemas should be in an array
    return JSON.stringify(schemas, null, 2)
  }

  /**
   * Generate comprehensive schema for a blog post
   */
  static generateBlogPostSchemas(
    post: BlogPost,
    options: {
      authorName?: string
      siteUrl?: string
      includeOrganization?: boolean
      includeBreadcrumbs?: boolean
      breadcrumbs?: Array<{ name: string; url: string }>
      includeFAQ?: boolean
      faqs?: Array<{ question: string; answer: string }>
      includeHowTo?: boolean
      howToSteps?: Array<{ name: string; text: string; image?: string }>
    } = {}
  ): object[] {
    const schemas: object[] = []

    // Always include Article schema
    schemas.push(this.generateArticleSchema(post, options.authorName, options.siteUrl))

    // Include Organization schema if requested
    if (options.includeOrganization !== false) {
      schemas.push(this.generateOrganizationSchema())
    }

    // Include BreadcrumbList if provided
    if (options.includeBreadcrumbs && options.breadcrumbs) {
      schemas.push(this.generateBreadcrumbSchema(options.breadcrumbs))
    }

    // Include FAQ schema if provided
    if (options.includeFAQ && options.faqs && options.faqs.length > 0) {
      schemas.push(this.generateFAQSchema(options.faqs))
    }

    // Include HowTo schema if provided
    if (options.includeHowTo && options.howToSteps && options.howToSteps.length > 0) {
      schemas.push(
        this.generateHowToSchema(
          post.title,
          post.meta_description,
          options.howToSteps
        )
      )
    }

    // Include LocalBusiness schema if targeting local SEO
    if (post.target_locations && post.target_locations.length > 0) {
      schemas.push(
        this.generateLocalBusinessSchema(
          post.target_services || [],
          post.target_locations
        )
      )
    }

    return schemas
  }

  /**
   * Convert schema object(s) to JSON-LD script tag HTML
   */
  static toScriptTag(schemas: object | object[]): string {
    const schemaJson = Array.isArray(schemas)
      ? JSON.stringify(schemas, null, 2)
      : JSON.stringify(schemas, null, 2)

    return `<script type="application/ld+json">${schemaJson}</script>`
  }
}

