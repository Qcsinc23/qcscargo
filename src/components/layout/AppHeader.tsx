import { Phone, Mail, Menu, ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { User, LogOut } from "lucide-react";

type HeaderProps = {
  back?: { href: string; label?: string }; // show back chevron on auth flows
};

export function AppHeader({ back }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsUserMenuOpen(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white/95 backdrop-blur border-b">
      {/* Mobile: ONE ROW ONLY (h-14) */}
      <div className="md:hidden h-14 flex items-center justify-between px-3">
        {back ? (
          <Link to={back.href} className="flex items-center gap-2 -ml-1">
            <ChevronLeft className="h-6 w-6" />
            <span className="text-sm font-medium">{back.label ?? "Back"}</span>
          </Link>
        ) : (
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="QCS Cargo" className="h-7 w-auto" onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/QCS_Cargo_Logo.png";
            }} />
          </Link>
        )}
        <button aria-label="Open menu" className="p-2 rounded-lg hover:bg-slate-100" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Desktop header */}
      <div className="hidden md:flex h-16 items-center justify-between px-6">
        <a href="/" className="flex items-center gap-3">
          <img src="/logo.svg" alt="QCS Cargo" className="h-8 w-auto" onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "/QCS_Cargo_Logo.png";
          }} />
          <div>
            <h1 className="text-xl font-bold text-slate-900">QCS Cargo</h1>
            <p className="text-sm text-slate-600">Precision Air Cargo Solutions</p>
          </div>
        </a>
        <nav className="flex items-center gap-6 text-sm">
          <Link to="/shipping-calculator" className={`hover:text-fuchsia-700 ${isActive('/shipping-calculator') ? 'text-fuchsia-700' : 'text-slate-700'}`}>
            Shipping Calculator
          </Link>
          <Link to="/services" className={`hover:text-fuchsia-700 ${isActive('/services') ? 'text-fuchsia-700' : 'text-slate-700'}`}>
            Services
          </Link>
          <Link to="/contact" className={`hover:text-fuchsia-700 ${isActive('/contact') ? 'text-fuchsia-700' : 'text-slate-700'}`}>
            Contact
          </Link>
          <a href="tel:+12012490929" className="no-wrap text-slate-700 hover:text-slate-900">(201) 249-0929</a>
          
          {/* User Menu or Auth Buttons */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <User className="h-4 w-4" />
                <span className="font-medium">My Account</span>
              </button>
              
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md border border-slate-200">
                  <div className="py-2">
                    <Link
                      to="/dashboard"
                      className="block px-4 py-2 text-slate-600 hover:bg-slate-100 hover:text-fuchsia-700"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/dashboard/create-shipment"
                      className="block px-4 py-2 text-slate-600 hover:bg-slate-100 hover:text-fuchsia-700"
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
            <Link
              to="/shipping-calculator"
              className="rounded-xl px-3 py-2 bg-fuchsia-600 text-white font-semibold hover:bg-fuchsia-700 transition-colors"
            >
              Get Free Quote
            </Link>
          )}
        </nav>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-white">
          <nav className="px-3 py-4 space-y-2">
            <Link
              to="/shipping-calculator"
              className={`block px-3 py-2 font-medium ${isActive('/shipping-calculator') ? 'text-fuchsia-700 bg-slate-100' : 'text-slate-700 hover:text-fuchsia-700 hover:bg-slate-100'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Shipping Calculator
            </Link>
            <Link
              to="/services"
              className={`block px-3 py-2 font-medium ${isActive('/services') ? 'text-fuchsia-700 bg-slate-100' : 'text-slate-700 hover:text-fuchsia-700 hover:bg-slate-100'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Services
            </Link>
            <Link
              to="/contact"
              className={`block px-3 py-2 font-medium ${isActive('/contact') ? 'text-fuchsia-700 bg-slate-100' : 'text-slate-700 hover:text-fuchsia-700 hover:bg-slate-100'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Contact
            </Link>
            
            {/* User Menu or Auth Buttons for Mobile */}
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="block px-3 py-2 font-medium text-slate-700 hover:text-fuchsia-700 hover:bg-slate-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/dashboard/create-shipment"
                  className="block px-3 py-2 font-medium text-slate-700 hover:text-fuchsia-700 hover:bg-slate-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Create Shipment
                </Link>
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 font-medium text-red-600 hover:bg-red-50"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/shipping-calculator"
                className="block px-3 py-2 font-medium text-fuchsia-700 bg-fuchsia-50 rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Get Free Quote
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}