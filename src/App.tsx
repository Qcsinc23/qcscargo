import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Toaster } from 'sonner'

// Public Pages
import HomePage from '@/pages/HomePage'
import ShippingCalculator from '@/pages/ShippingCalculator'
import HowItWorks from '@/pages/HowItWorks'
import ContactPage from '@/pages/ContactPage'
import FAQPage from '@/pages/FAQPage'
import ServiceAreas from '@/pages/ServiceAreas'
import AboutPage from '@/pages/AboutPage'
import BusinessServices from '@/pages/BusinessServices'
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
import BookingPage from '@/pages/BookingPage'

// Admin Pages
import AdminRoute from '@/components/AdminRoute'
import AdminLayout from '@/components/AdminLayout'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminBookingManagement from '@/pages/admin/AdminBookingManagement'
import AdminVehicleManagement from '@/pages/admin/AdminVehicleManagement'
import AdminCustomerInsights from '@/pages/admin/AdminCustomerInsights'
import AdminBookingCalendar from '@/pages/admin/AdminBookingCalendar'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes with Layout */}
          <Route path="/" element={
            <Layout>
              <HomePage />
            </Layout>
          } />
          <Route path="/shipping-calculator" element={
            <Layout>
              <ShippingCalculator />
            </Layout>
          } />
          <Route path="/how-it-works" element={
            <Layout>
              <HowItWorks />
            </Layout>
          } />
          <Route path="/contact" element={
            <Layout>
              <ContactPage />
            </Layout>
          } />
          <Route path="/faq" element={
            <Layout>
              <FAQPage />
            </Layout>
          } />
          <Route path="/service-areas" element={
            <Layout>
              <ServiceAreas />
            </Layout>
          } />
          <Route path="/about" element={
            <Layout>
              <AboutPage />
            </Layout>
          } />
          <Route path="/business-services" element={
            <Layout>
              <BusinessServices />
            </Layout>
          } />
          <Route path="/tracking" element={
            <Layout>
              <TrackingPage />
            </Layout>
          } />
          <Route path="/rates" element={
            <Layout>
              <RatesPage />
            </Layout>
          } />
          <Route path="/services" element={
            <Layout>
              <BusinessServices />
            </Layout>
          } />
          <Route path="/support" element={
            <Layout>
              <SupportPage />
            </Layout>
          } />
          <Route path="/shipping" element={
            <Layout>
              <RatesPage />
            </Layout>
          } />
          <Route path="/privacy-policy" element={
            <Layout>
              <PrivacyPolicyPage />
            </Layout>
          } />
          <Route path="/terms" element={
            <Layout>
              <TermsOfServicePage />
            </Layout>
          } />

          {/* Auth Routes (no layout) */}
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Customer Portal Routes (protected, no layout) */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <CustomerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/create-shipment" element={
            <ProtectedRoute>
              <CreateShipmentPage />
            </ProtectedRoute>
          } />
          <Route path="/booking" element={
            <ProtectedRoute>
              <BookingPage />
            </ProtectedRoute>
          } />

          {/* Admin Routes (protected, no main layout) */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="bookings" element={<AdminBookingManagement />} />
            <Route path="bookings/calendar" element={<AdminBookingCalendar />} />
            <Route path="vehicles" element={<AdminVehicleManagement />} />
            <Route path="customers" element={<AdminCustomerInsights />} />
            <Route path="reports" element={<div className="p-6">Reports - Coming Soon</div>} />
            <Route path="settings" element={<div className="p-6">Settings - Coming Soon</div>} />
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
    </AuthProvider>
  )
}

export default App