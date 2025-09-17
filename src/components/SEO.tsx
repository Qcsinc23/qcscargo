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
}

const BASE_URL = 'https://www.qcs-cargo.com'

export function SEO({
  title,
  description,
  canonicalPath,
  coverImage = '/hero-air-cargo-plane.png',
  type = 'website',
  noindex = false,
  structuredData
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

  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="QCS Cargo" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:locale" content="en_US" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />

      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  )
}
