import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Plane, Menu, X, Phone, Mail, User, LogOut, Clock } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useBusinessHours } from '@/hooks/useBusinessHours'
import { Button } from '@/components/ui/button'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { businessHours, loading: hoursLoading } = useBusinessHours()

  const isActive = (path: string) => location.pathname === path

  const handleSignOut = async () => {
    try {
      await signOut()
      setIsUserMenuOpen(false)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'How It Works', path: '/how-it-works' },
    {
      name: 'Shipping & Rates',
      path: '/shipping',
      submenu: [
        { name: 'Shipping Calculator', path: '/shipping-calculator' },
        { name: 'Rate Guide', path: '/rates' },
        { name: 'Service Areas', path: '/service-areas' }
      ]
    },
    {
      name: 'Services',
      path: '/services',
      submenu: [
        { name: 'Air Cargo Shipping', path: '/air-cargo-shipping' },
        { name: 'Business Services', path: '/business-services' }
      ]
    },
    {
      name: 'Support',
      path: '/support',
      submenu: [
        { name: 'FAQ', path: '/faq' },
        { name: 'Track Shipment', path: '/tracking' },
        { name: 'Contact Us', path: '/contact' }
      ]
    }
  ]

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      {/* Mobile Utility Bar - hidden on md+ */}
      <div className="md:hidden bg-primary text-primary-foreground py-2">
        <div className="container mx-auto px-3">
          <div className="flex justify-between items-center">
            <a href="tel:+12012490929" className="flex items-center space-x-1 text-sm">
              <Phone className="h-4 w-4" />
              <span>Call</span>
            </a>
            <a href="mailto:sales@quietcraftsolutions.com" className="flex items-center space-x-1 text-sm">
              <Mail className="h-4 w-4" />
              <span>Email</span>
            </a>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center space-x-1 text-sm"
              aria-label="Toggle menu"
            >
              <Menu className="h-4 w-4" />
              <span>Menu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Top Contact Bar - hidden on mobile */}
      <div className="hidden md:block bg-primary text-primary-foreground py-2">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Phone className="h-4 w-4" />
                <span className="whitespace-nowrap">201-249-0929</span>
              </div>
              <div className="flex items-center space-x-1">
                <Mail className="h-4 w-4" />
                <span className="whitespace-nowrap">sales@quietcraftsolutions.com</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <span>Serving NJ to Guyana & Caribbean</span>
              <span>|</span>
              {hoursLoading ? (
                <span className="flex items-center space-x-1">
                  <Clock className="h-3 w-3 animate-spin" />
                  <span>Loading hours...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {businessHours.weekdayHours}, {businessHours.saturdayHours}
                  </span>
                  {businessHours.isOpen && (
                    <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                      OPEN
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <div className="container mx-auto px-3 md:px-4">
        <div className="flex justify-between items-center py-3 md:py-4">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center space-x-2 md:space-x-3 hover:opacity-80 transition-opacity"
            title="QCS Cargo - Return to Homepage"
          >
            <img
              src="/qcs-logo.svg"
              alt="QCS Cargo - Precision Air Cargo Solutions"
              className="h-8 md:h-12 w-auto"
              onError={(e) => {
                // Fallback to PNG if SVG fails to load
                const target = e.target as HTMLImageElement;
                target.src = "/QCS_Cargo_Logo.png";
              }}
            />
            <div className="hidden sm:block">
              <h1 className="text-lg md:text-2xl font-bold text-primary">QCS Cargo</h1>
              <p className="text-xs md:text-sm text-slate-600">Precision Air Cargo Solutions</p>
            </div>
          </Link>

          {/* Desktop Navigation - hidden on mobile */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navItems.map((item) => (
              <div key={item.name} className="relative group">
                <Link
                  to={item.path}
                  className={`px-3 py-2 font-medium transition-colors ${
                    isActive(item.path)
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-slate-600 hover:text-primary'
                  }`}
                >
                  {item.name}
                </Link>
                {item.submenu && (
                  <div className="absolute left-0 mt-2 w-48 bg-white shadow-lg rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-slate-200">
                    <div className="py-2">
                      {item.submenu.map((subItem) => (
                        <Link
                          key={subItem.name}
                          to={subItem.path}
                          className="block px-4 py-2 text-slate-600 hover:bg-slate-100 hover:text-primary"
                        >
                          {subItem.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* CTA Buttons / Auth */}
            <div className="flex items-center space-x-3">
              {user ? (
                // Authenticated user menu
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span className="font-medium">My Account</span>
                  </button>
                  
                  {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md border border-slate-200">
                      <div className="py-2">
                        <Link
                          to="/dashboard"
                          className="block px-4 py-2 text-slate-600 hover:bg-slate-100 hover:text-primary"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Dashboard
                        </Link>
                        <Link
                          to="/dashboard/create-shipment"
                          className="block px-4 py-2 text-slate-600 hover:bg-slate-100 hover:text-primary"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Create Shipment
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 text-slate-600 hover:bg-red-50 hover:text-red-600"
                        >
                          <div className="flex items-center space-x-2">
                            <LogOut className="h-4 w-4" />
                            <span>Sign Out</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Unauthenticated buttons
                <>
                  <Link
                    to="/shipping-calculator"
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Get Quote
                  </Link>
                  <Link
                    to="/auth/login"
                    className="border border-primary text-primary px-4 py-2 rounded-lg font-medium hover:bg-primary/10 transition-colors"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </nav>

          {/* Mobile menu button - hidden on desktop */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-md text-slate-600 hover:text-primary"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t">
            {/* Business Hours in Mobile Menu */}
            <div className="px-3 py-3 border-b border-slate-200 mb-3">
              <div className="flex items-center space-x-1 text-sm text-slate-600 mb-2">
                <Clock className="h-3 w-3" />
                <span>Serving NJ to Guyana & Caribbean</span>
              </div>
              {hoursLoading ? (
                <span className="flex items-center space-x-1 text-sm text-slate-600">
                  <Clock className="h-3 w-3 animate-spin" />
                  <span>Loading hours...</span>
                </span>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    {businessHours.weekdayHours}, {businessHours.saturdayHours}
                  </span>
                  {businessHours.isOpen && (
                    <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                      OPEN
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <nav className="space-y-2">
              {navItems.map((item) => (
                <div key={item.name}>
                  <Link
                    to={item.path}
                    className={`block px-3 py-2 font-medium transition-colors ${
                      isActive(item.path)
                        ? 'text-primary bg-slate-100'
                        : 'text-slate-600 hover:text-primary hover:bg-slate-100'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                  {item.submenu && (
                    <div className="ml-4 space-y-1">
                      {item.submenu.map((subItem) => (
                        <Link
                          key={subItem.name}
                          to={subItem.path}
                          className="block px-3 py-2 text-sm text-slate-600 hover:text-primary hover:bg-slate-100"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {subItem.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Mobile CTA Buttons / Auth */}
              <div className="pt-4 space-y-2">
                {user ? (
                  // Authenticated user options
                  <>
                    <Link
                      to="/dashboard"
                      className="block w-full bg-primary text-primary-foreground px-4 py-3 rounded-lg font-medium text-center hover:bg-primary/90 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/dashboard/create-shipment"
                      className="block w-full border border-primary text-primary px-4 py-3 rounded-lg font-medium text-center hover:bg-primary/10 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Create Shipment
                    </Link>
                    <button
                      onClick={() => {
                        handleSignOut()
                        setIsMenuOpen(false)
                      }}
                      className="block w-full border border-red-600 text-red-600 px-4 py-3 rounded-lg font-medium text-center hover:bg-red-50 transition-colors"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  // Unauthenticated options
                  <>
                    <Link
                      to="/shipping-calculator"
                      className="block w-full bg-primary text-primary-foreground px-4 py-3 rounded-lg font-medium text-center hover:bg-primary/90 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Get Quote
                    </Link>
                    <Link
                      to="/auth/login"
                      className="block w-full border border-primary text-primary px-4 py-3 rounded-lg font-medium text-center hover:bg-primary/10 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/auth/register"
                      className="block w-full text-slate-600 px-4 py-3 rounded-lg font-medium text-center hover:bg-slate-100 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Create Account
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
