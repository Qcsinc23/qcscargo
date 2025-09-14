import { Phone, Mail, Menu } from "lucide-react"

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-50 md:hidden bg-white/95 backdrop-blur border-b">
      <div className="h-12 flex items-center justify-between px-3">
        <a href="tel:+12012490929" className="flex items-center gap-2" aria-label="Call">
          <Phone className="h-5 w-5" />
          <span className="text-sm font-medium">Call</span>
        </a>
        <a href="mailto:sales@quietcraftsolutions.com" className="flex items-center gap-2 no-wrap" aria-label="Email">
          <Mail className="h-5 w-5" />
          <span className="text-sm font-medium">Email</span>
        </a>
        <button
          type="button"
          aria-label="Open menu"
          className="flex items-center gap-2"
          onClick={() => document.documentElement.classList.add("menu-open")}
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>
    </header>
  )
}