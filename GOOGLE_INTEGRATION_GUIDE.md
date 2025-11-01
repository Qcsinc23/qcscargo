# Google Search Console & Analytics Integration Guide

## Overview
This guide explains how to integrate Google Search Console and Google Analytics with your blog CMS for comprehensive SEO tracking and analytics.

## Google Search Console Setup

### 1. Verify Website Ownership

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `https://qcscargo.com`
3. Choose verification method:
   - **HTML file upload**: Upload verification file to `/public/` directory
   - **HTML tag**: Add meta tag to `index.html`
   - **DNS record**: Add TXT record to domain DNS

### 2. Submit Sitemap

Create a sitemap at `/public/sitemap.xml` that includes:
- All blog posts
- Main pages
- Category pages

Example structure:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://qcscargo.com/blog</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- Blog posts -->
  <url>
    <loc>https://qcscargo.com/blog/air-cargo-shipping-new-jersey</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

Submit sitemap URL in Search Console:
- `https://qcscargo.com/sitemap.xml`

### 3. Monitor Performance

Track in Search Console:
- **Search queries**: Which keywords bring traffic
- **Click-through rate**: How often your posts appear in search results
- **Average position**: Where you rank for each keyword
- **Impressions**: How often your content appears in search

## Google Analytics 4 Setup

### 1. Create GA4 Property

1. Go to [Google Analytics](https://analytics.google.com)
2. Create new GA4 property
3. Get Measurement ID (format: `G-XXXXXXXXXX`)

### 2. Install Tracking Code

Add to `index.html` in `<head>`:

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

Or use environment variable:
```env
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 3. Enhanced E-commerce Events

Track blog conversions:
- `page_view` - Automatic
- `blog_post_view` - Custom event
- `quote_request` - Conversion event
- `time_on_page` - Engagement metric

### 4. Custom Dimensions

Set up custom dimensions:
- Blog post category
- Blog post author
- Target location
- Target service
- SEO score
- Content type

## Integration Implementation

### Search Console API Integration

1. Enable Search Console API in Google Cloud Console
2. Create service account
3. Download JSON credentials
4. Add to `.env.local`:
```env
GOOGLE_SEARCH_CONSOLE_CREDENTIALS_PATH=./credentials/search-console.json
```

### Analytics API Integration

1. Enable Analytics Reporting API
2. Create service account
3. Add service account email to GA4 property with "Viewer" role
4. Add credentials to `.env.local`:
```env
GOOGLE_ANALYTICS_CREDENTIALS_PATH=./credentials/analytics.json
```

## Automated Monitoring

### Daily Reports

Set up automated daily reports:
- Top performing keywords
- Ranking changes
- Click-through rate trends
- Traffic sources

### Alerts

Configure alerts for:
- Ranking drops (>5 positions)
- Traffic drops (>20%)
- Indexing errors
- Broken links

## Best Practices

1. **Submit new posts immediately** after publishing
2. **Monitor search queries** weekly for new opportunities
3. **Track ranking positions** for priority keywords
4. **Analyze CTR** and optimize meta descriptions
5. **Review indexing status** regularly
6. **Fix crawl errors** promptly

## Environment Variables

Add to production environment:
```env
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
GOOGLE_SEARCH_CONSOLE_CREDENTIALS_PATH=/path/to/credentials.json
GOOGLE_ANALYTICS_CREDENTIALS_PATH=/path/to/credentials.json
```

## Next Steps

1. Verify website ownership in Search Console
2. Submit sitemap
3. Install GA4 tracking code
4. Set up custom events
5. Configure automated reports
6. Set up monitoring alerts

