import React from 'react'
import { Link } from 'react-router-dom'
import { MarketingLayout } from '@/components/layout/MarketingLayout'

const pageSeo = {
  title: 'Why a Local NJ Specialist Beats Global Shippers for Caribbean Cargo',
  description:
    'Not all shippers are the same. Discover the benefits of using a local New Jersey specialist like QCS Cargo for your shipments to the Caribbean.',
  canonicalPath: '/blog/nj-vs-global-shippers',
  type: 'article'
} as const

export default function NjVsGlobalShippers() {
  return (
    <MarketingLayout seo={pageSeo}>
      <article className="bg-white text-slate-900">
        <div className="container mx-auto px-4 py-16">
          <header className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-rose-600">Why Local Matters</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
              Why a Local NJ Specialist Beats Global Shippers for Caribbean Cargo
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Global logistics brands may have scale, but QCS Cargo pairs that capability with neighborhood service for New
              Jersey shippers. Here&apos;s how local expertise keeps your cargo moving smoothly to the Caribbean.
            </p>
          </header>

          <div className="prose prose-slate mt-12 max-w-none prose-headings:text-slate-950 prose-a:text-rose-600">
            <h2>Personalized Service: We Know Our Community</h2>
            <p>
              Caribbean families, restauranteurs, and retailers in Essex, Hudson, and Bergen counties rely on quick turnarounds
              and flexible drop-off times. Our Kearny warehouse team recognizes familiar faces, helps load heavy barrels, and
              offers bilingual support so nothing is lost in translation.
            </p>

            <h2>Expertise in Caribbean Customs</h2>
            <p>
              Each island enforces different paperwork and duty rules. QCS Cargo keeps real-time checklists for Guyana, Jamaica,
              Trinidad and Tobago, Barbados, and the Dominican Republic. We review your documents before your cargo reaches the
              airport, preventing customs holds that commonly trip up big-box shippers.
            </p>

            <h2>Transparent, Simple Pricing</h2>
            <p>
              You will never guess what a surcharge means with QCS Cargo. We break down air freight, handling, and destination
              fees in plain language so you can budget confidently. Our quotes are tailored to Caribbean trade lanes rather than
              generic global rates.
            </p>

            <h2>Easy Drop-Off in Kearny, NJ</h2>
            <p>
              We are minutes from Newark Liberty International Airport and major highways. Park right outside our warehouse,
              get help unloading, and finish paperwork in one visit. Evening and weekend appointments ensure you can ship on
              your schedule, not a distant corporate timetable.
            </p>

            <p className="mt-8 text-sm text-slate-500">
              Note: QCS Cargo is not affiliated with or part of any European logistics company named “QCS-Quick Cargo Service.”
              We are independently owned and focused on serving the Caribbean diaspora in New Jersey.
            </p>

            <div className="mt-10 rounded-2xl bg-rose-50 p-6 text-slate-900">
              <h2 className="text-2xl font-semibold text-rose-700">Ready to ship?</h2>
              <p className="mt-2">
                Contact QCS Cargo today for a free quote! Call <a href="tel:2012490929">201-249-0929</a> or
                <Link to="/shipping-calculator" className="font-semibold text-rose-600 hover:text-rose-700">
                  {' '}
                  get started online
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </article>
    </MarketingLayout>
  )
}
