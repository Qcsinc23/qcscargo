import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')
const publicDir = join(projectRoot, 'public')
const viteTempDir = join(projectRoot, 'node_modules', '.vite-temp')

const preferredBaseUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL
const vercelBaseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
const baseUrl = (preferredBaseUrl || vercelBaseUrl || 'https://www.qcs-cargo.com').replace(/\/$/, '')

const routes = [
  '/',
  '/shipping-calculator',
  '/how-it-works',
  '/contact',
  '/faq',
  '/service-areas',
  '/about',
  '/business-services',
  '/air-cargo-shipping',
  '/tracking',
  '/rates',
  '/support',
  '/privacy-policy',
  '/terms'
]

const today = new Date().toISOString().split('T')[0]

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
  .map((route) => `  <url>\n    <loc>${baseUrl}${route}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`)
  .join('\n')}\n</urlset>\n`

const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`

if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true })
}

writeFileSync(join(publicDir, 'sitemap.xml'), sitemap)
writeFileSync(join(publicDir, 'robots.txt'), robotsTxt)

if (existsSync(viteTempDir)) {
  rmSync(viteTempDir, { recursive: true, force: true })
}

console.log('Generated sitemap.xml & robots.txt for ' + baseUrl)
