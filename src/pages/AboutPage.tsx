import React from 'react'
import { Link } from 'react-router-dom'
import { Shield, Users, Award, Plane, MapPin, Clock, Heart, CheckCircle } from 'lucide-react'

export default function AboutPage() {
  const teamMembers = [
    {
      name: "Carlos Rodriguez",
      title: "Founder & Operations Director",
      experience: "15+ years in Caribbean logistics",
      specialty: "Guyana and Suriname operations"
    },
    {
      name: "Maria Santos",
      title: "Customer Service Manager",
      experience: "10+ years in international shipping",
      specialty: "Jamaica and Trinidad services"
    },
    {
      name: "David Thompson",
      title: "Logistics Coordinator",
      experience: "8+ years in air cargo",
      specialty: "Customs documentation and compliance"
    }
  ]

  const certifications = [
    "International Air Transport Association (IATA) Certified",
    "TSA Certified Cargo Screening Facility",
    "Customs and Border Protection (CBP) Approved",
    "DOT HAZMAT Certified Operations Team",
    "ISO 9001:2015 Quality Management Certified"
  ]

  const milestones = [
    {
      year: "2015",
      title: "Company Founded",
      description: "QCS Cargo established to serve the Caribbean diaspora community in New Jersey"
    },
    {
      year: "2017",
      title: "Facility Expansion",
      description: "Moved to larger, climate-controlled facility in Kearny with enhanced security"
    },
    {
      year: "2019",
      title: "Partnership Growth",
      description: "Established key partnerships with Caribbean delivery networks"
    },
    {
      year: "2021",
      title: "Technology Upgrade",
      description: "Implemented real-time tracking and online customer portal"
    },
    {
      year: "2023",
      title: "Service Excellence",
      description: "Achieved 99% customer satisfaction rate and industry recognition"
    }
  ]

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-900 to-blue-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            About QCS Cargo
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Connecting the Caribbean diaspora in New Jersey with their families and businesses 
            through reliable, professional air cargo services since 2015.
          </p>
        </div>
      </section>

      {/* Company Story */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  Our Story
                </h2>
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p>
                    QCS Cargo was founded in 2015 with a simple mission: to provide the Caribbean 
                    diaspora community in New Jersey with reliable, professional, and affordable 
                    air cargo services to their home countries.
                  </p>
                  <p>
                    Having personally experienced the challenges of shipping to the Caribbean, our 
                    founder Carlos Rodriguez recognized the need for a service that truly understood 
                    the cultural and logistical requirements of Caribbean shipping.
                  </p>
                  <p>
                    Today, we're proud to serve thousands of customers annually, helping families 
                    stay connected, businesses grow, and communities thrive across the Caribbean.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-6 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">10+</div>
                  <div className="text-gray-700">Years Serving Community</div>
                </div>
                <div className="bg-green-50 p-6 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">5,000+</div>
                  <div className="text-gray-700">Successful Shipments</div>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">99%</div>
                  <div className="text-gray-700">Customer Satisfaction</div>
                </div>
                <div className="bg-yellow-50 p-6 rounded-lg text-center">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">5</div>
                  <div className="text-gray-700">Caribbean Countries</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission, Vision, Values */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-lg text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
              <p className="text-gray-700">
                To connect Caribbean diaspora families and businesses through reliable, 
                professional air cargo services that bridge the distance with care and expertise.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-lg text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plane className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h3>
              <p className="text-gray-700">
                To be the Caribbean community's most trusted partner for air cargo services, 
                known for excellence, reliability, and cultural understanding.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-lg text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Values</h3>
              <p className="text-gray-700">
                Integrity, cultural respect, professional excellence, and community commitment 
                guide every aspect of our service delivery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Facility */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Our Secure Facility
            </h2>
            <p className="text-xl text-gray-600">
              State-of-the-art cargo facility designed for security, efficiency, and professional handling
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-600">
              <div className="flex items-center mb-4">
                <Shield className="h-6 w-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold">24/7 Security</h3>
              </div>
              <p className="text-gray-600">
                Comprehensive surveillance system with restricted access controls and professional security monitoring.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-green-600">
              <div className="flex items-center mb-4">
                <Clock className="h-6 w-6 text-green-600 mr-3" />
                <h3 className="text-lg font-semibold">Climate Control</h3>
              </div>
              <p className="text-gray-600">
                Temperature and humidity controlled environment to protect sensitive items during storage.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-purple-600">
              <div className="flex items-center mb-4">
                <MapPin className="h-6 w-6 text-purple-600 mr-3" />
                <h3 className="text-lg font-semibold">Strategic Location</h3>
              </div>
              <p className="text-gray-600">
                Conveniently located in Kearny, NJ with easy access from Newark, Jersey City, and surrounding areas.
              </p>
            </div>
          </div>

          <div className="mt-12 bg-blue-50 p-8 rounded-xl">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Facility Address</h3>
              <div className="text-lg text-gray-700">
                <strong>QCS Cargo Shipping Center</strong><br />
                35 Obrien St, E12<br />
                Kearny, NJ 07032
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold mb-3">Facility Features:</h4>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Professional cargo handling equipment
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Secure storage areas with organized inventory
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Customer service area and consultation space
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Loading dock for efficient pickup and delivery
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Visit Information:</h4>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Free parking available on-site
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Convenient access from major highways
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Public transportation accessible
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Facility tours available by appointment
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Our Expert Team
            </h2>
            <p className="text-xl text-gray-600">
              Experienced professionals dedicated to serving the Caribbean community
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-lg text-center">
                <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{member.name}</h3>
                <p className="text-blue-600 font-semibold mb-2">{member.title}</p>
                <p className="text-gray-600 text-sm mb-2">{member.experience}</p>
                <p className="text-gray-700 text-sm">
                  <strong>Specialty:</strong> {member.specialty}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Certifications & Compliance
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certifications.map((cert, index) => (
                <div key={index} className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-center">
                    <Award className="h-5 w-5 text-green-600 mr-3" />
                    <span className="text-gray-700 font-medium">{cert}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Company Timeline */}
      <section className="py-16 bg-blue-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Our Journey
              </h2>
              <p className="text-xl text-gray-600">
                Key milestones in our commitment to serving the Caribbean community
              </p>
            </div>

            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <div key={index} className="flex items-start">
                  <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg mr-6 flex-shrink-0">
                    {milestone.year}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{milestone.title}</h3>
                    <p className="text-gray-700">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Experience the QCS Cargo Difference
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers who trust QCS Cargo for their Caribbean shipping needs.
          </p>
          <div className="space-x-4">
            <Link 
              to="/shipping-calculator" 
              className="bg-yellow-500 text-blue-900 px-8 py-4 rounded-lg text-lg font-bold hover:bg-yellow-400 transition-colors inline-block"
            >
              Get Your Quote Today
            </Link>
            <Link 
              to="/contact" 
              className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-blue-900 transition-colors inline-block"
            >
              Visit Our Facility
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}