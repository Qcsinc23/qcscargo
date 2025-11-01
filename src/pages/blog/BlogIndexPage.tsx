import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MarketingLayout } from '@/components/layout/MarketingLayout'
import { BlogService } from '@/lib/services/blog.service'
import type { BlogPost, BlogCategory } from '@/lib/types'
import { Loader2, Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'

const pageSeo = {
  title: 'Caribbean Shipping Guides & Tips | QCS Cargo Blog',
  description:
    'Explore Caribbean shipping guides, barrel packing tips, and expert advice from QCS Cargo in Kearny, NJ. Stay informed and keep your air cargo moving.',
  canonicalPath: '/blog'
} as const

export default function BlogIndexPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPosts()
    loadCategories()
  }, [selectedCategory])

  const loadPosts = async () => {
    try {
      setLoading(true)
      const options: any = {
        status: 'published',
        limit: 20
      }

      if (selectedCategory) {
        const category = categories.find(c => c.slug === selectedCategory)
        if (category) {
          // Note: BlogService.getPosts doesn't support category filtering yet
          // This would need to be added or filtered client-side
        }
      }

      const fetchedPosts = await BlogService.getPosts(options)
      setPosts(fetchedPosts)
    } catch (error) {
      console.error('Failed to load posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const fetchedCategories = await BlogService.getCategories()
      setCategories(fetchedCategories)
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  return (
    <MarketingLayout seo={pageSeo}>
      <main className="bg-white text-slate-900">
        <section className="container mx-auto px-4 py-16">
          <header className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-rose-600">Insights & Resources</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">QCS Cargo Blog</h1>
            <p className="mt-4 text-lg text-slate-600">
              Practical guides, checklists, and local expertise to help New Jersey shippers move cargo to Guyana, Jamaica, Trinidad,
              and the wider Caribbean with confidence.
            </p>
          </header>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedCategory === null
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Posts
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.slug)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    selectedCategory === category.slug
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}

          {/* Posts Grid */}
          {loading ? (
            <div className="mt-12 flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
            </div>
          ) : posts.length === 0 ? (
            <div className="mt-12 text-center py-12">
              <p className="text-slate-600">No blog posts available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  {post.featured_image_url && (
                    <div className="mb-4 aspect-video w-full overflow-hidden rounded-lg bg-slate-100">
                      <img
                        src={post.featured_image_url}
                        alt={post.featured_image_alt || post.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  {post.categories && post.categories.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {post.categories.slice(0, 2).map((category) => (
                        <span
                          key={category.id}
                          className="text-xs font-medium text-rose-600"
                        >
                          {category.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <h2 className="text-xl font-semibold text-slate-900">
                    <Link to={`/blog/${post.slug}`} className="hover:text-rose-600">
                      {post.title}
                    </Link>
                  </h2>

                  <p className="mt-3 text-sm text-slate-600 line-clamp-3">
                    {post.excerpt || post.meta_description}
                  </p>

                  <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                    {post.published_at && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(post.published_at), 'MMM d, yyyy')}
                      </div>
                    )}
                    {post.read_time_minutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.read_time_minutes} min read
                      </div>
                    )}
                  </div>

                  <Link
                    to={`/blog/${post.slug}`}
                    className="mt-6 inline-flex items-center text-sm font-semibold text-rose-600 hover:text-rose-700"
                    aria-label={`Read ${post.title}`}
                  >
                    Read the guide
                    <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </article>
              ))}
            </div>
          )}

          <div className="mt-16 rounded-2xl bg-slate-900 px-8 py-10 text-white">
            <h2 className="text-2xl font-semibold">Need advice for your next shipment?</h2>
            <p className="mt-3 max-w-2xl text-slate-100">
              QCS Cargo offers personalized quotes, packing help, and fast flight schedules from Kearny, NJ to your preferred
              Caribbean destination.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/shipping-calculator"
                className="inline-flex items-center justify-center rounded-lg bg-rose-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600"
              >
                Get a Free Quote
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-lg border border-white/40 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Talk with Our Team
              </Link>
            </div>
          </div>
        </section>
      </main>
    </MarketingLayout>
  )
}
