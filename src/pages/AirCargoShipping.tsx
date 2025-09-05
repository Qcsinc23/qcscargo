import React from 'react'
import { Link } from 'react-router-dom'
import { Plane, Package, Shield, Clock, CheckCircle, ArrowRight, Truck, Globe, DollarSign, Users, Star } from 'lucide-react'

export default function AirCargoShipping() {
  const services = [
    {
      icon: <Plane className="h-8 w-8" />,
      title: "Standard Air Freight",
      description: "Reliable weekly flights from NJ to Guyana & Caribbean with predictable delivery schedules.",
      features: [
        "Fixed weekly departures",
        "Real-time tracking system",
        "Competitive bulk rates",
        "Professional handling",
        "Insurance coverage included"
      ],
      pricing: "From $3.50/lb"
    },
    {
      icon: <Clock className="h-8 w-8" />,
      title: "Express Delivery",
      description: "Urgent shipments prioritized on the next available flight for time-sensitive cargo.",
      features: [
        "Same-day processing",
        "Priority customs clearance",
        "Dedicated express support",
        "Next-flight guarantee",
        "Rush handling available"
      ],
      pricing: "Custom express quotes"
    },
    {
      icon: <Truck className="h-8 w-8" />,
      title: "Door-to-Door Service",
      description: "Complete logistics solution from pickup in NJ to final delivery across the Caribbean.",
      features: [
        "Free pickup in NJ area",
        "Last-mile delivery",
        "End-to-end tracking",
        "Signature confirmation",
        "Flexible delivery options"
      ],
      pricing: "Starting at $25 pickup fee"
    },
    {
      icon: <Package className="h-8 w-8" />,
      title: "Consolidated Cargo",
      description: "Cost-effective shipping for multiple packages combined into single shipments.",
      features: [
        "Volume discount pricing",
        "Secure consolidation",
        "Reduced per-pound rates",
        "Weekly consolidation",
        "Multiple destination support"
      ],
      pricing: "Save up to 30% on bulk"
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "Customs Clearance",
      description: "Expert customs brokerage and documentation services for smooth international shipping.",
      features: [
        "Complete documentation",
        "Duty calculation assistance",
        "Compliance verification",
        "Fast customs processing",
        "Regulatory expertise"
      ],
      pricing: "From $35 per shipment"
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Special Handling",
      description: "Specialized care for fragile, oversized, or high-value items requiring extra attention.",
      features: [
        "Fragile item protection",
        "Oversized cargo handling",
        "High-value insurance",
        "Climate-controlled storage",
        "White-glove service"
      ],
      pricing: "Custom handling quotes"
    }
  ]

  const whyChooseUs = [
    {
      icon: <Clock className="h-12 w-12" />,
      title: "Speed & Reliability",
      description: "98% on-time delivery rate with consistent weekly schedules to all Caribbean destinations.",
      highlight: "98% On-Time Rate"
    },
    {
      icon: <Globe className="h-12 w-12" />,
      title: "Caribbean Expertise",
      description: "Deep local knowledge and established partnerships across Guyana and Caribbean islands.",
      highlight: "15+ Years Experience"
    },
    {
      icon: <Shield className="h-12 w-12" />,
      title: "Secure Handling",
      description: "Full insurance coverage, real-time tracking, and secure facilities for peace of mind.",
      highlight: "Full Insurance Coverage"
    },
    {
      icon: <DollarSign className="h-12 w-12" />,
      title: "Transparent Pricing",
      description: "No hidden fees, clear pricing structure, and competitive rates for all destinations.",
      highlight: "No Hidden Fees"
    }
  ]

  const howItWorks = [
    {
      step: 1,
      title: "Book Your Shipment",
      description: "Get instant quotes online or call our team to book your air cargo shipment.",
      details: "Use our shipping calculator or speak with our experts for custom requirements."
    },
    {
      step: 2,
      title: "Drop Off or Pickup",
      description: "Bring your packages to our facility or schedule convenient pickup service.",
      details: "Free pickup available in NJ area for shipments over 50 lbs."
    },
    {
      step: 3,
      title: "Consolidation & Processing",
      description: "We consolidate, document, and prepare your cargo for air transport.",
      details: "Professional packaging, customs documentation, and security screening."
    },
    {
      step: 4,
      title: "Air Transport & Delivery",
      description: "Your cargo flies to destination and gets delivered to the final address.",
      details: "Real-time tracking updates and delivery confirmation provided."
    }
  ]

  const customerStories = [
    {
      customer: "Family Shipper",
      location: "Regular shipments to Georgetown, Guyana",
      quote: "Our monthly care packages to family in Guyana arrive in exactly 3 days, every time. The tracking system keeps everyone updated, and the rates are very reasonable.",
      service: "Standard Air Freight",
      savings: "Consistent 3-day delivery"
    },
    {
      customer: "Small Business Owner",
      location: "Electronics to Trinidad & Tobago",
      quote: "QCS helped us expand our electronics business to Trinidad with fast customs clearance and reliable delivery. Our customers love the quick turnaround.",
      service: "Express Delivery + Customs",
      savings: "50% faster customs processing"
    },
    {
      customer: "Medical Supplier",
      location: "Healthcare supplies to Jamaica",
      quote: "The special handling for our medical supplies is exceptional. Temperature control and careful packaging ensure our products arrive in perfect condition.",
      service: "Special Handling",
      savings: "Zero damage claims"
    }
  ]

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="bg-yellow-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Plane className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Air Cargo Shipping
          </h1>
          <p className="text-xl text-primary-foreground/90 max-w-3xl mx-auto">
            Fast, reliable, and cost-effective air freight solutions from New Jersey to Guyana and the Caribbean. 
            Professional service with transparent pricing and expert handling.
          </p>
        </div>
      </section>

      {/* Service Overview */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Complete Air Cargo Solutions
            </h2>
            <p className="text-xl text-slate-600">
              From standard freight to express delivery, we offer comprehensive air cargo services tailored to your needs
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <div key={index} className="bg-white border border-slate-200 rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-6">
                  <div className="bg-primary/10 p-3 rounded-lg mr-4">
                    {service.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">{service.title}</h3>
                </div>
                
                <p className="text-slate-700 mb-6">{service.description}</p>
                
                <div className="mb-6">
                  <h4 className="font-semibold text-slate-900 mb-3">Service Features:</h4>
                  <ul className="space-y-2">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-slate-600 mb-1">Starting at:</div>
                      <div className="font-semibold text-primary">{service.pricing}</div>
                    </div>
                    <Link 
                      to="/shipping-calculator"
                      className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Get Quote
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose QCS Cargo */}
      <section className="py-16 bg-green-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Why Choose QCS Cargo?
            </h2>
            <p className="text-xl text-slate-600">
              Trusted by thousands of customers for reliable Caribbean air cargo services
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {whyChooseUs.map((feature, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-lg text-center">
                <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                <p className="text-slate-700 mb-4">{feature.description}</p>
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {feature.highlight}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              How Air Cargo Shipping Works
            </h2>
            <p className="text-xl text-slate-600">
              Simple, transparent process from booking to delivery
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <div key={index} className="text-center">
                <div className="bg-primary text-primary-foreground w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                  {step.step}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">{step.title}</h3>
                <p className="text-slate-700 mb-3">{step.description}</p>
                <p className="text-sm text-slate-600">{step.details}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Stories */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Customer Success Stories
            </h2>
            <p className="text-xl text-slate-600">
              Real experiences from customers who trust QCS Cargo for their Caribbean shipping needs
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {customerStories.map((story, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-lg">
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  </div>
                  <div className="text-2xl font-bold text-primary mb-2">{story.customer}</div>
                  <div className="text-slate-600 text-sm">{story.location}</div>
                </div>
                <p className="text-slate-700 mb-4 italic">"{story.quote}"</p>
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-slate-600">Service Used:</div>
                      <div className="font-medium text-slate-900">{story.service}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-600">Result:</div>
                      <div className="font-medium text-green-600">{story.savings}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Get a Free Air Cargo Quote Today
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Ready to ship to the Caribbean? Get instant quotes, compare services, and book your air cargo shipment online.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/shipping-calculator" 
              className="bg-yellow-500 text-primary px-8 py-4 rounded-lg text-lg font-bold hover:bg-yellow-400 transition-colors inline-flex items-center justify-center"
            >
              Calculate Shipping Cost <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <a
              href="tel:201-249-0929"
              className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-primary transition-colors inline-flex items-center justify-center"
            >
              Call 201-249-0929
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
