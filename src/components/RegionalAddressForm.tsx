import React from 'react'
import { MapPin, Globe } from 'lucide-react'

interface RegionalAddressFormProps {
  profile: any
  onProfileChange: (field: string, value: any) => void
  validationErrors: Record<string, string>
}

// Country-specific data
const COUNTRIES = {
  'United States': {
    states: [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
      'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
      'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
      'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
      'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
      'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
      'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'Washington D.C.',
      'Puerto Rico', 'U.S. Virgin Islands', 'Guam', 'American Samoa', 'Northern Mariana Islands'
    ],
    zipLabel: 'ZIP Code',
    zipPlaceholder: '12345 or 12345-6789'
  },
  'Guyana': {
    regions: [
      'Barima-Waini', 'Pomeroon-Supenaam', 'Essequibo Islands-West Demerara', 'Demerara-Mahaica',
      'Mahaica-Berbice', 'East Berbice-Corentyne', 'Cuyuni-Mazaruni', 'Potaro-Siparuni',
      'Upper Takutu-Upper Essequibo', 'Upper Demerara-Berbice'
    ],
    districts: {
      'Barima-Waini': ['Mabaruma', 'Moruca', 'Waina'],
      'Pomeroon-Supenaam': ['Anna Regina', 'Charity', 'Supenaam'],
      'Essequibo Islands-West Demerara': ['Parika', 'Vreed-en-Hoop', 'Belle Vue'],
      'Demerara-Mahaica': ['Georgetown', 'Paradise', 'Timehri', 'Mahaica'],
      'Mahaica-Berbice': ['New Amsterdam', 'Fort Wellington', 'Mahaicony'],
      'East Berbice-Corentyne': ['New Amsterdam', 'Corriverton', 'Rose Hall', 'Skeldon'],
      'Cuyuni-Mazaruni': ['Bartica', 'Mazaruni', 'Issano'],
      'Potaro-Siparuni': ['Mahdia', 'Tumatumari'],
      'Upper Takutu-Upper Essequibo': ['Lethem', 'Aishalton'],
      'Upper Demerara-Berbice': ['Linden', 'Kwakwani', 'Ituni']
    },
    postalLabel: 'Postal Code',
    postalPlaceholder: 'Enter postal code'
  }
}

const CARIBBEAN_COUNTRIES = [
  'Jamaica', 'Trinidad and Tobago', 'Barbados', 'Dominican Republic', 'Puerto Rico',
  'Haiti', 'Cuba', 'Bahamas', 'Saint Lucia', 'Grenada', 'Saint Vincent and the Grenadines',
  'Antigua and Barbuda', 'Dominica', 'Saint Kitts and Nevis'
]

const RegionalAddressForm: React.FC<RegionalAddressFormProps> = ({
  profile,
  onProfileChange,
  validationErrors
}) => {
  const isUS = profile.country === 'United States'
  const isGuyana = profile.country === 'Guyana'
  const isCaribbean = CARIBBEAN_COUNTRIES.includes(profile.country)

  const handleCountryChange = (country: string) => {
    onProfileChange('country', country)
    // Reset regional fields when country changes
    onProfileChange('state', '')
    onProfileChange('region', '')
    onProfileChange('district', '')
    onProfileChange('zip_code', '')
    onProfileChange('postal_code', '')
  }

  const handleRegionChange = (region: string) => {
    onProfileChange('region', region)
    // Reset district when region changes
    onProfileChange('district', '')
  }

  const getAvailableDistricts = () => {
    if (isGuyana && profile.region) {
      return (COUNTRIES.Guyana.districts as Record<string, string[]>)[profile.region] || []
    }
    return []
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-orange-100 rounded-lg">
            <MapPin className="h-5 w-5 text-orange-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Address Information</h2>
        </div>
        
        <div className="space-y-6">
          {/* Country Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <select
              value={profile.country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Country</option>
              <option value="United States">United States</option>
              <option value="Guyana">Guyana</option>
              {CARIBBEAN_COUNTRIES.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          {/* Address Lines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1
              </label>
              <input
                type="text"
                value={profile.address_line1}
                onChange={(e) => onProfileChange('address_line1', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Street address, P.O. Box, company name, c/o"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2 (Optional)
              </label>
              <input
                type="text"
                value={profile.address_line2}
                onChange={(e) => onProfileChange('address_line2', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Apartment, suite, unit, building, floor, etc."
              />
            </div>
          </div>

          {/* Regional Fields - US */}
          {isUS && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => onProfileChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter city"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <select
                  value={profile.state}
                  onChange={(e) => onProfileChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select State</option>
                  {COUNTRIES['United States'].states.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {COUNTRIES['United States'].zipLabel}
                </label>
                <input
                  type="text"
                  value={profile.zip_code}
                  onChange={(e) => onProfileChange('zip_code', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.zip_code ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder={COUNTRIES['United States'].zipPlaceholder}
                />
                {validationErrors.zip_code && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.zip_code}</p>
                )}
              </div>
            </div>
          )}

          {/* Regional Fields - Guyana */}
          {isGuyana && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region
                  </label>
                  <select
                    value={profile.region}
                    onChange={(e) => handleRegionChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Region</option>
                    {COUNTRIES.Guyana.regions.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    District
                  </label>
                  <select
                    value={profile.district}
                    onChange={(e) => onProfileChange('district', e.target.value)}
                    disabled={!profile.region}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option value="">Select District</option>
                    {getAvailableDistricts().map((district: string) => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City/Town
                  </label>
                  <input
                    type="text"
                    value={profile.city}
                    onChange={(e) => onProfileChange('city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter city or town"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {COUNTRIES.Guyana.postalLabel}
                  </label>
                  <input
                    type="text"
                    value={profile.postal_code}
                    onChange={(e) => onProfileChange('postal_code', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={COUNTRIES.Guyana.postalPlaceholder}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Regional Fields - Caribbean */}
          {isCaribbean && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City/Parish
                </label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => onProfileChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter city or parish"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State/Province
                </label>
                <input
                  type="text"
                  value={profile.state}
                  onChange={(e) => onProfileChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter state or province"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={profile.postal_code}
                  onChange={(e) => onProfileChange('postal_code', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter postal code"
                />
              </div>
            </div>
          )}

          {/* Generic Fields for Other Countries */}
          {!isUS && !isGuyana && !isCaribbean && profile.country && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => onProfileChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter city"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State/Province
                </label>
                <input
                  type="text"
                  value={profile.state}
                  onChange={(e) => onProfileChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter state or province"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={profile.postal_code}
                  onChange={(e) => onProfileChange('postal_code', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter postal code"
                />
              </div>
            </div>
          )}

          {/* Regional Information Display */}
          {profile.country && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Globe className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">
                    Address Format for {profile.country}
                  </h4>
                  <p className="text-sm text-blue-700">
                    {isUS && "US addresses require: Street, City, State, ZIP Code"}
                    {isGuyana && "Guyana addresses use: Street, District, Region, Postal Code"}
                    {isCaribbean && "Caribbean addresses may use: Street, City/Parish, State/Province, Postal Code"}
                    {!isUS && !isGuyana && !isCaribbean && "Standard international address format: Street, City, State/Province, Postal Code"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RegionalAddressForm
