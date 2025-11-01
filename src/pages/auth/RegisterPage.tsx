import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock, User, Building, Phone, MapPin, AlertCircle, CheckCircle, ArrowRight, ArrowLeft, Shield, Globe, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logAuthError, logDatabaseError, logValidationError } from '../../lib/errorLogger'
import { useVirtualAddress } from '@/hooks/useVirtualAddress'
import VirtualAddressCard from '@/components/VirtualAddressCard'
import { logger } from '@/lib/logger'
import { StepIndicator } from '@/components/StepIndicator'
import PhoneNumberInput from '@/components/PhoneNumberInput'
import RegionalAddressForm from '@/components/RegionalAddressForm'
import { validatePhone, formatPhoneInput, getPhoneFormat } from '@/lib/validation/phone-validators'
import { validateAddress, getAddressFormat } from '@/lib/validation/address-validators'
import { draftStorage } from '@/lib/draftStorage'

const REGISTER_DRAFT_KEY = 'register_form'

interface FormData {
  // Step 1: Basic Info
  email: string
  password: string
  confirmPassword: string
  
  // Step 2: Personal Info
  firstName: string
  lastName: string
  phone: string
  phoneCountryCode: string
  companyName: string
  
  // Step 3: Address
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip_code: string
  postal_code: string
  region: string
  district: string
  country: string
}

interface FormErrors {
  [key: string]: string
}

const STEPS = [
  { id: 'account', label: 'Account', description: 'Email & Password' },
  { id: 'personal', label: 'Personal', description: 'Your Information' },
  { id: 'address', label: 'Address', description: 'Where You Are' },
  { id: 'review', label: 'Review', description: 'Confirm Details' }
]

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    phoneCountryCode: '+1',
    companyName: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    postal_code: '',
    region: '',
    district: '',
    country: 'United States'
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { address: virtualAddress, loading: addressLoading, error: addressError, fetchAddress } = useVirtualAddress()

  const { signUp } = useAuth()
  const navigate = useNavigate()

  // Load draft on mount
  useEffect(() => {
    const draft = draftStorage.load<FormData>(REGISTER_DRAFT_KEY)
    if (draft) {
      setFormData(draft)
      logger.debug('Loaded registration draft', { component: 'RegisterPage' })
    }
  }, [])

  // Auto-save draft
  useEffect(() => {
    if (formData.email || formData.firstName) {
      draftStorage.save(REGISTER_DRAFT_KEY, formData)
    }
  }, [formData])

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
    // Auto-update phone country code based on country
    if (field === 'country') {
      const format = getPhoneFormat(value)
      setFormData(prev => ({ ...prev, phoneCountryCode: format.countryCode }))
    }
  }

  const validateStep = (step: number): boolean => {
    const errors: FormErrors = {}
    const fieldErrs: Record<string, string> = {}

    if (step === 0) {
      // Step 1: Account validation
      if (!formData.email.trim()) {
        errors.email = 'Email is required'
        fieldErrs.email = 'Email is required'
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email)) {
          errors.email = 'Please enter a valid email address'
          fieldErrs.email = 'Invalid email format'
        }
      }

      if (!formData.password) {
        errors.password = 'Password is required'
        fieldErrs.password = 'Password is required'
      } else if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters'
        fieldErrs.password = 'Password too short'
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        errors.password = 'Password must contain uppercase, lowercase, and number'
        fieldErrs.password = 'Password too weak'
      }

      if (!formData.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password'
        fieldErrs.confirmPassword = 'Required'
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match'
        fieldErrs.confirmPassword = 'Passwords do not match'
      }
    } else if (step === 1) {
      // Step 2: Personal info validation
      if (!formData.firstName.trim()) {
        errors.firstName = 'First name is required'
        fieldErrs.firstName = 'Required'
      } else if (formData.firstName.trim().length < 2) {
        errors.firstName = 'First name must be at least 2 characters'
        fieldErrs.firstName = 'Too short'
      }

      if (!formData.lastName.trim()) {
        errors.lastName = 'Last name is required'
        fieldErrs.lastName = 'Required'
      } else if (formData.lastName.trim().length < 2) {
        errors.lastName = 'Last name must be at least 2 characters'
        fieldErrs.lastName = 'Too short'
      }

      // Phone validation (optional but validate if provided)
      if (formData.phone) {
        const phoneValidation = validatePhone(formData.phone, formData.country)
        if (!phoneValidation.isValid && phoneValidation.error) {
          errors.phone = phoneValidation.error
          fieldErrs.phone = phoneValidation.error
        }
      }
    } else if (step === 2) {
      // Step 3: Address validation
      const addressValidation = validateAddress({
        address_line1: formData.address_line1,
        address_line2: formData.address_line2,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        postal_code: formData.postal_code,
        region: formData.region,
        district: formData.district,
        country: formData.country
      })

      if (!addressValidation.isValid) {
        Object.assign(errors, addressValidation.errors)
        Object.assign(fieldErrs, addressValidation.errors)
      }
    }

    setFormErrors(errors)
    setFieldErrors(fieldErrs)
    return Object.keys(errors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handlePhoneChange = (countryCode: string, phoneNumber: string) => {
    setFormData(prev => ({
      ...prev,
      phoneCountryCode: countryCode,
      phone: formatPhoneInput(phoneNumber, formData.country)
    }))
  }

  const handleAddressChange = (field: string, value: string) => {
    handleChange(field as keyof FormData, value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate all steps
    for (let i = 0; i < STEPS.length - 1; i++) {
      if (!validateStep(i)) {
        setCurrentStep(i)
        setLoading(false)
        return
      }
    }

    try {
      // Sign up user
      const { data, error: signUpError } = await signUp(formData.email, formData.password)
      
      if (signUpError) {
        logger.error('Sign up error', signUpError, {
          component: 'RegisterPage',
          action: 'handleSubmit'
        })
        const errorMessage = signUpError.message || 'Registration failed'
        await logAuthError(errorMessage, { action: 'register', email: formData.email })
        
        let userMessage = errorMessage
        if (errorMessage.includes('User already registered')) {
          userMessage = 'An account with this email already exists. Please try signing in instead.'
        } else if (errorMessage.includes('Password should be at least')) {
          userMessage = 'Password must be at least 8 characters long.'
        } else if (errorMessage.includes('Invalid email')) {
          userMessage = 'Please enter a valid email address.'
        } else if (errorMessage.includes('For security purposes')) {
          userMessage = 'Please wait a moment before trying again. This helps us keep your account secure.'
        } else if (errorMessage.includes('Too many requests')) {
          userMessage = 'Too many registration attempts. Please wait a few minutes before trying again.'
        } else if ((signUpError as { status?: number }).status === 429) {
          userMessage = 'Registration temporarily limited. Please wait a moment and try again.'
        }
        
        setError(userMessage)
        return
      }

      if (data && typeof data === 'object' && 'user' in data && data.user) {
        // Prepare profile data with validated phone number
        const phoneValidation = formData.phone 
          ? validatePhone(formData.phone, formData.country)
          : null
        
        const profileUpdateData: Record<string, unknown> = {
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          phone: phoneValidation?.formatted || formData.phone || null,
          phone_country_code: formData.phoneCountryCode || '+1',
          company_name: formData.companyName.trim() || null,
          address_line1: formData.address_line1.trim() || null,
          address_line2: formData.address_line2.trim() || null,
          city: formData.city.trim() || null,
          state: formData.state.trim() || null,
          zip_code: formData.zip_code.trim() || null,
          postal_code: formData.postal_code.trim() || null,
          region: formData.region.trim() || null,
          district: formData.district.trim() || null,
          country: formData.country || 'United States'
        }

        const userId = (data as { user?: { id?: string } }).user?.id
        logger.debug('Updating user profile with additional data', {
          component: 'RegisterPage',
          action: 'updateProfile',
          user_id: userId || 'unknown'
        })

        // Wait for trigger to create basic profile
        await new Promise(resolve => setTimeout(resolve, 1000))

        const { error: profileError } = await supabase
          .from('user_profiles')
          .update(profileUpdateData)
          .eq('user_id', userId || '')

        if (profileError) {
          logger.error('Profile update error', profileError, {
            component: 'RegisterPage',
            action: 'updateProfile'
          })
          await logDatabaseError(profileError, 'user_profiles', 'update', profileUpdateData)
          logger.warn('Profile update failed, but registration was successful', {
            component: 'RegisterPage',
            action: 'updateProfile'
          })
        } else {
          logger.debug('User profile updated successfully', {
            component: 'RegisterPage',
            action: 'updateProfile'
          })
        }
      }

      if (data && typeof data === 'object' && 'session' in data && data.session) {
        try {
          await fetchAddress()
        } catch (addressFetchError) {
          logger.warn('Mailbox not ready immediately after signup', {
            component: 'RegisterPage',
            action: 'fetchAddress',
            error: addressFetchError instanceof Error ? addressFetchError.message : String(addressFetchError)
          })
        }
      }

      // Clear draft on success
      draftStorage.clear(REGISTER_DRAFT_KEY)
      setSuccess(true)

    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error('Registration error', error, {
        component: 'RegisterPage',
        action: 'handleSubmit'
      })
      const errorMessage = error.message || 'An unexpected error occurred during registration'
      await logAuthError(errorMessage, { action: 'register', email: formData.email })
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl space-y-4">
          <Card className="border-2 border-green-200 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-900">Registration Successful!</CardTitle>
              <CardDescription className="text-base">
                Please check your email for a verification link before signing in.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-pink-600 text-center">
                We've sent a verification email to <strong>{formData.email}</strong>. Once you verify, you can log in and start shipping.
              </p>
              <Button onClick={() => navigate('/auth/login')} className="w-full" size="lg">
                Go to Sign In
              </Button>
            </CardContent>
          </Card>

          {addressError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{addressError}</AlertDescription>
            </Alert>
          )}

          <VirtualAddressCard
            address={virtualAddress}
            loading={addressLoading}
            onRefresh={fetchAddress}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block hover:opacity-80 transition-opacity">
            <img
              src="/qcs-logo.svg"
              alt="QCS Cargo - Precision Air Cargo Solutions"
              className="h-16 w-auto mx-auto mb-2"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/QCS_Cargo_Logo.png";
              }}
            />
            <h1 className="text-3xl font-bold text-rose-900">QCS Cargo</h1>
          </Link>
          <p className="text-pink-600 mt-2 text-lg">Create your shipping account</p>
        </div>

        <Card className="shadow-xl border-2 border-pink-200">
          <CardHeader className="bg-gradient-to-r from-rose-50 to-pink-50 border-b">
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription className="text-base">
              Sign up to start managing your shipments with QCS Cargo
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {/* Step Indicator */}
            <div className="mb-8">
              <StepIndicator 
                steps={STEPS} 
                currentStep={currentStep}
                completedSteps={Array.from({ length: currentStep }, (_, i) => i)}
              />
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Account Information */}
              {currentStep === 0 && (
                <div className="space-y-6 animate-in fade-in-50 duration-300">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          value={formData.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          className={`pl-10 ${fieldErrors.email ? 'border-red-300' : ''}`}
                          required
                          disabled={loading}
                        />
                      </div>
                      {fieldErrors.email && (
                        <p className="text-sm text-red-600">{fieldErrors.email}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium">Password *</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            className={`pl-10 pr-10 ${fieldErrors.password ? 'border-red-300' : ''}`}
                            required
                            disabled={loading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {fieldErrors.password && (
                          <p className="text-sm text-red-600">{fieldErrors.password}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Must be at least 8 characters with uppercase, lowercase, and number
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password *</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={(e) => handleChange('confirmPassword', e.target.value)}
                            className={`pl-10 pr-10 ${fieldErrors.confirmPassword ? 'border-red-300' : ''}`}
                            required
                            disabled={loading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {fieldErrors.confirmPassword && (
                          <p className="text-sm text-red-600">{fieldErrors.confirmPassword}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Personal Information */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in-50 duration-300">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <User className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-sm font-medium">First Name *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            id="firstName"
                            type="text"
                            placeholder="John"
                            value={formData.firstName}
                            onChange={(e) => handleChange('firstName', e.target.value)}
                            className={`pl-10 ${fieldErrors.firstName ? 'border-red-300' : ''}`}
                            required
                            disabled={loading}
                          />
                        </div>
                        {fieldErrors.firstName && (
                          <p className="text-sm text-red-600">{fieldErrors.firstName}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-sm font-medium">Last Name *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            id="lastName"
                            type="text"
                            placeholder="Doe"
                            value={formData.lastName}
                            onChange={(e) => handleChange('lastName', e.target.value)}
                            className={`pl-10 ${fieldErrors.lastName ? 'border-red-300' : ''}`}
                            required
                            disabled={loading}
                          />
                        </div>
                        {fieldErrors.lastName && (
                          <p className="text-sm text-red-600">{fieldErrors.lastName}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <PhoneNumberInput
                        countryCode={formData.phoneCountryCode}
                        phoneNumber={formData.phone}
                        country={formData.country}
                        onCountryCodeChange={(code) => handleChange('phoneCountryCode', code)}
                        onPhoneNumberChange={(phone) => handlePhoneChange(formData.phoneCountryCode, phone)}
                        error={fieldErrors.phone}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyName" className="text-sm font-medium">Company Name (Optional)</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="companyName"
                          type="text"
                          placeholder="Your Company LLC"
                          value={formData.companyName}
                          onChange={(e) => handleChange('companyName', e.target.value)}
                          className="pl-10"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Address */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in-50 duration-300">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <MapPin className="h-5 w-5 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>
                  </div>

                  <RegionalAddressForm
                    profile={{
                      address_line1: formData.address_line1,
                      address_line2: formData.address_line2,
                      city: formData.city,
                      state: formData.state,
                      zip_code: formData.zip_code,
                      postal_code: formData.postal_code,
                      region: formData.region,
                      district: formData.district,
                      country: formData.country
                    }}
                    onProfileChange={handleAddressChange}
                    validationErrors={fieldErrors}
                  />
                </div>
              )}

              {/* Step 4: Review */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in-50 duration-300">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Shield className="h-5 w-5 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Review & Confirm</h3>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Account</h4>
                      <p className="text-sm text-gray-600">Email: {formData.email}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Personal</h4>
                      <p className="text-sm text-gray-600">
                        {formData.firstName} {formData.lastName}
                      </p>
                      {formData.phone && (
                        <p className="text-sm text-gray-600">
                          Phone: {formData.phoneCountryCode} {formData.phone}
                        </p>
                      )}
                      {formData.companyName && (
                        <p className="text-sm text-gray-600">Company: {formData.companyName}</p>
                      )}
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Address</h4>
                      <p className="text-sm text-gray-600">
                        {formData.address_line1}
                        {formData.address_line2 && `, ${formData.address_line2}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formData.city}
                        {formData.state && `, ${formData.state}`}
                        {formData.zip_code && ` ${formData.zip_code}`}
                        {formData.postal_code && ` ${formData.postal_code}`}
                      </p>
                      <p className="text-sm text-gray-600">{formData.country}</p>
                    </div>
                  </div>

                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      By creating an account, you agree to our Terms of Service and Privacy Policy.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0 || loading}
                  className="flex items-center"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                
                {currentStep < STEPS.length - 1 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={loading}
                    className="flex items-center"
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={loading} className="flex items-center">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Create Account
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-pink-600">
                Already have an account?{' '}
                <Link to="/auth/login" className="text-pink-700 hover:underline font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-pink-500 hover:text-pink-700">
            ← Back to website
          </Link>
        </div>
      </div>
    </div>
  )
}
