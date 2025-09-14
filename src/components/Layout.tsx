import React from 'react'
import Header from './Header'
import Footer from './Footer'
import MobileBottomCTA from './MobileBottomCTA'
import { BreadcrumbNavigation } from './BreadcrumbNavigation'

interface LayoutProps {
  children: React.ReactNode
  breadcrumbs?: Array<{
    label: string
    href?: string
    current?: boolean
  }>
}

export default function Layout({ children, breadcrumbs }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <BreadcrumbNavigation customItems={breadcrumbs} />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
      {/* Mobile bottom CTA - hidden on desktop, adds padding to prevent content hiding */}
      <MobileBottomCTA />
      <div className="md:hidden h-16"></div>
    </div>
  )
}