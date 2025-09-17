import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Search, HelpCircle, Plane, Package, DollarSign, Clock, Shield } from 'lucide-react'
import { MarketingLayout } from '@/components/layout/MarketingLayout'

export default function FAQPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [openCategories, setOpenCategories] = useState<string[]>(['getting-started'])
  const [openQuestions, setOpenQuestions] = useState<string[]>([])

  const faqCategories = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <HelpCircle className="h-6 w-6" />,
      questions: [
        {
          id: 'quote',
          question: 'How do I get a shipping quote?',
          answer: 'You can get an instant quote using our online shipping calculator or by calling 201-249-0929. We need the weight, dimensions, destination, and declared value of your shipment. Our quotes are valid for 30 days and include transparent pricing with no hidden fees.'
        },
        {
          id: 'schedule',
          question: 'How do I schedule a pickup?',
          answer: 'After receiving your quote, call us to schedule pickup service within 25 miles of our Kearny facility for $25. Alternatively, you can drop off your items directly at our secure facility at 35 Obrien St, E12 Kearny, NJ 07032 during business hours.'
        },
        {
          id: 'payment',
          question: 'What payment methods do you accept?',
          answer: 'We accept cash, credit cards (Visa, MasterCard, American Express, Discover), debit cards, money orders, and bank transfers for large shipments. Business accounts can qualify for Net 15 payment terms.'
        },
        {
          id: 'documentation',
          question: 'What documentation do I need?',
          answer: 'You\'ll need a detailed customs declaration with item descriptions and values, complete recipient information, and valid photo ID. We\'ll help prepare all customs documentation for Caribbean destinations.'
        }
      ]
    },
    {
      id: 'shipping-process',
      title: 'Shipping Process',
      icon: <Plane className="h-6 w-6" />,
      questions: [
        {
          id: 'transit-time',
          question: 'How long does shipping take to Guyana?',
          answer: 'Standard shipping to Georgetown, Guyana takes 3-5 business days for air transit, plus 1-2 days processing and 1-3 days for customs clearance and delivery. Express service reduces transit time by 1-2 days for a 25% surcharge.'
        },
        {
          id: 'caribbean-times',
          question: 'What are transit times to other Caribbean destinations?',
          answer: 'Jamaica: 4-6 days, Trinidad & Tobago: 4-6 days, Barbados: 5-7 days, Suriname: 4-6 days. These are air transit times - add 2-5 days total for processing, customs, and delivery.'
        },
        {
          id: 'consolidation',
          question: 'How does package consolidation work?',
          answer: 'We can combine multiple shipments into one package to save on shipping costs. There\'s a $5 fee per additional shipment consolidated. This service can significantly reduce your total shipping expenses for multiple items.'
        },
        {
          id: 'tracking',
          question: 'How can I track my shipment?',
          answer: 'You\'ll receive a QCS Cargo tracking number and can track your shipment on our website. We also provide air carrier tracking numbers for additional visibility during transit.'
        }
      ]
    },
    {
      id: 'costs-pricing',
      title: 'Costs & Pricing',
      icon: <DollarSign className="h-6 w-6" />,
      questions: [
        {
          id: 'cost-calculation',
          question: 'How do you calculate shipping costs?',
          answer: 'Costs are based on billable weight (actual or dimensional weight, whichever is greater), destination, and service level. Rates range from $3.50-$5.25 per pound depending on destination and weight tiers. Additional fees may apply for special handling, insurance, or pickup.'
        },
        {
          id: 'dimensional-weight',
          question: 'What is dimensional weight?',
          answer: 'Dimensional weight is calculated as Length ?? Width ?? Height ?? 166 (for inches). If this exceeds actual weight, dimensional weight is used for billing. This ensures fair pricing for large, lightweight packages.'
        },
        {
          id: 'additional-fees',
          question: 'What additional fees might apply?',
          answer: 'Pickup service: $25 (within 25 miles), Consolidation: $5 per additional shipment, Express processing: $15, Oversized handling: $20, Insurance: $7.50 per $100 value over $100, Extended storage: $0.75/lb/week after 7 free days.'
        },
        {
          id: 'discounts',
          question: 'Do you offer volume discounts?',
          answer: 'Yes! Monthly shippers get discounts: 100-250 lbs (5% off), 251-500 lbs (10% off), 501-1000 lbs (15% off), 1000+ lbs (custom rates). Business accounts also receive priority service and flexible payment terms.'
        }
      ]
    },
    {
      id: 'prohibited-items',
      title: 'Items & Restrictions',
      icon: <Package className="h-6 w-6" />,
      questions: [
        {
          id: 'what-ship',
          question: 'What items can I ship?',
          answer: 'We ship personal effects, electronics, appliances, non-perishable food items, automotive parts, medical supplies, business cargo, and educational materials. Most household and personal items are accepted.'
        },
        {
          id: 'prohibited',
          question: 'What items cannot be shipped?',
          answer: 'Prohibited: Hazardous materials, live animals/plants, perishable foods, liquids over 32oz per container, weapons, ammunition, illegal drugs, currency, and items restricted by destination country customs.'
        },
        {
          id: 'food-items',
          question: 'Can I ship food items?',
          answer: 'Yes, but only non-perishable packaged food items. There\'s a $0.25/lb surcharge for bulk food handling and a $25 FDA documentation fee. No fresh, frozen, or perishable foods are allowed.'
        },
        {
          id: 'electronics',
          question: 'Are there restrictions on electronics?',
          answer: 'Electronics are generally accepted. Large appliances have a $50 special handling fee. We recommend additional insurance for items over $500. All electronics must be properly packaged and declared.'
        }
      ]
    },
    {
      id: 'customs-delivery',
      title: 'Customs & Delivery',
      icon: <Shield className="h-6 w-6" />,
      questions: [
        {
          id: 'customs-clearance',
          question: 'Who handles customs clearance?',
          answer: 'We prepare all customs documentation and coordinate with destination customs authorities. However, customs duties and taxes are the responsibility of the recipient. Clearance typically takes 1-3 days.'
        },
        {
          id: 'duties-taxes',
          question: 'What about customs duties and taxes?',
          answer: 'Duties and taxes vary by destination country and item type. These are not included in our shipping rates and are paid by the recipient upon delivery. We can provide estimates based on destination requirements.'
        },
        {
          id: 'delivery-options',
          question: 'What happens when my cargo arrives?',
          answer: 'We coordinate with local partners for delivery where available, or arrange airport pickup notification. The recipient will be contacted with delivery details and any required customs payments.'
        },
        {
          id: 'customs-hold',
          question: 'What if customs holds my shipment?',
          answer: 'We monitor all shipments and will notify you of any customs issues. Additional documentation or customs payments may be required. Our team assists with resolving customs holds to minimize delays.'
        }
      ]
    },
    {
      id: 'insurance-claims',
      title: 'Insurance & Claims',
      icon: <Clock className="h-6 w-6" />,
      questions: [
        {
          id: 'insurance-options',
          question: 'What insurance options are available?',
          answer: 'Basic coverage up to $100 is free. Additional insurance costs $7.50 per $100 of declared value (minimum $15). High-value items over $2,500 require custom quotes. Insurance covers loss and damage during transit.'
        },
        {
          id: 'claims-process',
          question: 'How do I file an insurance claim?',
          answer: 'Contact us immediately if items are lost or damaged. We\'ll need photos of damage, original packaging, and receipts. Claims must be filed within 30 days of delivery. We work with carriers to resolve claims quickly.'
        },
        {
          id: 'liability',
          question: 'What are QCS Cargo\'s liability limits?',
          answer: 'Our liability is limited to the declared value of insured items. Without insurance, liability is limited to $100 per shipment. We recommend appropriate insurance for valuable items.'
        }
      ]
    }
  ]

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const toggleQuestion = (questionId: string) => {
    setOpenQuestions(prev => 
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    )
  }

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(q => 
      q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0 || searchTerm === '')

  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqCategories.flatMap(category =>
      category.questions.map(question => ({
        '@type': 'Question',
        name: question.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: question.answer
        }
      }))
    )
  }

  const pageSeo = {
    title: 'QCS Cargo FAQ | Caribbean Shipping Answers',
    description: 'Find answers to common questions about Caribbean air cargo rates, packaging, customs, and delivery with QCS Cargo.',
    canonicalPath: '/faq',
    structuredData: faqStructuredData
  }

  return (
    <MarketingLayout seo={pageSeo}>
      <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-slate-900 to-slate-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-slate-100 max-w-3xl mx-auto mb-8">
            Find answers to common questions about QCS Cargo's air freight services to the Caribbean. 
            Can't find what you're looking for? Contact our team directly.
          </p>
          
          {/* Search Box */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search FAQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-slate-800 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {filteredCategories.map((category) => (
              <div key={category.id} className="mb-8">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full bg-slate-50 hover:bg-slate-100 p-6 rounded-lg border-2 border-slate-200 transition-colors mb-4 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-slate-600">
                      {category.icon}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">{category.title}</h2>
                    <span className="bg-slate-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {category.questions.length}
                    </span>
                  </div>
                  {openCategories.includes(category.id) ? (
                    <ChevronUp className="h-6 w-6 text-slate-600" />
                  ) : (
                    <ChevronDown className="h-6 w-6 text-slate-600" />
                  )}
                </button>

                {/* Questions */}
                {openCategories.includes(category.id) && (
                  <div className="space-y-4">
                    {category.questions.map((faq) => (
                      <div key={faq.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                        <button
                          onClick={() => toggleQuestion(faq.id)}
                          className="w-full p-6 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                        >
                          <h3 className="text-lg font-semibold text-slate-800 pr-4">
                            {faq.question}
                          </h3>
                          {openQuestions.includes(faq.id) ? (
                            <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                          )}
                        </button>
                        
                        {openQuestions.includes(faq.id) && (
                          <div className="px-6 pb-6 border-t border-gray-100">
                            <p className="text-gray-700 pt-4 leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-slate-800 mb-6">
            Still Have Questions?
          </h2>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Our Caribbean shipping experts are here to help. Contact us for personalized assistance 
            with your air cargo needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:201-249-0929"
              className="bg-slate-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-slate-700 transition-colors inline-flex items-center justify-center"
            >
              Call 201-249-0929
            </a>
            <a
              href="mailto:sales@quietcraftsolutions.com"
              className="border-2 border-slate-600 text-slate-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-slate-50 transition-colors inline-flex items-center justify-center"
            >
              Email Us
            </a>
          </div>
        </div>
      </section>
      </div>
    </MarketingLayout>
  )
}

