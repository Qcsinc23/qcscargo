import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Plane, Menu, X, Phone, Mail, User, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const location = useLocation()
  const { user, signOut } = useAuth()

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
        { name: 'Air Cargo Shipping', path: '/services' },
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
      {/* Top contact bar */}
      <div className="bg-sophisticated-olive text-white py-2">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Phone className="h-4 w-4" />
                <span>201-249-0929</span>
              </div>
              <div className="flex items-center space-x-1">
                <Mail className="h-4 w-4" />
                <span>sales@quietcraftsolutions.com</span>
              </div>
            </div>
            <div className="text-sm">
              Serving NJ to Guyana & Caribbean | Mon-Fri 9AM-6PM, Sat 9AM-2PM
            </div>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <img 
              src="/QCS_Cargo_Logo.png" 
              alt="QCS Cargo - Precision Air Cargo Solutions" 
              className="h-12 w-auto"
            />
            <div>
              <h1 className="text-2xl font-bold text-sophisticated-olive">QCS Cargo</h1>
              <p className="text-sm text-sophisticated-blueGray">Precision Air Cargo Solutions</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navItems.map((item) => (
              <div key={item.name} className="relative group">
                <Link
                  to={item.path}
                  className={`px-3 py-2 font-medium transition-colors ${
                    isActive(item.path)
                      ? 'text-sophisticated-sage border-b-2 border-sophisticated-sage'
                      : 'text-sophisticated-blueGray hover:text-sophisticated-sage'
                  }`}
                >
                  {item.name}
                </Link>
                {item.submenu && (
                  <div className="absolute left-0 mt-2 w-48 bg-white shadow-lg rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-sophisticated-mauve">
                    <div className="py-2">
                      {item.submenu.map((subItem) => (
                        <Link
                          key={subItem.name}
                          to={subItem.path}
                          className="block px-4 py-2 text-sophisticated-blueGray hover:bg-sophisticated-mauve/20 hover:text-sophisticated-sage"
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
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sophisticated-blueGray hover:bg-sophisticated-mauve/20 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span className="font-medium">My Account</span>
                  </button>
                  
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md border border-sophisticated-mauve">
                      <div className="py-2">
                        <Link
                          to="/dashboard"
                          className="block px-4 py-2 text-sophisticated-blueGray hover:bg-sophisticated-mauve/20 hover:text-sophisticated-sage"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Dashboard
                        </Link>
                        <Link
                          to="/dashboard/create-shipment"
                          className="block px-4 py-2 text-sophisticated-blueGray hover:bg-sophisticated-mauve/20 hover:text-sophisticated-sage"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Create Shipment
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 text-sophisticated-blueGray hover:bg-red-50 hover:text-red-600"
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
                    className="bg-sophisticated-sage text-white px-4 py-2 rounded-lg font-medium hover:bg-sophisticated-sage/90 transition-colors"
                  >
                    Get Quote
                  </Link>
                  <Link
                    to="/auth/login"
                    className="border border-sophisticated-sage text-sophisticated-sage px-4 py-2 rounded-lg font-medium hover:bg-sophisticated-sage/10 transition-colors"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-md text-sophisticated-blueGray hover:text-sophisticated-sage"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t">
            <nav className="space-y-2">
              {navItems.map((item) => (
                <div key={item.name}>
                  <Link
                    to={item.path}
                    className={`block px-3 py-2 font-medium transition-colors ${
                      isActive(item.path)
                        ? 'text-sophisticated-sage bg-sophisticated-mauve/20'
                        : 'text-sophisticated-blueGray hover:text-sophisticated-sage hover:bg-sophisticated-mauve/20'
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
                          className="block px-3 py-2 text-sm text-sophisticated-blueGray hover:text-sophisticated-sage hover:bg-sophisticated-mauve/20"
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
                      className="block w-full bg-sophisticated-sage text-white px-4 py-3 rounded-lg font-medium text-center hover:bg-sophisticated-sage/90 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/dashboard/create-shipment"
                      className="block w-full border border-sophisticated-sage text-sophisticated-sage px-4 py-3 rounded-lg font-medium text-center hover:bg-sophisticated-sage/10 transition-colors"
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
                      className="block w-full bg-sophisticated-sage text-white px-4 py-3 rounded-lg font-medium text-center hover:bg-sophisticated-sage/90 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Get Quote
                    </Link>
                    <Link
                      to="/auth/login"
                      className="block w-full border border-sophisticated-sage text-sophisticated-sage px-4 py-3 rounded-lg font-medium text-center hover:bg-sophisticated-sage/10 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/auth/register"
                      className="block w-full text-sophisticated-blueGray px-4 py-3 rounded-lg font-medium text-center hover:bg-sophisticated-mauve/20 transition-colors"
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