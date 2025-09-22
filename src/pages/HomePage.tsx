import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Plane, Shield, Clock, Globe, Star, CheckCircle, Truck, Package, MapPin, Phone, Award, Users, TrendingUp, Zap } from 'lucide-react'
import { MarketingLayout } from '@/components/layout/MarketingLayout'
import AddressInlineBadge from '@/components/AddressInlineBadge'
import { useVirtualAddress } from '@/hooks/useVirtualAddress'
import { featureFlags } from '@/lib/featureFlags'

export default function HomePage() {
  const navigate = useNavigate()
  const { address, mailboxNumber, loading: addressLoading } = useVirtualAddress()
  const showVirtualMailboxUi = featureFlags.virtualMailboxUi

  // Animated counter hook
  const useCounter = (end: number, duration: number = 2000) => {
    const [count, setCount] = useState(0)
    const [hasStarted, setHasStarted] = useState(false)

    useEffect(() => {
      if (!hasStarted) return
      
      const startTime = Date.now()
      const startValue = 0

      const updateCounter = () => {
        const now = Date.now()
        const progress = Math.min((now - startTime) / duration, 1)
        const currentCount = Math.floor(startValue + (end - startValue) * progress)
        
        setCount(currentCount)
        
        if (progress < 1) {
          requestAnimationFrame(updateCounter)
        }
      }

      requestAnimationFrame(updateCounter)
    }, [end, duration, hasStarted])

    return [count, () => setHasStarted(true)] as const
  }

  const testimonials = [
    {
      name: "Maria Rodriguez",
      location: "Newark, NJ to Georgetown, Guyana",
      rating: 5,
      text: "QCS Cargo made shipping to my family in Georgetown so easy. Fast delivery and great customer service. Highly recommended!",
      shipmentType: "Electronics & Household Items",
      avatar: "M"
    },
    {
      name: "David Thompson",
      location: "Jersey City, NJ to Kingston, Jamaica",
      rating: 5,
      text: "Professional service from start to finish. My business shipments always arrive on time and in perfect condition.",
      shipmentType: "Business Equipment",
      avatar: "D"
    },
    {
      name: "Sarah Williams",
      location: "Elizabeth, NJ to Port of Spain, Trinidad",
      rating: 5,
      text: "The consolidation service saved me so much money. QCS Cargo really understands the Caribbean shipping needs.",
      shipmentType: "Medical Supplies",
      avatar: "S"
    }
  ]

  const processSteps = [
    {
      step: 1,
      title: "Get Quote & Schedule",
      description: "Contact us for a detailed rate quote and arrange pickup or drop-off at our secure facility.",
      icon: <Phone className="h-8 w-8" />
    },
    {
      step: 2,
      title: "Cargo Drop-off/Pickup",
      description: "Bring your items to our Kearny facility or schedule convenient pickup service within 25 miles.",
      icon: <Truck className="h-8 w-8" />
    },
    {
      step: 3,
      title: "Processing & Consolidation",
      description: "We prepare documentation, consolidate shipments, and ensure compliance with Caribbean customs.",
      icon: <Package className="h-8 w-8" />
    },
    {
      step: 4,
      title: "Air Freight Shipping",
      description: "Express air cargo service with trusted carriers to your Caribbean destination.",
      icon: <Plane className="h-8 w-8" />
    },
    {
      step: 5,
      title: "Destination Delivery",
      description: "Local delivery coordination or airport pickup notification once your cargo arrives.",
      icon: <MapPin className="h-8 w-8" />
    }
  ]

  const stats = [
    { number: 10, suffix: "+", label: "Years Serving Caribbean Community", icon: <Award className="h-6 w-6" /> },
    { number: 5000, suffix: "+", label: "Successful Shipments", icon: <Package className="h-6 w-6" /> },
    { number: 99, suffix: "%", label: "Customer Satisfaction Rate", icon: <Star className="h-6 w-6" /> },
    { number: 24, suffix: "/7", label: "Customer Support", icon: <Users className="h-6 w-6" /> }
  ]

  const destinations = [
    { country: "Guyana", city: "Georgetown", days: "3-5 days", rate: "from $3.50/lb", flag: "🇬🇾" },
    { country: "Jamaica", city: "Kingston", days: "4-6 days", rate: "from $3.75/lb", flag: "🇯🇲" },
    { country: "Trinidad", city: "Port of Spain", days: "4-6 days", rate: "from $4.00/lb", flag: "🇹🇹" },
    { country: "Barbados", city: "Bridgetown", days: "5-7 days", rate: "from $4.25/lb", flag: "🇧🇧" },
    { country: "Suriname", city: "Paramaribo", days: "4-6 days", rate: "from $3.75/lb", flag: "🇸🇷" }
  ]

  const features = [
    {
      title: "Caribbean Expertise",
      description: "Deep understanding of Caribbean shipping requirements, customs protocols, and cultural needs",
      icon: <Globe className="h-8 w-8" />,
      color: "from-emerald-500 to-teal-600"
    },
    {
      title: "Lightning Fast Transit",
      description: "Express air service with reliable 3-7 day delivery schedules to major Caribbean destinations",
      icon: <Zap className="h-8 w-8" />,
      color: "from-yellow-400 to-orange-500"
    },
    {
      title: "Smart Consolidation",
      description: "Maximize savings through intelligent consolidation of multiple shipments with precision logistics",
      icon: <Package className="h-8 w-8" />,
      color: "from-purple-500 to-indigo-600"
    },
    {
      title: "Secure Handling",
      description: "Climate-controlled facility with 24/7 surveillance and precision cargo handling protocols",
      icon: <Shield className="h-8 w-8" />,
      color: "from-red-500 to-pink-600"
    }
  ]

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
  }

  return (
    <MarketingLayout seo={pageSeo}>
      <div className="bg-white overflow-hidden">
        {/* Enhanced Hero Section */}
        <section className="relative min-h-[90vh] flex items-center justify-center bg-gradient-to-br from-rose-900 via-pink-800 to-fuchsia-800 text-white overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/20"></div>
          <div className="absolute inset-0 opacity-20">
            <img
              src="/hero-air-cargo-plane.png"
              alt="Professional air cargo operations"
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Animated Background Shapes */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-4 py-16 text-center">
            <div className="space-y-8">
              <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-2 text-sm font-medium">
                <TrendingUp className="w-4 h-4 mr-2" />
                New Jersey's #1 Caribbean Cargo Service
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight">
                Precision Air Cargo
                <span className="block bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                  to the Caribbean
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
                Professional air freight services from New Jersey with consolidation, secure storage, and competitive rates for the Caribbean diaspora community
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
                <Link
                  to="/shipping-calculator"
                  className="group relative overflow-hidden bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-semibold px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 inline-flex items-center"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-fuchsia-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  <span className="relative flex items-center">
                    Get Free Quote
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                </Link>
                
                <Link
                  to="/how-it-works"
                  className="group bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white hover:text-gray-900 transition-all duration-300 inline-flex items-center"
                >
                  Learn How It Works
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
              </div>

              {showVirtualMailboxUi && (
                <div className="pt-6">
                  <AddressInlineBadge
                    address={address}
                    mailboxNumber={mailboxNumber}
                    loading={addressLoading}
                    onGetAddressClick={() =>
                      navigate('/auth/register?returnUrl=/dashboard')
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Enhanced Stats Section */}
        <section className="py-20 bg-gradient-to-r from-gray-50 to-white relative">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-50/50 to-purple-50/50"></div>
          <div className="relative container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => {
                const [count, startCounter] = useCounter(stat.number, 2500)
                
                return (
                  <div
                    key={index}
                    className="text-center group cursor-pointer"
                    onMouseEnter={startCounter}
                  >
                    <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-pink-100">
                      <div className="bg-gradient-to-br from-pink-500 to-fuchsia-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 text-white">
                        {stat.icon}
                      </div>
                      <div className="text-4xl font-bold text-pink-700 mb-2">
                        {count}{stat.suffix}
                      </div>
                      <div className="text-pink-600 font-medium text-sm">{stat.label}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Enhanced Process Section */}
        <section className="py-20 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-pink-50/30"></div>
          <div className="absolute inset-0 opacity-5">
            <img 
              src="/warehouse-operations.png" 
              alt="Professional warehouse operations" 
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="container mx-auto px-4 relative">
            <div className="text-center mb-16">
              <div className="inline-flex items-center bg-pink-100 text-pink-700 rounded-full px-6 py-2 text-sm font-semibold mb-6">
                <Package className="w-4 h-4 mr-2" />
                How It Works
              </div>
              <h2 className="text-5xl font-bold text-rose-900 mb-6">
                Simple 5-Step Process
              </h2>
              <p className="text-xl text-pink-600 max-w-3xl mx-auto leading-relaxed">
                From your door in New Jersey to your destination in the Caribbean, 
                we handle every step with professional care and precision.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
              {processSteps.map((step, index) => (
                <div key={index} className="text-center group">
                  <div className="relative mb-6">
                    <div className="bg-white w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transform group-hover:scale-110 transition-all duration-300 border border-pink-100">
                      <div className="text-pink-600">
                        {step.icon}
                      </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-pink-600 to-fuchsia-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-rose-900 mb-3">{step.title}</h3>
                  <p className="text-pink-600 text-sm leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-12">
              <Link 
                to="/how-it-works" 
                className="inline-flex items-center bg-gradient-to-r from-pink-600 to-fuchsia-600 text-white font-semibold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                Learn More About Our Process <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Enhanced Features Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <div className="inline-flex items-center bg-emerald-100 text-emerald-700 rounded-full px-6 py-2 text-sm font-semibold mb-6">
                <Star className="w-4 h-4 mr-2" />
                Why Choose Us
              </div>
              <h2 className="text-5xl font-bold text-rose-900 mb-6">
                Trusted Caribbean Specialists
              </h2>
              <p className="text-xl text-pink-600 max-w-3xl mx-auto">
                Trusted by the Caribbean diaspora community across New Jersey
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="group relative">
                  <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border border-gray-100 h-full">
                    <div className={`bg-gradient-to-r ${feature.color} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold mb-4 text-rose-900 text-center">{feature.title}</h3>
                    <p className="text-pink-600 text-center leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Enhanced Destinations Section */}
        <section className="py-20 relative bg-gradient-to-br from-pink-50 to-purple-50">
          <div className="absolute inset-0 opacity-10">
            <img 
              src="/global-shipping-network.jpg" 
              alt="Global shipping network" 
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="container mx-auto px-4 relative">
            <div className="text-center mb-16">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 mx-auto max-w-3xl shadow-xl border border-white/50">
                <div className="inline-flex items-center bg-blue-100 text-blue-700 rounded-full px-6 py-2 text-sm font-semibold mb-6">
                  <Globe className="w-4 h-4 mr-2" />
                  Our Destinations
                </div>
                <h2 className="text-5xl font-bold text-rose-900 mb-6">
                  Caribbean Destinations We Serve
                </h2>
                <p className="text-xl text-pink-600">
                  Precision air cargo service to major Caribbean destinations
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {destinations.map((dest, index) => (
                <div key={index} className="group">
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 text-center hover:bg-white hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-white/50">
                    <div className="text-4xl mb-4">{dest.flag}</div>
                    <h3 className="text-lg font-bold text-rose-900 mb-2">{dest.country}</h3>
                    <p className="text-pink-600 mb-4">{dest.city}</p>
                    <div className="space-y-2">
                      <div className="text-sm text-pink-700 font-medium bg-pink-100 rounded-lg px-3 py-1">
                        {dest.days}
                      </div>
                      <div className="text-lg font-bold text-emerald-600">{dest.rate}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-12">
              <Link 
                to="/service-areas" 
                className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                View All Destinations & Rates <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Enhanced Testimonials Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <div className="inline-flex items-center bg-yellow-100 text-yellow-700 rounded-full px-6 py-2 text-sm font-semibold mb-6">
                <Users className="w-4 h-4 mr-2" />
                Customer Stories
              </div>
              <h2 className="text-5xl font-bold text-rose-900 mb-6">
                What Our Customers Say
              </h2>
              <p className="text-xl text-pink-600">
                Trusted by Caribbean families and businesses across New Jersey
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="group">
                  <div className="bg-gradient-to-br from-white to-pink-50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border border-pink-100 h-full">
                    <div className="flex items-center mb-6">
                      <div className="bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold mr-4">
                        {testimonial.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                          ))}
                        </div>
                        <div className="font-semibold text-rose-900">{testimonial.name}</div>
                      </div>
                    </div>
                    
                    <p className="text-pink-600 mb-6 italic leading-relaxed">"{testimonial.text}"</p>
                    
                    <div className="border-t border-pink-200 pt-4">
                      <div className="text-sm text-pink-600">{testimonial.location}</div>
                      <div className="text-sm text-pink-700 font-medium">{testimonial.shipmentType}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Enhanced CTA Section */}
        <section className="py-20 bg-gradient-to-r from-rose-900 via-pink-800 to-fuchsia-800 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-black/30"></div>
          <div className="absolute inset-0 opacity-20">
            <img 
              src="/modern-cargo-ship.jpg" 
              alt="Modern cargo operations" 
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-fuchsia-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>

          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="max-w-4xl mx-auto">
              <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-2 text-sm font-medium mb-8">
                <Zap className="w-4 h-4 mr-2" />
                Ready to Ship?
              </div>
              
              <h2 className="text-5xl md:text-6xl font-bold mb-8 leading-tight">
                Start Your Caribbean
                <span className="block text-transparent bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text">
                  Shipping Journey
                </span>
              </h2>
              
              <p className="text-xl md:text-2xl mb-12 text-white/90 max-w-3xl mx-auto leading-relaxed">
                Get an instant quote and start shipping with New Jersey's most trusted Caribbean precision cargo specialists.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Link
                  to="/shipping-calculator"
                  className="group relative overflow-hidden bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-bold px-10 py-5 rounded-2xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 inline-flex items-center"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-fuchsia-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  <span className="relative flex items-center text-lg">
                    Calculate Shipping Cost
                    <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform duration-300" />
                  </span>
                </Link>
                
                <Link
                  to="/contact"
                  className="group bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white font-bold px-10 py-5 rounded-2xl hover:bg-white hover:text-gray-900 transition-all duration-300 inline-flex items-center text-lg"
                >
                  Speak with an Expert
                  <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform duration-300" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  )
}
