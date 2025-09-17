import React from 'react'
import { Shield, FileText, Calendar, Mail } from 'lucide-react'
import { MarketingLayout } from '@/components/layout/MarketingLayout'

export default function PrivacyPolicyPage() {
  const pageSeo = {
    title: 'Privacy Policy | QCS Cargo',
    description: 'Learn how QCS Cargo handles customer information for Caribbean shipping services, including data usage and security.',
    canonicalPath: '/privacy-policy',
    noindex: true
  }

  return (
    <MarketingLayout seo={pageSeo}>
      <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-900 to-blue-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="bg-yellow-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="h-8 w-8 text-blue-900" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Privacy Policy
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Your privacy is important to us. This policy outlines how QCS Cargo collects, 
            uses, and protects your personal information.
          </p>
          <p className="text-sm text-blue-200 mt-4">
            Last Updated: January 15, 2025
          </p>
        </div>
      </section>

      {/* Privacy Policy Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          
          {/* Information We Collect */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Information We Collect
            </h2>
            
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold mb-4">Personal Information</h3>
              <p className="text-gray-700 mb-4">
                We collect personal information that you voluntarily provide to us when:
              </p>
              <ul className="text-gray-700 space-y-2 ml-4">
                <li>??? Creating an account on our website</li>
                <li>??? Requesting shipping quotes or services</li>
                <li>??? Contacting us for customer support</li>
                <li>??? Subscribing to our newsletter or updates</li>
                <li>??? Processing shipment transactions</li>
              </ul>
              
              <h4 className="font-semibold mt-6 mb-2">This may include:</h4>
              <ul className="text-gray-700 space-y-1 ml-4">
                <li>??? Full name and contact information</li>
                <li>??? Email address and phone number</li>
                <li>??? Shipping addresses (origin and destination)</li>
                <li>??? Payment information (processed securely through third parties)</li>
                <li>??? Business information and tax identification numbers</li>
                <li>??? Package contents and shipping preferences</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Automatically Collected Information</h3>
              <p className="text-gray-700 mb-4">
                When you visit our website, we automatically collect certain information:
              </p>
              <ul className="text-gray-700 space-y-1 ml-4">
                <li>??? IP address and browser type</li>
                <li>??? Device information and operating system</li>
                <li>??? Pages visited and time spent on our site</li>
                <li>??? Referring website and search terms used</li>
                <li>??? Cookies and similar tracking technologies</li>
              </ul>
            </div>
          </div>

          {/* How We Use Information */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              How We Use Your Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <FileText className="h-5 w-5 text-blue-600 mr-2" />
                  Service Delivery
                </h3>
                <ul className="text-gray-700 space-y-2">
                  <li>??? Process and fulfill shipping requests</li>
                  <li>??? Communicate about shipment status</li>
                  <li>??? Provide customer support</li>
                  <li>??? Generate shipping documentation</li>
                  <li>??? Handle customs and regulatory requirements</li>
                </ul>
              </div>
              
              <div className="bg-white border border-gray-200 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Mail className="h-5 w-5 text-green-600 mr-2" />
                  Business Operations
                </h3>
                <ul className="text-gray-700 space-y-2">
                  <li>??? Improve our website and services</li>
                  <li>??? Send service updates and notifications</li>
                  <li>??? Conduct business analytics</li>
                  <li>??? Comply with legal obligations</li>
                  <li>??? Prevent fraud and security threats</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Information Sharing */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Information Sharing and Disclosure
            </h2>
            
            <div className="bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-500 mb-6">
              <h3 className="text-xl font-semibold mb-4">We DO NOT sell your personal information</h3>
              <p className="text-gray-700">
                QCS Cargo does not sell, rent, or trade your personal information to third parties for marketing purposes.
              </p>
            </div>
            
            <h3 className="text-xl font-semibold mb-4">We may share information with:</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold text-gray-900">Service Partners</h4>
                <p className="text-gray-700">Airlines, customs brokers, and logistics partners necessary to complete your shipments</p>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold text-gray-900">Legal Compliance</h4>
                <p className="text-gray-700">Government agencies when required by law or for customs/security purposes</p>
              </div>
              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-semibold text-gray-900">Business Protection</h4>
                <p className="text-gray-700">Law enforcement or legal authorities to protect our rights or investigate fraud</p>
              </div>
            </div>
          </div>

          {/* Data Security */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Data Security and Retention
            </h2>
            
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Shield className="h-5 w-5 text-green-600 mr-2" />
                Security Measures
              </h3>
              <p className="text-gray-700 mb-4">
                We implement appropriate technical and organizational security measures to protect your personal information:
              </p>
              <ul className="text-gray-700 space-y-1 ml-4">
                <li>??? SSL encryption for data transmission</li>
                <li>??? Secure servers and database protection</li>
                <li>??? Access controls and employee training</li>
                <li>??? Regular security assessments and updates</li>
                <li>??? Secure payment processing through certified providers</li>
              </ul>
              
              <h4 className="font-semibold mt-6 mb-2">Data Retention</h4>
              <p className="text-gray-700">
                We retain your personal information for as long as necessary to provide services and comply with legal obligations. 
                Shipping records are typically retained for 7 years for regulatory compliance.
              </p>
            </div>
          </div>

          {/* Your Rights */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Your Privacy Rights
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Access</h4>
                  <p className="text-gray-600 text-sm">Request access to your personal information we hold</p>
                </div>
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Correction</h4>
                  <p className="text-gray-600 text-sm">Request correction of inaccurate information</p>
                </div>
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Deletion</h4>
                  <p className="text-gray-600 text-sm">Request deletion of your personal information (subject to legal requirements)</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Portability</h4>
                  <p className="text-gray-600 text-sm">Request transfer of your data in a machine-readable format</p>
                </div>
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Opt-Out</h4>
                  <p className="text-gray-600 text-sm">Unsubscribe from marketing communications</p>
                </div>
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Complaints</h4>
                  <p className="text-gray-600 text-sm">Lodge privacy complaints with relevant authorities</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 bg-blue-50 p-6 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">How to Exercise Your Rights</h4>
              <p className="text-gray-700">
                To exercise any of these rights, please contact us at <strong>privacy@qcscargo.com</strong> or 
                call <strong>(305) 555-0123</strong>. We will respond to your request within 30 days.
              </p>
            </div>
          </div>

          {/* Cookies */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Cookies and Tracking Technologies
            </h2>
            
            <p className="text-gray-700 mb-6">
              We use cookies and similar technologies to enhance your browsing experience and analyze website traffic.
            </p>
            
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Cookie Type</th>
                    <th className="px-6 py-3 text-left font-semibold">Purpose</th>
                    <th className="px-6 py-3 text-left font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-6 py-3 font-medium">Essential</td>
                    <td className="px-6 py-3 text-gray-700">Required for website functionality and security</td>
                    <td className="px-6 py-3 text-gray-700">Session/Persistent</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-6 py-3 font-medium">Performance</td>
                    <td className="px-6 py-3 text-gray-700">Website analytics and improvement</td>
                    <td className="px-6 py-3 text-gray-700">Up to 2 years</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3 font-medium">Preferences</td>
                    <td className="px-6 py-3 text-gray-700">Remember your settings and preferences</td>
                    <td className="px-6 py-3 text-gray-700">Up to 1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <p className="text-gray-700 mt-4">
              You can control cookies through your browser settings, but disabling certain cookies may affect website functionality.
            </p>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-50 p-8 rounded-lg">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Contact Us About Privacy
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Privacy Officer</h3>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Email:</strong> privacy@qcscargo.com</p>
                  <p><strong>Phone:</strong> (305) 555-0123</p>
                  <p><strong>Mail:</strong> QCS Cargo Privacy Office<br />1234 Logistics Avenue<br />Miami, FL 33101</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-4">Policy Changes</h3>
                <p className="text-gray-700 mb-4">
                  We may update this privacy policy periodically. Any changes will be posted on this page with an updated revision date.
                </p>
                <p className="text-gray-700">
                  For significant changes, we will notify you by email or through a prominent notice on our website.
                </p>
              </div>
            </div>
          </div>
          
        </div>
      </section>
      </div>
    </MarketingLayout>
  )
}
