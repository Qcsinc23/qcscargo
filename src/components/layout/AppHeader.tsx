import { useState, useEffect } from "react";
import { ChevronLeft, Menu, X, User, LogOut, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";
import AddressInlineBadge from "@/components/AddressInlineBadge";
import {
  useVirtualAddress,
  VIRTUAL_MAILBOX_UTILITY_BAR_HEIGHT
} from "@/hooks/useVirtualAddress";
import { featureFlags } from "@/lib/featureFlags";

type HeaderProps = {
  back?: { href: string; label?: string };
  // if you render a public sticky CTA elsewhere, pass a setter so we can hide it when menu is open
  onMenuToggle?: (open: boolean) => void;
};

export function AppHeader({ back, onMenuToggle }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const {
    address,
    mailboxNumber,
    loading: addressLoading,
    error: addressError,
    hasFetched,
    fetchAddress
  } = useVirtualAddress();

  useEffect(() => {
    document.documentElement.classList.toggle("overflow-hidden", open); // lock scroll
    onMenuToggle?.(open);
    return () => document.documentElement.classList.remove("overflow-hidden");
  }, [open, onMenuToggle]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsUserMenuOpen(false);
      setOpen(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const shouldRenderUtilityBar =
    featureFlags.virtualMailboxUi && user && (addressLoading || address || addressError || hasFetched);

  const headerTopOffset = shouldRenderUtilityBar ? VIRTUAL_MAILBOX_UTILITY_BAR_HEIGHT : 0;

  return (
    <>
      {shouldRenderUtilityBar && (
        <div className="fixed inset-x-0 top-0 z-[55] border-b border-slate-200 bg-slate-50">
          <div className="mx-auto flex min-h-[36px] max-w-screen-xl items-center justify-end gap-3 px-4 text-xs text-slate-600 md:px-6">
            {address ? (
              <AddressInlineBadge
                address={address}
                mailboxNumber={mailboxNumber}
              />
            ) : addressLoading ? (
              <AddressInlineBadge loading />
            ) : addressError ? (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />
                <span className="max-w-[220px] text-left text-amber-700 md:max-w-none">{addressError}</span>
                <button
                  type="button"
                  onClick={fetchAddress}
                  className="rounded border border-amber-300 px-2 py-0.5 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-100"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="text-slate-600">
                Your personalized mailbox will appear here as soon as it is assigned.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fixed Header */}
      <header
        className="fixed inset-x-0 top-0 z-50 isolate border-b bg-white/95 backdrop-blur"
        style={{ top: `${headerTopOffset}px` }}
      >
        {/* Mobile row (one row only) */}
        <div className="md:hidden h-14 flex items-center justify-between px-3">
          {back ? (
            <Link to={back.href} className="flex items-center gap-2 -ml-1">
              <ChevronLeft className="h-6 w-6" />
              <span className="text-sm font-medium">{back.label ?? "Back"}</span>
            </Link>
          ) : (
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/logo.svg"
                alt="QCS Cargo"
                className="h-7 w-auto"
                loading="lazy"
                decoding="async"
                width="112"
                height="28"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/QCS_Cargo_Logo.png";
                }}
              />
            </Link>
          )}
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            className="p-2 rounded-lg hover:bg-slate-100 relative z-50"
            onClick={() => setOpen(v => !v)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Desktop row */}
        <div className="hidden md:flex h-16 items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="QCS Cargo"
              className="h-8 w-auto"
              loading="lazy"
              decoding="async"
              width="128"
              height="32"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/QCS_Cargo_Logo.png";
              }}
            />
            <div className="text-slate-900">
              <span className="block text-xl font-bold">QCS Cargo</span>
              <span className="block text-sm text-slate-600">Precision Air Cargo Solutions</span>
            </div>
          </Link>
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
                  <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md border border-slate-200 z-50">
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
              <div className="flex items-center gap-3">
                <Link
                  to="/auth/login"
                  className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-fuchsia-700 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/shipping-calculator"
                  className="rounded-xl px-3 py-2 bg-fuchsia-600 text-white font-semibold hover:bg-fuchsia-700 transition-colors"
                >
                  Get Free Quote
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Mobile full-screen menu overlay - separate from header */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-white"
          style={{ paddingTop: `calc(3.5rem + env(safe-area-inset-top))` }}
          onClick={() => setOpen(false)}
        >
          <nav
            className="h-full px-6 py-8 space-y-6 text-lg font-medium text-slate-800 overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <Link
              className={`block py-4 border-b border-slate-200 transition-colors ${isActive('/shipping-calculator') ? 'text-fuchsia-700 border-fuchsia-200' : 'text-slate-800 hover:text-fuchsia-700'}`}
              to="/shipping-calculator"
              onClick={() => setOpen(false)}
            >
              Shipping Calculator
            </Link>
            <Link
              className={`block py-4 border-b border-slate-200 transition-colors ${isActive('/services') ? 'text-fuchsia-700 border-fuchsia-200' : 'text-slate-800 hover:text-fuchsia-700'}`}
              to="/services"
              onClick={() => setOpen(false)}
            >
              Services
            </Link>
            <Link
              className={`block py-4 border-b border-slate-200 transition-colors ${isActive('/contact') ? 'text-fuchsia-700 border-fuchsia-200' : 'text-slate-800 hover:text-fuchsia-700'}`}
              to="/contact"
              onClick={() => setOpen(false)}
            >
              Contact
            </Link>
            
            {user ? (
              <>
                <Link
                  className={`block py-4 border-b border-slate-200 transition-colors ${isActive('/dashboard') ? 'text-fuchsia-700 border-fuchsia-200' : 'text-slate-800 hover:text-fuchsia-700'}`}
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  className={`block py-4 border-b border-slate-200 transition-colors ${isActive('/dashboard/create-shipment') ? 'text-fuchsia-700 border-fuchsia-200' : 'text-slate-800 hover:text-fuchsia-700'}`}
                  to="/dashboard/create-shipment"
                  onClick={() => setOpen(false)}
                >
                  Create Shipment
                </Link>
                <div className="pt-4">
                  <button
                    className="block py-4 text-red-600 hover:text-red-700 transition-colors font-medium"
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="pt-4 space-y-3">
                <Link
                  className="block rounded-xl border border-slate-200 py-4 text-center font-medium text-slate-800 hover:border-fuchsia-200 hover:text-fuchsia-700 transition-colors"
                  to="/auth/login"
                  onClick={() => setOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  className="block rounded-xl border border-slate-200 py-4 text-center font-medium text-slate-800 hover:border-fuchsia-200 hover:text-fuchsia-700 transition-colors"
                  to="/auth/register"
                  onClick={() => setOpen(false)}
                >
                  Create Account
                </Link>
                <Link
                  className="block py-4 px-6 bg-fuchsia-600 text-white font-semibold rounded-xl text-center hover:bg-fuchsia-700 transition-colors"
                  to="/shipping-calculator"
                  onClick={() => setOpen(false)}
                >
                  Get Free Quote
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
