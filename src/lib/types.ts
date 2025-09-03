export interface Destination {
  id: number
  country_name: string
  city_name: string
  airport_code: string
  rate_per_lb_1_50: number
  rate_per_lb_51_100: number
  rate_per_lb_101_200: number
  rate_per_lb_201_plus: number
  transit_days_min: number
  transit_days_max: number
  express_surcharge_percent: number
  is_active: boolean
  created_at: string
}

export interface ShippingQuote {
  id: number
  customer_id?: string
  email: string
  full_name: string
  phone?: string
  destination_id: number
  weight_lbs: number
  length_inches?: number
  width_inches?: number
  height_inches?: number
  service_type: 'standard' | 'express'
  declared_value: number
  base_shipping_cost: number
  consolidation_fee: number
  handling_fee: number
  insurance_cost: number
  total_cost: number
  estimated_transit_days?: number
  special_instructions?: string
  status: string
  quote_expires_at: string
  created_at: string
}

export interface ContactInquiry {
  id: number
  full_name: string
  email: string
  phone?: string
  subject?: string
  message: string
  inquiry_type: string
  status: string
  created_at: string
}

export interface Shipment {
  id: number
  tracking_number: string
  quote_id?: number
  customer_id?: string
  destination_id: number
  weight_lbs: number
  service_type: 'standard' | 'express'
  status: string
  pickup_scheduled_at?: string
  processed_at?: string
  shipped_at?: string
  delivered_at?: string
  carrier_name?: string
  carrier_tracking_number?: string
  customs_cleared_at?: string
  delivery_notes?: string
  created_at: string
  updated_at: string
}

export interface ShippingCalculatorData {
  weight: number
  dimensions?: {
    length: number
    width: number
    height: number
  }
  destinationId: number
  serviceType: 'standard' | 'express'
  declaredValue: number
}

export interface RateBreakdown {
  ratePerLb: number
  baseShippingCost: number
  expressSurcharge: number
  consolidationFee: number
  handlingFee: number
  insuranceCost: number
  totalCost: number
}

export interface CalculatedRate {
  destination: {
    country: string
    city: string
  }
  weight: {
    actual: number
    dimensional?: number
    billable: number
  }
  serviceType: 'standard' | 'express'
  rateBreakdown: RateBreakdown
  transitTime: {
    min: number
    max: number
    estimate: string
  }
  declaredValue: number
}