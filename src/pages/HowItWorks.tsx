import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Package, Plane, FileText, Truck, CheckCircle } from 'lucide-react'

export default function HowItWorks() {
  const steps = [
    {
      number: 1,
      title: "Get Quote & Schedule",
      description: "Contact QCS Cargo for a detailed rate quote based on your shipment details. We'll provide transparent pricing and help you choose the best service level for your needs.",
      details: [
        "Call 201-249-0929 or use our online calculator",
        "Provide weight, dimensions, and destination",
        "Choose standard or express service",
        "Schedule pickup or arrange drop-off"
      ],
      icon: <FileText className="h-12 w-12 text-blue-600" />,
      duration: "5-10 minutes"
    },
    {
      number: 2,
      title: "Cargo Drop-off or Pickup",
      description: "Bring your items to our secure facility in Kearny, NJ, or schedule our convenient pickup service within 25 miles. Our team will inspect and document your cargo.",
      details: [
        "Visit our facility: 35 Obrien St, E12 Kearny, NJ 07032",
        "Pickup service available for $25 (within 25 miles)",
        "Professional cargo inspection and documentation",
        "Secure storage in climate-controlled facility"
      ],
      icon: <Truck className="h-12 w-12 text-blue-600" />,
      duration: "Same day"
    },
    {
      number: 3,
      title: "Processing & Consolidation",
      description: "Our team prepares your shipment for air freight, handles all customs documentation, and consolidates multiple items to maximize savings.",
      details: [
        "Professional packaging and protection",
        "Customs documentation preparation",
        "Consolidation with other shipments (optional)",
        "Quality control and final inspection"
      ],
      icon: <Package className="h-12 w-12 text-blue-600" />,
      duration: "1-2 business days"
    },
    {
      number: 4,
      title: "Air Freight Shipping",
      description: "Your cargo is shipped via our trusted air freight partners with real-time tracking. Express service available for faster delivery to Caribbean destinations.",
      details: [
        "Trusted air cargo carrier partnerships",
        "Real-time tracking updates",
        "Express service available (+25% for 1-2 days faster)",
        "Secure handling throughout transit"
      ],
      icon: <Plane className="h-12 w-12 text-blue-600" />,
      duration: "3-7 days in transit"
    },
    {
      number: 5,
      title: "Destination Delivery",
      description: "Once your cargo arrives at the destination airport, we coordinate with local partners for final delivery or notify you for pickup arrangements.",
      details: [
        "Customs clearance coordination",
        "Local delivery arrangement (where available)",
        "Airport pickup notification",
        "Delivery confirmation and documentation"
      ],
      icon: <CheckCircle className="h-12 w-12 text-blue-600" />,
      duration: "1-3 days for delivery"
    }
  ]

  const documentationRequired = [
    {
      title: "Customs Declaration Forms",
      description: "Detailed description and value of all items being shipped"
    },
    {
      title: "Item Inventory List",
      description: "Complete list with quantities, descriptions, and individual values"
    },
    {
      title: "Recipient Information",
      description: "Full name, address, and contact details for the recipient"
    },
    {
      title: "ID Documentation",
      description: "Valid photo ID for both sender and recipient"
    }
  ]

  const packagingGuidelines = [
    {
      title: "Use Strong Boxes",
      description: "Double-wall cardboard boxes or sturdy plastic containers"
    },
    {
      title: "Protect Fragile Items",
      description: "Bubble wrap, foam padding, or newspaper for cushioning"
    },
    {
      title: "Seal Securely",
      description: "Quality packing tape on all seams and edges"
    },
    {
      title: "Label Clearly",
      description: "Clear, readable labels with complete address information"
    }
  ]

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-900 to-blue-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            How Our Air Cargo Process Works
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Simple, professional, and reliable air freight service from New Jersey to the Caribbean. 
            Follow our proven 5-step process for hassle-free shipping.
          </p>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-12">
              {steps.map((step, index) => (
                <div key={index} className="relative">
                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-8 top-20 w-0.5 h-16 bg-blue-200 hidden md:block"></div>
                  )}
                  
                  <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-blue-600">
                    <div className="flex flex-col md:flex-row items-start space-y-4 md:space-y-0 md:space-x-6">
                      {/* Icon and Number */}
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-100 p-4 rounded-full">
                          {step.icon}
                        </div>
                        <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                          {step.number}
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                          <h3 className="text-2xl font-bold text-gray-900 mb-2 md:mb-0">{step.title}</h3>
                          <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                            {step.duration}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 text-lg mb-4">{step.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {step.details.map((detail, detailIndex) => (
                            <div key={detailIndex} className="flex items-start">
                              <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700">{detail}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Documentation Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Required Documentation
              </h2>
              <p className="text-xl text-gray-600">
                Ensure smooth customs clearance with proper documentation
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {documentationRequired.map((doc, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{doc.title}</h3>
                  <p className="text-gray-600">{doc.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Packaging Guidelines */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Packaging Guidelines
              </h2>
              <p className="text-xl text-gray-600">
                Proper packaging ensures your items arrive safely at their destination
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {packagingGuidelines.map((guideline, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-green-500">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{guideline.title}</h3>
                  <p className="text-gray-600">{guideline.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Summary */}
      <section className="py-16 bg-blue-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Total Timeline: 5-12 Days Door-to-Door
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold text-blue-600 mb-2">Processing</h3>
                <p className="text-3xl font-bold text-gray-900 mb-2">1-2 Days</p>
                <p className="text-gray-600">Quote to ready for shipping</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold text-blue-600 mb-2">Transit</h3>
                <p className="text-3xl font-bold text-gray-900 mb-2">3-7 Days</p>
                <p className="text-gray-600">Air freight to Caribbean</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold text-blue-600 mb-2">Delivery</h3>
                <p className="text-3xl font-bold text-gray-900 mb-2">1-3 Days</p>
                <p className="text-gray-600">Customs clearance to delivery</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Start Shipping?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Get your instant quote today and experience professional Caribbean air cargo service.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/shipping-calculator" 
              className="bg-yellow-500 text-blue-900 px-8 py-4 rounded-lg text-lg font-bold hover:bg-yellow-400 transition-colors inline-flex items-center justify-center"
            >
              Calculate Shipping Cost <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              to="/contact" 
              className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-blue-900 transition-colors inline-flex items-center justify-center"
            >
              Contact Our Team
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}