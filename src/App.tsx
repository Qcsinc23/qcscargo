import React, { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import ScrollToTop from '@/components/ScrollToTop'
import { Toaster } from 'sonner'
import { VirtualAddressProvider } from '@/hooks/useVirtualAddress'
import { RouteErrorBoundary, AdminErrorFallback, CustomerErrorFallback } from '@/components/RouteErrorBoundary'

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
  </div>
)

// Eagerly load critical public pages (above the fold)
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import AuthCallback from '@/pages/auth/AuthCallback'

// Lazy load public pages
const ShippingCalculator = lazy(() => import('@/pages/ShippingCalculator'))
const HowItWorks = lazy(() => import('@/pages/HowItWorks'))
const ContactPage = lazy(() => import('@/pages/ContactPage'))
const FAQPage = lazy(() => import('@/pages/FAQPage'))
const ServiceAreas = lazy(() => import('@/pages/ServiceAreas'))
const AboutPage = lazy(() => import('@/pages/AboutPage'))
const BusinessServices = lazy(() => import('@/pages/BusinessServices'))
const AirCargoShipping = lazy(() => import('@/pages/AirCargoShipping'))
const TrackingPage = lazy(() => import('@/pages/TrackingPage'))
const RatesPage = lazy(() => import('@/pages/RatesPage'))
const SupportPage = lazy(() => import('@/pages/SupportPage'))
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage'))
const TermsOfServicePage = lazy(() => import('@/pages/TermsOfServicePage'))

// Lazy load Customer Portal Pages
const CustomerDashboard = lazy(() => import('@/pages/dashboard/CustomerDashboard'))
const CreateShipmentPage = lazy(() => import('@/pages/dashboard/CreateShipmentPage'))
const CustomerProfilePage = lazy(() => import('@/pages/customer/CustomerProfilePage'))
const BookingPage = lazy(() => import('@/pages/BookingPage'))

// Lazy load Admin Pages
const AdminRedirect = lazy(() => import('@/components/AdminRedirect'))
const AdminRoute = lazy(() => import('@/components/AdminRoute'))
const AdminLayout = lazy(() => import('@/components/AdminLayout'))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminBookingManagement = lazy(() => import('@/pages/admin/AdminBookingManagement'))
const AdminShipmentManagement = lazy(() => import('@/pages/admin/AdminShipmentManagement'))
const BookingDetailsPage = lazy(() => import('@/pages/admin/BookingDetailsPage'))
const BookingEditPage = lazy(() => import('@/pages/admin/BookingEditPage'))
const AdminVehicleManagement = lazy(() => import('@/pages/admin/AdminVehicleManagement'))
const VehicleDetailsPage = lazy(() => import('@/pages/admin/VehicleDetailsPage'))
const VehicleEditPage = lazy(() => import('@/pages/admin/VehicleEditPage'))
const AdminCustomerInsights = lazy(() => import('@/pages/admin/AdminCustomerInsights'))
const AdminBookingCalendar = lazy(() => import('@/pages/admin/AdminBookingCalendar'))
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'))
const AdminMailboxes = lazy(() => import('@/pages/admin/AdminMailboxes'))
const AdminQuoteManagement = lazy(() => import('@/pages/admin/AdminQuoteManagement'))
const AdminMonitoring = lazy(() => import('@/pages/admin/AdminMonitoring'))

function App() {
  return (
    <AuthProvider>
      <VirtualAddressProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <ScrollToTop />
          <RouteErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Public Routes with AppLayout */}
                <Route path="/" element={<HomePage />} />
                <Route path="/shipping-calculator" element={<ShippingCalculator />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/faq" element={<FAQPage />} />
                <Route path="/service-areas" element={<ServiceAreas />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/business-services" element={<BusinessServices />} />
                <Route path="/tracking" element={<TrackingPage />} />
                <Route path="/rates" element={<RatesPage />} />
                <Route path="/services" element={<AirCargoShipping />} />
                <Route path="/air-cargo-shipping" element={<AirCargoShipping />} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="/shipping" element={<RatesPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsOfServicePage />} />

            {/* Auth Routes (no layout) */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

                {/* Customer Portal Routes (protected, with error boundary) */}
                <Route path="/dashboard" element={
                  <RouteErrorBoundary fallback={CustomerErrorFallback}>
                    <ProtectedRoute>
                      <AdminRedirect>
                        <CustomerDashboard />
                      </AdminRedirect>
                    </ProtectedRoute>
                  </RouteErrorBoundary>
                } />
                <Route path="/dashboard/create-shipment" element={
                  <RouteErrorBoundary fallback={CustomerErrorFallback}>
                    <ProtectedRoute>
                      <AdminRedirect>
                        <CreateShipmentPage />
                      </AdminRedirect>
                    </ProtectedRoute>
                  </RouteErrorBoundary>
                } />
                <Route path="/customer/profile" element={
                  <RouteErrorBoundary fallback={CustomerErrorFallback}>
                    <ProtectedRoute>
                      <AdminRedirect>
                        <CustomerProfilePage />
                      </AdminRedirect>
                    </ProtectedRoute>
                  </RouteErrorBoundary>
                } />
                <Route path="/booking" element={
                  <RouteErrorBoundary fallback={CustomerErrorFallback}>
                    <ProtectedRoute>
                      <AdminRedirect>
                        <BookingPage />
                      </AdminRedirect>
                    </ProtectedRoute>
                  </RouteErrorBoundary>
                } />

                {/* Admin Routes (protected, with admin error boundary) */}
                <Route path="/admin" element={
                  <RouteErrorBoundary fallback={AdminErrorFallback}>
                    <AdminRoute>
                      <AdminLayout />
                    </AdminRoute>
                  </RouteErrorBoundary>
                }>
                  <Route index element={<AdminDashboard />} />
                  <Route path="shipments" element={<AdminShipmentManagement />} />
                  <Route path="bookings" element={<AdminBookingManagement />} />
                  <Route path="bookings/calendar" element={<AdminBookingCalendar />} />
                  <Route path="bookings/:id" element={<BookingDetailsPage />} />
                  <Route path="bookings/:id/edit" element={<BookingEditPage />} />
                  <Route path="quotes" element={<AdminQuoteManagement />} />
                  <Route path="vehicles" element={<AdminVehicleManagement />} />
                  <Route path="vehicles/:id" element={<VehicleDetailsPage />} />
                  <Route path="vehicles/:id/edit" element={<VehicleEditPage />} />
                  <Route path="customers" element={<AdminCustomerInsights />} />
                  <Route path="mailboxes" element={<AdminMailboxes />} />
                  <Route path="monitoring" element={<AdminMonitoring />} />
                  <Route path="reports" element={<div className="p-6">Reports - Coming Soon</div>} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>
              </Routes>
            </Suspense>
          </RouteErrorBoundary>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 5000,
              style: {
                background: 'white',
                border: '1px solid #e5e7eb',
                color: '#374151'
              }
            }}
          />
        </Router>
      </VirtualAddressProvider>
    </AuthProvider>
  )
}

export default App
