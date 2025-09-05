import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Camera,
  Upload,
  X,
  ArrowLeft
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import ProfilePhotoUpload from '@/components/ProfilePhotoUpload'
import RegionalAddressForm from '@/components/RegionalAddressForm'
import PhoneNumberInput from '@/components/PhoneNumberInput'
import ProfileCompletionIndicator from '@/components/ProfileCompletionIndicator'
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation'

interface CustomerProfile {
  id?: number
  user_id: string
  first_name: string
  last_name: string
  email: string
  date_of_birth: string | null
  company_name: string
  contact_person: string
  phone: string
  phone_country_code: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip_code: string
  postal_code: string
  country: string
  region: string
  district: string
  business_type: string
  tax_id: string
  preferred_contact_method: string
  emergency_contact: string
  emergency_phone: string
  profile_photo_url: string | null
  profile_completion_percentage: number
  preferences: any
  created_at?: string
  updated_at?: string
  profile_updated_at?: string
}

const CustomerProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges])

  const loadProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: functionError } = await supabase.functions.invoke('customer-profile-get')

      if (functionError) {
        throw new Error(functionError.message)
      }

      if (data?.error) {
        throw new Error(data.error.message)
      }

      const profileData = data?.data?.profile
      
      if (!profileData) {
        throw new Error('No profile data received')
      }

      setProfile(profileData)
      console.log('Profile loaded:', profileData.profile_completion_percentage + '% complete')
    } catch (err) {
      console.error('Error loading profile:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile'
      setError(errorMessage)
      toast.error('Failed to load profile: ' + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    if (!profile) return

    setProfile(prev => ({
      ...prev!,
      [field]: value
    }))
    setHasChanges(true)

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!profile?.first_name?.trim()) {
      errors.first_name = 'First name is required'
    }

    if (!profile?.last_name?.trim()) {
      errors.last_name = 'Last name is required'
    }

    if (!profile?.email?.trim()) {
      errors.email = 'Email is required'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(profile.email)) {
        errors.email = 'Invalid email address'
      }
    }

    if (profile?.phone && !/^[\d\s\-\(\)\+]+$/.test(profile.phone)) {
      errors.phone = 'Invalid phone number format'
    }

    if (profile?.country === 'United States' && profile?.zip_code && !/^\d{5}(-\d{4})?$/.test(profile.zip_code)) {
      errors.zip_code = 'Invalid US ZIP code format (12345 or 12345-6789)'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!profile) return

    if (!validateForm()) {
      toast.error('Please correct the validation errors before saving')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const { data, error: functionError } = await supabase.functions.invoke('customer-profile-update', {
        body: { 
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          date_of_birth: profile.date_of_birth,
          phone: profile.phone,
          phone_country_code: profile.phone_country_code,
          company_name: profile.company_name,
          contact_person: profile.contact_person,
          business_type: profile.business_type,
          address_line1: profile.address_line1,
          address_line2: profile.address_line2,
          city: profile.city,
          state: profile.state,
          zip_code: profile.zip_code,
          postal_code: profile.postal_code,
          country: profile.country,
          region: profile.region,
          district: profile.district,
          preferred_contact_method: profile.preferred_contact_method,
          emergency_contact: profile.emergency_contact,
          emergency_phone: profile.emergency_phone,
          tax_id: profile.tax_id,
          preferences: profile.preferences
        }
      })

      if (functionError) {
        throw new Error(functionError.message)
      }

      if (data?.error) {
        throw new Error(data.error.message)
      }

      const updatedProfile = data?.data?.profile
      if (updatedProfile) {
        setProfile(updatedProfile)
        setHasChanges(false)
        toast.success(`Profile saved successfully! ${updatedProfile.profile_completion_percentage}% complete`)
      } else {
        throw new Error('No updated profile data received')
      }
    } catch (err) {
      console.error('Error saving profile:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save profile'
      setError(errorMessage)
      toast.error('Failed to save profile: ' + errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoUploaded = (photoUrl: string, updatedProfile?: any) => {
    if (updatedProfile) {
      setProfile(updatedProfile)
    } else if (profile) {
      setProfile({ ...profile, profile_photo_url: photoUrl })
    }
    toast.success('Profile photo updated successfully!')
  }

  const handlePhotoDeleted = (updatedProfile?: any) => {
    if (updatedProfile) {
      setProfile(updatedProfile)
    } else if (profile) {
      setProfile({ ...profile, profile_photo_url: null })
    }
    toast.success('Profile photo removed successfully!')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-shopify-pink mx-auto mb-4" />
          <p className="text-shopify-maroon">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm border max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-shopify-maroon mb-2">Error Loading Profile</h2>
          <p className="text-shopify-roseGray mb-4">{error}</p>
          <button
            onClick={loadProfile}
            className="px-4 py-2 bg-shopify-pink text-white rounded-md hover:bg-shopify-maroon transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-blue-gray mx-auto mb-4" />
          <p className="text-shopify-maroon">No profile data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-shopify-rose to-shopify-roseDark">
      <BreadcrumbNavigation 
        customItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'My Profile', current: true }
        ]}
      />
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-shopify-roseGray hover:text-shopify-maroon transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-shopify-maroon">My Profile</h1>
                <p className="text-shopify-roseGray">Manage your personal information and preferences</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ProfileCompletionIndicator percentage={profile.profile_completion_percentage} />
              {hasChanges && (
                <div className="flex items-center space-x-2 text-shopify-maroon">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Unsaved changes</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Photo & Basic Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Photo */}
            <ProfilePhotoUpload
              currentPhotoUrl={profile.profile_photo_url}
              onPhotoUploaded={handlePhotoUploaded}
              onPhotoDeleted={handlePhotoDeleted}
            />

            {/* Profile Completion */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-shopify-maroon mb-4">Profile Completion</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-shopify-roseGray">Personal Info</span>
                  <span className={`text-sm font-medium ${
                    profile.first_name && profile.last_name && profile.date_of_birth ? 'text-shopify-success' : 'text-gray-400'
                  }`}>
                    {profile.first_name && profile.last_name && profile.date_of_birth ? 'Complete' : 'Incomplete'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-shopify-roseGray">Contact Info</span>
                  <span className={`text-sm font-medium ${
                    profile.phone && profile.email ? 'text-shopify-success' : 'text-gray-400'
                  }`}>
                    {profile.phone && profile.email ? 'Complete' : 'Incomplete'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-shopify-roseGray">Address</span>
                  <span className={`text-sm font-medium ${
                    profile.address_line1 && profile.city && profile.country ? 'text-shopify-success' : 'text-gray-400'
                  }`}>
                    {profile.address_line1 && profile.city && profile.country ? 'Complete' : 'Incomplete'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-shopify-roseGray">Profile Photo</span>
                  <span className={`text-sm font-medium ${
                    profile.profile_photo_url ? 'text-shopify-success' : 'text-gray-400'
                  }`}>
                    {profile.profile_photo_url ? 'Complete' : 'Incomplete'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-shopify-pink/10 rounded-lg">
                    <User className="h-5 w-5 text-shopify-pink" />
                  </div>
                  <h2 className="text-lg font-semibold text-shopify-maroon">Personal Information</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-shopify-roseGray mb-1">
                      First Name <span className="text-shopify-error">*</span>
                    </label>
                    <input
                      type="text"
                      value={profile.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-shopify-pink focus:border-shopify-pink ${
                        validationErrors.first_name ? 'border-shopify-error' : 'border-shopify-silver'
                      }`}
                      placeholder="Enter your first name"
                    />
                    {validationErrors.first_name && (
                      <p className="text-sm text-shopify-error mt-1">{validationErrors.first_name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-shopify-roseGray mb-1">
                      Last Name <span className="text-shopify-error">*</span>
                    </label>
                    <input
                      type="text"
                      value={profile.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-shopify-pink focus:border-shopify-pink ${
                        validationErrors.last_name ? 'border-shopify-error' : 'border-shopify-silver'
                      }`}
                      placeholder="Enter your last name"
                    />
                    {validationErrors.last_name && (
                      <p className="text-sm text-shopify-error mt-1">{validationErrors.last_name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-shopify-roseGray mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={profile.date_of_birth || ''}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value || null)}
                      className="w-full px-3 py-2 border border-shopify-silver rounded-md focus:outline-none focus:ring-2 focus:ring-shopify-pink focus:border-shopify-pink"
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-shopify-roseGray mb-1">
                      Email Address <span className="text-shopify-error">*</span>
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-shopify-pink focus:border-shopify-pink ${
                        validationErrors.email ? 'border-shopify-error' : 'border-shopify-silver'
                      }`}
                      placeholder="Enter your email address"
                    />
                    {validationErrors.email && (
                      <p className="text-sm text-shopify-error mt-1">{validationErrors.email}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-shopify-lavender/10 rounded-lg">
                    <Phone className="h-5 w-5 text-shopify-lavender" />
                  </div>
                  <h2 className="text-lg font-semibold text-shopify-maroon">Contact Information</h2>
                </div>
                
                <div className="space-y-6">
                  <PhoneNumberInput
                    countryCode={profile.phone_country_code}
                    phoneNumber={profile.phone}
                    country={profile.country}
                    onCountryCodeChange={(code) => handleInputChange('phone_country_code', code)}
                    onPhoneNumberChange={(phone) => handleInputChange('phone', phone)}
                    error={validationErrors.phone}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-shopify-roseGray mb-1">
                        Preferred Contact Method
                      </label>
                      <select
                        value={profile.preferred_contact_method}
                        onChange={(e) => handleInputChange('preferred_contact_method', e.target.value)}
                        className="w-full px-3 py-2 border border-shopify-silver rounded-md focus:outline-none focus:ring-2 focus:ring-shopify-pink focus:border-shopify-pink"
                      >
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-shopify-roseGray mb-1">
                        Emergency Contact
                      </label>
                      <input
                        type="text"
                        value={profile.emergency_contact}
                        onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
                        className="w-full px-3 py-2 border border-shopify-silver rounded-md focus:outline-none focus:ring-2 focus:ring-shopify-pink focus:border-shopify-pink"
                        placeholder="Emergency contact name"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-shopify-roseGray mb-1">
                        Emergency Phone
                      </label>
                      <input
                        type="tel"
                        value={profile.emergency_phone}
                        onChange={(e) => handleInputChange('emergency_phone', e.target.value)}
                        className="w-full px-3 py-2 border border-shopify-silver rounded-md focus:outline-none focus:ring-2 focus:ring-shopify-pink focus:border-shopify-pink"
                        placeholder="Emergency contact phone number"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <RegionalAddressForm
              profile={profile}
              onProfileChange={handleInputChange}
              validationErrors={validationErrors}
            />

            {/* Business Information */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-shopify-warning/10 rounded-lg">
                    <Building2 className="h-5 w-5 text-shopify-warning" />
                  </div>
                  <h2 className="text-lg font-semibold text-shopify-maroon">Business Information</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-shopify-roseGray mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={profile.company_name}
                      onChange={(e) => handleInputChange('company_name', e.target.value)}
                      className="w-full px-3 py-2 border border-shopify-silver rounded-md focus:outline-none focus:ring-2 focus:ring-shopify-pink focus:border-shopify-pink"
                      placeholder="Your company name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-shopify-roseGray mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={profile.contact_person}
                      onChange={(e) => handleInputChange('contact_person', e.target.value)}
                      className="w-full px-3 py-2 border border-shopify-silver rounded-md focus:outline-none focus:ring-2 focus:ring-shopify-pink focus:border-shopify-pink"
                      placeholder="Primary contact person"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-shopify-roseGray mb-1">
                      Business Type
                    </label>
                    <select
                      value={profile.business_type}
                      onChange={(e) => handleInputChange('business_type', e.target.value)}
                      className="w-full px-3 py-2 border border-shopify-silver rounded-md focus:outline-none focus:ring-2 focus:ring-shopify-pink focus:border-shopify-pink"
                    >
                      <option value="">Select business type</option>
                      <option value="retail">Retail</option>
                      <option value="wholesale">Wholesale</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="import_export">Import/Export</option>
                      <option value="logistics">Logistics</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-shopify-roseGray mb-1">
                      Tax ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={profile.tax_id}
                      onChange={(e) => handleInputChange('tax_id', e.target.value)}
                      className="w-full px-3 py-2 border border-shopify-silver rounded-md focus:outline-none focus:ring-2 focus:ring-shopify-pink focus:border-shopify-pink"
                      placeholder="Business tax identification"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end space-x-4">
              {hasChanges && (
                <button
                  onClick={loadProfile}
                  className="px-4 py-2 text-shopify-maroon bg-white border border-shopify-silver rounded-md hover:bg-shopify-rose transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="px-6 py-2 bg-shopify-maroon text-white rounded-md hover:bg-shopify-pink disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerProfilePage
