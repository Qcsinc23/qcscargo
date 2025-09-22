import React from 'react'
import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'

type SEOProps = {
  title: string
  description: string
  canonicalPath?: string
  coverImage?: string
  type?: 'website' | 'article'
  noindex?: boolean
  structuredData?: Record<string, unknown> | Array<unknown>
  preloadImages?: string[]
  criticalImages?: string[]
}

const BASE_URL = 'https://www.qcs-cargo.com'

export function SEO({
  title,
  description,
  canonicalPath,
  coverImage = '/hero-air-cargo-plane.png',
  type = 'website',
  noindex = false,
  structuredData,
  preloadImages = [],
  criticalImages = []
}: SEOProps) {
  const location = useLocation()

  const canonical = canonicalPath
    ? canonicalPath.startsWith('http')
      ? canonicalPath
      : `${BASE_URL}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`
    : `${BASE_URL}${location.pathname}${location.search}`

  const absoluteImage = coverImage.startsWith('http')
    ? coverImage
    : `${BASE_URL}${coverImage.startsWith('/') ? coverImage : `/${coverImage}`}`

  const titleHasBrand = /qcs cargo/i.test(title)
  const fullTitle = titleHasBrand ? title : `${title} | QCS Cargo`

  const normalizedDescription = description.trim()
  const needsCta = !/201-249-0929/.test(normalizedDescription)
  const ctaSuffix = ' Call 201-249-0929 for a custom air cargo quote today.'
  const augmentedDescription = needsCta
    ? `${normalizedDescription}${normalizedDescription.endsWith('.') ? '' : '.'}${ctaSuffix}`
    : normalizedDescription
  const fullDescription = augmentedDescription.length > 160
    ? `${augmentedDescription.slice(0, 157)}…`
    : augmentedDescription

  // Generate preload links for critical images
  const allCriticalImages = [...criticalImages]
  if (coverImage && !allCriticalImages.includes(coverImage)) {
    allCriticalImages.unshift(coverImage)
  }

  return (
    <Helmet prioritizeSeoTags>
      {/* Preload critical images for LCP optimization */}
      {allCriticalImages.map((imageUrl) => {
        const absoluteUrl = imageUrl.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl}`
        const imageName = imageUrl.split('/').pop()?.split('.')[0] || 'image'
        
        return [
          <link
            key={`${imageUrl}-webp`}
            rel="preload"
            as="image"
            href={`${absoluteUrl.replace(/\.(png|jpg|jpeg)$/i, '.webp')}`}
            type="image/webp"
          />,
          <link
            key={`${imageUrl}-avif`}
            rel="preload"
            as="image"
            href={`${absoluteUrl.replace(/\.(png|jpg|jpeg)$/i, '.avif')}`}
            type="image/avif"
          />,
          <link
            key={`${imageUrl}-fallback`}
            rel="preload"
            as="image"
            href={absoluteUrl}
            type={`image/${imageUrl.split('.').pop()?.toLowerCase() || 'jpeg'}`}
          />
        ]
      })}
      
      {/* Preload additional images */}
      {preloadImages.map((imageUrl) => {
        const absoluteUrl = imageUrl.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl}`
        return (
          <link
            key={imageUrl}
            rel="preload"
            as="image"
            href={absoluteUrl}
            type={`image/${imageUrl.split('.').pop()?.toLowerCase() || 'jpeg'}`}
          />
        )
      })}
      
      {/* DNS prefetch for external domains */}
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//fonts.gstatic.com" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="QCS Cargo" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:locale" content="en_US" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={absoluteImage} />

      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  )
}
