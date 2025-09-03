import React from 'react'
import { FileText, Shield, Calendar, AlertTriangle } from 'lucide-react'

export default function TermsOfServicePage() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-900 to-blue-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="bg-yellow-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="h-8 w-8 text-blue-900" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Terms of Service
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Please read these terms and conditions carefully before using our shipping services.
          </p>
          <p className="text-sm text-blue-200 mt-4">
            Last Updated: January 15, 2025
          </p>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          
          {/* Acceptance of Terms */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              1. Acceptance of Terms
            </h2>
            <div className="bg-blue-50 p-6 rounded-lg">
              <p className="text-gray-700 mb-4">
                By using QCS Cargo's shipping services, website, or facilities, you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our services.
              </p>
              <p className="text-gray-700">
                These terms constitute a legally binding agreement between you ("Customer" or "you") and 
                QCS Cargo ("we," "us," or "our").
              </p>
            </div>
          </div>

          {/* Services Description */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              2. Services Description
            </h2>
            <p className="text-gray-700 mb-6">
              QCS Cargo provides air cargo shipping services from New Jersey to Caribbean destinations, including:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Core Services</h3>
                <ul className="text-gray-700 space-y-2">
                  <li>• Air cargo shipping and freight forwarding</li>
                  <li>• Package consolidation services</li>
                  <li>• Customs documentation preparation</li>
                  <li>• Secure storage and handling</li>
                  <li>• Pickup and delivery coordination</li>
                </ul>
              </div>
              <div className="bg-white border border-gray-200 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Additional Services</h3>
                <ul className="text-gray-700 space-y-2">
                  <li>• Packaging and crating services</li>
                  <li>• Insurance coverage options</li>
                  <li>• Express and priority shipping</li>
                  <li>• Business account services</li>
                  <li>• Shipment tracking and notifications</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Customer Responsibilities */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              3. Customer Responsibilities
            </h2>
            
            <div className="space-y-6">
              <div className="bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-500">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                  Accurate Information
                </h3>
                <p className="text-gray-700">
                  You must provide accurate, complete, and truthful information regarding shipment contents, 
                  dimensions, weight, value, and destination details. False or incomplete information may result 
                  in delays, additional charges, or service refusal.
                </p>
              </div>
              
              <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-500">
                <h3 className="text-xl font-semibold mb-4">Prohibited Items</h3>
                <p className="text-gray-700 mb-4">
                  You agree not to ship any prohibited or restricted items, including but not limited to:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ul className="text-gray-700 space-y-1">
                    <li>• Hazardous materials and chemicals</li>
                    <li>• Weapons and ammunition</li>
                    <li>• Illegal drugs and substances</li>
                    <li>• Perishable food items</li>
                    <li>• Live animals or plants</li>
                  </ul>
                  <ul className="text-gray-700 space-y-1">
                    <li>• Flammable liquids and gases</li>
                    <li>• Precious metals and stones</li>
                    <li>• Currency and negotiable instruments</li>
                    <li>• Items violating intellectual property</li>
                    <li>• Items prohibited by destination country</li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
                <h3 className="text-xl font-semibold mb-4">Packaging Requirements</h3>
                <p className="text-gray-700">
                  Customers are responsible for proper packaging to prevent damage during transit. 
                  QCS Cargo offers professional packaging services for fragile or valuable items at additional cost.
                </p>
              </div>
            </div>
          </div>

          {/* Pricing and Payment */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              4. Pricing and Payment Terms
            </h2>
            
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold mb-4">Rates and Charges</h3>
              <ul className="text-gray-700 space-y-2">
                <li>• Rates are based on actual or dimensional weight, whichever is greater</li>
                <li>• Quotes are valid for 30 days from issuance</li>
                <li>• Additional charges may apply for special handling, oversize items, or express service</li>
                <li>• Fuel surcharges and carrier fees may be added as applicable</li>
                <li>• All prices exclude customs duties, taxes, and destination country fees</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Payment Terms</h3>
              <ul className="text-gray-700 space-y-2">
                <li>• Payment is due at time of service unless credit terms are pre-approved</li>
                <li>• We accept cash, check, and major credit cards</li>
                <li>• Business accounts may be eligible for NET 30 payment terms</li>
                <li>• Late payments may incur service charges and interest</li>
                <li>• Unpaid invoices may result in suspension of services</li>
              </ul>
            </div>
          </div>

          {/* Liability and Insurance */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              5. Liability and Insurance
            </h2>
            
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Shield className="h-5 w-5 text-blue-600 mr-2" />
                  Standard Liability
                </h3>
                <p className="text-gray-700 mb-4">
                  QCS Cargo's liability for loss or damage is limited to $100 per shipment unless additional 
                  insurance is purchased. Our liability does not exceed the declared value of the shipment.
                </p>
                <p className="text-gray-700">
                  <strong>We are not liable for:</strong> Consequential damages, loss of profits, delays caused by 
                  weather/customs/strikes, or damage due to improper packaging.
                </p>
              </div>
              
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Insurance Options</h3>
                <p className="text-gray-700">
                  Additional insurance coverage is available for high-value shipments. Insurance claims must be 
                  filed within 30 days of delivery with supporting documentation including photos and receipts.
                </p>
              </div>
            </div>
          </div>

          {/* Service Standards */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              6. Service Standards and Disclaimers
            </h2>
            
            <div className="space-y-6">
              <div className="bg-yellow-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Transit Times</h3>
                <p className="text-gray-700">
                  Transit times are estimates and not guaranteed. Delays may occur due to weather conditions, 
                  customs processing, carrier issues, or other factors beyond our control. Express service 
                  provides priority handling but does not guarantee specific delivery dates.
                </p>
              </div>
              
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Storage and Holding</h3>
                <p className="text-gray-700">
                  Free storage is provided for up to 7 days. Extended storage incurs daily charges. 
                  Shipments not collected within 30 days may be disposed of at owner's expense.
                </p>
              </div>
            </div>
          </div>

          {/* Dispute Resolution */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              7. Dispute Resolution
            </h2>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Claims Process</h3>
              <ol className="text-gray-700 space-y-2 list-decimal list-inside">
                <li>All claims must be filed in writing within 30 days of delivery</li>
                <li>Claims require supporting documentation (receipts, photos, etc.)</li>
                <li>We will investigate and respond within 15 business days</li>
                <li>Disputes not resolved through our claims process may be subject to arbitration</li>
                <li>Legal disputes are subject to New Jersey state law and jurisdiction</li>
              </ol>
            </div>
          </div>

          {/* Termination and Modification */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              8. Termination and Modification of Terms
            </h2>
            
            <div className="space-y-4">
              <p className="text-gray-700">
                QCS Cargo reserves the right to modify these terms at any time. Changes will be posted on our website 
                and take effect immediately. Continued use of our services constitutes acceptance of modified terms.
              </p>
              
              <p className="text-gray-700">
                We may refuse service or terminate customer relationships at our discretion, particularly for 
                violations of these terms, non-payment, or inappropriate conduct.
              </p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-blue-50 p-8 rounded-lg">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              9. Contact Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">QCS Cargo</h3>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Address:</strong><br />35 Obrien St, E12<br />Kearny, NJ 07032</p>
                  <p><strong>Phone:</strong> (201) 249-0929</p>
                  <p><strong>Email:</strong> sales@quietcraftsolutions.com</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-4">Business Hours</h3>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Monday - Friday:</strong> 9:00 AM - 6:00 PM</p>
                  <p><strong>Saturday:</strong> 9:00 AM - 2:00 PM</p>
                  <p><strong>Sunday:</strong> Closed</p>
                  <p><strong>Emergency:</strong> Available for urgent matters</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-white rounded border-l-4 border-blue-600">
              <p className="text-gray-700">
                <strong>Questions about these terms?</strong> Contact our customer service team for clarification 
                or assistance with any provisions outlined above.
              </p>
            </div>
          </div>
          
        </div>
      </section>
    </div>
  )
}