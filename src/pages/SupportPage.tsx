import React, { useState } from 'react'
import { Phone, Mail, Clock, MessageCircle, FileText, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MarketingLayout } from '@/components/layout/MarketingLayout'

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    priority: 'medium'
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      // This would typically submit to a support system
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSuccess(true)
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        priority: 'medium'
      })
    } catch (err) {
      setError('Failed to submit support request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const pageSeo = {
    title: 'Customer Support | QCS Cargo Help Center',
    description: 'Get help with QCS Cargo shipments, tracking, and account support from our Caribbean air cargo team.',
    canonicalPath: '/support'
  }

  return (
    <MarketingLayout seo={pageSeo}>
      <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="bg-yellow-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Customer Support
          </h1>
          <p className="text-xl text-primary-foreground/90 max-w-3xl mx-auto">
            We're here to help with all your shipping needs. Get in touch with our experienced team 
            for assistance with rates, tracking, documentation, and more.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Multiple Ways to Reach Us
            </h2>
            <p className="text-xl text-gray-600">
              Choose the contact method that works best for you
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="text-center">
              <CardHeader>
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Call Us</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Speak directly with our shipping experts</p>
                <p className="text-2xl font-bold text-primary mb-2">(305) 555-0123</p>
                <p className="text-sm text-gray-500">Monday - Friday: 8:00 AM - 6:00 PM EST</p>
                <p className="text-sm text-gray-500">Saturday: 9:00 AM - 2:00 PM EST</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle>Email Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Get detailed help via email</p>
                <p className="text-xl font-semibold text-green-600 mb-2">support@qcscargo.com</p>
                <p className="text-sm text-gray-500">Response within 2-4 hours</p>
                <p className="text-sm text-gray-500">24/7 for urgent matters</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle>Live Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Instant support while you browse</p>
                <Button className="bg-purple-600 hover:bg-purple-700 mb-2">
                  Start Live Chat
                </Button>
                <p className="text-sm text-gray-500">Available during business hours</p>
                <p className="text-sm text-gray-500">Average wait time: &lt; 30 seconds</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Support Request Form */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Submit a Support Request
              </h2>
              <p className="text-xl text-gray-600">
                Fill out the form below and we'll get back to you promptly
              </p>
            </div>

            <Card>
              <CardContent className="p-8">
                {success && (
                  <Alert className="mb-6 bg-green-50 border-green-200">
                    <AlertDescription className="text-green-800">
                      Thank you! Your support request has been submitted successfully. 
                      We'll respond within 2-4 hours.
                    </AlertDescription>
                  </Alert>
                )}
                
                {error && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      placeholder="Brief description of your inquiry"
                    />
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority Level</Label>
                    <select
                      id="priority"
                      name="priority"
                      value={formData.priority}
                      onChange={handleChange}
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low - General inquiry</option>
                      <option value="medium">Medium - Standard support</option>
                      <option value="high">High - Urgent issue</option>
                      <option value="critical">Critical - Service disruption</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      rows={6}
                      placeholder="Please provide detailed information about your inquiry, including any tracking numbers or order references if applicable."
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Submitting...' : 'Submit Support Request'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Quick answers to common questions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 text-primary mr-2" />
                  Documentation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Questions about required documents, customs forms, and paperwork
                </p>
                <Button variant="outline" className="w-full">
                  View FAQ
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 text-green-600 mr-2" />
                  Account & Billing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Account setup, billing questions, payment methods, and invoicing
                </p>
                <Button variant="outline" className="w-full">
                  View FAQ
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 text-purple-600 mr-2" />
                  Shipping & Delivery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Transit times, tracking, packaging requirements, and delivery options
                </p>
                <Button variant="outline" className="w-full">
                  View FAQ
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Emergency Contact */}
      <section className="py-16 bg-red-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-red-900 mb-4">
            Emergency Support
          </h2>
          <p className="text-xl text-red-700 mb-8">
            For urgent shipment issues, customs holds, or time-sensitive matters
          </p>
          <div className="bg-red-600 text-white p-6 rounded-xl max-w-md mx-auto">
            <p className="text-lg font-semibold mb-2">24/7 Emergency Hotline</p>
            <p className="text-3xl font-bold mb-2">(305) 555-9999</p>
            <p className="text-sm opacity-90">Available for critical issues only</p>
          </div>
        </div>
      </section>
      </div>
    </MarketingLayout>
  )
}

