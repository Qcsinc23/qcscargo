import React from 'react'
import { Link } from 'react-router-dom'
import { Building2, Users, TrendingUp, Package, Clock, Shield, DollarSign, CheckCircle, ArrowRight } from 'lucide-react'

export default function BusinessServices() {
  const businessServices = [
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: "Regular Commercial Shipping",
      description: "Scheduled pickup services and bulk shipping for businesses with consistent Caribbean shipping needs.",
      features: [
        "Weekly or monthly pickup schedules",
        "Dedicated account manager",
        "Priority processing and handling",
        "Custom packaging solutions",
        "Volume-based discount pricing"
      ],
      pricing: "Custom rates based on volume"
    },
    {
      icon: <Package className="h-8 w-8" />,
      title: "Import/Export Services",
      description: "Comprehensive trade support for businesses importing from or exporting to Caribbean markets.",
      features: [
        "Trade documentation assistance",
        "Customs brokerage coordination",
        "Compliance consulting",
        "Multi-destination shipping",
        "Duty and tax guidance"
      ],
      pricing: "Service fees from $50-200 per shipment"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Corporate Account Management",
      description: "Dedicated support and streamlined processes for high-volume business customers.",
      features: [
        "Dedicated account representative",
        "Monthly billing with Net 15 terms",
        "Online account dashboard",
        "Priority customer support",
        "Custom reporting and analytics"
      ],
      pricing: "No setup fees, volume discounts apply"
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Special Project Logistics",
      description: "Custom logistics solutions for unique business requirements and special projects.",
      features: [
        "Event shipping coordination",
        "Humanitarian aid logistics",
        "Educational institution support",
        "Medical supply logistics",
        "Cultural event coordination"
      ],
      pricing: "Custom quotes based on project scope"
    }
  ]

  const industrySpecialties = [
    {
      industry: "Healthcare & Medical",
      description: "Medical supplies, equipment, and pharmaceutical products with proper handling and documentation.",
      specialFeatures: ["Temperature-controlled storage", "FDA documentation support", "Expedited clearance"]
    },
    {
      industry: "Electronics & Technology",
      description: "Consumer electronics, computer equipment, and technology products with secure handling.",
      specialFeatures: ["Anti-static packaging", "Insurance coverage", "Warranty documentation"]
    },
    {
      industry: "Food & Beverage",
      description: "Non-perishable food products, beverages, and specialty Caribbean food items.",
      specialFeatures: ["FDA compliance support", "Special handling procedures", "Cultural food expertise"]
    },
    {
      industry: "Automotive",
      description: "Auto parts, accessories, and automotive supplies for Caribbean markets.",
      specialFeatures: ["Heavy item handling", "Special packaging", "Parts documentation"]
    },
    {
      industry: "Retail & Consumer Goods",
      description: "Consumer products, clothing, household items, and retail merchandise.",
      specialFeatures: ["Consolidation services", "Inventory management", "Seasonal shipping"]
    },
    {
      industry: "Cultural & Educational",
      description: "Books, educational materials, cultural items, and non-profit organization shipments.",
      specialFeatures: ["Non-profit discounts", "Educational support", "Cultural sensitivity"]
    }
  ]

  const volumeDiscounts = [
    { range: "100-250 lbs/month", discount: "5%", savings: "$50-200/month" },
    { range: "251-500 lbs/month", discount: "10%", savings: "$150-500/month" },
    { range: "501-1000 lbs/month", discount: "15%", savings: "$400-1200/month" },
    { range: "1000+ lbs/month", discount: "Custom", savings: "Significant savings" }
  ]

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-indigo-800 to-indigo-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="bg-yellow-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-8 w-8 text-indigo-900" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Business & Corporate Services
          </h1>
          <p className="text-xl text-indigo-100 max-w-3xl mx-auto">
            Professional air cargo solutions for businesses shipping to the Caribbean. 
            Volume discounts, dedicated support, and streamlined processes for your success.
          </p>
        </div>
      </section>

      {/* Business Services Overview */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Comprehensive Business Solutions
            </h2>
            <p className="text-xl text-slate-600">
              Tailored services designed to meet the unique needs of businesses shipping to the Caribbean
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {businessServices.map((service, index) => (
              <div key={index} className="bg-white border border-slate-200 rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-6">
                  <div className="bg-indigo-100 p-3 rounded-lg mr-4">
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
                      <div className="font-semibold text-indigo-700">{service.pricing}</div>
                    </div>
                    <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                      Learn More
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Volume Discounts */}
      <section className="py-16 bg-green-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Volume Discount Program
            </h2>
            <p className="text-xl text-slate-600">
              The more you ship, the more you save. Our volume discounts reward regular business customers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {volumeDiscounts.map((tier, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-lg border-2 border-green-200">
                <div className="text-center">
                  <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{tier.range}</h3>
                  <div className="text-3xl font-bold text-green-600 mb-2">{tier.discount}</div>
                  <div className="text-sm text-slate-600">Potential Savings</div>
                  <div className="text-lg font-medium text-slate-900">{tier.savings}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-semibold text-center mb-6">Additional Business Benefits</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <Clock className="h-12 w-12 text-indigo-700 mx-auto mb-4" />
                <h4 className="font-semibold mb-2">Flexible Payment Terms</h4>
                <p className="text-slate-600 text-sm">Net 15 payment terms for qualified business accounts</p>
              </div>
              <div className="text-center">
                <Users className="h-12 w-12 text-indigo-700 mx-auto mb-4" />
                <h4 className="font-semibold mb-2">Dedicated Support</h4>
                <p className="text-slate-600 text-sm">Priority customer service and account management</p>
              </div>
              <div className="text-center">
                <Package className="h-12 w-12 text-indigo-700 mx-auto mb-4" />
                <h4 className="font-semibold mb-2">Custom Solutions</h4>
                <p className="text-slate-600 text-sm">Tailored logistics solutions for unique requirements</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Specialties */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Industry Expertise
            </h2>
            <p className="text-xl text-slate-600">
              Specialized knowledge and services for various industries shipping to Caribbean markets
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {industrySpecialties.map((industry, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-indigo-700">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{industry.industry}</h3>
                <p className="text-slate-700 mb-4">{industry.description}</p>
                
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Special Features:</h4>
                  <ul className="space-y-1">
                    {industry.specialFeatures.map((feature, featureIndex) => (
                      <li key={featureIndex} className="text-sm text-slate-600 flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-16 bg-indigo-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Business Success Stories
            </h2>
            <p className="text-xl text-slate-600">
              How QCS Cargo helps businesses succeed in Caribbean markets
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="mb-4">
                <div className="text-2xl font-bold text-indigo-700 mb-2">Medical Supply Distributor</div>
                <div className="text-slate-600">Monthly shipments to 3 Caribbean countries</div>
              </div>
              <p className="text-slate-700 mb-4">
                "QCS Cargo's understanding of medical supply regulations and their reliable transit times 
                have been crucial for our Caribbean operations. The volume discounts save us over $800/month."
              </p>
              <div className="text-sm text-indigo-700 font-medium">15% volume discount • Net 15 terms</div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="mb-4">
                <div className="text-2xl font-bold text-indigo-700 mb-2">Electronics Retailer</div>
                <div className="text-slate-600">Regular shipments of consumer electronics</div>
              </div>
              <p className="text-slate-700 mb-4">
                "The dedicated account manager and priority processing have streamlined our Caribbean 
                supply chain. We've reduced shipping costs by 20% while improving delivery reliability."
              </p>
              <div className="text-sm text-indigo-700 font-medium">Custom rates • Priority support</div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="mb-4">
                <div className="text-2xl font-bold text-indigo-700 mb-2">Cultural Organization</div>
                <div className="text-slate-600">Event supplies and educational materials</div>
              </div>
              <p className="text-slate-700 mb-4">
                "QCS Cargo's cultural understanding and non-profit discounts have made it possible for us 
                to support more Caribbean cultural events and educational programs."
              </p>
              <div className="text-sm text-indigo-700 font-medium">Non-profit rates • Special handling</div>
            </div>
          </div>
        </div>
      </section>

      {/* Getting Started */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Getting Started with Business Services
              </h2>
              <p className="text-xl text-slate-600">
                Simple steps to set up your business account and start saving on Caribbean shipping
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-3">Contact Our Team</h3>
                <p className="text-slate-600">
                  Call 201-249-0929 or email sales@quietcraftsolutions.com to discuss your business shipping needs.
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-3">Custom Quote</h3>
                <p className="text-slate-600">
                  Receive a customized quote based on your volume, destinations, and specific requirements.
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-3">Start Shipping</h3>
                <p className="text-slate-600">
                  Set up your account, establish pickup schedules, and begin saving with professional service.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-indigo-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Optimize Your Caribbean Shipping?
          </h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            Contact our business services team today to discuss custom solutions and volume discounts for your company.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/contact" 
              className="bg-yellow-500 text-indigo-900 px-8 py-4 rounded-lg text-lg font-bold hover:bg-yellow-400 transition-colors inline-flex items-center justify-center"
            >
              Contact Business Team <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <a
              href="tel:201-249-0929"
              className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-indigo-900 transition-colors inline-flex items-center justify-center"
            >
              Call 201-249-0929
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}