import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Plane, Shield, Clock, Globe, Star, CheckCircle, Truck, Package, MapPin, Phone } from 'lucide-react'

export default function HomePage() {
  const testimonials = [
    {
      name: "Maria Rodriguez",
      location: "Newark, NJ to Georgetown, Guyana",
      rating: 5,
      text: "QCS Cargo made shipping to my family in Georgetown so easy. Fast delivery and great customer service. Highly recommended!",
      shipmentType: "Electronics & Household Items"
    },
    {
      name: "David Thompson",
      location: "Jersey City, NJ to Kingston, Jamaica",
      rating: 5,
      text: "Professional service from start to finish. My business shipments always arrive on time and in perfect condition.",
      shipmentType: "Business Equipment"
    },
    {
      name: "Sarah Williams",
      location: "Elizabeth, NJ to Port of Spain, Trinidad",
      rating: 5,
      text: "The consolidation service saved me so much money. QCS Cargo really understands the Caribbean shipping needs.",
      shipmentType: "Medical Supplies"
    }
  ]

  const processSteps = [
    {
      step: 1,
      title: "Get Quote & Schedule",
      description: "Contact us for a detailed rate quote and arrange pickup or drop-off at our secure facility.",
      icon: <Phone className="h-8 w-8 text-pink-600" />
    },
    {
      step: 2,
      title: "Cargo Drop-off/Pickup",
      description: "Bring your items to our Kearny facility or schedule convenient pickup service within 25 miles.",
      icon: <Truck className="h-8 w-8 text-pink-600" />
    },
    {
      step: 3,
      title: "Processing & Consolidation",
      description: "We prepare documentation, consolidate shipments, and ensure compliance with Caribbean customs.",
      icon: <Package className="h-8 w-8 text-pink-600" />
    },
    {
      step: 4,
      title: "Air Freight Shipping",
      description: "Express air cargo service with trusted carriers to your Caribbean destination.",
      icon: <Plane className="h-8 w-8 text-pink-600" />
    },
    {
      step: 5,
      title: "Destination Delivery",
      description: "Local delivery coordination or airport pickup notification once your cargo arrives.",
      icon: <MapPin className="h-8 w-8 text-pink-600" />
    }
  ]

  const stats = [
    { number: "10+", label: "Years Serving Caribbean Community" },
    { number: "5,000+", label: "Successful Shipments" },
    { number: "3-5", label: "Days Average Transit Time" },
    { number: "99%", label: "Customer Satisfaction Rate" }
  ]

  const destinations = [
    { country: "Guyana", city: "Georgetown", days: "3-5 days", rate: "from $3.50/lb" },
    { country: "Jamaica", city: "Kingston", days: "4-6 days", rate: "from $3.75/lb" },
    { country: "Trinidad", city: "Port of Spain", days: "4-6 days", rate: "from $4.00/lb" },
    { country: "Barbados", city: "Bridgetown", days: "5-7 days", rate: "from $4.25/lb" },
    { country: "Suriname", city: "Paramaribo", days: "4-6 days", rate: "from $3.75/lb" }
  ]

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-rose-800 via-pink-700 to-rose-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/10"></div>
        <div className="absolute inset-0 opacity-15">
          <img
            src="/hero-air-cargo-plane.png"
            alt="Professional air cargo operations"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative container mx-auto px-4 py-16 sm:py-20 md:py-24">
          <div className="max-w-screen-md mx-auto text-center">
            <h1 className="text-white leading-tight font-bold text-[clamp(28px,6vw,48px)] text-balance">
              Precision Air Cargo to Guyana & the Caribbean
            </h1>
            <p className="mt-3 text-white/90 text-[clamp(14px,3.8vw,18px)] text-balance">
              Professional air freight services from New Jersey with consolidation, secure storage, and competitive rates for the Caribbean diaspora community
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/shipping-calculator"
                className="rounded-xl px-4 py-3 font-semibold bg-fuchsia-600 text-white hover:bg-fuchsia-700 transition-colors inline-flex items-center justify-center"
              >
                Get Free Quote
              </Link>
              <Link
                to="/how-it-works"
                className="rounded-xl px-4 py-3 font-semibold bg-white text-gray-900 hover:bg-gray-100 transition-colors inline-flex items-center justify-center"
              >
                Learn How It Works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="text-4xl font-bold text-pink-700">{stat.number}</div>
                <div className="text-pink-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Overview */}
      <section className="py-16 relative">
        <div className="absolute inset-0 opacity-5">
          <img 
            src="/warehouse-operations.png" 
            alt="Professional warehouse operations" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-rose-900 mb-4">
              Simple 5-Step Air Cargo Process
            </h2>
            <p className="text-xl text-pink-600 max-w-3xl mx-auto">
              From your door in New Jersey to your destination in the Caribbean, 
              we handle every step with professional care and precision.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {processSteps.map((step, index) => (
              <div key={index} className="text-center space-y-4">
                <div className="bg-pink-100/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                  {React.cloneElement(step.icon, { className: "h-8 w-8 text-pink-600" })}
                </div>
                <div className="bg-pink-700 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto text-sm font-bold">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold text-rose-900">{step.title}</h3>
                <p className="text-pink-600 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <Link 
              to="/how-it-works" 
              className="inline-flex items-center text-pink-700 hover:text-pink-600 font-semibold"
            >
              Learn More About Our Process <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose QCS Cargo */}
      <section className="py-16 bg-pink-50/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-rose-900 mb-4">
              Why Choose QCS Cargo?
            </h2>
            <p className="text-xl text-pink-600">
              Trusted by the Caribbean diaspora community in New Jersey
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-lg text-center border border-pink-200/30">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-rose-900">Caribbean Expertise</h3>
              <p className="text-pink-600">Deep understanding of Caribbean shipping requirements, customs protocols, and cultural needs with precision handling</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg text-center border border-pink-200/30">
              <div className="bg-pink-100/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-pink-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-rose-900">Precision Transit Times</h3>
              <p className="text-pink-600">Express air service with reliable 3-7 day delivery schedules to major Caribbean destinations</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg text-center border border-pink-200/30">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-rose-900">Smart Consolidation</h3>
              <p className="text-pink-600">Maximize savings through intelligent consolidation of multiple shipments with precision logistics</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg text-center relative overflow-hidden border border-pink-200/30">
              <div className="absolute inset-0 opacity-10">
                <img 
                  src="/secure-facility.png" 
                  alt="Secure warehouse facility" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="relative">
                <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-rose-900">Secure & Precise Handling</h3>
                <p className="text-pink-600">Climate-controlled facility with 24/7 surveillance and precision cargo handling protocols</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="py-16 relative">
        <div className="absolute inset-0 opacity-8">
          <img 
            src="/caribbean-destinations.png" 
            alt="Caribbean destinations map" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-12">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-8 mx-auto max-w-2xl border border-pink-200/30">
              <h2 className="text-4xl font-bold text-rose-900 mb-4">
                Caribbean Destinations We Serve
              </h2>
              <p className="text-xl text-pink-600">
                Precision air cargo service to major Caribbean destinations
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {destinations.map((dest, index) => (
              <div key={index} className="bg-white border-2 border-pink-200/30 rounded-lg p-6 text-center hover:border-pink-700 hover:shadow-lg transition-all duration-300">
                <h3 className="text-lg font-bold text-rose-900 mb-2">{dest.country}</h3>
                <p className="text-pink-600 mb-3">{dest.city}</p>
                <div className="space-y-2">
                  <div className="text-sm text-pink-700 font-medium">{dest.days}</div>
                  <div className="text-lg font-bold text-green-600">{dest.rate}</div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <Link 
              to="/service-areas" 
              className="inline-flex items-center text-pink-700 hover:text-pink-600 font-semibold"
            >
              View All Destinations & Rates <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-rose-900 mb-4">
              What Our Customers Say
            </h2>
            <p className="text-xl text-pink-600">
              Trusted by Caribbean families and businesses across New Jersey
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-lg border border-pink-200/30">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-pink-700 fill-current" />
                  ))}
                </div>
                <p className="text-pink-600 mb-4 italic">"{testimonial.text}"</p>
                <div className="border-t pt-4">
                  <div className="font-semibold text-rose-900">{testimonial.name}</div>
                  <div className="text-sm text-pink-600">{testimonial.location}</div>
                  <div className="text-sm text-pink-700 font-medium">{testimonial.shipmentType}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-rose-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img 
            src="/cargo-loading-operations.png" 
            alt="Professional cargo loading operations" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-4xl font-bold mb-6">
            Ready for Precision Air Cargo to the Caribbean?
          </h2>
          <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            Get an instant quote and start shipping with New Jersey's most trusted Caribbean precision cargo specialists.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/shipping-calculator" 
              className="bg-pink-700 text-white px-8 py-4 rounded-lg text-lg font-bold hover:bg-pink-700/90 transition-colors inline-flex items-center justify-center"
            >
              Calculate Shipping Cost <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              to="/contact" 
              className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-rose-900 transition-colors inline-flex items-center justify-center"
            >
              Speak with an Expert
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}