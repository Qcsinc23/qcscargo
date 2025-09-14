import React from 'react'
import { Breadcrumb, useBreadcrumbs } from '@/components/ui/breadcrumb'

interface BreadcrumbNavigationProps {
  customItems?: Array<{
    label: string
    href?: string
    current?: boolean
  }>
  className?: string
}

export function BreadcrumbNavigation({ customItems, className }: BreadcrumbNavigationProps) {
  const breadcrumbs = useBreadcrumbs(customItems)
  
  // Don't show breadcrumbs on home page
  if (window.location.pathname === '/') {
    return null
  }
  
  return (
    <div className={`hidden md:block bg-shopify-rose border-b border-shopify-silver ${className}`}>
      <div className="max-w-7xl mx-auto px-6 py-3">
        <Breadcrumb items={breadcrumbs} />
      </div>
    </div>
  )
}