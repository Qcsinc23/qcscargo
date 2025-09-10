import React from 'react'
import { Link } from 'react-router-dom'
import { Plane, Phone, Mail, MapPin, Facebook, Instagram, Linkedin, Youtube } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="bg-accent p-2 rounded-lg">
                <Plane className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">QCS Cargo</h3>
                <p className="text-sm text-primary-foreground/80">Fast & Reliable Air Freight</p>
              </div>
            </div>
            <div className="space-y-2 text-primary-foreground/80">
              <div className="flex items-start space-x-2">
                <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p>35 Obrien St, E12</p>
                  <p>Kearny, NJ 07032</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-5 w-5" />
                <span>201-249-0929</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>sales@quietcraftsolutions.com</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <nav className="space-y-2">
              <Link to="/shipping-calculator" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                Shipping Calculator
              </Link>
              <Link to="/tracking" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                Track Shipment
              </Link>
              <Link to="/shipping-calculator" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                Get Quote
              </Link>
              <Link to="/business-services" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                Business Services
              </Link>
              <Link to="/service-areas" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                Service Areas
              </Link>
            </nav>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Our Services</h4>
            <nav className="space-y-2">
              <Link to="/air-cargo-shipping" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                Air Cargo Shipping
              </Link>
              <Link to="/air-cargo-shipping" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                Package Consolidation
              </Link>
              <Link to="/air-cargo-shipping" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                Special Handling
              </Link>
              <Link to="/air-cargo-shipping" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                Customs Documentation
              </Link>
              <Link to="/air-cargo-shipping" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                Storage Services
              </Link>
            </nav>
          </div>

          {/* Legal & Social */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Legal & Connect</h4>
            <nav className="space-y-2 mb-4">
              <Link to="/about" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                About QCS Cargo
              </Link>
              <Link to="/faq" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                FAQ
              </Link>
              <Link to="/terms" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                Terms of Service
              </Link>
              <Link to="/privacy-policy" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                Privacy Policy
              </Link>
            </nav>
            
            <div>
              <h5 className="font-medium mb-3">Follow Us</h5>
              <div className="flex space-x-3">
                <a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  <Linkedin className="h-5 w-5" />
                </a>
                <a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  <Youtube className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Business Hours */}
        <div className="border-t border-primary-foreground/20 mt-8 pt-8">
          <div className="text-center">
            <h5 className="font-medium mb-2">Business Hours</h5>
            <p className="text-primary-foreground/80 text-sm">
              Monday - Friday: 9:00 AM - 6:00 PM | Saturday: 9:00 AM - 2:00 PM | Sunday: Closed
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-primary-foreground/80 text-sm">
          <p>&copy; 2025 QCS Cargo. All rights reserved. | Professional Air Cargo Services from New Jersey to Guyana & the Caribbean</p>
        </div>
      </div>
    </footer>
  )
}
