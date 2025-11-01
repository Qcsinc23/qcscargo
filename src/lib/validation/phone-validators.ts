/**
 * Country-specific phone number validation and formatting
 */

export interface PhoneValidationResult {
  isValid: boolean
  formatted: string
  error?: string
  countryCode: string
}

// Country-specific phone formats
const PHONE_FORMATS: Record<string, {
  countryCode: string
  pattern: RegExp
  format: (digits: string) => string
  placeholder: string
  example: string
  minLength: number
  maxLength: number
}> = {
  'United States': {
    countryCode: '+1',
    pattern: /^\+?1?[-.\s]?\(?([2-9]\d{2})\)?[-.\s]?([2-9]\d{2})[-.\s]?(\d{4})$/,
    format: (digits) => {
      if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
      }
      return digits
    },
    placeholder: '(555) 123-4567',
    example: '(555) 123-4567',
    minLength: 10,
    maxLength: 10
  },
  'Canada': {
    countryCode: '+1',
    pattern: /^\+?1?[-.\s]?\(?([2-9]\d{2})\)?[-.\s]?([2-9]\d{2})[-.\s]?(\d{4})$/,
    format: (digits) => {
      if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
      }
      return digits
    },
    placeholder: '(555) 123-4567',
    example: '(555) 123-4567',
    minLength: 10,
    maxLength: 10
  },
  'Guyana': {
    countryCode: '+592',
    pattern: /^\+?592?[-.\s]?(\d{3})[-.\s]?(\d{4})$/,
    format: (digits) => {
      if (digits.length === 7) {
        return `${digits.slice(0, 3)}-${digits.slice(3)}`
      }
      return digits
    },
    placeholder: '123-4567',
    example: '123-4567',
    minLength: 7,
    maxLength: 7
  },
  'Jamaica': {
    countryCode: '+1-876',
    pattern: /^\+?1[-.\s]?876?[-.\s]?(\d{3})[-.\s]?(\d{4})$/,
    format: (digits) => {
      if (digits.length === 7) {
        return `${digits.slice(0, 3)}-${digits.slice(3)}`
      }
      return digits
    },
    placeholder: '123-4567',
    example: '(876) 123-4567',
    minLength: 7,
    maxLength: 7
  },
  'Trinidad and Tobago': {
    countryCode: '+1-868',
    pattern: /^\+?1[-.\s]?868?[-.\s]?(\d{3})[-.\s]?(\d{4})$/,
    format: (digits) => {
      if (digits.length === 7) {
        return `${digits.slice(0, 3)}-${digits.slice(3)}`
      }
      return digits
    },
    placeholder: '123-4567',
    example: '(868) 123-4567',
    minLength: 7,
    maxLength: 7
  },
  'Barbados': {
    countryCode: '+1-246',
    pattern: /^\+?1[-.\s]?246?[-.\s]?(\d{3})[-.\s]?(\d{4})$/,
    format: (digits) => {
      if (digits.length === 7) {
        return `${digits.slice(0, 3)}-${digits.slice(3)}`
      }
      return digits
    },
    placeholder: '123-4567',
    example: '(246) 123-4567',
    minLength: 7,
    maxLength: 7
  },
  'Dominican Republic': {
    countryCode: '+1-809',
    pattern: /^\+?1[-.\s]?(809|829|849)?[-.\s]?(\d{3})[-.\s]?(\d{4})$/,
    format: (digits) => {
      if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
      }
      return digits
    },
    placeholder: '(809) 123-4567',
    example: '(809) 123-4567',
    minLength: 10,
    maxLength: 10
  },
  'United Kingdom': {
    countryCode: '+44',
    pattern: /^\+?44?[-.\s]?(\d{2,4})[-.\s]?(\d{3,4})[-.\s]?(\d{4})$/,
    format: (digits) => {
      if (digits.length >= 10 && digits.length <= 11) {
        return `${digits.slice(0, -7)} ${digits.slice(-7, -4)} ${digits.slice(-4)}`
      }
      return digits
    },
    placeholder: '+44 20 1234 5678',
    example: '+44 20 1234 5678',
    minLength: 10,
    maxLength: 11
  }
}

/**
 * Validate phone number for a specific country
 */
export function validatePhone(phone: string, country: string = 'United States'): PhoneValidationResult {
  const format = PHONE_FORMATS[country]
  
  if (!format) {
    // Generic validation for unknown countries
    const cleaned = phone.replace(/\D/g, '')
    return {
      isValid: cleaned.length >= 7 && cleaned.length <= 15,
      formatted: phone,
      countryCode: '+1',
      error: cleaned.length < 7 ? 'Phone number too short' : cleaned.length > 15 ? 'Phone number too long' : undefined
    }
  }

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Check if it starts with country code and remove it
  let digits = cleaned
  if (digits.startsWith(format.countryCode.replace(/\D/g, ''))) {
    digits = digits.slice(format.countryCode.replace(/\D/g, '').length)
  }
  
  // Validate length
  if (digits.length < format.minLength) {
    return {
      isValid: false,
      formatted: phone,
      countryCode: format.countryCode,
      error: `Phone number must be at least ${format.minLength} digits`
    }
  }
  
  if (digits.length > format.maxLength) {
    return {
      isValid: false,
      formatted: phone,
      countryCode: format.countryCode,
      error: `Phone number must be at most ${format.maxLength} digits`
    }
  }

  // Test pattern
  const fullNumber = format.countryCode + digits
  const isValid = format.pattern.test(fullNumber) || digits.length >= format.minLength && digits.length <= format.maxLength

  // Format if valid
  const formatted = isValid ? format.format(digits) : phone

  return {
    isValid,
    formatted,
    countryCode: format.countryCode,
    error: isValid ? undefined : `Invalid phone format for ${country}. Expected: ${format.example}`
  }
}

/**
 * Format phone number as user types
 */
export function formatPhoneInput(value: string, country: string = 'United States'): string {
  const format = PHONE_FORMATS[country]
  
  if (!format) {
    return value
  }

  const cleaned = value.replace(/\D/g, '')
  
  // Remove country code if present
  let digits = cleaned
  const countryCodeDigits = format.countryCode.replace(/\D/g, '')
  if (digits.startsWith(countryCodeDigits)) {
    digits = digits.slice(countryCodeDigits.length)
  }
  
  // Limit to max length
  if (digits.length > format.maxLength) {
    digits = digits.slice(0, format.maxLength)
  }
  
  // Format based on length
  if (digits.length === 0) {
    return ''
  }
  
  return format.format(digits)
}

/**
 * Get phone format info for a country
 */
export function getPhoneFormat(country: string) {
  return PHONE_FORMATS[country] || {
    countryCode: '+1',
    placeholder: 'Enter phone number',
    example: 'Enter phone number',
    minLength: 7,
    maxLength: 15
  }
}

/**
 * Extract country code from phone number
 */
export function extractCountryCode(phone: string, country: string = 'United States'): string {
  const format = PHONE_FORMATS[country]
  return format?.countryCode || '+1'
}

