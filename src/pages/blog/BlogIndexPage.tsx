import React from 'react'
import { Link } from 'react-router-dom'
import { MarketingLayout } from '@/components/layout/MarketingLayout'

const pageSeo = {
  title: 'Caribbean Shipping Guides & Tips | QCS Cargo Blog',
  description:
    'Explore Caribbean shipping guides, barrel packing tips, and expert advice from QCS Cargo in Kearny, NJ. Stay informed and keep your air cargo moving.',
  canonicalPath: '/blog'
} as const

const posts = [
  {
    title: 'The Complete Guide to Shipping to Guyana from New Jersey',
    description:
      'Understand customs rules, packing best practices, and why partnering with a local New Jersey air cargo expert keeps your shipments on schedule.',
    to: '/blog/shipping-to-guyana-guide'
  },
  {
    title: 'Shipping a Barrel to Jamaica from NJ: A Step-by-Step Guide',
    description:
      'From sourcing the right barrel to clearing Jamaican customs, learn how to prepare your shipment the QCS Cargo way.',
    to: '/blog/shipping-barrel-to-jamaica'
  },
  {
    title: 'Why a Local NJ Specialist Beats Global Shippers for Caribbean Cargo',
    description:
      'See how local expertise, transparent pricing, and community-focused service make QCS Cargo the smart choice for Caribbean shipments.',
    to: '/blog/nj-vs-global-shippers'
  }
]

export default function BlogIndexPage() {
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

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post.to}
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <h2 className="text-xl font-semibold text-slate-900">
                  <Link to={post.to} className="hover:text-rose-600">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-3 text-sm text-slate-600">{post.description}</p>
                <Link
                  to={post.to}
                  className="mt-6 inline-flex items-center text-sm font-semibold text-rose-600 hover:text-rose-700"
                  aria-label={`Read ${post.title}`}
                >
                  Read the guide
                </Link>
              </article>
            ))}
          </div>

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
