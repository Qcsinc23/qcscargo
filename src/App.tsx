import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import ScrollToTop from '@/components/ScrollToTop'
import { Toaster } from 'sonner'
import { VirtualAddressProvider } from '@/hooks/useVirtualAddress'

// Public Pages
import HomePage from '@/pages/HomePage'
import ShippingCalculator from '@/pages/ShippingCalculator'
import HowItWorks from '@/pages/HowItWorks'
import ContactPage from '@/pages/ContactPage'
import FAQPage from '@/pages/FAQPage'
import ServiceAreas from '@/pages/ServiceAreas'
import AboutPage from '@/pages/AboutPage'
import BusinessServices from '@/pages/BusinessServices'
import AirCargoShipping from '@/pages/AirCargoShipping'
import TrackingPage from '@/pages/TrackingPage'
import RatesPage from '@/pages/RatesPage'
import SupportPage from '@/pages/SupportPage'
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage'
import TermsOfServicePage from '@/pages/TermsOfServicePage'

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import AuthCallback from '@/pages/auth/AuthCallback'

// Customer Portal Pages
import CustomerDashboard from '@/pages/dashboard/CustomerDashboard'
import CreateShipmentPage from '@/pages/dashboard/CreateShipmentPage'
import CustomerProfilePage from '@/pages/customer/CustomerProfilePage'
import BookingPage from '@/pages/BookingPage'

// Admin Pages
import AdminRedirect from '@/components/AdminRedirect'
import AdminRoute from '@/components/AdminRoute'
import AdminLayout from '@/components/AdminLayout'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminBookingManagement from '@/pages/admin/AdminBookingManagement'
import AdminShipmentManagement from '@/pages/admin/AdminShipmentManagement'
import BookingDetailsPage from '@/pages/admin/BookingDetailsPage'
import BookingEditPage from '@/pages/admin/BookingEditPage'
import AdminVehicleManagement from '@/pages/admin/AdminVehicleManagement'
import VehicleDetailsPage from '@/pages/admin/VehicleDetailsPage'
import VehicleEditPage from '@/pages/admin/VehicleEditPage'
import AdminCustomerInsights from '@/pages/admin/AdminCustomerInsights'
import AdminBookingCalendar from '@/pages/admin/AdminBookingCalendar'
import AdminSettings from '@/pages/admin/AdminSettings'
import AdminMailboxes from '@/pages/admin/AdminMailboxes'
import AdminQuoteManagement from '@/pages/admin/AdminQuoteManagement'

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

            {/* Customer Portal Routes (protected, no layout) */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AdminRedirect>
                  <CustomerDashboard />
                </AdminRedirect>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/create-shipment" element={
              <ProtectedRoute>
                <AdminRedirect>
                  <CreateShipmentPage />
                </AdminRedirect>
              </ProtectedRoute>
            } />
            <Route path="/customer/profile" element={
              <ProtectedRoute>
                <AdminRedirect>
                  <CustomerProfilePage />
                </AdminRedirect>
              </ProtectedRoute>
            } />
            <Route path="/booking" element={
              <ProtectedRoute>
                <AdminRedirect>
                  <BookingPage />
                </AdminRedirect>
              </ProtectedRoute>
            } />

            {/* Admin Routes (protected, no main layout) */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
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
              <Route path="reports" element={<div className="p-6">Reports - Coming Soon</div>} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Routes>
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
