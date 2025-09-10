import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { logError } from '../../lib/errorLogger'
import { databaseHealthChecker, runHealthCheckWithLogging } from '../../lib/databaseHealthCheck'
import { emergencyRecovery } from '../../lib/databaseRecovery'

interface FormData {
  email: string
  password: string
  confirmPassword: string
  fullName: string
  companyName: string
  phone: string
  agreeToTerms: boolean
}

interface FormErrors {
  email?: string
  password?: string
  confirmPassword?: string
  fullName?: string
  phone?: string
  agreeToTerms?: string
  general?: string
}

interface SystemStatus {
  isHealthy: boolean
  canRegister: boolean
  lastCheck: string
  issues: string[]
}

const EnhancedRegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    companyName: '',
    phone: '',
    agreeToTerms: false
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    isHealthy: true,
    canRegister: true,
    lastCheck: '',
    issues: []
  })
  const [showSystemStatus, setShowSystemStatus] = useState(false)
  const [recoveryInProgress, setRecoveryInProgress] = useState(false)

  // Check system health on component mount
  useEffect(() => {
    checkSystemHealth()
  }, [])

  const checkSystemHealth = async () => {
    try {
      const healthReport = await databaseHealthChecker.performHealthCheck()
      
      setSystemStatus({
        isHealthy: healthReport.overall_status === 'healthy',
        canRegister: healthReport.auth_status.can_sign_up && healthReport.connection_status,
        lastCheck: new Date().toLocaleTimeString(),
        issues: healthReport.recommendations
      })

      // Log health check results in development
      if (process.env.NODE_ENV === 'development') {
        console.log('System Health Check:', healthReport)
      }
    } catch (error) {
      console.error('Health check failed:', error)
      setSystemStatus({
        isHealthy: false,
        canRegister: false,
        lastCheck: new Date().toLocaleTimeString(),
        issues: ['System health check failed - please try again later']
      })
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))

    // Clear specific error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    // Full name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters long'
    }

    // Phone validation (optional but if provided, must be valid)
    if (formData.phone && !/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    // Terms agreement validation
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    // Check system health before attempting registration
    if (!systemStatus.canRegister) {
      setErrors({ general: 'Registration is currently unavailable. Please try again later.' })
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      // Attempt user registration
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            company_name: formData.companyName,
            phone: formData.phone
          }
        }
      })

      if (error) {
        throw error
      }

      if (data.user) {
        // Log successful registration
        await logError(
          'User registered successfully',
          'auth',
          {
            action: 'register',
            user_id: data.user.id,
            email: formData.email,
            has_company: !!formData.companyName,
            has_phone: !!formData.phone
          }
        )

        // Redirect to confirmation page or dashboard
        navigate('/auth/confirm-email', { 
          state: { 
            email: formData.email,
            message: 'Please check your email to confirm your account.' 
          }
        })
      }

    } catch (error: any) {
      console.error('Registration error:', error)

      // Log the error
      await logError(
        error.message || 'Registration failed',
        'auth',
        {
          action: 'register',
          email: formData.email,
          error_code: error.status || 'UNKNOWN',
          error_details: error
        }
      )

      // Handle specific error types
      if (error.message?.includes('User already registered')) {
        setErrors({ email: 'An account with this email already exists' })
      } else if (error.message?.includes('Database error')) {
        setErrors({ general: 'Database connection error. Please try again or contact support.' })
        // Trigger system health check
        await checkSystemHealth()
      } else if (error.message?.includes('Invalid email')) {
        setErrors({ email: 'Please enter a valid email address' })
      } else {
        setErrors({ general: error.message || 'Registration failed. Please try again.' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEmergencyRecovery = async () => {
    setRecoveryInProgress(true)
    try {
      await emergencyRecovery()
      await checkSystemHealth()
      alert('Emergency recovery completed. Please try registering again.')
    } catch (error) {
      console.error('Emergency recovery failed:', error)
      alert('Emergency recovery failed. Please contact system administrator.')
    } finally {
      setRecoveryInProgress(false)
    }
  }

  const handleRunHealthCheck = async () => {
    setIsLoading(true)
    try {
      await runHealthCheckWithLogging()
      await checkSystemHealth()
    } catch (error) {
      console.error('Health check failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-block">
            <img
              src="/qcs-logo.svg"
              alt="QCS Cargo"
              className="h-12 w-auto mx-auto mb-4"
            />
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">Create Your Account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Join QCS Cargo for reliable shipping solutions
          </p>
        </div>

        {/* System Status Indicator */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${systemStatus.isHealthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium">
                System Status: {systemStatus.isHealthy ? 'Healthy' : 'Issues Detected'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSystemStatus(!showSystemStatus)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {showSystemStatus ? 'Hide' : 'Show'} Details
            </button>
          </div>
          
          {showSystemStatus && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-600 mb-2">
                Last checked: {systemStatus.lastCheck}
              </div>
              {systemStatus.issues.length > 0 && (
                <div className="space-y-1">
                  {systemStatus.issues.map((issue, index) => (
                    <div key={index} className="text-xs text-red-600">
                      • {issue}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex space-x-2 mt-3">
                <button
                  type="button"
                  onClick={handleRunHealthCheck}
                  disabled={isLoading}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 disabled:opacity-50"
                >
                  {isLoading ? 'Checking...' : 'Recheck'}
                </button>
                {!systemStatus.isHealthy && (
                  <button
                    type="button"
                    onClick={handleEmergencyRecovery}
                    disabled={recoveryInProgress}
                    className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 disabled:opacity-50"
                  >
                    {recoveryInProgress ? 'Recovering...' : 'Emergency Recovery'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Registration Form */}
        <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-md" onSubmit={handleSubmit}>
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {errors.general}
            </div>
          )}

          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleInputChange}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.fullName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your full name"
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Company Name */}
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                Company Name
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                value={formData.companyName}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your company name (optional)"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.phone ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your phone number (optional)"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Create a strong password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Terms Agreement */}
            <div>
              <label className="flex items-start space-x-2">
                <input
                  name="agreeToTerms"
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={handleInputChange}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  I agree to the{' '}
                  <Link to="/terms" className="text-blue-600 hover:text-blue-800">
                    Terms and Conditions
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-blue-600 hover:text-blue-800">
                    Privacy Policy
                  </Link>
                  *
                </span>
              </label>
              {errors.agreeToTerms && (
                <p className="mt-1 text-sm text-red-600">{errors.agreeToTerms}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isSubmitting || !systemStatus.canRegister}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isSubmitting || !systemStatus.canRegister
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EnhancedRegisterPage