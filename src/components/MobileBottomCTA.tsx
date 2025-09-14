import React from 'react'
import { Link } from 'react-router-dom'
import { Phone, MessageCircle } from 'lucide-react'

/**
 * MobileBottomCTA component provides sticky bottom call-to-action buttons
 * for mobile devices (< 768px). Includes Call, WhatsApp, and Get Quote buttons.
 * This component is hidden on desktop devices.
 */
export default function MobileBottomCTA() {
  const handleCall = () => {
    window.location.href = 'tel:+12012490929'
  }

  const handleWhatsApp = () => {
    window.open('https://wa.me/12012490929', '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-white/95 backdrop-blur border-t pb-[max(env(safe-area-inset-bottom),8px)]">
      <div className="px-3 py-2 grid grid-cols-3 gap-2">
        <button
          onClick={handleCall}
          className="h-11 rounded-xl flex flex-col items-center justify-center text-sm font-semibold bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <Phone className="h-4 w-4 mb-1" />
          <span>Call</span>
        </button>
        <button
          onClick={handleWhatsApp}
          className="h-11 rounded-xl flex flex-col items-center justify-center text-sm font-semibold bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <MessageCircle className="h-4 w-4 mb-1" />
          <span>WhatsApp</span>
        </button>
        <Link
          to="/shipping-calculator"
          className="h-11 rounded-xl flex flex-col items-center justify-center text-sm font-semibold bg-fuchsia-600 text-white hover:bg-fuchsia-700 transition-colors"
        >
          <span>Get Quote</span>
        </Link>
      </div>
    </div>
  )
}