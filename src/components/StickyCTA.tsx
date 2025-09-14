import { Phone, MessageCircle } from "lucide-react"

export function StickyCTA() {
  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-white/95 backdrop-blur border-t h-14">
      <div className="h-full px-3 flex items-center gap-2">
        <a href="tel:+12012490929" className="flex-1 h-10 rounded-xl bg-slate-100 flex items-center justify-center gap-2 text-sm font-semibold">
          <Phone className="h-4 w-4" /> Call
        </a>
        <a href="https://wa.me/12012490929" className="flex-1 h-10 rounded-xl bg-slate-100 flex items-center justify-center gap-2 text-sm font-semibold">
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
        <a href="/quote" className="flex-1 h-10 rounded-xl bg-fuchsia-600 text-white flex items-center justify-center text-sm font-semibold">
          Get Quote
        </a>
      </div>
    </div>
  )
}