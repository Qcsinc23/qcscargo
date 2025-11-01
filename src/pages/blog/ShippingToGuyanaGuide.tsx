import React from 'react'
import { Link } from 'react-router-dom'
import { MarketingLayout } from '@/components/layout/MarketingLayout'

const pageSeo = {
  title: 'The Complete Guide to Shipping to Guyana from New Jersey',
  description:
    'Shipping to Guyana from NJ? Our guide covers customs, restricted items, costs, and how to pack your shipment safely with QCS Cargo in Kearny.',
  canonicalPath: '/blog/shipping-to-guyana-guide',
  type: 'article'
} as const

export default function ShippingToGuyanaGuide() {
  return (
    <MarketingLayout seo={pageSeo}>
      <article className="bg-white text-slate-900">
        <div className="container mx-auto px-4 py-16">
          <header className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-rose-600">Guyana Shipping Guide</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
              The Complete Guide to Shipping to Guyana from New Jersey
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Plan your next shipment from Kearny, NJ to Georgetown, Guyana with confidence. From flight schedules to customs
              paperwork, QCS Cargo walks you through the process step-by-step.
            </p>
          </header>

          <div className="prose prose-slate mt-12 max-w-none prose-headings:text-slate-950 prose-a:text-rose-600">
            <h2>Understanding Your Shipping Options (Air vs. Sea)</h2>
            <p>
              Most families and small businesses choose air freight when time is critical. QCS Cargo consolidates weekly flights
              from Newark and JFK to Guyana, giving you a 3-5 day transit window. Sea freight can be an alternative for bulky
              cargo, but expect longer transit times—often four to six weeks. We help you weigh speed, cost, and cargo type so
              you pick the right mode.
            </p>

            <h2>What You Can (and Can’t) Ship: Guyana Customs Rules</h2>
            <p>
              Guyana Revenue Authority limits the import of hazardous materials, counterfeit goods, and perishable food without
              proper permits. Everyday household items, clothing, electronics, and commercial samples are typically cleared with
              an invoice and packing list. Our team reviews your manifest before drop-off to flag restricted items and prepare
              customs-ready documentation.
            </p>

            <h2>How to Calculate Your Cost</h2>
            <p>
              Air cargo pricing is based on chargeable weight, which compares actual weight to volumetric weight. Measure your
              boxes (length × width × height in inches) and divide by 166 to calculate dimensional pounds. QCS Cargo provides a
              transparent quote that combines freight, handling, and destination fees so you know your total before you deliver
              the shipment.
            </p>

            <h2>Packaging Your Items Safely</h2>
            <p>
              Use double-wall boxes for heavy goods, cushion fragile items with bubble wrap, and seal every seam with reinforced
              tape. Label each package with the recipient&apos;s full name, phone number, and address in Guyana. We can shrink-wrap
              pallets and provide tamper-proof seals for added security.
            </p>

            <h2>Why Choose a Local NJ Specialist like QCS Cargo</h2>
            <p>
              QCS Cargo understands the Caribbean community in New Jersey. You get bilingual support, flexible evening drop-off
              hours in Kearny, and proactive tracking updates. Our TSA-certified team keeps your cargo moving from warehouse to
              runway, so loved ones and customers in Guyana receive their goods on time.
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
