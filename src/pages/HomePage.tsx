import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle,
  MapPin,
  Plane,
  PlaneTakeoff,
  ShieldCheck,
  Sparkles,
  Star
} from 'lucide-react'
import { MarketingLayout } from '@/components/layout/MarketingLayout'
import AddressInlineBadge from '@/components/AddressInlineBadge'
import { useVirtualAddress } from '@/hooks/useVirtualAddress'
import { featureFlags } from '@/lib/featureFlags'
import {
  destinations,
  heroHighlights,
  logisticsSolutions,
  operationsHighlights,
  processSteps,
  servicePillars,
  stats,
  testimonials,
  whyChooseFeatures
} from '@/data/homepage'

const pageSeo = {
  title: 'Precision Air Cargo to the Caribbean | QCS Cargo',
  description: 'Ship from New Jersey to the Caribbean with QCS Cargo. Fast consolidation, secure handling, and door-to-door support.',
  canonicalPath: '/',
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'QCS Cargo',
    url: 'https://www.qcs-cargo.com/',
    logo: 'https://www.qcs-cargo.com/QCS_Cargo_Logo.png'
  }
} as const

export default function HomePage() {
  const navigate = useNavigate()
  const { address, mailboxNumber, loading: addressLoading } = useVirtualAddress()
  const showVirtualMailboxUi = featureFlags.virtualMailboxUi

  return (
    <MarketingLayout seo={pageSeo}>
      <div className="bg-white text-slate-900">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-slate-950 text-white">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-800/90 via-slate-950 to-slate-950" />
            <img
              src="/hero-air-cargo-plane.png"
              alt="Air cargo aircraft taxiing at night"
              className="h-full w-full object-cover opacity-20"
            />
            <div className="absolute left-1/2 top-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500/40 blur-[160px]" />
          </div>
          <div className="relative container mx-auto grid gap-12 px-4 py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm font-medium uppercase tracking-wide text-white/80 ring-1 ring-white/20 backdrop-blur">
                <Sparkles className="mr-2 h-4 w-4 text-pink-200" /> Trusted air freight to the Caribbean
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Precision Air Cargo from New Jersey to the Caribbean
              </h1>
              <p className="max-w-xl text-base text-slate-100/90 sm:text-lg">
                Consolidate, secure, and ship your cargo with our dedicated Caribbean logistics team. We manage everything from
                warehouse intake to delivery coordination so your cargo arrives on time and intact.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/shipping-calculator"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-fuchsia-500 px-6 text-base font-semibold text-white shadow-lg shadow-rose-900/30 transition hover:bg-fuchsia-600"
                >
                  Get Free Quote
                </Link>
                <Link
                  to="/how-it-works"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-white/30 px-6 text-base font-semibold text-white transition hover:bg-white/10"
                >
                  Learn How It Works
                </Link>
              </div>
              <div className="flex flex-col gap-2 text-sm text-slate-100/70 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-emerald-300" /> Licensed TSA known shipper
                </div>
                <div className="hidden h-4 w-px bg-white/40 sm:block" />
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-rose-200" /> Consolidation optimized for savings
                </div>
              </div>
              {showVirtualMailboxUi && (
                <div className="pt-2">
                  <AddressInlineBadge
                    address={address}
                    mailboxNumber={mailboxNumber}
                    loading={addressLoading}
                    onGetAddressClick={() => navigate('/auth/register?returnUrl=/dashboard')}
                  />
                </div>
              )}
              <div className="grid gap-4 pt-6 sm:grid-cols-3">
                {heroHighlights.map((item, index) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={index}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20 backdrop-blur"
                    >
                      <Icon className="mb-3 h-8 w-8 text-pink-200" />
                      <h3 className="text-base font-semibold text-white">{item.title}</h3>
                      <p className="mt-1 text-sm text-slate-100/80">{item.description}</p>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="relative">
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl shadow-black/40 backdrop-blur">
                <div className="relative overflow-hidden rounded-2xl">
                  <img
                    src="/hero-air-cargo-plane.png"
                    alt="QCS Cargo aircraft ready for departure"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-rose-900/70 via-rose-700/20 to-transparent" />
                </div>
                <div className="mt-4 rounded-2xl bg-slate-900/80 p-4 text-sm text-slate-100/90">
                  <div className="flex items-center gap-2 font-semibold">
                    <Plane className="h-4 w-4 text-pink-200" /> JFK ➜ GEO weekly flight window
                  </div>
                  <p className="mt-2 text-xs text-slate-300">
                    Booking closes every Tuesday at 4PM for Friday departures. Dedicated handling for temperature-sensitive and
                    fragile shipments.
                  </p>
                </div>
              </div>
              <div className="absolute -bottom-10 left-1/2 hidden w-[260px] -translate-x-1/2 rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-white shadow-lg shadow-black/30 backdrop-blur md:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/80">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/70">Trending route</p>
                    <p className="font-semibold">Newark, NJ ➜ Georgetown, GY</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-white/70">
                  <span>Transit 3-5 days</span>
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4 text-emerald-200" /> Pro handling
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-b border-rose-100 bg-white">
          <div className="container mx-auto px-4 py-12">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-rose-100 bg-rose-50/60 p-6 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="text-3xl font-bold text-rose-900">{stat.number}</div>
                  <p className="mt-2 text-sm font-medium text-rose-600">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Logistics Solutions */}
        <section className="relative overflow-hidden bg-gradient-to-br from-rose-50 via-white to-pink-50 py-20">
          <div className="absolute -left-24 top-10 h-40 w-40 rounded-full bg-rose-200/40 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-52 w-52 rounded-full bg-rose-100/50 blur-3xl" />
          <div className="relative container mx-auto grid gap-12 px-4 md:grid-cols-2 md:items-center">
            <div className="order-2 md:order-1">
              <span className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-rose-600 shadow-sm">
                Tailored logistics programs
              </span>
              <h2 className="mt-6 text-3xl font-bold text-rose-900 sm:text-4xl">
                End-to-end Caribbean cargo solutions
              </h2>
              <p className="mt-4 text-base text-rose-700">
                Whether you are shipping commercial inventory or family care packages, our logistics specialists coordinate each
                milestone with precision—from pickup and warehousing to customs clearance and delivery support.
              </p>
              <div className="mt-8 space-y-4">
                {logisticsSolutions.map((solution, index) => {
                  const Icon = solution.icon
                  return (
                    <div
                      key={index}
                      className="flex gap-4 rounded-2xl border border-pink-100 bg-white/90 p-5 shadow-sm transition hover:-translate-y-1 hover:border-pink-300/70 hover:shadow-lg"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-100">
                        <Icon className="h-6 w-6 text-rose-700" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-rose-900">{solution.title}</h3>
                        <p className="text-sm text-pink-700">{solution.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-6">
                <Link to="/business-services" className="inline-flex items-center text-pink-700 hover:text-pink-600">
                  Explore business services <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="relative mx-auto w-full max-w-md">
                <div className="overflow-hidden rounded-3xl border border-pink-100 bg-white p-6 shadow-xl">
                  <img
                    src="/air-freight-route-illustration.svg"
                    alt="Illustration of a Caribbean air freight route map"
                    className="w-full"
                  />
                  <div className="mt-6 rounded-2xl bg-rose-100/70 p-4 text-sm text-rose-800">
                    <div className="flex items-center gap-2 font-semibold">
                      <PlaneTakeoff className="h-5 w-5" /> Weekly departures from Newark Liberty
                    </div>
                    <p className="mt-2 text-xs text-rose-700">
                      Consolidation cutoff every Tuesday at 2PM. Real-time cargo status notifications sent to WhatsApp, email, and
                      the customer portal.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="relative py-20">
          <div className="absolute inset-0">
            <img
              src="/warehouse-operations.png"
              alt="Professional warehouse operations"
              className="h-full w-full object-cover opacity-10"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-white" />
          </div>
          <div className="relative container mx-auto px-4">
            <div className="text-center">
              <span className="inline-flex items-center rounded-full bg-rose-100 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-rose-700">
                How it works
              </span>
              <h2 className="mt-6 text-3xl font-bold text-rose-900 sm:text-4xl">Simple 5-step air cargo process</h2>
              <p className="mt-4 text-base text-rose-700 sm:text-lg">
                From your door in New Jersey to your destination in the Caribbean, we handle every step with professional care
                and precision.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3 lg:grid-cols-5">
              {processSteps.map((step) => {
                const Icon = step.icon
                return (
                  <div
                    key={step.step}
                    className="group relative rounded-3xl border border-rose-100 bg-white/90 p-6 shadow-lg shadow-rose-100/40 backdrop-blur transition hover:-translate-y-1 hover:border-rose-300"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600/10 text-rose-700">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="mt-4 inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                      Step {step.step}
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-rose-900">{step.title}</h3>
                    <p className="mt-2 text-sm text-rose-700">{step.description}</p>
                  </div>
                )
              })}
            </div>
            <div className="mt-10 text-center">
              <Link to="/how-it-works" className="inline-flex items-center text-pink-700 hover:text-pink-600">
                Learn more about our process <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Service Pillars */}
        <section className="bg-gradient-to-br from-rose-900 via-rose-800 to-rose-700 py-20 text-white">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/80">
                Specialized support
              </span>
              <h2 className="mt-6 text-3xl font-bold sm:text-4xl">Solutions for every type of shipment</h2>
              <p className="mt-4 text-base text-white/80">
                Choose the QCS Cargo pathway that best suits your timeline, cargo profile, and destination needs.
              </p>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {servicePillars.map((pillar, index) => {
                const Icon = pillar.icon
                return (
                  <div
                    key={index}
                    className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20 backdrop-blur"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-white">{pillar.title}</h3>
                    <p className="mt-3 text-sm text-white/80">{pillar.description}</p>
                    <ul className="mt-6 space-y-3 text-sm text-white/80">
                      {pillar.points.map((point) => (
                        <li key={point} className="flex items-start gap-2">
                          <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-300" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Why Choose QCS Cargo */}
        <section className="relative overflow-hidden py-20">
          <div className="absolute -right-32 top-10 hidden h-72 w-72 rounded-full bg-rose-200/60 blur-3xl lg:block" />
          <div className="absolute -left-32 bottom-0 hidden h-72 w-72 rounded-full bg-pink-100/70 blur-3xl lg:block" />
          <div className="relative container mx-auto grid gap-12 px-4 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div className="order-2 md:order-1">
              <h2 className="text-3xl font-bold text-rose-900 sm:text-4xl">Why Caribbean shippers choose QCS Cargo</h2>
              <p className="mt-4 text-base text-rose-700">
                We blend high-touch customer care with enterprise-grade logistics infrastructure to deliver a reliable, modern
                shipping experience for families and businesses alike.
              </p>
              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                {whyChooseFeatures.map((feature) => {
                  const Icon = feature.icon
                  return (
                    <div key={feature.title} className="rounded-3xl border border-rose-100 bg-white p-6 shadow-sm">
                      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.iconBg}`}>
                        <Icon className={`h-6 w-6 ${feature.iconColor}`} />
                      </div>
                      <h3 className="text-lg font-semibold text-rose-900">{feature.title}</h3>
                      <p className="mt-2 text-sm text-rose-700">{feature.description}</p>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="relative mx-auto w-full max-w-md">
                <div className="overflow-hidden rounded-3xl border border-rose-100 bg-white p-6 shadow-xl">
                  <img
                    src="/cargo-operations-illustration.svg"
                    alt="Illustration of cargo operations and warehouse coordination"
                    className="w-full"
                  />
                  <div className="mt-6 space-y-4">
                    {operationsHighlights.map((highlight) => {
                      const Icon = highlight.icon
                      return (
                        <div key={highlight.title} className="flex gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold">{highlight.title}</p>
                            <p className="text-xs text-rose-700/90">{highlight.description}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Service Areas */}
        <section className="relative overflow-hidden py-20">
          <div className="absolute inset-0">
            <img
              src="/caribbean-destinations.png"
              alt="Caribbean destinations map"
              className="h-full w-full object-cover opacity-10"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-white" />
          </div>
          <div className="relative container mx-auto px-4">
            <div className="mx-auto max-w-2xl rounded-3xl bg-white/80 p-10 text-center shadow-xl backdrop-blur">
              <h2 className="text-3xl font-bold text-rose-900 sm:text-4xl">Caribbean destinations we serve</h2>
              <p className="mt-4 text-base text-rose-700">
                Precision air cargo service to major Caribbean destinations with transparent transit times and rate guidance.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {destinations.map((dest) => (
                <div
                  key={dest.country}
                  className="rounded-2xl border-2 border-pink-100 bg-white/90 p-6 text-center shadow-sm transition hover:-translate-y-1 hover:border-pink-400/70 hover:shadow-lg"
                >
                  <h3 className="text-lg font-bold text-rose-900">{dest.country}</h3>
                  <p className="mt-2 text-sm text-rose-700">{dest.city}</p>
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-rose-500">Transit</div>
                    <div className="text-sm font-semibold text-rose-700">{dest.days}</div>
                    <div className="text-lg font-bold text-emerald-600">{dest.rate}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link to="/service-areas" className="inline-flex items-center text-pink-700 hover:text-pink-600">
                View all destinations & rates <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="bg-white py-20">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <span className="inline-flex items-center rounded-full bg-rose-100 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-rose-700">
                Customer stories
              </span>
              <h2 className="mt-6 text-3xl font-bold text-rose-900 sm:text-4xl">What our customers say</h2>
              <p className="mt-4 text-base text-rose-700">
                Trusted by Caribbean families and businesses across New Jersey.
              </p>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="flex h-full flex-col rounded-3xl border border-rose-100 bg-white p-6 shadow-lg shadow-rose-100/40"
                >
                  <div className="flex items-center gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-pink-600" fill="currentColor" />
                    ))}
                  </div>
                  <p className="mt-4 flex-1 text-sm text-rose-700">“{testimonial.text}”</p>
                  <div className="mt-6 border-t border-rose-100 pt-4 text-sm text-rose-700">
                    <div className="font-semibold text-rose-900">{testimonial.name}</div>
                    <div>{testimonial.location}</div>
                    <div className="font-medium text-rose-600">{testimonial.shipmentType}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative overflow-hidden bg-rose-900 py-20 text-white">
          <div className="absolute inset-0">
            <img
              src="/cargo-loading-operations.png"
              alt="Professional cargo loading operations"
              className="h-full w-full object-cover opacity-10"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-rose-900 via-rose-900/80 to-rose-800" />
          </div>
          <div className="relative container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Ready for precision air cargo to the Caribbean?</h2>
            <p className="mt-4 text-base text-white/80 sm:text-lg">
              Get an instant quote and start shipping with New Jersey's most trusted Caribbean precision cargo specialists.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/shipping-calculator"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-fuchsia-500 px-8 text-base font-semibold text-white shadow-lg shadow-rose-900/40 transition hover:bg-fuchsia-600"
              >
                Calculate shipping cost <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/40 px-8 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Speak with an expert
              </Link>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  )
}
