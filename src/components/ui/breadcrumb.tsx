import React from 'react'
import { ChevronRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn('flex', className)} aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li className="inline-flex items-center">
          <Link
            to="/"
            className="inline-flex items-center text-sm font-medium text-shopify-roseGray hover:text-shopify-maroon transition-colors"
          >
            <Home className="w-4 h-4 mr-2" />
            Home
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index}>
            <div className="flex items-center">
              <ChevronRight className="w-4 h-4 text-shopify-silver" />
              {item.href && !item.current ? (
                <Link
                  to={item.href}
                  className="ml-1 text-sm font-medium text-shopify-roseGray hover:text-shopify-maroon transition-colors md:ml-2"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    'ml-1 text-sm font-medium md:ml-2',
                    item.current
                      ? 'text-shopify-maroon cursor-default font-semibold'
                      : 'text-shopify-roseGray'
                  )}
                  aria-current={item.current ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
}

// Convenience hook to generate breadcrumbs based on current path
export function useBreadcrumbs(customItems?: BreadcrumbItem[]): BreadcrumbItem[] {
  const location = window.location.pathname
  
  if (customItems) {
    return customItems
  }
  
  // Auto-generate breadcrumbs from path
  const pathSegments = location.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []
  
  let href = ''
  pathSegments.forEach((segment, index) => {
    href += `/${segment}`
    const isLast = index === pathSegments.length - 1
    
    // Convert segment to readable label
    let label = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    
    // Special cases for common routes
    if (segment === 'auth') label = 'Authentication'
    if (segment === 'dashboard') label = 'Dashboard'
    if (segment === 'customer' && pathSegments[index + 1] === 'profile') {
      label = 'My Profile'
      // Skip the next segment since we've handled it
      if (index + 1 < pathSegments.length - 1) {
        href += '/profile'
        index++ // Skip the 'profile' segment
      }
    }
    if (segment === 'create-shipment') label = 'Create Shipment'
    if (segment === 'how-it-works') label = 'How It Works'
    if (segment === 'service-areas') label = 'Service Areas'
    if (segment === 'business-services') label = 'Business Services'
    if (segment === 'shipping-calculator') label = 'Shipping Calculator'
    
    breadcrumbs.push({
      label,
      href: isLast ? undefined : href,
      current: isLast
    })
  })
  
  return breadcrumbs
}