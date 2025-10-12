import React from 'react'
import { Phone, Globe } from 'lucide-react'

interface PhoneNumberInputProps {
  countryCode: string
  phoneNumber: string
  country: string
  onCountryCodeChange: (code: string) => void
  onPhoneNumberChange: (phone: string) => void
  error?: string
}

// Country codes mapping
const COUNTRY_CODES: Record<string, string> = {
  'United States': '+1',
  'Guyana': '+592',
  'Jamaica': '+1-876',
  'Trinidad and Tobago': '+1-868',
  'Barbados': '+1-246',
  'Dominican Republic': '+1-809',
  'Puerto Rico': '+1-787',
  'Haiti': '+509',
  'Cuba': '+53',
  'Bahamas': '+1-242',
  'Saint Lucia': '+1-758',
  'Grenada': '+1-473',
  'Saint Vincent and the Grenadines': '+1-784',
  'Antigua and Barbuda': '+1-268',
  'Dominica': '+1-767',
  'Saint Kitts and Nevis': '+1-869'
}

const POPULAR_CODES = [
  { code: '+1', label: '+1 (US/Canada)', countries: ['United States', 'Canada'] },
  { code: '+592', label: '+592 (Guyana)', countries: ['Guyana'] },
  { code: '+1-876', label: '+1-876 (Jamaica)', countries: ['Jamaica'] },
  { code: '+1-868', label: '+1-868 (Trinidad & Tobago)', countries: ['Trinidad and Tobago'] },
  { code: '+1-246', label: '+1-246 (Barbados)', countries: ['Barbados'] },
  { code: '+1-809', label: '+1-809 (Dominican Republic)', countries: ['Dominican Republic'] },
  { code: '+44', label: '+44 (United Kingdom)', countries: ['United Kingdom'] },
  { code: '+1-787', label: '+1-787 (Puerto Rico)', countries: ['Puerto Rico'] },
  { code: '+509', label: '+509 (Haiti)', countries: ['Haiti'] }
]

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  countryCode,
  phoneNumber,
  country,
  onCountryCodeChange,
  onPhoneNumberChange,
  error
}) => {
  // Auto-update country code when country changes
  React.useEffect(() => {
    if (country && COUNTRY_CODES[country] && countryCode !== COUNTRY_CODES[country]) {
      onCountryCodeChange(COUNTRY_CODES[country])
    }
  }, [country, countryCode, onCountryCodeChange])

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '')
    
    // Format based on country code
    if (countryCode === '+1' || countryCode.startsWith('+1-')) {
      // US/Canada/Caribbean format: (XXX) XXX-XXXX
      if (cleaned.length <= 3) {
        return cleaned
      } else if (cleaned.length <= 6) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
      } else {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
      }
    } else if (countryCode === '+592') {
      // Guyana format: XXX-XXXX
      if (cleaned.length <= 3) {
        return cleaned
      } else {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`
      }
    }
    
    // Default: no special formatting
    return cleaned
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const formatted = formatPhoneNumber(value)
    onPhoneNumberChange(formatted)
  }

  const getPhonePlaceholder = () => {
    if (countryCode === '+1' || countryCode.startsWith('+1-')) {
      return '(555) 123-4567'
    } else if (countryCode === '+592') {
      return '123-4567'
    }
    return 'Enter phone number'
  }

  const getPhoneExample = () => {
    if (countryCode === '+1' || countryCode.startsWith('+1-')) {
      return 'Format: (555) 123-4567'
    } else if (countryCode === '+592') {
      return 'Format: 123-4567'
    }
    return 'Enter your local phone number'
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Phone Number
      </label>
      <div className="grid grid-cols-3 gap-3">
        {/* Country Code Selector */}
        <div>
          <select
            value={countryCode}
            onChange={(e) => onCountryCodeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            {POPULAR_CODES.map(({ code, label }) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Phone Number Input */}
        <div className="col-span-2">
          <input
            type="tel"
            value={phoneNumber}
            onChange={handlePhoneChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder={getPhonePlaceholder()}
          />
        </div>
      </div>
      
      {/* Help Text */}
      <div className="flex items-start space-x-2 mt-2">
        <Phone className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-gray-500">
          {getPhoneExample()}
        </p>
      </div>
      
      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
      
      {/* Regional Info */}
      {country && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-3">
          <div className="flex items-start space-x-2">
            <Globe className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-700">
                {country} Phone Format
              </p>
              <p className="text-xs text-gray-600">
                {countryCode === '+1' && 'US/Canada: Include area code (10 digits total)'}
                {countryCode === '+592' && 'Guyana: 7-digit local number'}
                {countryCode.startsWith('+1-') && 'Caribbean: Include area code (10 digits total)'}
                {!countryCode.startsWith('+1') && countryCode !== '+592' && 'Enter your local phone number format'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PhoneNumberInput
