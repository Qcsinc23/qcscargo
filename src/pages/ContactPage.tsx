import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Phone, Mail, MapPin, Clock, Send, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AppLayout } from '@/components/layout/AppLayout'

export default function ContactPage() {
  const [searchParams] = useSearchParams()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    inquiryType: 'general'
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-populate form from URL parameters
  useEffect(() => {
    const destination = searchParams.get('destination')
    const inquiry = searchParams.get('inquiry')
    const subject = searchParams.get('subject')
    
    if (destination || inquiry || subject) {
      setFormData(prev => ({
        ...prev,
        inquiryType: inquiry || 'shipping',
        subject: subject || (destination ? `Shipping Quote for ${destination}` : ''),
        message: destination ? `I would like to get a shipping quote for sending cargo to ${destination}. Please provide me with rates and transit time information.` : ''
      }))
    }
  }, [searchParams])

  const inquiryTypes = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'shipping', label: 'Shipping Quote' },
    { value: 'tracking', label: 'Tracking Help' },
    { value: 'business', label: 'Business Services' },
    { value: 'complaint', label: 'Issue/Complaint' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.functions.invoke('contact-form', {
        body: {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject,
          message: formData.message,
          inquiryType: formData.inquiryType
        }
      })

      if (error) throw error

      setSuccess(true)
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        inquiryType: 'general'
      })
    } catch (err: any) {
      setError(err.message || 'Failed to send message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const contactMethods = [
    {
      icon: <Phone className="h-6 w-6" />,
      title: 'Phone',
      detail: '201-249-0929',
      description: 'Call us for immediate assistance'
    },
    {
      icon: <Mail className="h-6 w-6" />,
      title: 'Email',
      detail: 'sales@quietcraftsolutions.com',
      description: 'Email us for detailed inquiries'
    },
    {
      icon: <MapPin className="h-6 w-6" />,
      title: 'Visit Us',
      detail: '35 Obrien St, E12 Kearny, NJ 07032',
      description: 'Come see our facility'
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: 'Business Hours',
      detail: 'Mon-Fri: 9AM-6PM, Sat: 9AM-2PM',
      description: 'Sunday: Closed'
    }
  ]

  if (success) {
    return (
      <AppLayout showStickyCTA={false}>
        <div className="bg-rose-50 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-rose-900 mb-4">
                Thank You for Contacting QCS Cargo!
              </h1>
              <p className="text-xl text-pink-600 mb-8">
                We've received your message and will respond within 24 hours.
                Our team is here to help with all your Caribbean shipping needs.
              </p>
              <div className="space-x-4">
                <button
                  onClick={() => setSuccess(false)}
                  className="bg-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-pink-700 transition-colors"
                >
                  Send Another Message
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout showDesktopBreadcrumb={true} breadcrumbSlot={
      <div className="px-6 py-3">
        <p className="text-sm text-slate-600">Home / Contact</p>
      </div>
    }>
      {/* Mobile breadcrumb - hidden on desktop */}
      <p className="md:hidden text-xs text-slate-500 mt-1 mb-3 px-4">
        Home / Contact
      </p>
      <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-rose-900 to-rose-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Contact QCS Cargo
          </h1>
          <p className="text-xl text-pink-100 max-w-3xl mx-auto">
            Get in touch with New Jersey's trusted Caribbean air cargo specialists. 
            We're here to help with quotes, tracking, and all your shipping questions.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div>
              <h2 className="text-3xl font-bold text-rose-900 mb-8">Get In Touch</h2>
              
              <div className="space-y-6 mb-8">
                {contactMethods.map((method, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="bg-pink-100 p-3 rounded-lg">
                      {method.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-rose-900">{method.title}</h3>
                      <p className="text-pink-600 font-medium">{method.detail}</p>
                      <p className="text-pink-600 text-sm">{method.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Emergency Contact */}
              <div className="bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-400">
                <h3 className="text-lg font-semibold text-rose-900 mb-2">
                  Need Urgent Help?
                </h3>
                <p className="text-pink-600 mb-3">
                  For time-sensitive shipments or urgent issues, call us directly during business hours. 
                  We prioritize urgent cargo needs for our Caribbean community.
                </p>
                <a href="tel:201-249-0929" className="text-pink-600 font-semibold hover:text-pink-700">
                  Call Now: 201-249-0929
                </a>
              </div>

              {/* Facility Information */}
              <div className="mt-8">
                <h3 className="text-2xl font-semibold text-rose-900 mb-4">Visit Our Facility</h3>
                <div className="bg-rose-50 p-6 rounded-lg">
                  <p className="text-pink-600 mb-4">
                    <strong>QCS Cargo Shipping Center</strong><br />
                    35 Obrien St, E12<br />
                    Kearny, NJ 07032
                  </p>
                  <div className="space-y-2 text-sm text-pink-600">
                    <p>• Secure, climate-controlled facility</p>
                    <p>• Professional cargo handling equipment</p>
                    <p>• Convenient parking available</p>
                    <p>• Easy access from Newark and Jersey City</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-rose-50 p-8 rounded-xl">
              <h2 className="text-3xl font-bold text-rose-900 mb-6">Send Us a Message</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name and Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-pink-600 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="scroll-mb-sticky w-full p-3 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-700 focus:border-pink-700"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-pink-600 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="scroll-mb-sticky w-full p-3 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-700 focus:border-pink-700"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                {/* Phone and Inquiry Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-pink-600 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="scroll-mb-sticky w-full p-3 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-700 focus:border-pink-700"
                      placeholder="(201) 555-0123"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-pink-600 mb-2">
                      Inquiry Type
                    </label>
                    <select
                      value={formData.inquiryType}
                      onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value })}
                      className="scroll-mb-sticky w-full p-3 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-700 focus:border-pink-700"
                    >
                      {inquiryTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-pink-600 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="scroll-mb-sticky w-full p-3 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-700 focus:border-pink-700"
                    placeholder="Brief subject line"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-pink-600 mb-2">
                    Message *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="scroll-mb-sticky w-full p-3 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-700 focus:border-pink-700"
                    placeholder="Tell us how we can help you with your Caribbean shipping needs..."
                  ></textarea>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-pink-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      Send Message <Send className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>
              </form>
              
              <p className="text-sm text-pink-500 mt-4 text-center">
                We typically respond to all inquiries within 24 hours during business days.
              </p>
            </div>
          </div>
        </div>
      </section>
      </div>
    </AppLayout>
  )
}