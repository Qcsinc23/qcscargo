/**
 * Country-specific address validation
 */

export interface AddressValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

// US States (abbreviations)
const US_STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC']

// Guyana Regions
const GUYANA_REGIONS = [
  'Barima-Waini', 'Pomeroon-Supenaam', 'Essequibo Islands-West Demerara', 
  'Demerara-Mahaica', 'Mahaica-Berbice', 'East Berbice-Corentyne', 
  'Cuyuni-Mazaruni', 'Potaro-Siparuni', 'Upper Takutu-Upper Essequibo', 
  'Upper Demerara-Berbice'
]

// ZIP Code patterns
const ZIP_PATTERNS: Record<string, RegExp> = {
  'United States': /^\d{5}(-\d{4})?$/,
  'Canada': /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, // A1A 1A1 or A1A-1A1
  'United Kingdom': /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, // SW1A 1AA
  'Jamaica': /^[A-Z]{2}\d{3,5}$/, // JM12345
  'Trinidad and Tobago': /^\d{6}$/, // 123456
  'Barbados': /^BB\d{5}$/, // BB12345
  'Dominican Republic': /^\d{5}$/, // 12345
}

// Postal code validation
function validatePostalCode(code: string, country: string): boolean {
  const pattern = ZIP_PATTERNS[country]
  if (!pattern) {
    // Generic validation - at least 3 characters
    return code.trim().length >= 3
  }
  return pattern.test(code.trim())
}

/**
 * Validate address for a specific country
 */
export function validateAddress(address: {
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  zip_code?: string
  postal_code?: string
  region?: string
  district?: string
  country?: string
}): AddressValidationResult {
  const errors: Record<string, string> = {}
  const country = address.country || 'United States'

  // Address Line 1 is required
  if (!address.address_line1?.trim()) {
    errors.address_line1 = 'Street address is required'
  } else if (address.address_line1.trim().length < 5) {
    errors.address_line1 = 'Street address is too short'
  } else if (address.address_line1.trim().length > 255) {
    errors.address_line1 = 'Street address is too long (max 255 characters)'
  }

  // City validation
  if (!address.city?.trim()) {
    errors.city = 'City is required'
  } else if (address.city.trim().length < 2) {
    errors.city = 'City name is too short'
  } else if (address.city.trim().length > 100) {
    errors.city = 'City name is too long (max 100 characters)'
  }

  // Country-specific validations
  if (country === 'United States') {
    // State validation (required, must be 2-letter abbreviation)
    if (!address.state?.trim()) {
      errors.state = 'State is required'
    } else {
      const stateUpper = address.state.trim().toUpperCase()
      if (stateUpper.length !== 2) {
        errors.state = 'State must be a 2-letter abbreviation (e.g., NY, CA)'
      } else if (!US_STATES.includes(stateUpper)) {
        errors.state = `Invalid state abbreviation. Valid examples: NY, CA, TX, FL`
      }
    }

    // ZIP Code validation
    if (!address.zip_code?.trim()) {
      errors.zip_code = 'ZIP code is required'
    } else if (!validatePostalCode(address.zip_code, country)) {
      errors.zip_code = 'Invalid ZIP code format. Use 12345 or 12345-6789'
    }
  } else if (country === 'Guyana') {
    // Region validation
    if (!address.region?.trim()) {
      errors.region = 'Region is required'
    } else if (!GUYANA_REGIONS.includes(address.region)) {
      errors.region = 'Invalid region. Please select from the list'
    }

    // District validation (optional but recommended)
    if (address.district && address.district.trim().length < 2) {
      errors.district = 'District name is too short'
    }

    // Postal code validation (optional)
    if (address.postal_code && !validatePostalCode(address.postal_code, country)) {
      errors.postal_code = 'Invalid postal code format'
    }
  } else if (country === 'Canada') {
    // Province validation (required)
    if (!address.state?.trim()) {
      errors.state = 'Province is required'
    } else if (address.state.trim().length < 2 || address.state.trim().length > 2) {
      errors.state = 'Province must be a 2-letter abbreviation'
    }

    // Postal code validation
    if (!address.postal_code?.trim()) {
      errors.postal_code = 'Postal code is required'
    } else if (!validatePostalCode(address.postal_code, country)) {
      errors.postal_code = 'Invalid postal code format (e.g., A1A 1A1)'
    }
  } else {
    // Generic international validation
    // State/Province validation
    if (address.state && address.state.trim().length < 2) {
      errors.state = 'State/Province name is too short'
    }

    // Postal code validation (optional but validate format if provided)
    if (address.postal_code && !validatePostalCode(address.postal_code, country)) {
      errors.postal_code = 'Invalid postal code format'
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Get address format requirements for a country
 */
export function getAddressFormat(country: string): {
  requiredFields: string[]
  optionalFields: string[]
  examples: Record<string, string>
} {
  switch (country) {
    case 'United States':
      return {
        requiredFields: ['address_line1', 'city', 'state', 'zip_code'],
        optionalFields: ['address_line2'],
        examples: {
          address_line1: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zip_code: '10001'
        }
      }
    case 'Guyana':
      return {
        requiredFields: ['address_line1', 'city', 'region'],
        optionalFields: ['address_line2', 'district', 'postal_code'],
        examples: {
          address_line1: '123 Main Street',
          city: 'Georgetown',
          region: 'Demerara-Mahaica',
          district: 'Georgetown',
          postal_code: '12345'
        }
      }
    case 'Canada':
      return {
        requiredFields: ['address_line1', 'city', 'state', 'postal_code'],
        optionalFields: ['address_line2'],
        examples: {
          address_line1: '123 Main Street',
          city: 'Toronto',
          state: 'ON',
          postal_code: 'M5H 2N2'
        }
      }
    default:
      return {
        requiredFields: ['address_line1', 'city'],
        optionalFields: ['address_line2', 'state', 'postal_code'],
        examples: {
          address_line1: '123 Main Street',
          city: 'City Name',
          state: 'State/Province',
          postal_code: '12345'
        }
      }
  }
}

/**
 * Format US state abbreviation
 */
export function formatUSState(state: string): string {
  const trimmed = state.trim()
  if (trimmed.length === 2) {
    return trimmed.toUpperCase()
  }
  // Try to find matching state name
  const stateNames: Record<string, string> = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY', 'washington dc': 'DC', 'district of columbia': 'DC'
  }
  const normalized = trimmed.toLowerCase()
  return stateNames[normalized] || trimmed.toUpperCase().slice(0, 2)
}

