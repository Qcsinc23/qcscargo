import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { MarketingLayout } from '@/components/layout/MarketingLayout'
import { BlogService } from '@/lib/services/blog.service'
import { SchemaMarkupGenerator } from '@/lib/services/schema-markup.service'
import { BlogAnalyticsService } from '@/lib/services/blog-analytics.service'
import type { BlogPost, ContentBlock } from '@/lib/types'
import { format } from 'date-fns'
import { Calendar, Clock, ArrowLeft, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function BlogPostView() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([])
  const cleanupRef = useRef<(() => void) | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (slug) {
      loadPost(slug)
    }

    return () => {
      // Cleanup analytics tracking
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    }
  }, [slug])

  const loadPost = async (postSlug: string) => {
    try {
      setLoading(true)
      
      // Clean up previous tracking if exists
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }

      const loadedPost = await BlogService.getPostBySlug(postSlug)
      
      if (!loadedPost) {
        navigate('/blog', { replace: true })
        toast.error('Blog post not found')
        return
      }

      setPost(loadedPost)

      // Track view and analytics
      await BlogService.incrementViewCount(loadedPost.id)
      
      // Track analytics
      BlogAnalyticsService.trackPageView(loadedPost.id, {
        referrer: document.referrer,
        trafficSource: undefined // Will be auto-detected
      })

      // Track time on page when user leaves
      startTimeRef.current = Date.now()
      
      const handleBeforeUnload = () => {
        if (startTimeRef.current) {
          const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000)
          if (timeSpent > 3) {
            BlogAnalyticsService.trackTimeOnPage(loadedPost.id, timeSpent)
          }
        }
      }

      window.addEventListener('beforeunload', handleBeforeUnload)
      
      // Also track on visibility change (tab switch/close)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden' && startTimeRef.current) {
          const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000)
          if (timeSpent > 3) {
            BlogAnalyticsService.trackTimeOnPage(loadedPost.id, timeSpent)
          }
        }
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)

      // Store cleanup function
      cleanupRef.current = () => {
        window.removeEventListener('beforeunload', handleBeforeUnload)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        
        // Final time tracking
        if (startTimeRef.current) {
          const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000)
          if (timeSpent > 3) {
            BlogAnalyticsService.trackTimeOnPage(loadedPost.id, timeSpent)
          }
        }
      }

      // Load related posts
      loadRelatedPosts(loadedPost)
    } catch (error) {
      console.error('Failed to load post:', error)
      toast.error('Failed to load blog post')
      navigate('/blog', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  const loadRelatedPosts = async (currentPost: BlogPost | null) => {
    if (!currentPost) return
    
    try {
      const allPosts = await BlogService.getPosts({ status: 'published', limit: 10 })
      const related = allPosts
        .filter(p => p.id !== currentPost.id)
        .filter(p => {
          // Find posts with matching categories or target services
          const sharedCategories = currentPost.categories?.some(cat =>
            p.categories?.some(pc => pc.id === cat.id)
          )
          const sharedServices = currentPost.target_services.some(service =>
            p.target_services.includes(service)
          )
          return sharedCategories || sharedServices
        })
        .slice(0, 3)
      
      setRelatedPosts(related)
    } catch (error) {
      console.error('Failed to load related posts:', error)
    }
  }

  const renderContentBlock = (block: ContentBlock, index: number) => {
    switch (block.type) {
      case 'heading':
        const HeadingTag = `h${block.level || 2}` as keyof JSX.IntrinsicElements
        return (
          <HeadingTag
            key={index}
            className={`${
              block.level === 1
                ? 'text-4xl font-bold mt-8 mb-4'
                : block.level === 2
                ? 'text-3xl font-bold mt-8 mb-4'
                : block.level === 3
                ? 'text-2xl font-semibold mt-6 mb-3'
                : 'text-xl font-semibold mt-4 mb-2'
            } text-slate-900`}
          >
            {block.text}
          </HeadingTag>
        )

      case 'paragraph':
        return (
          <p key={index} className="mb-4 text-slate-700 leading-relaxed">
            {block.text}
          </p>
        )

      case 'list':
        return (
          <ul key={index} className="mb-4 list-disc list-inside space-y-2 text-slate-700">
            {block.items?.map((item, itemIndex) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </ul>
        )

      case 'image':
        return (
          <div key={index} className="my-8">
            <img
              src={block.url}
              alt={block.altText || ''}
              className="w-full rounded-lg"
            />
            {block.altText && (
              <p className="mt-2 text-sm text-slate-500 text-center">{block.altText}</p>
            )}
          </div>
        )

      case 'callout':
        const calloutStyles = {
          info: 'bg-blue-50 border-blue-200 text-blue-900',
          warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
          success: 'bg-green-50 border-green-200 text-green-900',
          error: 'bg-red-50 border-red-200 text-red-900'
        }
        return (
          <div
            key={index}
            className={`my-6 rounded-lg border p-4 ${calloutStyles[block.style as keyof typeof calloutStyles] || calloutStyles.info}`}
          >
            <p>{block.text}</p>
          </div>
        )

      case 'cta':
        return (
          <div key={index} className="my-8 rounded-lg bg-slate-900 p-6 text-center text-white">
            <p className="mb-4 text-lg">{block.text}</p>
            <Link
              to={block.buttonLink || '/quote'}
              className="inline-flex items-center justify-center rounded-lg bg-rose-500 px-6 py-3 font-semibold text-white transition hover:bg-rose-600"
            >
              {block.buttonText || 'Get Quote'}
            </Link>
          </div>
        )

      default:
        return null
    }
  }

  const handleShare = async () => {
    if (navigator.share && post) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt || post.meta_description,
          url: window.location.href
        })
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard')
    }
  }

  if (loading || !post) {
    return (
      <MarketingLayout seo={{
        title: 'Loading...',
        description: 'Loading blog post'
      }}>
        <div className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
          </div>
        </div>
      </MarketingLayout>
    )
  }

  const schemas = SchemaMarkupGenerator.generateBlogPostSchemas(post, {
    includeOrganization: true,
    includeBreadcrumbs: true,
    breadcrumbs: [
      { name: 'Home', url: 'https://qcscargo.com' },
      { name: 'Blog', url: 'https://qcscargo.com/blog' },
      { name: post.title, url: `https://qcscargo.com/blog/${post.slug}` }
    ]
  })

  const schemaJsonLd = SchemaMarkupGenerator.combineSchemas(schemas)

  return (
    <>
      <Helmet>
        <title>{post.meta_title || post.title}</title>
        <meta name="description" content={post.meta_description} />
        {post.canonical_url && <link rel="canonical" href={post.canonical_url} />}
        <meta property="og:title" content={post.meta_title || post.title} />
        <meta property="og:description" content={post.meta_description} />
        <meta property="og:type" content="article" />
        {post.featured_image_url && (
          <meta property="og:image" content={post.featured_image_url} />
        )}
        <meta property="og:url" content={`https://qcscargo.com/blog/${post.slug}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.meta_title || post.title} />
        <meta name="twitter:description" content={post.meta_description} />
        {post.featured_image_url && (
          <meta name="twitter:image" content={post.featured_image_url} />
        )}
        <script type="application/ld+json">{schemaJsonLd}</script>
      </Helmet>

      <MarketingLayout seo={{
        title: post.meta_title || post.title,
        description: post.meta_description,
        canonicalPath: `/blog/${post.slug}`
      }}>
        <main className="bg-white text-slate-900">
          <article className="container mx-auto px-4 py-8 lg:py-16">
            {/* Back Button */}
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => navigate('/blog')}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Blog
              </Button>
            </div>

            {/* Header */}
            <header className="mb-8">
              {post.categories && post.categories.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {post.categories.map((category) => (
                    <span
                      key={category.id}
                      className="rounded-full bg-rose-100 px-3 py-1 text-sm font-medium text-rose-700"
                    >
                      {category.name}
                    </span>
                  ))}
                </div>
              )}

              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
                {post.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-6">
                {post.published_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(post.published_at), 'MMMM d, yyyy')}
                  </div>
                )}
                {post.read_time_minutes && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {post.read_time_minutes} min read
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>

              {post.featured_image_url && (
                <div className="mb-8 aspect-video w-full overflow-hidden rounded-2xl bg-slate-100">
                  <img
                    src={post.featured_image_url}
                    alt={post.featured_image_alt || post.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </header>

            {/* Content */}
            <div className="max-w-3xl mx-auto prose prose-slate prose-lg">
              {post.content.map((block, index) => renderContentBlock(block, index))}
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-12 max-w-3xl mx-auto">
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600"
                    >
                      #{tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* CTA Section */}
            <div className="mt-16 max-w-3xl mx-auto rounded-2xl bg-slate-900 px-8 py-10 text-white text-center">
              <h2 className="text-2xl font-semibold mb-4">Ready to Ship to the Caribbean?</h2>
              <p className="mb-6 text-slate-100">
                Get a free quote for your shipment from New Jersey to the Caribbean today.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  to="/shipping-calculator"
                  className="inline-flex items-center justify-center rounded-lg bg-rose-500 px-6 py-3 font-semibold text-white transition hover:bg-rose-600"
                >
                  Get a Free Quote
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center rounded-lg border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  Contact Us
                </Link>
              </div>
            </div>

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <div className="mt-16 max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Related Posts</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {relatedPosts.map((relatedPost) => (
                    <Link
                      key={relatedPost.id}
                      to={`/blog/${relatedPost.slug}`}
                      className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        {relatedPost.title}
                      </h3>
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {relatedPost.excerpt || relatedPost.meta_description}
                      </p>
                      <span className="mt-4 text-sm font-semibold text-rose-600">
                        Read more →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>
        </main>
      </MarketingLayout>
    </>
  )
}

